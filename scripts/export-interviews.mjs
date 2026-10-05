import fs from 'node:fs';
import path from 'node:path';
import mongoose from 'mongoose';
import { translateAudioToEnglish } from './local-whisper-client.mjs';

const projectRoot = process.cwd();
for (const envFile of ['.env.local', '.env']) {
  try {
    const contents = fs.readFileSync(path.join(projectRoot, envFile), 'utf8');
    for (const line of contents.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
      const index = trimmed.indexOf('=');
      const key = trimmed.slice(0, index).trim();
      const value = trimmed.slice(index + 1).trim().replace(/^['"]|['"]$/g, '');
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // The required settings are validated below.
  }
}

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error('MONGODB_URI is not defined. Add it to .env.local or .env.');
const forceRetranslate = process.argv.includes('--retranslate');
const exportDir = path.join(projectRoot, 'exports');
fs.mkdirSync(exportDir, { recursive: true });
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const transcriptFile = path.join(exportDir, `english-translations-${timestamp}.txt`);
const jsonFile = path.join(exportDir, `interviews-${timestamp}.json`);
const csvFile = path.join(exportDir, `interviews-${timestamp}.csv`);

function csvValue(value) {
  if (value === null || value === undefined) return '';
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

async function readAudioBytes(answer, audioBucket) {
  if (answer.audioFileId) {
    const fileId = new mongoose.Types.ObjectId(answer.audioFileId);
    const file = await audioBucket.find({ _id: fileId }).next();
    if (!file) throw new Error('Original audio is missing from GridFS.');
    if (file.length > 25_000_000) throw new Error('Original audio exceeds the local translation size limit.');
    return new Promise((resolve, reject) => {
      const chunks = [];
      const stream = audioBucket.openDownloadStream(fileId);
      stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      stream.once('error', reject);
      stream.once('end', () => resolve(Buffer.concat(chunks)));
    });
  }
  if (answer.audioBase64) return Buffer.from(answer.audioBase64, 'base64');
  throw new Error('No saved audio is available.');
}

function toExportInterview(interview) {
  return {
    _id: interview._id.toString(),
    sessionName: interview.sessionName || '',
    status: interview.status || '',
    createdAt: interview.createdAt || null,
    updatedAt: interview.updatedAt || null,
    answers: (interview.answers || []).map((answer) => ({
      questionId: answer.questionId,
      questionText: answer.questionText || '',
      audioFileId: answer.audioFileId?.toString?.() || null,
      videoFileId: answer.videoFileId?.toString?.() || null,
      mimeType: answer.mimeType || 'audio/webm',
      videoMimeType: answer.videoMimeType || 'video/webm',
      language: answer.language || '',
      confidence: answer.confidence ?? null,
      needsReview: Boolean(answer.needsReview),
      englishText: answer.needsReview ? '' : String(answer.englishText || '').trim(),
      translationStatus: answer.needsReview ? 'needs_review' : (answer.translationStatus || 'pending'),
      submittedAt: answer.submittedAt || null,
    })),
  };
}

async function main() {
  await mongoose.connect(uri, {
    bufferCommands: false,
    maxPoolSize: 5,
    serverSelectionTimeoutMS: 15000,
    connectTimeoutMS: 15000,
    socketTimeoutMS: 60000,
  });
  const db = mongoose.connection.db;
  if (!db) throw new Error('MongoDB connection is not ready.');

  const interviews = await db.collection('interviews').find({}).sort({ _id: 1 }).toArray();
  const audioBucket = new mongoose.mongo.GridFSBucket(db, { bucketName: 'interviewAudio' });
  let answerCount = 0;
  let translationFailures = 0;

  for (const interview of interviews) {
    for (const [index, answer] of (interview.answers || []).entries()) {
      answerCount += 1;
      const needsTranslation = forceRetranslate || answer.translationStatus !== 'done' || answer.needsReview || !String(answer.englishText || '').trim();
      if (!needsTranslation || (!answer.audioFileId && !answer.audioBase64)) continue;

      try {
        const audioBytes = await readAudioBytes(answer, audioBucket);
        const translated = await translateAudioToEnglish(audioBytes, answer.mimeType || 'audio/webm');
        Object.assign(answer, translated, { translationStatus: 'done' });
        await db.collection('interviews').updateOne(
          { _id: interview._id },
          {
            $set: {
              [`answers.${index}.englishText`]: translated.englishText,
              [`answers.${index}.language`]: translated.language,
              [`answers.${index}.confidence`]: translated.confidence,
              [`answers.${index}.needsReview`]: translated.needsReview,
              [`answers.${index}.translationStatus`]: 'done',
            },
          },
        );
      } catch (error) {
        translationFailures += 1;
        answer.englishText = '';
        answer.language = '';
        answer.confidence = null;
        answer.translationStatus = 'failed';
        answer.needsReview = true;
        await db.collection('interviews').updateOne(
          { _id: interview._id },
          {
            $set: {
              [`answers.${index}.englishText`]: '',
              [`answers.${index}.language`]: '',
              [`answers.${index}.confidence`]: null,
              [`answers.${index}.translationStatus`]: 'failed',
              [`answers.${index}.needsReview`]: true,
            },
          },
        );
        console.error(`Local translation failed for question ${answer.questionId}: ${error.message || error}`);
      }
    }
  }

  const payload = interviews.map(toExportInterview);
  const englishAnswers = payload.flatMap((interview) => interview.answers
    .filter((answer) => answer.translationStatus === 'done' && !answer.needsReview)
    .map((answer) => answer.englishText)
    .filter(Boolean));
  const transcript = `${englishAnswers.join('\n\n')}\n`;
  fs.writeFileSync(transcriptFile, transcript, 'utf8');
  fs.writeFileSync(jsonFile, JSON.stringify(payload, null, 2), 'utf8');

  const csvRows = [[
    'interviewId', 'sessionName', 'status', 'questionId', 'questionText', 'audioFileId',
    'videoFileId', 'mimeType', 'videoMimeType', 'language', 'confidence', 'needsReview',
    'englishText', 'translationStatus', 'submittedAt',
  ].join(',')];
  for (const interview of payload) {
    for (const answer of interview.answers) {
      csvRows.push([
        interview._id, interview.sessionName, interview.status, answer.questionId, answer.questionText,
        answer.audioFileId, answer.videoFileId, answer.mimeType, answer.videoMimeType, answer.language,
        answer.confidence, answer.needsReview, answer.englishText, answer.translationStatus, answer.submittedAt,
      ].map(csvValue).join(','));
    }
  }
  fs.writeFileSync(csvFile, `${csvRows.join('\n')}\n`, 'utf8');

  console.log(JSON.stringify({
    interviews: payload.length,
    answers: answerCount,
    englishTexts: englishAnswers.length,
    translationFailures,
    transcriptFile,
    jsonFile,
    csvFile,
  }));
  if (translationFailures) process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error(`Interview export failed: ${error.message || error}`);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect().catch(() => {}));

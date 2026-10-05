import fs from 'node:fs';
import path from 'node:path';
import mongoose from 'mongoose';
import { translateAudioToEnglish } from './local-whisper-client.mjs';

const projectRoot = process.cwd();
for (const envFile of ['.env.local', '.env']) {
  try {
    for (const line of fs.readFileSync(path.join(projectRoot, envFile), 'utf8').split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
      const index = trimmed.indexOf('=');
      const key = trimmed.slice(0, index).trim();
      const value = trimmed.slice(index + 1).trim().replace(/^['"]|['"]$/g, '');
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // Required settings are checked below.
  }
}

const uri = process.env.MONGODB_URI;
const interviewId = process.argv[2];
if (!uri) throw new Error('MONGODB_URI is not defined. Add it to .env.local.');
if (!interviewId || !mongoose.isValidObjectId(interviewId)) {
  throw new Error('Usage: node scripts/translate-interview.mjs <interviewId>');
}

async function readAudioBytes(answer, audioBucket) {
  if (answer.audioFileId) {
    const id = new mongoose.Types.ObjectId(answer.audioFileId);
    const file = await audioBucket.find({ _id: id }).next();
    if (!file) throw new Error('Original audio is missing from GridFS.');
    return new Promise((resolve, reject) => {
      const chunks = [];
      const stream = audioBucket.openDownloadStream(id);
      stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      stream.once('error', reject);
      stream.once('end', () => resolve(Buffer.concat(chunks)));
    });
  }
  if (answer.audioBase64) return Buffer.from(answer.audioBase64, 'base64');
  throw new Error('No audio is stored for this answer.');
}

async function main() {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });
  const db = mongoose.connection.db;
  if (!db) throw new Error('MongoDB connection is not ready.');
  const interviewObjectId = new mongoose.Types.ObjectId(interviewId);
  const interview = await db.collection('interviews').findOne({ _id: interviewObjectId });
  if (!interview) throw new Error('Interview was not found.');

  const audioBucket = new mongoose.mongo.GridFSBucket(db, { bucketName: 'interviewAudio' });
  const englishAnswers = [];
  for (const [index, answer] of (interview.answers || []).entries()) {
    if (!answer.audioFileId && !answer.audioBase64) continue;
    try {
      const audioBytes = await readAudioBytes(answer, audioBucket);
      const translated = await translateAudioToEnglish(audioBytes, answer.mimeType || 'audio/webm');
      answer.englishText = translated.englishText;
      answer.language = translated.language;
      answer.confidence = translated.confidence;
      answer.needsReview = translated.needsReview;
      answer.translationStatus = 'done';
      await db.collection('interviews').updateOne(
        { _id: interviewObjectId },
        { $set: {
          [`answers.${index}.englishText`]: translated.englishText,
          [`answers.${index}.language`]: translated.language,
          [`answers.${index}.confidence`]: translated.confidence,
          [`answers.${index}.needsReview`]: translated.needsReview,
          [`answers.${index}.translationStatus`]: 'done',
        } },
      );
      englishAnswers.push(translated.englishText);
    } catch (error) {
      answer.englishText = '';
      answer.language = '';
      answer.confidence = null;
      answer.needsReview = true;
      answer.translationStatus = 'failed';
      await db.collection('interviews').updateOne(
        { _id: interviewObjectId },
        { $set: {
          [`answers.${index}.englishText`]: '',
          [`answers.${index}.language`]: '',
          [`answers.${index}.confidence`]: null,
          [`answers.${index}.needsReview`]: true,
          [`answers.${index}.translationStatus`]: 'failed',
        } },
      );
      console.error(`Translation failed for answer ${answer.questionId}: ${error.message || error}`);
    }
  }

  const exportDir = path.join(projectRoot, 'exports');
  fs.mkdirSync(exportDir, { recursive: true });
  const textFile = path.join(exportDir, `interview-${interviewId}-english.txt`);
  fs.writeFileSync(textFile, `${englishAnswers.join('\n\n')}\n`, 'utf8');
  console.log(JSON.stringify({ translatedAnswers: englishAnswers.length, textFile }));
}

main()
  .catch((error) => {
    console.error(`Local interview translation failed: ${error.message || error}`);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect().catch(() => {}));

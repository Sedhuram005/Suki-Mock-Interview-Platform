import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import mongoose from 'mongoose';
import { translateAudioToEnglish } from './local-whisper-client.mjs';

const projectRoot = process.cwd();
for (const fileName of ['.env.local', '.env']) {
  try {
    const contents = fs.readFileSync(path.join(projectRoot, fileName), 'utf8');
    for (const line of contents.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
      const separator = trimmed.indexOf('=');
      const key = trimmed.slice(0, separator).trim();
      const value = trimmed.slice(separator + 1).trim().replace(/^['"]|['"]$/g, '');
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // Required settings are validated after environment files are loaded.
  }
}

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error('MONGODB_URI is not defined. Add it to .env.local or .env.');
const forceRetranslate = process.argv.includes('--retranslate');
const interviewIdFlag = process.argv.indexOf('--interview-id');
const interviewId = interviewIdFlag >= 0 ? process.argv[interviewIdFlag + 1] : null;
const questionIdFlag = process.argv.indexOf('--question-id');
const questionIdArg = questionIdFlag >= 0 ? Number(process.argv[questionIdFlag + 1]) : null;
if (interviewIdFlag >= 0 && (!interviewId || !mongoose.isValidObjectId(interviewId))) {
  throw new Error('Usage: node scripts/export-interview-media.mjs [--interview-id <id>] [--question-id <number>] [--retranslate]');
}
if (questionIdFlag >= 0 && !Number.isInteger(questionIdArg)) {
  throw new Error('Usage: node scripts/export-interview-media.mjs [--interview-id <id>] [--question-id <number>] [--retranslate]');
}

const exportRoot = path.join(projectRoot, 'exports');
fs.mkdirSync(exportRoot, { recursive: true });
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const bundleName = `interview-extraction-${timestamp}`;
const bundleDir = path.join(exportRoot, bundleName);
const audioDir = path.join(bundleDir, 'audio');
const videoDir = path.join(bundleDir, 'video');
fs.mkdirSync(audioDir, { recursive: true });
fs.mkdirSync(videoDir, { recursive: true });

const extensions = {
  'audio/aac': 'aac',
  'audio/flac': 'flac',
  'audio/mp3': 'mp3',
  'audio/mpeg': 'mp3',
  'audio/mp4': 'm4a',
  'audio/ogg': 'ogg',
  'audio/wav': 'wav',
  'audio/webm': 'webm',
  'audio/x-m4a': 'm4a',
  'audio/x-wav': 'wav',
  'video/mp4': 'mp4',
  'video/ogg': 'ogv',
  'video/quicktime': 'mov',
  'video/webm': 'webm',
};

function extensionFor(mimeType, fallback) {
  const normalized = String(mimeType || '').split(';')[0].trim().toLowerCase();
  return extensions[normalized] || fallback;
}

function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

async function readAudioBytes(answer, audioBucket) {
  if (answer.audioFileId) {
    const audioId = new mongoose.Types.ObjectId(answer.audioFileId);
    const file = await audioBucket.find({ _id: audioId }).next();
    if (!file) throw new Error('Original audio is missing from GridFS.');
    if (file.length > 25_000_000) throw new Error('Original audio exceeds the local translation size limit.');
    return new Promise((resolve, reject) => {
      const chunks = [];
      const stream = audioBucket.openDownloadStream(audioId);
      stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      stream.once('error', reject);
      stream.once('end', () => resolve(Buffer.concat(chunks)));
    });
  }
  if (answer.audioBase64) return Buffer.from(answer.audioBase64, 'base64');
  return null;
}

async function saveGridFsFile(bucket, objectId, targetPath) {
  const file = await bucket.find({ _id: objectId }).next();
  if (!file) return null;

  const hash = createHash('sha256');
  const hashingTransform = new Transform({
    transform(chunk, _encoding, callback) {
      hash.update(chunk);
      callback(null, chunk);
    },
  });

  try {
    await pipeline(
      bucket.openDownloadStream(objectId),
      hashingTransform,
      fs.createWriteStream(targetPath),
    );
  } catch (error) {
    fs.rmSync(targetPath, { force: true });
    throw error;
  }

  return { path: path.relative(bundleDir, targetPath).replaceAll(path.sep, '/'), bytes: file.length, sha256: hash.digest('hex') };
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
  const query = interviewId ? { _id: new mongoose.Types.ObjectId(interviewId) } : {};
  const interviews = await db.collection('interviews').find(query).sort({ _id: 1 }).toArray();
  if (interviewId && interviews.length === 0) throw new Error(`Interview ${interviewId} was not found.`);
  const audioBucket = new mongoose.mongo.GridFSBucket(db, { bucketName: 'interviewAudio' });
  const videoBucket = new mongoose.mongo.GridFSBucket(db, { bucketName: 'interviewVideos' });
  const translationTotal = interviews.reduce(
    (total, interview) => total + (interview.answers || []).filter((answer, answerIndex) => {
      const answerQuestionId = answer.questionId ?? answerIndex + 1;
      const hasAudio = Boolean(answer.audioFileId || answer.audioBase64);
      const selectedForRetry = forceRetranslate && (questionIdArg === null || answerQuestionId === questionIdArg);
      return hasAudio && (selectedForRetry || (!forceRetranslate && !String(answer.englishText || '').trim()));
    }).length,
    0,
  );
  const manifest = {
    exportedAt: new Date().toISOString(),
    source: 'interviews collection',
    translationSource: forceRetranslate ? 'local faster-whisper from stored audio' : 'stored English text or local translation when missing',
    note: 'Audio and video files are saved byte-for-byte from their stored database values. Text contains English translations only.',
    interviews: [],
  };
  const transcriptParts = [];
  let answerCount = 0;
  let audioCount = 0;
  let videoCount = 0;
  let translationFailures = 0;
  let translationsProcessed = 0;

  for (const interview of interviews) {
    const interviewId = interview._id.toString();
    const exportedInterview = {
      interviewId,
      sessionName: interview.sessionName || '',
      status: interview.status || '',
      createdAt: interview.createdAt || null,
      updatedAt: interview.updatedAt || null,
      answers: [],
    };

    for (const [answerIndex, answer] of (interview.answers || []).entries()) {
      answerCount += 1;
      const questionId = answer.questionId ?? answerIndex + 1;
      const retranslateThisAnswer = forceRetranslate && (questionIdArg === null || questionId === questionIdArg);
      const mediaStem = `interview-${interviewId}-q${questionId}-${answerIndex + 1}`;
      const exportedAnswer = {
        questionId,
        questionText: answer.questionText || '',
        englishText: retranslateThisAnswer || answer.needsReview ? '' : String(answer.englishText || '').trim(),
        language: answer.language || '',
        confidence: answer.confidence ?? null,
        needsReview: Boolean(answer.needsReview),
        translationStatus: answer.needsReview ? 'needs_review' : (answer.translationStatus || 'pending'),
        submittedAt: answer.submittedAt || null,
        audio: null,
        video: null,
      };

      let audioBytes = null;
      try {
        audioBytes = await readAudioBytes(answer, audioBucket);
      } catch (error) {
        console.error(`Audio export failed for interview ${interviewId}, answer ${questionId}: ${error.message || error}`);
      }

      if ((retranslateThisAnswer || !exportedAnswer.englishText) && audioBytes) {
        try {
          const translated = await translateAudioToEnglish(audioBytes, answer.mimeType);
          exportedAnswer.englishText = translated.englishText;
          exportedAnswer.language = translated.language;
          exportedAnswer.confidence = translated.confidence;
          exportedAnswer.needsReview = translated.needsReview;
          exportedAnswer.translationStatus = 'done';
          await db.collection('interviews').updateOne(
            { _id: interview._id },
            { $set: {
              [`answers.${answerIndex}.englishText`]: translated.englishText,
              [`answers.${answerIndex}.language`]: translated.language,
              [`answers.${answerIndex}.confidence`]: translated.confidence,
              [`answers.${answerIndex}.needsReview`]: translated.needsReview,
              [`answers.${answerIndex}.translationStatus`]: 'done',
            } },
          );
        } catch (error) {
          if (retranslateThisAnswer || answer.needsReview) {
            exportedAnswer.englishText = '';
            exportedAnswer.language = '';
            exportedAnswer.confidence = null;
          }
          exportedAnswer.translationStatus = 'failed';
          exportedAnswer.needsReview = true;
          translationFailures += 1;
          console.error(`Translation failed for interview ${interviewId}, answer ${questionId}: ${error.message || error}`);
          const failureFields = {
            [`answers.${answerIndex}.translationStatus`]: 'failed',
            [`answers.${answerIndex}.needsReview`]: true,
          };
          if (retranslateThisAnswer || answer.needsReview) {
            failureFields[`answers.${answerIndex}.englishText`] = '';
            failureFields[`answers.${answerIndex}.language`] = '';
            failureFields[`answers.${answerIndex}.confidence`] = null;
          }
          await db.collection('interviews').updateOne({ _id: interview._id }, { $set: failureFields });
        } finally {
          translationsProcessed += 1;
          console.log(`Translated audio ${translationsProcessed}/${translationTotal}`);
        }
      }

      if (audioBytes?.length) {
        const mimeType = answer.mimeType || 'audio/webm';
        const audioPath = path.join(audioDir, `${mediaStem}.${extensionFor(mimeType, 'bin')}`);
        fs.writeFileSync(audioPath, audioBytes);
        exportedAnswer.audio = {
          path: path.relative(bundleDir, audioPath).replaceAll(path.sep, '/'),
          mimeType,
          bytes: audioBytes.length,
          sha256: sha256(audioBytes),
        };
        audioCount += 1;
      }

      if (answer.videoFileId && mongoose.isValidObjectId(answer.videoFileId)) {
        const videoId = new mongoose.Types.ObjectId(answer.videoFileId);
        try {
          const videoMimeType = answer.videoMimeType || 'video/webm';
          const videoPath = path.join(videoDir, `${mediaStem}.${extensionFor(videoMimeType, 'bin')}`);
          exportedAnswer.video = await saveGridFsFile(videoBucket, videoId, videoPath);
          if (exportedAnswer.video) {
            exportedAnswer.video.mimeType = videoMimeType;
            videoCount += 1;
          }
        } catch (error) {
          console.error(`Video export failed for interview ${interviewId}, answer ${questionId}: ${error.message || error}`);
          exportedAnswer.video = { error: 'Could not read the stored video file.' };
        }
      }

      if (exportedAnswer.englishText) transcriptParts.push(exportedAnswer.englishText);
      exportedInterview.answers.push(exportedAnswer);
    }
    manifest.interviews.push(exportedInterview);
  }

  fs.writeFileSync(path.join(bundleDir, 'english-translations.txt'), `${transcriptParts.join('\n\n')}\n`, 'utf8');
  fs.writeFileSync(path.join(bundleDir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
  fs.writeFileSync(
    path.join(bundleDir, 'README.txt'),
    [
      'Interview extraction bundle',
      '',
      'english-translations.txt contains the English-only extracted answers.',
      'audio/ and video/ contain the original media bytes exported from MongoDB.',
      'manifest.json maps each answer to its translated text and media files and includes SHA-256 hashes.',
      'The source database credentials and original-language transcript fields are not included.',
      '',
      `Interviews: ${interviews.length}`,
      `Answers: ${answerCount}`,
      `Audio files: ${audioCount}`,
      `Video files: ${videoCount}`,
      `Translations missing or failed: ${translationFailures}`,
      '',
    ].join('\n'),
    'utf8',
  );

  console.log(JSON.stringify({
    bundleDir,
    interviews: interviews.length,
    answers: answerCount,
    audioFiles: audioCount,
    videoFiles: videoCount,
    translationFailures,
  }));
  if (translationFailures) process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error(`Interview export failed: ${error.message || error}`);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect().catch(() => {}));

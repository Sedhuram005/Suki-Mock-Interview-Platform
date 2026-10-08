import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import mongoose from 'mongoose';

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
const interviewIdFlag = process.argv.indexOf('--interview-id');
const interviewId = interviewIdFlag >= 0 ? process.argv[interviewIdFlag + 1] : null;
const questionIdFlag = process.argv.indexOf('--question-id');
const questionIdArg = questionIdFlag >= 0 ? Number(process.argv[questionIdFlag + 1]) : null;
if (interviewIdFlag >= 0 && (!interviewId || !mongoose.isValidObjectId(interviewId))) {
  throw new Error('Usage: node scripts/export-interview-media.mjs [--interview-id <id>] [--question-id <number>]');
}
if (questionIdFlag >= 0 && !Number.isInteger(questionIdArg)) {
  throw new Error('Usage: node scripts/export-interview-media.mjs [--interview-id <id>] [--question-id <number>]');
}

const exportRoot = path.join(projectRoot, 'exports');
fs.mkdirSync(exportRoot, { recursive: true });
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const bundleDir = path.join(exportRoot, `interview-extraction-${timestamp}`);
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
  if (answer.audioFileId && mongoose.isValidObjectId(answer.audioFileId)) {
    const audioId = new mongoose.Types.ObjectId(answer.audioFileId);
    const file = await audioBucket.find({ _id: audioId }).next();
    if (!file) throw new Error('Original audio is missing from GridFS.');
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
    await pipeline(bucket.openDownloadStream(objectId), hashingTransform, fs.createWriteStream(targetPath));
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
  const manifest = {
    exportedAt: new Date().toISOString(),
    source: 'MongoDB interviews collection',
    transcriptSource: 'saved English transcript',
    note: 'New answers use Ollama English ASR; legacy transcript fields are used as a compatibility fallback. Audio and video are exported byte-for-byte.',
    interviews: [],
  };
  const transcriptParts = [];
  let answerCount = 0;
  let audioCount = 0;
  let videoCount = 0;

  for (const interview of interviews) {
    const currentInterviewId = interview._id.toString();
    const exportedInterview = {
      interviewId: currentInterviewId,
      sessionName: interview.sessionName || '',
      status: interview.status || '',
      createdAt: interview.createdAt || null,
      updatedAt: interview.updatedAt || null,
      answers: [],
    };

    for (const [answerIndex, answer] of (interview.answers || []).entries()) {
      const questionId = answer.questionId ?? answerIndex + 1;
      if (questionIdArg !== null && questionId !== questionIdArg) continue;
      answerCount += 1;
      const mediaStem = `interview-${currentInterviewId}-q${questionId}-${answerIndex + 1}`;
      const transcript = String(answer.transcript || (answer.humanVerified ? answer.englishText : answer.draftEnglishText || answer.englishText) || '').trim();
      const exportedAnswer = {
        questionId,
        questionText: answer.questionText || '',
        transcript,
        asrEngine: answer.asrEngine || '',
        transcriptionStatus: answer.transcriptionStatus || (transcript ? 'completed' : 'failed'),
        evaluationStatus: answer.evaluationStatus || 'pending',
        evaluation: answer.evaluation || null,
        evaluatedAt: answer.evaluatedAt || null,
        submittedAt: answer.submittedAt || null,
        audio: null,
        video: null,
      };

      try {
        const audioBytes = await readAudioBytes(answer, audioBucket);
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
      } catch (error) {
        console.error(`Audio export failed for interview ${currentInterviewId}, answer ${questionId}: ${error.message || error}`);
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
          console.error(`Video export failed for interview ${currentInterviewId}, answer ${questionId}: ${error.message || error}`);
          exportedAnswer.video = { error: 'Could not read the stored video file.' };
        }
      }

      if (exportedAnswer.transcript) transcriptParts.push(`Question ${questionId}: ${exportedAnswer.transcript}`);
      exportedInterview.answers.push(exportedAnswer);
    }
    manifest.interviews.push(exportedInterview);
  }

  fs.writeFileSync(path.join(bundleDir, 'english-transcripts.txt'), `${transcriptParts.join('\n\n')}\n`, 'utf8');
  fs.writeFileSync(path.join(bundleDir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
  fs.writeFileSync(
    path.join(bundleDir, 'README.txt'),
    [
      'Interview extraction bundle',
      '',
      'english-transcripts.txt contains saved English speech recognition results.',
      'audio/ and video/ contain the original media bytes exported from MongoDB.',
      'manifest.json maps each answer to its transcript and media files and includes SHA-256 hashes.',
      'Database credentials and original-language transcript fields are not included.',
      '',
      `Interviews: ${interviews.length}`,
      `Answers: ${answerCount}`,
      `Audio files: ${audioCount}`,
      `Video files: ${videoCount}`,
      '',
    ].join('\n'),
    'utf8',
  );

  console.log(JSON.stringify({ bundleDir, interviews: interviews.length, answers: answerCount, audioFiles: audioCount, videoFiles: videoCount }));
}

main()
  .catch((error) => {
    console.error(`Interview export failed: ${error.message || error}`);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect().catch(() => {}));

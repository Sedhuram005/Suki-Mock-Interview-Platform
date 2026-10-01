import fs from 'node:fs';
import path from 'node:path';
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
    // Continue; the required connection string is checked below.
  }
}

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('MONGODB_URI is not defined. Add it to .env.local or .env');
  process.exit(1);
}

const exportRoot = path.join(projectRoot, 'exports');
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const outputDir = path.join(exportRoot, `audio-english-${timestamp}`);
fs.mkdirSync(outputDir, { recursive: true });

function csvValue(value) {
  const text = value === null || value === undefined ? '' : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

async function main() {
  await mongoose.connect(uri, {
    bufferCommands: false,
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 15000,
    connectTimeoutMS: 15000,
    socketTimeoutMS: 30000,
  });

  const db = mongoose.connection.db;
  if (!db) throw new Error('MongoDB connection is not ready.');

  const videoBucket = new mongoose.mongo.GridFSBucket(db, { bucketName: 'interviewVideos' });
  const interviews = await db.collection('interviews').find({}).sort({ _id: 1 }).toArray();
  const rows = [[
    'interviewId', 'questionId', 'audioFile', 'videoFile', 'videoMimeType', 'englishFile', 'language',
    'confidence', 'needsReview', 'translationStatus',
  ].join(',')];
  let audioCount = 0;
  let videoCount = 0;
  let translatedCount = 0;
  let unavailableCount = 0;

  for (const interview of interviews) {
    for (const answer of interview.answers ?? []) {
      if (!answer.audioBase64) continue;
      const audio = Buffer.from(answer.audioBase64, 'base64');
      if (audio.length === 0) continue;

      const interviewId = interview._id.toString();
      const questionId = String(answer.questionId ?? 'unknown');
      const mimeType = answer.mimeType || 'audio/webm';
      const extension = mimeType.includes('mp4') ? 'm4a' : 'webm';
      const stem = `interview-${interviewId}-question-${questionId}`;
      const audioFile = `${stem}.audio.${extension}`;
      const videoMimeType = answer.videoMimeType || 'video/webm';
      const videoExtension = videoMimeType.includes('mp4') ? 'mp4' : 'webm';
      let videoFile = '';
      const englishFile = `${stem}.english.txt`;
      const englishText = String(answer.englishText ?? '').trim();
      const translationStatus = answer.translationStatus || 'pending';
      const hasEnglish = translationStatus === 'done' && englishText.length > 0;

      fs.writeFileSync(path.join(outputDir, audioFile), audio);
      if (answer.videoFileId) {
        try {
          const videoFileId = new mongoose.Types.ObjectId(answer.videoFileId.toString());
          const storedVideo = await videoBucket.find({ _id: videoFileId }).next();
          if (storedVideo) {
            videoFile = `${stem}.video.${videoExtension}`;
            await pipeline(
              videoBucket.openDownloadStream(videoFileId),
              fs.createWriteStream(path.join(outputDir, videoFile)),
            );
            videoCount += 1;
          }
        } catch (error) {
          console.error(`Video extraction failed for interview ${interviewId}, question ${questionId}:`, error.message || error);
        }
      }
      fs.writeFileSync(
        path.join(outputDir, englishFile),
        hasEnglish
          ? `${englishText}\n`
          : `English translation unavailable.\nTranslation status: ${translationStatus}\n`,
        'utf8',
      );

      rows.push([
        csvValue(interviewId),
        csvValue(questionId),
        csvValue(audioFile),
        csvValue(videoFile),
        csvValue(videoMimeType),
        csvValue(englishFile),
        csvValue(answer.language || ''),
        csvValue(answer.confidence ?? ''),
        csvValue(answer.needsReview ?? ''),
        csvValue(translationStatus),
      ].join(','));

      audioCount += 1;
      if (hasEnglish) translatedCount += 1;
      else unavailableCount += 1;
    }
  }

  const manifestFile = path.join(outputDir, 'manifest.csv');
  fs.writeFileSync(manifestFile, `${rows.join('\n')}\n`, 'utf8');
  console.log(`Extracted ${audioCount} audio file(s) and ${videoCount} video file(s) from ${interviews.length} interview(s).`);
  console.log(`English translations available: ${translatedCount}; unavailable: ${unavailableCount}.`);
  console.log(`Output directory: ${outputDir}`);
  console.log(`Manifest: ${manifestFile}`);
  if (unavailableCount > 0) {
    console.log('Unavailable translations are marked in their .english.txt files; source text was not substituted.');
  }
}

main()
  .catch((error) => {
    console.error('Audio extraction failed:', error.message || error);
    process.exitCode = 1;
  })
  .finally(() => {
    mongoose.disconnect().catch(() => {});
  });
import fs from 'node:fs';
import path from 'node:path';
import mongoose from 'mongoose';

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
const exportDir = path.join(projectRoot, 'exports');
fs.mkdirSync(exportDir, { recursive: true });
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const transcriptFile = path.join(exportDir, `english-transcripts-${timestamp}.txt`);
const jsonFile = path.join(exportDir, `interviews-${timestamp}.json`);
const csvFile = path.join(exportDir, `interviews-${timestamp}.csv`);

function csvValue(value) {
  if (value === null || value === undefined) return '';
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function toExportInterview(interview) {
  return {
    _id: interview._id.toString(),
    sessionName: interview.sessionName || '',
    status: interview.status || '',
    createdAt: interview.createdAt || null,
    updatedAt: interview.updatedAt || null,
    answers: (interview.answers || []).map((answer) => {
      const transcript = String(answer.transcript || (answer.humanVerified ? answer.englishText : answer.draftEnglishText || answer.englishText) || '').trim();
      return {
        questionId: answer.questionId,
        questionText: answer.questionText || '',
        audioFileId: answer.audioFileId?.toString?.() || null,
        videoFileId: answer.videoFileId?.toString?.() || null,
        mimeType: answer.mimeType || 'audio/webm',
        videoMimeType: answer.videoMimeType || 'video/webm',
        transcript,
        asrEngine: answer.asrEngine || '',
        transcriptionStatus: answer.transcriptionStatus || (transcript ? 'completed' : 'failed'),
        evaluationStatus: answer.evaluationStatus || 'pending',
        evaluation: answer.evaluation || null,
        evaluatedAt: answer.evaluatedAt || null,
        submittedAt: answer.submittedAt || null,
      };
    }),
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
  const payload = interviews.map(toExportInterview);
  const answers = payload.flatMap((interview) => interview.answers);
  const transcripts = answers.map((answer) => answer.transcript).filter(Boolean);
  fs.writeFileSync(transcriptFile, `${transcripts.join('\n\n')}\n`, 'utf8');
  fs.writeFileSync(jsonFile, JSON.stringify(payload, null, 2), 'utf8');

  const csvRows = [[
    'interviewId', 'sessionName', 'status', 'questionId', 'questionText', 'audioFileId',
    'videoFileId', 'mimeType', 'videoMimeType', 'transcript', 'asrEngine',
    'transcriptionStatus', 'evaluationStatus', 'evaluation', 'evaluatedAt', 'submittedAt',
  ].join(',')];
  for (const interview of payload) {
    for (const answer of interview.answers) {
      csvRows.push([
        interview._id, interview.sessionName, interview.status, answer.questionId, answer.questionText,
        answer.audioFileId, answer.videoFileId, answer.mimeType, answer.videoMimeType,
        answer.transcript, answer.asrEngine, answer.transcriptionStatus, answer.evaluationStatus,
        JSON.stringify(answer.evaluation || {}), answer.evaluatedAt, answer.submittedAt,
      ].map(csvValue).join(','));
    }
  }
  fs.writeFileSync(csvFile, `${csvRows.join('\n')}\n`, 'utf8');

  console.log(JSON.stringify({
    interviews: payload.length,
    answers: answers.length,
    transcripts: transcripts.length,
    transcriptFile,
    jsonFile,
    csvFile,
  }));
}

main()
  .catch((error) => {
    console.error(`Interview export failed: ${error.message || error}`);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect().catch(() => {}));

import fs from 'node:fs';
import path from 'node:path';
import mongoose from 'mongoose';

const projectRoot = process.cwd();
const envCandidates = [path.join(projectRoot, '.env.local'), path.join(projectRoot, '.env')];

for (const envFile of envCandidates) {
  try {
    const contents = fs.readFileSync(envFile, 'utf8');
    for (const line of contents.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
      const index = trimmed.indexOf('=');
      const key = trimmed.slice(0, index).trim();
      const value = trimmed.slice(index + 1).trim().replace(/^['"]|['"]$/g, '');
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // Ignore missing env files; will fail later if MONGODB_URI is not set.
  }
}

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('MONGODB_URI is not defined. Add it to .env.local or .env');
  process.exit(1);
}

const openAiKey = process.env.OPENAI_API_KEY;

const exportDir = path.join(projectRoot, 'exports');
fs.mkdirSync(exportDir, { recursive: true });

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const outputFile = path.join(exportDir, `interviews-${timestamp}.json`);
const csvOutputFile = path.join(exportDir, `interviews-${timestamp}.csv`);

function toCsvValue(value) {
  if (value === null || value === undefined) return '';
  const text = String(value);
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function interviewsToCsv(interviews) {
  const headers = [
    'interviewId',
    'sessionName',
    'userEmail',
    'candidateName',
    'status',
    'createdAt',
    'updatedAt',
    'answerIndex',
    'questionId',
    'questionText',
    'audioBase64',
    'mimeType',
    'videoFileId',
    'videoMimeType',
    'language',
    'confidence',
    'needsReview',
    'englishText',
    'translationStatus',
    'submittedAt',
  ];

  const rows = [headers.join(',')];

  for (const interview of interviews) {
    const answers = Array.isArray(interview.answers) ? interview.answers : [];

    if (answers.length === 0) {
      rows.push([
        interview._id?.toString?.() || '',
        interview.sessionName || '',
        interview.userEmail || '',
        interview.candidateName || '',
        interview.status || '',
        interview.createdAt || '',
        interview.updatedAt || '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
      ].map(toCsvValue).join(','));
      continue;
    }

    answers.forEach((answer, index) => {
      rows.push([
        interview._id?.toString?.() || '',
        interview.sessionName || '',
        interview.userEmail || '',
        interview.candidateName || '',
        interview.status || '',
        interview.createdAt || '',
        interview.updatedAt || '',
        index,
        answer.questionId ?? '',
        answer.questionText ?? '',
        answer.audioBase64 ?? '',
        answer.mimeType ?? '',
        answer.videoFileId?.toString?.() ?? '',
        answer.videoMimeType ?? '',
        answer.language ?? '',
        answer.confidence ?? '',
        answer.needsReview ?? '',
        answer.englishText ?? '',
        answer.translationStatus ?? '',
        answer.submittedAt || '',
      ].map(toCsvValue).join(','));
    });
  }

  return rows.join('\n') + '\n';
}

async function callWhisper(pathName, audioBase64, mimeType, responseFormat) {
  const buffer = Buffer.from(audioBase64, 'base64');
  if (buffer.length === 0) throw new Error('Stored audio is empty.');

  const audioType = mimeType || 'audio/webm';
  const extension = audioType.includes('mp4') ? 'm4a' : 'webm';
  const form = new FormData();
  form.append('file', new Blob([buffer], { type: audioType }), `answer.${extension}`);
  form.append('model', 'whisper-1');
  form.append('response_format', responseFormat);

  const response = await fetch(`https://api.openai.com/v1/audio/${pathName}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${openAiKey}` },
    body: form,
    signal: AbortSignal.timeout(40_000),
  });

  if (!response.ok) {
    throw new Error(`Whisper ${pathName} failed with status ${response.status}: ${await response.text()}`);
  }

  return response.json();
}

async function translateStoredAnswer(answer) {
  if (!answer.audioBase64) throw new Error('No stored audio is available.');
  const mimeType = answer.mimeType || 'audio/webm';
  const translation = await callWhisper('translations', answer.audioBase64, mimeType, 'json');
  const englishText = String(translation.text ?? '').trim();
  if (!englishText) throw new Error('Whisper returned an empty English translation.');

  return { englishText };
}

function toEnglishOnlyInterview(interview) {
  return {
    ...interview,
    answers: (interview.answers ?? []).map((answer) => {
      const englishAnswer = { ...answer };
      delete englishAnswer.transcript;
      delete englishAnswer.originalText;
      return englishAnswer;
    }),
  };
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
  if (!db) {
    throw new Error('MongoDB connection is not ready.');
  }

  const interviews = await db.collection('interviews').find({}).sort({ _id: 1 }).toArray();
  const answerCount = interviews.reduce((count, interview) => count + (interview.answers?.length ?? 0), 0);
  if (answerCount > 0 && !openAiKey) {
    throw new Error('OPENAI_API_KEY is required to translate stored interview audio during export.');
  }

  let failedTranslations = 0;
  for (const interview of interviews) {
    for (const [index, answer] of (interview.answers ?? []).entries()) {
      try {
        const translated = await translateStoredAnswer(answer);
        Object.assign(answer, translated, { translationStatus: 'done' });
        await db.collection('interviews').updateOne(
          { _id: interview._id },
          {
            $set: {
              [`answers.${index}.englishText`]: translated.englishText,
              [`answers.${index}.translationStatus`]: 'done',
            },
          },
        );
      } catch (error) {
        failedTranslations += 1;
        answer.englishText = '';
        answer.translationStatus = 'failed';
        console.error(
          `Translation failed for interview ${interview._id}, question ${answer.questionId}:`,
          error.message || error,
        );
        await db.collection('interviews').updateOne(
          { _id: interview._id },
          {
            $set: {
              [`answers.${index}.englishText`]: '',
              [`answers.${index}.translationStatus`]: 'failed',
            },
          },
        );
      }
    }
  }

  const payload = interviews.map((item) => toEnglishOnlyInterview({
    ...item,
    _id: item._id.toString(),
  }));

  fs.writeFileSync(outputFile, JSON.stringify(payload, null, 2));
  fs.writeFileSync(csvOutputFile, interviewsToCsv(payload));

  console.log(`Exported ${payload.length} interview record(s) to ${outputFile}`);
  console.log(`CSV export available at ${csvOutputFile}`);
  if (payload.length > 0) {
    console.log('Sample interview id:', payload[0]._id);
  }
  if (failedTranslations > 0) {
    console.error(`${failedTranslations} answer(s) could not be translated; their English text is blank and status is failed.`);
    process.exitCode = 1;
  }
}

main()
  .catch((err) => {
    console.error('Export failed:', err.message || err);
    process.exit(1);
  })
  .finally(() => {
    mongoose.disconnect().catch(() => {});
  });

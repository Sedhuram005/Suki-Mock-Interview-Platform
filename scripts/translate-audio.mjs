import fs from 'node:fs';
import path from 'node:path';
import { translateAudioToEnglish } from './local-whisper-client.mjs';

for (const envFile of ['.env.local', '.env']) {
  try {
    for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
      const index = trimmed.indexOf('=');
      const key = trimmed.slice(0, index).trim();
      const value = trimmed.slice(index + 1).trim().replace(/^['"]|['"]$/g, '');
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // Local speech URL and token can also be supplied in the shell environment.
  }
}

const AUDIO_EXTENSIONS = {
  '.aac': 'audio/aac',
  '.flac': 'audio/flac',
  '.m4a': 'audio/mp4',
  '.mp3': 'audio/mpeg',
  '.mp4': 'audio/mp4',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav',
  '.webm': 'audio/webm',
};

const inputFile = process.argv[2];
if (!inputFile) throw new Error('Usage: node scripts/translate-audio.mjs <audio-file>');

async function main() {
  const resolvedInput = path.resolve(inputFile);
  const extension = path.extname(resolvedInput).toLowerCase();
  const mimeType = AUDIO_EXTENSIONS[extension];
  if (!mimeType) throw new Error(`Unsupported audio file extension: ${extension || '(none)'}.`);

  const result = await translateAudioToEnglish(fs.readFileSync(resolvedInput), mimeType);
  const textFile = `${resolvedInput}.english.txt`;
  fs.writeFileSync(textFile, `${result.englishText}\n`, 'utf8');
  console.log(JSON.stringify({ language: result.language, textFile }));
}

main().catch((error) => {
  console.error(`Local audio translation failed: ${error.message || error}`);
  process.exitCode = 1;
});

const AUDIO_EXTENSIONS = {
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
};

export async function translateAudioToEnglish(audioBytes, mimeType) {
  if (!audioBytes?.length) throw new Error('Audio file is empty.');
  const contentType = mimeType || 'audio/webm';
  const baseType = contentType.split(';', 1)[0].trim().toLowerCase();
  const extension = AUDIO_EXTENSIONS[baseType];
  if (!extension) throw new Error(`Unsupported audio format: ${baseType || 'unknown'}.`);

  const form = new FormData();
  form.append('file', new Blob([audioBytes], { type: contentType }), `answer.${extension}`);
  const baseUrl = (process.env.LOCAL_WHISPER_URL || 'http://127.0.0.1:8000').replace(/\/+$/, '');
  const token = process.env.LOCAL_WHISPER_TOKEN;
  const response = await fetch(`${baseUrl}/translate`, {
    method: 'POST',
    headers: token ? { 'x-local-whisper-token': token } : undefined,
    body: form,
    signal: AbortSignal.timeout(5 * 60 * 1000),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = typeof payload.detail === 'string' ? payload.detail : `HTTP ${response.status}`;
    throw new Error(`Local Whisper translation failed: ${detail}`);
  }

  const englishText = String(payload.englishText || '').trim();
  if (!englishText) throw new Error('Local Whisper returned an empty English translation.');
  if (payload.needsReview) {
    throw new Error('Local Whisper marked this translation as unreliable. The original recording is preserved; use a stronger multilingual model and retry.');
  }
  return {
    englishText,
    language: String(payload.language || ''),
    confidence: typeof payload.confidence === 'number' ? payload.confidence : null,
    needsReview: false,
  };
}

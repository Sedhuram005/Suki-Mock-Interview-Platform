export function concat(parts: Float32Array[]): Float32Array {
  const out = new Float32Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}

export function downsample(input: Float32Array, from: number, to = 16000): Float32Array {
  if (from === to || input.length === 0) return input;
  const ratio = from / to;
  const outLen = Math.round(input.length / ratio);
  const out = new Float32Array(outLen);
  for (let i = 0; i < outLen; i++) {
    const srcIdx = i * ratio;
    const idx0 = Math.floor(srcIdx);
    const idx1 = Math.min(input.length - 1, idx0 + 1);
    const frac = srcIdx - idx0;
    out[i] = input[idx0] * (1 - frac) + input[idx1] * frac;
  }
  return out;
}

export function normalizeAudio(pcm: Float32Array): Float32Array {
  let maxVal = 0;
  for (let i = 0; i < pcm.length; i++) {
    const abs = Math.abs(pcm[i]);
    if (abs > maxVal) maxVal = abs;
  }
  if (maxVal === 0) return pcm;
  // Boost low voice speech up to 92% peak with up to 30x gain for clear Whisper recognition
  const scale = maxVal > 0.0005 ? Math.min(30.0, 0.92 / maxVal) : 1;
  const out = new Float32Array(pcm.length);
  for (let i = 0; i < pcm.length; i++) {
    let s = pcm[i] * scale;
    if (s > 0.95) s = 0.95 + 0.05 * Math.tanh((s - 0.95) / 0.05);
    else if (s < -0.95) s = -0.95 + 0.05 * Math.tanh((s + 0.95) / 0.05);
    out[i] = s;
  }
  return out;
}

export const normalize = normalizeAudio;

export function encodeWav(pcm: Float32Array, rate = 16000): Blob {
  const normalizedPcm = normalizeAudio(pcm);
  const buf = new ArrayBuffer(44 + normalizedPcm.length * 2);
  const v = new DataView(buf);
  const str = (o: number, s: string) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  str(0, "RIFF"); v.setUint32(4, 36 + normalizedPcm.length * 2, true); str(8, "WAVE");
  str(12, "fmt "); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  str(36, "data"); v.setUint32(40, normalizedPcm.length * 2, true);
  for (let i = 0; i < normalizedPcm.length; i++) {
    const s = Math.max(-1, Math.min(1, normalizedPcm[i]));
    v.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Blob([buf], { type: "audio/wav" });
}

const TARGET_SAMPLE_RATE = 16_000;

function encodePcm16(samples: Float32Array, sampleRate: number) {
  const dataBytes = samples.length * 2;
  const wav = new ArrayBuffer(44 + dataBytes);
  const view = new DataView(wav);
  const writeText = (offset: number, value: string) => {
    for (let index = 0; index < value.length; index += 1) {
      view.setUint8(offset + index, value.charCodeAt(index));
    }
  };

  writeText(0, "RIFF");
  view.setUint32(4, 36 + dataBytes, true);
  writeText(8, "WAVE");
  writeText(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeText(36, "data");
  view.setUint32(40, dataBytes, true);

  let offset = 44;
  for (const sample of samples) {
    const clipped = Math.max(-1, Math.min(1, sample));
    view.setInt16(offset, clipped < 0 ? clipped * 0x8000 : clipped * 0x7fff, true);
    offset += 2;
  }

  return wav;
}

function normalizeVoiceSamples(samples: Float32Array): Float32Array {
  let maxPeak = 0;
  for (let i = 0; i < samples.length; i++) {
    const val = Math.abs(samples[i]);
    if (val > maxPeak) maxPeak = val;
  }
  if (maxPeak <= 0.0005) return samples;

  // Boost low voice speech up to 0.92 peak, with a maximum gain of 30x (+29.5 dB)
  const targetPeak = 0.92;
  const gain = Math.min(30.0, Math.max(1.0, targetPeak / maxPeak));

  const normalized = new Float32Array(samples.length);
  for (let i = 0; i < samples.length; i++) {
    let s = samples[i] * gain;
    // Soft knee limiter (tanh compression) to smoothly prevent digital clipping
    if (s > 0.95) {
      s = 0.95 + 0.05 * Math.tanh((s - 0.95) / 0.05);
    } else if (s < -0.95) {
      s = -0.95 + 0.05 * Math.tanh((s + 0.95) / 0.05);
    }
    normalized[i] = s;
  }
  return normalized;
}

export async function toWav16k(audio: Blob): Promise<Blob> {
  if (audio.size === 0) throw new Error("The recording is empty.");

  let decoder: AudioContext;
  try {
    decoder = new AudioContext({ sampleRate: TARGET_SAMPLE_RATE });
  } catch {
    decoder = new AudioContext();
  }
  try {
    const decoded = await decoder.decodeAudioData(await audio.arrayBuffer());
    const mono = decoder.createBuffer(1, decoded.length, decoded.sampleRate);
    const monoSamples = mono.getChannelData(0);
    for (let channel = 0; channel < decoded.numberOfChannels; channel += 1) {
      const source = decoded.getChannelData(channel);
      for (let frame = 0; frame < source.length; frame += 1) {
        monoSamples[frame] += source[frame] / decoded.numberOfChannels;
      }
    }

    if (decoded.sampleRate === TARGET_SAMPLE_RATE) {
      return new Blob([encodePcm16(normalizeVoiceSamples(monoSamples), TARGET_SAMPLE_RATE)], { type: "audio/wav" });
    }

    const outputFrames = Math.max(1, Math.ceil(decoded.duration * TARGET_SAMPLE_RATE));
    const resampler = new OfflineAudioContext(1, outputFrames, TARGET_SAMPLE_RATE);
    const source = resampler.createBufferSource();
    source.buffer = mono;
    source.connect(resampler.destination);
    source.start();
    const resampled = await resampler.startRendering();
    return new Blob([encodePcm16(normalizeVoiceSamples(resampled.getChannelData(0)), TARGET_SAMPLE_RATE)], { type: "audio/wav" });
  } finally {
    await decoder.close().catch(() => {});
  }
}

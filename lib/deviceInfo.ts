export function getDeviceInfo(stream: MediaStream) {
  const track = stream.getAudioTracks()[0];
  const s = track?.getSettings?.() ?? {};
  return {
    label: track?.label || "Default microphone",
    sampleRate: s.sampleRate ?? null,
    channelCount: s.channelCount ?? null,
    echoCancellation: s.echoCancellation ?? null,
    userAgent: navigator.userAgent,
  };
}

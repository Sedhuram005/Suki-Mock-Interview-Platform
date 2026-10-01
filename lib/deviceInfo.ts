export function getDeviceInfo(stream: MediaStream) {
  const track = stream.getAudioTracks()[0];
  const s = track?.getSettings?.() ?? {};
  const cameraTrack = stream.getVideoTracks()[0];
  const cameraSettings = cameraTrack?.getSettings?.() ?? {};
  return {
    label: track?.label || "Default microphone",
    sampleRate: s.sampleRate ?? null,
    channelCount: s.channelCount ?? null,
    echoCancellation: s.echoCancellation ?? null,
    cameraLabel: cameraTrack?.label || "Default camera",
    cameraWidth: cameraSettings.width ?? null,
    cameraHeight: cameraSettings.height ?? null,
    cameraFrameRate: cameraSettings.frameRate ?? null,
    userAgent: navigator.userAgent,
  };
}

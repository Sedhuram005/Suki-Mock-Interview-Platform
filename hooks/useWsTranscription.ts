import { useEffect, useRef, useState } from 'react';

/**
 * Hook for real‑time speech‑to‑text using the FastAPI WebSocket endpoint.
 * It streams microphone audio in small WAV chunks to `/ws/transcribe` and
 * receives a transcript string for each chunk. The hook aggregates the
 * incoming pieces so the UI receives a continuously updating transcript.
 *
 * Usage example:
 *   const { transcript, start, stop } = useWsTranscription();
 *   // call start() when the user begins speaking, stop() when finished.
 */
export function useWsTranscription() {
  const [transcript, setTranscript] = useState('');
  const wsRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      wsRef.current?.close();
      mediaRecorderRef.current?.stop();
    };
  }, []);

  const start = async () => {
    // Open WebSocket connection
    const wsUrl = process.env.NEXT_PUBLIC_SPEECH_URL?.replace(/^http/, 'ws') ?? 'ws://127.0.0.1:8000/ws/transcribe';
    wsRef.current = new WebSocket(wsUrl);

    wsRef.current.onmessage = (event) => {
      const partial = event.data as string;
      // Append the latest partial transcript (trimmed) with a space.
      setTranscript((prev) => (prev + ' ' + partial).trim());
    };

    wsRef.current.onerror = (e) => {
      console.error('WebSocket transcription error', e);
    };

    // Get microphone stream
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    // Create MediaRecorder that outputs small chunks (e.g., 500 ms)
    const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0 && wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(e.data);
      }
    };

    recorder.start(500); // emit every 500 ms
  };

  const stop = () => {
    mediaRecorderRef.current?.stop();
    wsRef.current?.close();
    wsRef.current = null;
    mediaRecorderRef.current = null;
  };

  const reset = () => {
    setTranscript('');
  };

  return { transcript, start, stop, reset };
}

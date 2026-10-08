from .transcribe_service import app
import asyncio
import logging
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from faster_whisper import WhisperModel
import numpy as np
import io
import wave
from concurrent.futures import ThreadPoolExecutor

# Set up logger
logger = logging.getLogger(__name__)

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Model configuration (reuse same settings as transcribe_service)
MODEL_SIZE = "tiny"
DEVICE = "cpu"
COMPUTE_TYPE = "int8"
NUM_THREADS = 8
SAMPLE_RATE = 16000

model: WhisperModel | None = None
executor = ThreadPoolExecutor(max_workers=4)


def get_model() -> WhisperModel:
    global model
    if model is None:
        logger.info(f"Loading Whisper model {MODEL_SIZE} on {DEVICE} with {NUM_THREADS} threads")
        model = WhisperModel(
            MODEL_SIZE,
            device=DEVICE,
            compute_type=COMPUTE_TYPE,
            cpu_threads=NUM_THREADS,
            download_root="./models",
        )
        logger.info("Model loaded")
    return model


def read_wav_bytes(data: bytes) -> tuple[np.ndarray, int]:
    """Read raw WAV bytes and return a float32 array and its sample rate."""
    try:
        with io.BytesIO(data) as wav_io:
            with wave.open(wav_io, "rb") as wav_file:
                sr = wav_file.getframerate()
                frames = wav_file.getnframes()
                audio_bytes = wav_file.readframes(frames)
                audio = np.frombuffer(audio_bytes, dtype=np.int16).astype(np.float32) / 32768.0
                # Normalise loudness
                max_val = np.max(np.abs(audio))
                if max_val > 0.0005:
                    audio = audio * (0.92 / max_val)
                return audio, sr
    except Exception as e:
        logger.error(f"Failed to parse WAV chunk: {e}")
        # Fallback: treat as raw PCM 16‑bit little‑endian
        audio = np.frombuffer(data, dtype=np.int16).astype(np.float32) / 32768.0
        max_val = np.max(np.abs(audio))
        if max_val > 0.0005:
            audio = audio * (0.92 / max_val)
        return audio, SAMPLE_RATE


def resample(audio: np.ndarray, orig_sr: int, target_sr: int = SAMPLE_RATE) -> np.ndarray:
    if orig_sr == target_sr:
        return audio
    ratio = target_sr / orig_sr
    new_len = int(len(audio) * ratio)
    indices = np.linspace(0, len(audio) - 1, new_len)
    return np.interp(indices, np.arange(len(audio)), audio)


def transcribe_chunk(audio_data: bytes) -> str:
    """Transcribe a single audio chunk synchronously."""
    audio, sr = read_wav_bytes(audio_data)
    if sr != SAMPLE_RATE:
        audio = resample(audio, sr)
    whisper = get_model()
    segments, _ = whisper.transcribe(
        audio,
        language="en",
        beam_size=5,
        vad_filter=True,
        vad_parameters={
            "threshold": 0.20,
            "min_speech_duration_ms": 100,
            "min_silence_duration_ms": 500,
            "speech_pad_ms": 250,
            "max_speech_duration_s": 30,
        },
        word_timestamps=False,
        condition_on_previous_text=False,
    )
    return " ".join([s.text for s in segments]).strip()


@app.websocket("/ws/transcribe")
async def websocket_transcribe(ws: WebSocket):
    await ws.accept()
    logger.info("WebSocket client connected for streaming transcription")
    try:
        while True:
            # Expect each message to be a binary audio chunk (WAV format)
            data = await ws.receive_bytes()
            # Run transcription in thread pool to avoid blocking the event loop
            loop = asyncio.get_event_loop()
            transcript = await loop.run_in_executor(executor, transcribe_chunk, data)
            await ws.send_text(transcript)
    except WebSocketDisconnect:
        logger.info("WebSocket client disconnected")
    except Exception as e:
        logger.error(f"WebSocket transcription error: {e}")
        await ws.close(code=1011)

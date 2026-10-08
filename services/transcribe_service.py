from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from faster_whisper import WhisperModel
import uvicorn
import numpy as np
import io
import logging
import asyncio
from concurrent.futures import ThreadPoolExecutor
import wave
import struct
import inspect
import traceback

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

# CORS: allow any localhost / 127.0.0.1 origin on any port
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Whisper model - use tiny model for real-time streaming
MODEL_SIZE = "tiny"  # Fastest for real-time streaming
DEVICE = "cpu"       # Use "cuda" if GPU available
COMPUTE_TYPE = "int8"
NUM_THREADS = 8

# Load model globally to avoid reloading
model = None
executor = ThreadPoolExecutor(max_workers=4)

# Introspected set of parameters this faster-whisper version actually accepts
_SUPPORTED: set[str] = set()

SAMPLE_RATE = 16000  # Whisper expects 16kHz


def read_wav_file(audio_data: bytes) -> tuple[np.ndarray, int]:
    """Read WAV file and return audio data and sample rate"""
    try:
        with io.BytesIO(audio_data) as wav_io:
            with wave.open(wav_io, "rb") as wav_file:
                sample_rate = wav_file.getframerate()
                frames = wav_file.getnframes()
                audio_data_bytes = wav_file.readframes(frames)
                audio_array = np.frombuffer(audio_data_bytes, dtype=np.int16)
                audio_array = audio_array.astype(np.float32) / 32768.0
                max_val = np.max(np.abs(audio_array))
                if max_val > 0.0005:
                    audio_array = audio_array * (0.92 / max_val)
                return audio_array, sample_rate
    except Exception as e:
        logger.error(f"Error reading WAV file: {e}")
        audio_array = np.frombuffer(audio_data, dtype=np.int16)
        audio_array = audio_array.astype(np.float32) / 32768.0
        max_val = np.max(np.abs(audio_array))
        if max_val > 0.0005:
            audio_array = audio_array * (0.92 / max_val)
        return audio_array, SAMPLE_RATE


def resample_audio(audio_array: np.ndarray, original_sr: int, target_sr: int = SAMPLE_RATE) -> np.ndarray:
    if original_sr == target_sr:
        return audio_array
    ratio = target_sr / original_sr
    new_length = int(len(audio_array) * ratio)
    indices = np.linspace(0, len(audio_array) - 1, new_length)
    resampled = np.interp(indices, np.arange(len(audio_array)), audio_array)
    return resampled


def get_model() -> WhisperModel:
    global model, _SUPPORTED
    if model is None:
        logger.info(f"Loading Whisper model: {MODEL_SIZE} on {DEVICE} with {NUM_THREADS} threads")
        model = WhisperModel(
            MODEL_SIZE,
            device=DEVICE,
            compute_type=COMPUTE_TYPE,
            cpu_threads=NUM_THREADS,
            download_root="./models",
        )
        logger.info("Model loaded successfully")

        # Detect which keyword arguments this version of faster-whisper supports
        _SUPPORTED = set(inspect.signature(model.transcribe).parameters)
        _WANT = [
            "hotwords", "best_of", "compression_ratio_threshold", "log_prob_threshold",
            "no_speech_threshold", "vad_filter", "vad_parameters", "without_timestamps",
            "condition_on_previous_text",
        ]
        missing = [k for k in _WANT if k not in _SUPPORTED]
        if missing:
            print(
                f"NOTE: ignoring options your faster-whisper doesn't have: {missing} "
                f"(fix: pip install -U faster-whisper)"
            )

    return model


def tx(audio: np.ndarray, **kw) -> tuple:
    """Call model.transcribe with only the kwargs this version supports."""
    return model.transcribe(audio, **{k: v for k, v in kw.items() if k in _SUPPORTED})


def run(audio_array: np.ndarray) -> tuple[str, str]:
    """Core transcription. Uses only kwargs the installed faster-whisper supports."""
    segments, info = tx(
        audio_array,
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
        condition_on_previous_text=True,
        no_speech_threshold=0.8,
        compression_ratio_threshold=2.4,
        temperature=0.0,
        best_of=1,
    )
    transcript = " ".join([segment.text for segment in segments]).strip()
    return transcript, info.language


def transcribe_sync(audio_data: bytes) -> tuple[str, str]:
    """Synchronous transcription function for thread pool"""
    audio_array, original_sr = read_wav_file(audio_data)
    if original_sr != SAMPLE_RATE:
        audio_array = resample_audio(audio_array, original_sr, SAMPLE_RATE)
        logger.info(f"Resampled audio from {original_sr}Hz to {SAMPLE_RATE}Hz")
    return run(audio_array)


@app.on_event("startup")
async def startup_event():
    """Warm up the model on startup"""
    logger.info("Warming up Whisper model...")
    get_model()
    logger.info("Model warmed up and ready")


@app.post("/transcribe")
async def transcribe_audio(file: UploadFile = File(...)):
    """
    Transcribe audio file to text using faster-whisper.
    Supports WAV and other audio formats.
    """
    try:
        audio_data = await file.read()
        if len(audio_data) < 2000:
            return {"transcript": "", "text": ""}
        get_model()
        loop = asyncio.get_event_loop()
        transcript, detected_lang = await loop.run_in_executor(
            executor, transcribe_sync, audio_data
        )
        logger.info(f"Transcription complete: {len(transcript)} chars, detected language: {detected_lang}")
        return {"transcript": transcript, "text": transcript}
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"{type(e).__name__}: {e}")


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"ok": True, "status": "healthy", "model_loaded": model is not None}


@app.get("/warmup")
async def warmup():
    """Warm up the model"""
    get_model()
    return {"status": "warmed up"}


# ---- self-test: refuse to start if the model is broken ----
try:
    get_model()
    run(np.zeros(16000, dtype=np.float32))
    print("SELF-TEST OK")
except Exception:
    traceback.print_exc()
    raise SystemExit("SELF-TEST FAILED. Fix the error above, then start again.")


if __name__ == "__main__":
    import os
    port = int(os.environ.get("PORT", "8000"))
    uvicorn.run(
        app,
        host="127.0.0.1",
        port=port,
        log_level="info",
        workers=1,
    )

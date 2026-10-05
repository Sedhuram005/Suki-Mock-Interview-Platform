from __future__ import annotations

import hmac
import logging
import math
import os
import tempfile
from contextlib import asynccontextmanager
from pathlib import Path
from threading import Lock
from typing import Any

import av
from fastapi import FastAPI, File, Header, HTTPException, UploadFile
from fastapi.concurrency import run_in_threadpool
from faster_whisper import WhisperModel

logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"))
logger = logging.getLogger("local_whisper")

MODEL_NAME = os.getenv("WHISPER_MODEL", "small").strip()
MODEL_DEVICE = os.getenv("WHISPER_DEVICE", "cpu").strip().lower()
MODEL_COMPUTE_TYPE = os.getenv("WHISPER_COMPUTE_TYPE", "int8").strip().lower()
MODEL_CPU_THREADS = int(os.getenv("WHISPER_CPU_THREADS", str(max(1, min(8, (os.cpu_count() or 4) // 2)))))
MAX_AUDIO_BYTES = int(os.getenv("WHISPER_MAX_AUDIO_BYTES", "25000000"))

MODEL: WhisperModel | None = None
MODEL_LOCK = Lock()

AUDIO_EXTENSIONS = {
    "audio/aac": ".aac",
    "audio/flac": ".flac",
    "audio/mp3": ".mp3",
    "audio/mpeg": ".mp3",
    "audio/mp4": ".m4a",
    "audio/ogg": ".ogg",
    "audio/wav": ".wav",
    "audio/webm": ".webm",
    "audio/x-m4a": ".m4a",
    "audio/x-wav": ".wav",
}

LANGUAGE_NAMES = {
    "ar": "Arabic",
    "bn": "Bengali",
    "de": "German",
    "en": "English",
    "es": "Spanish",
    "fr": "French",
    "hi": "Hindi",
    "it": "Italian",
    "ja": "Japanese",
    "kn": "Kannada",
    "ko": "Korean",
    "ml": "Malayalam",
    "mr": "Marathi",
    "pa": "Punjabi",
    "pt": "Portuguese",
    "ru": "Russian",
    "ta": "Tamil",
    "te": "Telugu",
    "ur": "Urdu",
    "zh": "Chinese",
}


@asynccontextmanager
async def lifespan(_app: FastAPI):
    global MODEL
    if MODEL_NAME.endswith(".en"):
        raise RuntimeError("WHISPER_MODEL must be multilingual (for example, 'small'), not an English-only .en model.")
    try:
        logger.info("Loading local multilingual Whisper model %s on %s (%s)", MODEL_NAME, MODEL_DEVICE, MODEL_COMPUTE_TYPE)
        MODEL = WhisperModel(
            MODEL_NAME,
            device=MODEL_DEVICE,
            compute_type=MODEL_COMPUTE_TYPE,
            cpu_threads=MODEL_CPU_THREADS,
            num_workers=1,
        )
        logger.info("Local Whisper model is ready.")
    except Exception:
        logger.exception("Could not load the local Whisper model. Check model download and device settings.")
        raise
    yield
    MODEL = None


app = FastAPI(title="Local Whisper Translation", lifespan=lifespan)


def _check_token(supplied_token: str | None) -> None:
    expected_token = os.getenv("LOCAL_WHISPER_TOKEN", "")
    if expected_token and not hmac.compare_digest(supplied_token or "", expected_token):
        raise HTTPException(status_code=401, detail="Local Whisper service token is invalid.")


def _infer_translation(audio_path: str) -> dict[str, Any]:
    if MODEL is None:
        raise RuntimeError("The local Whisper model is not ready.")
    with MODEL_LOCK:
        segments, info = MODEL.transcribe(
            audio_path,
            task="translate",
            beam_size=5,
            condition_on_previous_text=False,
        )
        completed_segments = list(segments)

    english_text = " ".join(segment.text.strip() for segment in completed_segments if segment.text.strip()).strip()
    if not english_text:
        raise ValueError("No speech was detected in the submitted audio.")

    average_log_probability = (
        sum(segment.avg_logprob for segment in completed_segments) / len(completed_segments)
        if completed_segments
        else -2.0
    )
    confidence = max(0, min(100, round(math.exp(average_log_probability) * 100)))
    language_probability = float(info.language_probability or 0.0)
    no_speech_probability = max((float(segment.no_speech_prob or 0.0) for segment in completed_segments), default=0.0)
    return {
        "englishText": english_text,
        "language": LANGUAGE_NAMES.get(info.language, info.language),
        "languageCode": info.language,
        "languageProbability": language_probability,
        "confidence": confidence,
        "needsReview": confidence < 55 or language_probability < 0.55 or no_speech_probability > 0.6,
    }


@app.get("/health")
async def health() -> dict[str, Any]:
    return {
        "status": "ready" if MODEL is not None else "loading",
        "model": MODEL_NAME,
        "device": MODEL_DEVICE,
        "task": "translate-to-English",
    }


@app.post("/translate")
async def translate_audio(
    file: UploadFile = File(...),
    x_local_whisper_token: str | None = Header(default=None),
) -> dict[str, Any]:
    _check_token(x_local_whisper_token)
    if MODEL is None:
        raise HTTPException(status_code=503, detail="Local Whisper model is not ready.")

    content_type = (file.content_type or "").split(";", 1)[0].strip().lower()
    suffix = AUDIO_EXTENSIONS.get(content_type)
    if not suffix:
        raise HTTPException(status_code=415, detail="Unsupported audio format. Submit WebM/Opus or another supported audio format.")

    audio_bytes = await file.read(MAX_AUDIO_BYTES + 1)
    if not audio_bytes:
        raise HTTPException(status_code=422, detail="The submitted audio is empty.")
    if len(audio_bytes) > MAX_AUDIO_BYTES:
        raise HTTPException(status_code=413, detail="The submitted audio exceeds the local Whisper size limit.")

    temp_path: str | None = None
    try:
        with tempfile.NamedTemporaryFile(prefix="interview-audio-", suffix=suffix, delete=False) as temp_file:
            temp_file.write(audio_bytes)
            temp_path = temp_file.name

        # Confirm the bytes contain a decodable audio stream; the filename is not trusted.
        with av.open(temp_path) as media:
            if not any(stream.type == "audio" for stream in media.streams):
                raise ValueError("The uploaded file contains no audio stream.")

        return await run_in_threadpool(_infer_translation, temp_path)
    except HTTPException:
        raise
    except (av.error.InvalidDataError, ValueError) as error:
        raise HTTPException(status_code=422, detail=str(error) or "The audio format could not be decoded.") from error
    except Exception as error:
        logger.exception("Local Whisper could not translate the submitted audio.")
        raise HTTPException(status_code=503, detail="Local Whisper could not process this recording.") from error
    finally:
        await file.close()
        if temp_path:
            try:
                Path(temp_path).unlink(missing_ok=True)
            except OSError:
                logger.warning("Could not remove temporary audio file %s", temp_path)

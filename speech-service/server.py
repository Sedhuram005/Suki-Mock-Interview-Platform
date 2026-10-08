import inspect
import io
import os
import re
import tempfile
import time
import traceback
import wave

import numpy as np
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from faster_whisper import WhisperModel
from faster_whisper.vad import VadOptions, get_speech_timestamps

DEVICE = os.getenv("WHISPER_DEVICE", "cuda" if os.getenv("WHISPER_PROFILE") == "gpu" else "cpu")
COMPUTE = os.getenv("WHISPER_COMPUTE", "float16" if DEVICE == "cuda" else "int8")

PROFILES = {
    "fast": dict(live="base.en", final="base.en"),
    "balanced": dict(live="base.en", final="small.en"),
    "accurate": dict(live="base.en" if DEVICE == "cpu" else "small.en", final="small.en" if DEVICE == "cpu" else "large-v3-turbo"),
    "gpu": dict(live="small.en", final="large-v3"),
}
PROFILE = os.getenv("WHISPER_PROFILE", "fast")
P = PROFILES.get(PROFILE, PROFILES["accurate"])
HOTWORDS = os.getenv("WHISPER_HOTWORDS", "").strip() or None
PROMPT = os.getenv(
    "WHISPER_PROMPT",
    "Technical job interview in English. Spoken English assessment. Vocabulary terms: JavaScript, TypeScript, React, Next.js, Node.js, MongoDB, REST API, SQL, Python, Java, Spring Boot, Docker, Git, GitHub, HTML, CSS, frontend, backend, database, component, state.",
).strip()

MIN_RMS = 0.002
MIN_SPEECH_SEC = 0.15

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_methods=["*"],
    allow_headers=["*"],
)


def load(name):
    print(f"Loading '{name}' on {DEVICE} ({COMPUTE})...")
    return WhisperModel(
        name,
        device=DEVICE,
        compute_type=COMPUTE,
        cpu_threads=max(2, (os.cpu_count() or 4) // 2),
        num_workers=2,
    )


live_model = load(P["live"])
final_model = live_model if P["final"] == P["live"] else load(P["final"])

_SUPPORTED = set(inspect.signature(live_model.transcribe).parameters)
_WANT = [
    "hotwords",
    "best_of",
    "compression_ratio_threshold",
    "log_prob_threshold",
    "no_speech_threshold",
    "vad_filter",
    "vad_parameters",
    "without_timestamps",
    "condition_on_previous_text",
]
_missing = [key for key in _WANT if key not in _SUPPORTED]
if _missing:
    print(f"NOTE: ignoring options your faster-whisper doesn't have: {_missing} (fix: pip install -U faster-whisper)")


def tx(model, audio, **kwargs):
    return model.transcribe(audio, **{key: value for key, value in kwargs.items() if key in _SUPPORTED})


JUNK = {
    "thanks for watching",
    "thank you for watching",
    "subtitles by",
    "please subscribe",
    "like and subscribe",
    "bye",
    "bye bye",
}


def decode_wav(data: bytes):
    try:
        with wave.open(io.BytesIO(data)) as wav_file:
            if (
                wav_file.getnchannels() == 1
                and wav_file.getsampwidth() == 2
                and wav_file.getframerate() == 16000
            ):
                pcm = np.frombuffer(wav_file.readframes(wav_file.getnframes()), dtype=np.int16)
                return pcm.astype(np.float32) / 32768.0
    except Exception:
        pass
    return None


def real_speech_sec(audio: np.ndarray) -> float:
    try:
        timestamps = get_speech_timestamps(
            audio,
            VadOptions(threshold=0.3, min_speech_duration_ms=100),
        )
        return sum(item["end"] - item["start"] for item in timestamps) / 16000
    except Exception:
        return len(audio) / 16000


def looks_english(text: str) -> bool:
    letters = [character for character in text if character.isalpha()]
    return bool(letters) and sum(character.isascii() for character in letters) / len(letters) >= 0.95


def collapse_repeats(text: str) -> str:
    text = re.sub(r"\b(\w+)(\s+\1\b){3,}", r"\1", text, flags=re.I)
    return re.sub(r"\b((?:\w+\s+){1,4}\w+)(?:\s+\1\b){2,}", r"\1", text, flags=re.I)


def run(audio, mode="live", prompt=""):
    final = mode == "final"
    segments, info = tx(
        final_model if final else live_model,
        audio,
        language="en",
        beam_size=1 if (final and DEVICE == "cpu") else (5 if final else 1),
        best_of=1 if (final and DEVICE == "cpu") else (3 if final else 1),
        temperature=0.0 if (final and DEVICE == "cpu") else ([0.0, 0.2, 0.4] if final else 0.0),
        vad_filter=final,
        vad_parameters=dict(threshold=0.3, min_silence_duration_ms=800, speech_pad_ms=500) if final else None,
        condition_on_previous_text=False,
        initial_prompt=(f"{PROMPT} {prompt.strip()}".strip()[-300:] or None),
        hotwords=HOTWORDS,
        no_speech_threshold=0.7,
        log_prob_threshold=-1.5,
        compression_ratio_threshold=2.4,
        without_timestamps=True,
    )
    parts = []
    for segment in segments:
        if final and segment.no_speech_prob > 0.85 and segment.avg_logprob < -1.5:
            print(
                f"   dropped (no-speech): {segment.text.strip()!r} "
                f"logprob={segment.avg_logprob:.2f} no_speech={segment.no_speech_prob:.2f}"
            )
            continue
        text = segment.text.strip()
        if text:
            parts.append(text)
    return " ".join(parts).strip(), info.duration


@app.get("/health")
def health():
    return {
        "ok": True,
        "profile": PROFILE,
        "live": P["live"],
        "final": P["final"],
        "device": DEVICE,
        "compute": COMPUTE,
    }


@app.get("/warmup")
def warmup():
    return {"status": "warmed_up", "profile": PROFILE}


@app.post("/transcribe")
def transcribe(
    file: UploadFile = File(...),
    prompt: str = Form(""),
    mode: str = Form("live"),
):
    data = file.file.read()
    if not data:
        raise HTTPException(400, "Empty audio")

    started = time.time()
    audio = decode_wav(data)
    temporary_path = None
    text, duration, rms = "", 0.0, 1.0
    try:
        if audio is not None:
            duration = len(audio) / 16000
            rms = float(np.sqrt(np.mean(audio**2))) if len(audio) else 0.0
            if rms < MIN_RMS or real_speech_sec(audio) < MIN_SPEECH_SEC:
                return {
                    "success": True,
                    "language": "en",
                    "transcript": "",
                    "audioSec": duration,
                    "ms": 0,
                }
            text, duration = run(audio, mode, prompt)
        else:
            with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as temporary:
                temporary.write(data)
                temporary_path = temporary.name
            text, duration = run(temporary_path, mode, prompt)
    except Exception as error:
        traceback.print_exc()
        raise HTTPException(500, f"{type(error).__name__}: {error}")
    finally:
        if temporary_path and os.path.exists(temporary_path):
            os.remove(temporary_path)

    text = collapse_repeats(text)
    normalized = re.sub(r"[^a-z ]", "", text.lower()).strip()
    if normalized in JUNK and rms < 0.02:
        text = ""
    if text and not looks_english(text):
        text = ""

    elapsed_ms = int((time.time() - started) * 1000)
    print(
        f"[{mode:5s} {elapsed_ms:5d} ms | {duration:4.1f}s audio | "
        f"x{duration / max(elapsed_ms / 1000, 0.001):.1f}] {text!r}"
    )
    return {
        "success": True,
        "language": "en",
        "transcript": text,
        "audioSec": duration,
        "ms": elapsed_ms,
    }


try:
    run(np.zeros(16000, dtype=np.float32), "final")
    run(np.zeros(16000, dtype=np.float32), "live")
    print(f"SELF-TEST OK (live={P['live']}, final={P['final']})")
except Exception:
    traceback.print_exc()
    raise SystemExit("SELF-TEST FAILED. Fix the error above, then start again.")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=int(os.getenv("PORT", "8000")), log_level="info", workers=1)

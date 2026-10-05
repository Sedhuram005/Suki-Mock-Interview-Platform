import os
from fastapi import FastAPI, UploadFile, HTTPException
from fastapi.responses import JSONResponse
from faster_whisper import WhisperModel
import uvicorn
import shutil

app = FastAPI()

# Load the model into memory. "small" is a good balance of speed and accuracy for translations.
# compute_type="int8" reduces memory usage.
print("Loading Whisper model (small)... this may take a moment.")
model = WhisperModel("small", device="cpu", compute_type="int8")
print("Whisper model loaded successfully!")

@app.post("/translate")
async def translate_audio(file: UploadFile):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    # Create a temporary file to store the incoming audio
    temp_file_path = f"temp_{file.filename}"

    try:
        with open(temp_file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        print(f"Processing audio file: {temp_file_path}")

        # Transcribe and translate to English (task="translate")
        segments, info = model.transcribe(temp_file_path, task="translate")

        text = " ".join([segment.text for segment in segments]).strip()
        print(f"Translation complete: {text}")

        return {
            "englishText": text,
            "language": info.language,
            "confidence": info.language_probability,
            "needsReview": False
        }

    except Exception as e:
        print(f"Error processing audio: {e}")
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        # Clean up the temporary file
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)

if __name__ == "__main__":
    print("Starting local Whisper service on port 8000...")
    uvicorn.run(app, host="127.0.0.1", port=8000)

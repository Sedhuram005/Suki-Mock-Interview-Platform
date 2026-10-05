import os
from faster_whisper import WhisperModel

def main():
    print("Loading model (small)...")
    model = WhisperModel("small", device="cpu", compute_type="int8")
    print("Model loaded.")

    folder = "exports/source-review-audio"
    for filename in sorted(os.listdir(folder)):
        if filename.endswith(".webm"):
            path = os.path.join(folder, filename)
            print(f"\nProcessing {filename}...")
            # task='translate' forces translation to English
            segments, info = model.transcribe(path, task="translate")

            text = " ".join([segment.text for segment in segments]).strip()
            print(f"Language detected: {info.language}")
            print(f"English Translation: {text}")

if __name__ == "__main__":
    main()

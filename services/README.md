# English speech service

The app's supported speech server is in ../speech-service.

From the project root, install its dependencies:

    cd speech-service
    pip install -r requirements.txt

Start the local service with the fast English profile:

    .\start.ps1

For a stronger, slower final model, use:

    .\start.ps1 -Profile balanced

For the highest accuracy profile, run:

    .\start.ps1 -Profile accurate

Wait for SELF-TEST OK. The service listens on http://127.0.0.1:8000. The app sends English audio to /transcribe with a live/final mode and the interview question as context.

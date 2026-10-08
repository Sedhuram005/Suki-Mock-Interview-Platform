#!/usr/bin/env sh
cd "$(dirname "$0")/../speech-service"
WHISPER_PROFILE=fast python server.py

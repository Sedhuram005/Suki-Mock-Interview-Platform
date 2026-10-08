param(
    [ValidateSet("fast", "balanced", "accurate", "gpu")]
    [string]$Profile = "fast"
)

$ErrorActionPreference = "Stop"
$env:WHISPER_PROFILE = $Profile

Write-Host "Starting English speech service with profile '$Profile'..."
python (Join-Path $PSScriptRoot "server.py")
exit $LASTEXITCODE

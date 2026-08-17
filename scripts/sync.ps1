$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
python "$projectRoot\apps\local-agent\whoop-local.py" google-sync

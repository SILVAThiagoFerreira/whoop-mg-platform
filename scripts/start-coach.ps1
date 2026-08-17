$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot
python "$projectRoot\apps\local-agent\whoop-local.py" serve-coach --host 127.0.0.1 --port 8765

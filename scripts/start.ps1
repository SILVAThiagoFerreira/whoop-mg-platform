$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
python "$projectRoot\apps\local-agent\whoop-local.py" doctor
Write-Host "Dashboard: execute scripts/dev.ps1 quando quiser iniciar o PWA."
Write-Host "BLE: execute python apps/local-agent/whoop-local.py scan --timeout 12"

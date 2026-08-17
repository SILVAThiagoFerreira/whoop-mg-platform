$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw "Node.js não encontrado" }
if (-not (Get-Command python -ErrorAction SilentlyContinue)) { throw "Python não encontrado" }
npm ci
python -m unittest discover -s tests -v
Write-Host "Setup base concluído. BLEAK é opcional: python -m pip install bleak"

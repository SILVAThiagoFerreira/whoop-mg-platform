$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
$db = if ($env:WHOOP_DATABASE_PATH) { $env:WHOOP_DATABASE_PATH } else { Join-Path $projectRoot "data\whoop.db" }
if (-not (Test-Path -LiteralPath $db)) { throw "Banco não encontrado: $db" }
$backupDir = Join-Path $projectRoot "data\backups"
New-Item -ItemType Directory -Force -Path $backupDir | Out-Null
$target = Join-Path $backupDir ("whoop-" + (Get-Date -Format "yyyyMMdd-HHmmss") + ".db")
Copy-Item -LiteralPath $db -Destination $target
Write-Host "Backup criado: $target"

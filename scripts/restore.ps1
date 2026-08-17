$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
$source = Read-Host "Caminho absoluto do backup SQLite"
if (-not [IO.Path]::IsPathFullyQualified($source)) { throw "Use um caminho absoluto" }
if (-not (Test-Path -LiteralPath $source -PathType Leaf)) { throw "Backup não encontrado" }
$db = if ($env:WHOOP_DATABASE_PATH) { $env:WHOOP_DATABASE_PATH } else { Join-Path $projectRoot "data\whoop.db" }
if (Test-Path -LiteralPath $db) {
  $confirm = Read-Host "O banco atual será substituído. Digite RESTORE para continuar"
  if ($confirm -ne "RESTORE") { throw "Operação cancelada" }
}
New-Item -ItemType Directory -Force -Path (Split-Path -Parent $db) | Out-Null
Copy-Item -LiteralPath $source -Destination $db -Force
Write-Host "Banco restaurado: $db"

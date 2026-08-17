$ErrorActionPreference = "Stop"
$projectRoot = $PSScriptRoot
$desktopRoot = Join-Path $projectRoot "apps\desktop"
$installedBuild = Join-Path $desktopRoot "dist\win-unpacked\Whoop Coach.exe"

Write-Host "WHOOP COACH" -ForegroundColor Green
Write-Host "Iniciando o sistema local..." -ForegroundColor Gray

try {
  $health = Invoke-RestMethod -Uri "http://127.0.0.1:8765/health" -TimeoutSec 1
  Write-Host "Ponte local já está ativa ($($health.model))." -ForegroundColor Green
} catch {
  Write-Host "A ponte será iniciada pelo aplicativo desktop." -ForegroundColor Yellow
}

if (Test-Path -LiteralPath $installedBuild) {
  Start-Process -FilePath $installedBuild -WorkingDirectory $desktopRoot
  exit 0
}

if (-not (Test-Path -LiteralPath (Join-Path $desktopRoot "package.json"))) {
  throw "Aplicativo desktop não encontrado em $desktopRoot"
}

Start-Process -FilePath "npm.cmd" -ArgumentList "start" -WorkingDirectory $desktopRoot
Write-Host "Whoop Coach aberto. Esta janela pode ser fechada." -ForegroundColor Green

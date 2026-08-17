param(
  [Parameter(Mandatory = $true)]
  [string]$Destination
)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
$source = if ($env:OLLAMA_MODELS) { $env:OLLAMA_MODELS } else { Join-Path $env:USERPROFILE ".ollama\models" }
$source = [IO.Path]::GetFullPath($source)
$destinationPath = [IO.Path]::GetFullPath($Destination)

if (-not (Test-Path -LiteralPath $source -PathType Container)) {
  throw "Ollama model store not found: $source"
}

New-Item -ItemType Directory -Force -Path $destinationPath | Out-Null
$ollamaBackup = Join-Path $destinationPath "ollama-models"
New-Item -ItemType Directory -Force -Path $ollamaBackup | Out-Null

Write-Host "Copying Ollama model store from $source"
Copy-Item -LiteralPath (Join-Path $source "blobs") -Destination $ollamaBackup -Recurse -Force
Copy-Item -LiteralPath (Join-Path $source "manifests") -Destination $ollamaBackup -Recurse -Force

$projectBackup = Join-Path $destinationPath "project-model-assets"
New-Item -ItemType Directory -Force -Path $projectBackup | Out-Null
Copy-Item -LiteralPath (Join-Path $projectRoot "models\llm") -Destination $projectBackup -Recurse -Force
Copy-Item -LiteralPath (Join-Path $projectRoot "models\registry") -Destination $projectBackup -Recurse -Force

Write-Host "LLM backup complete: $destinationPath"

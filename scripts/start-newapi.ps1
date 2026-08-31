# Start local New API on :3001 (Docker preferred; falls back to newapi/new-api.exe + SQLite).
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

function Test-Port3001 {
  try {
    $r = Invoke-WebRequest -Uri "http://127.0.0.1:3001/" -UseBasicParsing -TimeoutSec 3
    return $r.StatusCode -ge 200
  } catch {
    return $false
  }
}

if (Test-Port3001) {
  Write-Host "New API already up at http://localhost:3001"
  exit 0
}

$dockerOk = $false
try {
  docker info 2>$null | Out-Null
  if ($LASTEXITCODE -eq 0) { $dockerOk = $true }
} catch { }

if ($dockerOk) {
  Write-Host "Starting via docker compose..."
  docker compose -f docker-compose.newapi.yml up -d
  for ($i = 0; $i -lt 36; $i++) {
    Start-Sleep -Seconds 5
    if (Test-Port3001) {
      Write-Host "New API ready: http://localhost:3001"
      exit 0
    }
  }
  Write-Host "Docker started but :3001 not ready yet; check: docker compose -f docker-compose.newapi.yml logs -f"
  exit 1
}

$exe = Join-Path $root "newapi\new-api.exe"
if (-not (Test-Path $exe)) {
  Write-Error "Docker unavailable and missing $exe"
  exit 1
}

Write-Host "Docker unavailable; starting new-api.exe on :3001 (SQLite)..."
$logs = Join-Path $root "newapi\logs"
New-Item -ItemType Directory -Force -Path $logs | Out-Null
Start-Process -FilePath $exe -ArgumentList "--port", "3001", "--log-dir", $logs -WorkingDirectory (Join-Path $root "newapi") -WindowStyle Hidden
for ($i = 0; $i -lt 24; $i++) {
  Start-Sleep -Seconds 2
  if (Test-Port3001) {
    Write-Host "New API ready: http://localhost:3001"
    Write-Host "Ensure .env has LLM_GATEWAY_BASE_URL=http://127.0.0.1:3001/v1 and LLM_GATEWAY_API_KEY"
    exit 0
  }
}
Write-Error "new-api.exe started but :3001 did not respond"
exit 1

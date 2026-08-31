# Start MJ + Suno selfhost sidecars (Docker Compose profile selfhost)
# Usage: powershell -ExecutionPolicy Bypass -File scripts/start-selfhost.ps1

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

function Test-DockerDaemon {
  docker info *> $null
  return ($LASTEXITCODE -eq 0)
}

function Start-DockerDesktopIfNeeded {
  if (Test-DockerDaemon) { return $true }
  $dockerExe = Join-Path ${env:ProgramFiles} "Docker\Docker\Docker Desktop.exe"
  if (-not (Test-Path $dockerExe)) { return $false }
  Write-Host "Docker daemon down - launching Docker Desktop..."
  Start-Process $dockerExe | Out-Null
  $deadline = (Get-Date).AddMinutes(4)
  do {
    Start-Sleep -Seconds 6
    if (Test-DockerDaemon) { return $true }
    Write-Host "  waiting for Docker..."
  } while ((Get-Date) -lt $deadline)
  return $false
}

Write-Host "== MJ / Suno selfhost sidecars ==" -ForegroundColor Cyan

if (-not (Start-DockerDesktopIfNeeded)) {
  Write-Host "Docker is not running." -ForegroundColor Red
  Write-Host "  1) Open Docker Desktop manually"
  Write-Host "  2) If WSL errors: npm run integrations:fix-docker (Admin PowerShell)"
  Write-Host "  3) Re-run: npm run integrations:selfhost"
  exit 1
}

$selfhostExample = Join-Path $Root "selfhost.env.example"
$selfhostEnv = Join-Path $Root ".env.selfhost"
if (-not (Test-Path $selfhostEnv)) {
  if (Test-Path $selfhostExample) {
    Copy-Item $selfhostExample $selfhostEnv
    Write-Host "Created .env.selfhost - fill Discord Token / Suno Cookie / 2Captcha, then re-run." -ForegroundColor Yellow
    exit 2
  }
  Write-Host "Missing .env.selfhost - copy from selfhost.env.example" -ForegroundColor Red
  exit 2
}

$siteEnv = Join-Path $Root ".env"
if (-not (Test-Path $siteEnv)) {
  Write-Host "[WARN] Site .env not found; sidecar URLs may be missing." -ForegroundColor Yellow
}

$composeArgs = @(
  "compose",
  "--env-file", ".env",
  "--env-file", ".env.selfhost",
  "-f", "docker-compose.integrations.yml",
  "--profile", "selfhost",
  "up", "-d"
)

Write-Host ("docker " + ($composeArgs -join " "))
& docker @composeArgs
if ($LASTEXITCODE -ne 0) {
  Write-Host "Compose failed." -ForegroundColor Red
  exit $LASTEXITCODE
}

Write-Host "Waiting for sidecars (first start can take 1-2 min)..."
Start-Sleep -Seconds 12

& powershell -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot "check-selfhost.ps1")
exit $LASTEXITCODE

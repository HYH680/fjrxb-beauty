# Health check for MJ / Suno selfhost sidecars
# Usage: powershell -ExecutionPolicy Bypass -File scripts/check-selfhost.ps1

$ErrorActionPreference = "Continue"
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

function Test-PortListen([int]$Port) {
  try {
    $c = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
    return [bool]$c
  } catch {
    return $false
  }
}

function Test-Http([string]$Url, [int]$TimeoutSec = 3) {
  try {
    $null = Invoke-WebRequest -Uri $Url -Method GET -TimeoutSec $TimeoutSec -UseBasicParsing
    return $true
  } catch {
    return $false
  }
}

function Get-ContainerState([string]$Name) {
  try {
    $line = docker inspect -f "{{.State.Status}}|{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}" $Name 2>$null
    if (-not $line) { return $null }
    $parts = $line -split "\|", 2
    return @{ Status = $parts[0]; Health = $parts[1] }
  } catch {
    return $null
  }
}

function Env-CredentialFilled([string]$Path, [string]$Key) {
  if (-not (Test-Path $Path)) { return $false }
  foreach ($line in Get-Content $Path) {
    if ($line -match "^$Key=(.+)$") {
      return ($Matches[1].Trim().Length -gt 0)
    }
  }
  return $false
}

Write-Host "== MJ / Suno selfhost check ==" -ForegroundColor Cyan
Write-Host ""

$fail = 0
$credWarn = 0

foreach ($item in @(
  @{ Name = "ai-supermarket-mj-proxy"; Label = "Midjourney proxy"; Port = 8080 },
  @{ Name = "ai-supermarket-suno-api"; Label = "Suno api"; Port = 3001 }
)) {
  $state = Get-ContainerState $item.Name
  $portUp = Test-PortListen $item.Port
  $httpUp = if ($portUp) { Test-Http "http://127.0.0.1:$($item.Port)/" } else { $false }

  if (-not $state) {
    Write-Host "[FAIL] $($item.Label) container missing ($($item.Name))" -ForegroundColor Red
    $fail++
    continue
  }

  $statusColor = if ($state.Status -eq "running") { "Green" } else { "Red" }
  Write-Host "[$($state.Status.ToUpper())] $($item.Label)" -ForegroundColor $statusColor
  Write-Host "       container: $($item.Name)  health: $($state.Health)"
  Write-Host "       port $($item.Port): $(if ($portUp) { 'listen' } else { 'DOWN' })  http: $(if ($httpUp) { 'ok' } else { 'no response' })"

  if ($state.Status -ne "running" -or -not $portUp) { $fail++ }
}

Write-Host ""

$selfhostEnv = Join-Path $Root ".env.selfhost"
if (-not (Test-Path $selfhostEnv)) {
  Write-Host "[WARN] Missing .env.selfhost" -ForegroundColor Yellow
  $credWarn++
} else {
  $mjOk = (Env-CredentialFilled $selfhostEnv "MJ_DISCORD_USER_TOKEN") -and (Env-CredentialFilled $selfhostEnv "MJ_DISCORD_GUILD_ID") -and (Env-CredentialFilled $selfhostEnv "MJ_DISCORD_CHANNEL_ID")
  $sunoOk = (Env-CredentialFilled $selfhostEnv "SUNO_COOKIE") -and (Env-CredentialFilled $selfhostEnv "TWOCAPTCHA_KEY")
  if (-not $mjOk) {
    Write-Host "[WARN] MJ Discord fields empty in .env.selfhost (proxy up but imagine will fail)" -ForegroundColor Yellow
    $credWarn++
  }
  if (-not $sunoOk) {
    Write-Host "[WARN] SUNO_COOKIE / TWOCAPTCHA_KEY empty in .env.selfhost (music will fail)" -ForegroundColor Yellow
    $credWarn++
  }
}

$envFile = Join-Path $Root ".env"
if (Test-Path $envFile) {
  $raw = Get-Content $envFile -Raw
  $mjBase = if ($raw -match '(?m)^MIDJOURNEY_PROXY_BASE=(.+)$') { $Matches[1].Trim() } else { "(unset)" }
  $sunoBase = if ($raw -match '(?m)^SUNO_BASE_URL=(.+)$') { $Matches[1].Trim() } else { "(unset)" }
  Write-Host "Site .env sidecar URLs:"
  Write-Host "  MIDJOURNEY_PROXY_BASE=$mjBase"
  Write-Host "  SUNO_BASE_URL=$sunoBase"
}

Write-Host ""
if ($fail -eq 0 -and $credWarn -eq 0) {
  Write-Host "Sidecars up and credentials look filled. Test MJ + Suno in workspace." -ForegroundColor Green
} elseif ($fail -eq 0) {
  Write-Host "Sidecars up but credentials missing - edit .env.selfhost then: npm run integrations:selfhost" -ForegroundColor Yellow
} else {
  Write-Host "Sidecars not ready. Run: npm run integrations:selfhost" -ForegroundColor Red
  Write-Host "Docs: docs/suno-mj-selfhost.md"
}

Write-Host ""
Write-Host "Reminder: renew Suno Cookie / MJ Discord Token; keep 2Captcha balance."

exit $fail

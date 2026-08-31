# AI supermarket local integrations (no Docker required)
# Usage: powershell -ExecutionPolicy Bypass -File scripts/start-integrations.ps1

$ErrorActionPreference = "Continue"
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

function Test-Port([int]$Port) {
  try {
    $c = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
    return [bool]$c
  } catch {
    return $false
  }
}

Write-Host "== AI supermarket integrations =="

# 1) n8n webhook stub
if (Test-Port 5678) {
  Write-Host "port 5678 already listening"
} else {
  Write-Host "starting n8n webhook stub on 5678"
  Start-Process -WindowStyle Minimized -FilePath "node" -ArgumentList "scripts/n8n-webhook-stub.mjs" -WorkingDirectory $Root
  Start-Sleep -Seconds 1
}

# 2) optional local faster-whisper (Python 3.11-3.14)
$whisperPy = $null
foreach ($v in @("3.14", "3.13", "3.12", "3.11")) {
  $p = & py "-$v" -c "import sys; print(sys.executable)" 2>$null
  if ($LASTEXITCODE -eq 0 -and $p) {
    $whisperPy = $p.Trim()
    break
  }
}

if (-not $whisperPy) {
  Write-Host "no Python 3.11-3.14; skip local whisper (use Qwen ASR)"
} elseif (Test-Port 8091) {
  Write-Host "port 8091 already listening"
} else {
  Write-Host "starting faster-whisper on 8091 with $whisperPy"
  $env:WHISPER_MODEL = if ($env:WHISPER_MODEL) { $env:WHISPER_MODEL } else { "base" }
  $env:HF_ENDPOINT = if ($env:HF_ENDPOINT) { $env:HF_ENDPOINT } else { "https://hf-mirror.com" }
  $env:HF_HUB_DISABLE_XET = "1"
  # Broken Windows root CA store often breaks HuggingFace downloads
  if (-not $env:WHISPER_INSECURE_SSL) { $env:WHISPER_INSECURE_SSL = "1" }
  try {
    $ca = & $whisperPy -c "import certifi; print(certifi.where())" 2>$null
    if ($ca) {
      $env:SSL_CERT_FILE = $ca.Trim()
      $env:REQUESTS_CA_BUNDLE = $ca.Trim()
      $env:CURL_CA_BUNDLE = $ca.Trim()
    }
  } catch {}
  $whisperDir = Join-Path $Root "services\whisper"
  Start-Process -WindowStyle Minimized -FilePath $whisperPy -ArgumentList "-m","uvicorn","main:app","--host","127.0.0.1","--port","8091" -WorkingDirectory $whisperDir
}

# 2b) optional doc extract on 8092
if (Test-Port 8092) {
  Write-Host "port 8092 already listening"
} elseif ($whisperPy) {
  Write-Host "ensuring pypdf for docling sidecar"
  & $whisperPy -m pip install -q fastapi uvicorn python-multipart pypdf 2>$null | Out-Null
  Write-Host "starting doc extract on 8092"
  $docDir = Join-Path $Root "services\docling"
  Start-Process -WindowStyle Minimized -FilePath $whisperPy -ArgumentList "-m","uvicorn","main:app","--host","127.0.0.1","--port","8092" -WorkingDirectory $docDir
} else {
  Write-Host "skip docling sidecar (no suitable Python)"
}

# 3) ensure .env keys
$envFile = Join-Path $Root ".env"
if (Test-Path $envFile) {
  $raw = Get-Content $envFile -Raw
  $need = @()
  if ($raw -notmatch '(?m)^N8N_WEBHOOK_URL=') {
    $need += "N8N_WEBHOOK_URL=http://127.0.0.1:5678/webhook/ai-supermarket"
  }
  if ($raw -notmatch '(?m)^IMAGE_PROVIDER=') {
    $need += "IMAGE_PROVIDER=auto"
  }
  if ($raw -notmatch '(?m)^DASHSCOPE_ASR_MODEL=') {
    $need += "DASHSCOPE_ASR_MODEL=qwen3-asr-flash"
  }
  if ($need.Count -gt 0) {
    Add-Content $envFile ("`n# start-integrations auto`n" + ($need -join "`n"))
    Write-Host "env updated"
  }
}

Start-Sleep -Seconds 2
$s5678 = if (Test-Port 5678) { "UP" } else { "DOWN" }
$s8091 = if (Test-Port 8091) { "UP" } else { "DOWN (Qwen ASR ok)" }
$s8092 = if (Test-Port 8092) { "UP" } else { "DOWN (unpdf ok)" }
$s3000 = if (Test-Port 3000) { "UP" } else { "start npm run dev" }
Write-Host ""
Write-Host "status:"
Write-Host "  n8n/stub  :5678  $s5678"
Write-Host "  whisper   :8091  $s8091"
Write-Host "  docling   :8092  $s8092"
Write-Host "  next      :3000  $s3000"
Write-Host ""
Write-Host "image/tts/asr use QWEN_API_KEY by default."
Write-Host "see switches on /account  (开/关差异)"
Write-Host "fix Docker: run scripts/fix-wsl-docker.ps1 as Administrator"
Write-Host "compose: docker compose -f docker-compose.integrations.yml --profile full up -d"
Write-Host "MJ/Suno selfhost: npm run integrations:selfhost  (check: npm run integrations:check-selfhost)"

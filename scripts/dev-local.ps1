# Start Next.js detached (survives closed stdin) and warm /api/catalog.
# Usage: npm run dev:local
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$npm = (Get-Command npm.cmd).Source
$outLog = Join-Path $root "dev-out.log"
$errLog = Join-Path $root "dev-err.log"

# Free port 3000 if a stale listener remains
Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue |
  ForEach-Object {
    Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
  }
Start-Sleep -Seconds 1

Remove-Item $outLog, $errLog -ErrorAction SilentlyContinue

$proc = Start-Process -FilePath $npm `
  -ArgumentList @("run", "dev") `
  -WorkingDirectory $root `
  -WindowStyle Hidden `
  -PassThru `
  -RedirectStandardOutput $outLog `
  -RedirectStandardError $errLog

Write-Host "STARTED pid=$($proc.Id)"

$ready = $false
for ($i = 0; $i -lt 60; $i++) {
  Start-Sleep -Seconds 1
  $listen = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue
  if ($listen) {
    Write-Host "LISTEN after ${i}s"
    $ready = $true
    break
  }
}

if (-not $ready) {
  Write-Host "FAILED: port 3000 not listening"
  Get-Content $outLog -ErrorAction SilentlyContinue
  Get-Content $errLog -ErrorAction SilentlyContinue
  exit 1
}

# Warm critical route so first browser hit is not a cold compile
$warmOk = $false
for ($i = 0; $i -lt 60; $i++) {
  try {
    $res = Invoke-WebRequest -Uri "http://127.0.0.1:3000/api/catalog" -UseBasicParsing -TimeoutSec 90
    if ($res.StatusCode -eq 200) {
      Write-Host "WARM catalog 200 len=$($res.Content.Length) after ${i}s"
      $warmOk = $true
      break
    }
  } catch {
    if ($i % 5 -eq 0) { Write-Host "warm wait $i : $($_.Exception.Message)" }
  }
  Start-Sleep -Seconds 2
}

if (-not $warmOk) {
  Write-Host "WARN: catalog warm failed; server is up but first hit may be slow"
  exit 2
}

Write-Host "READY http://127.0.0.1:3000"
exit 0

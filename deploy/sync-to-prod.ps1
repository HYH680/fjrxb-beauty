# Deploy ai-supermarket to HK production (119.28.45.212).
# Does not touch remote .env or prisma/prod.db (remote-apply preserves them).
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root
Write-Host "deploy:prod via scripts/deploy-prod.mjs"
node scripts/deploy-prod.mjs
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

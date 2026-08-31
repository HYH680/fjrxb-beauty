# Unattended WSL2 + VirtualMachinePlatform enable for Docker Desktop.
# Requires Administrator. Logs to scripts/fix-wsl-docker.log

$ErrorActionPreference = "Continue"
$Log = Join-Path $PSScriptRoot "fix-wsl-docker.log"

function Write-Log([string]$Message) {
  $line = "[{0}] {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $Message
  Add-Content -LiteralPath $Log -Value $line -Encoding UTF8
  Write-Host $line
}

$IsAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
  [Security.Principal.WindowsBuiltInRole]::Administrator
)
if (-not $IsAdmin) {
  Write-Log "not admin; relaunching with UAC"
  Start-Process powershell -Verb RunAs -Wait -ArgumentList @(
    "-NoProfile",
    "-ExecutionPolicy", "Bypass",
    "-File", "`"$PSCommandPath`""
  )
  exit 0
}

Write-Log "admin session start"
Write-Log "== Enable Microsoft-Windows-Subsystem-Linux =="
dism.exe /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /norestart
Write-Log "dism WSL exit=$LASTEXITCODE"

Write-Log "== Enable VirtualMachinePlatform =="
dism.exe /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart
Write-Log "dism VMP exit=$LASTEXITCODE"

Write-Log "== wsl --install -d Ubuntu --no-launch =="
wsl --install -d Ubuntu --no-launch
Write-Log "wsl install exit=$LASTEXITCODE"

Write-Log "== wsl --set-default-version 2 =="
wsl --set-default-version 2
Write-Log "wsl default v2 exit=$LASTEXITCODE"

Write-Log "== wsl --update =="
wsl --update
Write-Log "wsl update exit=$LASTEXITCODE"

Write-Log "== wsl --status =="
wsl --status
Write-Log "wsl status exit=$LASTEXITCODE"

Write-Log "admin session done"

# Fix WSL2 + Ubuntu so Docker Desktop can start.
# Run as Administrator:
#   powershell -ExecutionPolicy Bypass -File scripts\fix-wsl-docker.ps1

$ErrorActionPreference = "Stop"
$IsAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $IsAdmin) {
  Write-Host "Need admin. Opening UAC prompt..."
  $script = $MyInvocation.MyCommand.Path
  Start-Process powershell -Verb RunAs -ArgumentList "-NoProfile","-ExecutionPolicy","Bypass","-File","`"$script`"" | Out-Null
  exit 0
}

Write-Host "== Enable WSL / VirtualMachinePlatform =="
dism.exe /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /norestart
dism.exe /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart

Write-Host "== Install/update WSL + Ubuntu =="
wsl --install -d Ubuntu --no-launch
wsl --set-default-version 2
wsl --update

Write-Host ""
Write-Host "Done. Next steps:"
Write-Host "  1) Reboot if Windows asks"
Write-Host "  2) Open Ubuntu once to finish setup"
Write-Host "  3) Start Docker Desktop until engine is green"
Write-Host "  4) In project folder run:"
Write-Host "       docker compose -f docker-compose.integrations.yml up -d"
Write-Host ""
Read-Host "Press Enter to exit"

# Stage 2: enable VirtualMachinePlatform then try WSL install.
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
  Write-Log "stage2 not admin; relaunching with UAC"
  Start-Process powershell -Verb RunAs -Wait -ArgumentList @(
    "-NoProfile",
    "-ExecutionPolicy", "Bypass",
    "-File", "`"$PSCommandPath`""
  )
  exit 0
}

Write-Log "stage2 admin session start"
Write-Log "== Enable VirtualMachinePlatform =="
$p = Start-Process -FilePath "dism.exe" -ArgumentList @("/online","/enable-feature","/featurename:VirtualMachinePlatform","/all","/norestart") -Wait -PassThru -NoNewWindow
Write-Log "dism VMP exit=$($p.ExitCode)"

Write-Log "== wsl --install -d Ubuntu --no-launch =="
$p2 = Start-Process -FilePath "wsl.exe" -ArgumentList @("--install","-d","Ubuntu","--no-launch") -Wait -PassThru -NoNewWindow
Write-Log "wsl install exit=$($p2.ExitCode)"

Write-Log "== wsl --set-default-version 2 =="
$p3 = Start-Process -FilePath "wsl.exe" -ArgumentList @("--set-default-version","2") -Wait -PassThru -NoNewWindow
Write-Log "wsl default v2 exit=$($p3.ExitCode)"

Write-Log "== wsl --update =="
$p4 = Start-Process -FilePath "wsl.exe" -ArgumentList @("--update") -Wait -PassThru -NoNewWindow
Write-Log "wsl update exit=$($p4.ExitCode)"

Write-Log "stage2 admin session done"

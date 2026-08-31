$p = Get-ItemProperty "HKCU:\Software\Kingsoft\Office\6.0\Common"
$et = [System.IO.Path]::Combine($p.InstallRoot, "office6", "et.exe")
$desktop = [Environment]::GetFolderPath("Desktop")
$file = [System.IO.Directory]::GetFiles($desktop, "*supermarket*.xls")[0]
if (-not [System.IO.File]::Exists($et)) { throw "et.exe not found: $et" }
if (-not $file) { throw "xls not found on Desktop" }
Start-Process -FilePath $et -ArgumentList @("`"$file`"")
Write-Output "opened $file"

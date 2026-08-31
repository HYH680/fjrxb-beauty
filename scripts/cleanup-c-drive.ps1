#Requires -Version 5.1
<#
.SYNOPSIS
  清理 C 盘已迁到 E 盘的冗余资料（保留 Cursor 相关）。

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File scripts\cleanup-c-drive.ps1
  powershell -ExecutionPolicy Bypass -File scripts\cleanup-c-drive.ps1 -WhatIf
#>
[CmdletBinding(SupportsShouldProcess)]
param(
  [switch]$IncludeNpmCache,
  [switch]$IncludeTemp
)

$ErrorActionPreference = 'Continue'
$user = $env:USERPROFILE

function Get-DirGB([string]$Path) {
  if (-not (Test-Path -LiteralPath $Path)) { return $null }
  $sum = (Get-ChildItem -LiteralPath $Path -Recurse -Force -ErrorAction SilentlyContinue |
    Measure-Object -Property Length -Sum).Sum
  if ($null -eq $sum) { return 0 }
  return [math]::Round($sum / 1GB, 2)
}

function Remove-Tree([string]$Path, [string]$Reason) {
  if (-not (Test-Path -LiteralPath $Path)) {
    Write-Host "SKIP (missing): $Path"
    return 0
  }
  $gb = Get-DirGB $Path
  if ($PSCmdlet.ShouldProcess($Path, "Remove ($Reason, ~${gb} GB)")) {
    cmd /c "rmdir /s /q `"$Path`""
    if (Test-Path -LiteralPath $Path) {
      Write-Warning "FAILED: $Path"
      return 0
    }
    Write-Host "REMOVED: $Path (~${gb} GB)" -ForegroundColor Green
    return $gb
  }
  return 0
}

Write-Host '=== C 盘清理（保留 Cursor）===' -ForegroundColor Cyan
$freeBefore = (Get-PSDrive -Name C).Free
Write-Host ("C 空闲: {0:N2} GB" -f ($freeBefore / 1GB))

# 安全：E 盘主副本存在才删 C 盘旧项目
$eRoot = 'E:\ai-supermarket'
if (-not (Test-Path -LiteralPath (Join-Path $eRoot 'package.json'))) {
  throw "E:\ai-supermarket 不完整，已中止。请先确认 E 盘主站可用。"
}

$targets = @(
  @{ Path = Join-Path $user 'Projects\ai-supermarket'; Reason = '已迁到 E:\ai-supermarket' },
  @{ Path = Join-Path $user 'Projects\freellmapi'; Reason = '已拷到 E:\freellmapi' },
  @{ Path = Join-Path $user 'Projects\capcut-mate'; Reason = 'vendor 内已有 capcut-mate' }
)

$freed = 0.0
foreach ($t in $targets) {
  $freed += Remove-Tree -Path $t.Path -Reason $t.Reason
}

if ($IncludeNpmCache) {
  $npm = Join-Path $user 'AppData\Local\npm-cache'
  $freed += Remove-Tree -Path $npm -Reason 'npm 缓存（项目用 E:\cache\npm）'
}

if ($IncludeTemp) {
  $temp = Join-Path $user 'AppData\Local\Temp'
  Get-ChildItem -LiteralPath $temp -Force -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -notmatch 'cursor|Cursor' } |
    ForEach-Object {
      try {
        if ($_.PSIsContainer) { Remove-Item -LiteralPath $_.FullName -Recurse -Force -ErrorAction Stop }
        else { Remove-Item -LiteralPath $_.FullName -Force -ErrorAction Stop }
      } catch {}
    }
  Write-Host 'TEMP: 已清理非 Cursor 临时文件（跳过名称含 cursor 的项）'
}

$freeAfter = (Get-PSDrive -Name C).Free
Write-Host ''
Write-Host ("预计释放约 {0:N2} GB" -f $freed)
Write-Host ("C 空闲: {0:N2} GB -> {1:N2} GB" -f ($freeBefore / 1GB), ($freeAfter / 1GB))
Write-Host ''
Write-Host '保留未动：' -ForegroundColor Yellow
Write-Host "  $user\.cursor"
Write-Host "  AppData\Local\Programs\cursor* / Roaming\Cursor"
Write-Host "  其它非上述路径的 Cursor 配置与对话缓存"

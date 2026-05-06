# Builds the Android release artifact from a SUBST drive letter so CMake/Ninja object paths
# stay under Windows' legacy ~260-character limit (fixes codegen paths under deep folders like Desktop).
#
# Usage (from repo root): npm run android:apk:subst
# Override letter if R: is taken: $env:ANDROID_SUBST_DRIVE = 'S'; npm run android:apk:subst
#
param(
  [string]$DriveLetter = '',
  [ValidateSet('assembleRelease', 'bundleRelease')]
  [string]$GradleTask = 'assembleRelease'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

if ($DriveLetter -ne '' -and ($DriveLetter.Length -ne 1 -or $DriveLetter -notmatch '^[A-Za-z]$')) {
  throw '-DriveLetter must be a single letter A-Z (omit it to auto-use R: or ANDROID_SUBST_DRIVE).'
}

$letter =
if ($DriveLetter.Length -eq 1) {
  $DriveLetter.ToUpperInvariant()
} elseif ($env:ANDROID_SUBST_DRIVE) {
  $env:ANDROID_SUBST_DRIVE.TrimEnd(':').Substring(0, 1).ToUpperInvariant()
} else {
  'R'
}

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$drivePath = "${letter}:"

$previousPwd = Get-Location

try {
  if (Test-Path $drivePath) {
    subst.exe "${letter}:" /d 2>$null | Out-Null
  }
  if (Test-Path $drivePath) {
    throw "${drivePath} is already in use. Pick another drive (run with `-DriveLetter S` or set env ANDROID_SUBST_DRIVE=S)."
  }

  $null = subst.exe "${letter}:" $projectRoot
  Set-Location (Join-Path $drivePath 'android')

  $env:NODE_ENV = 'production'

  Write-Host "SUBST ${letter}: -> $projectRoot"
  Write-Host "Running gradlew.bat $GradleTask ..."

  & .\gradlew.bat $GradleTask
  exit $LASTEXITCODE
} finally {
  Set-Location $previousPwd
  subst.exe "${letter}:" /d 2>$null | Out-Null
}

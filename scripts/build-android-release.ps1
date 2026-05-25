# Builds Android release artifacts. Expo prebuild and Gradle run from the real project path.
#
# Usage (from repo root):
#   npm run android:release          # phone + TV APKs -> dist/
#   npm run android:apk:subst        # phone APK only
#   npm run android:release:tv       # TV APK only
param(
  [ValidateSet('assembleRelease', 'bundleRelease')]
  [string]$GradleTask = 'assembleRelease',
  [ValidateSet('phone', 'tv', 'both')]
  [string]$Target = 'phone'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$gradleAndroidDir = Join-Path $projectRoot 'android'
$previousCi = $env:CI
$builtArtifacts = [System.Collections.Generic.List[string]]::new()

function Set-TvPrebuildEnv {
  param([bool]$IsTV)
  if ($IsTV) {
    $env:EXPO_TV = '1'
  } elseif (Test-Path Env:EXPO_TV) {
    Remove-Item Env:EXPO_TV
  }
}

function Invoke-ExpoPrebuild {
  param(
    [bool]$IsTV
  )
  $label = if ($IsTV) { 'TV' } else { 'Phone' }
  Set-TvPrebuildEnv -IsTV $IsTV
  Write-Host "Running expo prebuild --clean --platform android ($label)..."
  Push-Location $projectRoot
  try {
    $env:CI = '1'
    & npx expo prebuild --clean --platform android
    if ($LASTEXITCODE -ne 0) {
      throw "expo prebuild failed for $label (exit $LASTEXITCODE)"
    }
  } finally {
    Pop-Location
  }
}

function Invoke-GradleRelease {
  param([string]$Task)
  if (-not (Test-Path $gradleAndroidDir)) {
    throw "Android project not found at $gradleAndroidDir (prebuild may have failed)."
  }
  Push-Location $gradleAndroidDir
  try {
    $env:NODE_ENV = 'production'
    Write-Host "Running gradlew.bat $Task from $gradleAndroidDir ..."
    & .\gradlew.bat $Task
    if ($LASTEXITCODE -ne 0) {
      throw "gradlew $Task failed (exit $LASTEXITCODE)"
    }
  } finally {
    Pop-Location
  }
}

function Copy-ReleaseArtifact {
  param(
    [bool]$IsTV,
    [string]$Task
  )
  $slug = if ($IsTV) { 'tv' } else { 'phone' }
  $distDir = Join-Path $projectRoot 'dist'
  New-Item -ItemType Directory -Force -Path $distDir | Out-Null

  if ($Task -eq 'bundleRelease') {
    $src = Join-Path $projectRoot 'android\app\build\outputs\bundle\release\app-release.aab'
    $dest = Join-Path $distDir "cinepro-$slug-release.aab"
  } else {
    $src = Join-Path $projectRoot 'android\app\build\outputs\apk\release\app-release.apk'
    $dest = Join-Path $distDir "cinepro-$slug-release.apk"
  }

  if (-not (Test-Path $src)) {
    throw "Expected artifact not found: $src"
  }

  Copy-Item -Force $src $dest
  $builtArtifacts.Add($dest) | Out-Null
  Write-Host "Wrote $dest"
}

function Build-Target {
  param(
    [bool]$IsTV,
    [string]$Task
  )
  $label = if ($IsTV) { 'TV' } else { 'Phone' }
  Write-Host ""
  Write-Host "========== Building $label release =========="
  Invoke-ExpoPrebuild -IsTV $IsTV
  Invoke-GradleRelease -Task $Task
  Copy-ReleaseArtifact -IsTV $IsTV -Task $Task
}

try {
  Write-Host "Project: $projectRoot"
  Write-Host "Target: $Target | Gradle task: $GradleTask"

  $variants = @()
  switch ($Target) {
    'both' { $variants = @($false, $true) }
    'tv' { $variants = @($true) }
    default { $variants = @($false) }
  }

  foreach ($isTv in $variants) {
    Build-Target -IsTV $isTv -Task $GradleTask
  }

  if ($Target -eq 'both') {
    Write-Host ""
    Write-Host "Restoring phone android/ project for local development..."
    Invoke-ExpoPrebuild -IsTV $false
  }

  Write-Host ""
  Write-Host "Build complete:"
  foreach ($artifact in $builtArtifacts) {
    Write-Host "  $artifact"
  }

  exit 0
} finally {
  if ($null -eq $previousCi) {
    if (Test-Path Env:CI) { Remove-Item Env:CI }
  } else {
    $env:CI = $previousCi
  }
  if (Test-Path Env:EXPO_TV) {
    Remove-Item Env:EXPO_TV
  }
}

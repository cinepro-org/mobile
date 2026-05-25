# Builds Android release artifacts. Expo prebuild and Gradle run from the real project path.
#
# Usage (from repo root):
#   npm run android:release              # clean prebuild + phone + TV APKs -> dist/
#   npm run android:release:tv         # clean prebuild + TV APK only
#   npm run android:release:tv:dirty   # reuse android/ + Gradle only (fast JS/UI testing)
#   npm run android:apk:dirty          # Gradle only (uses whatever android/ is already configured)
#
# Parameters:
#   -Dirty      Skip prebuild; run Gradle against the existing android/ project (fastest).
#   -SkipClean  Run `expo prebuild` without --clean (native changes, no full wipe).
param(
  [ValidateSet('assembleRelease', 'bundleRelease')]
  [string]$GradleTask = 'assembleRelease',
  [ValidateSet('phone', 'tv', 'both')]
  [string]$Target = 'phone',
  [switch]$Dirty,
  [switch]$SkipClean
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
    [bool]$IsTV,
    [bool]$Clean
  )
  $label = if ($IsTV) { 'TV' } else { 'Phone' }
  Set-TvPrebuildEnv -IsTV $IsTV
  $cleanFlag = if ($Clean) { '--clean' } else { '' }
  Write-Host "Running expo prebuild $cleanFlag --platform android ($label)...".Trim()
  Push-Location $projectRoot
  try {
    $env:CI = '1'
    if ($Clean) {
      & npx expo prebuild --clean --platform android
    } else {
      & npx expo prebuild --platform android
    }
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
    throw "Android project not found at $gradleAndroidDir. Run a full build first (without -Dirty)."
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
    [string]$Task,
    [bool]$UseDirty,
    [bool]$UseSkipClean
  )
  $label = if ($IsTV) { 'TV' } else { 'Phone' }
  Write-Host ""
  Write-Host "========== Building $label release =========="
  if ($UseDirty) {
    Write-Host "Dirty build: skipping prebuild (reusing existing android/ project)."
    if ($IsTV) {
      Set-TvPrebuildEnv -IsTV $true
    }
  } else {
    $clean = -not $UseSkipClean
    Invoke-ExpoPrebuild -IsTV $IsTV -Clean $clean
  }
  Invoke-GradleRelease -Task $Task
  Copy-ReleaseArtifact -IsTV $IsTV -Task $Task
}

try {
  Write-Host "Project: $projectRoot"
  $mode = if ($Dirty) { 'dirty (gradle only)' } elseif ($SkipClean) { 'prebuild (no clean)' } else { 'clean prebuild' }
  Write-Host "Target: $Target | Gradle task: $GradleTask | Mode: $mode"

  if ($Dirty -and $SkipClean) {
    throw 'Use either -Dirty or -SkipClean, not both.'
  }

  if ($Dirty -and $Target -eq 'both') {
    throw '-Dirty cannot build both phone and TV in one run (android/ can only match one variant). Use -Target tv or -Target phone.'
  }

  $variants = @()
  switch ($Target) {
    'both' { $variants = @($false, $true) }
    'tv' { $variants = @($true) }
    default { $variants = @($false) }
  }

  foreach ($isTv in $variants) {
    Build-Target -IsTV $isTv -Task $GradleTask -UseDirty:$Dirty -UseSkipClean:$SkipClean
  }

  if (-not $Dirty -and $Target -eq 'both') {
    Write-Host ""
    Write-Host "Restoring phone android/ project for local development..."
    Invoke-ExpoPrebuild -IsTV $false -Clean:(-not $SkipClean)
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

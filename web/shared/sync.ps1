param(
  [string]$SharedDir,
  [switch]$SkipMissing,
  [switch]$WhatIf
)

$ErrorActionPreference = "Stop"

if (-not $SharedDir) {
  $SharedDir = Split-Path -Parent $PSScriptRoot
  if (-not $SharedDir) { $SharedDir = Get-Location }
}
if (-not (Test-Path $SharedDir)) {
  Write-Error "Shared directory not found: $SharedDir"
  exit 1
}

$Projects = @(
  "Whiteboard", "Shader", "3D", "Design", "Graphics",
  "Music", "Presentations", "Spreadsheets", "Video"
)

$JsFiles = @("agent-cursor.js", "canvas-export.js")

# agent-cursor-provider.tsx goes into each project's src/components/ (Next.js)
# or public/ (dx-www projects use JS directly, so we skip provider for them)
$NextJsProjects = @("3D", "Design", "Graphics", "Music", "Presentations", "Spreadsheets", "Video")
$ProviderFile = "agent-cursor-provider.tsx"

$Copied = 0
$Skipped = 0
$Errors = 0

function Get-FileHashValue($Path) {
  try {
    $hash = Get-FileHash -LiteralPath $Path -Algorithm SHA256 -ErrorAction Stop
    return $hash.Hash
  } catch {
    return $null
  }
}

function Needs-Sync($Source, $Dest) {
  if (-not (Test-Path $Dest)) { return $true }
  $srcHash = Get-FileHashValue $Source
  $dstHash = Get-FileHashValue $Dest
  return $srcHash -ne $dstHash
}

function Sync-File($Source, $Dest, $Label) {
  if (-not (Test-Path $Source)) {
    Write-Warning "Source not found: $Source"
    return $false
  }
  if (-not (Needs-Sync $Source $Dest)) {
    $script:Skipped++
    Write-Output "Skipped (identical): $Label"
    return $true
  }
  if ($WhatIf) {
    Write-Output "[WhatIf] Would copy: $Label"
    $script:Copied++
    return $true
  }
  try {
    $parent = Split-Path -Parent $Dest
    if (-not (Test-Path $parent)) {
      New-Item -ItemType Directory -Path $parent -Force | Out-Null
    }
    Copy-Item -LiteralPath $Source -Destination $Dest -Force -ErrorAction Stop
    Write-Output "Copied: $Label"
    $script:Copied++
    return $true
  } catch {
    Write-Warning "Failed to copy $Label : $_"
    $script:Errors++
    return $false
  }
}

# Sync JS files to public/ for each project
foreach ($Project in $Projects) {
  $PublicDir = Join-Path (Join-Path $SharedDir $Project) "public"
  if (-not (Test-Path $PublicDir)) {
    if ($SkipMissing) {
      continue
    }
    try {
      New-Item -ItemType Directory -Path $PublicDir -Force | Out-Null
      Write-Output "Created $PublicDir"
    } catch {
      if (-not $SkipMissing) {
        Write-Warning "Skipping $Project (cannot create public/): $_"
        $Skipped++
      }
      continue
    }
  }
  foreach ($File in $JsFiles) {
    $src = Join-Path $PSScriptRoot $File
    $dst = Join-Path $PublicDir $File
    $null = Sync-File $src $dst "$File -> $Project/public/$File"
  }
}

# Sync provider.tsx to Next.js projects
foreach ($Project in $NextJsProjects) {
  $ComponentsDir = Join-Path (Join-Path $SharedDir $Project) "src" "components"
  $src = Join-Path $PSScriptRoot $ProviderFile
  $dst = Join-Path $ComponentsDir $ProviderFile
  if (-not (Test-Path $ComponentsDir)) {
    if ($SkipMissing) {
      continue
    }
    Write-Warning "Components directory not found: $ComponentsDir. Skipping provider for $Project."
    continue
  }
  $null = Sync-File $src $dst "$ProviderFile -> $Project/src/components/$ProviderFile"
}

Write-Output ""
if ($Errors -gt 0) {
  Write-Warning "Sync completed with $Errors error(s), $Copied file(s) copied, $Skipped skipped (identical or skipped)."
} elseif ($WhatIf) {
  Write-Output "[WhatIf] Would copy $Copied file(s) across $($Projects.Count) projects. $Skipped would be skipped (identical)."
} else {
  Write-Output "Sync complete. $Copied file(s) copied to $($Projects.Count) projects. $Skipped skipped (identical)."
}

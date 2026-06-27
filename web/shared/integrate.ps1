# Sync shared files AND integrate into all projects
$webRoot = Split-Path -Parent $PSScriptRoot
$sharedDir = $PSScriptRoot

# --- Step 1: Sync JS files ---
Write-Output "=== Syncing JS files ==="
& "$sharedDir\sync.ps1"

# --- Step 2: Integrate into Next.js projects ---
$nextjsProjects = @(
    @{Name="3D"; Layout="$webRoot\3D\src\app\layout.tsx"},
    @{Name="Design"; Layout="$webRoot\Design\src\app\layout.tsx"},
    @{Name="Graphics"; Layout="$webRoot\Graphics\src\app\layout.tsx"},
    @{Name="Music"; Layout="$webRoot\Music\src\app\layout.tsx"},
    @{Name="Presentations"; Layout="$webRoot\Presentations\src\app\layout.tsx"},
    @{Name="Spreadsheets"; Layout="$webRoot\Spreadsheets\src\app\layout.tsx"},
    @{Name="Video"; Layout="$webRoot\Video\src\app\layout.tsx"}
)
$providerFile = "agent-cursor-provider.tsx"
$importStmt = 'import { AgentCursorProvider } from "@/components/agent-cursor-provider";'
$jsxTag = "          <AgentCursorProvider />"

foreach ($p in $nextjsProjects) {
    $componentsDir = "$webRoot\$($p.Name)\src\components"
    $layoutFile = $p.Layout

    if (-not (Test-Path $layoutFile)) {
        Write-Warning "Skipping $($p.Name) (no layout.tsx)"
        continue
    }

    # Copy provider component
    $dst = "$componentsDir\$providerFile"
    Copy-Item -Path "$sharedDir\$providerFile" -Destination $dst -Force
    Write-Output "Copied $providerFile -> $($p.Name)/src/components/$providerFile"

    # Check if already integrated
    $content = Get-Content $layoutFile -Raw
    if ($content -match "AgentCursorProvider") {
        Write-Output "  Already integrated, skipping"
        continue
    }

    # Add import after the last import line
    $content = $content -replace '(^import\s.+?;\s*$)', "`$1`r`n$importStmt"

    # Add <AgentCursorProvider /> before </body>
    $content = $content -replace '(?=(\s*)</body>)', "`$1$jsxTag`r`n      "

    Set-Content -Path $layoutFile -Value $content
    Write-Output "  Integrated into layout.tsx"
}

Write-Output "`n=== Integration complete ==="

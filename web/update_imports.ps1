$projects = @("3D", "Design", "Graphics", "Music", "Presentations", "Spreadsheets", "Video")
foreach ($project in $projects) {
    $appPath = "$project/src/app"
    if (Test-Path $appPath) {
        $dirs = Get-ChildItem -Path $appPath -Directory
        foreach ($dir in $dirs) {
            if ($dir.Name.StartsWith("_")) {
                $oldName = $dir.Name.Substring(1)
                $oldImport = "@/app/$oldName"
                $newImport = "@/app/_$oldName"
                
                Write-Host "Updating imports in ${project}: $oldImport -> $newImport"
                
                # Find files containing the old import string
                $files = Get-ChildItem -Path $project -Recurse -File -Exclude "*.next*", "node_modules*"
                foreach ($file in $files) {
                    try {
                        $content = Get-Content $file.FullName -Raw -ErrorAction SilentlyContinue
                        if ($null -ne $content -and $content.Contains($oldImport)) {
                            $newContent = $content -replace [regex]::Escape($oldImport), $newImport
                            $newContent | Set-Content $file.FullName
                            Write-Host "  Updated $($file.FullName)"
                        }
                    } catch {
                        # Skip files that can't be read
                    }
                }
            }
        }
    }
}

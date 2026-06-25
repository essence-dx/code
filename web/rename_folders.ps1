$projects = "3D", "Design", "Graphics", "Music", "Presentations", "Spreadsheets", "Video"
foreach ($project in $projects) {
    $path = "$project/src/app"
    if (Test-Path $path) {
        $dirs = Get-ChildItem -Path $path -Directory
        foreach ($dir in $dirs) {
            if (-not $dir.Name.StartsWith("_")) {
                $newName = "_" + $dir.Name
                Rename-Item -Path $dir.FullName -NewName $newName
                Write-Host "Renamed $($dir.FullName) to $newName"
            }
        }
    }
}

# build-package.ps1 — builds a distributable ZIP for DB Documenter
# Usage: .\build-package.ps1
# Output: db-documenter-v1.0.0.zip in the project root

$version = "1.0.0"
$outName  = "db-documenter-v$version"
$outDir   = "$PSScriptRoot\$outName"
$zipPath  = "$PSScriptRoot\$outName.zip"

Write-Host "Building DB Documenter v$version..." -ForegroundColor Cyan

# --- Build frontend ---
Write-Host "Building frontend..."
Push-Location "$PSScriptRoot\frontend"
npm run build
if ($LASTEXITCODE -ne 0) { Pop-Location; Write-Error "Frontend build failed"; exit 1 }
Pop-Location

# --- Create output directory ---
if (Test-Path $outDir) { Remove-Item $outDir -Recurse -Force }
New-Item -ItemType Directory -Path $outDir | Out-Null

# --- Copy backend ---
Write-Host "Copying backend..."
$backendDest = "$outDir\backend"
New-Item -ItemType Directory -Path $backendDest | Out-Null
Copy-Item "$PSScriptRoot\backend\*.py"          $backendDest
Copy-Item "$PSScriptRoot\backend\requirements.txt" $backendDest
New-Item -ItemType Directory -Path "$backendDest\routers" | Out-Null
Copy-Item "$PSScriptRoot\backend\routers\*.py"  "$backendDest\routers"

# --- Copy built frontend ---
Write-Host "Copying built frontend..."
Copy-Item "$PSScriptRoot\frontend\dist" "$outDir\frontend" -Recurse

# --- Copy docs and support files ---
Copy-Item "$PSScriptRoot\USER_GUIDE.md"  $outDir
Copy-Item "$PSScriptRoot\CHANGELOG.md"  $outDir
Copy-Item "$PSScriptRoot\.env.example"  $outDir
Copy-Item "$PSScriptRoot\start.ps1"     $outDir -ErrorAction SilentlyContinue

# --- Write a minimal start script into the package ---
$startScript = @'
# start.ps1 — launch DB Documenter
# Run this after first-time setup (see USER_GUIDE.md)

$root = $PSScriptRoot

# Backend
Write-Host "Starting backend..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root\backend'; .venv\Scripts\uvicorn.exe main:app --port 8001"

Start-Sleep 2

# Open app
Write-Host "Opening DB Documenter..." -ForegroundColor Green
Start-Process "http://localhost:8001"
'@
$startScript | Out-File "$outDir\start.ps1" -Encoding utf8

# Also write a setup script
$setupScript = @'
# setup.ps1 — first-time setup for DB Documenter
# Run once after unzipping

$root = $PSScriptRoot

Write-Host "Setting up DB Documenter..." -ForegroundColor Cyan

# Create Python venv
Write-Host "Creating Python virtual environment..."
python -m venv "$root\backend\.venv"
if ($LASTEXITCODE -ne 0) { Write-Error "python not found. Install Python 3.10+ from python.org"; exit 1 }

# Install dependencies
Write-Host "Installing backend dependencies..."
& "$root\backend\.venv\Scripts\pip.exe" install -r "$root\backend\requirements.txt"

Write-Host ""
Write-Host "Setup complete! Run start.ps1 to launch DB Documenter." -ForegroundColor Green
'@
$setupScript | Out-File "$outDir\setup.ps1" -Encoding utf8

# --- Create ZIP ---
Write-Host "Creating ZIP..."
if (Test-Path $zipPath) { Remove-Item $zipPath -Force }
Compress-Archive -Path $outDir -DestinationPath $zipPath

# --- Cleanup staging dir ---
Remove-Item $outDir -Recurse -Force

Write-Host ""
Write-Host "Done! Package: $zipPath" -ForegroundColor Green
Write-Host "Size: $([math]::Round((Get-Item $zipPath).Length / 1MB, 2)) MB"

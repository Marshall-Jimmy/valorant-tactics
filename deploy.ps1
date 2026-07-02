param(
    [switch]$Build,
    [int]$Port = 3000,
    [switch]$NoOpen
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$OutDir = Join-Path $ProjectRoot "out"
$DistDir = Join-Path $ProjectRoot "dist"
$ServerFile = Join-Path $ProjectRoot "server.js"

function Write-Info {
    param([string]$Msg, [string]$Color = "White")
    Write-Host "[$(Get-Date -Format 'HH:mm:ss')] $Msg" -ForegroundColor $Color
}

# Check Node.js
try {
    $ver = node --version
    Write-Info "Node.js $ver" -Color Green
} catch {
    Write-Host "[ERROR] Node.js not found. Install from https://nodejs.org" -ForegroundColor Red
    exit 1
}

# Check & install dependencies
$nm = Join-Path $ProjectRoot "node_modules"
if (-not (Test-Path $nm)) {
    Write-Info "Installing dependencies..." -Color Yellow
    Push-Location $ProjectRoot
    npm install
    Pop-Location
    if ($LASTEXITCODE -ne 0) { Write-Host "[ERROR] npm install failed" -ForegroundColor Red; exit 1 }
    Write-Info "Dependencies installed" -Color Green
}

# Build
$needBuild = $Build -or (-not (Test-Path (Join-Path $OutDir "index.html")))
if ($needBuild) {
    Write-Info "Building project..." -Color Yellow
    Push-Location $ProjectRoot
    npm run build
    Pop-Location
    if ($LASTEXITCODE -ne 0) { Write-Host "[ERROR] Build failed" -ForegroundColor Red; exit 1 }
    Write-Info "Build completed" -Color Green
} else {
    Write-Info "Using existing build (add -Build to rebuild)" -Color Cyan
}

# Sync out/ to dist/
Write-Info "Preparing dist/..." -Color Yellow
if (Test-Path $DistDir) { Remove-Item "$DistDir\*" -Recurse -Force -ErrorAction SilentlyContinue }
else { New-Item -ItemType Directory -Path $DistDir -Force | Out-Null }
Copy-Item "$OutDir\*" $DistDir -Recurse -Force
Write-Info "dist/ ready" -Color Green

# Start server
Write-Info "Starting server..." -Color Yellow
$server = Start-Process node -ArgumentList "`"$ServerFile`" $Port `"$DistDir`"" -PassThru -NoNewWindow
Start-Sleep -Seconds 2

if ($server.HasExited) {
    Write-Host "[ERROR] Server failed to start" -ForegroundColor Red
    exit 1
}

Write-Host "`n===========================================" -ForegroundColor Cyan
Write-Host "  http://localhost:$Port" -ForegroundColor Green
Write-Host "  Directory: $DistDir" -ForegroundColor DarkGray
Write-Host "  Ctrl+C to stop" -ForegroundColor Yellow
Write-Host "===========================================`n" -ForegroundColor Cyan

if (-not $NoOpen) { Start-Process "http://localhost:$Port" }

try {
    while (-not $server.HasExited) { Start-Sleep -Seconds 1 }
} finally {
    if (-not $server.HasExited) { $server.Kill() }
}

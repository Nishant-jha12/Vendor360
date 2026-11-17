# Vendor360 — start the standalone frontend demo server.
Write-Host "Starting Vendor360 Frontend Demo..." -ForegroundColor Cyan

$root = $PSScriptRoot
$frontendDir = Join-Path $root "frontend"

Write-Host "App URL -> http://127.0.0.1:5173"
Write-Host "Demo Credentials: testowner / Test@123456 (OTP: 123456)" -ForegroundColor Green

Set-Location $frontendDir
npm install
npm run dev

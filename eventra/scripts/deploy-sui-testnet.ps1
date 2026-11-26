# EVENTRA — Sui Testnet Deployment & Move Testing Script (PowerShell)
# Usage: .\scripts\deploy-sui-testnet.ps1
# Prerequisite: Sui CLI installed (`sui --version`) and active environment set to `testnet`.

$ErrorActionPreference = "Stop"

Write-Host "================================================================="
Write-Host " EVENTRA — Sui Move Contract Test & Testnet Deployment Utility"
Write-Host "================================================================="

if (-not (Get-Command "sui" -ErrorAction SilentlyContinue)) {
    Write-Host "[!] Sui CLI binary ('sui') was not found on your system PATH." -ForegroundColor Yellow
    Write-Host "    To install Sui CLI on Windows:"
    Write-Host "      1. Download the official Windows release from https://github.com/MystenLabs/sui/releases"
    Write-Host "      2. Or install via Cargo: cargo install --locked --git https://github.com/MystenLabs/sui.git --branch testnet sui"
    Write-Host "    Until deployed, EVENTRA operates in explicitly labelled LOCAL_DEMO mode."
    exit 1
}

Push-Location "$PSScriptRoot\..\blockchain\sui"

Write-Host "`n[1/3] Running Sui Move unit tests (11 scenarios)..."
sui move test

Write-Host "`n[2/3] Verifying active Sui client environment..."
sui client active-env
sui client active-address

Write-Host "`n[3/3] Publishing eventra_ticket Move package to Sui Testnet..."
$publishJson = sui client publish --gas-budget 100000000 --json | ConvertFrom-Json

$packageChange = $publishJson.objectChanges | Where-Object { $_.type -eq "published" }
if ($packageChange) {
    $packageId = $packageChange.packageId
    Write-Host "`n[+] Successfully published EVENTRA Move package to Sui Testnet!" -ForegroundColor Green
    Write-Host "    SUI_PACKAGE_ID=$packageId"
    Write-Host "    Update SUI_PACKAGE_ID in backend/.env and set EXECUTION_MODE=SUI_TESTNET."
}

Pop-Location

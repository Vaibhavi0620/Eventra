# EVENTRA — Full-Stack Verification & Test Runner (PowerShell)
# Runs AI/ML pytest suite, Ethereum Hardhat contract tests & benchmarks, Backend Vitest E2E suite, and Frontend Vitest suite.

$ErrorActionPreference = "Stop"

Write-Host "================================================================="
Write-Host " EVENTRA — Full-Stack Automated Verification Runner"
Write-Host "================================================================="

Write-Host "`n[1/4] Training AI Model & Running Python Pytest Suite..."
Push-Location "$PSScriptRoot\..\ai-service"
python train_model.py
python -m pytest test_ai_service.py -v
Pop-Location

Write-Host "`n[2/4] Running Ethereum Solidity Smart Contract Tests & Benchmarks..."
Push-Location "$PSScriptRoot\..\blockchain\ethereum"
npm run test
npm run benchmark
Pop-Location

Write-Host "`n[3/4] Running Backend API & End-to-End Integration Tests..."
Push-Location "$PSScriptRoot\..\backend"
npm run test
Pop-Location

Write-Host "`n[4/4] Running Frontend React Component & State Tests..."
Push-Location "$PSScriptRoot\..\frontend"
npm run test
Pop-Location

Write-Host "`n[+] All EVENTRA verification suites completed!" -ForegroundColor Green

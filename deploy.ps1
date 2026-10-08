# AetherStudy 1-Click PowerShell Deployment Script
param (
    [string]$Message = ""
)

$ErrorActionPreference = "Stop"

Write-Host "`n=============================================================" -ForegroundColor Cyan
Write-Host "🚀 AetherStudy Automated GitHub & Vercel Deployment" -ForegroundColor Cyan
Write-Host "=============================================================`n" -ForegroundColor Cyan

# 1. Build Verification
Write-Host "🔨 [1/4] Running production build validation..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed! Aborting deployment." -ForegroundColor Red
    exit 1
}

# 2. Stage All Changes
Write-Host "`n📦 [2/4] Staging changes..." -ForegroundColor Yellow
git add .

# 3. Commit
$Status = git status --porcelain
if ($Status) {
    $Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $CommitMessage = if ($Message -ne "") { $Message } else { "chore(release): auto-deploy update ($Timestamp)" }
    Write-Host "`n📝 [3/4] Committing: '$CommitMessage'..." -ForegroundColor Yellow
    git commit -m "$CommitMessage"
} else {
    Write-Host "`n📝 [3/4] Working tree clean. No changes to commit." -ForegroundColor Green
}

# 4. Push to GitHub
Write-Host "`n🌐 [4/4] Pushing to GitHub (origin main)..." -ForegroundColor Yellow
git push origin main
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Push to GitHub failed!" -ForegroundColor Red
    exit 1
}

Write-Host "`n=============================================================" -ForegroundColor Green
Write-Host "✨ SUCCESS! Deployed to GitHub & Vercel pipeline triggered!" -ForegroundColor Green
Write-Host "=============================================================" -ForegroundColor Green
Write-Host "Repo: https://github.com/BSFrameWorks5253/AetherStudy.git" -ForegroundColor White
Write-Host "Vercel: https://vercel.com/dashboard`n" -ForegroundColor White

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location -LiteralPath $repoRoot

Write-Host "GitHub Pages publish helper" -ForegroundColor Cyan
Write-Host "Repo root: $repoRoot"

$remoteUrl = Read-Host "GitHub repository URL (example: https://github.com/<account>/nsfactory-pages.git)"
if ([string]::IsNullOrWhiteSpace($remoteUrl)) {
  throw "Repository URL is required."
}

$userName = git config --get user.name
if ([string]::IsNullOrWhiteSpace($userName)) {
  $userName = Read-Host "Git user.name"
  if ([string]::IsNullOrWhiteSpace($userName)) {
    throw "git user.name is required."
  }
  git config user.name "$userName" | Out-Null
}

$userEmail = git config --get user.email
if ([string]::IsNullOrWhiteSpace($userEmail)) {
  $userEmail = Read-Host "Git user.email"
  if ([string]::IsNullOrWhiteSpace($userEmail)) {
    throw "git user.email is required."
  }
  git config user.email "$userEmail" | Out-Null
}

$hasOrigin = git remote | Select-String -Pattern "^origin$" -Quiet
if (-not $hasOrigin) {
  git remote add origin "$remoteUrl"
} else {
  git remote set-url origin "$remoteUrl"
}

git add .

$hasCommit = git rev-parse --verify HEAD 2>$null
if (-not $hasCommit) {
  git commit -m "Initial GitHub Pages publish"
} else {
  $status = git status --short
  if ($status) {
    git commit -m "Update GitHub Pages publish"
  } else {
    Write-Host "No local changes to commit."
  }
}

git push -u origin main

Write-Host ""
Write-Host "Push completed." -ForegroundColor Green
Write-Host "Next: GitHub -> Settings -> Pages -> Deploy from a branch / main / root"

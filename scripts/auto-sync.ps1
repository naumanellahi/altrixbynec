while ($true) {
  Write-Host "[AutoSync] Pulling latest changes..."
  git pull
  $status = git status --porcelain
  if ($status) {
    Write-Host "[AutoSync] Committing local changes..."
    git add .
    $msg = "auto-sync $(Get-Date -Format o)"
    git commit -m "$msg"
    git push
  } else {
    Write-Host "[AutoSync] No local changes to commit."
  }
  Start-Sleep -Seconds 30
}

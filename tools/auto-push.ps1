# tools/auto-push.ps1 — unattended Sunday-evening pusher for Weekly Insights.
#
# Triggered by the Windows Scheduled Task "WeeklyInsightsPush" every Sunday at
# 18:00. Logs to tools/auto-push.log so failures (SSH key locked, machine off
# at trigger time, GitHub down) are inspectable later. If `main` has nothing
# to push, the push is a quiet no-op.
#
# Manual run:  powershell -NoProfile -File C:\...\tools\auto-push.ps1
# Inspect log: Get-Content tools/auto-push.log -Tail 40
#
# SSH key must be usable non-interactively (OpenSSH agent unlocked, or a
# passphraseless deploy key on the `github-personal` host alias). Verify with
#   ssh -o BatchMode=yes -T git@github-personal

$ErrorActionPreference = 'Continue'
$repo = Split-Path -Parent $PSScriptRoot
Set-Location -Path $repo

$stamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss zzz'
"`n========== $stamp ==========`n" | Out-File -Append -Encoding utf8 -FilePath "$PSScriptRoot\auto-push.log"

# Show the current state (branch, ahead-by, last commit) before the push.
& git status --branch --short *>> "$PSScriptRoot\auto-push.log"
& git log -1 --oneline *>> "$PSScriptRoot\auto-push.log"

# The push itself. -v gives a one-line summary per ref so the log shows
# exactly what (if anything) went to GitHub.
& git push -v origin main *>> "$PSScriptRoot\auto-push.log" 2>&1
$code = $LASTEXITCODE

"exit_code=$code" | Out-File -Append -Encoding utf8 -FilePath "$PSScriptRoot\auto-push.log"
exit $code

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
# SSH key must be usable non-interactively: the OpenSSH Authentication Agent
# service must be running and have the GitHub key cached (`ssh-add` once after
# reboot or after agent restart). Git must be configured to use the Windows
# OpenSSH (not Git Bash's bundled MinGW ssh) — see core.sshCommand in
# git config --global. Verify the whole chain with:
#   ssh -o BatchMode=yes -T git@github-personal

$ErrorActionPreference = 'Continue'
$repo = Split-Path -Parent $PSScriptRoot
Set-Location -Path $repo

$logPath = Join-Path $PSScriptRoot 'auto-push.log'
function Log([string]$line) { Add-Content -Path $logPath -Value $line -Encoding utf8 }

Log ""
Log "========== $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss zzz') =========="

# Capture each native-exe call as a single string and append it.
# `2>&1 | Out-String` keeps git's stdout AND stderr together as plain UTF-8
# text (not the UTF-16 ErrorRecord soup `*>>` produces in PS 5.1).
$status = (& git status --branch --short 2>&1 | Out-String).TrimEnd()
$head   = (& git log -1 --oneline 2>&1 | Out-String).TrimEnd()
Log $status
Log $head

$pushOut = (& git push -v origin main 2>&1 | Out-String).TrimEnd()
$code = $LASTEXITCODE
Log $pushOut
Log "exit_code=$code"

exit $code

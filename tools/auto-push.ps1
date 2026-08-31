# tools/auto-push.ps1 — unattended Sunday-evening pusher for Weekly Insights.
#
# Triggered by the Windows Scheduled Task "WeeklyInsightsPush" every Sunday at
# 18:00. Logs to tools/auto-push.log so failures (SSH key locked, machine off
# at trigger time, GitHub down) are inspectable later. If `main` has nothing
# to push, the push is a quiet no-op.
#
# Manual run:  powershell -NoProfile -File C:\...\tools\auto-push.ps1
# Dry run:     ... -File C:\...\tools\auto-push.ps1 -DryRun     (logs, changes nothing)
# Inspect log: Get-Content tools/auto-push.log -Tail 40
#
# SSH key must be usable non-interactively: the OpenSSH Authentication Agent
# service must be running and have the GitHub key cached (`ssh-add` once after
# reboot or after agent restart). Git must be configured to use the Windows
# OpenSSH (not Git Bash's bundled MinGW ssh) — see core.sshCommand in
# git config --global. Verify the whole chain with:
#   ssh -o BatchMode=yes -T git@github-personal
#
# ── WHY THIS DOES MORE THAN PUSH (added 2026-08-30) ──────────────────────────
# Three digests (Aug 9, Aug 16, Aug 30) were written by Cowork and never reached
# GitHub. The cause was the same every time and it is NOT in this script: Cowork
# stages weekly-insights.js and then its commit dies, leaving an abandoned
# zero-byte .git/index.lock. The digest sits STAGED BUT UNCOMMITTED, so this
# script had nothing to push and correctly reported success — a silent miss.
# So before pushing it now (a) clears a provably abandoned lock and (b) commits a
# pending digest, which is the step Cowork's runbook already says should happen.
# Both are wrapped so that a failure in either can never stop the push itself.

param([switch]$DryRun)

$ErrorActionPreference = 'Continue'
$repo = Split-Path -Parent $PSScriptRoot
Set-Location -Path $repo

$logPath = Join-Path $PSScriptRoot 'auto-push.log'
function Log([string]$line) { Add-Content -Path $logPath -Value $line -Encoding utf8 }

Log ""
Log "========== $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss zzz')$(if ($DryRun) { ' [DRY RUN]' }) =========="

# ── 1. an abandoned index.lock silently blocks every later git write ─────────
# Only removed when it is provably not in use: zero bytes (a live git writes the
# new index into it), older than 10 minutes, and no git process running.
try {
  $lock = Join-Path (Join-Path $repo '.git') 'index.lock'
  if (Test-Path $lock) {
    $f = Get-Item $lock
    $ageMin = [int]((Get-Date) - $f.LastWriteTime).TotalMinutes
    $gitRunning = @(Get-Process git -ErrorAction SilentlyContinue).Count -gt 0
    if ($f.Length -eq 0 -and $ageMin -gt 10 -and -not $gitRunning) {
      Log "index.lock: abandoned (0 bytes, ${ageMin}m old, no git process) - removing"
      if (-not $DryRun) { Remove-Item $lock -Force }
    } else {
      Log "index.lock: present but IN USE or fresh (len=$($f.Length) age=${ageMin}m git=$gitRunning) - leaving it"
    }
  }
} catch { Log "index.lock check failed (continuing): $_" }

# ── 2. commit a digest that was staged but never committed ───────────────────
# Scoped to weekly-insights.js only, and only when the schema validator passes,
# so a half-written digest is left alone for a human rather than published.
try {
  $wi = (& git status --porcelain -- weekly-insights.js 2>&1 | Out-String).Trim()
  if ($wi) {
    Log "weekly-insights.js is uncommitted: $wi"
    $val = (& node validate-insights.mjs 2>&1 | Out-String).TrimEnd()
    $valCode = $LASTEXITCODE
    Log $val
    if ($valCode -eq 0) {
      if (-not $DryRun) {
        & git add -- weekly-insights.js 2>&1 | Out-Null
        $msg = "weekly insights: ML digest $(Get-Date -Format 'yyyy-MM-dd')"
        $cOut = (& git commit -m $msg -- weekly-insights.js 2>&1 | Out-String).TrimEnd()
        Log $cOut
      }
      Log "committed the pending digest"
    } else {
      Log "validate-insights FAILED (exit $valCode) - NOT committing; digest left for review"
    }
  }
} catch { Log "pending-digest commit failed (continuing): $_" }

# Capture each native-exe call as a single string and append it.
# `2>&1 | Out-String` keeps git's stdout AND stderr together as plain UTF-8
# text (not the UTF-16 ErrorRecord soup `*>>` produces in PS 5.1).
$status = (& git status --branch --short 2>&1 | Out-String).TrimEnd()
$head   = (& git log -1 --oneline 2>&1 | Out-String).TrimEnd()
Log $status
Log $head

if ($DryRun) { Log "DRY RUN - not pushing"; exit 0 }

$pushOut = (& git push -v origin main 2>&1 | Out-String).TrimEnd()
$code = $LASTEXITCODE
Log $pushOut
Log "exit_code=$code"

exit $code

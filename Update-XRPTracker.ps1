# Auto-update for the XRP Tracker. Runs at launch (Launch-XRPTracker.ps1) and hourly (scheduled task "XRP Tracker Update").
# Reads update-config.json {"base":"https://.../"}; downloads <base>manifest.json; fetches only changed files, verifies SHA-256,
# and only writes inside this folder (site\..., and the tracker's own .ps1/.txt files). No admin rights. Logs to update.log.
param([int]$TimeoutSec = 15)
$ErrorActionPreference = 'Stop'
$dir = $PSScriptRoot; $log = Join-Path $dir 'update.log'
function L($m) { try { Add-Content $log ("{0} {1}" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $m) } catch {} }
try {
  $cfgF = Join-Path $dir 'update-config.json'; if (-not (Test-Path $cfgF)) { L 'no update-config.json; skipped'; exit 0 }
  $base = ((Get-Content $cfgF -Raw | ConvertFrom-Json).base); if (-not $base) { L 'no base URL; skipped'; exit 0 }
  if (-not $base.EndsWith('/')) { $base += '/' }
  if ($base -notmatch '^https://') { L 'base must be https; skipped'; exit 0 }
  [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
  $man = Invoke-RestMethod ($base + 'manifest.json?t=' + [DateTime]::UtcNow.Ticks) -TimeoutSec $TimeoutSec
  $n = 0
  foreach ($f in $man.files) {
    $rel = [string]$f.path
    if ($rel -match '\.\.' -or $rel -notmatch '^(site/[A-Za-z0-9_./-]+|[A-Za-z0-9_-]+\.(ps1|txt))$') { L "refused path $rel"; continue }
    $dst = Join-Path $dir ($rel -replace '/', '\')
    if ((Test-Path $dst) -and ((Get-FileHash $dst -Algorithm SHA256).Hash -eq $f.sha256.ToUpper())) { continue }
    $tmp = "$dst.new"; New-Item -ItemType Directory -Force -Path (Split-Path $dst) | Out-Null
    Invoke-WebRequest ($base + $rel + '?v=' + $f.sha256.Substring(0,12)) -OutFile $tmp -UseBasicParsing -TimeoutSec $TimeoutSec
    if ((Get-FileHash $tmp -Algorithm SHA256).Hash -ne $f.sha256.ToUpper()) { Remove-Item $tmp -Force; L "hash mismatch $rel"; continue }
    Move-Item -Force $tmp $dst; $n++
  }
  # keep the browser-side config in step (lets the open dashboard refresh the signal log on its own)
  Set-Content -Path (Join-Path $dir 'site\update-config.js') -Value ("window.UPDATE_CFG={base:'" + $base + "'};") -Encoding UTF8
  L "ok: version $($man.version), $n file(s) updated"
} catch { L ("error: " + $_.Exception.Message) }

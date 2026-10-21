# Auto-update for the XRP Tracker. Runs at launch (Launch-XRPTracker.ps1) and hourly (scheduled task "XRP Tracker Update").
# Reads update-config.json {"base":"https://.../"}; downloads <base>manifest.json; fetches only changed files, verifies SHA-256,
# and only writes inside this folder (site\..., and the tracker's own .ps1/.txt files). No admin rights. Logs to update.log.
#
# One locked, unreadable, or blocked file is a warning: that file is skipped, retried next run, and the run still finishes
# with "ok:" (every file that needed an update was written) or "partial-success:" (finished, with files left to retry).
# Downloads land in .update-tmp\*.part, not beside the real name as XRPTrackerServer.ps1.new, so a stuck lock on that
# old temp path cannot abort the run. site\brand\ is never deleted. site\tv-config.js is never overwritten.
# This script may replace itself. If the running file cannot be overwritten, the new copy is applied after this process exits.
# -SourceRoot is an offline stand-in for the update host (tests, or a simulated locked file). The scheduled task does not pass it.
param(
  [int]$TimeoutSec = 15,
  [string]$SourceRoot
)

function Write-UpdateLog([string]$LogPath, [string]$Message) {
  try { Add-Content -Path $LogPath -Value ("{0} {1}" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $Message) } catch {}
}

function Get-ErrText($Record) {
  if ($null -eq $Record) { return 'unknown error' }
  $msg = ''
  $e = $Record.Exception
  while ($e) {
    if ($e.Message -and ($msg -eq '' -or $msg.IndexOf($e.Message, [StringComparison]::Ordinal) -lt 0)) {
      if ($msg) { $msg += ' ' }
      $msg += $e.Message
    }
    $e = $e.InnerException
  }
  if (-not $msg) { $msg = [string]$Record }
  $msg = ($msg -replace '\s+', ' ').Trim()
  if ($msg.Length -gt 500) { $msg = $msg.Substring(0, 500) }
  if (-not $msg) { return 'unknown error' }
  return $msg
}

# Clean relative path, or $null when the updater must not touch it.
# Refuses traversal, anything outside site\ or the tracker's own .ps1/.txt files,
# the local brand layer (site\brand\), and the local TV config (site\tv-config.js, which may carry an owner-added loader line).
function ConvertTo-CleanRelativePath([string]$Relative) {
  if ([string]::IsNullOrWhiteSpace($Relative)) { return $null }
  $norm = $Relative.Replace('\', '/').Trim()
  if ($norm.Contains(':') -or $norm.StartsWith('/') -or $norm.Contains('..')) { return $null }
  $parts = @()
  foreach ($part in ($norm -split '/')) {
    if ($part -eq '' -or $part -eq '.') { continue }
    if ($part -notmatch '^[A-Za-z0-9_.-]+$') { return $null }
    $parts += $part
  }
  if ($parts.Count -eq 0) { return $null }
  $clean = $parts -join '/'
  if ($clean -match '(?i)^site/brand(/|$)') { return $null }
  if ($clean -match '(?i)^site/tv-config\.js$') { return $null }
  if ($clean -match '^site/[A-Za-z0-9_.-]+(/[A-Za-z0-9_.-]+)*$') { return $clean }
  if ($clean -match '^[A-Za-z0-9_-]+\.(ps1|txt)$') { return $clean }
  return $null
}

function Get-InstallPath([string]$Root, [string]$Relative) {
  if (-not $Root -or -not $Relative) { return $null }
  $path = $Root
  foreach ($part in ($Relative -split '/')) {
    if (-not $part) { return $null }
    $path = Join-Path $path $part
  }
  $full = [IO.Path]::GetFullPath($path)
  $base = [IO.Path]::GetFullPath($Root)
  $sep = [IO.Path]::DirectorySeparatorChar
  if (-not $base.EndsWith($sep)) { $base = $base + $sep }
  if ($full.StartsWith($base, [StringComparison]::OrdinalIgnoreCase)) { return $full }
  return $null
}

function Test-ProtectedInstallPath([string]$Path) {
  if (-not $Path) { return $false }
  $full = $null
  try { $full = [IO.Path]::GetFullPath($Path) } catch { return $false }
  if ($full -match '(?i)[\\/]site[\\/]brand([\\/]|$)') { return $true }
  if ($full -match '(?i)[\\/]site[\\/]tv-config\.js$') { return $true }
  return $false
}

# Deletes one file. Never recurses, and never touches site\brand\ or site\tv-config.js.
function Remove-QuietFile([string]$Path) {
  if (-not $Path) { return }
  if (Test-ProtectedInstallPath $Path) { return }
  if (-not (Test-Path -LiteralPath $Path)) { return }
  if (Test-Path -LiteralPath $Path -PathType Container) { return }
  try { (Get-Item -LiteralPath $Path -Force).IsReadOnly = $false } catch {}
  try { Remove-Item -LiteralPath $Path -Force -ErrorAction SilentlyContinue } catch {}
}

function Clear-UpdateTemp([string]$TempRoot, [bool]$KeepPending) {
  if (-not $TempRoot -or -not (Test-Path -LiteralPath $TempRoot)) { return }
  $full = [IO.Path]::GetFullPath($TempRoot)
  if ($full -match '(?i)[\\/]site[\\/]brand([\\/]|$)') { return }
  $items = @(Get-ChildItem -LiteralPath $full -Force -ErrorAction SilentlyContinue)
  foreach ($item in $items) {
    if ($KeepPending -and $item.Name -eq 'self-update.pending') { continue }
    if ($item.PSIsContainer) { continue }
    Remove-QuietFile $item.FullName
  }
  $left = @(Get-ChildItem -LiteralPath $full -Force -ErrorAction SilentlyContinue)
  if ($left.Count -eq 0) {
    try { Remove-Item -LiteralPath $full -Force -ErrorAction SilentlyContinue } catch {}
  }
}

function Save-UpdateDownload {
  param(
    [string]$SourceRoot,
    [string]$Base,
    [string]$Rel,
    [string]$Tag,
    [string]$Tmp,
    [int]$TimeoutSec
  )
  $parent = Split-Path -Parent $Tmp
  if ($parent -and -not (Test-Path -LiteralPath $parent)) {
    [void](New-Item -ItemType Directory -Force -Path $parent)
  }
  if ($SourceRoot) {
    $src = Get-InstallPath $SourceRoot $Rel
    if (-not $src -or -not (Test-Path -LiteralPath $src -PathType Leaf)) { throw "source file missing: $Rel" }
    [IO.File]::Copy($src, $Tmp, $true)
  } else {
    Invoke-WebRequest -Uri ($Base + $Rel + '?v=' + $Tag) -OutFile $Tmp -UseBasicParsing -TimeoutSec $TimeoutSec
  }
  if (Test-Path -LiteralPath $Tmp -PathType Leaf) {
    try { (Get-Item -LiteralPath $Tmp -Force).IsReadOnly = $false } catch {}
  }
}

function ConvertTo-EncodedCommand([string]$ScriptText) {
  return [Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($ScriptText))
}

function Get-DeferScript([string]$Pending, [string]$Destination, [int]$WaitPid) {
  $pending = $Pending.Replace("'", "''")
  $dest = $Destination.Replace("'", "''")
  $body = @'
$ErrorActionPreference = 'SilentlyContinue'
try { Wait-Process -Id __PID__ } catch {}
Start-Sleep -Milliseconds 800
try { if (Test-Path -LiteralPath '__DEST__') { (Get-Item -LiteralPath '__DEST__' -Force).IsReadOnly = $false } } catch {}
try { [IO.File]::Copy('__PENDING__', '__DEST__', $true) } catch {}
try { if (Get-Command Unblock-File -ErrorAction SilentlyContinue) { Unblock-File -LiteralPath '__DEST__' } } catch {}
try { Remove-Item -LiteralPath '__PENDING__' -Force } catch {}
'@
  return $body.Replace('__PID__', "$WaitPid").Replace('__PENDING__', $pending).Replace('__DEST__', $dest)
}

function Start-DeferredSelfUpdate {
  param(
    [string]$Pending,
    [string]$Destination,
    [int]$WaitPid,
    [scriptblock]$Launcher
  )
  $exe = $null
  try { $exe = (Get-Process -Id $PID).Path } catch {}
  if (-not $exe) { $exe = 'powershell.exe' }
  $argString = '-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -EncodedCommand ' + (ConvertTo-EncodedCommand (Get-DeferScript -Pending $Pending -Destination $Destination -WaitPid $WaitPid))
  if ($Launcher) { & $Launcher $exe $argString; return }
  try { Start-Process -FilePath $exe -WindowStyle Hidden -ArgumentList $argString | Out-Null }
  catch { Start-Process -FilePath $exe -ArgumentList $argString | Out-Null }
}

function Update-OneTrackedFile {
  param(
    [string]$Dir,
    [string]$SourceRoot,
    [string]$Base,
    [string]$Rel,
    [string]$Sha,
    [int]$TimeoutSec,
    [string]$Log,
    [string]$RunningScript,
    [scriptblock]$AfterDownload,
    [scriptblock]$InstallCopy,
    [scriptblock]$DeferLauncher
  )
  $dst = Get-InstallPath $Dir $Rel
  if (-not $dst) { throw "destination escaped the install folder: $Rel" }
  if (Test-ProtectedInstallPath $dst) { throw "refusing protected path: $Rel" }
  $want = ([string]$Sha).Trim().ToUpperInvariant()
  if ($want -notmatch '^[0-9A-F]{64}$') { throw "bad sha256 for $Rel" }

  $legacy = $dst + '.new'
  if (Test-Path -LiteralPath $legacy) {
    Remove-QuietFile $legacy
    if (Test-Path -LiteralPath $legacy) {
      Write-UpdateLog $Log ("warn: leftover {0}.new is still locked; downloading beside it" -f $Rel)
    }
  }

  if (Test-Path -LiteralPath $dst -PathType Leaf) {
    try {
      if ((Get-FileHash -LiteralPath $dst -Algorithm SHA256).Hash.ToUpperInvariant() -eq $want) { return 'unchanged' }
    } catch {
      Write-UpdateLog $Log ("warn: cannot read {0} to compare hash; will try to replace it: {1}" -f $Rel, (Get-ErrText $_))
    }
  }

  if (-not $InstallCopy) {
    $InstallCopy = { param($From, $To) [IO.File]::Copy($From, $To, $true) }
  }
  $tempRoot = Join-Path $Dir '.update-tmp'
  if (-not (Test-Path -LiteralPath $tempRoot)) {
    [void](New-Item -ItemType Directory -Force -Path $tempRoot)
  }
  $tmp = Join-Path $tempRoot (([IO.Path]::GetRandomFileName()) + '.part')
  try {
    $tag = $want.Substring(0, 12)
    Save-UpdateDownload -SourceRoot $SourceRoot -Base $Base -Rel $Rel -Tag $tag -Tmp $tmp -TimeoutSec $TimeoutSec
    if ($AfterDownload) { & $AfterDownload $Rel $tmp }
    $got = (Get-FileHash -LiteralPath $tmp -Algorithm SHA256).Hash.ToUpperInvariant()
    if ($got -ne $want) {
      Write-UpdateLog $Log "hash mismatch $Rel"
      return 'mismatch'
    }
    $parent = Split-Path -Parent $dst
    if ($parent -and -not (Test-Path -LiteralPath $parent)) {
      [void](New-Item -ItemType Directory -Force -Path $parent)
    }
    $isSelf = $false
    if ($RunningScript) {
      try { $isSelf = ([IO.Path]::GetFullPath($RunningScript) -eq [IO.Path]::GetFullPath($dst)) } catch { $isSelf = $false }
    }
    try {
      if (Test-Path -LiteralPath $dst -PathType Leaf) {
        try { (Get-Item -LiteralPath $dst -Force).IsReadOnly = $false } catch {}
      }
      & $InstallCopy $tmp $dst
    } catch {
      if (-not $isSelf) { throw }
      $pending = Join-Path $tempRoot 'self-update.pending'
      [IO.File]::Copy($tmp, $pending, $true)
      try {
        Start-DeferredSelfUpdate -Pending $pending -Destination $dst -WaitPid $PID -Launcher $DeferLauncher
        Write-UpdateLog $Log 'staged: Update-XRPTracker.ps1 will replace itself after this run exits'
      } catch {
        Write-UpdateLog $Log ("warn: self-update is saved and will be applied on the next run: " + (Get-ErrText $_))
      }
      return 'staged'
    }
    $check = (Get-FileHash -LiteralPath $dst -Algorithm SHA256).Hash.ToUpperInvariant()
    if ($check -ne $want) { throw "wrote $Rel but the installed hash does not match" }
    if (Get-Command Unblock-File -ErrorAction SilentlyContinue) {
      try { Unblock-File -LiteralPath $dst } catch {}
    }
    return 'updated'
  } finally {
    Remove-QuietFile $tmp
  }
}

function Install-PendingSelfUpdate {
  param(
    [string]$Dir,
    [string]$RunningScript,
    $Files,
    [string]$Log
  )
  $pending = Join-Path (Join-Path $Dir '.update-tmp') 'self-update.pending'
  if (-not (Test-Path -LiteralPath $pending -PathType Leaf)) { return $false }
  $entry = $null
  foreach ($file in @($Files)) {
    if ($file -and (ConvertTo-CleanRelativePath ([string]$file.path)) -eq 'Update-XRPTracker.ps1') { $entry = $file; break }
  }
  $hashOk = $false
  if ($entry) {
    try {
      $want = ([string]$entry.sha256).Trim().ToUpperInvariant()
      $got = (Get-FileHash -LiteralPath $pending -Algorithm SHA256).Hash.ToUpperInvariant()
      $hashOk = ($want -match '^[0-9A-F]{64}$' -and $got -eq $want)
    } catch { $hashOk = $false }
  }
  if (-not $hashOk) {
    Remove-QuietFile $pending
    Write-UpdateLog $Log 'warn: discarded staged self-update (hash does not match this manifest)'
    return $false
  }
  $selfDst = Get-InstallPath $Dir 'Update-XRPTracker.ps1'
  $runningFull = $null
  try { if ($RunningScript) { $runningFull = [IO.Path]::GetFullPath($RunningScript) } } catch {}
  if (-not $selfDst -or -not $runningFull -or ($selfDst -ne $runningFull)) { return $false }
  try {
    try { if (Test-Path -LiteralPath $selfDst) { (Get-Item -LiteralPath $selfDst -Force).IsReadOnly = $false } } catch {}
    [IO.File]::Copy($pending, $selfDst, $true)
    Remove-QuietFile $pending
    Write-UpdateLog $Log 'applied staged Update-XRPTracker.ps1 from the previous run'
    return $true
  } catch {
    Write-UpdateLog $Log ("warn: staged self-update still waiting: " + (Get-ErrText $_))
    return $false
  }
}

function Invoke-XRPTrackerUpdate {
  param(
    [string]$InstallDir,
    [int]$TimeoutSec = 15,
    [string]$SourceRoot,
    [string]$RunningScript,
    [scriptblock]$AfterDownload,
    [scriptblock]$InstallCopy,
    [scriptblock]$DeferLauncher
  )
  $ErrorActionPreference = 'Stop'
  if (-not $InstallDir) { $InstallDir = $PSScriptRoot }
  if (-not $RunningScript) { $RunningScript = $PSCommandPath }
  if ($InstallDir) { $InstallDir = $InstallDir.TrimEnd('\', '/') }
  if ($SourceRoot) { $SourceRoot = $SourceRoot.TrimEnd('\', '/') }
  $log = Join-Path $InstallDir 'update.log'
  try {
    $base = $null
    if ($SourceRoot) {
      $manPath = Join-Path $SourceRoot 'manifest.json'
      if (-not (Test-Path -LiteralPath $manPath -PathType Leaf)) { throw 'manifest.json missing under SourceRoot' }
      $man = Get-Content -LiteralPath $manPath -Raw | ConvertFrom-Json
    } else {
      $cfgF = Join-Path $InstallDir 'update-config.json'
      if (-not (Test-Path -LiteralPath $cfgF)) { Write-UpdateLog $log 'no update-config.json; skipped'; return }
      $base = [string](Get-Content -LiteralPath $cfgF -Raw | ConvertFrom-Json).base
      if (-not $base) { Write-UpdateLog $log 'no base URL; skipped'; return }
      if (-not $base.EndsWith('/')) { $base += '/' }
      if ($base -notmatch '^https://') { Write-UpdateLog $log 'base must be https; skipped'; return }
      try { [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12 } catch {}
      $man = Invoke-RestMethod ($base + 'manifest.json?t=' + [DateTime]::UtcNow.Ticks) -TimeoutSec $TimeoutSec
    }

    $files = @()
    if ($man -and $man.files) { $files = @($man.files) }
    $updated = 0
    $staged = 0
    $skipped = @()
    if (Install-PendingSelfUpdate -Dir $InstallDir -RunningScript $RunningScript -Files $files -Log $log) { $updated++ }

    foreach ($file in $files) {
      if (-not $file) { continue }
      $raw = [string]$file.path
      $rel = ConvertTo-CleanRelativePath $raw
      if (-not $rel) {
        Write-UpdateLog $log "refused path $raw"
        continue
      }
      try {
        $status = Update-OneTrackedFile -Dir $InstallDir -SourceRoot $SourceRoot -Base $base -Rel $rel -Sha $file.sha256 -TimeoutSec $TimeoutSec -Log $log -RunningScript $RunningScript -AfterDownload $AfterDownload -InstallCopy $InstallCopy -DeferLauncher $DeferLauncher
        if ($status -eq 'updated' -or $status -eq 'staged') { $updated++ }
        if ($status -eq 'staged') { $staged++ }
      } catch {
        $skipped += $rel
        Write-UpdateLog $log ("warn: skipped {0} (will retry next run): {1}" -f $rel, (Get-ErrText $_))
      }
    }

    if ($base -match '^https://') {
      try {
        $siteDir = Join-Path $InstallDir 'site'
        if (-not (Test-Path -LiteralPath $siteDir)) { [void](New-Item -ItemType Directory -Force -Path $siteDir) }
        $js = Join-Path $siteDir 'update-config.js'
        if (Test-ProtectedInstallPath $js) { throw 'refusing to write a protected path' }
        Set-Content -Path $js -Value ("window.UPDATE_CFG={base:'" + $base + "'};") -Encoding UTF8
      } catch {
        Write-UpdateLog $log ("warn: could not write site\update-config.js (will retry next run): " + (Get-ErrText $_))
      }
    }

    Clear-UpdateTemp (Join-Path $InstallDir '.update-tmp') ($staged -gt 0)
    $ver = [string]$man.version
    if (-not $ver) { $ver = 'unknown' }
    if ($skipped.Count -gt 0) {
      Write-UpdateLog $log ("partial-success: version {0}, {1} file(s) updated, {2} skipped (will retry): {3}" -f $ver, $updated, $skipped.Count, ($skipped -join ', '))
    } else {
      $tail = ''
      if ($staged -gt 0) { $tail = " ($staged staged until this run exits)" }
      Write-UpdateLog $log ("ok: version {0}, {1} file(s) updated{2}" -f $ver, $updated, $tail)
    }
  } catch {
    Write-UpdateLog $log ("error: " + (Get-ErrText $_))
  }
}

$autoRun = $false
if ($MyInvocation.InvocationName -and $MyInvocation.InvocationName -ne '.') {
  $invokeLine = [string]$MyInvocation.Line
  if ($invokeLine -notmatch '^\s*\.') { $autoRun = $true }
}
if ($autoRun) {
  Invoke-XRPTrackerUpdate -TimeoutSec $TimeoutSec -SourceRoot $SourceRoot
}

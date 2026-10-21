# Pester tests for Update-XRPTracker.ps1.
#
# Run from the repo root (PowerShell 7):
#   pwsh -NoProfile -Command "Import-Module Pester -MinimumVersion 5.0; Invoke-Pester -Path ./tests/Update-XRPTracker.Tests.ps1 -Output Detailed"
#
# Simulated locked download (the failure that was aborting every run): the test makes the
# staged XRPTrackerServer.ps1 unreadable after it is written and before it is hashed, which is
# the same point that "Access to the path ...\XRPTrackerServer.ps1.new is denied / cannot be read"
# used to escape the loop. The run must log partial-success, keep every other update, and leave
# site\brand\ and site\tv-config.js untouched.
#
# On the PC, without publishing, the same idea against a copy of the install folder:
#   pwsh -NoProfile -File .\Update-XRPTracker.ps1 -SourceRoot C:\path\to\folder-with-manifest.json
# Hold an exclusive lock on the downloaded temp (or on the helper) in another window if you want
# the real sharing violation. update.log should end in ok: or partial-success:, never stop at error:.

BeforeAll {
  $script:Repo = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
  . (Join-Path $script:Repo 'Update-XRPTracker.ps1')

  # Defined in BeforeAll so It can call them. Pester already exports a New-Fixture command.

function New-XrpFixture {
  $root = Join-Path ([IO.Path]::GetTempPath()) ('xrpupd-' + [guid]::NewGuid().ToString('n'))
  $install = Join-Path $root 'install'
  $source = Join-Path $root 'source'
  [void](New-Item -ItemType Directory -Force -Path $install)
  [void](New-Item -ItemType Directory -Force -Path $source)
  [pscustomobject]@{ Root = $root; Install = $install; Source = $source }
}

function Set-Rel([string]$Root, [string]$Rel, [string]$Content) {
  $dest = $Root
  $parts = $Rel -split '/'
  for ($i = 0; $i -lt ($parts.Count - 1); $i++) {
    $dest = Join-Path $dest $parts[$i]
    if (-not (Test-Path -LiteralPath $dest)) { [void](New-Item -ItemType Directory -Force -Path $dest) }
  }
  $file = Join-Path $dest $parts[-1]
  [IO.File]::WriteAllText($file, $Content)
  return $file
}

function Write-FixtureManifest([string]$Source, [string]$Version, [string[]]$Rels) {
  $files = New-Object System.Collections.Generic.List[object]
  foreach ($rel in $Rels) {
    $full = $Source
    foreach ($part in ($rel -split '/')) { $full = Join-Path $full $part }
    $hash = (Get-FileHash -LiteralPath $full -Algorithm SHA256).Hash.ToLowerInvariant()
    [void]$files.Add([pscustomobject]@{ path = $rel; sha256 = $hash })
  }
  $json = @{ version = $Version; files = $files } | ConvertTo-Json -Depth 5
  [IO.File]::WriteAllText((Join-Path $Source 'manifest.json'), $json)
}

function Get-LogText([string]$Install) {
  $path = Join-Path $Install 'update.log'
  if (-not (Test-Path -LiteralPath $path)) { return '' }
  return [IO.File]::ReadAllText($path)
}

function Get-LogLines([string]$Install) {
  # Comma keeps a one-line log as an array. A bare return would unwrap it, and [-1] would be the last character.
  $lines = @((Get-LogText $Install) -split '\r?\n' | Where-Object { $_.Trim() -ne '' })
  return ,$lines
}

function Remove-Fixture($Root) {
  if ($global:XrpTestLocks) {
    foreach ($stream in @($global:XrpTestLocks)) { try { $stream.Dispose() } catch {} }
    $global:XrpTestLocks = @()
  }
  if (-not $Root -or -not (Test-Path -LiteralPath $Root)) { return }
  if (-not $IsWindows) { & chmod -R u+rwx -- $Root 2>$null | Out-Null }
  Get-ChildItem -LiteralPath $Root -Recurse -Force -ErrorAction SilentlyContinue | ForEach-Object {
    try { $_.IsReadOnly = $false } catch {}
  }
  Remove-Item -LiteralPath $Root -Recurse -Force -ErrorAction SilentlyContinue
}

function Lock-DownloadedHelper {
  param($Rel, $Tmp)
  if ($Rel -ne 'XRPTrackerServer.ps1') { return }
  if ($IsWindows) {
    $global:XrpTestLocks += [IO.File]::Open($Tmp, [IO.FileMode]::Open, [IO.FileAccess]::Read, [IO.FileShare]::None)
  } else {
    & chmod 000 -- $Tmp
    if ($LASTEXITCODE -ne 0) { throw "chmod failed on $Tmp" }
  }
}

}

Describe 'path rules' {
  It 'allows published files and refuses brand, tv-config, and traversal' {
    ConvertTo-CleanRelativePath 'site/app.js' | Should -Be 'site/app.js'
    ConvertTo-CleanRelativePath 'site\fonts\Rajdhani-500.woff2' | Should -Be 'site/fonts/Rajdhani-500.woff2'
    ConvertTo-CleanRelativePath 'site/./data/signals.json' | Should -Be 'site/data/signals.json'
    ConvertTo-CleanRelativePath 'site/branding.js' | Should -Be 'site/branding.js'
    ConvertTo-CleanRelativePath 'Update-XRPTracker.ps1' | Should -Be 'Update-XRPTracker.ps1'
    ConvertTo-CleanRelativePath 'XRPTrackerServer.ps1' | Should -Be 'XRPTrackerServer.ps1'
    ConvertTo-CleanRelativePath 'Launch-XRPTracker.ps1' | Should -Be 'Launch-XRPTracker.ps1'
    ConvertTo-CleanRelativePath 'README.txt' | Should -Be 'README.txt'

    ConvertTo-CleanRelativePath 'site/brand' | Should -BeNullOrEmpty
    ConvertTo-CleanRelativePath 'site/brand/theme.css' | Should -BeNullOrEmpty
    ConvertTo-CleanRelativePath 'site\Brand\logo.svg' | Should -BeNullOrEmpty
    ConvertTo-CleanRelativePath 'SITE/BRAND/x.js' | Should -BeNullOrEmpty
    ConvertTo-CleanRelativePath 'site/tv-config.js' | Should -BeNullOrEmpty
    ConvertTo-CleanRelativePath 'site\TV-CONFIG.JS' | Should -BeNullOrEmpty
    ConvertTo-CleanRelativePath 'site/./tv-config.js' | Should -BeNullOrEmpty
    ConvertTo-CleanRelativePath 'site/brand/../../Update-XRPTracker.ps1' | Should -BeNullOrEmpty
    ConvertTo-CleanRelativePath '../README.txt' | Should -BeNullOrEmpty
    ConvertTo-CleanRelativePath '/etc/passwd' | Should -BeNullOrEmpty
    ConvertTo-CleanRelativePath 'C:\Windows\notepad.exe' | Should -BeNullOrEmpty
    ConvertTo-CleanRelativePath 'update-config.json' | Should -BeNullOrEmpty
    ConvertTo-CleanRelativePath 'site/goal-config.js' | Should -Be 'site/goal-config.js'
  }
}

Describe 'published manifest' {
  It 'still ships the helper, keeps the updater ahead of it, and omits local-only files' {
    $manifest = Get-Content -LiteralPath (Join-Path $script:Repo 'manifest.json') -Raw | ConvertFrom-Json
    $paths = @($manifest.files | ForEach-Object { [string]$_.path })
    $paths | Should -Contain 'XRPTrackerServer.ps1'
    $paths | Should -Contain 'Update-XRPTracker.ps1'
    $paths | Should -Not -Contain 'site/tv-config.js'
    @($paths | Where-Object { $_ -match '(?i)^site/brand(/|$)' }).Count | Should -Be 0
    $updaterAt = [array]::IndexOf($paths, 'Update-XRPTracker.ps1')
    $serverAt = [array]::IndexOf($paths, 'XRPTrackerServer.ps1')
    $updaterAt | Should -BeGreaterOrEqual 0
    $updaterAt | Should -BeLessThan $serverAt
  }

  It 'hashes in manifest.json match the files in this repo' {
    $manifest = Get-Content -LiteralPath (Join-Path $script:Repo 'manifest.json') -Raw | ConvertFrom-Json
    foreach ($file in $manifest.files) {
      $full = $script:Repo
      foreach ($part in ([string]$file.path -split '/')) { $full = Join-Path $full $part }
      Test-Path -LiteralPath $full -PathType Leaf | Should -BeTrue
      $hash = (Get-FileHash -LiteralPath $full -Algorithm SHA256).Hash.ToLowerInvariant()
      $hash | Should -Be ([string]$file.sha256).ToLowerInvariant()
    }
  }

  It 'does not run an update just because the script was dot-sourced' {
    Test-Path -LiteralPath (Join-Path $script:Repo 'update.log') | Should -BeFalse
    Test-Path -LiteralPath (Join-Path $script:Repo '.update-tmp') | Should -BeFalse
  }
}

Describe 'resilient update' {
  It 'skips a locked helper, updates files after it, and does not touch brand or tv-config' {
    $fx = New-XrpFixture
    try {
      $brand = "/* local brand layer */`n"
      $tv = "window.TV_CHANNELS=[{id:'LOCAL'}];`n// owner loader — site/brand/theme.js`n"
      Set-Rel $fx.Install 'site/brand/theme.css' $brand
      Set-Rel $fx.Install 'site/brand/evil.css' $brand
      Set-Rel $fx.Install 'site/tv-config.js' $tv
      Set-Rel $fx.Install 'site/goal-config.js' 'window.GOAL_CFG={xrp:10000};'
      Set-Rel $fx.Install 'site/keep-local.txt' 'leave-me'
      Set-Rel $fx.Install 'site/before.txt' 'old-before'
      Set-Rel $fx.Install 'site/after.txt' 'old-after'
      Set-Rel $fx.Install 'XRPTrackerServer.ps1' 'old-server'
      Set-Rel $fx.Source 'site/before.txt' 'new-before'
      Set-Rel $fx.Source 'XRPTrackerServer.ps1' 'new-server'
      Set-Rel $fx.Source 'site/after.txt' 'new-after'
      Set-Rel $fx.Source 'site/brand/evil.css' 'EVIL'
      Set-Rel $fx.Source 'site/tv-config.js' 'EVIL-TV'
      Write-FixtureManifest $fx.Source 'locked-1' @(
        'site/before.txt',
        'XRPTrackerServer.ps1',
        'site/after.txt',
        'site/brand/evil.css',
        'site/tv-config.js'
      )
      $global:XrpTestLocks = @()
      Invoke-XRPTrackerUpdate -InstallDir $fx.Install -SourceRoot $fx.Source -TimeoutSec 20 -AfterDownload { param($Rel, $Tmp) Lock-DownloadedHelper -Rel $Rel -Tmp $Tmp }

      [IO.File]::ReadAllText((Join-Path $fx.Install 'site/before.txt')) | Should -Be 'new-before'
      [IO.File]::ReadAllText((Join-Path $fx.Install 'site/after.txt')) | Should -Be 'new-after'
      [IO.File]::ReadAllText((Join-Path $fx.Install 'XRPTrackerServer.ps1')) | Should -Be 'old-server'
      [IO.File]::ReadAllText((Join-Path $fx.Install 'site/brand/theme.css')) | Should -Be $brand
      [IO.File]::ReadAllText((Join-Path $fx.Install 'site/brand/evil.css')) | Should -Be $brand
      [IO.File]::ReadAllText((Join-Path $fx.Install 'site/tv-config.js')) | Should -Be $tv
      [IO.File]::ReadAllText((Join-Path $fx.Install 'site/goal-config.js')) | Should -Be 'window.GOAL_CFG={xrp:10000};'
      [IO.File]::ReadAllText((Join-Path $fx.Install 'site/keep-local.txt')) | Should -Be 'leave-me'
      @(Get-ChildItem -LiteralPath (Join-Path $fx.Install 'site/brand') -Force).Count | Should -Be 2
      Test-Path -LiteralPath (Join-Path $fx.Install 'XRPTrackerServer.ps1.new') | Should -BeFalse
      Test-Path -LiteralPath (Join-Path $fx.Install 'site/update-config.js') | Should -BeFalse

      $lines = Get-LogLines $fx.Install
      $text = Get-LogText $fx.Install
      $text | Should -Match 'warn: skipped XRPTrackerServer\.ps1 \(will retry next run\)'
      $text | Should -Match 'refused path site/brand/evil\.css'
      $text | Should -Match 'refused path site/tv-config\.js'
      $text | Should -Not -Match ' error:'
      $lines[-1] | Should -Match 'partial-success: version locked-1, 2 file\(s\) updated, 1 skipped \(will retry\): XRPTrackerServer\.ps1'
    } finally {
      Remove-Fixture $fx.Root
    }
  }

  It 'still updates the helper when a legacy .new file cannot be removed' {
    $fx = New-XrpFixture
    try {
      Set-Rel $fx.Install 'XRPTrackerServer.ps1' 'old-server'
      Set-Rel $fx.Install 'site/before.txt' 'old-before'
      $legacy = Set-Rel $fx.Install 'XRPTrackerServer.ps1.new' 'locked-leftover'
      if ($IsWindows) { (Get-Item -LiteralPath $legacy).IsReadOnly = $true } else { & chmod 000 -- $legacy }
      Set-Rel $fx.Source 'XRPTrackerServer.ps1' 'new-server'
      Set-Rel $fx.Source 'site/before.txt' 'new-before'
      Write-FixtureManifest $fx.Source 'legacy-1' @('site/before.txt', 'XRPTrackerServer.ps1')
      Invoke-XRPTrackerUpdate -InstallDir $fx.Install -SourceRoot $fx.Source -TimeoutSec 20
      [IO.File]::ReadAllText((Join-Path $fx.Install 'site/before.txt')) | Should -Be 'new-before'
      [IO.File]::ReadAllText((Join-Path $fx.Install 'XRPTrackerServer.ps1')) | Should -Be 'new-server'
      $left = Join-Path $fx.Install 'XRPTrackerServer.ps1.new'
      if (Test-Path -LiteralPath $left) {
        [IO.File]::ReadAllText($left) | Should -Be 'locked-leftover'
      }
      $lines = Get-LogLines $fx.Install
      $lines[-1] | Should -Match 'ok: version legacy-1, 2 file\(s\) updated$'
      (Get-LogText $fx.Install) | Should -Not -Match 'partial-success:'
      (Get-LogText $fx.Install) | Should -Not -Match ' error:'
    } finally {
      Remove-Fixture $fx.Root
    }
  }

  It 'refuses a hash mismatch without aborting the run' {
    $fx = New-XrpFixture
    try {
      Set-Rel $fx.Install 'site/before.txt' 'keep'
      Set-Rel $fx.Source 'site/before.txt' 'replaced'
      $bad = 'ab' * 32
      $json = @{ version = 'bad-1'; files = @([pscustomobject]@{ path = 'site/before.txt'; sha256 = $bad }) } | ConvertTo-Json -Depth 5
      [IO.File]::WriteAllText((Join-Path $fx.Source 'manifest.json'), $json)
      Invoke-XRPTrackerUpdate -InstallDir $fx.Install -SourceRoot $fx.Source -TimeoutSec 20
      [IO.File]::ReadAllText((Join-Path $fx.Install 'site/before.txt')) | Should -Be 'keep'
      $text = Get-LogText $fx.Install
      $text | Should -Match 'hash mismatch site/before\.txt'
      (Get-LogLines $fx.Install)[-1] | Should -Match 'ok: version bad-1, 0 file\(s\) updated$'
      $text | Should -Not -Match 'partial-success:'
    } finally {
      Remove-Fixture $fx.Root
    }
  }

  It 'logs ok when nothing needs an update' {
    $fx = New-XrpFixture
    try {
      Set-Rel $fx.Install 'site/before.txt' 'same'
      Set-Rel $fx.Source 'site/before.txt' 'same'
      Write-FixtureManifest $fx.Source 'same-1' @('site/before.txt')
      Invoke-XRPTrackerUpdate -InstallDir $fx.Install -SourceRoot $fx.Source -TimeoutSec 20
      (Get-LogLines $fx.Install)[-1] | Should -Match 'ok: version same-1, 0 file\(s\) updated$'
    } finally {
      Remove-Fixture $fx.Root
    }
  }

  It 'refuses a traversal path and does not write outside the install folder' {
    $fx = New-XrpFixture
    try {
      Set-Rel $fx.Source 'site/ok.txt' 'safe'
      Set-Rel $fx.Install 'site/ok.txt' 'old'
      $hash = (Get-FileHash -LiteralPath (Join-Path $fx.Source 'site/ok.txt') -Algorithm SHA256).Hash.ToLowerInvariant()
      $manifest = @"
{ "version": "trav-1", "files": [
  { "path": "site/../../outside.txt", "sha256": "$hash" },
  { "path": "site/ok.txt", "sha256": "$hash" }
] }
"@
      [IO.File]::WriteAllText((Join-Path $fx.Source 'manifest.json'), $manifest)
      Invoke-XRPTrackerUpdate -InstallDir $fx.Install -SourceRoot $fx.Source -TimeoutSec 20
      [IO.File]::ReadAllText((Join-Path $fx.Install 'site/ok.txt')) | Should -Be 'safe'
      Test-Path -LiteralPath (Join-Path $fx.Root 'outside.txt') | Should -BeFalse
      $text = Get-LogText $fx.Install
      $text | Should -Match 'refused path site/\.\./\.\./outside\.txt'
      (Get-LogLines $fx.Install)[-1] | Should -Match 'ok: version trav-1, 1 file\(s\) updated$'
    } finally {
      Remove-Fixture $fx.Root
    }
  }

  It 'logs a finished skip when config is missing or not https' {
    $fx = New-XrpFixture
    try {
      Invoke-XRPTrackerUpdate -InstallDir $fx.Install -TimeoutSec 5
      (Get-LogText $fx.Install) | Should -Match 'no update-config.json; skipped'
      [IO.File]::WriteAllText((Join-Path $fx.Install 'update-config.json'), '{"base":"http://example.com/"}')
      Invoke-XRPTrackerUpdate -InstallDir $fx.Install -TimeoutSec 5
      (Get-LogText $fx.Install) | Should -Match 'base must be https; skipped'
      [IO.File]::WriteAllText((Join-Path $fx.Install 'update-config.json'), '{"base":""}')
      Invoke-XRPTrackerUpdate -InstallDir $fx.Install -TimeoutSec 5
      (Get-LogText $fx.Install) | Should -Match 'no base URL; skipped'
      (Get-LogText $fx.Install) | Should -Not -Match 'partial-success:'
      (Get-LogText $fx.Install) | Should -Not -Match '(?m)ok:'
    } finally {
      Remove-Fixture $fx.Root
    }
  }
}

Describe 'self-update' {
  It 'replaces itself when it is in the list and still updates the next file' {
    $fx = New-XrpFixture
    try {
      $scriptPath = Join-Path $script:Repo 'Update-XRPTracker.ps1'
      $body = [IO.File]::ReadAllText($scriptPath)
      $installed = Join-Path $fx.Install 'Update-XRPTracker.ps1'
      [IO.File]::WriteAllText($installed, $body)
      $rewritten = $body + "`n# self-update-marker`n"
      [IO.File]::WriteAllText((Join-Path $fx.Source 'Update-XRPTracker.ps1'), $rewritten)
      Set-Rel $fx.Source 'README.txt' 'readme-from-update'
      Set-Rel $fx.Install 'README.txt' 'readme-old'
      Set-Rel $fx.Install 'site/brand/theme.css' 'brand-stays'
      Set-Rel $fx.Install 'site/tv-config.js' "window.TV_CHANNELS=[];`n// loader`n"
      Write-FixtureManifest $fx.Source 'self-1' @('Update-XRPTracker.ps1', 'README.txt')
      $pwsh = (Get-Process -Id $PID).Path
      & $pwsh -NoProfile -File $installed -SourceRoot $fx.Source -TimeoutSec 20
      $LASTEXITCODE | Should -Be 0
      [IO.File]::ReadAllText($installed) | Should -Be $rewritten
      [IO.File]::ReadAllText((Join-Path $fx.Install 'README.txt')) | Should -Be 'readme-from-update'
      [IO.File]::ReadAllText((Join-Path $fx.Install 'site/brand/theme.css')) | Should -Be 'brand-stays'
      [IO.File]::ReadAllText((Join-Path $fx.Install 'site/tv-config.js')) | Should -Be "window.TV_CHANNELS=[];`n// loader`n"
      $lines = Get-LogLines $fx.Install
      $lines[-1] | Should -Match 'ok: version self-1, 2 file\(s\) updated$'
      (Get-LogText $fx.Install) | Should -Not -Match 'partial-success:'
      (Get-LogText $fx.Install) | Should -Not -Match ' error:'
    } finally {
      Remove-Fixture $fx.Root
    }
  }

  It 'stages a self-update when the running script cannot be overwritten and applies it on the next run' {
    $fx = New-XrpFixture
    try {
      $body = [IO.File]::ReadAllText((Join-Path $script:Repo 'Update-XRPTracker.ps1'))
      $running = Join-Path $fx.Install 'Update-XRPTracker.ps1'
      [IO.File]::WriteAllText($running, $body)
      $rewritten = $body + "`n# staged-marker`n"
      [IO.File]::WriteAllText((Join-Path $fx.Source 'Update-XRPTracker.ps1'), $rewritten)
      Set-Rel $fx.Source 'README.txt' 'next-readme'
      Set-Rel $fx.Install 'README.txt' 'old-readme'
      Write-FixtureManifest $fx.Source 'stage-1' @('Update-XRPTracker.ps1', 'README.txt')
      $global:XrpSelf = [IO.Path]::GetFullPath($running)
      $global:XrpDefer = $null
      Invoke-XRPTrackerUpdate -InstallDir $fx.Install -SourceRoot $fx.Source -RunningScript $running -TimeoutSec 20 -InstallCopy {
        param($From, $To)
        if ([IO.Path]::GetFullPath($To) -eq $global:XrpSelf) {
          throw (New-Object IO.IOException "The process cannot access the file '$To' because it is being used by another process.")
        }
        [IO.File]::Copy($From, $To, $true)
      } -DeferLauncher {
        param($Exe, $ArgString)
        $global:XrpDefer = $ArgString
      }
      [IO.File]::ReadAllText($running) | Should -Be $body
      [IO.File]::ReadAllText((Join-Path $fx.Install 'README.txt')) | Should -Be 'next-readme'
      $pending = Join-Path $fx.Install '.update-tmp/self-update.pending'
      Test-Path -LiteralPath $pending | Should -BeTrue
      $global:XrpDefer | Should -Match '-EncodedCommand '
      $encoded = [regex]::Match($global:XrpDefer, '-EncodedCommand\s+(\S+)').Groups[1].Value
      $decoded = [Text.Encoding]::Unicode.GetString([Convert]::FromBase64String($encoded))
      $decoded | Should -Match 'Wait-Process'
      $decoded | Should -Match ([regex]::Escape($global:XrpSelf))
      (Get-LogText $fx.Install) | Should -Match 'staged: Update-XRPTracker\.ps1 will replace itself after this run exits'
      (Get-LogLines $fx.Install)[-1] | Should -Match 'ok: version stage-1, 2 file\(s\) updated \(1 staged until this run exits\)$'

      Invoke-XRPTrackerUpdate -InstallDir $fx.Install -SourceRoot $fx.Source -RunningScript $running -TimeoutSec 20
      [IO.File]::ReadAllText($running) | Should -Be $rewritten
      Test-Path -LiteralPath $pending | Should -BeFalse
      $text = Get-LogText $fx.Install
      $text | Should -Match 'applied staged Update-XRPTracker\.ps1 from the previous run'
      (Get-LogLines $fx.Install)[-1] | Should -Match 'ok: version stage-1, 1 file\(s\) updated$'
      $text | Should -Not -Match 'partial-success:'
    } finally {
      Remove-Fixture $fx.Root
    }
  }
}

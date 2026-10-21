# Opens the XRP Adoption Tracker. -Rig spans the top three monitors as one borderless-looking app window.
# -Floor opens the detail board on the portrait floor screen (4th monitor) as a second window; never changes display settings.
param([switch]$Rig,[switch]$Floor,[switch]$All)   # -All = ONE app: top 3 screens + floor screen, minimized/restored/closed together
# auto-update first (quick; never blocks the launch for long)
try { & (Join-Path $PSScriptRoot 'Update-XRPTracker.ps1') -TimeoutSec 8 } catch {}
$Port = 8787; $Base = "http://localhost:$Port/"
function Test-Up {
  $c = New-Object Net.Sockets.TcpClient
  try { if (-not $c.ConnectAsync('127.0.0.1', $Port).Wait(400)) { return $false } } catch { return $false } finally { $c.Dispose() }
  try { (Invoke-WebRequest ($Base + 'ping') -UseBasicParsing -TimeoutSec 3).Content -eq 'ok' } catch { $false } }
if (-not (Test-Up) -and (Test-Path (Join-Path $PSScriptRoot 'XRPTrackerServer.ps1'))) {
  Start-Process powershell.exe -WindowStyle Hidden -ArgumentList @('-NoProfile','-ExecutionPolicy','Bypass','-File',"`"$PSScriptRoot\XRPTrackerServer.ps1`"",'-Port',$Port)
  for ($i = 0; $i -lt 30 -and -not (Test-Up); $i++) { Start-Sleep -Milliseconds 300 }
}
$url = $Base
if (-not (Test-Up)) { $url = ([Uri](Join-Path $PSScriptRoot 'site\index.html')).AbsoluteUri }  # fallback: works without news/XRPN

if (-not $Rig -and -not $Floor -and -not $All) { Start-Process $url; exit }

# ---------- Sim Rig ----------
Add-Type -AssemblyName System.Windows.Forms, PresentationFramework
Add-Type @"
using System; using System.Runtime.InteropServices;
public static class XrpWin {
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int L, T, R, B; }
  [StructLayout(LayoutKind.Sequential)] public struct POINT { public int X, Y; }
  [DllImport("user32.dll")] public static extern bool SetProcessDPIAware();
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);
  [DllImport("user32.dll")] public static extern bool GetClientRect(IntPtr h, out RECT r);
  [DllImport("user32.dll")] public static extern bool ClientToScreen(IntPtr h, ref POINT p);
  [DllImport("user32.dll")] public static extern bool SetWindowPos(IntPtr h, IntPtr after, int x, int y, int cx, int cy, uint f);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int c);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
}
"@
[void][XrpWin]::SetProcessDPIAware()

$LogFile = Join-Path $PSScriptRoot 'placement.log'
function Write-Place($m) { try { Add-Content -Path $LogFile -Value ("{0} {1}" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $m) } catch {} }
Add-Type @"
using System; using System.Runtime.InteropServices;
public static class XrpTop { [DllImport("user32.dll")] public static extern bool SetWindowPos(IntPtr h, IntPtr after, int x, int y, int cx, int cy, uint f); }
"@
# Put OUR window on X,Y,W,H as a normal (minimizable, resizable) window with its title bar visible, verify by reading it back, correct up to 4 times, log the result.
function Set-Place($hw, $X, $Y, $W, $Ht, $name) {
  $ok = $false
  for ($k = 0; $k -lt 4 -and -not $ok; $k++) {
    [void][XrpWin]::ShowWindow($hw, 9)   # un-maximize so the size we ask for is honoured
    Start-Sleep -Milliseconds 250
    $wr = New-Object XrpWin+RECT; $cr = New-Object XrpWin+RECT; $pt = New-Object XrpWin+POINT
    [void][XrpWin]::GetWindowRect($hw, [ref]$wr); [void][XrpWin]::GetClientRect($hw, [ref]$cr); [void][XrpWin]::ClientToScreen($hw, [ref]$pt)
    $left = $pt.X - $wr.L; $top = $pt.Y - $wr.T; $right = ($wr.R - $wr.L) - $left - $cr.R; $bottom = ($wr.B - $wr.T) - $top - $cr.B
    [void][XrpTop]::SetWindowPos($hw, [IntPtr](-2), $X - $left, $Y, $W + $left + $right, $Ht + $bottom, 0x0040)   # normal window: title bar visible (minimize/maximize/resize), not topmost
    Start-Sleep -Milliseconds 450
    $wr = New-Object XrpWin+RECT; $cr = New-Object XrpWin+RECT; $pt = New-Object XrpWin+POINT
    [void][XrpWin]::GetWindowRect($hw, [ref]$wr); [void][XrpWin]::GetClientRect($hw, [ref]$cr); [void][XrpWin]::ClientToScreen($hw, [ref]$pt)
    $dx = $pt.X - $X; $dy = $wr.T - $Y; $dw = $cr.R - $W; $dh = 0   # window top edge at screen top; client height = screen height minus title bar
    $ok = ([math]::Abs($dx) -le 2 -and [math]::Abs($dy) -le 2 -and [math]::Abs($dw) -le 2 -and [math]::Abs($dh) -le 2)
    Write-Place ("{0} try {1}: wanted client {2},{3} {4}x{5}; got client {6},{7} {8}x{9}; window {10},{11}-{12},{13}; {14}" -f $name, ($k + 1), $X, $Y, $W, $Ht, $pt.X, $pt.Y, $cr.R, $cr.B, $wr.L, $wr.T, $wr.R, $wr.B, $(if ($ok) { 'OK' } else { 'retry' }))
  }
  $scrs = [System.Windows.Forms.Screen]::AllScreens | ForEach-Object { "$($_.DeviceName)=$($_.Bounds)" }
  Write-Place ("{0} result: {1}; screens: {2}" -f $name, $(if ($ok) { 'ALIGNED' } else { 'NOT ALIGNED' }), ($scrs -join ' | '))
  [void][XrpWin]::SetForegroundWindow($hw)
}

# Don't launch over a running game unless the owner says so
$gameNames = 'amtrucks','eurotrucks2','BeamNG.drive.x64','BeamNG.drive','BeamNG.tech.x64','iRacingSim64DX11','acs','AssettoCorsa','AC2-Win64-Shipping','rFactor2','LMU','RRRE64','RRRE','dirtrally2','LFS','AMS2AVX','AMS2'
$games = Get-Process -ErrorAction SilentlyContinue | Where-Object { $gameNames -contains $_.ProcessName -or $_.ProcessName -like 'Forza*' -or $_.ProcessName -like 'BeamNG*' -or $_.ProcessName -like 'F1_2*' }
if ($games -and -not $env:XRP_RIG_FORCE) {
  $n = ($games | Select-Object -ExpandProperty ProcessName -Unique) -join ', '
  $a = [System.Windows.MessageBox]::Show("A game is running ($n). Open the XRP Tracker across the top screens anyway?", 'XRP Tracker - Sim Rig', 'YesNo', 'Warning')
  if ($a -ne 'Yes') { exit }
}


$floorHwnd = [IntPtr]::Zero
if ($Floor -or $All) {
  $fc = Join-Path $PSScriptRoot 'floor-config.json'   # optional: {"x":4152,"y":1080,"width":1080,"height":1920}
  if (Test-Path $fc) { $c = Get-Content $fc -Raw | ConvertFrom-Json; $X=[int]$c.x; $Y=[int]$c.y; $W=[int]$c.width; $H=[int]$c.height }
  else {
    $fs = [System.Windows.Forms.Screen]::AllScreens | ForEach-Object { $_.Bounds } | Where-Object { $_.Height -gt $_.Width } | Sort-Object Y -Descending | Select-Object -First 1
    if (-not $fs -and $All) { $X = $null }
    elseif (-not $fs) { [void][System.Windows.MessageBox]::Show('No portrait (floor) screen found. The detail panels stay on the top screens.', 'XRP Tracker - Floor Screen'); exit }
    if ($fs) { $X=$fs.X; $Y=$fs.Y; $W=$fs.Width; $H=$fs.Height }
  }
  if ($null -ne $X) {
  $exe = @("$env:ProgramFiles\Google\Chrome\Application\chrome.exe", "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe", "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe") | Where-Object { $_ -and (Test-Path $_) } | Select-Object -First 1
  if (-not $exe) { Start-Process ($url + '?layout=floor'); exit }
  $profileDir = Join-Path $env:LOCALAPPDATA 'XRPTrackerRig'   # same profile as the rig window so they share alarms/settings
  Start-Process $exe -ArgumentList @("--app=`"$($url)?layout=floor`"", "--user-data-dir=`"$profileDir`"", "--window-position=$X,$Y", "--window-size=$W,$H", '--no-first-run', '--no-default-browser-check') | Out-Null
  $hwnd = [IntPtr]::Zero
  for ($i = 0; $i -lt 60 -and $hwnd -eq [IntPtr]::Zero; $i++) { Start-Sleep -Milliseconds 300
    $wp = Get-Process chrome -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowTitle -like 'XRP Floor Detail*' } | Select-Object -First 1; if ($wp) { $hwnd = $wp.MainWindowHandle } }
  if ($hwnd -ne [IntPtr]::Zero) { Set-Place $hwnd $X $Y $W $H 'floor'; $floorHwnd = $hwnd } else { Write-Place 'floor: window not found' }
  }
  if (-not $All) { exit }
}

# Work out the top row of monitors (or use rig-config.json: {"x":0,"y":0,"width":5760,"height":1080})
$cfgFile = Join-Path $PSScriptRoot 'rig-config.json'
$single = $false
if (Test-Path $cfgFile) { $c = Get-Content $cfgFile -Raw | ConvertFrom-Json; $X=[int]$c.x; $Y=[int]$c.y; $W=[int]$c.width; $H=[int]$c.height; $single = [bool]$c.fullscreen }
else {
  $scr = [System.Windows.Forms.Screen]::AllScreens | ForEach-Object { $_.Bounds }
  $groups = $scr | Group-Object { [math]::Round($_.Y / 100) } | Sort-Object { ($_.Group | Measure-Object Y -Minimum).Minimum }
  $row = ($groups | Where-Object { $_.Count -ge 3 } | Select-Object -First 1)
  if (-not $row) { $row = $groups | Select-Object -First 1 }
  $b = $row.Group
  $single = (@($b).Count -eq 1)   # NVIDIA Surround / AMD Eyefinity: the three top screens are one wide display
  $X = ($b | Measure-Object X -Minimum).Minimum; $Y = ($b | Measure-Object Y -Minimum).Minimum
  $W = ($b | ForEach-Object { $_.X + $_.Width } | Measure-Object -Maximum).Maximum - $X
  $H = ($b | ForEach-Object { $_.Y + $_.Height } | Measure-Object -Minimum).Minimum - $Y
}

$exe = @("$env:ProgramFiles\Google\Chrome\Application\chrome.exe", "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe", "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe",
         "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe", "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe") | Where-Object { $_ -and (Test-Path $_) } | Select-Object -First 1
if (-not $exe) { Start-Process ($url + '?layout=rig'); exit }
$profileDir = Join-Path $env:LOCALAPPDATA 'XRPTrackerRig'   # separate small browser profile so the window opens where we put it
$sep = '?'
$extra = @()   # placement is set and verified explicitly by Set-Place below (no fullscreen: it left the window maximised under the taskbar)
# mark the last session as cleanly closed so Chrome never restores old tabs (e.g. an XRPSCAN page) over the dashboard
try { $pf = Join-Path $profileDir 'Default\Preferences'; if (Test-Path $pf) { $t = [IO.File]::ReadAllText($pf); $t = $t -replace '"exit_type":"[A-Za-z]+"','"exit_type":"Normal"' -replace '"exited_cleanly":false','"exited_cleanly":true'; [IO.File]::WriteAllText($pf,$t) } } catch {}
$p = Start-Process $exe -PassThru -ArgumentList (@("--app=`"$url$($sep)layout=rig`"", "--user-data-dir=`"$profileDir`"", "--window-position=$X,$Y", "--window-size=$W,$H", '--no-first-run', '--no-default-browser-check', '--disable-session-crashed-bubble', '--hide-crash-restore-bubble') + $extra)

# Find the app window, then size it so its *client area* exactly covers the top screens (title bar pushed above the top edge)
$hwnd = [IntPtr]::Zero
for ($i = 0; $i -lt 60 -and $hwnd -eq [IntPtr]::Zero; $i++) {
  Start-Sleep -Milliseconds 300
  $wp = Get-Process -Name ([IO.Path]::GetFileNameWithoutExtension($exe)) -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowTitle -like 'XRP Adoption Tracker*' } | Select-Object -First 1
  if ($wp) { $hwnd = $wp.MainWindowHandle }
}
if ($hwnd -ne [IntPtr]::Zero) { Set-Place $hwnd $X $Y $W $H 'rig' } else { Write-Place 'rig: window not found' }
# ONE app: keep the floor window in step with the main window (minimize / restore / close together). Ends when the main window closes.
if ($All -and $hwnd -ne [IntPtr]::Zero -and $floorHwnd -ne [IntPtr]::Zero) {
  Add-Type @"
using System; using System.Text; using System.Runtime.InteropServices;
public static class XrpSync { public delegate bool P(IntPtr h, IntPtr l);
  [DllImport("user32.dll")] public static extern bool EnumWindows(P p, IntPtr l); [DllImport("user32.dll")] public static extern int GetWindowText(IntPtr h, StringBuilder s, int n);
  [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr h); [DllImport("user32.dll")] public static extern bool IsWindow(IntPtr h);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int c); [DllImport("user32.dll")] public static extern IntPtr PostMessage(IntPtr h, uint m, IntPtr w, IntPtr l);
  public static IntPtr Find(string prefix) { IntPtr f = IntPtr.Zero; EnumWindows((h, l) => { var s = new StringBuilder(256); GetWindowText(h, s, 256); if (s.ToString().StartsWith(prefix)) { f = h; return false; } return true; }, IntPtr.Zero); return f; } }
"@
  Write-Place 'all: linked rig + floor windows'
  $wasMin = $false; $gone = 0
  while ($gone -lt 4) {
    Start-Sleep -Milliseconds 700
    $main = [XrpSync]::Find('XRP Adoption Tracker'); $fl = [XrpSync]::Find('XRP Floor Detail')
    if ($main -eq [IntPtr]::Zero) { $gone++; continue } else { $gone = 0 }
    if ($fl -eq [IntPtr]::Zero) { continue }
    $m = [XrpSync]::IsIconic($main)
    if ($m -and -not $wasMin) { [void][XrpSync]::ShowWindow($fl, 6) }
    if (-not $m -and $wasMin) { [void][XrpSync]::ShowWindow($fl, 4) }
    $wasMin = $m
  }
  $fl = [XrpSync]::Find('XRP Floor Detail'); if ($fl -ne [IntPtr]::Zero) { [void][XrpSync]::PostMessage($fl, 0x0010, [IntPtr]::Zero, [IntPtr]::Zero) }
  Write-Place 'all: main window closed; floor closed too'
}

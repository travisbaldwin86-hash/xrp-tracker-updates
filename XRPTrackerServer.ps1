# XRP Tracker local launcher server (localhost only).
# Serves the dashboard files and relays a short allow-list of public, keyless feeds that block browser
# requests (Google News RSS, Yahoo Finance quotes, SEC EDGAR). Stops itself after 45 idle minutes.
param([int]$Port = 8787)
$ErrorActionPreference = 'Stop'
$Root = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot 'site'))
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$Allow = @('news.google.com','query1.finance.yahoo.com','query2.finance.yahoo.com','data.sec.gov','www.sec.gov','efts.sec.gov','ofac.treasury.gov','www.occ.gov','www.federalreserve.gov')
$Mime = @{ '.html'='text/html; charset=utf-8'; '.js'='application/javascript; charset=utf-8'; '.css'='text/css; charset=utf-8';
           '.svg'='image/svg+xml'; '.ico'='image/x-icon'; '.png'='image/png'; '.json'='application/json' }
$L = New-Object Net.HttpListener
$L.Prefixes.Add("http://localhost:$Port/")
try { $L.Start() } catch { exit 1 }
$last = Get-Date
while ($L.IsListening) {
  $task = $L.GetContextAsync()
  while (-not $task.AsyncWaitHandle.WaitOne(5000)) {
    if (((Get-Date) - $last).TotalMinutes -gt 45) { $L.Stop(); exit 0 }
  }
  $ctx = $task.Result; $last = Get-Date
  $req = $ctx.Request; $res = $ctx.Response; $bytes = $null
  try {
    $path = $req.Url.AbsolutePath
    if ($path -eq '/ping') { $bytes = [Text.Encoding]::UTF8.GetBytes('ok'); $res.ContentType = 'text/plain' }
    elseif ($path -eq '/proxy') {
      $uri = [Uri]$req.QueryString['u']
      if ($uri.Scheme -ne 'https' -or ($Allow -notcontains $uri.Host)) { $res.StatusCode = 403; $bytes = [Text.Encoding]::UTF8.GetBytes('host not allowed') }
      else {
        $wr = [Net.HttpWebRequest]::Create($uri)
        $wr.UserAgent = 'XRPTracker/1.0 (personal dashboard; Windows)'
        $wr.Accept = '*/*'; $wr.Timeout = 20000
        $wr.AutomaticDecompression = [Net.DecompressionMethods]::GZip -bor [Net.DecompressionMethods]::Deflate
        $resp = $wr.GetResponse()
        $ms = New-Object IO.MemoryStream; $resp.GetResponseStream().CopyTo($ms); $bytes = $ms.ToArray()
        $res.ContentType = $resp.ContentType; $resp.Close()
      }
    }
    else {
      if ($path -eq '/') { $path = '/index.html' }
      $f = [IO.Path]::GetFullPath((Join-Path $Root ([Uri]::UnescapeDataString($path).TrimStart('/'))))
      if ($f.StartsWith($Root, [StringComparison]::OrdinalIgnoreCase) -and (Test-Path -LiteralPath $f -PathType Leaf)) {
        $bytes = [IO.File]::ReadAllBytes($f)
        $ext = [IO.Path]::GetExtension($f).ToLower()
        if ($Mime.ContainsKey($ext)) { $res.ContentType = $Mime[$ext] }
      } else { $res.StatusCode = 404; $bytes = [Text.Encoding]::UTF8.GetBytes('not found') }
    }
  } catch {
    try { $res.StatusCode = 502 } catch {}
    $bytes = [Text.Encoding]::UTF8.GetBytes('upstream error: ' + $_.Exception.Message)
  }
  try {
    $res.Headers['Cache-Control'] = 'no-store'
    $res.ContentLength64 = $bytes.Length
    $res.OutputStream.Write($bytes, 0, $bytes.Length)
  } catch {} finally { try { $res.Close() } catch {} }
}

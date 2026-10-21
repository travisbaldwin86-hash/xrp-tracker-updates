XRP ADOPTION TRACKER (DEMAND RADAR) - built for the owner
==============================================================
Question it answers: does Ripple / RLUSD adoption actually create XRP demand?

OPEN IT
  Desktop shortcut "XRP Tracker"           -> normal layout in your default browser
  Desktop shortcut "XRP Tracker - Sim Rig" -> one window across the top three monitors (5760x1080 layout)

HOW IT WORKS
  - A tiny local server (XRPTrackerServer.ps1, PowerShell, localhost:8787 only) starts with the shortcut
    and stops by itself after 45 idle minutes. Nothing is installed; no admin rights; no API keys.
  - Data is pulled live from free public sources: XRP Ledger servers, XRPSCAN, CoinGecko, Coinbase,
    Ethereum public RPC, OKX, Bitget, Alternative.me, Yahoo Finance (stock quotes, may be delayed 15 min),
    SEC EDGAR and Google News RSS (headlines + links only).
  - Trends/history are kept in the browser (localStorage). The Sim Rig window uses its own small browser
    profile in %LOCALAPPDATA%\XRPTrackerRig, so its history builds separately from the normal window.
  - Not financial advice.

INSTALL (once per PC; afterwards it updates itself)
  1. Extract the zip anywhere.
  2. Double-click Install.cmd.
  3. Use the desktop shortcuts.

SIM RIG SCREEN POSITION
  The Sim Rig shortcut finds the row of three side-by-side monitors automatically and ignores the floor
  screen. If it picks the wrong area, create rig-config.json next to Launch-XRPTracker.ps1:
     {"x":0,"y":0,"width":5760,"height":1080}
  If a game (ATS, ETS2, BeamNG, Forza, iRacing...) is running it asks before opening.
  On a single wide (Surround/Eyefinity) display it opens true fullscreen with no title bar.
  Close the rig window with Alt+F4.

UNINSTALL
  Delete Documents\XRP Tracker, the two desktop shortcuts, and %LOCALAPPDATA%\XRPTrackerRig.

AUTO-UPDATE (no manual steps after this install)
  - Update-XRPTracker.ps1 runs every time a shortcut is opened and every hour (task "XRP Tracker Update").
  - It reads update-config.json {"base":"https://<host>/"}, downloads <base>manifest.json and replaces only files whose
    SHA-256 changed (site\..., the tracker's own .ps1/.txt). Bad hashes or paths outside this folder are refused. Log: update.log.
  - A file that cannot be read or written (locked, blocked, or quarantined) is logged as "warn:" and skipped. The other
    files still update, and that file is tried again on the next run. The run then logs "ok:" or "partial-success:".
    partial-success means the run finished; the skipped names are on that line. It does not stop the run at "error:".
  - XRPTrackerServer.ps1 stays in the published list. Failing to write it does not cancel the rest of the update.
  - Local-only files are left alone. The updater never deletes site\brand\ and never overwrites site\tv-config.js
    (that file may have an extra loader line for the brand layer), even if a manifest names them. Anything not listed is not removed.
  - The updater may replace itself. If Windows will not let it overwrite the running script, it finishes this run and
    applies the new Update-XRPTracker.ps1 as soon as this process exits (or on the next run).
  - Downloads are staged in .update-tmp and checked before they replace anything. A stuck XRPTrackerServer.ps1.new from an
    older run is not required for the next run to finish.
  - The open dashboard also re-reads the signal log from the host every 10 minutes, so new scan results appear without a restart.
  - The box publishes with: python3 tools/publish.py   (env XRP_PUBLISH_REMOTE = git URL of the public hosting repo).
    Keep Update-XRPTracker.ps1 ahead of XRPTrackerServer.ps1 in manifest.json until each PC has run this updater once,
    so an older updater can save this script before a blocked helper would have stopped that run.
  - To rehearse a locked file without the live task: pwsh -File .\Update-XRPTracker.ps1 -SourceRoot C:\path\to\a-folder-with-manifest.json
    Tests: pwsh -NoProfile -Command "Import-Module Pester -MinimumVersion 5.0; Invoke-Pester -Path ./tests/Update-XRPTracker.Tests.ps1"

SIGNAL LOG FORMAT (site\data\signals.json; site\data\signals.js is generated from it)
  { "version":1, "updated":"<ISO time>", "watchlist":{"<category>":["term",...]}, "discovered":["term",...],
    "events":[{"d":"YYYY-MM-DD","name":"...","kind":"macro|escrow|conference|ledger|rule"}],
    "teasers":[{"teaser":"...","outcome":"... or pending","url":"https://..."}],
    "signals":[{"d":"YYYY-MM-DDTHH:MM (ET)","acct":"@handle or source","url":"https://... (source post/article)",
                "title":"what was said","status":"confirmed|speculation|rumor","entities":["Ripple","DTCC",...],
                "theme":"RLUSD / stablecoins | Banks | Regulation | ...","note":"one-line take"}] }
  Scans append with: python3 tools/add_signals.py new.json  (dedupes by url, learns recurring 2-word terms into "discovered"),
  then python3 tools/publish.py. Matched keywords, heat scores and patterns are computed in the browser from this file.

INDICATOR AUDIT (Oct 20 2026)
  RSI 14 (Wilder), SMA 50/200, EMA 20, MACD 12/26/9, Bollinger 20/2 (population SD) and VWAP were checked against TA-Lib 0.8
  on the same Coinbase daily candles: max difference < 1e-13, identical warm-up bars. Chart = Coinbase candles (UTC day bars);
  signal cards = CoinGecko daily closes (00:00 UTC) + today's live price.

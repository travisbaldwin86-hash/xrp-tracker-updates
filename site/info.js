/* ⓘ info system: every panel/metric/chart/control gets an icon. Hover or click = compact info bar; "Show all info" = inline captions. */
(function(){
const I = {
 // panels
 topbar:'DEMAND RADAR is your XRP adoption cockpit. It pulls live public data and asks one question: is Ripple/RLUSD adoption actually turning into demand for XRP itself?',
 verdict:'The headline answer. It counts how many of the core on-chain "demand mechanics" are rising versus their own recent history. More rising = adoption is showing up on the ledger, not just in press releases.',
 v_gauge:'Needle position = share of core demand checks that are rising. Left (red) = mostly headlines, right (green) = mechanics moving. It is a summary, not a prediction.',
 alarm:'The alarm banner shows the most important thing happening right now. Stage 1 = heads up, Stage 2 = watch, Stage 3 = alarm. Alarms fire when a signal changes state or a big event (whale move, new filing, key headline) appears.',
 market:'Live XRP price, size and trading activity, with a chart you draw over 7 days to 1 year. Price tells you what the market thinks; the adoption checks tell you whether usage backs it up.',
 xrpn:'Evernorth (Nasdaq: XRPN) is a company that holds XRP as its main asset. When treasuries like this buy and hold XRP, that is direct, measurable demand for XRP.',
 signals:'Popular indicators traders watch, computed here from a full year of free daily price data. Each one says how traders read it and how reliable it is. They describe the market; none of them is a buy/sell call.',
 xmoney:'Tracks the possible chain X Money → Cross River → RLUSD → XRP. Each link is marked confirmed only when an official announcement exists. Today the X Money ↔ RLUSD/XRP link is not announced.',
 happening:'Ledge, the mascot, acts out what each signal is doing right now. The art is a joke; the one-line caption under it is the accurate part.',
 scorecard:'Each adoption metric compared with its own history: rising, flat or falling. "Building history" means the dashboard is still collecting daily snapshots for that metric.',
 adoption:'The six checks from the Cross River / RLUSD video. A partnership only matters for XRP if these numbers move: XRP used as a bridge, firms holding XRP, new accounts, fees burned, RLUSD living on the XRP Ledger, and real disclosed volumes.',
 network:'Current XRP Ledger rules and daily activity: how much XRP an account must lock up, what a transaction costs, and how busy the network is.',
 whales:'Live feed from the XRP Ledger while this page is open: payments of 1 million XRP or more, plus RLUSD payments that were converted through XRP. Names come from XRPSCAN\'s public account labels.',
 news:'Recent headlines and links (no article text) from Google News for DTCC, Ripple, Cross River, Evernorth and X Money. A headline is not an official announcement; always check the source.',
 alarmlog:'History of every alarm and signal change, newest first, stored in this browser. Use it to see what happened while you were away.',
 links:'Shortcuts to explorers, official newsrooms, SEC filings and live X searches so you can verify anything on this dashboard yourself.',
 // controls
 btnRefresh:'Pulls fresh data from every source right now instead of waiting for the automatic refresh.',
 refreshInfo:'When the data was last updated and the countdown to the next automatic refresh (every 5 minutes; headlines every 15).',
 btnSerious:'Serious mode hides the mascot art and jokes and shows plain explanations only.',
 btnSound:'Turns alarm beeps on or off. Stage 3 alarms beep three times, Stage 2 twice, Stage 1 once.',
 btnLayout:'Switches between the normal single-screen layout and the 5760×1080 Sim Rig layout (left = price and signals, center = verdict and alarms, right = ledger metrics and feeds).',
 btnInfo:'Shows every info note as a caption at once. Turn it off to go back to hover/click info icons.',
 rangeSeg:'Chart time range. 7D uses hourly prices; 30D, 90D and 1Y use daily closes with the 50-day and 200-day moving averages drawn on top.',
 newsSeg:'Pick which newswire to read. DTCC and X Money tabs also trigger alarms when a new matching headline appears.',
 btnClearLog:'Clears the alarm history in this browser. It does not change any data or settings.',
 // market
 m_price:'The current XRP price in US dollars and its change over the last 24 hours. Price alone does not prove adoption; use it with the checks on the right.',
 m_mcap:'Market cap = price × circulating XRP. It is the market\'s total valuation of XRP, not money invested.',
 m_vol:'Dollar value of XRP traded on exchanges in the last 24 hours. High volume means lots of activity; it includes some wash trading.',
 m_rlusd:'RLUSD is Ripple\'s US-dollar stablecoin, designed to stay at $1.00. Staying near $1 means the peg is healthy; 24h volume shows how much it is traded.',
 priceChart:'XRP price over the selected range. Hover to read exact values. Orange = 50-day average, purple dashed = 200-day average; the 50 above the 200 is a "golden cross" regime.',
 // signals
 rsi:'RSI measures how strong the last 14 days of gains were versus losses, on a 0–100 scale. Above 70 = "overbought" (ran up fast), below 30 = "oversold". It says nothing about adoption.',
 cross:'Compares the 50-day and 200-day average prices. 50 above 200 = longer-term uptrend ("golden cross"), below = downtrend ("death cross"). It reacts late by design.',
 macd:'MACD compares a fast (12-day) and slow (26-day) price average. A positive histogram means short-term momentum is stronger than the longer trend; a flip signals a momentum change.',
 volume:'Today\'s 24h trading volume divided by the 30-day average. Above 2× = unusually busy, below 0.5× = unusually quiet. Busy markets make price moves more meaningful.',
 bbw:'Bollinger Band width measures how much price has been swinging (20-day). Very narrow ("squeeze") often comes before a big move, but it does not tell you which direction.',
 funding:'Fee paid between leveraged traders on perpetual futures every 8 hours. Positive = longs pay shorts (crowded bullish bets); negative = crowded bearish bets. Extremes can unwind violently.',
 oi:'Open interest = total value of open XRP futures positions on OKX. Rising = more leveraged money in the market; falling = positions closing.',
 fng:'Crypto Fear & Greed Index (0–100) from Alternative.me, built from volatility, momentum, social media and Bitcoin dominance. Extreme fear or greed is often read as a contrarian sign.',
 btcdom:'Bitcoin\'s share of the total crypto market value. Rising = money favouring Bitcoin over coins like XRP; falling = more appetite for altcoins.',
 xrpbtc:'XRP price measured in Bitcoin (sats = 0.00000001 BTC). Rising = XRP is outperforming Bitcoin; falling = lagging it.',
 whalesig:'Number of XRP payments of 1M+ seen live while the page was open in the last 24 hours. Many are exchanges moving their own coins, so treat it as a clue, not proof of buying or selling.',
 // adoption
 a1:'Shows whether RLUSD actually moves through XRP: the size of the RLUSD/XRP AMM pool, the order book, RLUSD trading volume, and live RLUSD→XRP conversions. Rising = XRP is being used as the bridge, which is real demand.',
 a2:'XRP held by payment companies. Cross River has not disclosed any XRP addresses or holdings, so it shows "not disclosed". You can add addresses you trust to track their XRP balances daily.',
 a3:'New XRP Ledger accounts created per day. Each new account locks 1 XRP as a reserve, so sustained growth means small but real XRP demand. Rising vs the 30-day average = growing.',
 a4:'Every transaction destroys a tiny XRP fee forever. Total burned is 100 billion minus today\'s supply. A rising daily burn means more ledger use; it is too small to make XRP scarce.',
 a5:'How much RLUSD exists on the XRP Ledger versus Ethereum. Only XRPL RLUSD can be swapped through XRP, so a growing XRPL share is better for XRP demand.',
 a6:'Whether Cross River has published real numbers (RLUSD payment volume, XRP holdings). Until it does, the partnership is a headline, not a measurable XRP demand driver.',
 spNewAcc:'90 days of new XRPL accounts per day. Hover to read a day. Look for a sustained climb, not one-day spikes.',
 spBurn:'90 days of XRP burned in fees per day. Spikes often come from spam or bot bursts; a sustained rise means more genuine use.',
 // network
 n_reserve:'XRP every account must keep locked (base), plus extra for each trust line or offer it owns. Lower reserves make it cheaper to join; more accounts means more locked XRP.',
 n_fee:'Current cost of a transaction in drops (1 XRP = 1,000,000 drops). It rises only when the network is congested; that extra fee is also burned.',
 n_ledger:'The latest validated ledger (block) number and server load. The ledger closes every 3–4 seconds; a load factor above 1 means the network is busy.',
 n_payments:'Payments made on the XRP Ledger yesterday (UTC). More payments = more usage, though bots and spam inflate this.',
 n_active:'Accounts that sent at least one transaction yesterday, plus how many transactions fit in each ledger. A truer picture of real users than raw transaction counts.',
 n_amm:'Total XRP sitting in all automated market maker (AMM) pools on the ledger. More XRP in pools = more XRP locked up to provide swap liquidity.',
 // xrpn
 x_price:'XRPN\'s latest Nasdaq share price (Yahoo Finance, may be 15 minutes delayed) and its daily change.',
 x_nav:'Evernorth\'s XRP (about 473 million, from its Oct 9 2026 press release) × live XRP price. This is what its XRP is worth right now.',
 x_mnav:'mNAV = company market value ÷ value of its XRP. Above 1.0 = investors pay a premium, which makes it easier to raise money and buy more XRP. Below 1.0 = discount. Ignores cash and debt.',
 x_xps:'How much XRP backs each share, using share counts from Evernorth\'s SEC 8-K (Class A + Class C + exchangeable units). Rising XRP per share = the company is adding XRP faster than shares.',
 x_mcap:'Share price × the economic share count from the SEC filing. Used to calculate mNAV.',
 x_8k:'Latest 8-K (material event report) Evernorth filed with the SEC. New 8-Ks can announce XRP purchases or share changes; an alarm fires when a new one appears.',
 xrpnChart:'XRPN (yellow) and XRP (cyan) as % change since XRPN\'s Nasdaq debut on Oct 12 2026. A big gap between the lines is a divergence and triggers an alarm.',
 // x money
 xm_map:'Green links are confirmed by official announcements; dashed amber links are not announced. The last link only lights up when RLUSD payments are actually converted through XRP on-chain.',
 xm_status:'Summary of what is officially known about X Money and RLUSD/XRP, a count of matching headlines, and live X searches. Official X posts can\'t be read without a paid API key, so use the search links.',
 // misc
 meme:'Ledge acts out this signal. The art is for fun; the caption is the accurate one-line explanation.',
 score_row:'Arrow = this metric\'s recent 7-day average (or latest snapshot) versus its own earlier history. ▲ rising, ■ flat, ▼ falling. Not a buy/sell call.',
 watch:'Paste any XRP Ledger address (starts with r) and a label to track its XRP balance on each refresh. Stored only in this browser.'
};
window.INFO=I;
const bar=document.createElement('div'); bar.id='infobar'; bar.hidden=true; document.body.appendChild(bar);
let pinned=null, hoverT=null;
function place(btn){ const r=btn.getBoundingClientRect(); const rig=document.body.classList.contains('rig');
  const segW=rig?innerWidth/3:innerWidth; const seg=Math.floor((r.left+r.width/2)/segW); const margin=rig?segW*0.045:10;
  const minX=seg*segW+margin, maxX=(seg+1)*segW-margin; bar.style.maxWidth=Math.min(rig?560:420,maxX-minX)+'px';
  bar.hidden=false; const bw=bar.offsetWidth, bh=bar.offsetHeight;
  let x=r.left+r.width/2-bw/2; x=Math.max(minX,Math.min(x,maxX-bw)); let y=r.bottom+8; if(y+bh>innerHeight-6) y=Math.max(6,r.top-bh-8);
  bar.style.left=x+'px'; bar.style.top=y+'px'; }
function show(btn){ const k=btn.dataset.k; bar.innerHTML=`<b>${btn.dataset.t||''}</b>${I[k]||'No description.'}`; place(btn); }
function hide(){ bar.hidden=true; pinned=null; }
document.addEventListener('mouseover',e=>{ const b=e.target.closest&&e.target.closest('.ib'); if(!b||pinned) return; clearTimeout(hoverT); hoverT=setTimeout(()=>show(b),180); });
document.addEventListener('mouseout',e=>{ const b=e.target.closest&&e.target.closest('.ib'); if(!b||pinned) return; clearTimeout(hoverT); hoverT=setTimeout(()=>{ if(!pinned) bar.hidden=true; },200); });
document.addEventListener('click',e=>{ const b=e.target.closest&&e.target.closest('.ib'); if(b){ e.preventDefault(); e.stopPropagation(); if(pinned===b){hide();return} pinned=b; show(b); return; } if(!e.target.closest('#infobar')) hide(); },true);
document.addEventListener('keydown',e=>{ if(e.key==='Escape') hide(); });
addEventListener('resize',hide); document.addEventListener('scroll',()=>{ if(pinned) place(pinned); },true);
function decorate(root){ (root.querySelectorAll?root:document).querySelectorAll('[data-info]').forEach(el=>{ if(el.dataset.infoDone) return; el.dataset.infoDone='1';
  const k=el.dataset.info; const inBtn=el.tagName==='BUTTON'; const b=document.createElement(inBtn?'span':'button'); if(!inBtn) b.type='button'; else b.setAttribute('role','button'); b.className='ib'; b.dataset.k=k; b.setAttribute('aria-label','Info'); b.textContent='i';
  b.dataset.t=(el.dataset.infoTitle||'').trim();
  const after=/^(INPUT|CANVAS)$/.test(el.tagName)||el.classList.contains('seg')||el.classList.contains('refresh');
  if(el.classList.contains('chart-wrap')||el.classList.contains('xrpn-chart')||el.classList.contains('v-gauge')) { b.classList.add('ib-abs'); el.appendChild(b); }
  else if(after) el.insertAdjacentElement('afterend',b); else el.appendChild(b);
  const cap=document.createElement('div'); cap.className='icap'; cap.textContent=I[k]||'';
  if(el.closest('.controls')){ let cc=document.getElementById('ctrlCaps'); if(!cc){ cc=document.createElement('div'); cc.id='ctrlCaps'; const tb=document.getElementById('topbar'); tb.appendChild(cc); }
    cap.textContent=(el.textContent.split(':')[0].trim()||'Status')+': '+(I[k]||''); cc.appendChild(cap); return; }
  if(el.classList.contains('chart-wrap')||el.classList.contains('xrpn-chart')) el.insertAdjacentElement('afterend',cap);
  else if(after) b.insertAdjacentElement('afterend',cap); else { const host=(el.closest('.card,.sig,.score,.kv,.meme,.m,.panel-head,.xm-node,.v-body,.alarm-text,.panel')||el); cap.dataset.k=k; const dup=[...host.children].find(c=>c.classList.contains('icap')&&c.dataset.k===k); if(dup) dup.remove(); host.appendChild(cap); }
 }); }
window.decorateInfo=decorate;
new MutationObserver(ms=>{ for(const m of ms) for(const n of m.addedNodes) if(n.nodeType===1){ if(n.matches&&n.matches('[data-info]')) decorate(n.parentNode||document); else if(n.querySelector&&n.querySelector('[data-info]')) decorate(n); } }).observe(document.body,{childList:true,subtree:true});
decorate(document);
})();

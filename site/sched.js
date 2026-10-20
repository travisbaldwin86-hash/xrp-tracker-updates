/* DEMAND RADAR · one 15-second heartbeat for every feed.
   Every 15 s each panel's freshness check runs. A source whose rate limit or terms can't take a request every 15 s is read on
   its own polite interval (rotating), and the panel says so: "checked 3 s ago · source updated 2 h ago · re-read every 5 min (source limit)".
   Also: per-host exponential backoff (429 / 5xx / network), offline mode, and a daily quiet-time reload for 24/7 sessions. */
(function(){ 'use strict';
const TICK=15000, Q=s=>document.querySelector(s), QA=s=>[...document.querySelectorAll(s)];
const LAY=new URLSearchParams(location.search).get('layout'), FLOOR=LAY==='floor';
/* ---------- per-host backoff (wraps fetchJSON / fetchText) ---------- */
const BO={}; const hostOf=u=>{ try{ const x=new URL(u,location.href); const p=x.searchParams.get('u'); return p?new URL(p).host:x.host; }catch(e){ return '?'; } };
function guard(fn){ return async function(u,...a){ const h=hostOf(u), b=BO[h];
  if(b&&Date.now()<b.until) throw new Error(`backing off ${h} for ${Math.ceil((b.until-Date.now())/1000)} s after errors`);
  if(!navigator.onLine) throw new Error('offline');
  try{ const r=await fn(u,...a); delete BO[h]; return r; }
  catch(e){ const m=String(e&&e.message||e); const soft=/HTTP 4(0[0-4]|1\d)/.test(m)&&!/429/.test(m); if(!soft){ const n=((b&&b.n)||0)+1; BO[h]={n,until:Date.now()+Math.min(600e3,TICK*2**(n-1)),why:m}; } throw e; } }; }
if(typeof fetchJSON==='function') window.fetchJSON=guard(fetchJSON); if(typeof fetchText==='function') window.fetchText=guard(fetchText);
/* ---------- task registry ---------- */
const T=[]; const reg=(o)=>{ T.push({every:TICK,last:0,ok:null,...o}); };
const has=(o,k)=>o&&typeof o[k]==='function';
const srcT=k=>()=>{ const v=D[k]&&D[k].v; if(k==='daily'&&Array.isArray(v)&&v.length) return v[v.length-1].t+864e5; return null; };
function setup(){
  // live / cheap: every 15 s
  reg({n:'Price (Coinbase)',p:['market'],fn:async()=>{ const t=await fetchJSON('https://api.exchange.coinbase.com/products/XRP-USD/ticker',{},8000); const p=+t.price; if(!(p>0)) throw new Error('no price');
    if(D.px&&D.px.v){ D.px.v.xrp=p; D.px.t=Date.now(); } else put('px',{xrp:p},'Coinbase Exchange live ticker'); try{renderMarket()}catch(e){} }});
  reg({n:'XRP Ledger (RPC)',p:['network','pulse','demand','checks'],fn:async()=>{ await loadXRPL(); try{renderNetwork(); renderScore(); renderXMoney();}catch(e){} try{ window.renderDemand&&renderDemand(); }catch(e){} }});
  reg({n:'Ethereum RLUSD',p:['everywhere'],fn:async()=>{ await loadEth(); }});
  reg({n:'Sentiment / funding',p:['signals'],fn:async()=>{ await loadSentiment(); try{ evaluateStates(); }catch(e){} }});
  if(window.RFF){ reg({n:'Ripple family on-chain',p:['rfam'],fn:async()=>{ await RFF.chainTick(); RFF.render(); }});
    reg({n:'News index (GDELT, rotating)',p:['rfam','news','world'],fn:async()=>{ await RFF.gdeltTick(); RFF.render(); },note:'one GDELT query per 15 s, rotating through 6 topics (GDELT asks for ≤1 request / 5 s)'}); }
  if(window.WWF) reg({n:'UK sanctions (OFSI)',p:['world'],fn:WWF.ofsi});
  if(window.EXF){ reg({n:'Ledger upgrades (XRPSCAN)',p:['extras'],fn:EXF.amendments}); reg({n:'Calendar',p:['extras'],fn:async()=>{ EXF.calTick(); EXF.render(); }}); }
  if(window.Thesis) reg({n:'Thesis + adoption (recompute)',p:['thesis','thesisFull','adLedger'],fn:async()=>{ Thesis.tick(); }});
  // polite intervals (still checked by the 15 s heartbeat; the read itself waits for the source limit)
  if(window.EXF){ reg({n:'Stablecoin league (DefiLlama)',p:['extras'],every:60e3,fn:EXF.llama,note:'large file; RLUSD supply itself is read on-chain every 15 s'});
    reg({n:'US rules (Federal Register)',p:['extras'],every:60e3,fn:EXF.fedreg,note:'5 searches per read'});
    reg({n:'Ripple escrow total (ledger)',p:['extras'],every:5*60e3,fn:EXF.escrowTotal,note:'~80 account reads; live escrow releases are caught second-by-second on the ledger stream'});
    reg({n:'Exchange reserves (ledger)',p:['extras'],every:5*60e3,fn:EXF.reserves,note:'up to 260 account reads; big moves are caught live on the ledger stream'}); }
  reg({n:'XRPSCAN daily metrics',p:['pulse','network'],every:5*60e3,fn:loadXRPScan,src:srcT('daily'),note:'XRPSCAN publishes once a day'});
  reg({n:'Market history (CoinGecko)',p:['market'],every:2*60e3,fn:async()=>{ await loadMarket(); try{ renderMarket(); }catch(e){} },note:'CoinGecko free tier (~30 calls/min shared); live price comes from Coinbase every 15 s'});
  if(window.EVF) reg({n:'XRP everywhere (multi-chain)',p:['everywhere'],every:60e3,fn:EVF.loadAll,note:'about 20 public chain endpoints per read'});
  if(PROXY){ reg({n:'XRPN quote (helper)',p:['xrpn'],every:30e3,fn:async()=>{ await loadXRPN(); try{ renderXRPN(); checkNewsAlarms(); }catch(e){} }});
    reg({n:'Google News (helper)',p:['news'],every:2*60e3,fn:loadNews,note:'Google News blocks fast polling'});
    if(window.WWF) reg({n:'US sanctions (OFAC, helper)',p:['world'],every:60e3,fn:WWF.ofac});
    if(window.HDF){ reg({n:'SEC full-text search (helper)',p:['holders'],every:60e3,fn:HDF.loadFTS,note:'SEC fair-access limit 10 req/s with a contact User-Agent'});
      reg({n:'SEC filings of tracked holders (helper)',p:['holders'],every:2*60e3,fn:HDF.loadTracked}); reg({n:'Treasury headlines (helper)',p:['holders'],every:2*60e3,fn:HDF.loadNewsDisc}); }
    if(window.Thesis) reg({n:'OCC / Fed / DTCC feeds (helper)',p:['helperFeeds'],every:2*60e3,fn:Thesis.helperTick}); }
  else if(window.Thesis) reg({n:'Helper-only feeds',p:['helperFeeds'],every:5*60e3,fn:Thesis.helperTick,note:'needs the local helper'});
  // stagger first reads so the start-up burst is gentle
  T.forEach((o,i)=>{ o.last=Date.now()-o.every+1500+i*700; });
}
async function run(o){ o.busy=1; const s=Date.now(); try{ await o.fn(); o.ok=true; o.err=null; o.okT=Date.now(); }catch(e){ o.ok=false; o.err=String(e&&e.message||e).slice(0,140); } o.last=Date.now(); o.ms=o.last-s; o.busy=0; }
let cyc=0, lastCyc=0;
function tick(){ if(document.hidden) return; cyc++; lastCyc=Date.now(); const now=Date.now();
  T.forEach(o=>{ if(o.busy) return; if(now-o.last>=o.every-750) run(o); }); setTimeout(paint,2500); }
/* ---------- honest freshness chips + one global heartbeat ---------- */
const ago=t=>{ if(!t) return '—'; const s=Math.max(0,(Date.now()-t)/1e3); return s<90?Math.round(s)+' s':s<5400?Math.round(s/60)+' min':s<172800?Math.round(s/3600)+' h':Math.round(s/86400)+' d'; };
const ivl=ms=>ms<60e3?Math.round(ms/1e3)+' s':Math.round(ms/60e3)+' min';
function paint(){ const byP={}; T.forEach(o=>o.p.forEach(p=>(byP[p]=byP[p]||[]).push(o)));
  Object.entries(byP).forEach(([p,list])=>{ const sec=document.getElementById(p); if(!sec) return; const head=sec.querySelector('.panel-head')||sec; let c=head.querySelector(':scope > .fresh'); if(!c){ c=document.createElement('span'); c.className='fresh'; head.appendChild(c); }
    const bad=list.filter(o=>o.ok===false), chk=Math.max(...list.map(o=>o.last||0)), su=list.map(o=>o.src&&o.src()).filter(Boolean), slow=list.filter(o=>o.every>TICK);
    c.className='fresh '+(bad.length===list.length&&list.every(o=>o.ok!=null)?'r':bad.length?'a':'g');
    c.textContent=`● checked ${ago(chk)} ago`+(su.length?` · source updated ${ago(Math.min(...su))} ago`:'')+(bad.length?` · ${bad.length} feed${bad.length>1?'s':''} retrying`:'');
    c.title=list.map(o=>`${o.n}: ${o.ok===false?'ERROR '+o.err:o.ok?'ok':'starting'} · read ${o.last?ago(o.last)+' ago':'—'}${o.every>TICK?' · re-read every '+ivl(o.every)+' (source limit)':' · every 15 s'}${o.note?' · '+o.note:''}`).join('\n')+(slow.length?'\nThe 15-second heartbeat checks every panel; slower sources are read on their own limit.':''); });
  // global light
  let hb=Q('#hb'); const host=Q('#topbar')||Q('#floorRoot .zone-h'); if(!hb&&host){ hb=document.createElement('span'); hb.id='hb'; host.appendChild(hb); }
  if(hb){ const live=T.filter(o=>o.ok!=null), ok=live.filter(o=>o.ok).length, off=!navigator.onLine; const w=ws&&typeof ws==='object'?ws.readyState===1:false;
    const cls=off?'r':ok===live.length&&w?'g':ok>=live.length*0.7?'a':'r'; hb.className=cls;
    const SH=window.SHARED; hb.innerHTML=`<i></i>ALL FEEDS ${off?'OFFLINE':`${ok}/${live.length} OK`} · ledger stream ${w?'live':'reconnecting'} · beat ${ago(lastCyc)} ago${SH?' · '+(SH.role==='leader'?'fetching for all windows':'shared from the other window'):''}`;
    hb.title=(window.SHARED?`Shared fetcher: this window is the ${SHARED.role}. Network requests ${SHARED.net}, cache hits ${SHARED.cacheHits}, via the other window ${SHARED.viaLeader}, served to the other window ${SHARED.served}, direct fallbacks ${SHARED.fallback}.\n`:'')+T.map(o=>`${o.ok===false?'✖':o.ok?'✔':'…'} ${o.n} — ${o.ok===false?o.err:'read '+ago(o.last)+' ago'}${o.every>TICK?' (every '+ivl(o.every)+', source limit)':''}`).join('\n')+'\nBacking off: '+(Object.entries(BO).filter(([h,b])=>Date.now()<b.until).map(([h,b])=>h+' '+Math.ceil((b.until-Date.now())/1e3)+' s').join(', ')||'none'); }
  // offline banner
  let ob=Q('#offline'); if(!navigator.onLine){ if(!ob){ ob=document.createElement('div'); ob.id='offline'; ob.textContent='OFFLINE: showing the last good data with its original times. Retrying every 15 s.'; document.body.appendChild(ob); } } else if(ob) ob.remove(); }
addEventListener('online',()=>{ Object.keys(BO).forEach(k=>delete BO[k]); T.forEach(o=>o.last=0); tick(); }); addEventListener('offline',paint);
/* ---------- 24/7 hygiene: daily reload at a quiet moment (04:00–05:00 ET, no input for 10 min) ---------- */
let lastIn=Date.now(); ['mousemove','keydown','pointerdown','wheel'].forEach(e=>addEventListener(e,()=>{ lastIn=Date.now(); },{passive:true}));
const t0=Date.now();
setInterval(()=>{ const h=+new Date().toLocaleString('en-US',{timeZone:'America/New_York',hour:'numeric',hour12:false}); const mem=performance.memory&&performance.memory.usedJSHeapSize;
  if(Date.now()-t0>20*36e5&&Date.now()-lastIn>10*60e3&&((h===4)||(mem&&mem>1.5e9))) location.reload(); },5*60e3);
window.F15={T,BO,tick,paint};
setTimeout(()=>{ setup(); tick(); setInterval(tick,TICK); setInterval(paint,5000); },2500);
})();

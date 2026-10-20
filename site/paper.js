/* DEMAND RADAR · TRADE THREAT METER — PAPER MODE ONLY. SIMULATED MONEY.
   This file contains NO network, broker, socket or beacon code of any kind and no live adapter. Orders exist only as rows in a
   local simulated ledger. All money amounts and limits below are EXAMPLE numbers for the demo, not anyone's real capital or limits.
   Nothing here is a prediction or advice. */
(function(){ 'use strict';
const Q=s=>document.querySelector(s), QA=s=>[...document.querySelectorAll(s)];
const E=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
/* ---------- always-visible banner ---------- */
function banner(){ if(Q('#paperBanner')) return; const b=document.createElement('div'); b.id='paperBanner'; b.setAttribute('role','status'); b.textContent='PAPER MODE — SIMULATED MONEY · no real orders can be placed from this build'; document.body.prepend(b); document.body.classList.add('has-paper'); }
/* ---------- EXAMPLE configuration (clearly not the owner's numbers) ---------- */
const CFG={label:'EXAMPLE NUMBERS — demo only',equity:10000,maxLossDay:200,maxExposure:3000,maxSpreadPct:0.30,staleMs:20000,expiryMs:60000,driftPct:0.50,
  feePct:0.10,slipBasePct:0.02,slipPer1k:0.05,
  auto:{minConf:70,maxRisk:40,maxNotional:500,minRR:1.5,delayMs:3000}};
const MODES={SCRIPTED:{tag:'SCRIPTED DEMO SCENARIO',cls:'scr'},LIVE:{tag:'LIVE-DATA SIMULATION',cls:'liv'}};
const L={SCRIPTED:{pos:{qty:0,avg:0},realized:0,fees:0,trades:[]},LIVE:{pos:{qty:0,avg:0},realized:0,fees:0,trades:[]}}; // never mixed
const ST={props:[],autoOn:false,queue:[],log:[],skew:0,seq:0,market:{SCRIPTED:null}};
const now=()=>Date.now()+ST.skew;
const log=(m,k)=>{ ST.log.unshift({t:now(),m,k:k||''}); ST.log=ST.log.slice(0,60); };
/* ---------- quotes ---------- */
function quote(mode){ if(mode==='SCRIPTED') return ST.market.SCRIPTED;
  try{ const p=val('px'); const x=p&&p.xrp; if(!(x>0)) return null; const t=(D.px&&D.px.t)||0; const h=x*0.0004; return {bid:x-h,ask:x+h,t,src:(D.px&&D.px.src)||'live price'}; }catch(e){ return null; } }
const mid=q=>(q.bid+q.ask)/2, spreadPct=q=>(q.ask-q.bid)/mid(q)*100;
function exposure(mode,mark){ const p=L[mode].pos; return p.qty*(mark||p.avg); }
/* ---------- gates ---------- */
function gates(p){ const n=now(), q=quote(p.mode), out=[]; const g=(id,ok,detail,block)=>out.push({id,ok,detail,block:!!block});
  const exp=n>p.expires; g('expired',!exp,exp?`proposal expired ${Math.round((n-p.expires)/1000)} s ago — a fresh approval is needed`:`valid for another ${Math.max(0,Math.round((p.expires-n)/1000))} s`,1);
  if(!q){ g('data',false,'no price data',1); return out; }
  const age=n-q.t; g('data',age<=CFG.staleMs,age<=CFG.staleMs?`price is ${Math.round(age/1000)} s old (limit ${CFG.staleMs/1000} s)`:`STALE DATA: price is ${Math.round(age/1000)} s old (limit ${CFG.staleMs/1000} s)`,1);
  const sp=spreadPct(q); g('spread',sp<=CFG.maxSpreadPct,sp<=CFG.maxSpreadPct?`spread ${sp.toFixed(3)}% (limit ${CFG.maxSpreadPct}%)`:`SPREAD TOO WIDE: ${sp.toFixed(3)}% (limit ${CFG.maxSpreadPct}%)`,1);
  const lim=-CFG.maxLossDay, r=L[p.mode].realized; g('loss',r>lim,r>lim?`today's simulated result ${fm(r)} (daily loss limit ${fm(-CFG.maxLossDay)})`:`LOSS LIMIT BREACHED: today ${fm(r)} ≤ ${fm(lim)}`,1);
  const drift=Math.abs((p.side==='BUY'?q.ask:q.bid)/p.entry-1)*100; g('drift',drift<=CFG.driftPct,drift<=CFG.driftPct?`price moved ${drift.toFixed(2)}% since proposal (limit ${CFG.driftPct}%)`:`PRICE CHANGED ${drift.toFixed(2)}% since proposal (limit ${CFG.driftPct}%): fresh approval needed`,1);
  const after=exposureAfter(p,q); g('exposure',after<=CFG.maxExposure,after<=CFG.maxExposure?`exposure after ${fm(after)} (limit ${fm(CFG.maxExposure)})`:`EXPOSURE LIMIT: ${fm(after)} > ${fm(CFG.maxExposure)}`,1);
  return out; }
const fm=v=>(v<0?'-':'')+'$'+Math.abs(v).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
function exposureAfter(p,q){ q=q||quote(p.mode)||{bid:p.entry,ask:p.entry}; const mk=mid(q), cur=L[p.mode].pos.qty*mk; return Math.max(0,cur+(p.side==='BUY'?1:-1)*p.qty*mk); }
const blocked=p=>gates(p).filter(x=>!x.ok&&x.block);
/* ---------- auto-take eligibility: EVERY rule must pass ---------- */
function autoRules(p){ const q=quote(p.mode), A=CFG.auto, r=[]; const R=(rule,ok,detail)=>r.push({rule,ok,detail});
  R('Confidence ≥ '+A.minConf,p.conf>=A.minConf,'confidence '+p.conf);
  R('Risk ≤ '+A.maxRisk,p.risk<=A.maxRisk,'risk '+p.risk);
  const notional=p.qty*p.entry; R('Size ≤ '+fm(A.maxNotional),notional<=A.maxNotional,'order '+fm(notional));
  const rr=p.upside/Math.max(1e-9,p.downside); R('Upside ÷ downside ≥ '+A.minRR,rr>=A.minRR,'ratio '+rr.toFixed(2));
  const gs=q?gates(p):[]; ['data','spread','loss','exposure','drift','expired'].forEach(id=>{ const x=gs.find(y=>y.id===id); const nm={data:'Data fresh',spread:'Spread within limit',loss:'Daily loss limit not breached',exposure:'Total exposure within limit',drift:'Price unchanged since proposal',expired:'Proposal not expired'}[id]; R(nm,!!x&&x.ok,x?x.detail:'no price data'); });
  R('Auto-take switch is ON',ST.autoOn,ST.autoOn?'on':'off'); return r; }
const autoEligible=p=>autoRules(p).every(x=>x.ok);
/* ---------- simulated execution (fees, spread, slippage, partial / zero fills) ---------- */
function rng(seed){ let s=seed>>>0||1; return ()=>{ s^=s<<13; s>>>=0; s^=s>>>17; s^=s<<5; s>>>=0; return s/4294967296; }; }
function fill(p,q){ const r=rng(p.seed), px=p.side==='BUY'?q.ask:q.bid, notional=p.qty*px;
  const slipPct=(CFG.slipBasePct+CFG.slipPer1k*notional/1000)*(0.5+r()); const slip=px*slipPct/100*(p.side==='BUY'?1:-1);
  const depth=p.depth!=null?p.depth:p.qty*(0.35+r()*0.9); const ratio=Math.max(0,Math.min(1,depth/p.qty)); const qty=Math.round(p.qty*ratio*100)/100; const price=px+slip;
  return {qty,price,ratio,slipPct,fee:qty*price*CFG.feePct/100,spreadCost:qty*Math.abs(px-mid(q))}; }
function execute(p,via){ // single choke point: re-checks everything at the moment of execution
  if(p.state!=='pending') return {ok:false,why:'not pending'}; const b=blocked(p);
  if(b.length){ log(`${via.toUpperCase()} blocked: ${b.map(x=>x.id).join(', ')}`,'bad'); p.blockedBy=b; p.state=b.some(x=>x.id==='expired'||x.id==='drift')?'needs-reapproval':'blocked'; render(); return {ok:false,why:b.map(x=>x.id)}; }
  if(via==='auto'&&!(ST.autoOn&&autoEligible(p))){ log('AUTO-TAKE not submitted: switch off or a rule failed','bad'); p.state='pending'; render(); return {ok:false,why:['auto-off-or-rule']}; }
  const q=quote(p.mode), f=fill(p,q), led=L[p.mode], pos=led.pos; let realized=0;
  if(f.qty>0){ const sgn=p.side==='BUY'?1:-1; if(sgn>0){ pos.avg=(pos.avg*pos.qty+f.price*f.qty)/(pos.qty+f.qty); pos.qty+=f.qty; } else { const c=Math.min(pos.qty,f.qty); realized=(f.price-pos.avg)*c; pos.qty-=c; if(pos.qty<=0) pos.avg=0; }
    led.realized+=realized-f.fee; led.fees+=f.fee; }
  p.state=f.qty===0?'unfilled':f.ratio<0.999?'partial':'filled'; p.fill=f; p.via=via; p.doneAt=now();
  led.trades.unshift({t:now(),id:p.id,side:p.side,req:p.qty,fill:f.qty,price:f.price,fee:f.fee,via,state:p.state}); log(`${via.toUpperCase()} → SIMULATED ${p.side} ${f.qty}/${p.qty} XRP @ ${f.price.toFixed(4)} (${p.state})`,'ok'); render(); return {ok:true,fill:f}; }
/* ---------- proposals ---------- */
function propose(o){ const q=quote(o.mode); if(!q) throw new Error('no quote'); const entry=o.side==='BUY'?q.ask:q.bid, n=now();
  const p={id:'P'+(++ST.seq),mode:o.mode,side:o.side,qty:o.qty,entry,stop:o.stop,target:o.target,why:o.why||[],conf:o.conf,risk:o.risk,created:n,expires:n+(o.expiryMs||CFG.expiryMs),state:'pending',seed:o.seed||(ST.seq*7919+13),depth:o.depth,title:o.title};
  p.upside=Math.abs(p.target-entry)*p.qty; p.downside=Math.abs(entry-p.stop)*p.qty; ST.props.unshift(p); ST.props=ST.props.slice(0,12); log(`${MODES[p.mode].tag}: proposal ${p.id} ${p.side} ${p.qty} XRP`,'');
  if(ST.autoOn&&autoEligible(p)) queueAuto(p); render(); return p; }
function queueAuto(p){ if(ST.queue.find(x=>x.p===p)) return; const t=setTimeout(()=>fire(p),CFG.auto.delayMs); ST.queue.push({p,t,at:now()+CFG.auto.delayMs}); log(`AUTO-TAKE queued ${p.id} (submits in ${CFG.auto.delayMs/1000} s unless switched off)`,''); }
function fire(p){ ST.queue=ST.queue.filter(x=>x.p!==p); if(!ST.autoOn){ log(`AUTO-TAKE is OFF: ${p.id} NOT submitted`,'bad'); render(); return; } execute(p,'auto'); }
function setAuto(on){ ST.autoOn=!!on; if(!on){ ST.queue.forEach(x=>{ clearTimeout(x.t); log(`AUTO-TAKE switched off: queued ${x.p.id} cancelled`,'bad'); }); ST.queue=[]; } else { ST.props.filter(p=>p.state==='pending').forEach(p=>{ if(autoEligible(p)) queueAuto(p); }); } render(); }
const approve=id=>{ const p=ST.props.find(x=>x.id===id); if(!p) return null;
  if(p.state==='needs-reapproval'||(p.state==='pending'&&blocked(p).some(x=>x.id==='expired'||x.id==='drift'))){ // expired or price moved: never execute the old order; issue a fresh proposal at the current price that needs its own approval
    ST.queue=ST.queue.filter(x=>{ if(x.p===p){ clearTimeout(x.t); return false; } return true; }); p.state='superseded'; const f=propose({mode:p.mode,side:p.side,qty:p.qty,stop:p.stop,target:p.target,conf:p.conf,risk:p.risk,title:p.title,why:p.why,depth:p.depth}); log(`${id} superseded by fresh proposal ${f.id} at the current price: approve it to execute`,''); render(); return {ok:false,fresh:f.id}; }
  if(p.state==='blocked'){ p.state='pending'; } ST.queue=ST.queue.filter(x=>{ if(x.p===p){ clearTimeout(x.t); return false; } return true; }); return execute(p,'manual'); };
const deny=id=>{ const p=ST.props.find(x=>x.id===id); if(!p||p.state==='filled'||p.state==='partial') return; ST.queue=ST.queue.filter(x=>{ if(x.p===p){ clearTimeout(x.t); return false; } return true; }); p.state='denied'; log(`DENIED ${id}: nothing executed`,'bad'); render(); };
/* ---------- scripted demo scenarios (fake prices, labelled) + live-data simulation ---------- */
const DEMO={
 reset(){ ST.props=[]; ST.queue.forEach(x=>clearTimeout(x.t)); ST.queue=[]; ['SCRIPTED','LIVE'].forEach(m=>{ L[m]={pos:{qty:0,avg:0},realized:0,fees:0,trades:[]}; }); ST.autoOn=false; ST.skew=0; DEMO.setQuote(1.3000,0.0010); render(); },
 setQuote(mid,half,ageMs){ ST.market.SCRIPTED={bid:mid-half,ask:mid+half,t:now()-(ageMs||0),src:'SCRIPTED example quote'}; render(); },
 good(o){ return propose({mode:'SCRIPTED',side:'BUY',qty:300,stop:1.2740,target:1.3520,conf:78,risk:32,title:'Example: breakout retest (scripted)',why:['Scripted example only — price held above its 50-day average in the script','Upside ÷ downside is about 1.9 in this example','Spread and data age are inside the limits'],...(o||{})}); },
 risky(o){ return propose({mode:'SCRIPTED',side:'BUY',qty:900,stop:1.2400,target:1.3300,conf:55,risk:68,title:'Example: oversized, low-confidence (scripted)',why:['Scripted example: large size, wide stop','Confidence is low and risk is high, so auto-take must refuse'],...(o||{})}); },
 forceLoss(){ L.SCRIPTED.realized=-(CFG.maxLossDay+10); L.SCRIPTED.trades.unshift({t:now(),id:'demo',side:'SELL',req:0,fill:0,price:0,fee:0,via:'scripted loss',state:'scripted loss'}); log('Scripted losing result added to the SCRIPTED ledger only (demo of the daily loss limit)','bad'); render(); },
 live(){ const q=quote('LIVE'); if(!q) throw new Error('no live price yet'); const e=q.ask; return propose({mode:'LIVE',side:'BUY',qty:200,stop:e*0.985,target:e*1.03,conf:50,risk:45,title:'Live-data simulation: rule-based sizing example',
   why:[`Uses the tracker's live price ${e.toFixed(4)} (${q.src})`,'Stop 1.5% below, target 3% above: example sizing, not a prediction','No tracker signal is claimed to predict this move; confidence is set to neutral 50']}); } };
/* ---------- UI ---------- */
function ensure(){ if(Q('#ttm')) return; const s=document.createElement('section'); s.id='ttm'; s.className='panel'; s.innerHTML='<div class="panel-head"><h2>Trade threat meter · paper</h2><span class="hint">simulated money · example limits</span></div><div id="ttmBody"></div>'; (Q('#app')||document.body).appendChild(s); }
const mt=m=>`<span class="ttm-tag ${MODES[m].cls}">${MODES[m].tag}</span>`;
function card(p){ const q=quote(p.mode), gs=gates(p), bl=gs.filter(x=>!x.ok&&x.block), ar=autoRules(p), eb=exposure(p.mode,q&&mid(q)), ea=q?exposureAfter(p,q):null, n=now();
  const rem=Math.max(0,Math.round((p.expires-n)/1000)), qa=ST.queue.find(x=>x.p===p);
  return `<div class="ttm-card ${MODES[p.mode].cls} st-${p.state}" data-id="${p.id}"><div class="ttm-top">${mt(p.mode)}<b>${E(p.title||'Proposal')}</b><span class="ttm-st">${E(p.state.toUpperCase())}</span></div>
  <div class="ttm-order">${p.side} ${p.qty} XRP @ ~${p.entry.toFixed(4)} <em>= ${fm(p.qty*p.entry)} simulated · stop ${p.stop.toFixed(4)} · target ${p.target.toFixed(4)}${p.state==='pending'?` · expires in ${rem} s`:''}</em></div>
  <div class="ttm-why"><h5>WHY IT QUALIFIES</h5>${p.why.map(w=>`<div>• ${E(w)}</div>`).join('')}</div>
  <div class="ttm-nums"><div class="g"><span>ESTIMATED UPSIDE</span><b>+${fm(p.upside)}</b></div><div class="r"><span>ESTIMATED DOWNSIDE</span><b>-${fm(p.downside)}</b></div><div><span>TOTAL EXPOSURE</span><b>${fm(eb)} → ${ea==null?'—':fm(ea)}</b></div><div><span>CONFIDENCE</span><b>${p.conf}</b></div><div><span>RISK</span><b class="${p.risk>CFG.auto.maxRisk?'r':''}">${p.risk}</b></div></div>
  ${bl.length?`<div class="ttm-block">${bl.map(x=>`<div>⛔ ${E(x.detail)}</div>`).join('')}<em>Execution is blocked${bl.some(x=>x.id==='expired'||x.id==='drift')?'; a fresh approval is required':''}.</em></div>`:''}
  <details class="ttm-ck" ${p.mode==='SCRIPTED'||ST.autoOn?'open':''}><summary>AUTO-TAKE eligibility: ${ar.filter(x=>x.ok).length}/${ar.length} rules pass${autoEligible(p)?' — ELIGIBLE':' — NOT eligible'}</summary>${ar.map(x=>`<div class="${x.ok?'ok':'no'}">${x.ok?'✔ PASS':'✖ FAIL'} · ${E(x.rule)} <em>${E(x.detail)}</em></div>`).join('')}</details>
  ${qa?`<div class="ttm-q">AUTO-TAKE queued: submits in ${Math.max(0,Math.ceil((qa.at-n)/1000))} s unless switched off</div>`:''}
  ${p.fill?`<div class="ttm-fill">SIMULATED FILL: ${p.fill.qty} of ${p.qty} XRP (${(p.fill.ratio*100).toFixed(0)}%) @ ${p.fill.price.toFixed(4)} · slippage ${p.fill.slipPct.toFixed(3)}% · spread cost ${fm(p.fill.spreadCost)} · fee ${fm(p.fill.fee)} · via ${E(p.via)}${p.fill.qty<p.qty?` · UNFILLED ${(p.qty-p.fill.qty).toFixed(2)} XRP`:''}</div>`:''}
  ${['pending','blocked','needs-reapproval'].includes(p.state)?`<div class="ttm-btns"><button data-a="approve" data-id="${p.id}">${p.state==='pending'?'APPROVE':'RE-APPROVE (fresh)'}</button><button data-a="deny" data-id="${p.id}">DENY</button></div>`:''}</div>`; }
function render(){ ensure(); const el=Q('#ttmBody'); if(!el) return; const open=el.querySelector('details[open]')?1:0;
  const tot=m=>{ const l=L[m], q=quote(m); const mk=q?mid(q):l.pos.avg; const unreal=l.pos.qty*(mk-l.pos.avg); return `<div class="ttm-tot ${MODES[m].cls}">${mt(m)}<span>position ${l.pos.qty.toFixed(2)} XRP · exposure ${fm(l.pos.qty*mk)}</span><span>realized ${fm(l.realized)} · fees ${fm(l.fees)}</span><span>open ${fm(unreal)}</span></div>`; };
  const pct=Math.min(100,Math.max(exposure('SCRIPTED',quote('SCRIPTED')&&mid(quote('SCRIPTED'))),exposure('LIVE',quote('LIVE')&&mid(quote('LIVE'))))/CFG.maxExposure*100);
  el.innerHTML=`<div class="ttm-bar"><label class="ttm-auto"><input type="checkbox" id="ttmAuto" ${ST.autoOn?'checked':''}> AUTO-TAKE <b class="${ST.autoOn?'on':''}">${ST.autoOn?'ON':'OFF'}</b></label><span class="ttm-cfg">${E(CFG.label)}: equity ${fm(CFG.equity)} · daily loss limit ${fm(CFG.maxLossDay)} · exposure limit ${fm(CFG.maxExposure)} · spread ≤ ${CFG.maxSpreadPct}% · data ≤ ${CFG.staleMs/1000}s · fee ${CFG.feePct}%</span></div>
   <div class="ttm-gauge" title="Exposure as % of the example limit (separate for each mode; the larger is shown)"><i style="width:${pct}%"></i><span>EXPOSURE ${pct.toFixed(0)}% OF EXAMPLE LIMIT</span></div>
   <div class="ttm-tots">${tot('SCRIPTED')}${tot('LIVE')}<em>Scripted and live-data results are never added together.</em></div>
   ${ST.props.map(card).join('')||'<div class="ttm-none">No proposals. (Scripted scenarios and live-data simulations appear here.)</div>'}
   <div class="ttm-log">${ST.log.slice(0,8).map(x=>`<div class="${x.k}"><b>${new Date(x.t).toLocaleTimeString('en-US',{timeZone:'America/New_York'})} ET</b> ${E(x.m)}</div>`).join('')}</div>
   <div class="ttm-btns"><button data-a="live">NEW LIVE-DATA SIMULATION</button><span class="hint">Paper only. No live trading exists in this build.</span></div>`;
  const ch=el.querySelector('#ttmAuto'); if(ch) ch.onchange=()=>setAuto(ch.checked);
  el.querySelectorAll('button[data-a]').forEach(b=>b.onclick=()=>{ const a=b.dataset.a; if(a==='approve') approve(b.dataset.id); else if(a==='deny') deny(b.dataset.id); else if(a==='live'){ try{ DEMO.live(); }catch(e){ log('Live-data simulation: '+e.message,'bad'); render(); } } }); }
function start(){ banner(); ensure(); DEMO.setQuote(1.3000,0.0010); render(); setInterval(()=>{ if(!document.hidden) render(); },1000); }
/* ---------- frozen public surface: no live adapter, ever ---------- */
window.PAPER=Object.freeze({paper:true,live:false,CFG,L,ST,gates,autoRules,autoEligible,propose,approve,deny,setAuto,execute,DEMO,render,skew:ms=>{ ST.skew+=ms; render(); }});
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start); else start();
})();

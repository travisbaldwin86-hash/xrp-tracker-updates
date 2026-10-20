/* DEMAND RADAR · Sim Rig broadcast layout (3 × 1920×1080).
   LEFT = live charts + signal dials · CENTER = the DEMAND zone · RIGHT = live tickers.
   Everything here reads the same live, labelled data as app.js. No predictions, no buy/sell calls. */
(function(){ 'use strict';
if(new URLSearchParams(location.search).get('layout')!=='rig') return;
const Q=s=>document.querySelector(s), QA=s=>[...document.querySelectorAll(s)];
const R={lastMsg:0,ledger:null,burn:[],acct:[],txs:[],particles:[],comets:[],tlHours:24,mode:'flow',rnKey:null};

/* ---------- 1. latency capture for every fetch (shown on health-light hover) ---------- */
const LAT={}; const _fetch=window.fetch.bind(window);
const hostOf=u=>{ try{ const x=new URL(typeof u==='string'?u:u.url,location.href); const p=x.searchParams.get('u'); return p?new URL(p).host:x.host; }catch(e){ return '?'; } };
window.fetch=async(u,o)=>{ const s=performance.now(), h=hostOf(u);
  try{ const r=await _fetch(u,o); LAT[h]={ms:Math.round(performance.now()-s),t:Date.now(),ok:r.ok,st:r.status}; return r; }
  catch(e){ LAT[h]={ms:Math.round(performance.now()-s),t:Date.now(),ok:false,err:e.message}; throw e; } };

/* ---------- 2. help text for the new pieces ---------- */
Object.assign(window.INFO||{},{
  rightnow:'The single most important live event right now, auto-ranked by alarm stage, size versus normal, adoption relevance and how recent it is. It shows conditions, not certainties, and is never a prediction or a buy/sell call.',
  early:'Early warning: conditions that are getting close to a threshold traders watch (RSI 70/30, Fear & Greed extremes, funding extremes, a volatility squeeze, the 50/200-day averages converging, XRPN mNAV near 1.0). The meter shows how close. Being close is not the same as crossing, and crossing is not a forecast.',
  demand:'The DEMAND zone answers one question: is Ripple adoption turning into XRP demand? Particles are real live XRPL events: cyan = RLUSD↔XRP conversions, green = new accounts (each locks 1 XRP), orange = XRP fees burned, violet = RLUSD minted/redeemed, white comets = whale payments ≥1M XRP. Each ring is one of the 6 checks; its fill = trend vs its own 30-day history (green rising, red falling, grey = no data yet).',
  checks:'The 6 adoption checks as numbers. Hover a tile for source and time. Trend badge = 7-day average vs the prior 30 days (or vs daily snapshots kept in this browser).',
  timeline:'What changed, and when: every whale move, alarm, headline, XRPN move, RLUSD supply jump, signal flip and X Money mention on one time axis, so cause and timing line up. Hover a marker for details, click to open its link. Only events this dashboard saw or fetched are shown.',
  health:'Data health per feed: green = live, amber = delayed or using the last good copy, red = down. Hover a light for source, latency of the last request and its age.',
  pulse:'Ledger pulse: daily XRPL activity over 90 days (XRPSCAN) plus live per-minute rates measured from the XRPL WebSocket while this page is open.',
  rlfeed:'Live RLUSD activity on the XRP Ledger: RLUSD↔XRP conversions (the part that creates XRP demand), RLUSD minted or redeemed by the issuer, and deposits/withdrawals in the RLUSD/XRP AMM pool. From the XRPL WebSocket, second by second.',
  sigdial:'Ring = where the reading sits on its usual scale; colour = alarm level. Signals show conditions, not certainties.'
});

/* ---------- 3. build the three screens ---------- */
const sec=(id,h,inner)=>{ const s=document.createElement('section'); s.id=id; s.className='panel'; s.innerHTML=(h?`<div class="panel-head"><h2 data-info="${id}">${h}</h2></div>`:'')+inner; return s; };
function build(){
  const app=Q('#app');
  const pulse=sec('pulse','Ledger pulse','<div class="pulse-live" id="pulseLive"></div><div class="pulse-grid" id="pulseGrid"></div>');
  const rl=sec('rlfeed','Live RLUSD ↔ XRP','<div class="feed" id="rlFeed"></div>');
  const rn=sec('rightnow','','<div class="rn-k" data-info="rightnow">RIGHT NOW</div><div class="rn-body" id="rnBody"><div class="rn-icon" id="rnIcon"></div><div class="rn-main"><div class="rn-title" id="rnTitle">Listening to the ledger…</div><div class="rn-sub" id="rnSub"></div></div><div class="rn-time"><div class="rn-clock" id="rnClock"></div><div class="rn-ago" id="rnAgo"></div></div></div>');
  const ew=sec('early','Early warning · approaching','<div id="earlyList"></div>');
  const dz=sec('demand','',`<canvas id="dzCanvas"></canvas>
    <div class="dz-verdict"><div class="dz-k" data-info="demand">IS ADOPTION CREATING XRP DEMAND?</div><div class="dz-title" id="dzTitle">Reading…</div><div class="dz-score" id="dzScore"></div></div>
    <div class="dz-live" id="dzLive"></div>
    <div class="dz-legend"><i style="--c:#36e2cf"></i>RLUSD↔XRP <i style="--c:#4fe08c"></i>new accounts <i style="--c:#ff7a3d"></i>fees burned <i style="--c:#9b8cff"></i>RLUSD mint/redeem <i style="--c:#ffffff"></i>whale ≥1M</div>
    <canvas id="geoCanvas"></canvas><div id="geoPanel"></div>
    <div class="dz-mode seg" id="dzMode"><button data-m="flow" class="on">FLOW</button><button data-m="globe">GLOBE</button><button data-m="auto">AUTO</button><span data-info="globe" class="infoanchor"></span></div>
    <div class="geo-legend"><i style="--c:#ff7a3d"></i>outflow end <i style="--c:#36e2cf"></i>inflow end · arc width = XRP amount <i style="--c:#9b8cff"></i>XRPL nodes · unlabelled flows are counted, never placed</div>
    <div class="dz-meme" id="dzMeme"><div class="dz-stage" id="dzStage"></div><div class="dz-art" id="dzArt"></div><div class="dz-cap" id="dzCap"></div></div>`);
  const ck=sec('checks','','<div id="chkGrid"></div>');
  const tl=sec('timeline','What changed','<canvas id="tlCanvas"></canvas><div id="tlTip"></div>');
  tl.querySelector('.panel-head').insertAdjacentHTML('beforeend','<div id="tlLegend"></div><div class="seg" id="tlSeg"><button data-h="24" class="on">24H</button><button data-h="72">3D</button><button data-h="168">7D</button></div>');
  const health=document.createElement('div'); health.id='health'; health.innerHTML='<span data-info="health" class="infoanchor"></span><span id="healthDots"></span>';
  Q('#topbar').appendChild(health);
  const pair=(id,a,b)=>{ const d=document.createElement('div'); d.id=id; d.className='lrow'; d.append(a,b); return d; }, stack=(...els)=>{ const d=document.createElement('div'); d.className='lstack'; d.append(...els); return d; };
  const rnRow=document.createElement('div'); rnRow.id='rnRow'; rnRow.append(rn,ew);
  const cols={left:[Q('#market'),pair('lrow1',Q('#signals'),stack(pulse,Q('#network'))),pair('lrow2',Q('#everywhere'),Q('#holders'))], center:[Q('#topbar'),rnRow,dz,ck,tl,Q('#footer')], right:[Q('#whales'),rl,Q('#xrpn'),Q('#xmoney'),Q('#news'),Q('#alarmlog')]};
  Object.entries(cols).forEach(([k,els])=>{ const box=Q('#scr-'+k); box.dataset.label=k.toUpperCase()+' SCREEN';
    const sc=document.createElement('div'); sc.className='scr-scroll'; const fit=document.createElement('div'); fit.className='scr-fit fit-'+k; sc.appendChild(fit); box.appendChild(sc); els.forEach(e=>fit.appendChild(e)); });
  Q('#whales h2').textContent='Live whale moves ≥1M XRP';
  const rb=document.createElement('button'); rb.id='rigInfoBtn'; rb.type='button'; rb.title='Show or hide every info caption'; Q('#scr-center').appendChild(rb);
  const rbl=()=>{ rb.textContent='ⓘ INFO '+(document.body.classList.contains('allinfo')?'ON':'OFF'); rb.classList.toggle('on',document.body.classList.contains('allinfo')); };
  rb.onclick=()=>Q('#btnInfo').click(); rbl(); new MutationObserver(rbl).observe(document.body,{attributes:true,attributeFilter:['class']});
  const dg=document.createElement('div'); dg.id='rigdiag'; Q('#scr-center').appendChild(dg);
  const setMode=m=>{ R.pick=m; QA('#dzMode button').forEach(x=>x.classList.toggle('on',x.dataset.m===m)); applyMode(m==='auto'?(R.mode||'flow'):m); try{ sessionStorage.setItem('dzMode',m); }catch(e){} };
  QA('#dzMode button').forEach(b=>b.onclick=()=>setMode(b.dataset.m)); setMode(sessionStorage.getItem('dzMode')||'flow');
  setInterval(()=>{ if(R.pick==='auto'&&!document.hidden) applyMode(R.mode==='flow'?'globe':'flow'); },45000);
  QA('#tlSeg button').forEach(b=>b.onclick=()=>{ R.tlHours=+b.dataset.h; QA('#tlSeg button').forEach(x=>x.classList.toggle('on',x===b)); drawTimeline(); });
}

function applyMode(m){ R.mode=m; const d=Q('#demand'); if(!d) return; d.classList.toggle('mode-globe',m==='globe'); d.classList.remove('swap'); void d.offsetWidth; d.classList.add('swap'); setTimeout(()=>{ sizeCanvases(); window.GeoSize&&GeoSize(); },60); }
window.RigMode=()=>R.mode; window.renderDemand=(...a)=>renderDemand(...a);
/* ---------- 4. auto-fit each 1920×1080 screen (then per-column scroll as fallback) ---------- */
let fitBusy=false, fitT=0;
function fitAll(){ if(fitBusy) return; fitBusy=true;
  const z0=innerWidth/5760; /* width-driven so the 3 panels always land on the 3 physical screens (x=0/1920/3840); height follows the real window */
  const padTop=parseFloat(getComputedStyle(document.body).paddingTop)||0, hh=Math.max(600,(innerHeight-padTop)/z0); Q('#rig').style.zoom=String(z0); Q('#rig').style.height=hh+'px'; QA('#rig .screen').forEach(e=>e.style.height=hh+'px'); let changed=false; const out=[];
  QA('#rig .scr-fit').forEach(f=>{ const sc=f.parentElement, prev=parseFloat(f.style.zoom||'1'); f.style.zoom='1'; const avail=sc.clientHeight-2; let z=1;
    for(let i=0;i<5;i++){ const h=f.scrollHeight*z; if(h<=avail) break; z=Math.max(0.6,z*avail/h*0.995); f.style.zoom=String(z); if(z<=0.6) break; }
    if(Math.abs(z-prev)>0.004) changed=true; out.push(Math.round(z*100)+'%'+(f.scrollHeight*z>avail+1?' scroll':'')); });
  Q('#rigdiag').textContent=`viewport ${innerWidth}×${innerHeight} · dpr ${devicePixelRatio} · surface ${Math.round(z0*100)}% · fit ${out.join(' / ')}`;
  window.__rigFit={innerWidth,innerHeight,dpr:devicePixelRatio,surface:z0,fit:out};
  if(changed){ try{renderChart()}catch(e){} try{renderXRPN()}catch(e){} try{renderPulse()}catch(e){} sizeCanvases(); }
  setTimeout(()=>{fitBusy=false},60); }
const schedFit=()=>{ clearTimeout(fitT); fitT=setTimeout(fitAll,300); };

/* ---------- 5. real-time XRPL: ledger + transaction streams on the existing socket ---------- */
const RL=CFG.RLUSD_HEX, ISS=CFG.RLUSD_ISSUER;
const isR=a=>a&&typeof a==='object'&&a.currency===RL&&a.issuer===ISS;
function hookWS(){ const w=ws; if(!w||w.__rig) return; w.__rig=1; w.addEventListener('message',onMsg);
  const sub=()=>{ try{ w.send(JSON.stringify({id:'rig-ledger',command:'subscribe',streams:['ledger']})); }catch(e){} };
  if(w.readyState===1) sub(); else w.addEventListener('open',sub); }
const _ss=window.startStream; window.startStream=function(){ _ss(); hookWS(); }; hookWS();
setInterval(hookWS,3000);
const trim=(a,ms=6e5)=>{ const c=Date.now()-ms; while(a.length&&a[0][0]<c) a.shift(); };
function onMsg(ev){ let m; try{ m=JSON.parse(ev.data); }catch(e){ return; } R.lastMsg=Date.now(); if(!R.t0) R.t0=Date.now();
  if(m.type==='ledgerClosed'){ const prev=R.ledger; R.ledger={idx:m.ledger_index,txn:m.txn_count,t:Date.now(),lt:m.ledger_time,close:prev&&prev.lt&&m.ledger_index===prev.idx+1?(m.ledger_time-prev.lt):(prev&&prev.close)||null}; return; }
  if(m.type!=='transaction'||!m.validated) return; const tx=m.transaction||m.tx_json||{}, meta=m.meta||{}; const t=Date.now();
  R.txs.push([t,1]); const fee=Number(tx.Fee)/1e6; if(fee>0){ R.burn.push([t,fee]); if(Math.random()<0.25) emit('burn',1); }
  (meta.AffectedNodes||[]).forEach(n=>{ if(n.CreatedNode&&n.CreatedNode.LedgerEntryType==='AccountRoot'){ R.acct.push([t,1]); emit('acct',1); } });
  trim(R.txs); trim(R.burn); trim(R.acct);
  if(m.engine_result!=='tesSUCCESS') return;
  if(tx.TransactionType==='Payment'){ const del=meta.delivered_amount!=null?meta.delivered_amount:(tx.Amount||tx.DeliverMax);
    if(isR(del)&&(tx.Account===ISS||tx.Destination===ISS)){ const v=+del.value, mint=tx.Account===ISS; emit('rl',Math.min(30,2+Math.log10(Math.max(v,10))*3),mint?1:-1);
      if(v>=1e5) rlEvent({t,kind:mint?'mint':'redeem',text:`${fN(v)} RLUSD ${mint?'minted (issued)':'redeemed (burned)'}`,amt:v,hash:m.hash||tx.hash,from:tx.Account,to:tx.Destination,level:v>=1e7?2:1}); } }
  if(/^AMM(Deposit|Withdraw)$/.test(tx.TransactionType)&&((tx.Asset2&&tx.Asset2.currency===RL)||(tx.Asset&&tx.Asset.currency===RL))){
    emit('conv',4); rlEvent({t,kind:'amm',text:`RLUSD/XRP AMM ${tx.TransactionType==='AMMDeposit'?'deposit':'withdrawal'}`,hash:m.hash||tx.hash,from:tx.Account,to:'AMM',level:0}); }
  if(tx.TransactionType==='OfferCreate'&&((isR(tx.TakerGets)&&typeof tx.TakerPays==='string')||(isR(tx.TakerPays)&&typeof tx.TakerGets==='string'))) emit('conv',1);
}
function rlEvent(e){ const L=LS.get('rlx',[]); L.unshift(e); LS.set('rlx',L.slice(0,120)); renderRlFeed(); }
const _af=window.addFeed; window.addFeed=function(e,save){ _af(e,save); if(e.kind==='whale') R.comets.push({t0:performance.now(),xrp:+String(e.text).replace(/[^\d.KMB]/g,'')||1,size:e.level||1}); if(e.kind==='rlusd') emit('conv',8); renderRlFeed(); };
const rate=(a,ms=3e5)=>{ if(!a.length) return R.t0?0:null; const span=Math.max(5000,Math.min(ms,Date.now()-(R.t0||Date.now()))); const c=Date.now()-ms; return a.filter(x=>x[0]>=c).reduce((s,x)=>s+x[1],0)/(span/6e4); };

/* ---------- 6. faster refresh of every other source (fastest each free source allows) ---------- */
const every=(ms,fn)=>{ setInterval(()=>{ if(!document.hidden) fn().catch(e=>console.warn('rig refresh',e)); },ms); };
if(!window.F15) every(10000,async()=>{ const t=await fetchJSON('https://api.exchange.coinbase.com/products/XRP-USD/ticker',{},8000); const p=+t.price; if(!(p>0)) return;
  if(D.px&&D.px.v){ D.px.v.xrp=p; D.px.t=Date.now(); D.px.src='CoinGecko + Coinbase Exchange live ticker'; } else put('px',{xrp:p},'Coinbase Exchange live ticker'); try{renderMarket()}catch(e){} });
if(!window.F15) every(30000,async()=>{ await loadXRPL(); try{renderNetwork(); renderScore(); renderXMoney();}catch(e){} renderDemand(); });
if(!window.F15) every(60000,async()=>{ await Promise.all([loadSentiment(),loadEth()]); try{evaluateStates()}catch(e){} });
if(PROXY&&!window.F15) every(60000,async()=>{ await loadXRPN(); try{renderXRPN(); checkNewsAlarms();}catch(e){} });
if(PROXY&&!window.F15) every(5*60000,async()=>{ await loadNews(); });

/* ---------- 7. data health lights ---------- */
const FEEDS=[
  {n:'XRPL live',ws:1,hosts:['xrplcluster.com','s1.ripple.com','xrpl.ws']},
  {n:'XRPL RPC',k:['server','coins','amm','rlusdXrpl','fee'],exp:30,hosts:['xrplcluster.com','s1.ripple.com:51234','xrpl.ws']},
  {n:'Price',k:['px'],exp:10,hosts:['api.exchange.coinbase.com','api.coingecko.com']},
  {n:'History',k:['dailyPx','hourlyPx'],exp:300,hosts:['api.coingecko.com']},
  {n:'XRPSCAN',k:['daily','rlusdTok','ammDaily'],exp:300,hosts:['api.xrpscan.com']},
  {n:'Ethereum',k:['rlusdEth'],exp:60,hosts:['ethereum-rpc.publicnode.com','eth.drpc.org']},
  {n:'Derivs',k:['fundOkx','oiOkx','fundBitget'],exp:60,hosts:['www.okx.com','api.bitget.com']},
  {n:'Sentiment',k:['fng'],exp:60,hosts:['api.alternative.me']},
  {n:'XRPN/SEC',k:['xrpn','sec'],exp:60,hosts:['query1.finance.yahoo.com','data.sec.gov']},
  {n:'News',k:['news_DTCC','news_Ripple','news_Cross River','news_Evernorth','news_X Money','news_Yellow'],exp:300,hosts:['news.google.com']}];
function renderHealth(){ const h=Q('#healthDots'); if(!h) return; const nowT=Date.now();
  h.innerHTML=FEEDS.map(f=>{ let st='red', why='';
    if(f.ws){ const a=(nowT-R.lastMsg)/1000; st=R.lastMsg&&a<10?'green':R.lastMsg&&a<60?'amber':'red'; why=R.lastMsg?`last message ${a.toFixed(0)}s ago${R.ledger?' · ledger #'+R.ledger.idx.toLocaleString():''}`:'not connected'; }
    else { const ds=f.k.map(k=>D[k]).filter(Boolean); const ok=ds.filter(d=>!d.err), bad=ds.filter(d=>d.err);
      const age=ok.length?Math.max(...ok.map(d=>(nowT-d.t)/1000)):null; const stale=ok.some(d=>/last good/i.test(d.src||''));
      st=!ds.length?'amber':!ok.length?'red':(bad.length||stale||age>f.exp*4)?'amber':'green';
      why=!ds.length?'waiting for first fetch':(ok.length?`updated ${age<90?Math.round(age)+'s':Math.round(age/60)+' min'} ago`:'')+(bad.length?` · down: ${bad.map(d=>d.err).filter((x,i,a)=>a.indexOf(x)===i).join('; ').slice(0,120)}`:'')+(stale?' · showing last good copy':''); }
    const lat=f.hosts.map(x=>LAT[x]?`${x} ${LAT[x].ms} ms${LAT[x].ok?'':' (failed)'}`:'').filter(Boolean).join(' · ');
    return `<span class="hl ${st}" title="${esc(f.n+': '+(st==='green'?'live':st==='amber'?'delayed':'down')+' · '+why+(lat?' · latency: '+lat:''))}"><i></i>${f.n}</span>`; }).join(''); }

/* ---------- 8. signal dials (left) ---------- */
const _rs=window.renderSignals; window.renderSignals=function(sig){ _rs(sig); const I=indicators(); const fg=val('fng'), f=val('fundOkx');
  const pos={rsi:I&&I.rsi/100, fng:fg&&fg[0]&&fg[0].v/100, bbw:I&&I.bbPct!=null?I.bbPct/100:null, volume:I&&I.volRatio!=null?Math.min(1,I.volRatio/3):null, funding:f!=null?Math.max(0,Math.min(1,.5+f/.002)):null, cross:I&&I.ma200?Math.max(0,Math.min(1,.5+(I.ma50/I.ma200-1)*5)):null, macd:I&&I.hist!=null?(I.hist>0?.75:.25):null};
  const col=['#36e2cf','#4aa8ff','#ffb547','#ff4d6d'];
  Q('#sigGrid').innerHTML=sig.map(s=>{ const p=pos[s.key]; const c=col[s.level||0]; const r=26, C=2*Math.PI*r*0.75;
    const tip=[String(s.state||'').replace(/<[^>]+>/g,''),String(s.how||'').replace(/<[^>]+>/g,''),String(s.rel||'').replace(/<[^>]+>/g,''),'Source: '+(s.src||'')+(s.t?' · '+fT(s.t):''),'Signals show conditions, not certainties.'].filter(Boolean).join('\n');
    return `<div class="sig dial l${s.level||0}" title="${esc(tip)}"><svg viewBox="0 0 64 64" class="dl"><circle cx="32" cy="32" r="${r}" stroke="#1b2a3f" stroke-width="6" fill="none" stroke-dasharray="${C} 999" transform="rotate(135 32 32)" stroke-linecap="round"/>
      ${p!=null&&isFinite(p)?`<circle cx="32" cy="32" r="${r}" stroke="${c}" stroke-width="6" fill="none" stroke-dasharray="${C*Math.max(.02,Math.min(1,p))} 999" transform="rotate(135 32 32)" stroke-linecap="round" class="dlv"/>`:''}
      <circle cx="32" cy="32" r="${s.level>=2?7:5}" fill="${c}" class="${s.level>=2?'blink':''}"/></svg>
      <div class="dt"><div class="n" data-info="${s.key}">${esc(s.name)}</div><div class="v" style="color:${c}">${s.value}</div><div class="st">${String(s.state||'').split(' · ')[0]}</div></div></div>`; }).join('');
  renderEarly(); renderRightNow(); };

/* ---------- 9. ledger pulse (left) ---------- */
function renderPulse(){ const dd=val('daily'), T=trends(); const g=Q('#pulseGrid'); if(!g) return;
  const tiles=[['New accounts / day','accounts_created',T.newAcc,'#4fe08c'],['XRP burned / day','fee_total',T.burn,'#ff7a3d'],['Payments / day','payments_count',T.payments,'#36e2cf'],['Active accounts / day','active_accounts',T.active,'#4aa8ff']];
  const last=dd&&dd[dd.length-1];
  g.innerHTML=tiles.map(([n,k,tr,c],i)=>`<div class="pt" title="Source: XRPSCAN daily metrics${D.daily?' · fetched '+fT(D.daily.t):''}${last?' · last full day '+fD(last.t):''}"><div class="pk">${n} ${badge(tr)}</div><div class="pv" style="color:${c}">${last?fN(last[k],k==='fee_total'?1:0):'—'}</div><canvas id="pt${i}" class="spark"></canvas></div>`).join('');
  if(dd){ const tail=dd.slice(-90); tiles.forEach(([n,k,tr,c],i)=>chart(Q('#pt'+i),[{data:tail.map(x=>[x.t,x[k]]),color:c,fill:c+'33'}],{spark:1,yfmt:v=>fN(v,0),tip:p=>fN(p[1],1)})); } }
function renderPulseLive(){ const el=Q('#pulseLive'); if(!el) return; const tx=rate(R.txs), b=rate(R.burn), a=rate(R.acct);
  const it=(n,v,u,c)=>`<div class="pl"><div class="plv" style="color:${c}">${v}</div><div class="plk">${n}<br><span>${u}</span></div></div>`;
  el.innerHTML=it('transactions',tx!=null?(tx/60).toFixed(1):'—','per second','#e6eef8')+it('XRP burned',b!=null?b.toFixed(3):'—','per minute','#ff7a3d')+it('new accounts',a!=null?a.toFixed(1):'—','per minute','#4fe08c')+
    it('ledger',R.ledger?'#'+R.ledger.idx.toLocaleString():'—',R.ledger&&R.ledger.close?R.ledger.close+'s close':'live','#36e2cf'); }

/* ---------- 10. early warning: approaching thresholds ---------- */
function approaching(){ const I=indicators(), out=[]; const add=(key,name,prox,now,target,unit,dir)=>{ if(prox==null||!isFinite(prox)) return; out.push({key,name,prox:Math.max(0,Math.min(1,prox)),now,target,unit,dir}); };
  if(I){ const r=I.rsi; if(r>=50) add('rsi','RSI → 70 overbought',(r-50)/20,r.toFixed(1),70,'',r>=70?'crossed':''); else add('rsi','RSI → 30 oversold',(50-r)/20,r.toFixed(1),30,'',r<=30?'crossed':'');
    const gap=I.ma200?(I.ma50/I.ma200-1)*100:null; if(gap!=null) add('cross',gap>0?'50-day → death cross':'50-day → golden cross',1-Math.abs(gap)/10,fPx(I.ma50),fPx(I.ma200),'','');
    if(I.bbPct!=null) add('bbw','Volatility squeeze (bands → 10th pct)',(100-I.bbPct)/90,I.bbPct.toFixed(0)+'th pct','10th pct','',I.bbPct<=10?'crossed':'');
    if(I.volRatio!=null) add('volume','Volume → 2× its 30-day average',I.volRatio/2,I.volRatio.toFixed(2)+'×','2×','',I.volRatio>=2?'crossed':''); }
  const fg=val('fng'); if(fg&&fg[0]){ const v=fg[0].v; add('fng',v>=50?'Fear & Greed → 75 extreme greed':'Fear & Greed → 25 extreme fear',Math.abs(v-50)/25,v,v>=50?75:25,'',(v>=75||v<=25)?'crossed':''); }
  const f=val('fundOkx'); if(f!=null) add('funding',f>=0?'Funding → crowded longs (0.10%)':'Funding → crowded shorts (−0.10%)',Math.abs(f)/0.001,(f*100).toFixed(4)+'%',(f>=0?'':'−')+'0.10%','',Math.abs(f)>=0.001?'crossed':'');
  const c=calcXrpn(); if(c.mnav) add('xrpn_nav','XRPN mNAV → 1.0 (premium ↔ discount)',1-Math.abs(c.mnav-1)/0.3,c.mnav.toFixed(2)+'×','1.00×','','');
  return out.sort((a,b)=>b.prox-a.prox); }
function renderEarly(){ const el=Q('#earlyList'); if(!el) return; const L=approaching().slice(0,4);
  el.innerHTML=L.length?L.map(a=>{ const pct=Math.round(a.prox*100); const st=a.dir==='crossed'?'crossed':pct>=75?'approaching':pct>=50?'building':'far';
    return `<div class="ew ${st}" title="${esc(a.name+': now '+a.now+', threshold '+a.target+'. Proximity = how close the reading is to the threshold. Conditions, not certainties.')}"><div class="ewn"><span>${esc(a.name)}</span><b>${st==='crossed'?'CROSSED':st==='approaching'?'APPROACHING':pct+'%'}</b></div>
      <div class="ewbar"><i style="width:${pct}%"></i>${[25,50,75].map(x=>`<u style="left:${x}%"></u>`).join('')}</div><div class="ews">now ${esc(String(a.now))} · threshold ${esc(String(a.target))}</div></div>`; }).join(''):'<div class="hint">Waiting for indicator data…</div>'; }

/* ---------- 11. RIGHT NOW: most significant live event ---------- */
function candidates(){ const nowT=Date.now(), out=[]; const dec=t=>Math.exp(-(nowT-t)/(2*3600e3));
  LS.get('log',[]).filter(x=>nowT-x.t<12*3600e3).forEach(x=>out.push({key:x.key,t:x.t,title:x.name+(x.changed?' · '+x.changed:''),sub:x.joke||x.memeLabel||'',level:x.level||1,score:(x.level||1)*30*(/^(xm_|dtcc_|8k_)/.test(x.key)?1.2:1)*dec(x.t),meme:x.meme,link:x.link}));
  LS.get('whales',[]).filter(w=>nowT-w.t<12*3600e3).forEach(w=>out.push({key:'w'+w.hash,t:w.t,title:`🐋 ${fN(w.xrp)} XRP whale payment`,sub:`${nm(w.from)} → ${nm(w.to)}`,level:w.xrp>=1e8?3:w.xrp>=1e7?2:1,score:(10+12*Math.log10(w.xrp/1e6))*0.7*dec(w.t),meme:'whale',link:'https://xrpscan.com/tx/'+w.hash}));
  LS.get('feed',[]).filter(e=>e.kind==='rlusd'&&nowT-e.t<12*3600e3).forEach(e=>out.push({key:'r'+e.hash,t:e.t,title:e.text,sub:`${nm(e.from)} → ${nm(e.to)} · RLUSD routed through XRP = direct XRP demand`,level:1,score:(20+4*Math.log10(Math.max(1,+(String(e.text).match(/[\d.]+/)||[1])[0])))*dec(e.t),meme:'chain',link:'https://xrpscan.com/tx/'+e.hash}));
  LS.get('rlx',[]).filter(e=>nowT-e.t<12*3600e3&&e.amt).forEach(e=>out.push({key:'x'+e.hash,t:e.t,title:e.text,sub:'RLUSD supply on the XRP Ledger changed',level:e.level,score:(8+6*Math.log10(e.amt/1e5))*dec(e.t),meme:'vault',link:'https://xrpscan.com/tx/'+e.hash}));
  approaching().filter(a=>a.prox>=0.85&&a.dir!=='crossed').forEach(a=>out.push({key:'a'+a.key,t:nowT,title:'Approaching: '+a.name,sub:`now ${a.now} · threshold ${a.target} · ${Math.round(a.prox*100)}% of the way`,level:1,score:22*a.prox,meme:'detective',live:1}));
  return out.sort((a,b)=>b.score-a.score); }
function renderRightNow(){ const c=candidates()[0]; const b=Q('#rnBody'); if(!b) return;
  if(!c){ Q('#rnTitle').textContent='All quiet on the ledger'; Q('#rnSub').textContent='No alarm, whale or RLUSD conversion in the last 12 hours that this page saw. Streaming live.'; Q('#rnIcon').innerHTML=Memes.render('calm',''); R.rnCur=null; return; }
  if(R.rnKey!==c.key){ R.rnKey=c.key; b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop'); Q('#rnIcon').innerHTML=Memes.render(c.meme||'radio',''); }
  b.className='rn-body l'+(c.level||0)+(b.classList.contains('pop')?' pop':''); Q('#rnTitle').innerHTML=esc(c.title)+(c.link?` <a href="${esc(c.link)}" target="_blank" rel="noopener">open</a>`:''); Q('#rnSub').textContent=c.sub; R.rnCur=c; tickRN(); }
function tickRN(){ const c=R.rnCur; if(!c){ Q('#rnClock').textContent=fTime(Date.now())+' ET'; Q('#rnAgo').textContent='live'; return; }
  const s=Math.max(0,Math.round((Date.now()-c.t)/1000)); Q('#rnClock').textContent=c.live?'now':new Date(c.t).toLocaleTimeString('en-US',{timeZone:'America/New_York',hour:'numeric',minute:'2-digit',second:'2-digit'})+' ET';
  Q('#rnAgo').textContent=c.live?'live condition':s<60?s+' s ago':s<3600?Math.floor(s/60)+' min ago':Math.floor(s/3600)+' h '+Math.floor(s%3600/60)+' min ago'; }

/* ---------- 12. DEMAND zone: verdict, Ledge, live flow canvas ---------- */
function checkList(){ const T=trends(), dd=val('daily'), last=dd&&dd[dd.length-1], tok=val('rlusdTok'), flow=todayFlow(), rx=val('rlusdXrpl'), re=val('rlusdEth'), coins=val('coins'), amm=val('amm');
  const hits=(val('news_Cross River')||[]).filter(x=>Date.now()-x.t<7*864e5).length;
  return [
    {n:'RLUSD → XRP routing',tr:T.rlDex,v:tok?fUSD(tok.vol24,1):'—',s:`24h RLUSD DEX volume · ${flow.viaXrp} XRP conversions seen today${amm?' · pool '+fN(amm.xrp)+' XRP':''}`,src:'XRPSCAN token stats + XRPL amm_info + live stream',t:(D.rlusdTok||{}).t,c:'#36e2cf'},
    {n:'Payment firms hold XRP',tr:null,v:'n/d',s:'Cross River XRP holdings: not disclosed',src:'No public source',t:null,c:'#56708f',none:1},
    {n:'New accounts',tr:T.newAcc,v:last?fN(last.accounts_created,0):'—',s:'per day · each locks 1 XRP',src:'XRPSCAN daily metrics',t:(D.daily||{}).t,c:'#4fe08c',spark:'accounts_created'},
    {n:'XRP burned',tr:T.burn,v:last?fN(last.fee_total,0):'—',s:`XRP/day · total ${coins?fN(coins.burned,0):'—'}`,src:'XRPSCAN + XRPL total_coins',t:(D.daily||{}).t,c:'#ff7a3d',spark:'fee_total'},
    {n:'RLUSD on XRPL',tr:T.rlShare,v:(rx!=null&&re!=null)?(rx/(rx+re)*100).toFixed(1)+'%':'—',s:`${rx!=null?fN(rx):'—'} XRPL vs ${re!=null?fN(re):'—'} ETH`,src:'XRPL gateway_balances + Ethereum totalSupply',t:(D.rlusdXrpl||{}).t,c:'#9b8cff'},
    {n:'Cross River disclosures',tr:null,v:'none',s:`no volumes published · ${hits} headlines in 7d`,src:'Manual watch + Google News RSS',t:(D['news_Cross River']||{}).t,c:'#56708f',none:1}]; }
function renderChecks(){ const L=checkList(); const g=Q('#chkGrid'); if(!g) return; const dd=val('daily');
  g.innerHTML=L.map((c,i)=>`<div class="ck ${c.none?'none':''}" title="${esc(c.n+' · '+c.s+'\nSource: '+c.src+(c.t?' · '+fT(c.t):''))}"><div class="ckn"><b>${i+1}</b>${esc(c.n)}</div><div class="ckv" style="color:${c.c}">${c.v}</div><div class="cks">${esc(c.s)}</div>${badge(c.tr===undefined?null:c.tr)}${c.spark?`<canvas class="spark" id="ck${i}"></canvas>`:''}</div>`).join('');
  if(dd) L.forEach((c,i)=>{ if(c.spark) chart(Q('#ck'+i),[{data:dd.slice(-60).map(x=>[x.t,x[c.spark]]),color:c.c,fill:c.c+'33'}],{spark:1,yfmt:v=>fN(v,0),tip:p=>fN(p[1],0)}); }); }
function verdict(){ const T=trends(); const core=[T.rlDex,T.ammPool,T.newAcc,T.burn,T.rlXrpl,T.ammLocked]; const known=core.filter(t=>t&&!t.building), up=known.filter(t=>t.dir==='up').length, down=known.filter(t=>t.dir==='down').length;
  if(!known.length) return {w:'READING…',c:'#8197b3',s:'not enough history yet'};
  if(up>=Math.ceil(known.length*0.6)) return {w:'YES · MECHANICS MOVING',c:'#4fe08c',s:`${up} of ${known.length} demand checks rising`};
  if(up>=2) return {w:'MIXED',c:'#ffb547',s:`${up} rising · ${down} falling of ${known.length}`};
  return {w:'NOT YET',c:'#ff4d6d',s:`${up} of ${known.length} demand checks rising · headlines, not mechanics`}; }
function renderDemand(){ const v=verdict(); const t=Q('#dzTitle'); if(!t) return; if(t.textContent!==v.w){ t.classList.remove('pop'); void t.offsetWidth; t.classList.add('pop'); }
  t.textContent=v.w; t.style.color=v.c; Q('#dzScore').textContent=v.s; Q('#dzTitle').title=Q('#vText')?Q('#vText').textContent:''; renderChecks(); }
const _rb=window.renderBanner; window.renderBanner=function(flash){ _rb(flash); const st=Q('#alarmStage').textContent, ttl=Q('#alarmTitle').textContent;
  const art=Q('#dzArt'); if(!art) return; const key=st+ttl; if(R.memeKey!==key){ R.memeKey=key; const m=Q('#dzMeme'); m.classList.remove('pop'); void m.offsetWidth; m.classList.add('pop'); art.innerHTML=Q('#alarmMeme').innerHTML; }
  Q('#dzStage').textContent=st; Q('#dzCap').textContent=ttl; Q('#dzMeme').className='dz-meme '+Q('#alarm').className.replace(/\b(alarm|flash)\b/g,'')+(Q('#dzMeme').classList.contains('pop')?' pop':''); Q('#dzMeme').title=Q('#alarmCaption').textContent; renderRightNow(); renderTL(); };
const _rsc=window.renderScore; window.renderScore=function(){ _rsc(); renderDemand(); };

// flow canvas
const cv=()=>Q('#dzCanvas'); let ctx=null, W=0, H=0;
function sizeCanvases(){ window.GeoSize&&GeoSize(); const c=cv(); if(!c) return; W=c.clientWidth; H=c.clientHeight; if(W&&H){ c.width=W; c.height=H; ctx=c.getContext('2d'); } drawTimeline(); }
function nodes(){ const cx=W/2, cy=H*0.56, rx=Math.min(W*0.33,590), ry=H*0.33; const ang=[208,258,282,332,28,152].map(a=>a*Math.PI/180);
  return checkList().map((c,i)=>({...c,x:cx+Math.cos(ang[i])*rx,y:cy+Math.sin(ang[i])*ry})); }
const KIND={conv:{c:'#36e2cf',node:0,dir:1},acct:{c:'#4fe08c',node:2,dir:1},burn:{c:'#ff7a3d',node:3,dir:-1},rl:{c:'#9b8cff',node:4,dir:1}};
function emit(kind,n=1,sign=1){ if(R.particles.length>420) return; for(let i=0;i<n;i++) R.particles.push({kind,u:-Math.random()*0.3,sp:0.006+Math.random()*0.008,off:(Math.random()-.5)*26,sign}); }
let lastF=0; const FPS=30;
function frame(ts){ requestAnimationFrame(frame); if(document.hidden||R.mode!=='flow'||!ctx) return; if(ts-lastF<1000/(window.LITE?8:FPS)) return; lastF=ts;
  const N=nodes(), cx=W/2, cy=H*0.56; const T=trends(); const v=verdict(); ctx.clearRect(0,0,W,H);
  // ambient: live burn + tx rate keep the field alive even between events
  const tr=rate(R.txs); if(tr&&Math.random()<Math.min(.5,tr/6000)) emit('burn',1);
  // links
  N.forEach((n,i)=>{ ctx.beginPath(); ctx.moveTo(n.x,n.y); ctx.quadraticCurveTo((n.x+cx)/2,(n.y+cy)/2-40,cx,cy); ctx.strokeStyle=n.none?'#56708f55':n.c+'40'; ctx.lineWidth=n.none?1:2; ctx.setLineDash(n.none?[6,8]:[]); ctx.stroke(); ctx.setLineDash([]); });
  // particles
  const P=R.particles; for(let i=P.length-1;i>=0;i--){ const p=P[i]; const k=KIND[p.kind]; p.u+=p.sp; if(p.u>1){ P.splice(i,1); continue; } if(p.u<0) continue; const n=N[k.node];
    const dir=k.dir*p.sign; const u=dir>0?p.u:1-p.u; const mx=(n.x+cx)/2, my=(n.y+cy)/2-40; const x=(1-u)*(1-u)*n.x+2*(1-u)*u*mx+u*u*cx, y=(1-u)*(1-u)*n.y+2*(1-u)*u*my+u*u*cy+p.off*Math.sin(u*Math.PI)*0.5;
    ctx.beginPath(); ctx.arc(x,y,p.kind==='rl'?3.2:2.4,0,7); ctx.fillStyle=k.c; ctx.globalAlpha=0.35+0.65*Math.sin(u*Math.PI); ctx.fill(); ctx.globalAlpha=1; }
  // comets (whales)
  for(let i=R.comets.length-1;i>=0;i--){ const c=R.comets[i]; const a=(ts-c.t0)/2600; if(a>1){ R.comets.splice(i,1); continue; } const x=-60+a*(W+120), y=cy-H*0.32+Math.sin(a*Math.PI)*H*0.5; const s=4+c.size*3;
    const g=ctx.createLinearGradient(x-160,y,x,y); g.addColorStop(0,'#ffffff00'); g.addColorStop(1,'#ffffffcc'); ctx.strokeStyle=g; ctx.lineWidth=s; ctx.beginPath(); ctx.moveTo(x-160,y+Math.cos(a*Math.PI)*-30); ctx.lineTo(x,y); ctx.stroke(); ctx.beginPath(); ctx.arc(x,y,s,0,7); ctx.fillStyle='#fff'; ctx.fill(); }
  // core
  const pulse=1+0.05*Math.sin(ts/400); const R0=Math.min(H*0.16,96)*pulse; const gl=ctx.createRadialGradient(cx,cy,R0*0.2,cx,cy,R0*2.4); gl.addColorStop(0,v.c+'88'); gl.addColorStop(1,'#00000000'); ctx.fillStyle=gl; ctx.beginPath(); ctx.arc(cx,cy,R0*2.4,0,7); ctx.fill();
  ctx.beginPath(); ctx.arc(cx,cy,R0,0,7); ctx.fillStyle='#07111d'; ctx.fill(); ctx.lineWidth=4; ctx.strokeStyle=v.c; ctx.stroke();
  ctx.fillStyle='#e6eef8'; ctx.font=`700 ${Math.round(R0*0.62)}px Bahnschrift,Segoe UI,sans-serif`; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText('XRP',cx,cy-R0*0.12);
  const px=val('px'); ctx.font=`600 ${Math.round(R0*0.26)}px Cascadia Mono,Consolas,monospace`; ctx.fillStyle='#36e2cf'; ctx.fillText(px&&px.xrp?fPx(px.xrp):'—',cx,cy+R0*0.42);
  // rings (the six checks)
  N.forEach((n,i)=>{ const r=Math.min(46,H*0.09); const t=n.tr&&!n.tr.building?n.tr:null; const f=t?Math.max(.04,Math.min(1,.5+t.pct/60)):0; const col=!t?'#56708f':t.dir==='up'?'#4fe08c':t.dir==='down'?'#ff4d6d':'#ffb547';
    ctx.beginPath(); ctx.arc(n.x,n.y,r,0,7); ctx.fillStyle='#0a1422ee'; ctx.fill(); ctx.lineWidth=7; ctx.strokeStyle='#1b2a3f'; ctx.stroke();
    if(f){ ctx.beginPath(); ctx.arc(n.x,n.y,r,-Math.PI/2,-Math.PI/2+f*Math.PI*2); ctx.strokeStyle=col; ctx.lineCap='round'; ctx.stroke(); ctx.lineCap='butt'; }
    ctx.fillStyle=n.c==='#56708f'?'#8197b3':n.c; ctx.font=`700 ${Math.round(r*0.42)}px Cascadia Mono,Consolas,monospace`; ctx.fillText(n.v,n.x,n.y-2);
    ctx.fillStyle=col; ctx.font=`600 ${Math.round(r*0.27)}px Cascadia Mono,Consolas,monospace`; ctx.fillText(t?(t.pct>0?'▲ +':t.pct<0?'▼ ':'■ ')+t.pct.toFixed(0)+'%':n.none?'not disclosed':'building',n.x,n.y+r*0.42);
    ctx.fillStyle='#c9d6e6'; ctx.font=`600 ${Math.round(r*0.32)}px Bahnschrift,Segoe UI,sans-serif`; ctx.fillText((i+1)+' · '+n.n.toUpperCase(),n.x,n.y+r+18); }); }
requestAnimationFrame(frame);

/* ---------- 13. WHAT CHANGED timeline ---------- */
const LANES=[['whale','Whales','#ffffff'],['alarm','Alarms','#ff4d6d'],['signal','Signal flips','#ffb547'],['rlusd','RLUSD','#9b8cff'],['xrpn','XRPN','#ffd34d'],['news','News','#4aa8ff'],['xmoney','X Money','#36e2cf']];
function tlEvents(){ const ev=[]; const from=Date.now()-R.tlHours*3600e3;
  LS.get('whales',[]).forEach(w=>ev.push({lane:'whale',t:w.t,lv:w.xrp>=1e8?3:w.xrp>=1e7?2:1,label:`${fN(w.xrp)} XRP · ${nm(w.from)} → ${nm(w.to)}`,link:'https://xrpscan.com/tx/'+w.hash}));
  LS.get('log',[]).forEach(x=>{ if(/^whale_/.test(x.key)) return; const lane=/^xm_/.test(x.key)?'xmoney':/^dtcc_/.test(x.key)?'news':/^(8k_|xrpn_)/.test(x.key)?'xrpn':x.changed?'signal':'alarm'; ev.push({lane,t:x.t,lv:x.level||1,label:x.name+(x.changed?' · '+x.changed:''),link:x.link}); if(x.changed&&x.level>=2) ev.push({lane:'alarm',t:x.t,lv:x.level,label:x.name+' · '+x.changed}); });
  LS.get('rlx',[]).forEach(e=>ev.push({lane:'rlusd',t:e.t,lv:e.level||0,label:e.text,link:e.hash&&'https://xrpscan.com/tx/'+e.hash}));
  LS.get('feed',[]).filter(e=>e.kind==='rlusd').forEach(e=>ev.push({lane:'rlusd',t:e.t,lv:1,label:e.text,link:'https://xrpscan.com/tx/'+e.hash}));
  const s=LS.get('snaps',{}); const days=Object.keys(s).sort(); for(let i=1;i<days.length;i++){ const a=s[days[i-1]].rlusdXrpl, b=s[days[i]].rlusdXrpl; if(a&&b&&Math.abs(b/a-1)>=0.02) ev.push({lane:'rlusd',t:Date.parse(days[i]+'T12:00:00Z'),lv:2,label:`RLUSD on XRPL ${fPct((b/a-1)*100,1)} day over day (${fN(b)})`}); }
  const q=val('xrpn'); if(q&&q.bars) q.bars.forEach((b,i)=>{ if(!i) return; const ch=(b.c/q.bars[i-1].c-1)*100; if(Math.abs(ch)>=5) ev.push({lane:'xrpn',t:b.t+20*3600e3,lv:Math.abs(ch)>=10?2:1,label:`XRPN close ${fPct(ch,1)} ($${b.c.toFixed(2)})`}); });
  NEWS.forEach(n=>(val('news_'+n.tab)||[]).forEach(x=>{ const xm=n.tab==='X Money'; if(xm&&!(/X Money/i.test(x.title)&&/\b(RLUSD|XRP|crypto|stablecoin)/i.test(x.title))) return; ev.push({lane:xm?'xmoney':'news',t:x.t,lv:0,label:`[${n.tab}] ${x.title} · ${x.source||''}`,link:x.link}); }));
  return ev.filter(e=>e.t>=from&&e.t<=Date.now()+6e4); }
let TLV=[];
function drawTimeline(){ const c=Q('#tlCanvas'); if(!c) return; const w=c.clientWidth, h=c.clientHeight; if(!w||!h) return; c.width=w; c.height=h; const g=c.getContext('2d');
  const L0=96, end=Date.now(), start=end-R.tlHours*3600e3, X=t=>L0+(t-start)/(end-start)*(w-L0-14); const lh=(h-22)/LANES.length; g.clearRect(0,0,w,h);
  g.font='11px Cascadia Mono,Consolas,monospace'; g.textBaseline='middle';
  LANES.forEach(([k,n,col],i)=>{ const y=6+lh*i+lh/2; g.fillStyle='#8197b3'; g.textAlign='right'; g.fillText(n,L0-10,y); g.strokeStyle='#1b2a3f'; g.beginPath(); g.moveTo(L0,y); g.lineTo(w-14,y); g.stroke(); });
  const step=R.tlHours<=24?3:R.tlHours<=72?12:24; g.textAlign='center'; g.fillStyle='#56708f';
  for(let t=Math.ceil(start/(step*3600e3))*step*3600e3;t<=end;t+=step*3600e3){ const x=X(t); g.strokeStyle='#1b2a3f80'; g.beginPath(); g.moveTo(x,4); g.lineTo(x,h-18); g.stroke();
    g.fillText(new Date(t).toLocaleString('en-US',{timeZone:'America/New_York',...(step>=24?{month:'short',day:'numeric'}:{hour:'numeric'})}),x,h-8); }
  g.strokeStyle='#36e2cf'; g.beginPath(); g.moveTo(X(end),2); g.lineTo(X(end),h-18); g.stroke();
  TLV=tlEvents().map(e=>{ const li=LANES.findIndex(l=>l[0]===e.lane); return {...e,x:X(e.t),y:6+lh*li+lh/2,r:3+e.lv*1.6,col:LANES[li][2]}; });
  TLV.forEach(e=>{ g.beginPath(); g.arc(e.x,e.y,e.r,0,7); g.fillStyle=e.col; g.globalAlpha=e.lv>=2?1:.75; g.fill(); if(e.lv>=3){ g.strokeStyle='#ff4d6d'; g.lineWidth=2; g.stroke(); g.lineWidth=1; } g.globalAlpha=1; });
  Q('#tlLegend').textContent=`${TLV.length} events · last ${R.tlHours}h · ET`; }
function renderTL(){ drawTimeline(); }
function tlHit(ev){ const c=Q('#tlCanvas'); const r=c.getBoundingClientRect(); const s=r.width/c.width; const x=(ev.clientX-r.left)/s, y=(ev.clientY-r.top)/s; let best=null, bd=12;
  TLV.forEach(e=>{ const d=Math.hypot(e.x-x,e.y-y); if(d<bd){ bd=d; best=e; } }); return {best,x,y,s}; }
function tlInit(){ const c=Q('#tlCanvas'), tip=Q('#tlTip');
  c.addEventListener('mousemove',ev=>{ const {best,x,y}=tlHit(ev); if(!best){ tip.style.display='none'; c.style.cursor=''; return; } c.style.cursor=best.link?'pointer':'';
    tip.style.display='block'; tip.innerHTML=`<b>${fT(best.t)}</b> · ${esc(LANES.find(l=>l[0]===best.lane)[1])}<br>${esc(best.label)}`; tip.style.left=Math.min(x+12,c.width-360)+'px'; tip.style.top=Math.max(0,y-50)+'px'; });
  c.addEventListener('mouseleave',()=>tip.style.display='none'); c.addEventListener('click',ev=>{ const {best}=tlHit(ev); if(best&&best.link) window.open(best.link,'_blank','noopener'); }); }

/* ---------- 14. right-side tickers ---------- */
const _rf=window.renderFeed; window.renderFeed=function(){ _rf(); const L=LS.get('feed',[]).filter(e=>e.kind==='whale');
  Q('#whaleFeed').innerHTML=L.length?L.slice(0,50).map(e=>`<div class="row l${e.level||0}"><span class="tm">${fTime(e.t)}</span><span><b>${esc(e.text)}</b> ${esc(nm(e.from))} → ${esc(nm(e.to))} <a href="https://xrpscan.com/tx/${e.hash}" target="_blank" rel="noopener">tx</a></span></div>`).join(''):'<div class="hint">Listening for payments ≥ 1M XRP…</div>'; renderRlFeed(); };
function renderRlFeed(){ const el=Q('#rlFeed'); if(!el) return; const L=LS.get('feed',[]).filter(e=>e.kind==='rlusd').concat(LS.get('rlx',[])).sort((a,b)=>b.t-a.t).slice(0,50);
  el.innerHTML=L.length?L.map(e=>`<div class="row l${e.level||0} k-${e.kind||'rlusd'}"><span class="tm">${fTime(e.t)}</span><span><b>${esc(e.text)}</b> ${esc(nm(e.from))} → ${esc(e.to==='AMM'?'AMM':nm(e.to))} ${e.hash?`<a href="https://xrpscan.com/tx/${e.hash}" target="_blank" rel="noopener">tx</a>`:''}</span></div>`).join(''):'<div class="hint">Listening for RLUSD↔XRP conversions, mints/redemptions and AMM moves…</div>'; }

/* ---------- 15. go ---------- */
try{ const F=LS.get('feed',[]); const C=F.filter(e=>!(e.kind==='rlusd'&&e.from&&e.from===e.to)); if(C.length!==F.length) LS.set('feed',C); }catch(e){}
build(); tlInit(); renderHealth(); renderPulse(); renderRlFeed(); renderDemand(); renderEarly(); renderRightNow();
try{ renderFeed(); evaluateStates(); }catch(e){}
const _ra=window.renderAll; window.renderAll=function(){ _ra(); renderPulse(); renderDemand(); drawTimeline(); schedFit(); };
setInterval(()=>{ if(document.hidden) return; renderHealth(); renderPulseLive(); tickRN(); },1000);
setInterval(()=>{ if(document.hidden) return; renderRightNow(); drawTimeline(); renderEarly(); },15000);
addEventListener('resize',()=>{ schedFit(); setTimeout(sizeCanvases,400); });
document.fonts&&document.fonts.ready.then(()=>{ fitAll(); sizeCanvases(); });
new MutationObserver(m=>{ if(m.every(r=>{ const t=r.target.nodeType===1?r.target:r.target.parentElement; return t&&t.closest&&t.closest('#rigdiag,#rigInfoBtn,#healthDots,#pulseLive,#rnRow,#tlTip,#tlLegend'); })) return; schedFit(); })
  .observe(Q('#rig'),{childList:true,subtree:true});
new MutationObserver(()=>{ schedFit(); setTimeout(sizeCanvases,450); }).observe(document.body,{attributes:true,attributeFilter:['class']});
setTimeout(()=>{ fitAll(); sizeCanvases(); },50);
})();

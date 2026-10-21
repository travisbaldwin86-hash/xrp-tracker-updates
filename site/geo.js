/* DEMAND RADAR · XRP flow globe (Sim Rig, DEMAND zone, GLOBE mode).
   HONESTY RULES: XRPL transactions carry no location. A flow is placed on the map ONLY when the account
   is labelled by XRPScan's public well-known names list AND that label belongs to a company with a clear
   headquarters country (table below). Everything else is counted as "unattributed", never given a fake
   location. HQ country ≠ where that company's customers are. */
(function(){ 'use strict';
if(new URLSearchParams(location.search).get('layout')!=='rig'||!window.WORLD) return;
const Q=s=>document.querySelector(s);
const GEO_MIN=10000;           // XRP payments at or above this size are classified for the globe
const HQ=[[/^coinbase/i,'US'],[/^ripple\b/i,'US'],[/^evernorth/i,'US'],[/^uphold/i,'US'],[/^kraken/i,'US'],[/^gemini/i,'US'],[/^binance us/i,'US'],[/^robinhood/i,'US'],
  [/^upbit/i,'KR'],[/^bithumb/i,'KR'],[/^korbit/i,'KR'],[/^coinone/i,'KR'],[/^gopax/i,'KR'],
  [/^sbi vc/i,'JP'],[/^bitflyer/i,'JP'],[/^bitbank/i,'JP'],[/^coincheck/i,'JP'],[/^dmm bitcoin/i,'JP'],[/^gmo coin/i,'JP'],[/^decurret/i,'JP'],[/^liquid\b/i,'JP'],[/^ftx japan/i,'JP'],[/^zaif/i,'JP'],
  [/^btc markets/i,'AU'],[/^independent reserve/i,'AU'],[/^coinspot/i,'AU'],[/^zebpay/i,'IN'],[/^wazirx/i,'IN'],[/^coindcx/i,'IN'],[/^bitbns/i,'IN'],
  [/^coins\.ph/i,'PH'],[/^pdax/i,'PH'],[/^bitkub/i,'TH'],[/^indodax/i,'ID'],[/^bitso/i,'MX'],[/^mercado bitcoin/i,'BR'],[/^orionx/i,'CL'],[/^coinsquare/i,'CA'],[/^ndax/i,'CA'],
  [/^bitstamp/i,'LU'],[/^bitpanda/i,'AT'],[/^bitvavo/i,'NL'],[/^firi/i,'NO'],[/^swissborg/i,'CH'],[/^revolut/i,'GB'],[/^luno/i,'GB'],[/^gatehub/i,'GB'],[/^etoro/i,'IL'],
  [/^btcturk/i,'TR'],[/^paribu/i,'TR'],[/^bitlo/i,'TR'],[/^valr/i,'ZA'],[/^altcointrader/i,'ZA'],[/^kuna/i,'UA'],[/^nobitex/i,'IR'],[/^crypto\.com/i,'SG'],[/^bitrue/i,'SG'],[/^bybit/i,'AE']];
const NOHQ=/^(binance(?! us)|htx|huobi|kucoin|okx|okex|gate|mexc|bingx|bitget|coinex|lbank|bitmart|poloniex|hitbtc|deribit|bitfinex|bkex|zb|changenow|simpleswap)\b/i;
const C=WORLD.c; const cname=cc=>(C[cc]||[cc])[0];
function who(addr){ const n=(typeof NAMES!=='undefined'&&NAMES[addr])||null; if(!n) return {n:null}; for(const [re,cc] of HQ) if(re.test(n)) return {n,cc,ent:n.split(' ')[0]}; return {n,nohq:NOHQ.test(n)||true}; }
INFO.globe='GLOBE: XRP payments ≥ '+GEO_MIN.toLocaleString()+' XRP seen live on the XRP Ledger, placed on the map only when the sending and/or receiving account is labelled by XRPScan (public well-known names) as a company with a clear HQ country, e.g. Upbit/Bithumb = South Korea, Bitso = Mexico, Coins.ph = Philippines, Bitstamp = Luxembourg, SBI VC = Japan. Arcs = both sides attributed; arc thickness = XRP amount; orange end = outflow region, cyan end = inflow region. Ledger transactions carry no location, so everything else is counted as UNATTRIBUTED and never given a fake location. Global exchanges with no single HQ (e.g. Binance, OKX) count as unattributed. HQ country is where the company is based, not where its users are. Violet dots = XRPL server nodes per country (XRPScan node list, IP-based geolocation). Only counts what this page saw while open.';
INFO.geotable='Top countries by attributed XRP in/out over the last 24h (payments ≥ '+GEO_MIN.toLocaleString()+' XRP seen live). Exchange HQ country only, so a big number usually means one exchange moving funds, not that country\'s citizens buying or selling.';
INFO.geosurge='Regional surge alarm: fires when a country\'s attributed XRP flow in the last 60 minutes is at least 5× its average hour (over the hours this page has watched in the last 24h, minimum 6 hours) and at least 5M XRP. Often an exchange rebalancing wallets. A condition, not a prediction.';

/* ---------- storage ---------- */
const hourIdx=t=>Math.floor(t/3600e3);
let G=LS.get('geo',null)||{flows:[],hours:{},seen:{}};
const save=()=>{ const cut=Date.now()-7*864e5; G.flows=G.flows.filter(f=>f.t>=cut).slice(-2500); const hc=hourIdx(cut); Object.keys(G.hours).forEach(h=>{ if(+h<hc) delete G.hours[h]; }); Object.keys(G.seen).forEach(h=>{ if(+h<hc) delete G.seen[h]; }); LS.set('geo',G); };
let dirty=false; setInterval(()=>{ if(dirty){ save(); dirty=false; } },15000);
function classify(tx,meta,hash){ if(tx.TransactionType!=='Payment') return; const del=meta.delivered_amount!=null?meta.delivered_amount:(tx.Amount||tx.DeliverMax); if(typeof del!=='string') return;
  const xrp=Number(del)/1e6; if(!(xrp>=GEO_MIN)||tx.Account===tx.Destination) return; const t=Date.now(), h=hourIdx(t); const H=G.hours[h]=G.hours[h]||{n:0,amt:0,un:0,unAmt:0,arc:0,one:0,int:0};
  H.n++; H.amt+=xrp; const a=who(tx.Account), b=who(tx.Destination);
  if(a.cc&&b.cc){ if(a.ent===b.ent){ H.int++; return; } H.arc++; const f={t,a:a.cc,b:b.cc,amt:xrp,an:a.n,bn:b.n,hash,k:'arc'}; G.flows.push(f); live.push({...f,born:performance.now()}); focus(a.cc,b.cc); }
  else if(a.cc||b.cc){ H.one++; G.flows.push({t,a:a.cc||null,b:b.cc||null,amt:xrp,an:a.n,bn:b.n,hash,k:'one'}); pulses.push({cc:a.cc||b.cc,dir:a.cc?'out':'in',born:performance.now(),amt:xrp}); }
  else { H.un++; H.unAmt+=xrp; }
  dirty=true; }
function hookWS(){ const w=ws; if(!w||w.__geo) return; w.__geo=1; w.addEventListener('message',ev=>{ let m; try{ m=JSON.parse(ev.data); }catch(e){ return; } if(m.type!=='transaction'||!m.validated||m.engine_result!=='tesSUCCESS') return; G.seen[hourIdx(Date.now())]=1; classify(m.transaction||m.tx_json||{},m.meta||{},m.hash); }); }
setInterval(hookWS,3000); hookWS();

/* ---------- XRPL nodes per country (XRPScan public node list) ---------- */
let NODES=LS.get('geoNodes',null);
async function loadNodes(){ if(NODES&&Date.now()-NODES.t<30*60e3) return; try{ const a=await fetchJSON('https://api.xrpscan.com/api/v1/nodes',{},30000); const m={}; let un=0; a.forEach(x=>{ if(x.country&&C[x.country]) m[x.country]=(m[x.country]||0)+1; else un++; }); NODES={t:Date.now(),m,un,total:a.length}; LS.set('geoNodes',NODES); }catch(e){ console.warn('nodes',e); } }
loadNodes(); setInterval(loadNodes,30*60e3);

/* ---------- aggregates, table, surge alarm ---------- */
function agg(ms=864e5){ const cut=Date.now()-ms, inn={}, out={}; G.flows.filter(f=>f.t>=cut).forEach(f=>{ if(f.a) out[f.a]=(out[f.a]||0)+f.amt; if(f.b) inn[f.b]=(inn[f.b]||0)+f.amt; });
  const hc=hourIdx(cut); let n=0,un=0,unAmt=0,arc=0,one=0,int=0; Object.entries(G.hours).forEach(([h,H])=>{ if(+h>=hc){ n+=H.n; un+=H.un; unAmt+=H.unAmt; arc+=H.arc; one+=H.one; int+=H.int; } });
  const cc=[...new Set([...Object.keys(inn),...Object.keys(out)])].map(c=>({c,i:inn[c]||0,o:out[c]||0})).sort((x,y)=>(y.i+y.o)-(x.i+x.o)); return {cc,n,un,unAmt,arc,one,int}; }
function renderGeoPanel(){ const el=Q('#geoPanel'); if(!el) return; const A=agg(); const seenH=Object.keys(G.seen).filter(h=>+h>=hourIdx(Date.now()-864e5)).length;
  el.innerHTML=`<div class="gp-k"><span data-info="globe">XRP FLOWS · LAST 24H</span></div>
   <div class="gp-cnt"><div><b>${A.arc}</b><span>attributed arcs</span></div><div><b>${A.one}</b><span>one side attributed</span></div><div class="un"><b>${A.un}</b><span>UNATTRIBUTED · ${fN(A.unAmt)} XRP</span></div></div>
   <div class="gp-sub">${A.n} payments ≥ ${fN(GEO_MIN,0)} XRP classified · ${A.int} internal (same company) · watched ${seenH}h of the last 24h</div>
   <table class="gp-t"><tr><th data-info="geotable">Country (exchange HQ)</th><th>in</th><th>out</th></tr>${A.cc.slice(0,7).map(r=>`<tr><td>${esc(cname(r.c))}</td><td class="in">${fN(r.i)}</td><td class="out">${fN(r.o)}</td></tr>`).join('')||'<tr><td colspan="3" class="hint">No attributed flows yet</td></tr>'}</table>
   <div class="gp-sub"><span data-info="geosurge">Surge alarm</span>: ${seenH>=6?'armed':'arming (needs 6h watched, '+seenH+'h so far)'}${NODES?` · nodes: ${NODES.total} (${NODES.un} no country)`:''}</div>`; }
function checkSurge(){ const nowT=Date.now(), h=hourIdx(nowT); const seen=Object.keys(G.seen).map(Number).filter(x=>x>=h-24&&x<h); if(seen.length<6) return;
  const last=agg(3600e3).cc; last.forEach(r=>{ const amt=r.i+r.o; if(amt<5e6) return; let base=0; seen.forEach(x=>{ G.flows.forEach(f=>{ if(hourIdx(f.t)===x&&(f.a===r.c||f.b===r.c)) base+=f.amt; }); }); base=Math.max(1e5,base/seen.length);
    if(amt>=5*base) fireEvent({key:'geo_'+r.c+'_'+h,name:'Regional surge: '+cname(r.c),level:2,meme:'radio',memeLabel:'SURGE · '+cname(r.c).toUpperCase(),
      joke:`${fN(amt)} XRP of attributed flow touched exchanges headquartered in ${cname(r.c)} in the last hour (in ${fN(r.i)}, out ${fN(r.o)}), ${(amt/base).toFixed(1)}× its usual hour. Often one exchange moving its own wallets.`,src:'XRPL live stream + XRPScan labels',t:nowT}); }); }
setInterval(()=>{ if(!document.hidden){ renderGeoPanel(); checkSurge(); } },20000);

/* ---------- globe rendering (2D canvas orthographic; no WebGL so the sim's GPU is left alone) ---------- */
const live=[], pulses=[]; let lam=-30, lamT=null, phi=18;
function focus(a,b){ const A=C[a], B=C[b]; if(!A||!B) return; let d=B[1]-A[1]; if(d>180) d-=360; if(d<-180) d+=360; lamT=A[1]+d/2; }
let cv, ctx, W=0, H=0;
function size(){ cv=Q('#geoCanvas'); if(!cv) return; W=cv.clientWidth; H=cv.clientHeight; if(W&&H){ cv.width=W; cv.height=H; ctx=cv.getContext('2d'); } }
const rad=Math.PI/180;
function proj(lon,lat,R,cx,cy){ const l=(lon-lam)*rad, p=lat*rad, p0=phi*rad; const cosc=Math.sin(p0)*Math.sin(p)+Math.cos(p0)*Math.cos(p)*Math.cos(l);
  const x=Math.cos(p)*Math.sin(l), y=Math.cos(p0)*Math.sin(p)-Math.sin(p0)*Math.cos(p)*Math.cos(l); return [cx+R*x,cy-R*y,cosc]; }
function slerp(A,B,t){ const a=[Math.cos(A[1]*rad)*Math.cos(A[0]*rad),Math.cos(A[1]*rad)*Math.sin(A[0]*rad),Math.sin(A[1]*rad)], b=[Math.cos(B[1]*rad)*Math.cos(B[0]*rad),Math.cos(B[1]*rad)*Math.sin(B[0]*rad),Math.sin(B[1]*rad)];
  const d=Math.acos(Math.max(-1,Math.min(1,a[0]*b[0]+a[1]*b[1]+a[2]*b[2]))); if(d<1e-6) return A; const s1=Math.sin((1-t)*d)/Math.sin(d), s2=Math.sin(t*d)/Math.sin(d);
  const v=[s1*a[0]+s2*b[0],s1*a[1]+s2*b[1],s1*a[2]+s2*b[2]]; return [Math.atan2(v[1],v[0])/rad,Math.atan2(v[2],Math.hypot(v[0],v[1]))/rad]; }
const ll=cc=>C[cc]?[C[cc][1],C[cc][2]]:null;
let lastF=0, lastT=0; const FPS=20;
function frame(ts){ requestAnimationFrame(frame); if(document.hidden||!window.RigMode||window.RigMode()!=='globe'||!ctx) { lastT=ts; return; } if(ts-lastF<1000/(window.LITE?8:FPS)) return; const dt=Math.min(.2,(ts-(lastT||ts))/1000); lastF=ts; lastT=ts;
  if(lamT!=null){ let d=lamT-lam; d=((d+540)%360)-180; lam+=d*Math.min(1,dt*1.5); if(Math.abs(d)<0.5) lamT=null; } else lam+=4*dt;
  const R=Math.min(H*0.44,W*0.3), cx=W*0.5, cy=H*0.53; ctx.clearRect(0,0,W,H);
  const og=ctx.createRadialGradient(cx-R*0.3,cy-R*0.3,R*0.1,cx,cy,R); og.addColorStop(0,'#10324c'); og.addColorStop(1,'#061524'); ctx.fillStyle=og; ctx.beginPath(); ctx.arc(cx,cy,R,0,7); ctx.fill();
  ctx.strokeStyle='#00f0ff55'; ctx.lineWidth=1.5; ctx.stroke();
  // graticule
  ctx.strokeStyle='#1d3a5530'; ctx.lineWidth=1; for(let lo=-180;lo<180;lo+=30){ ctx.beginPath(); let on=false; for(let la=-90;la<=90;la+=6){ const [x,y,c]=proj(lo,la,R,cx,cy); if(c>0){ on?ctx.lineTo(x,y):ctx.moveTo(x,y); on=true; } else on=false; } ctx.stroke(); }
  for(let la=-60;la<=60;la+=30){ ctx.beginPath(); let on=false; for(let lo=-180;lo<=180;lo+=6){ const [x,y,c]=proj(lo,la,R,cx,cy); if(c>0){ on?ctx.lineTo(x,y):ctx.moveTo(x,y); on=true; } else on=false; } ctx.stroke(); }
  // land
  ctx.fillStyle='#14324a'; ctx.strokeStyle='#00f0ff40'; ctx.lineWidth=0.8;
  for(const poly of WORLD.p){ let any=false; ctx.beginPath(); for(let i=0;i<poly.length;i+=2){ let [x,y,c]=proj(poly[i],poly[i+1],R,cx,cy); if(c>0) any=true; else { const dx=x-cx, dy=y-cy, k=R/Math.max(1e-6,Math.hypot(dx,dy)); x=cx+dx*k; y=cy+dy*k; } i?ctx.lineTo(x,y):ctx.moveTo(x,y); } if(any){ ctx.closePath(); ctx.fill(); ctx.stroke(); } }
  // Ripple partner/licence + sanctions markers (worldwatch.js), glowing
  if(window.WorldMarks){ const tt=performance.now()/1000; for(const mk of WorldMarks()){ const p=mk.ll||ll(mk.cc); if(!p) continue; const [x,y,c]=proj(p[0],p[1],R,cx,cy); if(c<=0) continue; const r=mk.r||5, g=0.55+0.45*Math.sin(tt*2+(mk.ph||0));
    ctx.beginPath(); ctx.arc(x,y,r+6*g,0,7); ctx.fillStyle=mk.col+'22'; ctx.fill(); ctx.beginPath(); ctx.arc(x,y,r,0,7); ctx.fillStyle=mk.col; ctx.fill(); if(mk.ring){ ctx.beginPath(); ctx.arc(x,y,r+4,0,7); ctx.strokeStyle=mk.ring; ctx.lineWidth=2; ctx.stroke(); } } }
  // nodes
  if(NODES) for(const [cc,n] of Object.entries(NODES.m)){ const p=ll(cc); const [x,y,c]=proj(p[0],p[1],R,cx,cy); if(c<=0) continue; ctx.beginPath(); ctx.arc(x,y,1.5+Math.sqrt(n)*0.7,0,7); ctx.fillStyle='#c86bff88'; ctx.fill(); }
  // 24h attributed regions (HQ markers)
  const A=agg(); const mx=Math.max(1,...A.cc.map(r=>r.i+r.o));
  A.cc.slice(0,25).forEach(r=>{ const p=ll(r.c); if(!p) return; const [x,y,c]=proj(p[0],p[1],R,cx,cy); if(c<=0) return; const s=3+9*Math.sqrt((r.i+r.o)/mx);
    ctx.beginPath(); ctx.arc(x,y,s,0,7); ctx.fillStyle=r.i>=r.o?'#00f0ff55':'#ff7a3d55'; ctx.fill(); ctx.strokeStyle=r.i>=r.o?'#00f0ff':'#ff7a3d'; ctx.stroke();
    ctx.fillStyle='#c9d6e6'; ctx.font='600 11px Bahnschrift,Segoe UI,sans-serif'; ctx.textAlign='left'; ctx.fillText(cname(r.c),x+s+3,y+4); });
  // faded arcs of the last 24h (most recent 60)
  const recent=G.flows.filter(f=>f.k==='arc'&&Date.now()-f.t<864e5).slice(-60);
  recent.forEach(f=>drawArc(f,1,0.18,R,cx,cy));
  // live arcs
  for(let i=live.length-1;i>=0;i--){ const f=live[i]; const age=(ts-f.born)/1000; if(age>9){ live.splice(i,1); continue; } drawArc(f,Math.min(1,age/2.5),age<2.5?1:Math.max(0.2,1-(age-2.5)/6.5),R,cx,cy,true); }
  // one-sided pulses
  for(let i=pulses.length-1;i>=0;i--){ const p=pulses[i]; const age=(ts-p.born)/1000; if(age>3){ pulses.splice(i,1); continue; } const q=ll(p.cc); if(!q) continue; const [x,y,c]=proj(q[0],q[1],R,cx,cy); if(c<=0) continue;
    ctx.beginPath(); ctx.arc(x,y,6+age*18,0,7); ctx.strokeStyle=(p.dir==='in'?'#00f0ff':'#ff7a3d')+Math.round((1-age/3)*255).toString(16).padStart(2,'0'); ctx.lineWidth=2; ctx.stroke(); }
}
function drawArc(f,head,alpha,R,cx,cy,glow){ const A=ll(f.a), B=ll(f.b); if(!A||!B) return; const N=40, w=1+Math.max(0,Math.log10(f.amt/GEO_MIN))*1.6; let prev=null;
  for(let i=0;i<=N*head;i++){ const t=i/N; const p=slerp(A,B,t); const [x0,y0,c]=proj(p[0],p[1],R,cx,cy); const lift=1+0.22*Math.sin(Math.PI*t); const x=cx+(x0-cx)*lift, y=cy+(y0-cy)*lift;
    if(prev&&c>-0.1){ ctx.beginPath(); ctx.moveTo(prev[0],prev[1]); ctx.lineTo(x,y); const r=Math.round(255+(54-255)*t), g=Math.round(122+(226-122)*t), b=Math.round(61+(207-61)*t); ctx.strokeStyle=`rgba(${r},${g},${b},${alpha})`; ctx.lineWidth=w; ctx.lineCap='round'; ctx.stroke(); }
    prev=[x,y]; }
  if(glow&&head<1&&prev){ ctx.beginPath(); ctx.arc(prev[0],prev[1],w+3,0,7); ctx.fillStyle='#ffffff'; ctx.fill(); } }
requestAnimationFrame(frame);
window.GeoSize=()=>{ size(); renderGeoPanel(); };
setTimeout(()=>{ size(); renderGeoPanel(); },800); addEventListener('resize',()=>setTimeout(size,500));
})();

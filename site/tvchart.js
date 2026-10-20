/* DEMAND RADAR · TradingView-style price chart. Overlays: SMA 50/200, EMA 20, Bollinger (20,2), VWAP (anchored at the visible range start).
   Sub-panes (synced time axis + crosshair): Volume, RSI (14, Wilder), MACD (12,26,9). Event/signal markers click through to their source.
   Indicators are computed on the FULL history and only then cut to the visible range (no warm-up/lookback errors at the left edge).
   Data: Coinbase Exchange XRP-USD candles (true OHLC + base volume; daily 00:00 UTC bars, hourly for 7D); fallback = CoinGecko closes (line only, no VWAP).
   Verified against TA-Lib 0.6/0.8 on the same closes (see README "Indicator audit"). */
(function(){ 'use strict';
const Q=s=>document.querySelector(s);
const TI=window.TI={};
TI.sma=(a,n)=>{ const o=Array(a.length).fill(null); let s=0; for(let i=0;i<a.length;i++){ s+=a[i]; if(i>=n) s-=a[i-n]; if(i>=n-1) o[i]=s/n; } return o; };
TI.ema=(a,n,start=0)=>{ const o=Array(a.length).fill(null); const k=2/(n+1); let e=null; for(let i=start;i<a.length;i++){ if(a[i]==null) continue; if(i<start+n-1) continue; if(e==null){ let s=0; for(let j=i-n+1;j<=i;j++) s+=a[j]; e=s/n; } else e=a[i]*k+e*(1-k); o[i]=e; } return o; };
TI.rsi=(c,n=14)=>{ const o=Array(c.length).fill(null); if(c.length<=n) return o; let g=0,l=0; for(let i=1;i<=n;i++){ const d=c[i]-c[i-1]; if(d>0) g+=d; else l-=d; } g/=n; l/=n;
  const v=()=>g===0&&l===0?50:l===0?100:100-100/(1+g/l); o[n]=v(); for(let i=n+1;i<c.length;i++){ const d=c[i]-c[i-1]; g=(g*(n-1)+Math.max(d,0))/n; l=(l*(n-1)+Math.max(-d,0))/n; o[i]=v(); } return o; };
// MACD exactly as TA-Lib: both EMAs start at index slow-1 (fast EMA seeded with the SMA of the fast window ending there), signal = EMA9 of MACD
TI.macd=(c,f=12,s=26,g=9)=>{ const ef=Array(c.length).fill(null), es=TI.ema(c,s); const k=2/(f+1); let e=null; for(let i=s-1;i<c.length;i++){ if(e==null){ let t=0; for(let j=i-f+1;j<=i;j++) t+=c[j]; e=t/f; } else e=c[i]*k+e*(1-k); ef[i]=e; }
  const m=c.map((_,i)=>ef[i]!=null&&es[i]!=null?ef[i]-es[i]:null); const sig=TI.ema(m.map(x=>x==null?0:x),g,s-1); const out=m.map((x,i)=>sig[i]==null?null:x); return {macd:out,sig,hist:out.map((x,i)=>x==null?null:x-sig[i])}; };
TI.bb=(c,n=20,k=2)=>{ const mid=TI.sma(c,n), up=Array(c.length).fill(null), lo=Array(c.length).fill(null); for(let i=n-1;i<c.length;i++){ let s=0; for(let j=i-n+1;j<=i;j++) s+=(c[j]-mid[i])**2; const sd=Math.sqrt(s/n); up[i]=mid[i]+k*sd; lo[i]=mid[i]-k*sd; } return {mid,up,lo}; };
TI.vwap=(b,from)=>{ let pv=0,v=0; return b.map((x,i)=>{ if(i<from||x.v==null) return null; pv+=(x.h+x.l+x.c)/3*x.v; v+=x.v; return v?pv/v:null; }); };
const ON=Object.assign({sma50:1,sma200:1,ema20:0,bb:1,vwap:1,vol:1,rsi:1,macd:1,ev:1},LS.get('tvOn',{}));
const LEG=[['sma50','SMA 50','#ffb547'],['sma200','SMA 200','#9b8cff'],['ema20','EMA 20','#4aa8ff'],['bb','Bollinger 20,2','#5f7fa6'],['vwap','VWAP (range)','#ff7ad9'],['vol','Volume','#3b5778'],['rsi','RSI 14','#36e2cf'],['macd','MACD 12,26,9','#4fe08c'],['ev','Events & signals','#ffd34d']];
const C={};  // candle cache
async function candles(g){ const k='c'+g; if(C[k]&&Date.now()-C[k].t<(g===3600?5:15)*60e3) return C[k].b;
  const r=await fetch('https://api.exchange.coinbase.com/products/XRP-USD/candles?granularity='+g); if(!r.ok) throw new Error('Coinbase HTTP '+r.status);
  const a=await r.json(); const b=a.map(x=>({t:x[0]*1000,l:+x[1],h:+x[2],o:+x[3],c:+x[4],v:+x[5]})).sort((p,q)=>p.t-q.t); C[k]={t:Date.now(),b}; return b; }
function fallbackBars(r){ const d=r<=7?val('hourlyPx'):val('dailyPx'); return (d||[]).map(x=>({t:x.t,c:x.c,o:null,h:null,l:null,v:null})); }
function markers(x0,x1){ const P=window.PAT_DATA||{}, out=[]; (P.events||[]).forEach(e=>{ const t=Date.parse(e.d+'T12:00:00-05:00'); out.push({t,label:e.name,c:'#9b8cff',kind:'event'}); });
  (P.signals||[]).filter(s=>s.status!=='rumor').forEach(s=>{ const t=Date.parse(s.d); out.push({t,label:s.title,c:s.status==='confirmed'?'#4fe08c':'#ffb547',url:s.url,kind:s.status}); });
  return out.filter(m=>m.t>=x0); }
let LAST=null;
async function render(){ const r=settings.range; document.querySelectorAll('#rangeSeg button').forEach(b=>b.classList.toggle('on',+b.dataset.r===r));
  const cv=Q('#priceChart'); if(!cv) return; let bars, src;
  try{ bars=await candles(r<=7?3600:86400); src='Coinbase Exchange candles ('+(r<=7?'hourly':'daily, 00:00 UTC')+')'; }catch(e){ bars=fallbackBars(r); src=(r<=7?D.hourlyPx:D.dailyPx)?.src+' (fallback: closes only)'; }
  if(!bars.length){ cv.getContext('2d').clearRect(0,0,cv.width,cv.height); Q('#src-chart').textContent='Price history unavailable'; return; }
  const c=bars.map(b=>b.c), I={sma50:TI.sma(c,50),sma200:TI.sma(c,200),ema20:TI.ema(c,20),bb:TI.bb(c),rsi:TI.rsi(c),macd:TI.macd(c)};
  const cut=Date.now()-r*864e5; let i0=bars.findIndex(b=>b.t>=cut); if(i0<0) i0=0; I.vwap=TI.vwap(bars,i0);
  LAST={bars,I,i0,src}; draw(); renderLegend(); Q('#src-chart').innerHTML=`Source: ${src} · ${bars.length} bars · indicators computed on the full history, then cut to ${r}D · SMA 200 needs 200 bars${bars.length<200+ (bars.length-i0)?' (blank for the first 199 bars of history)':''} · VWAP anchored at the range start · daily bars are UTC days, hourly bars ET`; }
function draw(hx){ const L=LAST; if(!L) return; const cv=Q('#priceChart'); const dpr=devicePixelRatio||1, W=cv.clientWidth, H=cv.clientHeight; if(!W||!H) return;
  cv.width=W*dpr; cv.height=H*dpr; const g=cv.getContext('2d'); g.setTransform(dpr,0,0,dpr,0,0); g.clearRect(0,0,W,H);
  const B=L.bars.slice(L.i0), off=L.i0, n=B.length, pad={l:58,r:12,t:8}; const subs=['vol','rsi','macd'].filter(k=>ON[k]); const sh=Math.max(46,Math.min(90,H*0.16));
  const mainH=H-pad.t-18-subs.length*(sh+6); const x0=B[0].t, x1=B[n-1].t, xr=x1+((x1-x0)||1)*0.07, X=t=>pad.l+(t-x0)/((xr-x0)||1)*(W-pad.l-pad.r), bw=Math.max(1,(W-pad.l-pad.r)/n*0.7);
  const sl=a=>a.slice(off); const ohlc=B[0].h!=null;
  // main pane range
  let ys=[]; B.forEach(b=>{ ys.push(ohlc?b.h:b.c, ohlc?b.l:b.c); }); if(ON.bb){ sl(L.I.bb.up).forEach(v=>v!=null&&ys.push(v)); sl(L.I.bb.lo).forEach(v=>v!=null&&ys.push(v)); }
  ['sma50','sma200','ema20','vwap'].forEach(k=>{ if(ON[k]) sl(L.I[k]).forEach(v=>v!=null&&ys.push(v)); });
  let y0=Math.min(...ys), y1=Math.max(...ys); const yp=(y1-y0)*0.06||0.01; y0-=yp; y1+=yp; const top=pad.t, Y=v=>top+(1-(v-y0)/(y1-y0))*mainH;
  g.font='11px Cascadia Mono,Consolas,monospace'; g.textBaseline='middle';
  const grid=(t0,h,lo,hi,fmt,steps=4)=>{ for(let i=0;i<=steps;i++){ const v=lo+(hi-lo)*i/steps, y=t0+(1-i/steps)*h; g.strokeStyle='#1b2a3f'; g.beginPath(); g.moveTo(pad.l,y); g.lineTo(W-pad.r,y); g.stroke(); g.fillStyle='#56708f'; g.textAlign='right'; g.fillText(fmt(v),pad.l-5,y); } };
  grid(top,mainH,y0,y1,v=>'$'+v.toFixed(v<10?3:1));
  const line=(arr,col,w=1.3,dash,Yf=Y)=>{ g.strokeStyle=col; g.lineWidth=w; g.setLineDash(dash||[]); g.beginPath(); let s=0; arr.forEach((v,i)=>{ if(v==null){ s=0; return; } const x=X(B[i].t), y=Yf(v); s?g.lineTo(x,y):g.moveTo(x,y); s=1; }); g.stroke(); g.setLineDash([]); };
  if(ON.bb){ const up=sl(L.I.bb.up), lo=sl(L.I.bb.lo); g.fillStyle='#4aa8ff14'; g.beginPath(); let st=0; up.forEach((v,i)=>{ if(v==null) return; const x=X(B[i].t); st?g.lineTo(x,Y(v)):g.moveTo(x,Y(v)); st=1; }); for(let i=n-1;i>=0;i--){ if(lo[i]!=null) g.lineTo(X(B[i].t),Y(lo[i])); } g.closePath(); g.fill(); line(up,'#5f7fa6',1); line(lo,'#5f7fa6',1); line(sl(L.I.bb.mid),'#5f7fa688',1,[2,3]); }
  if(ohlc) B.forEach(b=>{ const x=X(b.t), up=b.c>=b.o; g.strokeStyle=g.fillStyle=up?'#4fe08c':'#ff4d6d'; g.beginPath(); g.moveTo(x,Y(b.h)); g.lineTo(x,Y(b.l)); g.stroke(); const yA=Y(Math.max(b.o,b.c)), yB=Y(Math.min(b.o,b.c)); g.fillRect(x-bw/2,yA,bw,Math.max(1,yB-yA)); });
  else line(B.map(b=>b.c),'#36e2cf',2);
  if(ON.sma50) line(sl(L.I.sma50),'#ffb547'); if(ON.sma200) line(sl(L.I.sma200),'#9b8cff',1.3,[5,4]); if(ON.ema20) line(sl(L.I.ema20),'#4aa8ff'); if(ON.vwap&&ohlc) line(sl(L.I.vwap),'#ff7ad9',1.3,[1,2]);
  // markers
  L.mk=[]; if(ON.ev) markers(x0,x1).forEach((m,k)=>{ if(m.t>xr) return; const x=X(m.t); g.strokeStyle=m.c+'aa'; g.setLineDash([2,3]); g.beginPath(); g.moveTo(x,top); g.lineTo(x,top+mainH); g.stroke(); g.setLineDash([]); const y=top+10+(k%5)*11; g.fillStyle=m.c; g.beginPath(); if(m.kind==='event'){ g.moveTo(x,y-5); g.lineTo(x+5,y); g.lineTo(x,y+5); g.lineTo(x-5,y); } else g.arc(x,y,4,0,7); g.fill(); L.mk.push({...m,x,y}); });
  // sub panes
  let yb=top+mainH+6; L.panes=[];
  subs.forEach(k=>{ const t0=yb, h=sh; g.strokeStyle='#23406499'; g.strokeRect(pad.l,t0,W-pad.l-pad.r,h); g.fillStyle='#8197b3'; g.textAlign='left';
    if(k==='vol'){ const v=B.map(b=>b.v||0), mx=Math.max(...v)||1; B.forEach((b,i)=>{ const x=X(b.t), hh=(v[i]/mx)*(h-4); g.fillStyle=(b.o==null||b.c>=b.o)?'#4fe08c66':'#ff4d6d66'; g.fillRect(x-bw/2,t0+h-hh,bw,hh); }); const ma=sl(TI.sma(L.bars.map(b=>b.v||0),20)); line(ma,'#ffb547',1,null,v=>t0+h-(v/mx)*(h-4)); g.fillStyle='#8197b3'; g.fillText('VOL (XRP) · 20-bar avg',pad.l+4,t0+8); g.textAlign='right'; g.fillText(fN(mx,0),pad.l-5,t0+6); }
    if(k==='rsi'){ const Yr=v=>t0+(1-v/100)*h; [30,50,70].forEach(v=>{ g.strokeStyle=v===50?'#1b2a3f':'#ffb54755'; g.setLineDash(v===50?[]:[3,3]); g.beginPath(); g.moveTo(pad.l,Yr(v)); g.lineTo(W-pad.r,Yr(v)); g.stroke(); g.setLineDash([]); g.fillStyle='#56708f'; g.textAlign='right'; g.fillText(v,pad.l-5,Yr(v)); }); line(sl(L.I.rsi),'#36e2cf',1.4,null,Yr); g.fillStyle='#8197b3'; g.textAlign='left'; g.fillText('RSI 14 (Wilder)',pad.l+4,t0+8); }
    if(k==='macd'){ const M=sl(L.I.macd.macd), S=sl(L.I.macd.sig), Hh=sl(L.I.macd.hist); const all=[...M,...S,...Hh].filter(v=>v!=null); const m=Math.max(1e-9,...all.map(Math.abs)); const Ym=v=>t0+h/2-(v/m)*(h/2-3);
      Hh.forEach((v,i)=>{ if(v==null) return; const x=X(B[i].t); g.fillStyle=v>=0?'#4fe08c88':'#ff4d6d88'; g.fillRect(x-bw/2,Math.min(Ym(0),Ym(v)),bw,Math.abs(Ym(v)-Ym(0))); }); line(M,'#4fe08c',1.3,null,Ym); line(S,'#ff7a3d',1.2,null,Ym); g.fillStyle='#8197b3'; g.textAlign='left'; g.fillText('MACD 12,26,9 · signal · histogram',pad.l+4,t0+8); }
    L.panes.push({k,t0,h}); yb+=h+6; });
  // time axis
  const daily=(B[1]&&B[1].t-B[0].t)>=864e5*0.9; g.fillStyle='#56708f'; const span=x1-x0; for(let i=0;i<=4;i++){ const t=x0+span*i/4; g.textAlign=i===0?'left':'center'; g.fillText(span<3*864e5?fTime(t):new Date(t).toLocaleDateString('en-US',{timeZone:daily?'UTC':'America/New_York',month:'short',day:'numeric'}),X(t),H-8); }
  if(xr>x1){ g.strokeStyle='#36e2cf55'; g.setLineDash([2,2]); g.beginPath(); g.moveTo(X(x1),top); g.lineTo(X(x1),top+mainH); g.stroke(); g.setLineDash([]); g.fillStyle='#36e2cf'; g.textAlign='left'; g.fillText('upcoming →',X(x1)+3,top+mainH-6); }
  // crosshair
  if(hx!=null){ let bi=0; B.forEach((b,i)=>{ if(Math.abs(X(b.t)-hx)<Math.abs(X(B[bi].t)-hx)) bi=i; }); const b=B[bi], gi=bi+off, x=X(b.t); g.strokeStyle='#ffffff40'; g.beginPath(); g.moveTo(x,top); g.lineTo(x,H-18); g.stroke();
    const f=v=>v==null?'—':v.toFixed(4); const parts=[daily?new Date(b.t).toLocaleDateString('en-US',{timeZone:'UTC',month:'short',day:'numeric',year:'numeric'})+' (UTC day bar)':fT(b.t), ohlc?`O ${f(b.o)} H ${f(b.h)} L ${f(b.l)} C ${f(b.c)}`:`C ${f(b.c)}`];
    if(ON.sma50) parts.push('SMA50 '+f(L.I.sma50[gi])); if(ON.sma200) parts.push('SMA200 '+f(L.I.sma200[gi])); if(ON.ema20) parts.push('EMA20 '+f(L.I.ema20[gi])); if(ON.bb) parts.push(`BB ${f(L.I.bb.lo[gi])}–${f(L.I.bb.up[gi])}`); if(ON.vwap&&ohlc) parts.push('VWAP '+f(L.I.vwap[gi]));
    if(ON.rsi) parts.push('RSI '+(L.I.rsi[gi]==null?'—':L.I.rsi[gi].toFixed(1))); if(ON.macd) parts.push('MACD '+f(L.I.macd.macd[gi])+' / '+f(L.I.macd.sig[gi])); if(ON.vol&&b.v!=null) parts.push('Vol '+fN(b.v,0));
    const near=(L.mk||[]).find(m=>Math.abs(m.x-hx)<5); if(near) parts.push('▶ '+near.label.slice(0,70)+(near.url?' (click)':''));
    const txt=parts.join('  ·  '); g.font='11px Cascadia Mono,Consolas,monospace'; const w=Math.min(W-pad.l-pad.r,g.measureText(txt).width+12); g.fillStyle='#0b1422ee'; g.fillRect(pad.l,top,w,18); g.strokeStyle='#36e2cf'; g.strokeRect(pad.l,top,w,18); g.fillStyle='#e6eef8'; g.textAlign='left'; g.fillText(txt,pad.l+6,top+9,w-12); } }
function renderLegend(){ let el=Q('#tvLegend'); if(!el){ el=document.createElement('div'); el.id='tvLegend'; el.className='tv-leg'; Q('#priceChart').parentElement.after(el); }
  el.innerHTML=LEG.map(([k,n,c])=>`<button data-k="${k}" class="${ON[k]?'on':''}" style="--c:${c}"><i></i>${n}</button>`).join('')+'<span class="hint">click to toggle · hover for values · ◆ events · ● signals (click opens source)</span>';
  el.querySelectorAll('button').forEach(b=>b.onclick=()=>{ ON[b.dataset.k]=ON[b.dataset.k]?0:1; LS.set('tvOn',ON); draw(); renderLegend(); }); }
function bind(){ const cv=Q('#priceChart'); if(!cv||cv._tv) return; cv._tv=1; cv._bound=1; // stop the old hover handler
  cv.addEventListener('mousemove',e=>{ const r=cv.getBoundingClientRect(); const x=e.clientX-r.left, y=e.clientY-r.top; draw(x); cv.style.cursor=(LAST&&LAST.mk||[]).some(m=>m.url&&Math.abs(m.x-x)<6&&Math.abs(m.y-y)<8)?'pointer':'crosshair'; });
  cv.addEventListener('mouseleave',()=>draw()); cv.addEventListener('click',e=>{ const r=cv.getBoundingClientRect(); const x=e.clientX-r.left, y=e.clientY-r.top; const m=(LAST&&LAST.mk||[]).find(m=>m.url&&Math.abs(m.x-x)<6&&Math.abs(m.y-y)<8)||(LAST&&LAST.mk||[]).find(m=>m.url&&Math.abs(m.x-x)<4); if(m) window.open(m.url,'_blank','noopener'); }); }
window.renderChart=function(){ bind(); render().catch(e=>console.warn('tvchart',e)); };
window.TVChart={render,draw,get last(){return LAST;},ON};
setInterval(()=>{ if(!document.hidden) window.renderChart(); },5*60e3);
})();

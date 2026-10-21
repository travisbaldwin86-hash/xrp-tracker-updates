/* DEMAND RADAR · PATTERNS: speculation + pattern recognition. Watch, click, read.
   Data: data/signals.js (window.PAT_DATA, generated from data/signals.json). Refreshes on its own from the update host
   (see README "Signal log format" / update-config.json). Everything is SPECULATION, NOT ADVICE. */
(function(){ 'use strict';
const Q=s=>document.querySelector(s), QA=s=>[...document.querySelectorAll(s)];
const E=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const RIPPLE_LINKED=/^@(Ripple|XRP|XRPLF|RippleXDev|bgarlinghouse|JoelKatz|s_alderoty|MonicaLongSF|ashgoblue|evernorthxrp|RippleSwell)$/i;
const EXECS=/^@(bgarlinghouse|JoelKatz|s_alderoty|MonicaLongSF|ashgoblue|XRP|Ripple)$/i;
let DATA=window.PAT_DATA||{signals:[],watchlist:{},events:[],teasers:[]};
let sel=null; // {k:'theme'|'entity'|'pair', v}
const UW=()=>LS.get('patWatch',null); // optional user edits
const watch=()=>{ const w={...(DATA.watchlist||{})}; const u=UW(); if(u) Object.keys(u).forEach(k=>w[k]=u[k]); return w; };
const tms=s=>Date.parse(s.d.length<=10?s.d+'T12:00':s.d);
function match(s){ const t=(s.title+' '+(s.note||'')+' '+(s.entities||[]).join(' ')).toLowerCase(); const hits=[], cats=new Set();
  Object.entries(watch()).forEach(([c,terms])=>terms.forEach(k=>{ if(k&&t.includes(k.toLowerCase())){ hits.push(k); cats.add(c); } })); return {hits:[...new Set(hits)],cats:[...cats]}; }
function enrich(){ return (DATA.signals||[]).map((s,i)=>({...s,i,t:tms(s),...match(s)})).filter(s=>!isNaN(s.t)).sort((a,b)=>b.t-a.t); }
const W=w=>({confirmed:1,speculation:0.6,rumor:0.35}[w]||0.5);
/* ---- detection ---- */
function detect(S){ const now=Math.max(Date.now(),...S.map(s=>s.t)); const D=864e5; const out=[];
  // 1 keyword spikes: last 3 days vs prior 27-day daily baseline
  const kw={}; S.forEach(s=>s.hits.forEach(h=>{ const o=kw[h]||(kw[h]={r:0,b:0,sig:[]}); if(now-s.t<=3*D){o.r++;o.sig.push(s.i);} else if(now-s.t<=30*D) o.b++; }));
  Object.entries(kw).forEach(([k,o])=>{ const base=o.b/27*3; if(o.r>=3&&o.r>=2*Math.max(base,0.5)) out.push({kind:'Keyword spike',txt:`"${k}": ${o.r} mentions in 3 days vs ~${base.toFixed(1)} expected`,sig:o.sig,w:o.r}); });
  // 2 same entity, several Ripple-linked accounts (7 days)
  const ent={}; S.filter(s=>now-s.t<=7*D).forEach(s=>(s.entities||[]).forEach(e=>{ const o=ent[e]||(ent[e]={acc:new Set(),rl:new Set(),sig:[]}); o.acc.add(s.acct); if(RIPPLE_LINKED.test(s.acct)) o.rl.add(s.acct); o.sig.push(s.i); }));
  Object.entries(ent).forEach(([e,o])=>{ if(o.rl.size>=2) out.push({kind:'Ripple-linked convergence',txt:`${e}: mentioned by ${o.rl.size} Ripple-linked accounts (${[...o.rl].join(', ')})`,sig:o.sig,w:o.rl.size*2}); });
  // 3 execs engaging new accounts: entity first seen in last 7 days and touched by exec/official
  const first={}; [...S].reverse().forEach(s=>(s.entities||[]).forEach(e=>{ if(!(e in first)) first[e]=s.t; }));
  const eng={}; S.filter(s=>EXECS.test(s.acct)&&now-s.t<=7*D).forEach(s=>(s.entities||[]).forEach(e=>{ if(now-first[e]<=7*D&&!/Ripple|XRP account|XRPL Foundation/.test(e)&&!EXECS.test('@'+e)) (eng[e]=eng[e]||[]).push(s.i); }));
  Object.entries(eng).forEach(([e,ix])=>out.push({kind:'Official engagement with newcomer',txt:`${e}: newly seen, engaged by an official/exec account`,sig:ix,w:2}));
  // 4 timing clusters near events (±3 days)
  (DATA.events||[]).forEach(ev=>{ const et=Date.parse(ev.d+'T12:00'); const near=S.filter(s=>Math.abs(s.t-et)<=3*D); const up=et>=now-D&&et-now<=10*D;
    if(near.length>=3||up) out.push({kind:'Event timing',txt:`${ev.name} (${ev.d})${up?' · upcoming':''}: ${near.length} signals within ±3 days`,sig:near.map(s=>s.i),w:near.length+(up?1:0)}); });
  // 5 whale / exchange
  const wh=S.filter(s=>now-s.t<=7*D&&s.cats.includes('Exchanges / whales')); if(wh.length) out.push({kind:'Whale / exchange chatter',txt:`${wh.length} exchange/whale mentions in 7 days`,sig:wh.map(s=>s.i),w:wh.length});
  // 6 teasers
  const te=S.filter(s=>now-s.t<=7*D&&s.cats.includes('Teasers')); if(te.length) out.push({kind:'Teasers',txt:`${te.length} teaser-style posts (soon / 👀 / "something special") in 7 days`,sig:te.map(s=>s.i),w:te.length});
  return out.sort((a,b)=>b.w-a.w); }
/* ---- heat per theme ---- */
function heat(S){ const now=Math.max(Date.now(),...S.map(s=>s.t)); const D=864e5; const th={};
  S.forEach(s=>{ const o=th[s.theme]||(th[s.theme]={n7:0,n30:0,c:0,sp:0,rl:new Set(),sig:[],sc:0}); const a=(now-s.t)/D; if(a>30) return;
    const decay=Math.exp(-a/5); o.sc+=W(s.status)*decay*(RIPPLE_LINKED.test(s.acct)?1.5:1); if(a<=7){o.n7++; o.sig.push(s.i);} o.n30++; s.status==='confirmed'?o.c++:o.sp++; if(RIPPLE_LINKED.test(s.acct)) o.rl.add(s.acct); });
  const mx=Math.max(1,...Object.values(th).map(o=>o.sc));
  return Object.entries(th).map(([k,o])=>({k,...o,h:Math.round(o.sc/mx*100),why:`${o.n7} signals in 7 days (${o.c} confirmed, ${o.sp} speculation/rumor)${o.rl.size?`, ${o.rl.size} Ripple-linked account${o.rl.size>1?'s':''}`:''}. Recent and official posts weigh more.`})).sort((a,b)=>b.h-a.h); }
/* ---- connections ---- */
function pairs(S){ const p={}; S.forEach(s=>{ const e=[...new Set(s.entities||[])]; for(let i=0;i<e.length;i++) for(let j=i+1;j<e.length;j++){ const k=[e[i],e[j]].sort().join(' ↔ '); (p[k]=p[k]||[]).push(s.i); } }); return Object.entries(p).sort((a,b)=>b[1].length-a[1].length); }
/* ---- render ---- */
const pill=st=>st==='confirmed'?'<span class="pill g">CONFIRMED</span>':st==='rumor'?'<span class="pill rumor">RUMOR</span>':'<span class="pill a">SPECULATION</span>';
const day=t=>new Date(t).toLocaleString('en-US',{timeZone:'America/New_York',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})+' ET';
function row(s){ return `<a class="pt-sig" href="${E(s.url)}" target="_blank" rel="noopener">${pill(s.status)} <b>${E(s.title)}</b><em>${E(s.acct)} · ${day(s.t)}${s.hits.length?' · '+E(s.hits.slice(0,5).join(', ')):''}${s.note?' · '+E(s.note):''}</em></a>`; }
function filterSel(S){ if(!sel) return S; if(sel.k==='theme') return S.filter(s=>s.theme===sel.v); if(sel.k==='entity') return S.filter(s=>(s.entities||[]).includes(sel.v)); if(sel.k==='ids') return S.filter(s=>sel.v.includes(s.i)); return S; }
function timeline(S){ const now=Math.max(Date.now(),...S.map(s=>s.t)), t0=now-14*864e5, t1=now+12*864e5, w=1000, x=t=>((t-t0)/(t1-t0))*w;
  const evs=(DATA.events||[]).map(e=>({...e,t:Date.parse(e.d+'T12:00')})).filter(e=>e.t>=t0&&e.t<=t1);
  const col={confirmed:'#39ff88',speculation:'#fcee0a',rumor:'#ff2a6d'};
  return `<svg class="pt-tl" viewBox="0 0 ${w} 90" preserveAspectRatio="none"><line x1="0" y1="45" x2="${w}" y2="45" stroke="#2a4466"/><line x1="${x(now)}" y1="5" x2="${x(now)}" y2="85" stroke="#00f0ff" stroke-dasharray="3 3"/><text x="${x(now)+3}" y="12" fill="#00f0ff" font-size="10">now</text>`+
   evs.map(e=>`<g><line x1="${x(e.t)}" y1="20" x2="${x(e.t)}" y2="70" stroke="#c86bff"/><text x="${x(e.t)+2}" y="82" fill="#c86bff" font-size="9">${E(e.name.slice(0,22))}</text><title>${E(e.name+' · '+e.d)}</title></g>`).join('')+
   S.filter(s=>s.t>=t0).map((s,k)=>`<a href="${E(s.url)}" target="_blank"><circle cx="${x(s.t)}" cy="${30+(k%4)*6}" r="4" fill="${col[s.status]||'#aaa'}"><title>${E(s.title)} (${E(s.acct)})</title></circle></a>`).join('')+'</svg>'; }
function render(){ const el=Q('#ptBody'); if(!el) return; const S=enrich(); const H=heat(S), P=detect(S), C=pairs(S); const F=filterSel(S);
  const top=H.slice(0,4).map(h=>`<button class="pt-hot" data-th="${E(h.k)}"><span class="pt-h" style="--h:${h.h}">${h.h}</span><b>${E(h.k)}</b><em>${E(h.why)}</em></button>`).join('');
  el.innerHTML=`<div class="pt-warn">SPECULATION, NOT ADVICE · heat = recency-weighted signal volume, not a price call · data updated ${E(String(DATA.updated||'').slice(0,16).replace('T',' '))}${DATA._remote?' · auto-updated':''}</div>
   <div class="pt-k">WHAT'S HEATING UP</div><div class="pt-hots">${top}</div>
   <div class="pt-k">PATTERNS DETECTED</div><div class="pt-pats">${P.slice(0,8).map((p,i)=>`<button class="pt-pat" data-p="${i}"><span class="pill v">${E(p.kind)}</span> ${E(p.txt)}</button>`).join('')||'<div class="hint">No patterns yet.</div>'}</div>
   <div class="pt-k">TIMELINE · last 14 days + upcoming events (dots open the post)</div>${timeline(S)}
   <div class="pt-grid"><div><div class="pt-k">CONNECTIONS (click to drill in)</div><div class="pt-con">${C.slice(0,14).map(([k,ix])=>`<button data-ids="${ix.join(',')}">${E(k)} <b>${ix.length}</b></button>`).join('')}</div>
     <div class="pt-k">ALL THEMES</div><div class="pt-con">${H.map(h=>`<button data-th="${E(h.k)}">${E(h.k)} <b>${h.h}</b></button>`).join('')}</div>
     <div class="pt-k">TEASER → ANNOUNCEMENT HISTORY</div>${(DATA.teasers||[]).map(t=>`<a class="pt-sig" href="${E(t.url)}" target="_blank" rel="noopener"><b>${E(t.teaser)}</b><em>→ ${E(t.outcome)}</em></a>`).join('')}</div>
    <div><div class="pt-k">SIGNAL LOG ${sel?`· filtered: ${E(sel.label||sel.v)} <button id="ptClr">show all</button>`:''} · ${F.length} signals</div><div class="pt-log">${F.map(row).join('')}</div></div></div>
   <details class="pt-opt"><summary>Optional: keyword watchlist (scans maintain this automatically)</summary><div class="hint">Edits stay on this PC. Discovered by scans: ${E((DATA.discovered||[]).join(', '))}</div>${Object.entries(watch()).map(([c,t])=>`<label>${E(c)}<input data-c="${E(c)}" value="${E(t.join(', '))}"></label>`).join('')}<button id="ptReset">reset to scan defaults</button></details>`;
  el.querySelectorAll('[data-th]').forEach(b=>b.onclick=()=>{ sel={k:'theme',v:b.dataset.th}; render(); });
  el.querySelectorAll('[data-ids]').forEach(b=>b.onclick=()=>{ sel={k:'ids',v:b.dataset.ids.split(',').map(Number),label:b.textContent}; render(); });
  el.querySelectorAll('[data-p]').forEach(b=>b.onclick=()=>{ const p=P[+b.dataset.p]; sel={k:'ids',v:p.sig,label:p.kind}; render(); });
  const c=Q('#ptClr'); if(c) c.onclick=()=>{ sel=null; render(); };
  el.querySelectorAll('.pt-opt input').forEach(i=>i.onchange=()=>{ const u=UW()||{}; u[i.dataset.c]=i.value.split(',').map(x=>x.trim()).filter(Boolean); LS.set('patWatch',u); render(); });
  const r=Q('#ptReset'); if(r) r.onclick=()=>{ localStorage.removeItem('dr_patWatch'); render(); };
  const d=el.querySelector('.pt-opt'); if(d&&window.__ptOpen) d.open=true; if(d) d.ontoggle=()=>{ window.__ptOpen=d.open; }; }
/* ---- auto-refresh of the signal log from the update host (or the local copy) ---- */
async function refresh(){ const cfg=window.UPDATE_CFG||{}; const urls=[cfg.base?cfg.base.replace(/\/?$/,'/')+'site/data/signals.json':null,'data/signals.json'].filter(Boolean);
  for(const u of urls){ try{ const r=await fetch(u+'?t='+Date.now(),{cache:'no-store'}); if(!r.ok) continue; const j=await r.json(); if(j&&j.signals&&(!DATA.updated||j.updated>=DATA.updated)){ DATA=j; DATA._remote=u.startsWith('http'); render(); } return; }catch(e){} } }
function build(){ const s=document.createElement('section'); s.id='patterns'; s.className='panel';
  s.innerHTML='<div class="panel-head"><h2 data-info="patterns">Patterns · what\'s heating up and why</h2><span class="hint">speculation radar · click anything to drill in · not advice</span></div><div id="ptBody"></div>';
  const app=Q('#app')||document.body; const th=Q('#thesis'); if(th&&th.parentElement===app) th.after(s); else app.appendChild(s); render(); }
if(window.INFO) INFO.patterns='PATTERNS: a speculation radar fed by the box\'s scheduled X/news scans. Heat per theme = recency-weighted count of signals (confirmed 1.0, speculation 0.6, rumor 0.35; Ripple-linked accounts ×1.5; 5-day decay), scaled so the hottest theme is 100. Patterns: keyword spikes vs a 27-day baseline, the same entity mentioned by 2+ Ripple-linked accounts, official accounts engaging newcomers, signal clusters within 3 days of events, whale/exchange and teaser chatter. Everything here is SPECULATION, NOT ADVICE; confirmed items link to the primary source.';
window.Patterns={render,refresh,enrich,detect,heat,get data(){return DATA;}};
build(); setTimeout(refresh,3000); setInterval(()=>{ if(!document.hidden) refresh(); },10*60e3);
})();

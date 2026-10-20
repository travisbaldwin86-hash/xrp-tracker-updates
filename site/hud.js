/* DEMAND RADAR · HUD layer: reading order, plain-English labels, NEW tags, analyst line, boot sequence,
   alarm controls (volume, mute, snooze, quiet hours, cooldown), "while you were away" recap, CPU-light mode,
   confidence tags, and the 4th (floor) screen hand-off. Readability wins over effects; motion only on change. */
(function(){ 'use strict';
const Q=s=>document.querySelector(s), QA=s=>[...document.querySelectorAll(s)];
const LAYOUT=new URLSearchParams(location.search).get('layout')||'std';
const RIG=LAYOUT==='rig', FLOOR=LAYOUT==='floor';
const ET=t=>new Date(t).toLocaleTimeString('en-US',{timeZone:'America/New_York',hour:'numeric',minute:'2-digit'})+' ET';
/* ---------- alarm controls (remembered) ---------- */
const AC=Object.assign({vol:0.5,mute:false,snooze:0,quiet:true,qs:23,qe:7,lite:false},LS.get('alarmCfg',{})); const saveAC=()=>LS.set('alarmCfg',AC);
window.LITE=!!AC.lite; document.body.classList.toggle('lite',window.LITE);
const etHour=()=>+new Date().toLocaleString('en-US',{timeZone:'America/New_York',hour:'numeric',hour12:false})%24;
const inQuiet=()=>{ if(!AC.quiet) return false; const h=etHour(); return AC.qs>AC.qe?(h>=AC.qs||h<AC.qe):(h>=AC.qs&&h<AC.qe); };
let lastBeep=0, actx=null;
window.beep=function(level){ if(FLOOR) return; if(!settings.sound||AC.mute||Date.now()<AC.snooze) return; if(inQuiet()&&(level||1)<3) return; if(Date.now()-lastBeep<20000&&(level||1)<3) return; lastBeep=Date.now();
  try{ actx=actx||new (window.AudioContext||window.webkitAudioContext)(); const n=level>=3?3:Math.max(1,level||1); for(let i=0;i<n;i++){ const o=actx.createOscillator(), g=actx.createGain(), t0=actx.currentTime+i*.22; o.type='triangle'; o.frequency.value=level>=3?880:level==2?660:520; g.gain.setValueAtTime(.0001,t0); g.gain.exponentialRampToValueAtTime(Math.max(.0002,.35*AC.vol),t0+.02); g.gain.exponentialRampToValueAtTime(.0001,t0+.18); o.connect(g).connect(actx.destination); o.start(t0); o.stop(t0+.2);} }catch(e){} };
function controls(){ const host=Q('#topbar'); if(!host||Q('#acBar')) return; const d=document.createElement('div'); d.id='acBar'; host.appendChild(d); drawAC(); }
function drawAC(){ const d=Q('#acBar'); if(!d) return; const sn=Date.now()<AC.snooze;
  d.innerHTML=`<button data-a="sound" class="${settings.sound&&!AC.mute?'on':''}" title="Alarm sound on/off">${settings.sound&&!AC.mute?'🔊':'🔇'}</button><input type="range" min="0" max="1" step="0.1" value="${AC.vol}" title="Alarm volume">
   <button data-a="snooze" class="${sn?'on':''}" title="Silence alarms for 1 hour (they still appear in the log)">${sn?'SNOOZED → '+ET(AC.snooze):'SNOOZE 1H'}</button>
   <button data-a="quiet" class="${AC.quiet?'on':''}" title="Quiet hours ${AC.qs}:00–${AC.qe}:00 ET: only stage-3 alarms make sound">QUIET ${AC.qs}–${AC.qe}</button>
   <button data-a="lite" class="${AC.lite?'on':''}" title="CPU-light: animations at 8 fps, no glow effects">LITE</button>
   <button data-a="intro" class="${LS.get('intro',{on:true}).on?'on':''}" title="Phoenix intro when the tracker opens. Click to switch on/off.">INTRO ${LS.get('intro',{on:true}).on?'ON':'OFF'}</button><button data-a="play" title="Play the intro now">▶</button>`;
  d.querySelector('input').oninput=e=>{ AC.vol=+e.target.value; saveAC(); };
  d.querySelectorAll('button').forEach(b=>b.onclick=()=>{ const a=b.dataset.a;
    if(a==='sound'){ if(!settings.sound){ settings.sound=true; AC.mute=false; saveSettings(); } else AC.mute=!AC.mute; }
    if(a==='snooze') AC.snooze=Date.now()<AC.snooze?0:Date.now()+36e5; if(a==='quiet') AC.quiet=!AC.quiet;
    if(a==='intro'){ LS.set('intro',{on:!LS.get('intro',{on:true}).on}); } if(a==='play'){ window.Intro&&Intro.play(true); }
    if(a==='lite'){ AC.lite=!AC.lite; window.LITE=AC.lite; document.body.classList.toggle('lite',AC.lite); }
    saveAC(); drawAC(); try{ const s=Q('#btnSound'); s&&(s.textContent='Sound: '+(settings.sound&&!AC.mute?'on':'off')); }catch(e){} }); }
/* ---------- plain-English signal names (jargon stays in the hover) + confidence tags ---------- */
const PLAIN=[[/^RSI/i,'Momentum: stretched?'],[/50\/200/i,'Long-term trend'],[/^MACD/i,'Short-term trend'],[/Bollinger/i,'Calm before a move?'],[/funding/i,'Trader bets (long vs short)'],[/open interest/i,'Borrowed money in play'],[/BTC dominance/i,"Bitcoin's share of crypto"],[/XRP\/BTC/i,'XRP vs Bitcoin'],[/whale/i,'Big holders moving'],[/volume/i,'Trading activity vs usual'],[/fear/i,'Market mood']];
const CONF=[[/whale|ledger|burn|account|amm|rlusd/i,'HIGH','on-ledger data'],[/funding|open interest/i,'MED','one exchange (OKX/Bitget)'],[/RSI|MACD|Bollinger|50\/200|volume|XRP\/BTC|dominance/i,'MED','price-based; exchange volume includes wash trading'],[/fear/i,'LOW','sentiment survey']];
function plainSignals(){ QA('.sig.dial').forEach(el=>{ const n=el.querySelector('.n'); if(!n||n.dataset.plain) return; const orig=n.textContent.trim(); const p=PLAIN.find(([re])=>re.test(orig)); if(p){ n.dataset.plain=1; n.title=orig; n.textContent=p[1]; }
   const c=CONF.find(([re])=>re.test(orig)); if(c&&!el.querySelector('.conf')){ el.insertAdjacentHTML('beforeend',`<span class="conf c${c[1]}" title="Confidence ${c[1]}: ${c[2]}. Signals show conditions, not certainties.">${c[1]}</span>`); } }); }
const _rs=window.renderSignals; if(_rs) window.renderSignals=function(a){ _rs(a); try{ plainSignals(); }catch(e){} };
/* ---------- NEW tags that fade (any feed row seen for the first time) ---------- */
const BORN=new Map(); const FEEDS='#whaleFeed .row,#rlFeed .row,#alarmLog .row,#newsFeed .row,#rfLog .row,.ww-e,.hd-ff a';
function markNew(){ const n=Date.now(); QA(FEEDS).forEach(r=>{ const k=r.textContent.slice(0,80); if(!BORN.has(k)) BORN.set(k,BORN.size<1?n-1e9:(window.__hudReady?n:n-1e9)); const a=n-BORN.get(k);
  let b=r.querySelector(':scope > .newtag'); if(a<15*60e3){ if(!b){ b=document.createElement('span'); b.className='newtag'; b.textContent='NEW'; r.prepend(b); } b.style.opacity=String(0.25+0.75*(1-a/(15*60e3))); r.classList.add('fresh'); } else { if(b) b.remove(); r.classList.remove('fresh'); } }); }
/* ---------- analyst line: one plain sentence about the most important change ---------- */
function analyst(){ const el=Q('#analyst'); if(!el) return; const L=LS.get('log',[]); const top=L.find(e=>Date.now()-e.t<3*36e5&&(e.level||0)>=2)||L.find(e=>Date.now()-e.t<3*36e5);
  const rn=(Q('#rnTitle')||{}).textContent||''; let s;
  if(top) s=`${String(top.name).replace(/\s+/g,' ')} at ${ET(top.t)}. ${String(top.joke||'').split(/(?<=\.)\s/)[0]}`;
  else if(rn&&!/Listening/.test(rn)) s=`Right now: ${rn}.`; else s='Quiet on the ledger. No alarm in the last 3 hours; watching every feed.';
  s=s.replace(/\.\./g,'.'); if(el.dataset.s===s) return; el.dataset.s=s; const t=el.querySelector('.an-t'); t.textContent=''; let i=0; clearInterval(el._ty);
  el._ty=setInterval(()=>{ t.textContent=s.slice(0,++i); if(i>=s.length) clearInterval(el._ty); },window.LITE?1:18); }
/* ---------- while you were away ---------- */
let lastInput=Date.now();
function onInput(){ const away=Date.now()-lastInput; lastInput=Date.now(); LS.set('lastInput',lastInput); if(away>30*60e3) recap(Date.now()-away); }
function recap(since){ const L=LS.get('log',[]).filter(e=>e.t>since); if(!L.length||Q('#recap')) return; const top=L.slice().sort((a,b)=>(b.level||0)-(a.level||0)||b.t-a.t).slice(0,7);
  const d=document.createElement('div'); d.id='recap'; d.innerHTML=`<div class="rc-box"><div class="rc-k">WHILE YOU WERE AWAY · since ${ET(since)}</div><div class="rc-n">${L.length} alarm${L.length>1?'s':''}, most important first</div>${top.map(e=>`<div class="rc-r l${e.level||0}"><b>${ET(e.t)}</b> ${esc(e.name)}</div>`).join('')}<button>GOT IT</button></div>`;
  (Q('#scr-center')||document.body).appendChild(d); d.querySelector('button').onclick=()=>d.remove(); setTimeout(()=>d.remove(),5*60e3); }
['mousemove','keydown','mousedown','wheel'].forEach(e=>addEventListener(e,()=>{ if(Date.now()-lastInput>2000) onInput(); else lastInput=Date.now(); },{passive:true}));
document.addEventListener('visibilitychange',()=>{ if(!document.hidden){ const li=LS.get('lastInput',Date.now()); if(Date.now()-li>30*60e3) recap(li); } });
/* ---------- boot sequence ---------- */
function boot(){ if(sessionStorage.getItem('booted')||window.LITE||(LS.get('intro',{on:true}).on&&!/layout=floor/.test(location.search))) return; sessionStorage.setItem('booted','1'); const b=document.createElement('div'); b.id='boot';
  b.innerHTML=`<div class="bt-core"></div><div class="bt-t">XRP COMMAND <span>//</span> ONLINE</div><div class="bt-s">linking XRP Ledger · prices · filings · news …</div>`; document.body.appendChild(b); setTimeout(()=>b.classList.add('out'),2200); setTimeout(()=>b.remove(),3000); }
/* ---------- rig: zone headings, analyst, deep-detail slots, floor hand-off ---------- */
const ZONES={left:['WHY','What is driving XRP demand'],center:['NOW','What is happening now + the long-term evidence'],right:['LIVE','Feeds & alerts as they happen']};
const SLOTS=[['#patterns','#ttm','#holders','#extras','#adLedger','#world','#everywhere']]; const SLN={'#patterns':'Patterns','#ttm':'Paper trades','#holders':'Who holds XRP','#extras':'Supply & rules','#adLedger':'Adoption ledger','#world':'World','#everywhere':'XRP everywhere'};
let slotI=0, floorOn=false;
function rigSetup(){ Object.entries(ZONES).forEach(([k,[a,b]])=>{ const f=Q('.fit-'+k); if(f&&!f.querySelector('.zone-h')) f.insertAdjacentHTML('afterbegin',`<div class="zone-h"><b>${a}</b><span>${b}</span></div>`); });
  const tb=Q('#topbar'); if(tb&&!Q('#analyst')){ tb.insertAdjacentHTML('afterend','<div id="analyst" title="One plain sentence about the most important recent change. Facts only, no predictions."><span class="an-k">ANALYST ▸</span><span class="an-t"></span></div>'); }
  const row=Q('#lrow2'); if(row&&!row.dataset.slots){ row.dataset.slots=1; row.innerHTML=''; SLOTS.forEach((ids,i)=>{ const s=document.createElement('div'); s.className='slot'; s.id='slot'+i;
      s.innerHTML='<div class="slot-tabs">'+ids.map((id,j)=>`<button data-j="${j}">${SLN[id]||id}</button>`).join('')+'</div>'; ids.forEach(id=>{ const el=Q(id); if(el) s.appendChild(el); }); row.appendChild(s);
      s.querySelectorAll('.slot-tabs button').forEach(b=>b.onclick=()=>{ s.dataset.pin=b.dataset.j; showSlot(s,+b.dataset.j); }); showSlot(s,0); });
    row.addEventListener('mouseenter',()=>row.dataset.hover=1); row.addEventListener('mouseleave',()=>delete row.dataset.hover); }
  controls(); }
function showSlot(s,j){ const ids=SLOTS[+s.id.slice(4)]; ids.forEach((id,k)=>{ const el=Q(id); if(el) el.style.display=k===j?'':'none'; }); s.querySelectorAll('.slot-tabs button').forEach(b=>b.classList.toggle('on',+b.dataset.j===j)); }
function rotate(){ const row=Q('#lrow2'); if(!row||row.dataset.hover||floorOn) return; slotI++; QA('#lrow2 .slot').forEach(s=>{ if(s.dataset.pin==null) showSlot(s,slotI%SLOTS[+s.id.slice(4)].length); }); }
function floorCheck(){ const t=+localStorage.getItem('dr_floorAlive')||0; const on=Date.now()-t<20000; if(on===floorOn) return; floorOn=on; document.body.classList.toggle('floor-on',on);
  const row=Q('#lrow2'); if(row) row.style.display=on?'none':''; const tag=Q('#floorTag'); if(!tag&&Q('#topbar')) Q('#topbar').insertAdjacentHTML('beforeend','<span id="floorTag"></span>'); const t2=Q('#floorTag'); if(t2) t2.textContent=on?'▼ DETAIL ON FLOOR SCREEN':''; }
/* ---------- floor screen (portrait 1080×1920) ---------- */
function floorSetup(){ document.title='XRP Floor Detail'; document.body.classList.add('floor'); const root=document.createElement('div'); root.id='floorRoot';
  root.innerHTML=`<div class="zone-h"><b>DETAIL</b><span>Thesis evidence · adoption ledger · Ripple family · the world · who holds XRP · rules · news</span><em id="flClock"></em></div>`;
  const rd=document.createElement('section'); rd.id='rfDetail'; rd.className='panel'; rd.innerHTML='<div class="panel-head"><h2 data-info="rfam">Ripple family · change log</h2></div><div id="rfFam" class="rf-fam"></div><div id="rfLog" class="feed"></div>';
  document.body.appendChild(root);
  const order=['#patterns','#thesisFull','#adLedger','#rfam',rd,'#world','#holders','#extras','#helperFeeds','#everywhere','#news','#alarmlog'];
  order.forEach(x=>{ const el=typeof x==='string'?Q(x):x; if(el){ el.style.display=''; root.appendChild(el); } });
  const app=Q('#app'); if(app) app.style.display='none';
  setInterval(()=>{ localStorage.setItem('dr_floorAlive',String(Date.now())); },5000); localStorage.setItem('dr_floorAlive',String(Date.now()));
  addEventListener('beforeunload',()=>localStorage.setItem('dr_floorAlive','0'));
  // pages: fewer items at a time, big text, auto-rotate (pauses 2 min after touch/scroll), each page scrolls
  const PAGES=[['PATTERNS',['#patterns'],60],['PAPER TRADES',['#ttm'],60],['THESIS',['#thesisFull'],45],['ADOPTION',['#adLedger'],60],['RIPPLE FAMILY',['#rfam','#rfDetail'],30],['WORLD',['#world'],30],['WHO HOLDS',['#holders'],30],['SUPPLY & RULES',['#extras','#helperFeeds'],30],['NEWS & ALARMS',['#news','#alarmlog'],30],['EVERYWHERE',['#everywhere'],25]];
  const bar=document.createElement('div'); bar.id='flPager'; bar.innerHTML=PAGES.map((p,i)=>`<button data-i="${i}">${p[0]}</button>`).join(''); root.querySelector('.zone-h').after(bar);
  const pg=document.createElement('div'); pg.id='flPage'; bar.after(pg); const parts={}; PAGES.forEach((p,i)=>{ const d=document.createElement('div'); d.className='fl-p'; d.dataset.i=i; p[1].forEach(id=>{ const el=Q(id); if(el) d.appendChild(el); }); pg.appendChild(d); parts[i]=d; });
  let cur=0, hold=0, since=Date.now(); const show=i=>{ cur=i; since=Date.now(); QA('#flPage .fl-p').forEach(d=>d.style.display=+d.dataset.i===i?'':'none'); QA('#flPager button').forEach(b=>b.classList.toggle('on',+b.dataset.i===i)); pg.scrollTop=0; };
  bar.querySelectorAll('button').forEach(b=>b.onclick=()=>{ show(+b.dataset.i); hold=Date.now()+120000; }); ['wheel','pointerdown','touchstart','keydown'].forEach(e=>pg.addEventListener(e,()=>{ hold=Date.now()+120000; },{passive:true}));
  show(0); setInterval(()=>{ if(Date.now()<hold) return; if(Date.now()-since>PAGES[cur][2]*1000) show((cur+1)%PAGES.length); },1000);
  const fit=()=>{ root.style.zoom=String(Math.max(0.8,Math.min(1.5,innerWidth/1080))); };
  setInterval(()=>{ const c=Q('#flClock'); if(c) c.textContent=ET(Date.now()); fit(); },5000); setTimeout(fit,1500); addEventListener('resize',fit); if(window.RFRender) RFRender(); }
/* ---------- start ---------- */
function start(){ boot(); if(RIG) rigSetup(); if(FLOOR) floorSetup(); else controls(); plainSignals(); markNew(); analyst(); setTimeout(()=>{ window.__hudReady=1; },8000); }
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>setTimeout(start,50)); else setTimeout(start,50);
setInterval(()=>{ if(document.hidden) return; plainSignals(); markNew(); analyst(); if(RIG){ floorCheck(); } },5000);
setInterval(()=>{ if(RIG&&!document.hidden) rotate(); },20000);
})();

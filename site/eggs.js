/* hidden fun. harmless, local only, motion-safe */
(function(){ const RM=matchMedia('(prefers-reduced-motion: reduce)').matches; const M=(n,l)=>{ try{ return Memes.render(n,l||''); }catch(e){ return ''; } };
 const css=document.createElement('style'); css.textContent=`.egg-ov{position:fixed;inset:0;z-index:9995;display:flex;align-items:center;justify-content:center;pointer-events:none}
 .egg-box{pointer-events:auto;background:#030305ee;border:1px solid #ff2a6d;box-shadow:0 0 30px #ff2a6d66;padding:24px 34px;font-family:var(--mono);color:#fcee0a;text-align:center;max-width:900px;clip-path:polygon(0 0,calc(100% - 18px) 0,100% 18px,100% 100%,18px 100%,0 calc(100% - 18px))}
 .egg-box h1{font-family:var(--disp);color:#ff2a6d;letter-spacing:4px;margin:0 0 8px;text-shadow:3px 0 #00f0ff}.egg-box svg{width:220px;height:150px}
 .egg-breach{background:repeating-linear-gradient(0deg,#ff2a6d14 0 2px,transparent 2px 5px)}.egg-breach .egg-box{animation:${RM?'none':'egSh .2s steps(2) 8'}}
 @keyframes egSh{50%{transform:translate(4px,-2px)}}
 body.cy-ledge{--cy-y:#ff2a6d;--cy-c:#fcee0a}body.cy-ledge h2{color:#ff2a6d!important}
 #eggBadge{position:fixed;left:12px;bottom:12px;z-index:9980;font:11px var(--mono);letter-spacing:2px;color:#030305;background:#00f0ff;padding:3px 9px;box-shadow:0 0 10px #00f0ff88}
 #eggGhost{position:fixed;top:40%;left:0;right:0;text-align:center;z-index:9985;font:700 26px var(--disp);color:#00f0ff;text-shadow:-2px 0 #ff2a6d;pointer-events:none;opacity:.85}
 canvas.egg-fw{position:fixed;inset:0;z-index:9994;pointer-events:none}`; document.head.appendChild(css);
 const ov=(html,cls,ms)=>{ const d=document.createElement('div'); d.className='egg-ov '+(cls||''); d.innerHTML='<div class="egg-box">'+html+'</div>'; d.onclick=()=>d.remove(); document.body.appendChild(d); setTimeout(()=>d.remove(),ms||7000); return d; };
 /* 1 Konami: system breach, mascot takes over */
 const K=['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a']; let ki=0, typed='';
 addEventListener('keydown',e=>{ if(/input|select|textarea/i.test((e.target.tagName||''))) return;
   ki=(e.key===K[ki]||e.key.toLowerCase()===K[ki])?ki+1:(e.key===K[0]?1:0);
   if(ki===K.length){ ki=0; document.body.classList.add('cy-alarm'); setTimeout(()=>document.body.classList.remove('cy-alarm'),600);
     ov(`<h1>SYSTEM BREACH</h1>${M('party','LEDGE HAS THE WHEEL')}<div>Ledge has taken over the dashboard. Demands: more validators, fewer rumors, snacks.</div><div style="color:#00f0ff;margin-top:8px">(click to give the wheel back)</div>`,'egg-breach',9000); }
   if(e.key.length===1){ typed=(typed+e.key.toLowerCase()).slice(-6); if(/moon$|589$/.test(typed)){ typed=''; fireworks(); } } });
 /* 2 click the mascot 7 times: secret Ledge mode (swaps the neon) */
 let clicks=0, ct=0; document.addEventListener('click',e=>{ if(!e.target.closest('.art,.meme-mini,#alarmMeme,.bn-meme,#rnIcon')) return; clicks++; clearTimeout(ct); ct=setTimeout(()=>clicks=0,4000);
   if(clicks>=7){ clicks=0; const on=document.body.classList.toggle('cy-ledge'); ov(`<h1>${on?'LEDGE MODE ON':'LEDGE MODE OFF'}</h1>${M(on?'party':'calm','')}<div>${on?'Ledge repainted the neon. Click the mascot 7 times again to undo.':'Neon restored. Ledge is sulking.'}</div>`,'',4500); } });
 /* 3 moon / 589: neon fireworks + rocket */
 function fireworks(){ ov(`<h1>589 TO THE MOON</h1>${M('rocket','')}<div>Meme number detected. Ledge is fueling the rocket. (Still not advice.)</div>`,'',5000); if(RM) return;
   const c=document.createElement('canvas'); c.className='egg-fw'; c.width=innerWidth; c.height=innerHeight; document.body.appendChild(c); const x=c.getContext('2d'); const P=[]; const col=['#fcee0a','#00f0ff','#ff2a6d','#39ff88'];
   for(let b=0;b<5;b++){ const cx=Math.random()*c.width, cy=Math.random()*c.height*.5+40; for(let i=0;i<40;i++){ const a=Math.random()*6.28, s=Math.random()*4+1; P.push({x:cx,y:cy,vx:Math.cos(a)*s,vy:Math.sin(a)*s,l:60+Math.random()*30,c:col[b%4]}); } }
   let f=0; (function step(){ x.clearRect(0,0,c.width,c.height); P.forEach(p=>{ if(p.l<=0) return; p.x+=p.vx; p.y+=p.vy; p.vy+=.05; p.l--; x.fillStyle=p.c; x.fillRect(p.x,p.y,3,3); }); if(++f<100) requestAnimationFrame(step); else c.remove(); })(); }
 /* 4 hover the 10,000 XRP tile 4 s: warehouse blueprint */
 let ht=0; document.addEventListener('mouseover',e=>{ const g=e.target.closest&&e.target.closest('#goalTile'); if(!g) return; clearTimeout(ht); ht=setTimeout(()=>{ ov(`<h1>BLUEPRINT // TRAVIS HQ</h1>
   <svg viewBox="0 0 320 180" style="width:520px;height:290px"><g fill="none" stroke="#00f0ff" stroke-width="1.5"><path d="M20 160 V70 L160 20 L300 70 V160 Z"/><path d="M20 70 H300"/><rect x="40" y="95" width="70" height="50"/><rect x="125" y="110" width="70" height="50"/><rect x="215" y="95" width="70" height="50"/>
   <path d="M48 135 h54 M48 125 h54 M48 115 h54"/><path d="M223 135 h54 M223 125 h54"/><rect x="138" y="122" width="44" height="26"/><path d="M160 148 v6 M150 154 h20"/></g>
   <g font-family="monospace" font-size="9" fill="#fcee0a"><text x="42" y="90">SERVER RACK x3</text><text x="128" y="105">MEGA SIM RIG v2</text><text x="218" y="90">NEW PCs x12</text><text x="110" y="15">WAREHOUSE (FUTURE)</text><text x="24" y="175">funded by: the 10,000 XRP goal · scale: dreams</text></g></svg>
   <div>Phase 1: hit the goal. Phase 2: buy more extension cords.</div>`,'',8000); },4000); });
 document.addEventListener('mouseout',e=>{ if(e.target.closest&&e.target.closest('#goalTile')) clearTimeout(ht); });
 /* 5 diamond hands badge after 6 hours open */
 const t0=Date.now(); const dh=setInterval(()=>{ if(Date.now()-t0>6*3600e3){ clearInterval(dh); if(!document.getElementById('eggBadge')){ const b=document.createElement('div'); b.id='eggBadge'; b.textContent='◆ DIAMOND HANDS · 6H ON WATCH'; b.title='Unlocked: kept the tracker open 6 hours'; document.body.appendChild(b); } } },60000);
 /* 6 rare ghost message (about 1 in 300 checks, every 5 min) */
 const G=['SIGNAL GHOST: the ledger says hi','LEDGE WAS HERE','packet from the future: 404 price not found','ERROR 589: too much hopium','validator whispers: keep syncing'];
 setInterval(()=>{ if(Math.random()>1/300||document.hidden) return; const d=document.createElement('div'); d.id='eggGhost'; d.textContent=G[Math.random()*G.length|0]; document.body.appendChild(d); setTimeout(()=>d.remove(),2500); },300000);
})();

/* NIGHT-CITY HUD: section tags, ID barcodes, load flicker, glitch on big-number change and on alarms (throttled, motion-safe) */
(function(){ const RM=matchMedia('(prefers-reduced-motion: reduce)').matches;
 const tag=()=>document.querySelectorAll('section.panel').forEach((s,i)=>{ const h=s.querySelector('.panel-head h2'); if(!h||h.dataset.tag) return;
   const id=(s.id||'sec').replace(/[^a-z0-9]/gi,'').toUpperCase().slice(0,8); h.dataset.tag='NET//'+id; const ph=h.parentElement; ph.dataset.id='ID-'+(0x1A00+i*37).toString(16).toUpperCase()+'·XRP'; });
 tag(); setTimeout(tag,3000); setTimeout(tag,12000);
 if(!RM){ document.body.classList.add('cy-boot'); setTimeout(()=>document.body.classList.remove('cy-boot'),1300); }
 if(RM) return;
 let last=0; const big=e=>{ while(e&&e.nodeType!==1) e=e.parentNode; for(let i=0;e&&i<4;i++,e=e.parentElement){ const fs=parseFloat(getComputedStyle(e).fontSize); if(fs>=20) return e; } return null; };
 const mo=new MutationObserver(ms=>{ const n=performance.now(); if(n-last<250) return; last=n; let k=0;
   for(const m of ms){ const e=big(m.target); if(e&&!e.classList.contains('cy-gl')){ e.classList.add('cy-gl'); setTimeout(()=>e.classList.remove('cy-gl'),400); if(++k>=3) break; } } });
 const start=()=>{ const r=document.querySelector('#rig:not([hidden])')||document.querySelector('#app')||document.body; mo.observe(r,{subtree:true,characterData:true,childList:true});
   const g=document.getElementById('goalTile'); if(g) mo.observe(g,{subtree:true,childList:true,characterData:true}); };
 setTimeout(start,6000);
 const al=document.getElementById('alarm'); let prev=al?al.className+al.textContent.length:'';
 setInterval(()=>{ const a=document.getElementById('alarm'); if(!a) return; const s=a.className+a.textContent.length; if(s!==prev&&!a.hidden&&a.textContent.trim()){ document.body.classList.add('cy-alarm'); setTimeout(()=>document.body.classList.remove('cy-alarm'),600); } prev=s; },1500);
})();

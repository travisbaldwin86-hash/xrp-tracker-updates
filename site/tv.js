/* NIGHT-CITY NEWS TV: official live news channels (via hosted https wrapper; no local helper needed) + BREAKING NEWS lower-third for every alarm */
(function(){ const LAY=new URLSearchParams(location.search).get('layout'); const CH=(window.TV_CHANNELS||[]).filter(c=>c&&c.id);
 const HOST=((window.UPDATE_CFG&&UPDATE_CFG.base)||'https://travisbaldwin86-hash.github.io/xrp-tracker-updates/')+'site/tv.html';
 const st=Object.assign({ch:0,muted:true,vol:40},JSON.parse(localStorage.getItem('dr_tv')||'{}')); st.muted=true; /* always start muted */
 const save=()=>localStorage.setItem('dr_tv',JSON.stringify({ch:st.ch,vol:st.vol}));
 const E=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
 const css=document.createElement('style'); css.textContent=`
 #tvPanel{padding:10px 12px 12px!important}#tvPanel .tv-scr{position:relative;aspect-ratio:16/9;background:#000;border:1px solid #00f0ff55;overflow:hidden}
 #tvPanel iframe{position:absolute;inset:0;width:100%;height:100%;border:0}
 #tvPanel .tv-scr:after{content:"";position:absolute;inset:0;pointer-events:none;background:repeating-linear-gradient(0deg,#0000 0 2px,#00000022 2px 3px),radial-gradient(ellipse at center,transparent 60%,#000a 100%)}
 #tvPanel .tv-bug{position:absolute;top:8px;left:10px;z-index:3;font:12px var(--mono);letter-spacing:2px;color:#030305;background:var(--cy-y,#fcee0a);padding:1px 7px;pointer-events:none}
 #tvPanel .tv-bug i{font-style:normal;color:#ff2a6d;margin-right:5px}
 #tvPanel .tv-ctl{display:flex;gap:6px;align-items:center;margin-top:8px;flex-wrap:wrap;font-family:var(--mono)}
 #tvPanel .tv-ctl select{background:#08080c;color:var(--cy-y,#fcee0a);border:1px solid #fcee0a66;font:13px var(--mono);padding:3px 6px;border-radius:0;max-width:240px}
 #tvPanel .tv-ctl input[type=range]{accent-color:#fcee0a;width:110px}
 #tvPanel .tv-ctl button{padding:3px 10px;background:#08080c;cursor:pointer}
 .tv-nm{position:absolute;inset:0;padding:22px 28px;font-family:var(--mono);color:#fcee0a;background:radial-gradient(circle at 30% 20%,#ff2a6d33,transparent 60%),#05030a;overflow:hidden}
 .tv-nm h3{font-family:var(--disp);font-size:34px;margin:0 0 6px;color:#ff2a6d;text-shadow:2px 0 #00f0ff}.tv-nm .row{font-size:20px;margin:6px 0;color:#f2f2e8}.tv-nm b{color:#00f0ff}
 .bn-wrap{position:absolute;left:0;right:0;bottom:0;z-index:5;pointer-events:none}
 .bn-wrap.fixed{position:fixed;left:50%;right:auto;bottom:70px;width:1200px;max-width:90vw;transform:translateX(-50%);z-index:9990}
 .bn{display:none;background:linear-gradient(90deg,#030305f0,#0b0510f0);border-top:2px solid #fcee0a;box-shadow:0 -4px 20px #ff2a6d44;font-family:var(--font)}
 .bn.on{display:block;animation:bnIn .45s steps(6) 1}
 .bn .bn-top{display:flex;align-items:stretch}
 .bn .bn-tag{font:900 20px var(--disp);letter-spacing:3px;padding:6px 14px;background:#ff2a6d;color:#fff;animation:bnFl .8s steps(2) infinite;clip-path:polygon(0 0,100% 0,calc(100% - 12px) 100%,0 100%)}
 .bn .bn-kind{font:13px var(--mono);letter-spacing:2px;padding:10px 12px;color:#030305;background:#fcee0a}
 .bn .bn-h{flex:1;font:700 22px var(--font);padding:6px 14px;color:#f2f2e8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-shadow:-1px 0 #ff2a6d88,1px 0 #00f0ff88}
 .bn .bn-meme{width:64px;height:48px;flex:none;overflow:hidden}.bn .bn-meme svg{width:64px;height:48px}
 .bn .bn-tk{overflow:hidden;white-space:nowrap;font:15px var(--mono);color:#00f0ff;background:#000;border-top:1px solid #00f0ff44;padding:3px 0}
 .bn .bn-tk span{display:inline-block;padding-left:100%;animation:bnTk 14s linear infinite}
 @keyframes bnIn{0%{clip-path:inset(0 100% 0 0);filter:hue-rotate(90deg)}50%{clip-path:inset(0 30% 0 0);transform:translateX(-6px)}100%{clip-path:inset(0);transform:none}}
 @keyframes bnFl{0%{background:#ff2a6d;color:#fff}50%{background:#fcee0a;color:#030305}}
 @keyframes bnTk{to{transform:translateX(-100%)}}
 @media (prefers-reduced-motion:reduce){.bn.on,.bn .bn-tag{animation:none}.bn .bn-tk span{animation:none;padding-left:0}}`;
 document.head.appendChild(css);
 let panel=null, scr=null, bnWrap=null;
 function build(){ const sec=document.createElement('section'); sec.id='tvPanel'; sec.className='panel';
   sec.innerHTML=`<div class="panel-head"><h2>Night City News · live TV</h2><span class="hint">official free live streams · starts muted · ch 1-${CH.length}</span></div>
   <div class="tv-scr"><div class="tv-bug"><i>●</i><span id="tvName"></span></div></div>
   <div class="tv-ctl"><button id="tvDn" title="Channel down">CH ▼</button><button id="tvUp" title="Channel up">CH ▲</button><select id="tvSel"></select>
   <button id="tvMute">UNMUTE</button><span>VOL</span><input id="tvVol" type="range" min="0" max="100"><button id="tvTest" title="Show a test BREAKING NEWS banner">TEST BREAKING NEWS</button></div>`;
   scr=sec.querySelector('.tv-scr'); bnWrap=document.createElement('div'); bnWrap.className='bn-wrap'; scr.appendChild(bnWrap);
   const sel=sec.querySelector('#tvSel'); sel.innerHTML=CH.map((c,i)=>`<option value="${i+1}">${i+1} · ${E(c.n)}</option>`).join('');
   sec.querySelector('#tvUp').onclick=()=>tune(st.ch>=CH.length?1:st.ch+1); sec.querySelector('#tvDn').onclick=()=>tune(st.ch<=1?CH.length:st.ch-1);
   sel.onchange=()=>tune(+sel.value); const v=sec.querySelector('#tvVol'); v.value=st.vol; v.oninput=()=>{ st.vol=+v.value; save(); post({tv:'vol',v:st.vol}); };
   sec.querySelector('#tvMute').onclick=()=>{ st.muted=!st.muted; sec.querySelector('#tvMute').textContent=st.muted?'UNMUTE':'MUTE'; post({tv:st.muted?'mute':'unmute'}); if(!st.muted) post({tv:'vol',v:st.vol}); };
   sec.querySelector('#tvTest').onclick=testBN;
   /* secret: type 0 or 77 into the channel box (keyboard: focus TV and press 0, or 7 7) */
   let kb=''; sec.tabIndex=0; sec.addEventListener('keydown',e=>{ kb=(kb+e.key).slice(-2); if(e.key==='0'||kb==='77') tune(77); });
   return sec; }
 let ifr=null; const post=m=>{ try{ ifr&&ifr.contentWindow.postMessage(m,'*'); }catch(e){} };
 function tune(n){ if(!scr) return; const old=scr.querySelector('iframe,.tv-nm'); if(old) old.remove(); ifr=null;
   if(n===77||n===0){ st.ch=77; nightMarket(); } else { if(!CH.length) return; st.ch=Math.min(Math.max(1,n|0||1),CH.length); const c=CH[st.ch-1];
     ifr=document.createElement('iframe'); ifr.allow='autoplay; encrypted-media; picture-in-picture'; ifr.referrerPolicy='strict-origin-when-cross-origin';
     ifr.src=HOST+'?c='+encodeURIComponent(c.id)+'&m='+(st.muted?1:0); scr.prepend(ifr); Q2('#tvName').textContent='CH '+st.ch+' · '+c.n; Q2('#tvSel').value=st.ch; save(); }
   }
 const Q2=s=>panel.querySelector(s);
 let nmT=0; function nightMarket(){ const d=document.createElement('div'); d.className='tv-nm'; scr.prepend(d); Q2('#tvName').textContent='CH 77 · NIGHT MARKET XRP (pirate signal)';
   const draw=()=>{ if(!d.isConnected){ clearInterval(nmT); return; } let p=null; try{ p=D.px.v.xrp; }catch(e){} const log=(JSON.parse(localStorage.getItem('log')||'[]')||[]).slice(0,3);
     d.innerHTML=`<h3>NIGHT MARKET XRP · LIVE FROM THE BACK ALLEY</h3><div class="row">Street price of one XRP: <b>${p?'$'+p.toFixed(4):'…'}</b> (no haggling)</div>
     <div class="row">Ledge's stall: 10,000 XRP = <b>${p?'$'+(p*1e4).toLocaleString('en-US',{maximumFractionDigits:0}):'…'}</b></div>
     <div class="row">Vendor gossip: ${log.length?log.map(x=>E(x.name)+' '+E(x.changed||'')).join(' · '):'quiet night, nobody is shouting'}</div>
     <div class="row" style="color:#ff2a6d">This channel does not exist. You did not see it. Not advice.</div>`; };
   draw(); clearInterval(nmT); nmT=setInterval(draw,5000); }
 /* ---------- BREAKING NEWS queue ---------- */
 const QUEUE=[]; let showing=false; const bc=typeof BroadcastChannel==='function'?new BroadcastChannel('dr_breaking'):null;
 function kindOf(e){ if(e.kind) return e.kind; const c=String(e.changed||''), to=c.split('→').pop()||'', fr=c.split('→')[0]||'';
   if(/approach/i.test(to)) return /over|under|above|below|≥|≤|cross|trigger/i.test(fr)&&!/approach/i.test(fr)?'ABOUT TO REVERT':'ABOUT TO TRIGGER';
   if((e.level|0)===0||/neutral|normal|calm|quiet|flat|ok\b/i.test(to)) return 'REVERTED'; return 'TRIGGERED'; }
 function sting(){ try{ const tvOn=panel&&!st.muted; let snd=false; try{ snd=!!(JSON.parse(localStorage.getItem('settings')||'{}').sound); }catch(e){} if(!tvOn&&!snd) return;
   const a=new (window.AudioContext||window.webkitAudioContext)(); [880,660,990].forEach((f,i)=>{ const o=a.createOscillator(), g=a.createGain(); o.type='square'; o.frequency.value=f; g.gain.value=0.04; o.connect(g).connect(a.destination); o.start(a.currentTime+i*0.11); o.stop(a.currentTime+i*0.11+0.09); }); setTimeout(()=>a.close(),900); }catch(e){} }
 function host(){ if(bnWrap) return bnWrap; let w=document.getElementById('bnFixed'); if(!w){ w=document.createElement('div'); w.id='bnFixed'; w.className='bn-wrap fixed'; document.body.appendChild(w); } return w; }
 function next(){ if(showing||!QUEUE.length) return; showing=true; const e=QUEUE.shift(); const w=host(); const k=kindOf(e);
   let meme=''; try{ if(e.meme&&window.Memes) meme=Memes.render(e.meme,e.memeLabel||''); }catch(x){}
   w.innerHTML=`<div class="bn on"><div class="bn-top"><div class="bn-tag">BREAKING</div><div class="bn-kind">${E(k)}</div><div class="bn-h">${E(e.title||e.name||'Tracker alert')}${e.changed?' · '+E(e.changed):''}</div>${meme?`<div class="bn-meme">${meme}</div>`:''}</div>
   <div class="bn-tk"><span>${E([e.joke,e.sub,e.src?'source: '+e.src:'',new Date().toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'})+' ET','not financial advice'].filter(Boolean).join('  ///  '))}</span></div></div>`;
   sting(); setTimeout(()=>{ w.innerHTML=''; showing=false; setTimeout(next,400); },12000); }
 function floorAlive(){ return Date.now()-(+localStorage.getItem('dr_floorAlive')||0)<12000; }
 window.BreakingNews=function(e,fromBc){ if(!e) return; if(!fromBc&&bc) bc.postMessage(e);
   if(panel||!floorAlive()||LAY==='floor'){ if(QUEUE.length<8) QUEUE.push(e); next(); } };
 if(bc) bc.onmessage=m=>window.BreakingNews(m.data,true);
 function testBN(){ window.BreakingNews({title:'TEST: XRP Tracker alarm system online',kind:'TEST',meme:'party',memeLabel:'TEST',joke:'This is only a test of the breaking-news banner. Real alarms (about to trigger, triggered, about to revert, reverted, price and goal alerts) appear here.',src:'XRP Tracker'}); }
 window.TestBreakingNews=testBN;
 function mount(){ const sb=document.getElementById('btnSound'); if(sb&&!document.getElementById('btnBN')){ const b=document.createElement('button'); b.id='btnBN'; b.textContent='Test Breaking News'; b.onclick=testBN; sb.after(b); }
   if(LAY==='rig') return; /* top screens: TV lives on the 4th (floor) screen; banners still show there or here if the floor is closed */
   const root=LAY==='floor'?document.getElementById('floorRoot'):document.getElementById('app'); if(!root){ setTimeout(mount,800); return; }
   panel=build(); if(LAY==='floor'){ const bar=document.getElementById('flPager'); (bar||root.firstChild).before(panel); } else root.prepend(panel);
   tune(st.ch===77?1:(st.ch||1)); }
 setTimeout(mount,LAY==='floor'?1800:1200);
})();

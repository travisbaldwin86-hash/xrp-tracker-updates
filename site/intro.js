/* DEMAND RADAR · boot intro: a flame-particle phoenix rises from burning bills and coins. Original procedural art (canvas only).
   ~6.5 s, click or any key skips, 'INTRO' toggle in the alarm bar, GPU-light (one 2D canvas, sprite particles, capped counts). */
(function(){ 'use strict';
const LAY=new URLSearchParams(location.search).get('layout'); if(LAY==='floor') return;
const cfg=()=>LS.get('intro',{on:true});
function play(force){ if(!force&&(!cfg().on||sessionStorage.getItem('introPlayed')||window.LITE||matchMedia('(prefers-reduced-motion: reduce)').matches)) return; sessionStorage.setItem('introPlayed','1'); sessionStorage.setItem('booted','1');
  const cv=document.createElement('canvas'); cv.id='intro'; cv.setAttribute('aria-label','Intro animation: a phoenix of fire rises from burning money. Click or press any key to skip.'); document.body.appendChild(cv);
  const W=cv.width=innerWidth, H=cv.height=innerHeight, g=cv.getContext('2d'); const S=Math.min(H/1080,1.4), cx=W/2, base=H*0.86;
  // flame sprite
  const sp=document.createElement('canvas'); sp.width=sp.height=48; { const s=sp.getContext('2d'), gr=s.createRadialGradient(24,24,0,24,24,24); gr.addColorStop(0,'rgba(255,255,255,1)'); gr.addColorStop(.25,'rgba(255,255,255,.55)'); gr.addColorStop(1,'rgba(255,255,255,0)'); s.fillStyle=gr; s.fillRect(0,0,48,48); }
  const tint={}; const tinted=c=>{ if(tint[c]) return tint[c]; const t=document.createElement('canvas'); t.width=t.height=48; const s=t.getContext('2d'); s.drawImage(sp,0,0); s.globalCompositeOperation='source-in'; s.fillStyle=c; s.fillRect(0,0,48,48); return tint[c]=t; };
  const PAL=['#fff6d8','#ffd36b','#ff9a2e','#ff5a1f','#c4220f','#5a1a10'];
  const P=[], MAX=2400, A=[]; const rnd=(a,b)=>a+Math.random()*(b-a);
  // the pile: bills + coins (original simple shapes)
  const bills=Array.from({length:14},(_,i)=>({x:cx+rnd(-330,330)*S,y:base+rnd(-30,25)*S,r:rnd(-.6,.6),w:rnd(110,140)*S,h:rnd(48,58)*S,burn:rnd(.2,1.2)}));
  const coins=Array.from({length:11},(_,i)=>({x:cx+rnd(-300,300)*S,y:base+rnd(-38,30)*S,r:rnd(22,32)*S,tilt:rnd(.35,.7)}));
  function bill(b,t){ const k=Math.min(1,Math.max(0,(t-b.burn*0.6)/1.6)); g.save(); g.translate(b.x,b.y); g.rotate(b.r); const left=b.w*(1-k);
    if(left>2){ g.fillStyle=`rgb(${60+k*40|0},${110-k*60|0},${70-k*40|0})`; g.fillRect(-b.w/2,-b.h/2,left,b.h); g.strokeStyle='rgba(20,40,20,.8)'; g.lineWidth=2*S; g.strokeRect(-b.w/2+5*S,-b.h/2+5*S,Math.max(0,left-10*S),b.h-10*S);
      g.beginPath(); g.arc(-b.w/2+left*0.5,0,b.h*0.22,0,7); g.stroke(); g.fillStyle='rgba(255,140,40,.9)'; g.fillRect(-b.w/2+left-3*S,-b.h/2,4*S,b.h); }
    g.fillStyle='rgba(70,66,62,.85)'; g.fillRect(-b.w/2+left,-b.h/2+b.h*0.35,b.w-left,b.h*0.3); g.restore();
    if(k<1&&Math.random()<0.6) spawn(b.x+Math.cos(b.r)*(-b.w/2+left),b.y+Math.sin(b.r)*(-b.w/2+left),0.8); if(k>0&&Math.random()<0.15) ash(b.x+rnd(-b.w/2,b.w/2),b.y); }
  function coin(c,t){ g.save(); g.translate(c.x,c.y); g.scale(1,c.tilt); g.beginPath(); g.arc(0,0,c.r,0,7); const gl=Math.max(0,1-t/4); g.fillStyle=`rgb(${200+gl*40|0},${150+gl*40|0},${50})`; g.fill(); g.lineWidth=3*S; g.strokeStyle='#7a5512'; g.stroke();
    // simple self-drawn X mark (two arcs meeting, not the official logo)
    g.strokeStyle='#4a320a'; g.lineWidth=5*S; g.lineCap='round'; const r=c.r*0.48, q=r*0.22; g.beginPath(); g.moveTo(-r,-r); g.lineTo(-q,-q); g.moveTo(r,-r); g.lineTo(q,-q); g.moveTo(-r,r); g.lineTo(-q,q); g.moveTo(r,r); g.lineTo(q,q); g.stroke(); g.restore(); if(Math.random()<0.25) spawn(c.x+rnd(-c.r,c.r),c.y-c.r*c.tilt,0.6); }
  function spawn(x,y,s,vx,vy,life){ if(P.length>=MAX) return; P.push({x,y,vx:vx!=null?vx:rnd(-20,20)*S,vy:vy!=null?vy:rnd(-140,-60)*S,l:0,L:life||rnd(.5,1.1),s:(s||1)*rnd(10,22)*S}); }
  function ash(x,y){ if(A.length>260) return; A.push({x,y,vx:rnd(-15,15)*S,vy:rnd(-60,-20)*S,l:0,L:rnd(1.5,3)}); }
  // phoenix shape sampled each frame (wings flap with sin)
  function phoenixPoint(t,px,py,flap,open){ const u=Math.random(), sc=S*1.1;
    if(u<0.5){ const side=Math.random()<.5?-1:1, a=Math.pow(Math.random(),0.8), span=(330+open*120)*sc, lift=(150+flap*130)*sc*(.55+.45*open);
      const lead=-Math.sin(a*Math.PI*0.85)*lift+a*a*40*sc, feather=((1-a)*120+35+Math.abs(Math.sin(a*Math.PI*6))*55*a)*sc, v=Math.pow(Math.random(),1.6);
      return [px+side*(30*sc+a*span)+side*v*a*30*sc, py-40*sc+lead+v*feather]; }
    if(u<0.66){ const a=Math.random()*6.28, r=Math.sqrt(Math.random()); return [px+Math.cos(a)*34*sc*r, py+Math.sin(a)*100*sc*r]; }
    if(u<0.72){ const a=Math.random()*6.28, r=Math.sqrt(Math.random()); return [px+Math.cos(a)*24*sc*r, py-135*sc+Math.sin(a)*24*sc*r]; }
    if(u<0.74){ return [px+rnd(20,46)*sc, py-132*sc+rnd(-3,5)*sc]; }
    if(u<0.78){ const k=Math.floor(rnd(0,3)), a=Math.random(); return [px-(k*10-6)*sc-a*30*sc, py-150*sc-a*(50+k*18)*sc]; }
    const k=Math.floor(rnd(0,5)), a=Math.random(), ang=(k-2)*0.22; return [px+Math.sin(ang)*a*330*sc+Math.sin(a*8+t*6+k)*16*sc*a, py+95*sc+Math.cos(ang)*a*300*sc]; }
  const t0=performance.now(); let done=false, raf=0;
  const end=()=>{ if(done) return; done=true; cancelAnimationFrame(raf); cv.classList.add('out'); setTimeout(()=>cv.remove(),700); removeEventListener('keydown',end); };
  cv.addEventListener('pointerdown',end); addEventListener('keydown',end); setTimeout(end,7200);
  let last=t0;
  function frame(now){ const t=(now-t0)/1000, dt=Math.min(.05,(now-last)/1000); last=now;
    g.globalCompositeOperation='source-over'; g.fillStyle='rgba(3,5,12,0.35)'; g.fillRect(0,0,W,H);
    if(t<0.3){ g.fillStyle='#03050c'; g.fillRect(0,0,W,H); }
    // ground glow
    const gg=g.createRadialGradient(cx,base,0,cx,base,420*S); gg.addColorStop(0,`rgba(255,120,30,${Math.min(.45,t*.3)})`); gg.addColorStop(1,'rgba(255,80,20,0)'); g.fillStyle=gg; g.fillRect(0,0,W,H);
    bills.forEach(b=>bill(b,t)); coins.forEach(c=>coin(c,t));
    // phoenix rises 1.4 s → 4.6 s, spreads wings, hovers
    if(t>1.2){ const k=Math.min(1,(t-1.2)/3.2), e=1-Math.pow(1-k,3); const px=cx, py=base-60*S-e*(H*0.48); const open=Math.min(1,Math.max(0,(t-3.4)/1.2)); const flap=Math.sin(t*5.2)*(1-open*0.6);
      const n=Math.min(120,40+t*20); for(let i=0;i<n;i++){ const [x,y]=phoenixPoint(t,px,py,flap,open); spawn(x,y,0.75+open*0.4,rnd(-12,12)*S,rnd(-70,-20)*S,rnd(.25,.6)); }
      if(open>0){ const hg=g.createRadialGradient(px,py,0,px,py,380*S); hg.addColorStop(0,`rgba(255,200,90,${.18*open})`); hg.addColorStop(1,'rgba(255,120,40,0)'); g.globalCompositeOperation='lighter'; g.fillStyle=hg; g.fillRect(px-400*S,py-400*S,800*S,800*S); } }
    // particles
    g.globalCompositeOperation='lighter';
    for(let i=P.length-1;i>=0;i--){ const p=P[i]; p.l+=dt; if(p.l>=p.L){ P.splice(i,1); continue; } p.x+=p.vx*dt; p.y+=p.vy*dt; p.vy-=30*S*dt; const q=p.l/p.L, c=PAL[Math.min(PAL.length-1,(q*PAL.length)|0)], s=p.s*(1-q*0.6); g.globalAlpha=(1-q)*0.9; g.drawImage(tinted(c),p.x-s/2,p.y-s/2,s,s); }
    g.globalAlpha=1; g.globalCompositeOperation='source-over';
    for(let i=A.length-1;i>=0;i--){ const a=A[i]; a.l+=dt; if(a.l>=a.L){ A.splice(i,1); continue; } a.x+=a.vx*dt+Math.sin(a.l*3)*0.3; a.y+=a.vy*dt; g.fillStyle=`rgba(150,140,130,${(1-a.l/a.L)*.7})`; g.fillRect(a.x,a.y,2.4*S,2.4*S); }
    // title
    if(t>4.0){ const k=Math.min(1,(t-4.0)/0.9); g.globalAlpha=k; g.textAlign='center'; g.font=`600 ${Math.round(64*S)}px "JetBrains Mono",ui-monospace,monospace`; g.shadowColor='#3ee6d6'; g.shadowBlur=26*S; g.fillStyle='#e8f3ff'; g.fillText('XRP COMMAND // ONLINE',cx,H*0.075); g.shadowBlur=0;
      g.font=`${Math.round(24*S)}px ui-monospace,monospace`; g.fillStyle='#a9bdd6'; g.fillText('linking XRP Ledger · prices · filings · news …   (click or press any key to skip)',cx,H*0.075+44*S); g.globalAlpha=1; }
    if(t>6.4) return end(); raf=requestAnimationFrame(frame); }
  raf=requestAnimationFrame(frame); }
window.Intro={play,cfg,set(on){ LS.set('intro',{on}); }};
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>play()); else play();
})();

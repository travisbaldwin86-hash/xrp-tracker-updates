/* 10,000 XRP Goal tile: live value of 10,000 XRP (shared price feed, Coinbase fallback) + 24h change in $ */
(function(){ const C=Object.assign({xrp:10000,costBasis:1.54},window.GOAL_CFG||{}); const N=+C.xrp, CB=+C.costBasis; let open24=null, cbPx=null;
  const css=document.createElement('style'); css.textContent=`#goalTile{position:fixed;right:14px;bottom:14px;z-index:60;min-width:190px;padding:8px 14px 9px;border-radius:12px;
  background:linear-gradient(160deg,#0b1a2aee,#07111ddd);border:1px solid var(--cyan,#2fe6ff);box-shadow:0 0 14px #2fe6ff33,inset 0 0 10px #2fe6ff14;
  font-family:var(--mono,monospace);color:#dff6ff;pointer-events:auto;user-select:none}
  #goalTile .gk{font-size:10px;letter-spacing:3px;color:var(--cyan,#2fe6ff);display:flex;justify-content:space-between;gap:10px}
  #goalTile .gv{font-size:24px;font-weight:700;letter-spacing:.5px;margin-top:2px;text-shadow:0 0 8px #2fe6ff55}
  #goalTile .gc{font-size:12px;margin-top:1px}#goalTile .up{color:#3dffa0}#goalTile .dn{color:#ff5470}#goalTile .gp{display:flex;justify-content:space-between;gap:10px;font-size:11px;margin-top:2px;color:#a9c3d6}#goalTile .gp b{color:inherit}#goalTile .gp.up b{color:#3dffa0}#goalTile .gp.dn b{color:#ff5470}#goalTile .gs{font-size:9px;color:#7f98ad;margin-top:2px}`;
  document.head.appendChild(css);
  const el=document.createElement('div'); el.id='goalTile'; el.title='Live value of 10,000 XRP'; document.body.appendChild(el);
  const usd=v=>'$'+v.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
  function pl(p){ if(!(CB>0)) return ''; const cost=CB*N, d=p*N-cost, pc=d/cost*100, c=d>=0?'up':'dn';
    return `<div class="gp"><span>Cost @ $${CB.toFixed(2)}</span><b>${usd(cost)}</b></div><div class="gp ${c}"><span>Unrealized P/L</span><b>${d>=0?'+':'−'}${usd(Math.abs(d))} (${d>=0?'+':'−'}${Math.abs(pc).toFixed(1)}%)</b></div>`; }
  async function cb(){ try{ const r=await fetch('https://api.exchange.coinbase.com/products/XRP-USD/stats'); const j=await r.json(); if(+j.open>0) open24=+j.open; if(+j.last>0) cbPx=+j.last; }catch(e){} }
  function draw(){ let p=null, ch=null, src='Coinbase';
    try{ const v=(typeof D!=='undefined')&&D.px&&D.px.v; if(v&&v.xrp>0){ p=v.xrp; src=(D.px.src||'').split(' ')[0]||'live'; if(v.xrpCh!=null) ch=p-p/(1+v.xrpCh/100); } }catch(e){}
    if(!(p>0)) p=cbPx; if(ch==null&&open24&&p) ch=p-open24;
    if(!(p>0)){ el.innerHTML='<div class="gk"><span>10,000 XRP GOAL</span></div><div class="gv">loading…</div>'; return; }
    const d=ch==null?null:ch*N;
    el.innerHTML=`<div class="gk"><span>◆ ${N.toLocaleString()} XRP GOAL</span><span>@ $${p.toFixed(4)}</span></div><div class="gv">${usd(p*N)}</div>`+
      (d==null?'<div class="gc">24h: n/a</div>':`<div class="gc ${d>=0?'up':'dn'}">${d>=0?'▲ +':'▼ −'}${usd(Math.abs(d))} 24h</div>`)+pl(p)+`<div class="gs">${src} · ${new Date().toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'})} ET</div>`; }
  cb().then(draw); setInterval(cb,60000); setInterval(draw,3000); draw();
})();

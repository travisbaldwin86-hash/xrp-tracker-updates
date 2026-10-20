/* DEMAND RADAR · SUPPLY & RULES: direct-fetch (no relay) context feeds.
   XRPL amendments (XRPSCAN), stablecoin league (DefiLlama), US rules (Federal Register API), Ripple escrow + exchange reserves
   measured on-ledger (XRPL JSON-RPC, XRPSCAN public labels only), payment quality (XRPL stream), event calendar.
   Polling is gentle: amendments/DefiLlama 10 min, Federal Register 30 min, escrow 6 h, exchange reserves 30 min. */
(function(){ 'use strict';
const Q=s=>document.querySelector(s);
const X=window.EX=LS.get('extras',{am:{},fr:[],frSeen:null,esc:[],res:[],cal:{}}); const save=()=>LS.set('extras',X);
const ago=t=>{ const s=(Date.now()-t)/1e3; return s<5400?Math.round(s/60)+' min':s<172800?Math.round(s/3600)+' h':Math.round(s/86400)+' d'; };
/* ---- RUMOR rule: these institutions have NOT adopted XRP/XRPL; a headline claiming so is a rumor unless the institution itself says it ---- */
const RUM_INST=/\b(DTCC|Depository Trust|SWIFT|Swift|BIS|Agor[aá]|Project Nexus|mBridge|ECB|Pontes|Appia)\b/, RUM_X=/\b(XRP|XRPL|Ripple|RLUSD)\b/i, RUM_OK=/(^|\.)(dtcc\.com|swift\.com|bis\.org|ecb\.europa\.eu)$/i;
window.isRumor=(title,domain)=>RUM_INST.test(title||'')&&RUM_X.test(title||'')&&!RUM_OK.test(domain||'');
INFO.rumor='RUMOR = a headline links XRP/Ripple to DTCC, Swift\'s ledger, BIS projects (Agorá, Nexus, mBridge) or the ECB (Pontes, Appia). As of Oct 2026 none of these use XRP or the XRP Ledger. The tag stays until the institution itself confirms it on its own site.';
const _rn=window.renderNews; if(_rn) window.renderNews=function(){ _rn(); try{ document.querySelectorAll('#newsFeed .row').forEach(r=>{ const a=r.querySelector('a'), src=(r.querySelector('.hint')||{}).textContent||''; if(a&&!r.querySelector('.rumor')&&isRumor(a.textContent,src.replace(/[·\s]/g,''))) a.insertAdjacentHTML('beforebegin','<span class="pill rumor" data-info="rumor" title="'+esc(INFO.rumor)+'">RUMOR</span> '); }); }catch(e){} };
/* ---- 1. XRPL amendments ---- */
async function amendments(){ try{ const a=await fetchJSON('https://api.xrpscan.com/api/v1/amendments',{},20000); const prev=X.am||{}, now={};
  a.forEach(m=>{ const k=m.name; const st=m.enabled?'enabled':m.majority?'majority':'voting'; now[k]={st,count:m.count,th:m.threshold,val:m.validations,maj:m.majority?(m.majority+946684800)*1000:null};
    const p=prev[k]; if(!p||!X.amT) return;
    if(p.st!==st){ const L={enabled:['ENABLED',`${k} is now live on the XRP Ledger.`,2],majority:['80% REACHED',`${k} reached 80% of validators; it switches on in 14 days if support holds.`,2],voting:[p.st==='majority'?'LOST 80%':'VOTING',`${k} ${p.st==='majority'?'dropped below 80%; the 14-day timer reset':'is being voted on'}.`,1]}[st];
      fireEvent({key:'am_'+k+'_'+st,name:'XRPL amendment '+L[0]+': '+k,level:L[2],meme:'chain',memeLabel:'LEDGER UPGRADE',joke:L[1],src:'XRPSCAN amendments',t:Date.now(),link:'https://xrpl.org/resources/known-amendments'}); } });
  X.am=now; X.amT=Date.now(); save(); }catch(e){ X.amErr=e.message; } render(); }
/* ---- 2. stablecoin league (DefiLlama) ---- */
async function llama(){ try{ const j=await fetchJSON('https://stablecoins.llama.fi/stablecoins?includePrices=false',{},25000); const a=j.peggedAssets||[]; const v=x=>(x.circulating||{}).peggedUSD||0, pw=x=>(x.circulatingPrevWeek||{}).peggedUSD||0;
  const tot=a.reduce((s,x)=>s+v(x),0), pick=s=>a.find(x=>x.symbol===s); const rows=['USDT','USDC','PYUSD','RLUSD'].map(s=>{ const x=pick(s); return x?{s,now:v(x),wk:pw(x)}:null; }).filter(Boolean);
  const rl=rows.find(r=>r.s==='RLUSD'); const prev=X.llama; X.llama={t:Date.now(),tot,rows,rank:a.slice().sort((p,q)=>v(q)-v(p)).findIndex(x=>x.symbol==='RLUSD')+1};
  if(prev&&rl){ const p0=prev.rows.find(r=>r.s==='RLUSD'); if(p0&&Math.abs(rl.now/p0.now-1)>=0.02) fireEvent({key:'ll_'+Math.round(rl.now/1e7),name:`RLUSD supply ${rl.now>p0.now?'↑':'↓'} ${(Math.abs(rl.now/p0.now-1)*100).toFixed(1)}% (all chains)`,level:1,meme:'vault',memeLabel:'RLUSD SUPPLY',joke:'DefiLlama: RLUSD across all chains moved more than 2% since the last check.',src:'DefiLlama',t:Date.now()}); }
  save(); }catch(e){ X.llErr=e.message; } render(); }
/* ---- 3. US rules: Federal Register (official, CORS-open) ---- */
const FR_TERMS=['"GENIUS Act"','stablecoin','"crypto asset"','"digital commodity"','"payment stablecoin"'];
async function fedreg(){ try{ const out=[]; for(const term of FR_TERMS){ const j=await fetchJSON('https://www.federalregister.gov/api/v1/documents.json?per_page=8&order=newest&conditions%5Bterm%5D='+encodeURIComponent(term),{},20000);
      (j.results||[]).forEach(d=>{ if(!out.find(o=>o.n===d.document_number)) out.push({n:d.document_number,date:d.publication_date,type:d.type,title:d.title,url:d.html_url,ag:(d.agencies||[]).map(a=>a.raw_name||a.name).join(', '),term}); }); await sleep(800); }
    out.sort((a,b)=>b.date.localeCompare(a.date)); const seen=new Set(X.frSeen||[]);
    out.forEach(d=>{ if(seen.has(d.n)) return; seen.add(d.n); if(!X.frSeen) return; d.isNew=1; const fin=/^Rule$/.test(d.type);
      fireEvent({key:'fr_'+d.n,name:(fin?'FINAL RULE: ':d.type==='Proposed Rule'?'Proposed rule: ':'Federal Register: ')+d.title.slice(0,80),level:fin?3:2,meme:'radio',memeLabel:fin?'NEW US RULE':'RULE PROPOSED',joke:`${d.ag||'A US agency'} published "${d.title}" (${d.type}, ${d.date}). Official text; check what it covers before assuming anything.`,src:'Federal Register API',t:Date.now(),link:d.url}); });
    X.fr=out.slice(0,30); X.frSeen=[...seen].slice(-800); X.frT=Date.now(); save(); }catch(e){ X.frErr=e.message; } render(); }
/* ---- 4. calendar (maintained from official calendars) ---- */
const CAL=[
 {k:'fomc',t:Date.parse('2026-10-28T14:00:00-04:00'),n:'FOMC rate decision',m:'Fed interest-rate decision; moves all risk assets',u:'https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm'},
 {k:'cpi',t:Date.parse('2026-11-10T08:30:00-05:00'),n:'US CPI (inflation) release',m:'Inflation number; can swing rate expectations',u:'https://www.bls.gov/schedule/news_release/cpi.htm'},
 {k:'esc',t:(()=>{ const d=new Date(); return new Date(d.getFullYear(),d.getMonth()+1,1,0,0).getTime(); })(),n:'Ripple escrow monthly unlock',m:'Escrow contracts mature on the 1st (UTC); watch how much is re-locked',u:'https://xrpscan.com/'},
 {k:'genius',t:Date.parse('2027-01-18T00:00:00-05:00'),n:'GENIUS Act takes effect (expected)',m:'US stablecoin rules start to apply',u:'https://www.federalregister.gov/documents/search?conditions%5Bterm%5D=%22GENIUS+Act%22'}];
function calTick(){ const n=Date.now(); CAL.concat(amCal()).forEach(c=>{ [['24h',864e5],['1h',36e5]].forEach(([l,ms])=>{ const key=c.k+'_'+l+'_'+c.t; if(c.t-n<=ms&&c.t-n>0&&!X.cal[key]){ X.cal[key]=1; save(); fireEvent({key:'cal_'+key,name:`In ${l==='1h'?'1 hour':'24 hours'}: ${c.n}`,level:l==='1h'?2:1,meme:'radio',memeLabel:'COMING UP',joke:c.m+'. Scheduled event, not a prediction.',src:'Event calendar',t:n,link:c.u}); } }); }); }
function amCal(){ return Object.entries(X.am||{}).filter(([k,v])=>v.st==='majority'&&v.maj).map(([k,v])=>({k:'am_'+k,t:v.maj+14*864e5,n:'XRPL amendment '+k+' switches on (if 80% holds)',m:'Ledger feature activation',u:'https://xrpl.org/resources/known-amendments'})); }
/* ---- 5. on-ledger escrow total + exchange reserves (XRPSCAN labels only; never guessed) ---- */
const names=()=>{ const g=(typeof NAMES!=='undefined'&&NAMES)||{}; return Object.keys(g).length?g:(LS.get('names',{}).map||{}); };
const EXCH=/^(Binance|Upbit|Bithumb|Coinbase|Kraken|Bitstamp|Bitso|OKX|OKEx|Bitfinex|Bybit|KuCoin|Huobi|HTX|Gate\.?io|Crypto\.com|Bitget|Coinone|Korbit|Bitbank|SBI VC|Uphold|Gemini|MEXC|Coins\.ph|BTC Markets|Independent Reserve|Luno|Bitvavo|WhiteBIT|CoinCheck|Coincheck|bitFlyer|BitMart|Poloniex|Bittrex|LBank|BingX|Robinhood)\b/i;
async function escrowTotal(){ const m=names(); const acc=Object.keys(m).filter(a=>/^Ripple( \d+| Labs)?$/i.test(String(m[a]).trim())); if(!acc.length) return; let tot=0, n=0, ok=0;
  for(const a of acc){ try{ let marker; do{ const {r}=await xrpl('account_objects',{account:a,type:'escrow',ledger_index:'validated',limit:400,...(marker?{marker}:{})}); (r.account_objects||[]).forEach(o=>{ if(typeof o.Amount==='string'&&o.Account===a){ tot+=+o.Amount/1e6; n++; } }); marker=r.marker; }while(marker); ok++; }catch(e){} await sleep(300); }
  if(!ok) return; const prev=X.esc[0]; X.esc.unshift({t:Date.now(),tot,n,acc:acc.length,ok}); X.esc=X.esc.slice(0,120);
  if(prev&&Math.abs(tot-prev.tot)>=1e7){ const d=tot-prev.tot; fireEvent({key:'esct_'+Math.round(tot/1e6),name:`Ripple escrow ${d>0?'re-locked':'released'} ${fN(Math.abs(d))} XRP (on-ledger)`,level:Math.abs(d)>=3e8?2:1,meme:'vault',memeLabel:d>0?'ESCROW RELOCK':'ESCROW RELEASE',joke:`XRP held in escrow by XRPScan-labelled Ripple accounts changed from ${fN(prev.tot)} to ${fN(tot)} (measured on the ledger).`,src:'XRPL account_objects',t:Date.now()}); }
  save(); render(); }
async function reserves(){ const m=names(); const acc=Object.keys(m).filter(a=>EXCH.test(String(m[a]))).slice(0,260); if(!acc.length) return; let tot=0, ok=0; const per={};
  for(let i=0;i<acc.length;i++){ const a=acc[i]; try{ const {r}=await xrpl('account_info',{account:a,ledger_index:'validated'}); const b=+r.account_data.Balance/1e6; tot+=b; ok++; const ex=String(m[a]).match(EXCH)[1]; per[ex]=(per[ex]||0)+b; }catch(e){} if(i%4===3) await sleep(1000); }
  if(!ok) return; const day=X.res.find(r=>Date.now()-r.t>=23*36e5); X.res.unshift({t:Date.now(),tot,ok,n:acc.length,per}); X.res=X.res.slice(0,200);
  if(day&&Math.abs(tot/day.tot-1)>=0.02){ const up=tot>day.tot; fireEvent({key:'res_'+new Date().toDateString()+up,name:`Exchange XRP reserves ${up?'↑':'↓'} ${(Math.abs(tot/day.tot-1)*100).toFixed(1)}% in 24 h`,level:2,meme:up?'megaphone':'vault',memeLabel:up?'XRP TO EXCHANGES':'XRP LEAVING EXCHANGES',joke:`Balances of ${ok} XRPScan-labelled exchange wallets: ${fN(day.tot)} → ${fN(tot)} XRP. ${up?'More XRP sitting on exchanges (available to sell).':'XRP moving off exchanges (often into custody).'} Labels are incomplete.`,src:'XRPL account_info + XRPScan labels',t:Date.now()}); }
  save(); render(); }
/* ---- 6. payment quality from the live stream: real vs dust/spam ---- */
const PQ=window.PQ={real:[],spam:[]}; const trim=a=>{ const c=Date.now()-6e5; while(a.length&&a[0]<c) a.shift(); };
function hook(){ const w=(typeof ws!=='undefined')?ws:null; if(!w||w.__pq) return; w.__pq=1; w.addEventListener('message',ev=>{ let m; try{ m=JSON.parse(ev.data); }catch(e){ return; } if(m.type!=='transaction'||!m.validated) return; const tx=m.transaction||m.tx_json||{}; if(tx.TransactionType!=='Payment') return;
  const del=(m.meta||{}).delivered_amount; const self=tx.Account===tx.Destination; let spam=self||m.engine_result!=='tesSUCCESS';
  if(!spam){ if(typeof del==='string') spam=+del<1000; else if(del&&del.value!=null) spam=+del.value<1e-6; else spam=true; }
  (spam?PQ.spam:PQ.real).push(Date.now()); trim(PQ.real); trim(PQ.spam); }); }
setInterval(hook,3000);
INFO.extras='SUPPLY & RULES. Ledger upgrades = XRPL amendments and validator votes (XRPSCAN; 80% for 14 days switches a feature on). Stablecoin league = DefiLlama circulating supply, all chains. US rules = Federal Register (official) documents mentioning the GENIUS Act, stablecoins, crypto assets or digital commodities. Escrow = XRP locked in escrow by accounts XRPScan labels "Ripple", read from the ledger. Exchange reserves = XRP balances of XRPScan-labelled exchange wallets (labels are incomplete, so this is a partial count). Real payments = share of payments in the last 10 min that delivered at least 0.001 XRP (or a real token amount) to someone else; the rest is dust, self-payments or failed spam. Calendar = official dates.';
/* ---- render ---- */
function ensure(){ if(Q('#extras')) return; const s=document.createElement('section'); s.id='extras'; s.className='panel'; s.innerHTML='<div class="panel-head"><h2 data-info="extras">Supply &amp; rules</h2><span class="hint">official + on-ledger · hover for source</span></div><div id="exBody"></div>'; (Q('#world')||Q('#holders')||document.body).after(s); }
function render(){ const el=Q('#exBody'); if(!el) return; const n=Date.now();
  const rq=PQ.real.length+PQ.spam.length, real=rq?PQ.real.length/rq*100:null, e0=X.esc[0], e1=X.esc.find(r=>n-r.t>20*864e5), r0=X.res[0], r1=X.res.find(r=>n-r.t>=23*36e5);
  const ll=X.llama, rl=ll&&ll.rows.find(r=>r.s==='RLUSD');
  const big=(k,v,m,tip,cls)=>`<div class="ex-b ${cls||''}" title="${esc(tip)}"><span>${k}</span><b>${v}</b><em>${m}</em></div>`;
  let h='<div class="ex-sum">'+
   big('REAL PAYMENTS',real==null?'…':real.toFixed(0)+'%',real==null?'listening to the ledger':`${PQ.real.length} real vs ${PQ.spam.length} dust/spam in 10 min`,INFO.extras,real==null?'':real>=60?'g':real>=35?'a':'r')+
   big('XRP IN RIPPLE ESCROW',e0?fN(e0.tot):'…',e0?(e1?`${e0.tot>=e1.tot?'▲':'▼'} ${fN(Math.abs(e0.tot-e1.tot))} vs ${ago(e1.t)} ago`:`${e0.n} escrows · measured ${ago(e0.t)} ago`):'measured on the ledger every 6 h','On-ledger sum of escrow objects owned by XRPScan-labelled Ripple accounts. Secondary-source figures are not used.')+
   big('EXCHANGE RESERVES',r0?fN(r0.tot):'…',r0&&r1?`${r0.tot>=r1.tot?'▲ more on exchanges':'▼ leaving exchanges'} ${(Math.abs(r0.tot/r1.tot-1)*100).toFixed(1)}% / 24 h`:r0?`${r0.ok} labelled wallets`:'labelled exchange wallets',`Sum of XRP balances in ${r0?r0.ok:'?'} wallets XRPScan labels as exchanges (partial: many exchange wallets are unlabelled).`,r0&&r1?(r0.tot<r1.tot?'g':'a'):'')+
   big('RLUSD RANK',rl?'#'+ll.rank:'…',rl?`$${fN(rl.now)} · ${(rl.now/ll.tot*100).toFixed(2)}% of all stablecoins · ${rl.now>=rl.wk?'▲':'▼'} ${(Math.abs(rl.now/rl.wk-1)*100).toFixed(1)}% / wk`:'DefiLlama',ll?ll.rows.map(r=>r.s+' $'+fN(r.now)).join(' · ')+' · total $'+fN(ll.tot)+' · '+fT(ll.t):'DefiLlama')+'</div>';
  const vot=Object.entries(X.am||{}).filter(([k,v])=>v.st!=='enabled'&&v.count>0).sort((a,b)=>b[1].count-a[1].count).slice(0,5);
  h+='<div class="ex-h">LEDGER UPGRADES (validator votes)</div>'+vot.map(([k,v])=>{ const p=v.val?v.count/v.val*100:0; return `<div class="ex-am" title="${esc(k+': '+v.count+' of '+v.val+' validators ('+p.toFixed(0)+'%), needs 80% for 14 days')}"><b>${esc(k)}</b><div class="ex-bar"><i style="width:${Math.min(100,p)}%" class="${v.st==='majority'?'g':''}"></i><s style="left:80%"></s></div><em>${v.st==='majority'?'ON '+new Date(v.maj+14*864e5).toLocaleDateString('en-US',{month:'short',day:'numeric'})+' if held':p.toFixed(0)+'%'}</em></div>`; }).join('');
  h+='<div class="ex-h">US RULES (Federal Register)</div>'+(X.fr||[]).slice(0,4).map(d=>`<a class="ex-fr" href="${d.url}" target="_blank" rel="noopener" title="${esc(d.ag+' · '+d.type+' · '+d.date)}"><span class="pill ${d.type==='Rule'?'g':d.type==='Proposed Rule'?'a':''}">${d.type==='Rule'?'FINAL':d.type==='Proposed Rule'?'PROPOSED':'NOTICE'}</span> ${esc(d.title.slice(0,90))} <em>${d.date}</em></a>`).join('');
  h+='<div class="ex-h">COMING UP (ET)</div><div class="ex-cal">'+CAL.concat(amCal()).filter(c=>c.t>n).sort((a,b)=>a.t-b.t).slice(0,5).map(c=>`<a href="${c.u}" target="_blank" rel="noopener" title="${esc(c.m)}"><b>${new Date(c.t).toLocaleString('en-US',{timeZone:'America/New_York',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})} ET</b> ${esc(c.n)} <em>in ${ago(n*2-c.t).replace(' ','\u00a0')}</em></a>`).join('')+'</div>';
  el.innerHTML=h; }
document.addEventListener('DOMContentLoaded',()=>{ ensure(); render(); }); if(document.readyState!=='loading'){ ensure(); render(); }
const ev=(ms,fn)=>setInterval(()=>{ if(!document.hidden) fn(); },ms);
window.EXF={amendments,llama,fedreg,escrowTotal,reserves,calTick,render}; /* refresh cadence lives in sched.js (15 s heartbeat, per-source limits) */



})();

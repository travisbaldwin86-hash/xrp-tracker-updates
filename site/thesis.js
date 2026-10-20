/* DEMAND RADAR · LONG-TERM THESIS MONITOR + strict ADOPTION LEDGER + helper-only feeds + rig fit layout.
   No verdicts, no scores, no predictions. Evidence = measured data or verified documents, each with source, date, confidence.
   Every field defaults to "UNKNOWN / not established" until evidence is attached. XRP use is never inferred from a Ripple headline. */
(function(){ 'use strict';
const Q=s=>document.querySelector(s), QA=s=>[...document.querySelectorAll(s)];
const LAY=new URLSearchParams(location.search).get('layout'), RIG=LAY==='rig', FLOOR=LAY==='floor';
const UNK='UNKNOWN / not established';
const T=LS.get('thesis',{log:{},snap:[],start:Date.now()}); const save=()=>LS.set('thesis',T);
const dstr=t=>{ try{ return new Date(t).toLocaleDateString('en-US',{timeZone:'America/New_York',month:'short',day:'numeric',year:'numeric'}); }catch(e){ return ''; } };
const day=t=>new Date(t).toLocaleDateString('en-CA',{timeZone:'America/New_York'});
const pct=(a,b)=>b?((a/b-1)*100):null, sgn=v=>(v>=0?'+':'')+v.toFixed(1)+'%';
const avg=a=>a.length?a.reduce((s,x)=>s+x,0)/a.length:null;
function dailyTrend(k){ const d=val('daily'); if(!d||d.length<90) return null; const a=avg(d.slice(-30).map(x=>+x[k]||0)), b=avg(d.slice(-90).map(x=>+x[k]||0)); return {a,b,p:pct(a,b),last:d[d.length-1].t}; }
function snapTrend(f,days){ const s=T.snap.filter(x=>x[f]!=null); if(s.length<2) return null; const now=s[s.length-1], old=s.find(x=>Date.parse(now.d)-Date.parse(x.d)>=days*864e5*0.9); if(!old) return null; return {p:pct(now[f],old[f]),from:old.d,to:now.d,a:now[f],b:old[f]}; }
const ARW=p=>p==null?'':p>3?'▲':p<-3?'▼':'►';

/* ---------- daily snapshot of measured values (persisted, builds over time) ---------- */
function snapshot(){ const X=window.EX||{}, rf=LS.get('rf',{}), amm=val('amm'), H=window.HOLD||[];
  const s={d:day(Date.now()), hold:H.filter(h=>h.st==='v'&&h.xrp).reduce((a,h)=>a+h.xrp,0)||null, res:X.res&&X.res[0]&&X.res[0].tot||null, esc:X.esc&&X.esc[0]&&X.esc[0].tot||null, amm:amm&&amm.xrp||null, rlx:rf.cur&&rf.cur.x||null, rltot:rf.cur&&rf.cur.tot||null, access:accessItems().length};
  const i=T.snap.findIndex(x=>x.d===s.d); if(i>=0) T.snap[i]={...T.snap[i],...Object.fromEntries(Object.entries(s).filter(([k,v])=>v!=null))}; else T.snap.push(s); T.snap=T.snap.slice(-500); }

/* ---------- evidence ---------- */
const host=u=>{ try{ return new URL(u).host.replace(/^www\./,''); }catch(e){ return ''; } };
function accessItems(){ const H=window.HOLD||[], W=window.WW_DEALS||[];
  return [...H.filter(h=>h.st==='v'&&/ETF/.test(h.k)).map(h=>({n:h.n+' ('+h.tk+')',u:h.url,d:h.asof,k:'fund'})), ...W.filter(w=>/licen|registration|trust|recognised|charter|MPI|VASP|AFSL/i.test(w.ty)&&w.st!=='ended').map(w=>({n:w.c+': '+w.ty,u:w.u,d:w.d,k:'licence'}))]; }
function evidence(){ const X=window.EX||{}, rf=LS.get('rf',{}), H=window.HOLD||[], PQ=window.PQ, coins=val('coins'), amm=val('amm');
  const E={1:{s:[],c:[],u:[]},2:{s:[],c:[],u:[]},3:{s:[],c:[],u:[]},4:{s:[],c:[],u:[]},5:{s:[],c:[],u:[]}};
  const add=(q,side,key,txt,src,url,t,conf)=>E[q][side].push({key:q+':'+key,txt,src,url,t,conf});
  /* Q1 sustained demand */
  const ev=H.find(h=>h.tk==='XRPN'); if(ev) add(1,'s','evernorth',`Evernorth went from no XRP to about ${fN(ev.xrp,0)} XRP when its merger closed.`,ev.src,ev.url,Date.parse(ev.asof),'MED');
  const etf=H.filter(h=>h.st==='v'&&/ETF/.test(h.k)); const etfTot=etf.reduce((a,h)=>a+h.xrp,0);
  if(etf.length) add(1,'s','etfhold',`US XRP funds held ${fN(etfTot,0)} XRP at their last filings (most as of Jun 30 2026).`,'Fund 10-Q filings + REX issuer page','https://efts.sec.gov/LATEST/search-index?q=%22XRP%22&forms=10-Q',Date.parse('2026-06-30'),'HIGH');
  const ht=snapTrend('hold',30); if(ht&&Math.abs(ht.p)>0.1) add(1,ht.p>0?'s':'c','holdtrend',`Verified fund/treasury holdings ${ht.p>0?'rose':'fell'} ${sgn(ht.p)} between ${ht.from} and ${ht.to} (as filings update).`,'Tracker snapshots of verified holdings','',Date.now(),'MED');
  add(1,'u','etfflow','Daily ETF holdings and flows since Jun 30 2026: issuer pages need the helper and are script-rendered, so not measured yet.','—','',null,'—');
  add(1,'u','otc','Off-exchange (OTC) buying by institutions is not publicly reported in real time.','—','',null,'—');
  /* Q2 supply pressure (supporting = pressure easing) */
  const e0=X.esc&&X.esc[0], e1=X.esc&&X.esc.find(r=>Date.now()-r.t>20*864e5);
  if(e0&&e1){ const d=e0.tot-e1.tot; add(2,d<0?'c':'s','escrow',`XRP in Ripple escrow ${d<0?'fell':'rose'} ${fN(Math.abs(d),0)} since ${dstr(e1.t)} (${d<0?'released into circulation, before any re-lock':'more re-locked than released'}).`,'XRPL account_objects, Ripple-labelled accounts','https://xrpscan.com/account/rB3WNZc45gxzW31zxfXdkx8HusAhoqscPn',e0.t,'HIGH'); }
  else if(e0) add(2,'u','escrow',`XRP in Ripple escrow is ${fN(e0.tot,0)} (measured ${dstr(e0.t)}); the tracker needs about 20 days of its own readings to show a change.`,'XRPL account_objects','',e0.t,'HIGH');
  else add(2,'u','escrow','Ripple escrow total: measuring on the ledger (every 6 h).','XRPL','',null,'—');
  const rt=snapTrend('res',30); const r0=X.res&&X.res[0];
  if(rt) add(2,rt.p<0?'s':'c','reserves',`XRP on labelled exchange wallets ${rt.p<0?'fell':'rose'} ${sgn(rt.p)} over 30 days (${rt.p<0?'less XRP sitting on exchanges':'more XRP sitting on exchanges'}).`,'XRPL balances of XRPScan-labelled exchange wallets','https://xrpscan.com/',Date.now(),'MED');
  else if(r0) add(2,'u','reserves',`Labelled exchange wallets hold ${fN(r0.tot,0)} XRP now; 30 days of readings are needed for a trend (labels are incomplete).`,'XRPL + XRPScan labels','',r0.t,'MED');
  const bt=dailyTrend('fee_total'); if(bt&&coins) add(2,'u','burn',`Fees burn about ${fN(bt.a,0)} XRP a day: too small to change supply pressure (${(bt.a*365/coins.total*100).toFixed(4)}% a year).`,'XRPSCAN daily metrics','https://xrpscan.com/metrics',bt.last,'HIGH');
  add(2,'u','rsales','Ripple\'s own XRP sales are not reported in real time; ledger moves from Ripple wallets are shown in the Ripple Family strip.','—','',null,'—');
  /* Q3 access */
  const ac=accessItems(); const funds=ac.filter(a=>a.k==='fund'), lic=ac.filter(a=>a.k==='licence');
  if(funds.length) add(3,'s','funds',`${funds.length} US-listed XRP funds hold XRP per their own filings or issuer page.`,'SEC 10-Q filings, REX issuer page','https://efts.sec.gov/LATEST/search-index?q=%22XRP%22&forms=10-Q',Date.parse('2026-10-15'),'HIGH');
  if(lic.length) add(3,'s','lic',`Ripple holds ${lic.length} verified licences or registrations in the tracked list (latest: ${lic.sort((a,b)=>String(b.d).localeCompare(String(a.d)))[0].n}).`,'Regulator and Ripple releases (World panel)',lic[0].u,Date.parse(lic[0].d)||null,'HIGH');
  const at=snapTrend('access',30); if(at&&at.p) add(3,at.p>0?'s':'c','acctr',`Verified access items ${at.p>0?'grew':'shrank'} from ${at.b} to ${at.a} over 30 days.`,'Tracker snapshots','',Date.now(),'MED');
  add(3,'u','listings','Exchange listings and delistings of XRP are not tracked automatically yet.','—','',null,'—');
  add(3,'u','custody','Which banks actually custody XRP for clients (vs. only Ripple Custody software) is not established.','—','',null,'—');
  /* Q4 usage + does it involve XRP */
  const pt=dailyTrend('payments_count'), aa=dailyTrend('active_accounts');
  if(pt) add(4,pt.p>=0?'s':'c','pay',`Payments per day: ${fN(pt.a,0)} (30-day average), ${sgn(pt.p)} vs the 90-day average. Includes spam.`,'XRPSCAN daily metrics','https://xrpscan.com/metrics',pt.last,'MED');
  if(aa) add(4,aa.p>=0?'s':'c','act',`Active accounts per day ${sgn(aa.p)} (30 vs 90-day average).`,'XRPSCAN daily metrics','https://xrpscan.com/metrics',aa.last,'MED');
  if(PQ){ const n=PQ.real.length+PQ.spam.length; if(n>=50){ const r=PQ.real.length/n*100; add(4,r>=50?'s':'c','real',`${r.toFixed(0)}% of payments in the last 10 min were real-sized; ${(100-r).toFixed(0)}% were dust or spam.`,'XRPL live stream (this tracker)','',Date.now(),'MED'); } }
  if(bt) add(4,bt.p>=0?'s':'c','fee',`XRP spent on fees ${sgn(bt.p)} (30 vs 90-day average): a direct use of XRP, but tiny.`,'XRPSCAN daily metrics','https://xrpscan.com/metrics',bt.last,'HIGH');
  if(amm) add(4,'s','amm',`The RLUSD/XRP pool holds ${fN(amm.xrp,0)} XRP that RLUSD swaps route through.`,'XRPL amm_info','https://xrpscan.com/account/'+amm.acct,(D.amm||{}).t,'HIGH');
  const rlt=snapTrend('rlx',30); if(rlt) add(4,rlt.p>=0?'s':'c','rlx',`RLUSD on the XRP Ledger ${sgn(rlt.p)} over 30 days. RLUSD use only involves XRP when it swaps through XRP.`,'XRPL gateway_balances','https://xrpscan.com/account/'+CFG.RLUSD_ISSUER,Date.now(),'HIGH');
  else if(rf.cur&&rf.cur.x) add(4,'u','rlx',`RLUSD on the XRP Ledger: ${fN(rf.cur.x,0)} now; 30 days of readings needed for a trend. RLUSD use is not XRP use by itself.`,'XRPL gateway_balances','',rf.cur.t,'HIGH');
  add(4,'u','bridge','How many payments actually use XRP as a bridge (vs. direct RLUSD or other tokens) is not measured yet.','—','',null,'—');
  add(4,'u','odl','Ripple Payments volume that settles in XRP is not disclosed.','—','',null,'—');
  /* Q5 risks */
  const pend=Object.entries(X.am||{}).filter(([k,v])=>v.st==='majority'&&v.maj); pend.forEach(([k,v])=>add(5,'u','am_'+k,`Ledger upgrade "${k}" switches on about ${dstr(v.maj+14*864e5)} if 80% of validators keep voting yes.`,'XRPSCAN amendments','https://xrpl.org/resources/known-amendments',v.maj,'HIGH'));
  const fr=(X.fr||[]).filter(d=>d.type==='Rule').slice(0,2); fr.forEach(d=>add(5,'u','fr_'+(d.url||d.title).slice(-40),`US final rule: ${d.title} (${d.ag}).`,'Federal Register',d.url,Date.parse(d.date),'HIGH'));
  add(5,'u','genius','GENIUS Act stablecoin rules take effect by Jan 18 2027 at the latest; how they treat RLUSD is not established yet.','Public Law 119-27 (GENIUS Act)','https://www.congress.gov/bill/119th-congress/senate-bill/1582',null,'MED');
  if(coins&&etfTot){ const share=(etfTot+(ev?ev.xrp:0))/coins.total*100; add(5,'c','conc',`Verified funds and Evernorth together hold ${share.toFixed(2)}% of all XRP; this concentration is new since 2025.`,'Filings ÷ ledger total supply','',Date.now(),'MED'); }
  add(5,'u','top','Share of XRP held by the largest wallets and validator concentration are not tracked yet.','—','',null,'—');
  (window.HELPER&&HELPER.items||[]).forEach(it=>add(5,'u','h_'+it.k,it.txt,it.src,it.u,it.t,'HIGH'));
  return E; }
function persist(E){ const now=Date.now(); Object.values(E).forEach(q=>['s','c','u'].forEach(side=>q[side].forEach(e=>{ const o=T.log[e.key]; T.log[e.key]={...e,side,first:o?o.first:now,last:now}; if(o&&o.txt!==e.txt){ (T.log[e.key].hist=(o.hist||[]).concat([{t:o.last,txt:o.txt}]).slice(-20)); } })));
  const keys=Object.keys(T.log); if(keys.length>400) keys.sort((a,b)=>T.log[a].last-T.log[b].last).slice(0,keys.length-400).forEach(k=>delete T.log[k]); save(); }

const QS=[
 {n:1,q:'Is lasting demand for XRP growing?',sh:'Demand',cs:'supports growing demand',cc:'points the other way',tr:()=>snapTrend('hold',30),tl:'verified holdings, 30-day snapshots'},
 {n:2,q:'Is selling pressure on supply easing?',sh:'Supply pressure',cs:'pressure easing',cc:'pressure rising',tr:()=>{ const r=snapTrend('res',30); return r&&{...r,p:-r.p}; },tl:'exchange-wallet XRP, 30 days (▲ = less on exchanges)'},
 {n:3,q:'Is it getting easier to buy and hold XRP?',sh:'Access',cs:'access expanding',cc:'access shrinking',tr:()=>snapTrend('access',30),tl:'count of verified funds + licences, 30 days'},
 {n:4,q:'Is real use growing, and does it use XRP?',sh:'Real use',cs:'use growing',cc:'use shrinking or not XRP',tr:()=>dailyTrend('payments_count'),tl:'payments/day, 30 vs 90-day average'},
 {n:5,q:'Are risks (tech, rules, concentration) changing?',sh:'Risks',cs:'risk falling',cc:'risk rising',tr:()=>null,tl:'no measured trend yet'}];
let OPEN=null, LAST=null;
const item=e=>`<div class="th-e" title="${esc((e.src||'')+(e.t?' · '+dstr(e.t):'')+' · confidence '+e.conf)}">${e.url?`<a href="${esc(e.url)}" target="_blank" rel="noopener">${esc(e.txt)}</a>`:esc(e.txt)} <em>${e.t?dstr(e.t):''}${e.conf&&e.conf!=='—'?` · <span class="conf2 c${e.conf}">${e.conf}</span>`:''}</em></div>`;
const cols=(qq,E)=>`<div class="th-cols"><div><h4 class="g">SUPPORTING <small>${qq.cs}</small></h4>${E.s.map(item).join('')||'<div class="th-none">nothing attached yet</div>'}</div><div><h4 class="r">CONTRARY <small>${qq.cc}</small></h4>${E.c.map(item).join('')||'<div class="th-none">nothing attached yet</div>'}</div><div><h4 class="u">STILL UNKNOWN</h4>${E.u.map(item).join('')||'<div class="th-none">—</div>'}</div></div>`;
function trendCell(qq){ const t=qq.tr(); const p=t&&t.p; return `<span class="th-tr ${p==null?'n':p>3?'up':p<-3?'dn':'fl'}" title="Evidence trend (measured, not a verdict): ${esc(qq.tl)}${t&&t.from?' · '+t.from+' → '+t.to:''}">${p==null?'— no trend yet':ARW(p)+' '+sgn(p)}</span>`; }
function renderCenter(E){ const el=Q('#thBody'); if(!el) return;
  el.innerHTML=QS.map(qq=>{ const e=E[qq.n]; const top=e.s[0]||e.c[0]||e.u[0];
    return `<div class="th-row ${OPEN===qq.n?'open':''}" data-q="${qq.n}"><div class="th-q"><b>${qq.n}</b><span>${qq.q}</span>${trendCell(qq)}<i class="th-n" title="Evidence items attached (not a score)"><s class="g">${e.s.length}</s><s class="r">${e.c.length}</s><s class="u">${e.u.length}</s></i></div>${OPEN===qq.n?cols(qq,e):`<div class="th-sum">${top?esc(top.txt):UNK}</div>`}</div>`; }).join('');
  QA('#thBody .th-row').forEach(r=>r.onclick=ev=>{ if(ev.target.closest('a')) return; const n=+r.dataset.q; OPEN=OPEN===n?null:n; renderCenter(LAST); }); }
let FQ=0, FQpin=0, FQt=Date.now();
function renderFull(E){ const el=Q('#thFull'); if(!el) return;
  if(FLOOR){ if(!FQpin&&Date.now()-FQt>20000){ FQ=(FQ+1)%5; FQt=Date.now(); } const qq=QS[FQ];
    el.innerHTML=`<div class="fl-sub">${QS.map((x,i)=>`<button data-i="${i}" class="${i===FQ?'on':''}">${x.n} · ${x.sh}</button>`).join('')}</div><div class="th-fq"><div class="th-q"><b>${qq.n}</b><span>${qq.q}</span>${trendCell(qq)}</div>${cols(qq,E[qq.n])}</div><div class="hint">Arrows are measured trends of one labelled metric, not verdicts. Evidence log kept on this PC since ${dstr(T.start)} (${Object.keys(T.log).length} items).</div>`;
    el.querySelectorAll('.fl-sub button').forEach(b=>b.onclick=()=>{ FQ=+b.dataset.i; FQpin=1; FQt=Date.now(); renderFull(LAST); setTimeout(()=>{ FQpin=0; },120000); }); return; }
  el.innerHTML=QS.map(qq=>`<div class="th-fq"><div class="th-q"><b>${qq.n}</b><span>${qq.q}</span>${trendCell(qq)}</div>${cols(qq,E[qq.n])}</div>`).join('')+
   `<div class="hint">Evidence log kept in this browser since ${dstr(T.start)} · ${Object.keys(T.log).length} items · ${T.snap.length} daily snapshots. Arrows are measured trends of one labelled metric, not verdicts. Item counts are not scores.</div>`; }

/* ---------- strict adoption ledger ---------- */
const OFFICIAL_REG=/(^|\.)(gov|gov\.uk|europa\.eu|mas\.gov\.sg|dfsa\.ae|centralbank\.ie|fca\.org\.uk|cbcg\.me|banrep\.gov\.co|nbg\.gov\.ge|hkma\.gov\.hk|rma\.org\.bt|dfs\.ny\.gov|asic\.gov\.au)$/i;
/* Curated, source-checked developments (researched Oct 20 2026). Unverified parts are written as UNKNOWN / not established. */
const AD_CURATED=window.AD_CURATED=[
 {type:'Partnership',what:'Cross River Bank x Ripple: RLUSD on the XRP Ledger added to Cross River\'s Core Operating System (one API with ACH, wires, RTP)',asset:'RLUSD on XRPL (not XRP)',stage:'Announcement; "limited states", no go-live date or volumes',confirmed:'CONFIRMED by the institution (Cross River release)',metric:'None disclosed (no volumes, no addresses)',xrp:'Indirect only: XRP fees/reserves on RLUSD transfers (tiny); no XRP bridging stated',date:'2026-10-15',url:'https://www.crossriver.com/newsroom/cross-river-embeds-ripple-usd-stablecoin-on-the-xrp-ledger-into-its-core-banking-infrastructure-expanding-faster-payment-capabilities-for-businesses'},
 {type:'Partnership',what:'Cross River (CRB Group) agrees to acquire Accrue: branded wallets, stored value, loyalty rewards (terms undisclosed; Cross River already banks Accrue wallets)',asset:'USD stored value / Visa debit; no RLUSD, XRP or XRPL mentioned',stage:'Agreement signed; subject to customary closing conditions',confirmed:'CONFIRMED by the institution (Cross River release)',metric:'None',xrp:'Not established (only matters if these wallets later use RLUSD on XRPL)',date:'2026-10-20',url:'https://www.crossriver.com/newsroom/cross-river-to-acquire-accrue-expanding-financial-infrastructure-with-integrated-wallet-capabilities'},
 {type:'XRPL ecosystem integration',what:'Yellow Network (Yellow Clearnet / state-channel clearing layer) connects to the XRPL EVM Sidechain',asset:'Assets on XRPL EVM Sidechain (XRP is its gas token); settlement asset not specified',stage:'Integration announced Oct 23-27 2025; sidechain mainnet live; Yellow lists XRPL as a connected chain (Sep 16 2026)',confirmed:'Yellow release only (PR Newswire); no Ripple/XRPL Foundation release found',metric:'None published (no TVL / vault addresses on XRPL found)',xrp:'Not established: XRP gas on the sidechain; no stated XRP or RLUSD settlement, no volumes',date:'2025-10-27',url:'https://www.prnewswire.com/news-releases/yellow-network-integrates-with-xrpl-evm-sidechain-to-upgrade-rwa-trading-302595443.html'},
 {type:'XRPL ecosystem integration',what:'Yellow on X: "hello, @XRP. We saved an open channel for you" (reply to the new @XRP account) + Oct 5-15 posts pitching cross-chain escrow/settlement "across chains like XRP"',asset:'UNKNOWN / not established',stage:'Social posts (marketing)',confirmed:'UNCONFIRMED (posts, no announcement)',metric:'None',xrp:'Not established',date:'2026-10-20',url:'https://x.com/Yellow/status/2112471031214661775'},
 /* X deep scan Oct 13-20 2026 */
 {type:'XRPL ecosystem integration',what:'New official @XRP account launches ("hello, world."); welcomed by Ripple, XRPLF, Garlinghouse, Monica Long, Schwartz; @XRP replies to Kraken, Gemini, Uphold, MoonPay, Squid, Evernorth, xrp.cafe, XRPL Commons, Yellow',asset:'XRP (brand/community)',stage:'Live (social account)',confirmed:'Official source (Ripple + XRPLF posts)',metric:'None',xrp:'Not established (attention, not demand)',date:'2026-10-19',url:'https://x.com/XRP/status/2112214294188441742'},
 {type:'Partnership',what:'Standard Chartered launches RLUSD-on-XRPL custody (DIFC branch, DFSA); planned RLUSD collateral link with Ripple + LMAX Group',asset:'RLUSD on XRPL (not XRP)',stage:'Custody live; LMAX collateral link planned (subject to testing/approvals)',confirmed:'CONFIRMED by the institution (sc.com + LMAX releases)',metric:'None disclosed',xrp:'Indirect only: XRPL fees/reserves; no XRP use stated',date:'2026-10-12',url:'https://www.sc.com/en/press-release/standard-chartered-launches-rlusd-custody-and-joins-planned-collateral-integration-with-ripple-and-lmax-group/'},
 {type:'Partnership',what:'Ripple x DriveWealth: RLUSD settlement on XRPL, cross-border payments, custody and prime brokerage',asset:'RLUSD on XRPL (no XRP named)',stage:'Announcement',confirmed:'Ripple release only (Ripple on X)',metric:'None',xrp:'Not established',date:'2026-10-14',url:'https://x.com/Ripple/status/2110357166787842516'},
 {type:'Ripple business announcement',what:'Ripple Prime: institutional RWA perpetual swaps on 100+ reference markets, cross-margined 24/7',asset:'Prime brokerage (settlement asset not specified)',stage:'Launch (per Ripple)',confirmed:'Ripple release only (Ripple on X)',metric:'None',xrp:'Not established',date:'2026-10-15',url:'https://x.com/Ripple/status/2110717616490741894'},
 {type:'Partnership',what:'Meritz Securities x Ripple: institutional custody + tokenization in Korea (4th Korean institution in 2026 after Kyobo Life, Kbank, Jeonbuk)',asset:'Custody / tokenization (asset-agnostic)',stage:'Announcement',confirmed:'Ripple release only (Ripple on X)',metric:'None',xrp:'Not established',date:'2026-10-14',url:'https://x.com/Ripple/status/2110190201888801060'},
 {type:'XRPL ecosystem integration',what:'Privy (embedded wallets) partners with Ripple: XRPL wallets live in Privy, aimed at stablecoin payments and AI agents (x402)',asset:'XRPL wallets (XRP + tokens)',stage:'Live (per Privy + XRPLF)',confirmed:'Official source (Privy + XRPLF posts)',metric:'None published',xrp:'Each new XRPL account locks reserve XRP; size unknown',date:'2026-10-13',url:'https://x.com/privy_io/status/2110045210935951702'},
 {type:'XRPL ecosystem integration',what:'Clearpool v4.0 whitepaper: institutional credit marketplace expanding to XRPL with Ripple (LP) + Cicada; RLUSD loans on XLS-65 vaults / XLS-66 lending; CPOOL to CLEAR 1:1',asset:'RLUSD (loans); XRP for fees/reserves only',stage:'Devnet only; needs XLS-65/66 validator approval (still below 80%)',confirmed:'Clearpool + XRPLF posts; not live on mainnet',metric:'None on mainnet (~$965M origination is on other chains)',xrp:'Not established until amendments activate',date:'2026-10-19',url:'https://x.com/ClearpoolFin/status/2112010347213447499'},
 {type:'Claimed institutional adoption',what:'Viral copy-paste: "SEC approved Evernorth filing to buy more XRP". Reality: Oct 19 424B3 prospectus for up to 11.5M warrant shares at $11.50 (max ~$132M if all exercised); no XRP purchase announced, proceeds for general corporate purposes',asset:'XRPN shares (not XRP)',stage:'Filing (not an approval)',confirmed:'RUMOR (misread SEC filing)',metric:'None',xrp:'Not established; possible future XRP buys only',date:'2026-10-20',url:'https://www.sec.gov/Archives/edgar/data/2092592/000119312526425367/d184594d424b3.htm'},
 {type:'Claimed institutional adoption',what:'Community claims: "Ripple joins the DTCC" / "$114T DTCC tokenization launch Oct 28" (DTCC lists Canton + Besu only, no XRPL)',asset:UNK,stage:UNK,confirmed:'RUMOR',metric:'None',xrp:'Not established',date:'2026-10-20',url:'https://x.com/xrpmickle/status/2112592162462322958'},
 {type:'Claimed institutional adoption',what:'Community claim: "XRP will bridge every single RLUSD transaction" (no Ripple, bank or RLUSD doc says this; RLUSD moves directly)',asset:UNK,stage:UNK,confirmed:'RUMOR',metric:'None',xrp:'Not established',date:'2026-10-20',url:'https://x.com/Erictrumpqrs/status/2112592614952247661'},
 {type:'Claimed institutional adoption',what:'Claim: RLUSD supply on XRPL fell 14% in a week to ~$954M while Ethereum supply grew (~40% XRPL / 60% ETH)',asset:'RLUSD',stage:'Claim (check the tracker RLUSD panel)',confirmed:'UNCONFIRMED (community post)',metric:'RLUSD supply XRPL vs Ethereum (tracked live)',xrp:'If true, a mild negative for XRPL usage',date:'2026-10-20',url:'https://x.com/HZK_Crypto/status/2112500350708027736'},
 {type:'Network activity',what:'Scam warning: David Schwartz flags a fake "Xaman airdrop" account (Oct 19) and a SecuX app scam notification (Oct 16). Never enter a seed phrase',asset:'XRP wallets',stage:'Live scam',confirmed:'Official source (Schwartz on X)',metric:'None',xrp:'None (safety)',date:'2026-10-19',url:'https://x.com/JoelKatz/status/2112041329798844565'}];
function adoption(){ const rows=[]; const W=window.WW_DEALS||[], F=window.RF_FAMILY||[], rf=LS.get('rf',{});
  const R=(o)=>rows.push({type:UNK,what:'',asset:UNK,stage:UNK,confirmed:'UNCONFIRMED',metric:UNK,xrp:UNK,date:'',url:'',...o});
  AD_CURATED.forEach(r=>R(r));
  W.forEach(w=>{ const h=host(w.u), rl=/RLUSD|stablecoin/i.test(w.ty), lic=/licen|registration|trust|recogn|MPI|VASP|AFSL/i.test(w.ty);
    R({type:lic?'Ripple business (licence)':'Partnership',what:`${w.c} · ${w.p} · ${w.ty}`,asset:/RLUSD/i.test(w.ty)?'RLUSD':lic?'Ripple Payments / custody (no settlement asset named)':'Private ledger tech; settlement asset not specified',stage:w.st==='live'?'Production / in force':w.st==='pilot'?'Pilot':w.st==='announced'?'Announcement':w.st,confirmed:OFFICIAL_REG.test(h)?'CONFIRMED by the institution':/ripple\.com$/.test(h)?'Ripple release only':'UNCONFIRMED',xrp:'Not established',date:w.d,url:w.u}); });
  F.filter(f=>f.st==='owned'||f.st==='announced').forEach(f=>{ if(/RLUSD|Ripple \/ XRP/.test(f.n)) return; R({type:'Ripple business announcement',what:`${f.n}${f.was?' (ex-'+f.was+')':''}: ${f.what}`,asset:/custody/i.test(f.what)?'Custody (asset-agnostic)':/prime/i.test(f.what+f.n)?'Prime brokerage':/treasury/i.test(f.n)?'Treasury software':/stablecoin/i.test(f.what)?'Stablecoin payments':'Not specified',stage:f.st==='owned'?'Acquisition closed':'Announced',confirmed:'Ripple release',xrp:'Not established',date:f.d,url:f.url}); });
  (rf.log||[]).filter(e=>e.kind==='headline'||e.kind==='official').slice(0,25).forEach(e=>{ const t=e.title||''; const m=[/\bXRP\b/i,/RLUSD/i,/custody/i,/Prime|Hidden Road/i,/Treasury|GTreasury/i].map((re,i)=>re.test(t)?['XRP','RLUSD','custody','Prime','Treasury'][i]:null).filter(Boolean);
    const inst=/\bbank|central bank|DTCC|Swift|Visa|Mastercard|BlackRock|Fidelity|JPMorgan|Citi|HSBC|Santander|SBI\b/i.test(t);
    R({type:inst?'Claimed institutional adoption':/launch|live|mainnet/i.test(t)&&/XRPL|XRP Ledger/i.test(t)?'XRPL project launch':'Ripple business announcement',what:t,asset:m.length?'Mentioned in headline: '+m.join(', ')+' (not verified)':UNK,stage:/pilot/i.test(t)?'Pilot (per headline)':/partner/i.test(t)?'Announcement (per headline)':UNK,confirmed:e.kind==='official'?'Official source':window.isRumor&&isRumor(t,e.domain||'')?'RUMOR':'UNCONFIRMED',xrp:UNK,date:e.t?day(e.t):'',url:e.url||''}); });
  const pt=dailyTrend('payments_count'), at=dailyTrend('accounts_created'), bt=dailyTrend('fee_total'), amm=val('amm'), PQ=window.PQ;
  if(pt) R({type:'Network activity',what:`Payments ${sgn(pt.p)} (30 vs 90-day average)`,asset:'XRP and tokens (mixed)',stage:'Measured',confirmed:'Measured on-ledger',metric:'XRPSCAN payments_count',xrp:'Fee burn only (tiny); includes spam',date:day(pt.last),url:'https://xrpscan.com/metrics'});
  if(at) R({type:'Network activity',what:`New accounts ${sgn(at.p)} (30 vs 90-day average)`,asset:'XRP',stage:'Measured',confirmed:'Measured on-ledger',metric:'XRPSCAN accounts_created',xrp:'Each new account locks 1 XRP reserve',date:day(at.last),url:'https://xrpscan.com/metrics'});
  if(amm) R({type:'Network activity',what:`RLUSD/XRP pool: ${fN(amm.xrp,0)} XRP + ${fN(amm.rlusd,0)} RLUSD`,asset:'XRP + RLUSD',stage:'Live',confirmed:'Measured on-ledger',metric:'XRPL amm_info',xrp:'Bridge liquidity: XRP locked in the pool',date:day((D.amm||{}).t||Date.now()),url:'https://xrpscan.com/account/'+amm.acct});
  if(PQ&&PQ.real.length+PQ.spam.length>=50) R({type:'Network activity',what:`Spam/dust share now ${(PQ.spam.length/(PQ.real.length+PQ.spam.length)*100).toFixed(0)}% of payments`,asset:'XRP / tokens',stage:'Measured (10 min)',confirmed:'Measured on-ledger',metric:'Live XRPL stream',xrp:'None (spam is not demand)',date:day(Date.now())});
  if(!rows.some(r=>r.type==='XRPL project launch')) R({type:'XRPL project launch',what:'No XRPL project launch with measurable on-chain activity is attached yet.'});
  return rows; }
let ADp=0, ADpin=0, ADt=Date.now();
function renderAdoption(){ const el=Q('#adBody'); if(!el) return; const rows=adoption(); const f=sessionStorage.getItem('adF')||'all';
  const types=['all',...new Set(rows.map(r=>r.type))];
  const cell=v=>`<td class="${v===UNK||/^UNCONFIRMED|^RUMOR|Not established/.test(v)?'unk':/CONFIRMED|Measured|Production|closed/.test(v)?'ok':''}">${esc(v)}</td>`;
  if(FLOOR){ const list=rows.filter(r=>f==='all'||r.type===f), per=4, pages=Math.max(1,Math.ceil(list.length/per)); if(!ADpin&&Date.now()-ADt>15000){ ADp=(ADp+1)%pages; ADt=Date.now(); } if(ADp>=pages) ADp=0;
    const fld=(k,v)=>`<div class="ad-f"><span>${k}</span><b class="${v===UNK||/^UNCONFIRMED|^RUMOR|Not established/.test(v)?'unk':/CONFIRMED|Measured|Production|closed/.test(v)?'ok':''}">${esc(v)}</b></div>`;
    el.innerHTML=`<div class="fl-sub">${types.map(t=>`<button data-t="${esc(t)}" class="${t===f?'on':''}">${esc(t==='all'?'ALL':t)}</button>`).join('')}</div>`+list.slice(ADp*per,ADp*per+per).map(r=>`<div class="ad-card"><div class="ad-h"><span class="pill v">${esc(r.type)}</span> ${r.url?`<a href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.what)}</a>`:esc(r.what)} <em>${esc(r.date)}</em></div><div class="ad-g">${fld('Product / asset',r.asset)}${fld('Stage',r.stage)}${fld('Confirmed by',r.confirmed)}${fld('On-chain metric',r.metric)}${fld('Link to XRP demand',r.xrp)}</div></div>`).join('')+
      `<div class="fl-pg"><button data-d="-1">◀</button><span>page ${ADp+1} of ${pages} · ${list.length} items</span><button data-d="1">▶</button></div><div class="hint">Every field starts as UNKNOWN. A Ripple headline never counts as XRP use.</div>`;
    el.querySelectorAll('.fl-sub button').forEach(b=>b.onclick=()=>{ sessionStorage.setItem('adF',b.dataset.t); ADp=0; renderAdoption(); });
    el.querySelectorAll('.fl-pg button').forEach(b=>b.onclick=()=>{ ADp=(ADp+(+b.dataset.d)+pages)%pages; ADpin=1; ADt=Date.now(); setTimeout(()=>{ ADpin=0; },120000); renderAdoption(); }); return; }
  el.innerHTML=`<div class="seg ad-seg">${types.map(t=>`<button data-t="${esc(t)}" class="${t===f?'on':''}">${esc(t==='all'?'ALL':t)}</button>`).join('')}</div><table class="ad-t"><tr><th>Type</th><th>Development</th><th>Product / asset</th><th>Stage</th><th>Confirmed by</th><th>On-chain metric</th><th>Link to XRP demand</th><th>Date</th></tr>`+
   rows.filter(r=>f==='all'||r.type===f).map(r=>`<tr><td>${esc(r.type)}</td><td>${r.url?`<a href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.what)}</a>`:esc(r.what)}</td>${cell(r.asset)}${cell(r.stage)}${cell(r.confirmed)}${cell(r.metric)}${cell(r.xrp)}<td>${esc(r.date)}</td></tr>`).join('')+'</table><div class="hint">Strict rules: every field starts as UNKNOWN. A Ripple headline never counts as XRP use. Institutional claims stay UNCONFIRMED until the institution\'s own release is linked.</div>';
  QA('#adBody .ad-seg button').forEach(b=>b.onclick=()=>{ sessionStorage.setItem('adF',b.dataset.t); renderAdoption(); }); }

/* ---------- helper-only feeds (need the local relay; clean states when it is missing) ---------- */
const HELPER=window.HELPER={items:[],st:{}};
const HFEEDS=[{k:'occ',n:'OCC (bank regulator) news',u:'https://www.occ.gov/rss/occ_news.xml',re:/crypto|digital asset|stablecoin|charter|Ripple|tokeni/i},
 {k:'fed',n:'Federal Reserve press',u:'https://www.federalreserve.gov/feeds/press_all.xml',re:/crypto|digital asset|stablecoin|payment innovation|master account|tokeni/i},
 {k:'dtcc',n:'DTCC / Swift + XRP headlines',u:'https://news.google.com/rss/search?q=(DTCC%20OR%20Swift)%20(XRP%20OR%20Ripple)&hl=en-US&gl=US&ceid=US:en',re:/./,rumor:1}];
async function helperTick(){ for(const f of HFEEDS){ if(!PROXY){ HELPER.st[f.k]={st:'needs helper',why:'The local helper is not running on this PC (on the sim rig, Bitdefender blocks it).'}; continue; }
  try{ const x=await fetchText(viaProxy(f.u),20000); const doc=new DOMParser().parseFromString(x,'text/xml'); const its=[...doc.querySelectorAll('item')].slice(0,40).map(i=>({title:(i.querySelector('title')||{}).textContent||'',link:(i.querySelector('link')||{}).textContent||'',t:Date.parse((i.querySelector('pubDate')||{}).textContent||'')||Date.now()})).filter(i=>f.re.test(i.title));
    HELPER.st[f.k]={st:'live',t:Date.now(),list:its.slice(0,8)};
    if(f.k!=='dtcc') its.slice(0,2).forEach(i=>{ const key='h_'+f.k+'_'+i.link.slice(-30); if(!HELPER.items.find(z=>z.k===key)) HELPER.items.push({k:key,txt:`${f.n}: ${i.title}`,src:f.n,u:i.link,t:i.t}); });
    its.slice(0,3).forEach(i=>{ if(Date.now()-i.t<3*864e5) fireEvent({key:'helper_'+f.k+'_'+i.link,name:(f.rumor?'RUMOR? ':'')+f.n+': '+i.title.slice(0,90),level:f.rumor?1:2,src:f.n,t:i.t,link:i.link,meme:'news',memeLabel:f.rumor?'UNCONFIRMED':'REGULATOR',joke:f.rumor?'Unconfirmed until DTCC or Swift says so on its own site.':'Official regulator release.'}); });
  }catch(e){ HELPER.st[f.k]={st:'down',why:e.message}; } }
  HELPER.st.etf={st:PROXY?'not available':'needs helper',why:'ETF issuer daily holdings pages are script-rendered; quarter-end 10-Q figures are shown instead, with dates.'};
  renderHelper(); }
function renderHelper(){ const el=Q('#hlBody'); if(!el) return; const nm={occ:'OCC bank regulator news',fed:'Federal Reserve press',dtcc:'DTCC / Swift + XRP headlines (rumour-checked)',etf:'ETF issuer daily holdings'};
  el.innerHTML=Object.entries(nm).map(([k,n])=>{ const s=HELPER.st[k]||{st:'starting'}; const cls=s.st==='live'?'g':s.st==='down'?'r':'a';
    return `<div class="hl-r"><span class="pill ${cls}">${s.st.toUpperCase()}</span> <b>${n}</b>${s.st==='live'?`<em> · ${s.list.length} matching · ${fT(s.t)} ET</em>`+s.list.slice(0,3).map(i=>`<a href="${esc(i.link)}" target="_blank" rel="noopener">${k==='dtcc'?'<span class="pill rumor">RUMOR?</span> ':''}${esc(i.title)}</a>`).join(''):`<div class="hl-why">${esc(s.why||'')}</div>`}</div>`; }).join(''); }

/* ---------- build panels ---------- */
function sec(id,title,hint,body){ const s=document.createElement('section'); s.id=id; s.className='panel'; s.innerHTML=`<div class="panel-head"><h2 data-info="${id}">${title}</h2><span class="hint">${hint}</span></div>${body}`; return s; }
INFO.thesis='LONG-TERM THESIS MONITOR: five standing questions. For each: SUPPORTING evidence, CONTRARY evidence and what is STILL UNKNOWN, each item with its source, date and confidence (HIGH = read directly from the ledger or an official filing; MED = derived, labels incomplete or dated; LOW = indirect). The arrow is a measured trend of one labelled metric over 30/90 days, not a verdict. The tracker never gives a bullish/bearish call and never scores by headline counts. The log is kept in this browser and builds over time.';
INFO.adLedger='ADOPTION LEDGER: every development classified strictly by type, product/asset, stage, who confirmed it, the on-chain metric (if any) and how it links to XRP demand. Fields start as UNKNOWN / not established. A Ripple headline never counts as XRP use.';
INFO.helper='Feeds that need the small local helper (the relay) because the source does not allow direct browser reads. When the helper is missing they say so instead of showing stale data.';
function build(){
  const thc=sec('thesis','Long-term thesis monitor','evidence, not verdicts · click a row','<div id="thBody"></div>');
  const thf=sec('thesisFull','Thesis monitor · full evidence','supporting · contrary · still unknown','<div id="thFull"></div>');
  const ad=sec('adLedger','Adoption ledger · what is actually established','strict: UNKNOWN until evidence is attached','<div id="adBody"></div>');
  const hl=sec('helperFeeds','Helper-only feeds','need the local helper','<div id="hlBody"></div>');
  const app=Q('#app')||document.body;
  if(RIG){ const dz=Q('#demand'); if(dz){ dz.after(thc); } else app.appendChild(thc); }
  else if(!FLOOR){ const v=Q('#verdict'); if(v){ v.before(thc); v.style.display='none'; } else app.prepend(thc); }
  [thf,ad,hl].forEach(s=>app.appendChild(s));
  if(!RIG&&!FLOOR){ app.appendChild(thf); }
}
/* duplicates: payments/day + active accounts live in Ledger pulse on the rig; Evernorth XRP lives in Who holds XRP */
const _rn=window.renderNetwork; if(RIG&&typeof _rn==='function'){ window.renderNetwork=function(){ _rn.apply(this,arguments); QA('#netGrid [data-info="n_payments"],#netGrid [data-info="n_active"]').forEach(x=>{ const c=x.closest('.card'); if(c) c.remove(); }); }; }

/* ---------- rig fit layout: centre = now + thesis, right = live, left = why ---------- */
function rigLayout(){ if(!RIG) return; const L=Q('.fit-left'), C=Q('.fit-center'), Rt=Q('.fit-right'); if(!L||!C||!Rt) return;
  const an=Q('#analyst'); const zl=L.querySelector('.zone-h'); if(an&&zl&&an.parentElement!==L) zl.after(an);
  const rf=Q('#rfam'); const zr=Rt.querySelector('.zone-h'); if(rf&&zr&&rf.parentElement!==Rt) zr.after(rf);
  const l2=Q('#lrow2'); if(l2&&l2.parentElement!==Rt) Rt.appendChild(l2);
  const ft=Q('#footer'); if(ft&&ft.parentElement!==L) L.appendChild(ft);
  const ck=Q('#checks'); if(ck) ck.style.display='none'; const v=Q('.dz-verdict'); if(v) v.style.display='none';
  document.body.classList.add('th-rig'); }
let busy=false;
function tick(){ if(busy) return; busy=true; try{ snapshot(); const E=evidence(); persist(E); LAST=E; renderCenter(E); renderFull(E); renderAdoption(); rigLayout(); }catch(e){ console.warn('thesis',e); } busy=false; }
build(); setTimeout(tick,4000); if(FLOOR) setInterval(()=>{ if(!document.hidden&&LAST){ renderFull(LAST); renderAdoption(); } },5000);
window.Thesis={tick,evidence,adoption,T,helperTick};
})();

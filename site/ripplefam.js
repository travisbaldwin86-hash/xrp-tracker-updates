/* DEMAND RADAR · RIPPLE FAMILY strip + 15-second scan + relay-free news.
   Ripple-owned businesses (each confirmed by Ripple's own press page or credible reporting, Oct 2026):
   Ripple Prime (ex-Hidden Road, closed Oct 24 2025) · Ripple Custody (ex-Metaco, May 2023; + Palisade, Nov 3 2025)
   · Standard Custody & Trust Co. (2024, NYDFS trust that issues RLUSD) · Ripple Treasury (ex-GTreasury, closed Dec 4 2025)
   · Rail (Aug 2025) · Ripple Payments · BC Payments Australia (announced Mar 11 2026, pending completion).
   NOT included: Fortress Trust (Ripple dropped the acquisition, Sep 28 2023; investor only) and Bitstamp (not Ripple-owned).
   Wallets: only accounts XRPScan labels "Ripple" (domain ripple.com) are watched. Nothing else is attributed to Ripple. */
(function(){ 'use strict';
const Q=s=>document.querySelector(s), QA=s=>[...document.querySelectorAll(s)];
const LAYOUT=new URLSearchParams(location.search).get('layout')||'std';
const FAMILY=window.RF_FAMILY=[
 {n:'Ripple Prime',was:'Hidden Road',what:'prime broker',st:'owned',d:'2025-10-24',url:'https://ripple.com/insights/ripple-closes-hidden-road-acquisition/',re:/Ripple Prime|Hidden Road/i},
 {n:'Ripple Custody',was:'Metaco',what:'crypto custody',st:'owned',d:'2023-05',url:'https://ripple.com/ripple-press/leading-enterprise-crypto-company-ripple-acquires-custody-provider-metaco-for-250m/',re:/Ripple Custody|Metaco/i},
 {n:'Palisade',was:'',what:'wallet-as-a-service (custody)',st:'owned',d:'2025-11-03',url:'https://ripple.com/ripple-press/ripple-acquires-palisade-to-offer-comprehensive-digital-asset-custody-solution/',re:/Palisade/i,needRipple:true},
 {n:'Standard Custody & Trust',was:'',what:'NY trust company, issues RLUSD',st:'owned',d:'2024',url:'https://ripple.com/insights/paving-a-compliant-path-forward-ripple-closes-standard-custody-acquisition-and-appoints-jack-mcdonald-as-senior-vice-president-of-stablecoins/',re:/Standard Custody/i},
 {n:'Ripple Treasury',was:'GTreasury',what:'corporate treasury software',st:'owned',d:'2025-12-04',url:'https://treasury.ripple.com/gtreasury-is-now-ripple-treasury',re:/Ripple Treasury|GTreasury/i},
 {n:'Rail',was:'',what:'stablecoin payments (agreed Aug 7 2025, closed Dec 11 2025 per Ripple on X)',st:'owned',d:'2025-12-11',url:'https://ripple.com/ripple-press/ripple-to-acquire-rail-for-200m-expanding-leadership-in-stablecoin-payments/',re:/\bRail\b/,needRipple:true},
 {n:'BC Payments Australia',was:'',what:'Australian licence (AFSL)',st:'announced',d:'2026-03-11',url:'https://ripple.com/ripple-press/ripple-to-secure-australian-financial-services-license-expanding-payments-offering-across-apac/',re:/BC Payments/i},
 {n:'RLUSD',was:'',what:'Ripple\'s US-dollar stablecoin',st:'product',url:'https://docs.ripple.com/products/stablecoin/overview/token-addresses',re:/RLUSD|Ripple USD/i},
 {n:'Ripple / XRP',was:'',what:'Ripple Labs and XRP',st:'core',url:'https://ripple.com/insights/',re:/\bRipple\b|\bXRP\b/i}];
const OFFICIAL=/(^|\.)(ripple\.com|xrpl\.org|evernorth\.xyz)$/i;
const CRED=/(^|\.)(reuters\.com|bloomberg\.com|ft\.com|wsj\.com|cnbc\.com|apnews\.com|axios\.com|fortune\.com|forbes\.com|coindesk\.com|theblock\.co|decrypt\.co|cointelegraph\.com|dlnews\.com|blockworks\.co|ripple\.com|sec\.gov|treasury\.gov|gov\.uk|europa\.eu|un\.org|nikkei\.com|businesswire\.com|prnewswire\.com|globenewswire\.com|finextra\.com|pymnts\.com|americanbanker\.com|bbc\.co\.uk|theguardian\.com|nytimes\.com|washingtonpost\.com|barrons\.com|marketwatch\.com|yahoo\.com)$/i;
window.RF={FAMILY,CRED,OFFICIAL};
INFO.rfam='RIPPLE FAMILY: one strip for everything Ripple. Headlines (GDELT news index, read directly by the browser, no relay), official posts (ripple.com and other Ripple-owned sites as indexed by GDELT; ripple.com blocks direct reading), RLUSD supply on the XRP Ledger + Ethereum (read every 15 s), RLUSD issuer settings, Ripple escrow releases/relocks and big moves (≥1M XRP) by accounts that XRPScan publicly labels "Ripple". No other wallet is ever attributed to Ripple. Ripple-owned businesses tracked: '+FAMILY.filter(f=>f.st!=='core'&&f.st!=='product').map(f=>f.n+(f.was?' (ex-'+f.was+')':'')+(f.st==='announced'?' [announced]':'')).join(', ')+'. Not included: Fortress Trust (deal dropped 2023) and Bitstamp (not Ripple-owned).';
const S=LS.get('rf',{sup:[],iss:null,issT:0,log:[],ev:{},seen:[]});
const save=()=>LS.set('rf',S);
const tag=t=>{ const a=Date.now()-t; return a<15*60e3?`<span class="new" style="opacity:${(1-a/(15*60e3))*0.8+0.2}">NEW</span>`:''; };
const ago=t=>{ if(!t) return ''; const s=(Date.now()-t)/1e3; return s<90?Math.round(s)+'s ago':s<5400?Math.round(s/60)+' min ago':s<172800?Math.round(s/3600)+' h ago':Math.round(s/86400)+' d ago'; };
function logEv(kind,title,meaning,extra){ const e={kind,title,meaning,t:Date.now(),...(extra||{})}; S.ev[kind]=e; S.log.unshift(e); S.log=S.log.slice(0,80); save(); render(); return e; }
/* ---------- relay-free news: GDELT DOC 2.0 (sends Access-Control-Allow-Origin: *), one request per 15 s ---------- */
const GQ=[
 {k:'rf',q:'(Ripple OR RLUSD OR XRP OR "Ripple Prime" OR "Hidden Road" OR GTreasury OR "Ripple Treasury" OR Metaco OR "Standard Custody" OR Evernorth)'},
 {k:'news_DTCC',q:'(DTCC OR "Depository Trust") (XRP OR Ripple OR RLUSD OR tokenization OR tokenized)'},
 {k:'news_Cross River',q:'"Cross River" (RLUSD OR Ripple OR XRP OR stablecoin OR "X Money")'},
 {k:'news_Evernorth',q:'(Evernorth OR XRPN)'},
 {k:'news_Yellow',q:'"Yellow Network" (XRPL OR XRP OR "XRP Ledger" OR RLUSD)'},
 {k:'news_X Money',q:'"X Money" (RLUSD OR XRP OR crypto OR stablecoin OR Visa)'},
 {k:'sanc',q:'("sanctions lifted" OR "lifts sanctions" OR "eases sanctions" OR "sanctions relief" OR "general license" OR "frozen assets" OR "unfrozen" OR "unfreeze" OR "new sanctions" OR OFAC)'}];
let gi=0; const GD={};
const gdT=s=>Date.UTC(+s.slice(0,4),+s.slice(4,6)-1,+s.slice(6,8),+s.slice(9,11),+s.slice(11,13),+s.slice(13,15));
async function gdelt(q){ const u='https://api.gdeltproject.org/api/v2/doc/doc?query='+encodeURIComponent(q+' sourcelang:english')+'&mode=artlist&format=json&maxrecords=50&timespan=3d&sort=datedesc';
  const r=await fetch(u); if(!r.ok) throw new Error('GDELT HTTP '+r.status); const txt=await r.text(); let j; try{ j=JSON.parse(txt); }catch(e){ throw new Error('GDELT: '+txt.slice(0,80)); }
  return (j.articles||[]).map(a=>({title:a.title,link:a.url,t:gdT(a.seendate),source:a.domain,country:a.sourcecountry,cred:CRED.test(a.domain),official:OFFICIAL.test(a.domain)})); }
function dedupe(list){ const seen=new Set(); return list.filter(x=>{ const k=x.title.toLowerCase().replace(/[^a-z0-9]/g,'').slice(0,60); if(seen.has(k)) return false; seen.add(k); return true; }); }
window.GDELT={get:k=>GD[k]};
async function gdeltTick(){ const g=GQ[gi%GQ.length]; gi++;
  try{ const list=dedupe(await gdelt(g.q)); GD[g.k]={list,t:Date.now()};
    if(g.k.startsWith('news_')){ if(!PROXY||!(D[g.k]&&D[g.k].v&&D[g.k].v.length)){ put(g.k,list.slice(0,30),'GDELT news index (direct, no relay)'); try{ checkNewsAlarms(); renderNews(); }catch(e){} } }
    if(g.k==='rf') onFamilyNews(list);
    if(g.k==='sanc'&&window.WorldWatch) WorldWatch.onNews(list);
  }catch(e){ GD[g.k]={...(GD[g.k]||{}),err:e.message,t:Date.now()}; if(g.k.startsWith('news_')&&!PROXY&&!(D[g.k]&&D[g.k].v)) fail(g.k,e,'GDELT news index'); }
  render(); }
function famOf(x){ for(const f of FAMILY){ if(f.re.test(x.title)&&(!f.needRipple||/Ripple/i.test(x.title))) return f; } return null; }
function onFamilyNews(list){ const seen=new Set(S.seen); const first=!S.seen.length; let changed=false;
  list.forEach(x=>{ const f=famOf(x); if(!f) return; x.fam=f.n; const id=x.title.slice(0,90); if(seen.has(id)) return; seen.add(id); changed=true;
    if(first||Date.now()-x.t>6*3600e3) return;
    if(window.isRumor&&isRumor(x.title,x.source)){ x.rumor=1; return; }
    if(x.official){ logEv('post',x.title,'Official post from '+x.source,{link:x.link,src:x.source}); fireEvent({key:'rfp_'+id,name:'New official Ripple-family post',level:2,meme:'radio',memeLabel:'OFFICIAL POST',joke:`${x.source}: "${x.title}"`,src:'GDELT',t:Date.now(),link:x.link}); }
    else if(x.cred){ logEv('news',x.title,(f.st==='core'?'Ripple/XRP':f.n)+' headline · '+x.source,{link:x.link,src:x.source}); fireEvent({key:'rfn_'+id,name:f.n+' headline',level:1,meme:'radio',memeLabel:'RIPPLE FAMILY NEWS',joke:`"${x.title}" (${x.source}). A headline, not a filing.`,src:'GDELT',t:Date.now(),link:x.link}); } });
  if(changed){ S.seen=[...seen].slice(-1500); save(); } }
/* ---------- on-chain, every 15 s: RLUSD supply + issuer settings (XRPL + Ethereum) ---------- */
let busy=false;
async function chainTick(){ if(busy) return; busy=true; const out={};
  try{ const {r}=await xrpl('gateway_balances',{account:CFG.RLUSD_ISSUER,ledger_index:'validated'}); out.x=Number(r.obligations[CFG.RLUSD_HEX]); put('rlusdXrpl',out.x,'XRPL gateway_balances (15 s scan)'); }catch(e){}
  try{ const {r}=await ethCall(CFG.RLUSD_ETH,'0x18160ddd'); out.e=Number(BigInt(r))/1e18; }catch(e){}
  try{ const {r}=await ethCall(CFG.RLUSD_ETH,'0x5c975abb'); out.paused=BigInt(r)!==0n; }catch(e){}
  try{ const {r}=await xrpl('account_info',{account:CFG.RLUSD_ISSUER,ledger_index:'validated',signer_lists:true}); const a=r.account_data;
    const fp=JSON.stringify({f:a.Flags,d:a.Domain||'',tr:a.TransferRate||0,ts:a.TickSize||0,rk:a.RegularKey||'',sl:((a.signer_lists||r.signer_lists||[])[0]||{}).SignerEntries||[]});
    if(S.iss&&S.iss!==fp){ logEv('iss','RLUSD issuer settings changed on the XRP Ledger','The issuer account changed a setting (flags, domain, fee, keys or signers)',{link:'https://xrpscan.com/account/'+CFG.RLUSD_ISSUER});
      fireEvent({key:'rfiss_'+Date.now(),name:'RLUSD issuer settings changed',level:3,meme:'vault',memeLabel:'ISSUER SETTINGS CHANGED',joke:'The RLUSD issuer account on the XRP Ledger changed a setting. Check XRPScan to see what changed.',src:'XRPL account_info',t:Date.now(),link:'https://xrpscan.com/account/'+CFG.RLUSD_ISSUER}); }
    if(S.iss!==fp){ S.iss=fp; S.issT=Date.now(); } }catch(e){}
  if(out.paused!=null){ if(S.paused!=null&&S.paused!==out.paused) fireEvent({key:'rfpause_'+Date.now(),name:out.paused?'RLUSD on Ethereum PAUSED':'RLUSD on Ethereum un-paused',level:3,meme:'vault',memeLabel:out.paused?'RLUSD PAUSED':'RLUSD RESUMED',joke:'The RLUSD Ethereum contract pause switch changed.',src:'Ethereum paused()',t:Date.now(),link:'https://etherscan.io/token/'+CFG.RLUSD_ETH}); S.paused=out.paused; }
  if(out.x!=null||out.e!=null){ const prev=S.sup[0]; const tot=(out.x!=null?out.x:(prev&&prev.x)||0)+(out.e!=null?out.e:(prev&&prev.e)||0);
    const rec={t:Date.now(),x:out.x!=null?out.x:prev&&prev.x,e:out.e!=null?out.e:prev&&prev.e,tot};
    if(!prev||Date.now()-prev.t>10*60e3) S.sup.unshift(rec); else S.sup[0]={...rec,t:prev.t,tLast:Date.now()}; S.sup=S.sup.slice(0,1100); S.cur=rec;
    if(prev&&prev.tot){ const d=tot-(S.lastTot||prev.tot); if(Math.abs(d)>=1e6){ const up=d>0; logEv('sup',`RLUSD supply ${up?'up':'down'} ${fN(Math.abs(d))}`,up?'More RLUSD dollars issued':'RLUSD dollars redeemed',{amt:d});
        fireEvent({key:'rfsup_'+Math.round(tot/1e6),name:`RLUSD supply ${up?'↑':'↓'} ${fN(Math.abs(d))}`,level:Math.abs(d)>=2e7?2:1,meme:'vault',memeLabel:up?'RLUSD MINTED':'RLUSD REDEEMED',joke:`Total RLUSD (XRP Ledger + Ethereum) moved ${up?'up':'down'} by ${fN(Math.abs(d))} to ${fN(tot)}. ${up?'More':'Fewer'} digital dollars exist.`,src:'XRPL + Ethereum',t:Date.now()}); } }
    S.lastTot=tot; save(); }
  busy=false; render(); }
/* ---------- XRPL stream: escrow + Ripple-labelled wallets (XRPScan public labels only) ---------- */
let RIP=null; function ripSet(){ if(RIP&&RIP.size) return RIP; const g=(typeof NAMES!=='undefined'&&NAMES)||{}; const m=Object.keys(g).length?g:(LS.get('names',{}).map||{}); RIP=new Set(Object.keys(m).filter(a=>/^Ripple( \d+| Labs)?$/i.test(String(m[a]).trim()))); return RIP; }
setInterval(()=>{ RIP=null; },30*60e3);
const nm=a=>{ const m=(typeof NAMES!=='undefined'&&NAMES)||{}; return m[a]||String(a).slice(0,8)+'…'; };
function hookWS(){ const w=(typeof ws!=='undefined')?ws:null; if(!w||w.__rf) return; w.__rf=1; w.addEventListener('message',ev=>{ let m; try{ m=JSON.parse(ev.data); }catch(e){ return; }
  if(m.type!=='transaction'||!m.validated||m.engine_result!=='tesSUCCESS') return; const tx=m.transaction||m.tx_json||{}, meta=m.meta||{}, R=ripSet(); if(!R.size) return;
  const ty=tx.TransactionType, h=m.hash||tx.hash, link='https://xrpscan.com/tx/'+h;
  if(/^Escrow(Create|Finish|Cancel)$/.test(ty)&&(R.has(tx.Account)||R.has(tx.Owner)||R.has(tx.Destination))){
    let amt=tx.Amount!=null&&typeof tx.Amount==='string'?+tx.Amount/1e6:null; if(amt==null){ (meta.AffectedNodes||[]).forEach(n=>{ const d=n.DeletedNode; if(d&&d.LedgerEntryType==='Escrow'&&d.FinalFields&&typeof d.FinalFields.Amount==='string') amt=+d.FinalFields.Amount/1e6; }); }
    const rel=ty!=='EscrowCreate'; const e=logEv('esc',`${amt!=null?fN(amt)+' XRP ':''}${rel?'released from':'locked into'} Ripple escrow`,rel?'XRP unlocked and now spendable by Ripple':'XRP put back into escrow (locked)',{link,amt});
    fireEvent({key:'rfesc_'+h,name:e.title,level:amt>=1e8?2:1,meme:'vault',memeLabel:rel?'ESCROW RELEASE':'ESCROW RELOCK',joke:`${nm(tx.Account)} ${ty}. ${e.meaning}. Ripple's escrow contracts unlock on a fixed schedule; a release is not a sale.`,src:'XRPL stream + XRPScan labels',t:Date.now(),link}); return; }
  if(ty==='Payment'&&(R.has(tx.Account)||R.has(tx.Destination))){ const del=meta.delivered_amount; if(typeof del!=='string') return; const x=+del/1e6; if(x<1e6) return;
    const out=R.has(tx.Account), both=out&&R.has(tx.Destination);
    const e=logEv('wal',`${fN(x)} XRP ${both?'moved between Ripple wallets':out?'sent from a Ripple wallet':'sent to a Ripple wallet'}`,both?'Internal shuffle':out?`To ${nm(tx.Destination)}`:`From ${nm(tx.Account)}`,{link,amt:x});
    if(!both) fireEvent({key:'rfw_'+h,name:e.title,level:x>=1e8?2:1,meme:'whale',memeLabel:'RIPPLE WALLET MOVE',joke:`${nm(tx.Account)} → ${nm(tx.Destination)}: ${fN(x)} XRP. Labels from XRPScan; a move is not a sale.`,src:'XRPL stream + XRPScan labels',t:Date.now(),link}); } }); }
setInterval(hookWS,3000);
/* ---------- render ---------- */
function ensure(){ let s=Q('#rfam'); if(s) return s; s=document.createElement('section'); s.id='rfam'; s.className='panel';
  s.innerHTML='<div class="panel-head"><h2 data-info="rfam">Ripple family · what changed</h2><span class="hint">scans every 15 s · hover for source</span></div><div id="rfStrip" class="rf-strip"></div>';
  const rn=Q('#rnRow'); if(rn) rn.after(s); else { const a=Q('#alarm'); if(a) a.after(s); else document.body.appendChild(s); } return s; }
function nextUnlock(){ const d=new Date(); return new Date(d.getFullYear(),d.getMonth()+1,1); }
function render(){ if(!Q('#rfStrip')) return; const rf=GD.rf||{}, list=(rf.list||[]).filter(x=>famOf(x)&&(x.cred||x.official));
  const off=(rf.list||[]).filter(x=>x.official&&famOf(x))[0], hd=list.filter(x=>!x.official&&!(window.isRumor&&isRumor(x.title,x.source)))[0];
  const c=S.cur||{}, d24=(()=>{ const old=S.sup.find(r=>Date.now()-r.t>=23.5*3600e3); return old&&c.tot?{d:c.tot-old.tot,p:(c.tot/old.tot-1)*100}:null; })();
  const esc_=S.ev.esc, wal=S.ev.wal;
  const tile=(cls,k,big,mean,src,t,link,info)=>`<a class="rf-t ${cls}" ${link?`href="${esc(link)}" target="_blank" rel="noopener"`:''} title="${esc((info||'')+'\nSource: '+src+(t?' · '+fT(t):''))}"><div class="rf-k">${k} ${t?tag(t):''}</div><div class="rf-big">${big}</div><div class="rf-m">${mean}</div><div class="rf-a">${t?ago(t):''}</div></a>`;
  const arrow=d24?(d24.d>0?'<i class="up">▲</i>':d24.d<0?'<i class="dn">▼</i>':'<i>■</i>'):'';
  Q('#rfStrip').innerHTML=[
   tile(hd?'':'dim','HEADLINE',hd?esc(hd.title):(rf.err?'news index unreachable':'no fresh headline'),hd?esc((famOf(hd)||{}).n+' · '+hd.source):'credible outlets only',rf.err&&!hd?'GDELT ('+rf.err+')':'GDELT news index, direct',hd&&hd.t,hd&&hd.link,'Newest headline from a credible outlet that names Ripple, RLUSD, XRP or a Ripple-owned business.'),
   tile(off?'':'dim','FROM RIPPLE ITSELF',off?esc(off.title):'nothing new in 3 days',off?esc(off.source):'ripple.com and Ripple-owned sites','GDELT index of official sites (ripple.com blocks direct reading)',off&&off.t,off?off.link:'https://ripple.com/insights/','Official posts, as indexed by GDELT. ripple.com itself refuses direct browser reads.'),
   tile(d24?(d24.d>0?'g':d24.d<0?'r':''):'','RLUSD SUPPLY',c.tot?`${arrow} $${fN(c.tot)}`:'reading…',d24?`${d24.p>=0?'+':''}${d24.p.toFixed(2)}% in 24 h = ${d24.d>=0?'more':'fewer'} digital dollars`:`XRPL ${fN(c.x)} · Ethereum ${fN(c.e)}`,'XRPL gateway_balances + Ethereum totalSupply(), every 15 s',c.tLast||c.t,'https://xrpscan.com/account/'+CFG.RLUSD_ISSUER,`XRP Ledger ${fN(c.x)} + Ethereum ${fN(c.e)} RLUSD. Issuer settings unchanged since ${fT(S.issT)}${S.paused?' · ETHEREUM CONTRACT PAUSED':''}.`),
   tile(esc_?'a':'dim','RIPPLE ESCROW',esc_?esc(esc_.title):'no release seen yet',esc_?esc(esc_.meaning):'next scheduled unlock: '+nextUnlock().toLocaleDateString('en-US',{month:'short',day:'numeric'}),'XRPL stream + XRPScan "Ripple" labels',esc_&&esc_.t,esc_&&esc_.link,'Ripple keeps most of its XRP in on-ledger escrow contracts that unlock on the 1st of each month; unused XRP is usually locked back up. Only seen while this page is open.'),
   tile(wal?'a':'dim','RIPPLE WALLETS',wal?esc(wal.title):'no big move seen',wal?esc(wal.meaning):`watching ${ripSet().size} wallets XRPScan labels "Ripple"`,'XRPL stream + XRPScan public labels',wal&&wal.t,wal&&wal.link,'Payments of 1M+ XRP to or from accounts XRPScan publicly labels "Ripple". No other wallet is attributed to Ripple.')].join('');
  const fl=Q('#rfLog'); if(fl) fl.innerHTML=S.log.slice(0,25).map(e=>`<a class="row" ${e.link?`href="${esc(e.link)}" target="_blank" rel="noopener"`:''}><span class="tm">${fT(e.t)}</span> ${tag(e.t)} <b>${esc(e.title)}</b> <span class="hint">${esc(e.meaning||'')}</span></a>`).join('')||'<div class="hint">Changes appear here as they happen.</div>';
  const fm=Q('#rfFam'); if(fm) fm.innerHTML=FAMILY.filter(f=>f.st!=='core').map(f=>`<a class="rf-f ${f.st}" href="${f.url}" target="_blank" rel="noopener" title="${esc(f.what+(f.d?' · since '+f.d:''))}"><b>${esc(f.n)}</b>${f.was?' <em>ex-'+esc(f.was)+'</em>':''} <span>${f.st==='announced'?'announced':esc(f.what)}</span></a>`).join(''); }
window.RFRender=render;
document.addEventListener('DOMContentLoaded',()=>{ ensure(); render(); });
if(document.readyState!=='loading'){ ensure(); render(); }
window.RFF={chainTick,gdeltTick,render};


})();

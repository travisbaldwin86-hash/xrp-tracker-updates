/* DEMAND RADAR · XRP Adoption Tracker · built for the owner.
   Every number shown is fetched live from a public, keyless source and labelled with source + time.
   If a source fails the metric shows "unavailable". Nothing is faked. */
'use strict';
const CFG = {
  RLUSD_HEX:'524C555344000000000000000000000000000000',
  RLUSD_ISSUER:'rMxCKbEDwqr76QuheSUMdEGf4B9xJ8m5De',          // docs.ripple.com/products/stablecoin/overview/token-addresses
  RLUSD_ETH:'0x8292Bb45bf1Ee4d140127049757C2E0fF06317eD',       // same page (Ethereum proxy contract, 18 decimals)
  XRPL_RPC:['https://xrplcluster.com/','https://s1.ripple.com:51234/','https://xrpl.ws/'],
  XRPL_WS:['wss://xrplcluster.com','wss://s1.ripple.com','wss://xrpl.ws'],
  ETH_RPC:['https://ethereum-rpc.publicnode.com','https://eth.drpc.org'],
  REFRESH_MS:5*60*1000, NEWS_MS:15*60*1000, WHALE_XRP:1e6, WHALE_BANNER:1e7, WHALE_HUGE:1e8,
  EVERNORTH:{ticker:'XRPN', cik:'0002092592', xrp:473e6,
    xrpSrc:'Evernorth press release, Oct 9 2026', xrpUrl:'https://www.evernorth.xyz/press-release-10-09-2026',
    // Share counts from SEC Form 8-K filed Oct 13 2026 (acc. 0001193125-26-419605), "as of Closing" (Oct 9 2026)
    shares:{classA:23638882, classC:31392746, units:22953128},
    sharesSrc:'SEC 8-K filed Oct 13 2026 (acc. 0001193125-26-419605)',
    sharesUrl:'https://www.sec.gov/Archives/edgar/data/2092592/000119312526419605/d118629d8k.htm',
    listed:Date.UTC(2026,9,12)}
};
const PROXY = location.protocol.startsWith('http') ? '/proxy?u=' : null;
const $ = (s,el=document)=>el.querySelector(s);
const setLabel=(el,t)=>{ const ib=el.querySelector('.ib'); el.textContent=t; if(ib) el.appendChild(ib); };
const now = ()=>Date.now();
const LS = { get(k,d){try{const v=localStorage.getItem('dr_'+k);return v?JSON.parse(v):d}catch(e){return d}},
             set(k,v){try{localStorage.setItem('dr_'+k,JSON.stringify(v))}catch(e){}} };
const settings = Object.assign({serious:false,sound:false,range:7,newsTab:'DTCC'},LS.get('settings',{}));
const saveSettings=()=>LS.set('settings',settings);

/* ---------- formatting ---------- */
const tz='America/New_York';
const fT = t=> t? new Date(t).toLocaleString('en-US',{timeZone:tz,month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})+' ET' : '';
const fTime = t=> new Date(t).toLocaleTimeString('en-US',{timeZone:tz,hour:'numeric',minute:'2-digit'});
const fD = t=> new Date(t).toLocaleDateString('en-US',{timeZone:'UTC',month:'short',day:'numeric'});
function fN(v,d=2){ if(v==null||!isFinite(v)) return '—'; const a=Math.abs(v);
  if(a>=1e12) return (v/1e12).toFixed(d)+'T'; if(a>=1e9) return (v/1e9).toFixed(d)+'B'; if(a>=1e6) return (v/1e6).toFixed(d)+'M'; if(a>=1e4) return (v/1e3).toFixed(1)+'K';
  return v.toLocaleString('en-US',{maximumFractionDigits:d}); }
const fUSD=(v,d=2)=> v==null||!isFinite(v)?'—':'$'+fN(v,d);
const fPx=v=> v==null?'—':'$'+(v>=100?v.toFixed(2):v>=1?v.toFixed(4):v.toFixed(5));
const fPct=(v,d=2)=> v==null||!isFinite(v)?'—':(v>0?'+':'')+v.toFixed(d)+'%';
const cls=v=> v==null?'na':v>0?'up':v<0?'down':'flat';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const srcLine=(src,t,extra)=>`<div class="src">Source: ${src}${t?' · updated '+fT(t):''}${extra?' · '+extra:''}</div>`;
const UNAV = reason=>`<span class="na-box">unavailable${reason?' ('+esc(reason)+')':''}</span>`;

/* ---------- fetching ---------- */
async function fetchJSON(url,opt={},ms=20000){
  const c=new AbortController(); const id=setTimeout(()=>c.abort(),ms);
  try{ const r=await fetch(url,{...opt,signal:c.signal}); if(!r.ok) throw new Error('HTTP '+r.status); return await r.json(); }
  finally{ clearTimeout(id); } }
async function fetchText(url,ms=20000){ const c=new AbortController(); const id=setTimeout(()=>c.abort(),ms);
  try{ const r=await fetch(url,{signal:c.signal}); if(!r.ok) throw new Error('HTTP '+r.status); return await r.text(); } finally{clearTimeout(id)} }
const viaProxy=u=>{ if(!PROXY) throw new Error('needs the local launcher server, which is not running'); return PROXY+encodeURIComponent(u); };
async function xrpl(method,params={}){
  let last; for(const ep of CFG.XRPL_RPC){ try{
    const j=await fetchJSON(ep,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({method,params:[params]})},15000);
    if(j.result && j.result.status==='success') return {r:j.result,src:new URL(ep).hostname};
    last=new Error(j.result&&j.result.error||'bad response'); }catch(e){last=e} } throw last; }
async function ethCall(to,data){ let last; for(const ep of CFG.ETH_RPC){ try{
    const j=await fetchJSON(ep,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'eth_call',params:[{to,data},'latest']})},15000);
    if(j.result) return {r:j.result,src:new URL(ep).hostname}; last=new Error(j.error&&j.error.message||'no result'); }catch(e){last=e} } throw last; }
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

/* ---------- state ---------- */
const D = {};   // key -> {v, t, src, err}
function put(k,v,src){ D[k]={v,t:now(),src}; }
function fail(k,e,src){ D[k]={v:null,t:now(),src,err:(e&&e.message)||String(e)}; console.warn(k,e); }
const val=k=>D[k]&&D[k].v;

/* ---------- loaders ---------- */
async function loadXRPL(){
  await Promise.all([
    xrpl('server_info').then(({r,src})=>{ const v=r.info.validated_ledger; put('server',{seq:v.seq,base:v.base_fee_xrp,resBase:v.reserve_base_xrp,resInc:v.reserve_inc_xrp,load:r.info.load_factor,closeTime:r.info.time},src);}).catch(e=>fail('server',e,'XRPL')),
    xrpl('ledger',{ledger_index:'validated'}).then(({r,src})=>{ const tc=Number(r.ledger.total_coins)/1e6; put('coins',{total:tc,burned:1e11-tc,idx:+r.ledger.ledger_index,time:r.ledger.close_time_iso},src);}).catch(e=>fail('coins',e,'XRPL')),
    xrpl('fee').then(({r,src})=>put('fee',{open:+r.drops.open_ledger_fee,median:+r.drops.median_fee,base:+r.drops.base_fee,q:+r.current_queue_size},src)).catch(e=>fail('fee',e,'XRPL')),
    xrpl('gateway_balances',{account:CFG.RLUSD_ISSUER,ledger_index:'validated'}).then(({r,src})=>put('rlusdXrpl',Number(r.obligations[CFG.RLUSD_HEX]),src)).catch(e=>fail('rlusdXrpl',e,'XRPL')),
    xrpl('amm_info',{asset:{currency:'XRP'},asset2:{currency:CFG.RLUSD_HEX,issuer:CFG.RLUSD_ISSUER},ledger_index:'validated'}).then(({r,src})=>{ const a=r.amm;
      put('amm',{acct:a.account,xrp:Number(a.amount)/1e6,rlusd:Number(a.amount2.value),fee:a.trading_fee/1000},src);}).catch(e=>fail('amm',e,'XRPL')),
    Promise.all([
      xrpl('book_offers',{taker_gets:{currency:'XRP'},taker_pays:{currency:CFG.RLUSD_HEX,issuer:CFG.RLUSD_ISSUER},limit:300,ledger_index:'validated'}),
      xrpl('book_offers',{taker_pays:{currency:'XRP'},taker_gets:{currency:CFG.RLUSD_HEX,issuer:CFG.RLUSD_ISSUER},limit:300,ledger_index:'validated'})
    ]).then(([a,b])=>{ const sumX=o=>o.reduce((s,x)=>s+Number(x.taker_gets_funded||x.TakerGets)/1e6,0);
      const sumR=o=>o.reduce((s,x)=>s+Number((x.taker_gets_funded||x.TakerGets).value),0);
      put('book',{xrpAsks:sumX(a.r.offers||[]),nA:(a.r.offers||[]).length,rlusdBids:sumR(b.r.offers||[]),nB:(b.r.offers||[]).length},a.src);}).catch(e=>fail('book',e,'XRPL'))
  ]);
}
async function loadXRPScan(){
  const base='https://api.xrpscan.com/api/v1/';
  await Promise.all([
    (async()=>{ let arr=null, err=null; for(let i=0;i<2&&!arr;i++){ try{ arr=await fetchJSON(base+'metrics/metric',{},45000); }catch(e){ err=e; await sleep(3000); } }
      if(arr){ const today=new Date().toISOString().slice(0,10);
        const rows=arr.filter(x=>x.date.slice(0,10)<today).slice(-400).map(x=>({t:Date.parse(x.date),accounts_created:x.metric.accounts_created,fee_total:x.metric.fee_total,payments_count:x.metric.payments_count,transaction_count:x.metric.transaction_count,active_accounts:x.metric.active_accounts,tx_per_ledger:x.metric.tx_per_ledger,ledger_interval:x.metric.ledger_interval}));
        put('daily',rows,'XRPSCAN'); LS.set('dailyCache',{t:now(),rows}); }
      else { const c=LS.get('dailyCache',null); if(c&&now()-c.t<2*864e5){ D.daily={v:c.rows,t:c.t,src:'XRPSCAN (last good fetch; live fetch failed)'}; } else fail('daily',err,'XRPSCAN'); } })(),
    fetchJSON(base+'token/RLUSD.'+CFG.RLUSD_ISSUER).then(j=>put('rlusdTok',{holders:+j.metrics.holders,trustlines:+j.metrics.trustlines,vol24:+j.metrics.volume_24h,vol7:+j.metrics.volume_7d,ex24:+j.metrics.exchanges_24h,ex7:+j.metrics.exchanges_7d,takers24:+j.metrics.takers_24h,upd:j.updatedAt},'XRPSCAN')).catch(e=>fail('rlusdTok',e,'XRPSCAN')),
    fetchJSON(base+'metrics/amm').then(arr=>{ const today=new Date().toISOString().slice(0,10); put('ammDaily',arr.filter(x=>x.date.slice(0,10)<today).slice(-200).map(x=>({t:Date.parse(x.date),...x.amm})),'XRPSCAN');}).catch(e=>fail('ammDaily',e,'XRPSCAN')),
  ]);
  // names (cached 1 day) for tagging whale moves
  const nm=LS.get('names',null);
  if(!nm||now()-nm.t>864e5){ try{ const arr=await fetchJSON(base+'names/well-known',{},40000); const map={}; arr.forEach(x=>{map[x.account]=x.name+(x.desc&&x.desc.length<12?' '+x.desc:'')}); LS.set('names',{t:now(),map}); NAMES=map; }catch(e){ if(nm) NAMES=nm.map; } } else NAMES=nm.map;
}
let NAMES={};
async function loadEth(){ try{ const {r,src}=await ethCall(CFG.RLUSD_ETH,'0x18160ddd'); put('rlusdEth',Number(BigInt(r))/1e18,src); }catch(e){ fail('rlusdEth',e,'Ethereum RPC'); } }
async function loadMarket(){
  const cg='https://api.coingecko.com/api/v3/';
  try{ const j=await fetchJSON(cg+'simple/price?ids=ripple,ripple-usd,bitcoin&vs_currencies=usd&include_market_cap=true&include_24hr_vol=true&include_24hr_change=true');
    put('px',{xrp:j.ripple.usd,xrpCh:j.ripple.usd_24h_change,mcap:j.ripple.usd_market_cap,vol:j.ripple.usd_24h_vol,rl:j['ripple-usd'].usd,rlMcap:j['ripple-usd'].usd_market_cap,rlVol:j['ripple-usd'].usd_24h_vol,btc:j.bitcoin.usd,btcCh:j.bitcoin.usd_24h_change},'CoinGecko');
  }catch(e){ fail('px',e,'CoinGecko');
    try{ const t=await fetchJSON('https://api.exchange.coinbase.com/products/XRP-USD/ticker'); put('px',{xrp:+t.price},'Coinbase Exchange'); }catch(e2){} }
  await sleep(1200);
  // full daily history for indicators (365d) — CoinGecko, fallback Coinbase candles (300d)
  try{ const j=await fetchJSON(cg+'coins/ripple/market_chart?vs_currency=usd&days=365&interval=daily',{},30000);
    put('dailyPx',j.prices.map((p,i)=>({t:p[0],c:p[1],v:(j.total_volumes[i]||[])[1]})),'CoinGecko');
  }catch(e){ try{ const c=await fetchJSON('https://api.exchange.coinbase.com/products/XRP-USD/candles?granularity=86400');
      put('dailyPx',c.reverse().map(x=>({t:x[0]*1000,c:x[4],v:x[5]*x[4]})),'Coinbase Exchange'); }catch(e2){ fail('dailyPx',e,'CoinGecko/Coinbase'); } }
  await sleep(1200);
  try{ const j=await fetchJSON(cg+'coins/ripple/market_chart?vs_currency=usd&days=7',{},30000); put('hourlyPx',j.prices.map(p=>({t:p[0],c:p[1]})),'CoinGecko'); }
  catch(e){ try{ const c=await fetchJSON('https://api.exchange.coinbase.com/products/XRP-USD/candles?granularity=3600'); put('hourlyPx',c.reverse().map(x=>({t:x[0]*1000,c:x[4]})),'Coinbase Exchange'); }catch(e2){ fail('hourlyPx',e,'CoinGecko/Coinbase'); } }
  await sleep(1200);
  try{ const j=await fetchJSON(cg+'coins/bitcoin/market_chart?vs_currency=usd&days=365&interval=daily',{},30000); put('btcDaily',j.prices.map(p=>({t:p[0],c:p[1]})),'CoinGecko'); }catch(e){ fail('btcDaily',e,'CoinGecko'); }
  await sleep(1200);
  try{ const j=await fetchJSON(cg+'global'); put('global',{btcDom:j.data.market_cap_percentage.btc,totalMcap:j.data.total_market_cap.usd,mcapCh:j.data.market_cap_change_percentage_24h_usd},'CoinGecko'); }catch(e){ fail('global',e,'CoinGecko'); }
}
async function loadSentiment(){
  await Promise.all([
    fetchJSON('https://api.alternative.me/fng/?limit=60').then(j=>put('fng',j.data.map(x=>({t:+x.timestamp*1000,v:+x.value,c:x.value_classification})),'Alternative.me')).catch(e=>fail('fng',e,'Alternative.me')),
    fetchJSON('https://www.okx.com/api/v5/public/funding-rate?instId=XRP-USDT-SWAP').then(j=>put('fundOkx',+j.data[0].fundingRate,'OKX')).catch(e=>fail('fundOkx',e,'OKX')),
    fetchJSON('https://www.okx.com/api/v5/public/funding-rate-history?instId=XRP-USDT-SWAP&limit=90').then(j=>put('fundHist',j.data.map(x=>({t:+x.fundingTime,v:+x.realizedRate})).reverse(),'OKX')).catch(e=>fail('fundHist',e,'OKX')),
    fetchJSON('https://www.okx.com/api/v5/public/open-interest?instId=XRP-USDT-SWAP').then(j=>put('oiOkx',{usd:+j.data[0].oiUsd,xrp:+j.data[0].oiCcy},'OKX')).catch(e=>fail('oiOkx',e,'OKX')),
    fetchJSON('https://api.bitget.com/api/v2/mix/market/current-fund-rate?symbol=XRPUSDT&productType=usdt-futures').then(j=>put('fundBitget',+j.data[0].fundingRate,'Bitget')).catch(e=>fail('fundBitget',e,'Bitget')),
  ]);
}
async function loadXRPN(){
  try{ const j=await fetchJSON(viaProxy('https://query1.finance.yahoo.com/v8/finance/chart/XRPN?range=3mo&interval=1d'),{},25000);
    const r=j.chart.result[0], m=r.meta; const q=r.indicators.quote[0];
    const bars=r.timestamp.map((t,i)=>({t:t*1000,c:q.close[i]})).filter(b=>b.c!=null && b.t>=CFG.EVERNORTH.listed-6*3600e3);
    put('xrpn',{price:m.regularMarketPrice,prev:m.chartPreviousClose,time:m.regularMarketTime*1000,hi:m.fiftyTwoWeekHigh,lo:m.fiftyTwoWeekLow,vol:m.regularMarketVolume,bars},'Yahoo Finance (via local launcher)');
  }catch(e){ fail('xrpn',e,'Yahoo Finance'); }
  try{ const j=await fetchJSON(viaProxy('https://data.sec.gov/submissions/CIK'+CFG.EVERNORTH.cik+'.json'),{},25000); const r=j.filings.recent;
    const list=r.form.map((f,i)=>({form:f,date:r.filingDate[i],acc:r.accessionNumber[i],doc:r.primaryDocument[i],desc:(r.primaryDocDescription||[])[i]||''}));
    put('sec',list.slice(0,40),'SEC EDGAR (via local launcher)');
  }catch(e){ fail('sec',e,'SEC EDGAR'); }
}
const NEWS = [
  {tab:'DTCC', qs:['DTCC (XRP OR Ripple OR RLUSD OR tokenization OR tokenized OR "digital assets" OR "digital asset")','site:dtcc.com'], alarm:/\b(XRP|Ripple|RLUSD|tokeni[sz]|digital asset)/i, need:/DTCC|Depository Trust/i},
  {tab:'Ripple', qs:['Ripple (RLUSD OR XRP) (announces OR launches OR partners OR "press release")']},
  {tab:'Cross River', qs:['"Cross River" (RLUSD OR Ripple OR XRP OR stablecoin OR "X Money")']},
  {tab:'Yellow', qs:['"Yellow Network" (XRPL OR XRP OR "XRP Ledger" OR RLUSD)','Yellow (XRPL OR "XRPL EVM") (clearing OR "state channels" OR agents)'], need:/Yellow/i},
  {tab:'Evernorth', qs:['Evernorth XRPN OR "Evernorth Holdings"']},
  {tab:'X Money', qs:['"X Money" (RLUSD OR XRP OR crypto OR stablecoin)','"X Money" RLUSD','"X Money" XRP'], alarm:/\b(RLUSD|XRP|crypto|stablecoin)/i, need:/X Money/i},
];
async function loadNews(){
  for(const n of NEWS){ const items=[]; let err=null;
    for(const q of n.qs){ try{
      const xml=await fetchText(viaProxy('https://news.google.com/rss/search?q='+encodeURIComponent(q+' when:30d')+'&hl=en-US&gl=US&ceid=US:en'),20000);
      const doc=new DOMParser().parseFromString(xml,'text/xml');
      doc.querySelectorAll('item').forEach(it=>{ const g=s=>(it.querySelector(s)||{}).textContent||'';
        let title=g('title'); const source=g('source'); if(source&&title.endsWith(' - '+source)) title=title.slice(0,-(source.length+3));
        items.push({title,link:g('link'),t:Date.parse(g('pubDate'))||0,source}); });
    }catch(e){err=e} await sleep(700); }
    const seen=new Set(); const uniq=items.filter(x=>{const k=x.title.toLowerCase(); if(seen.has(k))return false; seen.add(k); return true}).sort((a,b)=>b.t-a.t).slice(0,30);
    if(uniq.length) put('news_'+n.tab,uniq,'Google News RSS (via local launcher)'); else fail('news_'+n.tab,err||new Error('no results'),'Google News RSS');
  }
  checkNewsAlarms(); renderNews();
}

/* ---------- math ---------- */
const sma=(a,n,i=a.length-1)=> i+1<n?null:a.slice(i-n+1,i+1).reduce((s,x)=>s+x,0)/n;
function emaArr(a,n){ const k=2/(n+1); const out=[]; let e=null; a.forEach((x,i)=>{ if(i<n-1){out.push(null);return} if(e==null){e=a.slice(0,n).reduce((s,y)=>s+y,0)/n} else e=x*k+e*(1-k); out.push(e)}); return out; }
function rsiArr(c,n=14){ const out=Array(c.length).fill(null); let g=0,l=0; for(let i=1;i<=n&&i<c.length;i++){const d=c[i]-c[i-1]; if(d>0)g+=d; else l-=d;} g/=n; l/=n; const rv=()=>g===0&&l===0?50:l===0?100:100-100/(1+g/l); if(c.length>n) out[n]=rv();
  for(let i=n+1;i<c.length;i++){const d=c[i]-c[i-1]; g=(g*(n-1)+Math.max(d,0))/n; l=(l*(n-1)+Math.max(-d,0))/n; out[i]=rv();} return out; }
const mean=a=>a.length?a.reduce((s,x)=>s+x,0)/a.length:null;
const std=a=>{const m=mean(a);return Math.sqrt(mean(a.map(x=>(x-m)**2)))};
function trendOf(series,{recent=7,base=30,thr=5}={}){ // series: numbers oldest->newest
  if(!series||series.length<recent+base) return null;
  const r=mean(series.slice(-recent)), b=mean(series.slice(-(recent+base),-recent)); if(!b) return null;
  const pct=(r-b)/Math.abs(b)*100; return {pct,dir:pct>thr?'up':pct<-thr?'down':'flat',r,b}; }
function snapTrend(key,{thr=2}={}){ // from localStorage daily snapshots
  const s=LS.get('snaps',{}); const days=Object.keys(s).sort(); const pts=days.map(d=>({d,v:s[d][key]})).filter(x=>x.v!=null&&isFinite(x.v));
  if(pts.length<3) return {building:true,n:pts.length};
  const last=pts[pts.length-1].v, ref=pts[Math.max(0,pts.length-8)].v; const pct=(last-ref)/Math.abs(ref||1)*100;
  return {pct,dir:pct>thr?'up':pct<-thr?'down':'flat',n:pts.length,since:pts[Math.max(0,pts.length-8)].d}; }
function snapshot(){ const d=new Date().toLocaleDateString('en-CA',{timeZone:'America/New_York'}); /* ET calendar day (was UTC) */ const s=LS.get('snaps',{}); const o=s[d]||{};
  const set=(k,v)=>{ if(v!=null&&isFinite(v)) o[k]=v; };
  set('xrp',val('px')&&val('px').xrp); set('burned',val('coins')&&val('coins').burned); set('rlusdXrpl',val('rlusdXrpl')); set('rlusdEth',val('rlusdEth'));
  set('ammXrp',val('amm')&&val('amm').xrp); set('ammRlusd',val('amm')&&val('amm').rlusd); set('oi',val('oiOkx')&&val('oiOkx').usd); set('btcDom',val('global')&&val('global').btcDom);
  set('rlHolders',val('rlusdTok')&&val('rlusdTok').holders); set('xrpnMnav',calcXrpn().mnav);
  const r=val('rlusdXrpl'),e=val('rlusdEth'); if(r!=null&&e!=null) set('rlShare',r/(r+e)*100);
  const w=LS.get('watch',[]); w.forEach(a=>{ if(a.bal!=null) o['w_'+a.addr]=a.bal; });
  s[d]=o; const keys=Object.keys(s).sort(); while(keys.length>400){ delete s[keys.shift()]; } LS.set('snaps',s); }

/* ---------- canvas chart (hand-drawn, no libraries) ---------- */
function chart(canvas,series,opt={}){
  const dpr=window.devicePixelRatio||1, W=canvas.clientWidth, H=canvas.clientHeight; if(!W||!H) return;
  canvas.width=W*dpr; canvas.height=H*dpr; const g=canvas.getContext('2d'); g.setTransform(dpr,0,0,dpr,0,0);
  const pad=opt.spark?{l:4,r:46,t:6,b:6}:{l:opt.padL||54,r:opt.padR||14,t:10,b:22}; const all=series.flatMap(s=>s.data.filter(p=>p[1]!=null));
  if(!all.length){ g.fillStyle='#56708f'; g.font='13px Bahnschrift,Segoe UI'; g.fillText(opt.empty||'unavailable',pad.l,H/2); return; }
  let x0=Math.min(...all.map(p=>p[0])), x1=Math.max(...all.map(p=>p[0])); let y0=Math.min(...all.map(p=>p[1])), y1=Math.max(...all.map(p=>p[1]));
  if(opt.y0!=null) y0=Math.min(y0,opt.y0); const yp=(y1-y0)*.08||Math.abs(y1)*.05||1; y0-=yp; y1+=yp; if(x1===x0) x1=x0+1;
  const X=t=>pad.l+(t-x0)/(x1-x0)*(W-pad.l-pad.r), Y=v=>pad.t+(1-(v-y0)/(y1-y0))*(H-pad.t-pad.b);
  g.clearRect(0,0,W,H); g.font='11px Cascadia Mono,Consolas,monospace'; g.textBaseline='middle';
  if(opt.spark){ g.textAlign='left'; g.fillStyle='#56708f'; g.fillText((opt.yfmt||fN)(y1-yp),W-pad.r+4,pad.t+4); g.fillText((opt.yfmt||fN)(y0+yp),W-pad.r+4,H-pad.b-4); }
  else for(let i=0;i<=4;i++){ const v=y0+(y1-y0)*i/4, y=Y(v); g.strokeStyle='#1b2a3f'; g.lineWidth=1; g.beginPath(); g.moveTo(pad.l,y); g.lineTo(W-pad.r,y); g.stroke(); g.fillStyle='#56708f'; g.textAlign='right'; g.fillText((opt.yfmt||fN)(v),pad.l-6,y); }
  g.textAlign='center'; const span=x1-x0; if(!opt.spark) for(let i=0;i<=4;i++){ const t=x0+span*i/4; g.fillStyle='#56708f'; g.fillText(span<3*864e5?fTime(t):fD(t),X(t),H-9); }
  (opt.markers||[]).forEach(m=>{ if(m.t<x0||m.t>x1) return; const x=X(m.t); g.strokeStyle=m.color||'#ffb547'; g.setLineDash([3,3]); g.beginPath(); g.moveTo(x,pad.t); g.lineTo(x,H-pad.b); g.stroke(); g.setLineDash([]); g.fillStyle=m.color||'#ffb547'; g.textAlign='left'; g.fillText(m.label,x+4,pad.t+8); });
  series.forEach(s=>{ const pts=s.data.filter(p=>p[1]!=null); if(!pts.length) return;
    if(s.fill){ const grd=g.createLinearGradient(0,pad.t,0,H-pad.b); grd.addColorStop(0,s.fill); grd.addColorStop(1,'transparent'); g.fillStyle=grd; g.beginPath(); g.moveTo(X(pts[0][0]),H-pad.b); pts.forEach(p=>g.lineTo(X(p[0]),Y(p[1]))); g.lineTo(X(pts[pts.length-1][0]),H-pad.b); g.closePath(); g.fill(); }
    g.strokeStyle=s.color; g.lineWidth=s.width||1.6; if(s.dash) g.setLineDash(s.dash); g.beginPath(); pts.forEach((p,i)=>i?g.lineTo(X(p[0]),Y(p[1])):g.moveTo(X(p[0]),Y(p[1]))); g.stroke(); g.setLineDash([]); });
  const s0=series[0]; const lp=s0.data.filter(p=>p[1]!=null).slice(-1)[0]; if(lp){ g.fillStyle=s0.color; g.beginPath(); g.arc(X(lp[0]),Y(lp[1]),3.5,0,7); g.fill(); g.shadowColor=s0.color; g.shadowBlur=12; g.fill(); g.shadowBlur=0; }
  let lx=pad.l+6; series.forEach(s=>{ if(!s.label) return; g.fillStyle=s.color; g.fillRect(lx,pad.t+2,10,3); g.fillStyle='#8197b3'; g.textAlign='left'; g.fillText(s.label,lx+14,pad.t+4); lx+=g.measureText(s.label).width+30; });
  canvas._hover={X,Y,x0,x1,pad,W,H,series,opt};
  if(!canvas._bound){ canvas._bound=1; canvas.addEventListener('mousemove',ev=>{ const h=canvas._hover; if(!h) return; const rect=canvas.getBoundingClientRect(); const mx=ev.clientX-rect.left;
      const t=h.x0+(mx-h.pad.l)/(h.W-h.pad.l-h.pad.r)*(h.x1-h.x0); chart(canvas,h.series,h.opt); const pts=h.series[0].data.filter(p=>p[1]!=null); if(!pts.length) return;
      let best=pts[0]; pts.forEach(p=>{ if(Math.abs(p[0]-t)<Math.abs(best[0]-t)) best=p; }); const gg=canvas.getContext('2d'); const x=h.X(best[0]), y=h.Y(best[1]);
      gg.strokeStyle='#ffffff40'; gg.beginPath(); gg.moveTo(x,h.pad.t); gg.lineTo(x,h.H-h.pad.b); gg.stroke(); const label=(h.opt.tip||((p)=>fN(p[1],4)))(best)+'  '+fT(best[0]);
      gg.font='12px Cascadia Mono,Consolas,monospace'; const w=gg.measureText(label).width+12; const bx=Math.min(Math.max(x-w/2,h.pad.l),h.W-w-4);
      gg.fillStyle='#0b1422ee'; gg.fillRect(bx,h.pad.t+14,w,20); gg.strokeStyle='#36e2cf'; gg.strokeRect(bx,h.pad.t+14,w,20); gg.fillStyle='#e6eef8'; gg.textAlign='left'; gg.fillText(label,bx+6,h.pad.t+24); gg.fillStyle='#36e2cf'; gg.beginPath(); gg.arc(x,y,4,0,7); gg.fill(); });
    canvas.addEventListener('mouseleave',()=>{ const h=canvas._hover; if(h) chart(canvas,h.series,h.opt); }); }
}

/* ---------- signals ---------- */
function indicators(){
  const d=val('dailyPx'); if(!d||d.length<60) return null;
  const c=d.map(x=>x.c), v=d.map(x=>x.v||0), last=c.length-1;
  const rsi=rsiArr(c); const ma50=c.map((_,i)=>sma(c,50,i)), ma200=c.map((_,i)=>sma(c,200,i));
  let macd,sig,hist; if(window.TI){ const M=TI.macd(c); macd=M.macd; sig=M.sig; hist=M.hist; } else { // TA-Lib-identical MACD lives in tvchart.js
  const e12=emaArr(c,12), e26=emaArr(c,26); macd=c.map((_,i)=>e12[i]!=null&&e26[i]!=null?e12[i]-e26[i]:null);
  const mv=macd.filter(x=>x!=null); const sigA=emaArr(mv,9); const off=macd.length-mv.length; sig=macd.map((_,i)=>i<off?null:sigA[i-off]);
  hist=macd.map((m,i)=>m!=null&&sig[i]!=null?m-sig[i]:null); }
  const bbw=c.map((_,i)=>{ if(i<19) return null; const w=c.slice(i-19,i+1); const m=mean(w), s=std(w); return 4*s/m*100; });
  let cross=null; for(let i=last;i>0&&i>last-120;i--){ if(ma50[i]==null||ma200[i]==null||ma50[i-1]==null||ma200[i-1]==null) break;
    const a=ma50[i]-ma200[i], b=ma50[i-1]-ma200[i-1]; if(a>0&&b<=0){cross={type:'golden',t:d[i].t,ago:last-i};break} if(a<0&&b>=0){cross={type:'death',t:d[i].t,ago:last-i};break} }
  let macdX=null; for(let i=last;i>last-10&&i>0;i--){ if(hist[i]==null||hist[i-1]==null) break; if(hist[i]>0&&hist[i-1]<=0){macdX={dir:'up',ago:last-i};break} if(hist[i]<0&&hist[i-1]>=0){macdX={dir:'down',ago:last-i};break} }
  const vol30=mean(v.slice(-31,-1)); const bbHist=bbw.slice(-180).filter(x=>x!=null); const bbNow=bbw[last]; const bbPct=bbHist.length&&bbNow!=null?bbHist.filter(x=>x<bbNow).length/bbHist.length*100:null;
  return {d,c,rsi:rsi[last],rsiPrev:rsi[last-1],ma50:ma50[last],ma200:ma200[last],ma50s:ma50,ma200s:ma200,price:c[last],macd:macd[last],sig:sig[last],hist:hist[last],cross,macdX,volNow:v[last],vol30,volRatio:vol30>0?v[last]/vol30:null,bbNow,bbPct};
}
function computeSignals(){
  const I=indicators(), S=[], src=D.dailyPx?D.dailyPx.src:'', t=D.dailyPx&&D.dailyPx.t;
  const add=o=>S.push(Object.assign({level:0,src,t},o));
  if(I){
    const r=I.rsi; let lv=0,st='Neutral zone (30–70)',meme='zen',ml='RSI '+r.toFixed(0)+': chillin';
    if(r>=70){lv=3;st='Overbought (≥70)';meme='sweat';ml='RSI '+(I.rsiPrev||r).toFixed(0)+'… '+r.toFixed(0)+'… OVERBOUGHT'} else if(r>=65){lv=2;st='Approaching overbought';meme='sweat';ml='RSI '+r.toFixed(0)+'… almost 70…'}
    else if(r<=30){lv=3;st='Oversold (≤30)';meme='oversold';ml='RSI '+r.toFixed(0)+': OVERSOLD'} else if(r<=35){lv=2;st='Approaching oversold';meme='oversold';ml='RSI '+r.toFixed(0)+': getting cheap-ish'}
    add({key:'rsi',name:'RSI (14-day, Wilder)',value:r.toFixed(1),state:st,level:lv,meme,memeLabel:ml,joke:lv?(r>50?'Ledge is sweating: buyers have been running hot for 14 days straight.':'Ledge face-planted: sellers have dominated the last 14 days.'):'Nothing dramatic. Ledge is meditating.',
      how:'Above 70 = recent gains were unusually strong ("overbought"); below 30 = unusually weak ("oversold").',rel:'<b>Noisy.</b> Daily closes at 00:00 UTC plus today\'s live price. Can stay overbought for weeks in strong trends. Most useful combined with trend (200-day MA).'});
    if(I.ma200!=null&&I.ma50!=null){ const gold=I.ma50>I.ma200; const c=I.cross; let lv2=1, meme2=gold?'rocket':'cliff', st2=(gold?'50-day above 200-day (golden-cross regime)':'50-day below 200-day (death-cross regime)')+(c?' · last cross '+fD(c.t)+' ('+c.ago+'d ago)':'');
    if(c&&c.ago<=10) lv2=3;
    add({key:'cross',name:'50/200-day MA',value:fPx(I.ma50)+' / '+fPx(I.ma200),state:st2+(I.price>I.ma200?' · price above 200-day':' · price below 200-day'),level:lv2,meme:meme2,memeLabel:gold?'GOLDEN CROSS':'DEATH CROSS',
      joke:gold?'Ledge strapped into a rocket: the 50-day average is riding above the 200-day.':'Ledge walked off a cliff: the 50-day average sank under the 200-day.',
      how:'Golden cross (50 crosses above 200) is read as a long-term uptrend; death cross the opposite.',rel:'<b>Lagging.</b> Confirms trends late; whipsaws often in sideways markets.'}); }
    const mx=I.macdX; add({key:'macd',name:'MACD (12,26,9)',value:I.hist.toFixed(4),state:(I.hist>0?'Momentum positive (MACD above signal)':'Momentum negative (MACD below signal)')+(mx?` · flipped ${mx.dir} ${mx.ago}d ago`:''),level:mx&&mx.ago<=3?2:0,meme:I.hist>0?'rocket':'cliff',memeLabel:mx?'MACD flipped '+mx.dir.toUpperCase():'MACD '+(I.hist>0?'up':'down'),
      joke:I.hist>0?'Momentum engine sputtering upward.':'Momentum engine pointing down.',how:'Histogram above 0 = short-term momentum beating the longer trend; a flip is a momentum change.',rel:'<b>Lagging + noisy</b> on daily crypto charts; many false flips in chop.'});
    const vr=I.volRatio; if(vr!=null) add({key:'volume',name:'Volume vs 30-day avg',value:vr.toFixed(2)+'×',state:fUSD(I.volNow,2)+' 24h vs '+fUSD(I.vol30,2)+' avg',level:vr>=2?2:vr<=0.5?1:0,meme:vr>=2?'megaphone':vr<=0.5?'sleep':'calm',memeLabel:vr>=2?'VOLUME SPIKE '+vr.toFixed(1)+'×':vr<=.5?'Volume nap time':'Normal volume',
      joke:vr>=2?'Everyone is suddenly yelling about XRP at once.':vr<=.5?'Trading floor is empty. Ledge fell asleep.':'Business as usual.',how:'Big moves on high volume are read as more "real" than moves on thin volume.',rel:'<b>Context only.</b> Exchange-reported volume includes wash trading; direction not implied.'});
    const bp=I.bbPct; if(bp!=null) add({key:'bbw',name:'Bollinger Band width',value:I.bbNow.toFixed(1)+'%',state:`${bp.toFixed(0)}th percentile of last 180 days`,level:bp<=10?2:bp>=90?1:0,meme:bp<=10?'sleep':bp>=90?'megaphone':'calm',memeLabel:bp<=10?'SQUEEZE: so quiet…':bp>=90?'Volatility wide open':'Normal volatility',
      joke:bp<=10?'Price is coiled up and suspiciously quiet.':bp>=90?'Bands blown wide: big swings happening.':'Volatility is ordinary.',how:'Very narrow bands ("squeeze") often come before a big move.',rel:'<b>No direction.</b> Tells you volatility may expand, not which way.'});
  } else add({key:'rsi',name:'Price indicators',value:'—',state:UNAV(D.dailyPx&&D.dailyPx.err),how:'RSI, MAs, MACD, volume, Bollinger need daily history.',rel:''});
  const f=val('fundOkx'), fb=val('fundBitget');
  if(f!=null){ const p=f*100; const lv=Math.abs(f)>=0.001?3:Math.abs(f)>=0.0005?2:0;
    add({key:'funding',name:'Perp funding rate',value:p.toFixed(4)+'% /8h',state:(f>0?'Longs pay shorts':'Shorts pay longs')+(fb!=null?` · Bitget ${(fb*100).toFixed(4)}%`:''),level:lv,meme:lv?'seesaw':'calm',memeLabel:lv?(f>0?'CROWDED LONGS':'CROWDED SHORTS'):'Funding normal',src:'OKX'+(fb!=null?' + Bitget':''),t:D.fundOkx.t,
      joke:lv?'Everyone piled on one end of the seesaw. Seesaws do what seesaws do.':'Leverage looks balanced.',how:'High positive funding = leveraged traders crowded long; very negative = crowded short.',rel:'<b>Contrarian, imperfect.</b> Extremes precede squeezes sometimes, not reliably; covers derivatives only.'});
  } else add({key:'funding',name:'Perp funding rate',value:'—',state:UNAV(D.fundOkx&&D.fundOkx.err),src:'OKX',how:'',rel:''});
  const oi=val('oiOkx'); if(oi){ const tr=snapTrend('oi',{thr:5}); add({key:'oi',name:'Open interest (OKX XRP perp)',value:fUSD(oi.usd),state:tr.building?`Trend builds from daily snapshots (${tr.n} so far)`:`${fPct(tr.pct,1)} since ${tr.since}`,level:0,src:'OKX',t:D.oiOkx.t,
      how:'Rising OI with rising price = new leveraged money joining; falling OI = positions closing.',rel:'<b>One venue only</b> (OKX); a slice of the market, not the total.'}); }
  else add({key:'oi',name:'Open interest',value:'—',state:UNAV(D.oiOkx&&D.oiOkx.err),src:'OKX',how:'',rel:''});
  const fg=val('fng'); if(fg&&fg.length){ const x=fg[0]; const lv=x.v<=20||x.v>=80?3:x.v<=25||x.v>=75?2:0;
    add({key:'fng',name:'Fear & Greed (crypto)',value:x.v+' · '+x.c,state:`yesterday ${fg[1]?fg[1].v:'—'}, a week ago ${fg[7]?fg[7].v:'—'}`,level:lv,meme:x.v<=25?'panic':x.v>=75?'greed':'zen',memeLabel:x.v<=25?'EXTREME FEAR':x.v>=75?'EXTREME GREED':x.c.toUpperCase(),src:'Alternative.me',t:D.fng.t,
      joke:x.v<=25?'Ledge is running in circles screaming.':x.v>=75?'Ledge has dollar signs for eyes. Historically a "careful" sign.':'Moods are mid.',how:'Market-wide crypto sentiment 0–100 (mostly Bitcoin-driven). Extremes are often read contrarian.',rel:'<b>Broad, not XRP-specific.</b> Extremes can last a long time.'}); }
  else add({key:'fng',name:'Fear & Greed',value:'—',state:UNAV(D.fng&&D.fng.err),src:'Alternative.me',how:'',rel:''});
  const gl=val('global'); if(gl){ const tr=snapTrend('btcDom',{thr:1}); add({key:'btcdom',name:'BTC dominance',value:gl.btcDom.toFixed(2)+'%',state:tr.building?`Total crypto cap ${fUSD(gl.totalMcap)} (${fPct(gl.mcapCh,1)} 24h)`:`${fPct(tr.pct,1)} since ${tr.since}`,level:0,src:'CoinGecko',t:D.global.t,
      how:'Rising dominance = money favoring Bitcoin over altcoins like XRP; falling = "alt season" talk.',rel:'<b>Macro context</b>; stablecoin growth also lowers it.'}); }
  const bd=val('btcDaily'), xd=val('dailyPx'); if(bd&&xd&&bd.length>31){ const ratio=xd.slice(-31).map((x,i)=>x.c/(bd[bd.length-31+i]||{}).c); const nowR=val('px')?val('px').xrp/val('px').btc:ratio[ratio.length-1]; const ch=(ratio[ratio.length-1]/ratio[0]-1)*100;
    add({key:'xrpbtc',name:'XRP/BTC ratio',value:(nowR*1e8).toFixed(0)+' sats',state:`${fPct(ch,1)} over 30 days`,level:Math.abs(ch)>=15?1:0,meme:ch>0?'party':'shrug',memeLabel:'XRP/BTC '+fPct(ch,0),src:'CoinGecko',t:D.btcDaily.t,
      how:'Is XRP beating or lagging Bitcoin? Rising = XRP outperforming.',rel:'<b>Relative only</b>; both can fall together.'}); }
  const wh=LS.get('whales',[]).filter(w=>now()-w.t<864e5); const tot=wh.reduce((s,w)=>s+w.xrp,0);
  add({key:'whalesig',name:'Whale payments (≥1M XRP)',value:wh.length+' in 24h',state:`${fN(tot)} XRP moved (seen while this page was open)`,level:0,src:'XRPL live stream',t:now(),
    how:'Big transfers into exchanges are read as possible selling; out of exchanges as holding.',rel:'<b>Often internal</b> exchange/custody shuffles. Only counts what this page saw live.'});
  return S;
}

/* ---------- adoption cards ---------- */
const DIRS={up:['▲','up','Rising'],down:['▼','down','Falling'],flat:['■','flat','Flat']};
function badge(tr){ if(!tr) return '<span class="badge na">no history</span>'; if(tr.building) return `<span class="badge na">building history (${tr.n}d)</span>`; const d=DIRS[tr.dir]; return `<span class="badge ${d[1]}">${d[0]} ${d[2]} ${fPct(tr.pct,1)}</span>`; }
function card({k,num,small,rows,what,src,t,idx,tr,id,extra,info}){ return `<div class="card ${idx?'check':''}" ${id?`id="${id}"`:''}>${idx?`<div class="idx">${idx}</div>`:''}<div class="k"><span ${info?`data-info="${info}"`:''}>${k}</span>${tr!==undefined?badge(tr):''}</div>
  <div class="num ${small?'small':''}">${num}</div>${rows?`<div class="rows">${rows}</div>`:''}${extra||''}${what?`<div class="what">${what}</div>`:''}${srcLine(src,t)}</div>`; }
function dailySeries(key){ const d=val('daily'); return d?d.map(x=>x[key]):null; }
function trends(){ // single source of truth for scorecard + verdict
  const T={};
  T.newAcc=trendOf(dailySeries('accounts_created'));
  T.burn=trendOf(dailySeries('fee_total'));
  T.payments=trendOf(dailySeries('payments_count'));
  T.active=trendOf(dailySeries('active_accounts'));
  const ad=val('ammDaily'); T.ammLocked=ad?trendOf(ad.map(x=>x.xrp_locked),{thr:3}):null;
  const tok=val('rlusdTok'); T.rlDex=tok&&tok.vol7?(()=>{const pct=(tok.vol24/(tok.vol7/7)-1)*100; return {pct,dir:pct>10?'up':pct<-10?'down':'flat'}})():null;
  T.rlXrpl=snapTrend('rlusdXrpl',{thr:1}); T.rlEth=snapTrend('rlusdEth',{thr:1}); T.rlShare=snapTrend('rlShare',{thr:1});
  T.ammPool=snapTrend('ammXrp',{thr:2}); T.rlHolders=snapTrend('rlHolders',{thr:1}); T.burned=snapTrend('burned',{thr:0.0001});
  return T;
}
function renderAdoption(){
  const T=trends(), g=$('#adoptGrid'); const px=val('px'); const xp=px&&px.xrp;
  const amm=val('amm'), book=val('book'), tok=val('rlusdTok'), flow=todayFlow();
  let h='';
  // 1 routing
  h+=card({info:'a1',idx:1,k:'Do RLUSD payments route through XRP?',tr:T.rlDex,
    num: amm?`${fN(amm.xrp)} XRP + ${fN(amm.rlusd)} RLUSD`:UNAV(D.amm&&D.amm.err), small:true,
    rows:(amm?`AMM pool depth ≈ ${fUSD(amm.xrp*(xp||0)+amm.rlusd)} · implied XRP ${fPx(amm.rlusd/amm.xrp)} · fee ${amm.fee}%<br>`:'')+
      (book?`Order book: ${fN(book.xrpAsks)} XRP offered for RLUSD · ${fN(book.rlusdBids)} RLUSD offered for XRP<br>`:'')+
      (tok?`RLUSD DEX volume 24h ${fUSD(tok.vol24)} (${fN(tok.ex24,0)} trades) · 7d ${fUSD(tok.vol7)}<br>`:'')+
      `Seen live today: ${flow.rlusdPay} RLUSD payments (${fN(flow.rlusdVol)} RLUSD), ${flow.viaXrp} converted through XRP`,
    what:'<b>What this means:</b> RLUSD only creates XRP demand when someone actually swaps through XRP (the AMM pool or order book). A deeper pool and more RLUSD→XRP conversions = more real use of XRP as the bridge. A partnership announcement alone changes none of these numbers.',
    src:'XRPL (amm_info, book_offers) + XRPSCAN token stats + live XRPL stream',t:(D.amm||{}).t});
  // 2 payment firms
  const w=LS.get('watch',[]);
  h+=card({info:'a2',idx:2,k:'XRP held by payment firms',num:'Cross River: not disclosed',small:true,
    rows:'No credible public source identifies Cross River XRPL addresses or XRP holdings, so none are shown. Add any address you trust below to track its XRP balance daily.',
    extra:`<div class="watch">${w.map(a=>`<div class="rows">${esc(a.label||a.addr.slice(0,10)+'…')}: <b>${a.bal!=null?fN(a.bal)+' XRP':'unavailable'}</b> ${a.t?'<span class="src" style="display:inline">'+fT(a.t)+'</span>':''} <a href="#" data-rm="${esc(a.addr)}">remove</a></div>`).join('')}
      <div style="display:flex;gap:6px;margin-top:6px;align-items:center"><span data-info="watch" class="infoanchor"></span><input class="addr" id="watchAddr" placeholder="r… address"><input class="addr" id="watchLabel" placeholder="label" style="max-width:110px"><button class="tiny" id="watchAdd">track</button></div></div>`,
    what:'<b>What this means:</b> If payment firms start holding XRP (not just RLUSD), that is direct demand. Until a firm discloses addresses or holdings, this stays "not disclosed" instead of guessing.',
    src:'XRPL account_info for addresses you add',t:null});
  // 3 new accounts
  const dd=val('daily'); const last=dd&&dd[dd.length-1];
  h+=card({info:'a3',idx:3,k:'New XRPL accounts per day',tr:T.newAcc,num:last?fN(last.accounts_created,0):UNAV(D.daily&&D.daily.err),
    rows:T.newAcc?`7-day avg ${fN(T.newAcc.r,0)} vs prior 30-day avg ${fN(T.newAcc.b,0)} · last full day ${last?fD(last.t):''}`:'',
    extra:'<div style="position:relative" class="chart-wrap spark-wrap" data-info="spNewAcc"><canvas class="spark" id="spNewAcc"></canvas></div>',
    what:'<b>What this means:</b> Each new account locks 1 XRP as a reserve, so real growth = small but real XRP demand. Banks can serve thousands of customers from one address, so this undercounts institutional use.',
    src:'XRPSCAN daily metrics',t:(D.daily||{}).t});
  // 4 burn
  const coins=val('coins');
  h+=card({info:'a4',idx:4,k:'XRP burned in fees',tr:T.burn,num:coins?Math.round(coins.burned).toLocaleString('en-US')+' XRP total':UNAV(D.coins&&D.coins.err),
    rows:(last?`Last full day: ${fN(last.fee_total,1)} XRP burned`:'')+(T.burn?` · 7-day avg ${fN(T.burn.r,1)} vs 30-day ${fN(T.burn.b,1)}`:'')+(coins?`<br>Supply now ${Math.round(coins.total).toLocaleString('en-US')} XRP (100B − burned) · ledger #${coins.idx.toLocaleString()}`:''),
    extra:'<div style="position:relative" class="chart-wrap spark-wrap" data-info="spBurn"><canvas class="spark" id="spBurn"></canvas></div>',
    what:'<b>What this means:</b> Every transaction destroys a tiny XRP fee forever. A sustained jump in daily burn = more ledger usage. It is tiny relative to supply, so it signals usage, not scarcity.',
    src:'XRPL ledger (total_coins) + XRPSCAN daily fee totals',t:(D.coins||{}).t});
  // 5 RLUSD supply
  const rx=val('rlusdXrpl'), re=val('rlusdEth'); const tot=(rx||0)+(re||0);
  h+=card({info:'a5',idx:5,k:'RLUSD supply: XRPL vs Ethereum',tr:T.rlShare,num:(rx!=null&&re!=null)?`${(rx/tot*100).toFixed(1)}% on XRPL`:'partial',small:false,
    extra:(rx!=null&&re!=null)?`<div class="share"><i style="width:${rx/tot*100}%;background:var(--cyan)"></i><i style="flex:1;background:var(--violet)"></i></div>`:'',
    rows:`XRPL: ${rx!=null?fN(rx)+' RLUSD':UNAV(D.rlusdXrpl&&D.rlusdXrpl.err)} ${badge(T.rlXrpl)}<br>Ethereum: ${re!=null?fN(re)+' RLUSD':UNAV(D.rlusdEth&&D.rlusdEth.err)} ${badge(T.rlEth)}`+(tok?`<br>XRPL holders ${fN(tok.holders,0)} · trustlines ${fN(tok.trustlines,0)}`:'')+(px&&px.rlMcap?`<br>Total RLUSD market cap (all chains) ${fUSD(px.rlMcap)}`:''),
    what:'<b>What this means:</b> RLUSD on the XRP Ledger is the only kind that can bridge through XRP. A growing XRPL share means more of the stablecoin lives where XRP can be used; RLUSD on Ethereum does nothing for XRP.',
    src:`XRPL gateway_balances (${(D.rlusdXrpl||{}).src||'XRPL'}) + Ethereum totalSupply (${(D.rlusdEth||{}).src||'RPC'})`,t:(D.rlusdXrpl||{}).t});
  // 6 Cross River disclosures
  h+=card({info:'a6',idx:6,k:'Cross River disclosures',num:'No volume or XRP holdings figures tracked',small:true,
    rows:'This dashboard has no verified public Cross River RLUSD payment volume or XRP holdings. Watch the Cross River tab in the Newswire and the newsroom link below for any official numbers.',
    extra:`<div class="rows"><a href="https://www.crossriver.com/newsroom" target="_blank" rel="noopener">Cross River newsroom</a> · <a href="https://x.com/search?q=from%3ACrossRiverBank%20RLUSD&f=live" target="_blank" rel="noopener">X: from:CrossRiverBank RLUSD</a></div>`,
    what:'<b>What this means:</b> The day Cross River publishes RLUSD payment volumes, or says payments settle through XRP, is the day the partnership becomes measurable. Until then it is a headline.',
    src:'Manual watch (no keyless data feed exists)',t:null});
  g.innerHTML=h;
  if(dd){ const tail=dd.slice(-90); chart($('#spNewAcc'),[{data:tail.map(x=>[x.t,x.accounts_created]),color:'#36e2cf',fill:'#36e2cf33'}],{spark:1,yfmt:v=>fN(v,0),tip:p=>fN(p[1],0)+' accounts'}); chart($('#spBurn'),[{data:tail.map(x=>[x.t,x.fee_total]),color:'#ff7a3d',fill:'#ff7a3d33'}],{spark:1,yfmt:v=>fN(v,0),tip:p=>fN(p[1],1)+' XRP'}); }
  const add=$('#watchAdd'); if(add) add.onclick=()=>{ const a=$('#watchAddr').value.trim(); if(!/^r[1-9A-HJ-NP-Za-km-z]{24,34}$/.test(a)){ $('#watchAddr').style.borderColor='var(--red)'; return; }
    const l=LS.get('watch',[]); if(!l.find(x=>x.addr===a)) l.push({addr:a,label:$('#watchLabel').value.trim()}); LS.set('watch',l); loadWatch().then(renderAdoption); };
  g.querySelectorAll('[data-rm]').forEach(el=>el.onclick=e=>{e.preventDefault(); LS.set('watch',LS.get('watch',[]).filter(x=>x.addr!==el.dataset.rm)); renderAdoption();});
}
async function loadWatch(){ const l=LS.get('watch',[]); for(const a of l){ try{ const {r}=await xrpl('account_info',{account:a.addr,ledger_index:'validated'}); a.bal=Number(r.account_data.Balance)/1e6; a.t=now(); }catch(e){ a.bal=null; a.t=now(); } } LS.set('watch',l); }

function renderNetwork(){
  const s=val('server'), f=val('fee'), dd=val('daily'), last=dd&&dd[dd.length-1], ad=val('ammDaily'), al=ad&&ad[ad.length-1];
  const c=(k,num,rows,src,t,info)=>card({k,num,rows,src,t,info,small:true});
  $('#netGrid').innerHTML=
    c('Account reserve',s?`${s.resBase} XRP base`:UNAV(D.server&&D.server.err),s?`+${s.resInc} XRP per owned object (trust line, offer…)`:'' ,'XRPL server_info',(D.server||{}).t,'n_reserve')+
    c('Transaction fee',f?`${f.open} drops open-ledger`:UNAV(D.fee&&D.fee.err),f?`base ${f.base} drops (${(f.base/1e6).toFixed(5)} XRP) · queue ${f.q}`:'','XRPL fee',(D.fee||{}).t,'n_fee')+
    c('Validated ledger',s?'#'+s.seq.toLocaleString():UNAV(),s?`load factor ${s.load}`:'','XRPL server_info',(D.server||{}).t,'n_ledger')+
    c('Payments / day',last?fN(last.payments_count,0):UNAV(D.daily&&D.daily.err),last?`${fN(last.transaction_count,0)} total tx · ${fD(last.t)}`:'','XRPSCAN',(D.daily||{}).t,'n_payments')+
    c('Active accounts / day',last?fN(last.active_accounts,0):UNAV(),last?`${fN(last.tx_per_ledger,0)} tx per ledger · ${last.ledger_interval.toFixed(2)}s close`:'','XRPSCAN',(D.daily||{}).t,'n_active')+
    c('XRP locked in all AMMs',al?fN(al.xrp_locked)+' XRP':UNAV(D.ammDaily&&D.ammDaily.err),al?`${fN(al.amm_count,0)} AMM pools · ${fD(al.t)}`:'','XRPSCAN AMM metrics',(D.ammDaily||{}).t,'n_amm');
}

/* ---------- XRPN ---------- */
function calcXrpn(){ const E=CFG.EVERNORTH, q=val('xrpn'), px=val('px'); const sh=E.shares, econ=sh.classA+sh.classC+sh.units;
  const xrp=px&&px.xrp; const nav=xrp?E.xrp*xrp:null; const mcap=q?q.price*econ:null; return {econ,nav,mcap,mnav:(nav&&mcap)?mcap/nav:null,xps:E.xrp/econ,navps:nav?nav/econ:null}; }
function renderXRPN(){
  const E=CFG.EVERNORTH,q=val('xrpn'),c=calcXrpn(),sec=val('sec'); const kv=(l,v,sm,info)=>`<div class="kv"><div class="lab" ${info?`data-info="${info}"`:''}>${l}</div><div class="val">${v}</div>${sm?`<div class="sm">${sm}</div>`:''}</div>`;
  const ch=q&&q.bars.length>1?(q.price/q.bars[q.bars.length-2].c-1)*100:null;
  const last8k=sec&&sec.find(x=>x.form==='8-K'||x.form==='8-K/A');
  $('#xrpnStats').innerHTML=
    kv('XRPN share price',q?`$${q.price.toFixed(2)} <span class="${cls(ch)}" style="font-size:12px">${fPct(ch)}</span>`:UNAV(D.xrpn&&D.xrpn.err),q?'quote time '+fT(q.time)+' · may be delayed 15 min':'','x_price')+
    kv('XRP treasury value',c.nav?fUSD(c.nav):UNAV('needs XRP price'),`${fN(E.xrp,0)} XRP × live price · holdings per <a href="${E.xrpUrl}" target="_blank" rel="noopener">${E.xrpSrc}</a>`,'x_nav')+
    kv('mNAV (mkt cap ÷ XRP value)',c.mnav?`<span class="${c.mnav>=1?'up':'down'}">${c.mnav.toFixed(2)}×</span>`:UNAV(q?'needs XRP price':'needs share price'),c.mnav?(c.mnav>=1?'Premium to XRP holdings':'Discount to XRP holdings')+' · excludes cash & debt':'','x_mnav')+
    kv('XRP per share',c.xps.toFixed(2)+' XRP',`${fN(c.econ,2)} economic shares (Class A ${fN(E.shares.classA,2)} + Class C ${fN(E.shares.classC,2)} + exchangeable units ${fN(E.shares.units,2)}) · <a href="${E.sharesUrl}" target="_blank" rel="noopener">${E.sharesSrc}</a>`,'x_xps')+
    kv('Implied market cap',c.mcap?fUSD(c.mcap):UNAV(),'price × economic shares','x_mcap')+
    kv('Latest 8-K',last8k?`<a href="https://www.sec.gov/Archives/edgar/data/2092592/${last8k.acc.replace(/-/g,'')}/${last8k.doc}" target="_blank" rel="noopener">${last8k.date}</a>`:UNAV(D.sec&&D.sec.err),`<a href="https://www.sec.gov/edgar/browse/?CIK=2092592" target="_blank" rel="noopener">All SEC filings</a>`,'x_8k');
  const xd=val('dailyPx'); const series=[];
  if(q&&q.bars.length){ const b0=q.bars[0]; series.push({data:q.bars.map(b=>[b.t,(b.c/b0.c-1)*100]),color:'#ffd34d',width:2,label:'XRPN %'});
    if(xd){ const x0=xd.find(x=>x.t>=b0.t-864e5); if(x0) series.push({data:xd.filter(x=>x.t>=x0.t).map(x=>[x.t,(x.c/x0.c-1)*100]),color:'#36e2cf',label:'XRP %'}); } }
  chart($('#xrpnChart'),series.length?series:[{data:[],color:'#fff'}],{yfmt:v=>v.toFixed(0)+'%',tip:p=>fPct(p[1],1),empty:'XRPN chart unavailable'+(D.xrpn&&D.xrpn.err?' ('+D.xrpn.err+')':''),markers:[{t:E.listed,label:'Nasdaq debut',color:'#9b8cff'}]});
  $('#src-xrpn').innerHTML=`Sources: ${(D.xrpn||{}).src||'Yahoo Finance'}${D.xrpn?' · '+fT(D.xrpn.t):''} · SEC EDGAR${D.sec?' · '+fT(D.sec.t):''} · chart = % change since Nasdaq debut (Oct 12 2026), XRP overlaid · not financial advice`;
}
function xrpnSignals(){ const out=[], q=val('xrpn'), c=calcXrpn(), xd=val('dailyPx');
  if(c.mnav) out.push({key:'xrpn_nav',name:'XRPN premium/discount',state:c.mnav>=1?'premium':'discount',level:1,meme:'vault',memeLabel:'mNAV '+c.mnav.toFixed(2)+'×',
    joke:c.mnav>=1?'Wall Street is paying more than the XRP inside is worth. Treasuries love that: it lets them raise money to buy more XRP.':'XRPN trades below the value of its XRP. That makes raising cash to buy more XRP harder.',src:'Yahoo + CoinGecko + SEC',t:now()});
  if(q&&xd&&q.bars.length>=5){ const n=Math.min(5,q.bars.length-1); const a=(q.bars[q.bars.length-1].c/q.bars[q.bars.length-1-n].c-1)*100; const xr=xd.slice(-(n+1)); const b=(xr[xr.length-1].c/xr[0].c-1)*100; const dv=a-b;
    out.push({key:'xrpn_div',name:'XRPN vs XRP divergence',state:Math.abs(dv)>=15?(dv>0?'xrpn-ahead':'xrpn-behind'):'in-line',level:Math.abs(dv)>=15?2:0,meme:'vault',memeLabel:`XRPN ${fPct(a,0)} vs XRP ${fPct(b,0)}`,
      joke:Math.abs(dv)>=15?`XRPN and XRP split up over the last ${n} sessions (${fPct(dv,0)} gap).`:'XRPN moving roughly with XRP.',src:'Yahoo + CoinGecko',t:now()}); }
  return out; }

/* ---------- X Money map ---------- */
function renderXMoney(){
  const n=(nm,ds)=>`<div class="xm-node"><div class="nm">${nm}</div><div class="ds">${ds}</div></div>`;
  const l=(ok,t)=>`<div class="xm-link ${ok?'ok':'no'}"><span>${ok?'CONFIRMED':'NOT ANNOUNCED'}</span><div class="bar"></div><span>${t}</span></div>`;
  const flow=todayFlow();
  $('#xmMap').innerHTML='<span data-info="xm_map" class="infoanchor" style="align-self:center"></span>'+n('X Money','US accounts, P2P transfers, Visa debit (invited users)')+l(1,'Cross River powers X Money · Jul 27 2026')+
    n('Cross River Bank','Bank partner')+l(1,'RLUSD on XRPL in core platform · Oct 15 2026, limited states')+
    n('RLUSD on XRPL',`${val('rlusdXrpl')!=null?fN(val('rlusdXrpl'))+' RLUSD issued':'supply unavailable'}`)+
    `<div class="xm-link ${flow.viaXrp?'ok':'no'}"><span>${flow.viaXrp?'HAPPENING ON-CHAIN':'MEASURE'}</span><div class="bar"></div><span>only if routed through XRP: ${flow.viaXrp} seen today</span></div>`+n('XRP demand','AMM / DEX conversions, reserves, treasuries');
  const hit=(val('news_X Money')||[]).filter(x=>/X Money/i.test(x.title)&&/\b(RLUSD|XRP|crypto|stablecoin)/i.test(x.title));
  $('#xmFoot').innerHTML=`<span data-info="xm_status" class="infoanchor"></span><div class="meme-mini">${Memes.render('chain','X MONEY ↔ RLUSD/XRP?')}</div><div><b style="color:var(--amber)">X Money ↔ RLUSD / XRP: NOT ANNOUNCED.</b> Neither X nor Cross River has announced X Money support for RLUSD or XRP. On Aug 11 2026 RippleX's J. Ayo Akinyele publicly asked Musk for RLUSD support (a request, not a deal).<br>
    Headlines mentioning X Money + crypto in the last 30 days: <b>${hit.length}</b> (headlines are not official announcements). Official posts can't be read without an X API key, so check: 
    <a href="https://x.com/search?q=%22X%20Money%22%20RLUSD&f=live" target="_blank" rel="noopener">X Money RLUSD</a> · <a href="https://x.com/search?q=%22X%20Money%22%20XRP&f=live" target="_blank" rel="noopener">X Money XRP</a> · <a href="https://x.com/search?q=%22X%20Money%22%20crypto&f=live" target="_blank" rel="noopener">X Money crypto</a> · <a href="https://x.com/search?q=(from%3AXMoney%20OR%20from%3ACrossRiverBank%20OR%20from%3ARipple%20OR%20from%3Aelonmusk)%20%22X%20Money%22%20(RLUSD%20OR%20XRP%20OR%20crypto%20OR%20stablecoin)&f=live" target="_blank" rel="noopener">official accounts</a></div>`;
}

/* ---------- live XRPL stream (whales + RLUSD flows) ---------- */
function todayFlow(){ const d=new Date().toISOString().slice(0,10); const f=LS.get('flow',{}); return f[d]||{rlusdPay:0,rlusdVol:0,viaXrp:0,whales:0}; }
function bumpFlow(fn){ const d=new Date().toISOString().slice(0,10); const f=LS.get('flow',{}); f[d]=f[d]||{rlusdPay:0,rlusdVol:0,viaXrp:0,whales:0}; fn(f[d]); const k=Object.keys(f).sort(); while(k.length>60) delete f[k.shift()]; LS.set('flow',f); }
let wsIdx=0, wsStart=0, ws=null;
function startStream(){
  const url=CFG.XRPL_WS[wsIdx%CFG.XRPL_WS.length]; try{ ws=new WebSocket(url); }catch(e){ wsIdx++; setTimeout(startStream,4000); return; }
  ws.onopen=()=>{ wsStart=now(); ws.send(JSON.stringify({id:1,command:'subscribe',streams:['transactions']})); $('#streamInfo').textContent='live · '+new URL(url).host+' · since '+fTime(wsStart)+' ET'; };
  ws.onmessage=ev=>{ let m; try{m=JSON.parse(ev.data)}catch(e){return} if(m.type!=='transaction'||!m.validated||m.engine_result!=='tesSUCCESS') return;
    const tx=m.transaction||m.tx_json||{}, meta=m.meta||{}; if(tx.TransactionType!=='Payment') return;
    const del=meta.delivered_amount!=null?meta.delivered_amount:(tx.Amount||tx.DeliverMax); const hash=m.hash||tx.hash;
    const isR=a=>a&&typeof a==='object'&&a.currency===CFG.RLUSD_HEX&&a.issuer===CFG.RLUSD_ISSUER;
    const selfLoop=tx.Account===tx.Destination; // self-payments are arbitrage/path loops (often partial-payment spam), not RLUSD adoption
    if(isR(del)){ if(selfLoop) return; const via=typeof tx.SendMax==='string'; bumpFlow(f=>{f.rlusdPay++; f.rlusdVol+=Number(del.value)||0; if(via) f.viaXrp++;});
      if(via||Number(del.value)>=1e6) addFeed({t:now(),kind:'rlusd',text:`${fN(+del.value)} RLUSD${via?' paid with XRP (XRP→RLUSD conversion)':''}`,hash,from:tx.Account,to:tx.Destination,level:via?1:0}); return; }
    if(typeof del==='string'){ const xrp=Number(del)/1e6;
      if(tx.SendMax&&isR(tx.SendMax)&&!selfLoop&&xrp>=1){ bumpFlow(f=>f.viaXrp++); addFeed({t:now(),kind:'rlusd',text:`RLUSD→XRP conversion delivering ${fN(xrp)} XRP`,hash,from:tx.Account,to:tx.Destination,level:1}); }
      if(xrp>=CFG.WHALE_XRP){ const w={t:now(),xrp,hash,from:tx.Account,to:tx.Destination}; const L=LS.get('whales',[]); L.unshift(w); LS.set('whales',L.slice(0,200)); bumpFlow(f=>f.whales++);
        addFeed({t:w.t,kind:'whale',text:`🐋 ${fN(xrp)} XRP`,hash,from:tx.Account,to:tx.Destination,level:xrp>=CFG.WHALE_HUGE?3:xrp>=CFG.WHALE_BANNER?2:1});
        if(xrp>=CFG.WHALE_BANNER) fireEvent({key:'whale_'+hash,name:'Whale move',level:xrp>=CFG.WHALE_HUGE?3:2,meme:'whale',memeLabel:fN(xrp)+' XRP SPLASH',
          joke:`${fN(xrp)} XRP just moved ${nm(tx.Account)} → ${nm(tx.Destination)}. Often an exchange shuffling its own wallets; still worth a look.`,src:'XRPL live stream',t:now()}); } } };
  ws.onclose=()=>{ $('#streamInfo').textContent='reconnecting…'; wsIdx++; setTimeout(startStream,5000); };
  ws.onerror=()=>{ try{ws.close()}catch(e){} };
}
const nm=a=>NAMES[a]||(a?a.slice(0,6)+'…':'?');
function addFeed(e,save=true){ const L=LS.get('feed',[]); if(save){ L.unshift(e); LS.set('feed',L.slice(0,80)); } renderFeed(); }
function renderFeed(){ const L=LS.get('feed',[]); $('#whaleFeed').innerHTML=L.length?L.slice(0,60).map(e=>`<div class="row l${e.level||0}"><span class="tm">${fTime(e.t)}</span><span>${esc(e.text)} · ${esc(nm(e.from))} → ${esc(nm(e.to))} <a href="https://xrpscan.com/tx/${e.hash}" target="_blank" rel="noopener">tx</a></span></div>`).join(''):'<div class="hint">Listening for payments ≥ 1M XRP and RLUSD↔XRP conversions… (only counts what happens while this page is open)</div>'; }

/* ---------- news ---------- */
function renderNews(){ const tabs=NEWS.map(n=>n.tab); $('#newsSeg').innerHTML=tabs.map(t=>`<button data-t="${t}" class="${t===settings.newsTab?'on':''}">${t}</button>`).join('');
  $('#newsSeg').querySelectorAll('button').forEach(b=>b.onclick=()=>{settings.newsTab=b.dataset.t; saveSettings(); renderNews();});
  const k='news_'+settings.newsTab, it=val(k);
  $('#newsFeed').innerHTML=it?it.map(x=>`<div class="row"><span class="tm">${fT(x.t)}</span><span><a href="${esc(x.link)}" target="_blank" rel="noopener noreferrer">${esc(x.title)}</a> <span class="hint">· ${esc(x.source||'')}</span></span></div>`).join(''):`<div class="hint">${UNAV(D[k]&&D[k].err)}</div>`;
  $('#src-news').innerHTML=`Source: ${(D[k]||{}).src||'Google News RSS'}${D[k]?' · updated '+fT(D[k].t):''} · headlines + links only · <a href="https://www.dtcc.com/news" target="_blank" rel="noopener">DTCC newsroom</a> · <a href="https://ripple.com/insights/" target="_blank" rel="noopener">Ripple</a> · <a href="https://www.crossriver.com/newsroom" target="_blank" rel="noopener">Cross River</a> · <a href="https://www.evernorth.xyz/" target="_blank" rel="noopener">Evernorth</a>`; }
function checkNewsAlarms(){ const seen=LS.get('seenNews2',{ids:[],seeded:{}}); const S=new Set(seen.ids);
  NEWS.filter(n=>n.alarm).forEach(n=>{ const list=val('news_'+n.tab); if(!list) return; const first=!seen.seeded[n.tab]; seen.seeded[n.tab]=1; list.forEach(x=>{ const id=n.tab+'|'+x.title; if(S.has(id)) return; S.add(id);
    if(first) return; if(!(n.need.test(x.title)&&n.alarm.test(x.title))) return; if(now()-x.t>3*864e5) return;
    if(n.tab==='X Money') fireEvent({key:'xm_'+x.title,name:'X Money + crypto headline',level:/\b(Reuters|Bloomberg|Cross River|Ripple|X Corp|CNBC|Wall Street Journal|Financial Times|Axios|The Block|CoinDesk)\b/i.test(x.source||'')?3:2,meme:'chain',memeLabel:'X MONEY + CRYPTO?!',joke:`Headline: "${x.title}" (${x.source}). A headline is not an official announcement. Check @XMoney / @CrossRiverBank before believing it.`,src:'Google News RSS',t:x.t,link:x.link});
    else fireEvent({key:'dtcc_'+x.title,name:'DTCC headline',level:2,meme:'radio',memeLabel:'DTCC NEWS',joke:`"${x.title}" (${x.source}). DTCC is the plumbing of US markets; tokenization news there is worth a read.`,src:'Google News RSS',t:x.t,link:x.link}); }); });
  seen.ids=[...S].slice(-1500); LS.set('seenNews2',seen);
  // new SEC 8-K
  const sec=val('sec'); if(sec){ const s8=LS.get('seen8k',null); const set=new Set(s8||[]); sec.filter(x=>/^8-K/.test(x.form)).forEach(x=>{ if(!set.has(x.acc)){ set.add(x.acc); if(s8) fireEvent({key:'8k_'+x.acc,name:'New Evernorth 8-K',level:2,meme:'vault',memeLabel:'NEW 8-K FILED',joke:`Evernorth filed an 8-K on ${x.date}. Could be XRP purchases, share changes or other news. Read it before assuming.`,src:'SEC EDGAR',t:now(),link:`https://www.sec.gov/Archives/edgar/data/2092592/${x.acc.replace(/-/g,'')}/${x.doc}`}); } }); LS.set('seen8k',[...set]); }
}

/* ---------- alarms + memes ---------- */
const STAGE=['ALL CLEAR','STAGE 1 · HEADS UP','STAGE 2 · WATCH','STAGE 3 · ALARM'];
let currentSignals=[];
function evaluateStates(){
  const prev=LS.get('prevStates',null); const next={}; const sig=computeSignals().concat(xrpnSignals()); currentSignals=sig;
  const T=trends();
  [['newAcc','New accounts','party','NEW ACCOUNTS UP','shrug'],['burn','Fee burn','fire','BURN SPIKE','shrug'],['ammLocked','XRP in AMMs','party','AMM XRP UP','shrug']].forEach(([k,n,mu,lu,md])=>{ const tr=T[k]; if(!tr) return;
    sig.push({key:'tr_'+k,name:n,state:tr.dir,level:tr.dir==='flat'?0:1,meme:tr.dir==='up'?mu:md,memeLabel:tr.dir==='up'?lu:(n+' '+(tr.dir==='down'?'cooling':'flat')).toUpperCase(),joke:`${n}: 7-day average ${fPct(tr.pct,0)} vs the prior 30 days.`,src:'XRPSCAN',t:(D.daily||{}).t}); });
  sig.forEach(s=>{ if(!s.state) return; const st=String(s.state).split(' · ')[0]; next[s.key]=st;
    if(prev&&prev[s.key]&&prev[s.key]!==st&&s.level>=1) fireEvent(Object.assign({},s,{changed:prev[s.key]+' → '+st})); });
  LS.set('prevStates',next);
  renderSignals(sig.filter(s=>s.how!==undefined)); renderHappening(sig); renderBanner();
}
function fireEvent(e){ const L=LS.get('log',[]); if(L.find(x=>x.key===e.key&&now()-x.t<6*3600e3)) return;
  L.unshift({key:e.key,t:now(),level:e.level||1,name:e.name,meme:e.meme,memeLabel:e.memeLabel,joke:e.joke,changed:e.changed||'',link:e.link||'',src:e.src||''}); LS.set('log',L.slice(0,150));
  bannerEvent={...e,t:now()}; renderBanner(true); renderLog(); beep(e.level||1); }
let bannerEvent=null;
function renderBanner(flash){
  const L=LS.get('log',[]); let e=bannerEvent||(L[0]&&now()-L[0].t<3600e3?L[0]:null);
  if(!e){ const act=currentSignals.filter(s=>s.level>=2).sort((a,b)=>b.level-a.level)[0]; e=act||{level:0,name:'All quiet',meme:'calm',memeLabel:'ALL QUIET ON THE LEDGER',joke:'No alarms right now. Ledge is sipping coffee and watching the ledger.'}; }
  const el=$('#alarm'); el.className='alarm stage-'+(e.level||0)+(flash?' flash':'');
  $('#alarmStage').textContent=STAGE[e.level||0]+(e.t?' · '+fT(e.t):'');
  $('#alarmTitle').textContent=e.name+(e.changed?' ('+e.changed+')':'');
  $('#alarmCaption').innerHTML=esc(settings.serious?(e.state?e.name+': '+String(e.state).replace(/<[^>]+>/g,''):e.joke||''):(e.joke||''))+(e.link?` <a href="${esc(e.link)}" target="_blank" rel="noopener">open</a>`:'');
  $('#alarmMeme').innerHTML=Memes.render(e.meme||'calm',e.memeLabel);
}
function renderLog(){ const L=LS.get('log',[]); $('#alarmLog').innerHTML=L.length?L.slice(0,80).map(x=>`<div class="row l${x.level}"><span class="tm">${fT(x.t)}</span><span><b>${esc(x.name)}</b>${x.changed?' · '+esc(x.changed):''} · ${esc(x.memeLabel||'')}${x.link?` <a href="${esc(x.link)}" target="_blank" rel="noopener">open</a>`:''}</span></div>`).join(''):'<div class="hint">No alarms yet. State changes and big events land here.</div>'; }
let actx=null; function beep(level){ if(!settings.sound) return; try{ actx=actx||new (window.AudioContext||window.webkitAudioContext)(); const n=level>=3?3:level; for(let i=0;i<n;i++){ const o=actx.createOscillator(), g=actx.createGain(); o.type='triangle'; o.frequency.value=level>=3?880:level==2?660:520; g.gain.setValueAtTime(.0001,actx.currentTime+i*.22); g.gain.exponentialRampToValueAtTime(.2,actx.currentTime+i*.22+.02); g.gain.exponentialRampToValueAtTime(.0001,actx.currentTime+i*.22+.18); o.connect(g).connect(actx.destination); o.start(actx.currentTime+i*.22); o.stop(actx.currentTime+i*.22+.2);} }catch(e){} }
function renderSignals(sig){ $('#sigGrid').innerHTML=sig.map(s=>`<div class="sig l${s.level||0}"><div class="t"><span class="n" data-info="${s.key}">${s.name}</span><span class="v">${s.value}</span></div><div class="st">${s.state}</div><div class="how">${s.how||''}</div>${s.rel?`<div class="rel">${s.rel}</div>`:''}${srcLine(s.src||'',s.t)}</div>`).join(''); }
function renderHappening(sig){ const items=sig.filter(s=>s.meme).sort((a,b)=>(b.level||0)-(a.level||0)).slice(0,document.body.classList.contains('rig')?4:8);
  $('#memeGrid').innerHTML=items.map(s=>`<div class="meme l${s.level||0}"><div class="art">${Memes.render(s.meme,s.memeLabel)}</div><div class="cap"><b data-info="${window.INFO&&INFO[s.key]?s.key:'meme'}">${esc(s.name)}</b>${esc(settings.serious?String(s.state||'').replace(/<[^>]+>/g,''):(s.joke||String(s.state||'').replace(/<[^>]+>/g,'')))}</div></div>`).join('');
  $('#memeLinks').innerHTML='Real memes (opens X/Reddit): <a href="https://x.com/search?q=XRP%20meme&f=live" target="_blank" rel="noopener">X</a> · <a href="https://www.reddit.com/r/XRP/search/?q=meme&sort=new" target="_blank" rel="noopener">Reddit</a>'; }

/* ---------- scorecard + verdict ---------- */
function renderScore(){
  const T=trends(); const rows=[['New accounts / day',T.newAcc,'XRPSCAN'],['Fee burn / day',T.burn,'XRPSCAN'],['Payments / day',T.payments,'XRPSCAN'],['Active accounts',T.active,'XRPSCAN'],['XRP locked in AMMs',T.ammLocked,'XRPSCAN'],
    ['RLUSD DEX volume (24h vs 7d avg)',T.rlDex,'XRPSCAN'],['RLUSD/XRP AMM depth',T.ammPool,'snapshots'],['RLUSD supply on XRPL',T.rlXrpl,'snapshots'],['RLUSD XRPL share vs ETH',T.rlShare,'snapshots'],['RLUSD holders (XRPL)',T.rlHolders,'snapshots']];
  $('#scoreGrid').innerHTML=rows.map(([n,tr,s])=>{ const d=tr&&!tr.building?DIRS[tr.dir]:null; return `<div class="score"><div class="arrow ${d?d[1]:'na'}">${d?d[0]:'…'}</div><div><div class="nm" data-info="score_row">${n}</div><div class="ds">${d?d[2]+' '+fPct(tr.pct,1):tr&&tr.building?'building history ('+tr.n+'d)':'unavailable'} · ${s}</div></div></div>`; }).join('');
  // verdict: core demand mechanics only
  const core=[['XRP routing (RLUSD DEX volume)',T.rlDex],['RLUSD/XRP pool depth',T.ammPool],['New accounts',T.newAcc],['Fee burn',T.burn],['RLUSD on XRPL',T.rlXrpl],['XRP in AMMs',T.ammLocked]];
  const known=core.filter(c=>c[1]&&!c[1].building), up=known.filter(c=>c[1].dir==='up').length, down=known.filter(c=>c[1].dir==='down').length;
  const c=calcXrpn();
  let title, text;
  if(!known.length){ title='Gathering readings…'; text='Not enough history yet to judge the mechanics.'; }
  else if(up>=Math.ceil(known.length*0.6)){ title=`Mechanics are moving: ${up} of ${known.length} demand checks rising`; text='On-chain activity tied to XRP demand is rising against its own history. That is what a real adoption effect looks like, though it still doesn\'t prove Cross River specifically is the cause.'; }
  else if(up>=2){ title=`Mixed: ${up} of ${known.length} demand checks rising, ${down} falling`; text='Some mechanics are moving, most aren\'t. So far the RLUSD partnership news is only partly showing up as XRP usage on the ledger.'; }
  else { title=`Partnership headlines, not (yet) mechanics: ${up} of ${known.length} rising`; text='The on-chain checks that would show RLUSD adoption turning into XRP demand aren\'t rising yet. Cross River hasn\'t disclosed volumes, and RLUSD only helps XRP when payments are routed through it.'; }
  text+=c.mnav?` Treasury side: Evernorth holds ${fN(CFG.EVERNORTH.xrp,0)} XRP at an mNAV of ${c.mnav.toFixed(2)}× (${c.mnav>=1?'a premium makes it easier to raise money and buy more XRP':'a discount makes buying more XRP harder'}).`:'';
  $('#vTitle').textContent=title; $('#vText').textContent=text+' Not financial advice.';
  $('#vChips').innerHTML=core.map(([n,tr])=>{ const d=tr&&!tr.building?DIRS[tr.dir]:null; return `<span class="chip ${d?d[1]:''}">${d?d[0]:'…'} ${n}</span>`; }).join('');
  const frac=known.length?up/known.length:0; const ang=Math.PI*(1-frac); const cx=95,cy=110,R=78; const nx=cx+Math.cos(ang)*(R-14), ny=cy-Math.sin(ang)*(R-14);
  const arc=(a0,a1,col)=>`<path d="M${cx+Math.cos(a0)*R} ${cy-Math.sin(a0)*R} A${R} ${R} 0 0 1 ${cx+Math.cos(a1)*R} ${cy-Math.sin(a1)*R}" stroke="${col}" stroke-width="12" fill="none" stroke-linecap="round"/>`;
  $('#vGauge').innerHTML=`<svg viewBox="0 0 190 150">${arc(Math.PI,Math.PI*2/3,'#ff4d6d')}${arc(Math.PI*2/3-.05,Math.PI/3,'#ffb547')}${arc(Math.PI/3-.05,0,'#4fe08c')}
    <line x1="${cx}" y1="${cy}" x2="${nx}" y2="${ny}" stroke="#e6eef8" stroke-width="3" stroke-linecap="round" style="transition:all 1s"/><circle cx="${cx}" cy="${cy}" r="7" fill="#36e2cf"/>
    <text x="${cx}" y="140" text-anchor="middle" fill="#8197b3" font-size="11" font-family="Cascadia Mono,Consolas">${up}/${known.length||'—'} RISING</text>
    <text x="14" y="128" fill="#ff4d6d" font-size="9" font-family="Bahnschrift,Arial">HEADLINES</text><text x="176" y="128" text-anchor="end" fill="#4fe08c" font-size="9" font-family="Bahnschrift,Arial">MECHANICS</text></svg>`;
}

/* ---------- market panel ---------- */
function renderMarket(){
  const p=val('px'); const m=(lab,v,dl,src,info)=>`<div class="lab" data-info="${info}">${lab}</div><div class="val">${v}</div>${dl?`<div class="delta">${dl}</div>`:''}${src}`;
  const s=D.px?srcLine(D.px.src,D.px.t):'';
  $('#m-price').innerHTML=m('XRP',p?fPx(p.xrp):UNAV(D.px&&D.px.err),p&&p.xrpCh!=null?`<span class="${cls(p.xrpCh)}">${fPct(p.xrpCh)} 24h</span>`:'',s,'m_price');
  $('#m-mcap').innerHTML=m('Market cap',p&&p.mcap?fUSD(p.mcap):'—','',s,'m_mcap');
  $('#m-vol').innerHTML=m('24h volume',p&&p.vol?fUSD(p.vol):'—','',s,'m_vol');
  $('#m-rlusdpx').innerHTML=m('RLUSD peg',p&&p.rl?'$'+p.rl.toFixed(4):'—',p&&p.rlVol?'24h vol '+fUSD(p.rlVol):'',s,'m_rlusd');
  renderChart();
}
function renderChart(){
  const r=settings.range; document.querySelectorAll('#rangeSeg button').forEach(b=>b.classList.toggle('on',+b.dataset.r===r));
  let series, src;
  if(r<=7){ const h=val('hourlyPx'); series=[{data:h?h.map(x=>[x.t,x.c]):[],color:'#36e2cf',width:2,fill:'#36e2cf22',label:'XRP (hourly)'}]; src=D.hourlyPx; }
  else { const d=val('dailyPx'); const I=indicators(); const cut=now()-r*864e5; const idx=d?d.map((x,i)=>i).filter(i=>d[i].t>=cut):[];
    series=[{data:idx.map(i=>[d[i].t,d[i].c]),color:'#36e2cf',width:2,fill:'#36e2cf22',label:'XRP (daily)'}];
    if(I){ series.push({data:idx.map(i=>[d[i].t,I.ma50s[i]]),color:'#ffb547',width:1.2,label:'50-day MA'}); series.push({data:idx.map(i=>[d[i].t,I.ma200s[i]]),color:'#9b8cff',width:1.2,dash:[5,4],label:'200-day MA'}); }
    src=D.dailyPx; }
  chart($('#priceChart'),series,{yfmt:v=>'$'+v.toFixed(v<10?3:1),tip:p=>fPx(p[1]),empty:'Price history unavailable'+(src&&src.err?' ('+src.err+')':'')});
  $('#src-chart').innerHTML=src?`Source: ${src.src} · updated ${fT(src.t)} · 50/200-day MAs computed from 365 days of daily closes`:'';
}

/* ---------- links ---------- */
function renderLinks(){ const L=[['Explorers',[['RLUSD token on XRPSCAN','https://xrpscan.com/token/RLUSD.'+CFG.RLUSD_ISSUER],['RLUSD issuer account','https://xrpscan.com/account/'+CFG.RLUSD_ISSUER],['RLUSD/XRP AMM pool','https://xrpscan.com/amm/rhWTXC2m2gGGA9WozUaoMm6kLAVPb1tcS3'],['RLUSD on Etherscan','https://etherscan.io/token/'+CFG.RLUSD_ETH],['XRPL.org','https://xrpl.org/']]],
  ['Official',[['Ripple insights / news','https://ripple.com/insights/'],['RLUSD transparency','https://ripple.com/solutions/stablecoin/transparency/'],['RLUSD token addresses (docs)','https://docs.ripple.com/products/stablecoin/overview/token-addresses'],['Cross River newsroom','https://www.crossriver.com/newsroom'],['Evernorth','https://www.evernorth.xyz/'],['Evernorth SEC filings','https://www.sec.gov/edgar/browse/?CIK=2092592'],['DTCC newsroom','https://www.dtcc.com/news']]],
  ['X searches',[['from:CrossRiverBank RLUSD','https://x.com/search?q=from%3ACrossRiverBank%20RLUSD&f=live'],['RLUSD XRPL volume','https://x.com/search?q=RLUSD%20XRPL%20volume&f=live'],['from:Ripple RLUSD','https://x.com/search?q=from%3ARipple%20RLUSD&f=live'],['Evernorth XRPN','https://x.com/search?q=XRPN%20Evernorth&f=live'],['DTCC XRP','https://x.com/search?q=DTCC%20XRP&f=live']]]];
  $('#linksBox').innerHTML=L.map(([h,a])=>`<h3>${h}</h3>`+a.map(([t,u])=>`<a href="${u}" target="_blank" rel="noopener">${t} ↗</a>`).join('')).join(''); }

/* ---------- layout (standard vs Sim Rig) ---------- */
function applyLayout(){ const rig=new URLSearchParams(location.search).get('layout')==='rig';
  document.body.classList.toggle('rig',rig); $('#rig').hidden=!rig; setLabel($('#btnLayout'),rig?'Standard layout':'Sim Rig layout');
  /* the rig screens themselves are built by rig.js (loaded after this file) */ }

/* ---------- main loop ---------- */
let nextAt=0, busy=false;
function renderAll(){ try{renderMarket()}catch(e){console.error(e)} try{renderAdoption()}catch(e){console.error(e)} try{renderNetwork()}catch(e){console.error(e)} try{renderXRPN()}catch(e){console.error(e)}
  try{renderXMoney()}catch(e){console.error(e)} try{renderScore()}catch(e){console.error(e)} try{evaluateStates()}catch(e){console.error(e)} renderFeed(); renderLog(); renderNews(); }
async function refresh(){ if(busy) return; busy=true; $('#refreshInfo').textContent='Refreshing…';
  await Promise.all([loadXRPL(),loadXRPScan(),loadEth(),loadSentiment(),loadMarket(),loadWatch(),loadXRPN()]);
  snapshot(); renderAll(); checkNewsAlarms(); busy=false; nextAt=now()+CFG.REFRESH_MS; window.__lastRefresh=now(); }
function tickClock(){ const s=Math.max(0,Math.round((nextAt-now())/1000)); if(!busy) $('#refreshInfo').textContent=`Updated ${fTime(window.__lastRefresh||now())} ET · next in ${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`; if(!busy&&nextAt&&now()>=nextAt) refresh(); }
function initUI(){
  $('#btnRefresh').onclick=()=>refresh();
  const upd=()=>{ setLabel($('#btnSerious'),'Serious mode: '+(settings.serious?'on':'off')); $('#btnSerious').classList.toggle('on',settings.serious); document.body.classList.toggle('serious',settings.serious);
    setLabel($('#btnSound'),'Sound: '+(settings.sound?'on':'off')); $('#btnSound').classList.toggle('on',settings.sound); };
  $('#btnSerious').onclick=()=>{settings.serious=!settings.serious; saveSettings(); upd(); evaluateStates();};
  const updInfo=()=>{ document.body.classList.toggle('allinfo',!!settings.allInfo); setLabel($('#btnInfo'),'Show all info: '+(settings.allInfo?'on':'off')); $('#btnInfo').classList.toggle('on',!!settings.allInfo); };
  if(new URLSearchParams(location.search).get('layout')==='rig' && !sessionStorage.getItem('rigInfoTouched')) settings.allInfo=false; // rig: info captions default OFF
  $('#btnInfo').onclick=()=>{ sessionStorage.setItem('rigInfoTouched','1'); settings.allInfo=!settings.allInfo; saveSettings(); updInfo(); }; updInfo();
  $('#btnSound').onclick=()=>{settings.sound=!settings.sound; saveSettings(); upd(); if(settings.sound) beep(1);};
  $('#btnLayout').onclick=()=>{ const u=new URL(location.href); if(u.searchParams.get('layout')==='rig') u.searchParams.delete('layout'); else u.searchParams.set('layout','rig'); location.href=u.toString(); };
  $('#btnClearLog').onclick=()=>{ LS.set('log',[]); bannerEvent=null; renderLog(); renderBanner(); };
  document.querySelectorAll('#rangeSeg button').forEach(b=>b.onclick=()=>{settings.range=+b.dataset.r; saveSettings(); renderChart();});
  upd(); renderLinks(); applyLayout(); renderFeed(); renderLog();
  let rt; window.addEventListener('resize',()=>{clearTimeout(rt); rt=setTimeout(()=>{renderChart(); renderXRPN(); renderAdoption();},250)});
}
initUI(); refresh(); startStream(); setInterval(tickClock,1000);
if(!PROXY){} else if(!window.__F15_NEWS){ setTimeout(loadNews,4000); } /* news cadence in sched.js */
setInterval(()=>{ try{ renderXMoney(); if(!(document.activeElement&&document.activeElement.classList.contains('addr'))) renderAdoption(); evaluateStates(); }catch(e){} },60000);

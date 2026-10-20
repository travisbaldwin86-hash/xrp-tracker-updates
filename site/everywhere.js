/* DEMAND RADAR · XRP Everywhere: XRP and RLUSD on every network, from free keyless sources.
   Contract addresses verified against the issuers' own pages (Oct 18 2026):
   RLUSD  - docs.ripple.com/products/stablecoin/overview/token-addresses (XRPL issuer; Ethereum proxy; Base/INK/Optimism/Unichain/XRPL EVM proxy)
   wXRP   - Hex Trust (hextrust.com/services/wrapping/wxrp; Etherscan-verified token, Coinbase asset page lists Ethereum/Optimism/Solana)
   FXRP   - Flare Developer Hub, FAssets reference (dev.flare.network/fassets/reference)
   BNB    - Binance-Peg XRP Token, BscScan-verified (Binance: Deployer 2) */
(function(){ 'use strict';
const Q=s=>document.querySelector(s);
const RL2='0x8d58c0c60b8d6b88fa98b291a646db34d0f98258';
const RPC={eth:['https://ethereum-rpc.publicnode.com','https://eth.drpc.org'],base:['https://mainnet.base.org','https://base-rpc.publicnode.com'],op:['https://mainnet.optimism.io','https://optimism-rpc.publicnode.com'],
  ink:['https://rpc-gel.inkonchain.com'],uni:['https://mainnet.unichain.org'],xevm:['https://rpc.xrplevm.org'],flare:['https://flare-api.flare.network/ext/C/rpc'],bsc:['https://bsc-dataseed.binance.org','https://bsc-rpc.publicnode.com']};
const ROWS=[
  {g:'XRP',id:'xrpl',net:'XRP Ledger',asset:'XRP (native)',type:'native'},
  {g:'XRP',id:'xevm',net:'XRPL EVM sidechain',asset:'XRP (gas token)',type:'native, bridged in via Axelar',scan:'https://explorer.xrplevm.org/api/v2/stats',url:'https://explorer.xrplevm.org'},
  {g:'XRP',id:'fxrp',net:'Flare',asset:'FXRP (FAssets)',type:'wrapped, over-collateralised by agents',chain:'flare',to:'0xAd552A648C74D49E10027AB8a618A3ad4901c5bE',dec:6,bs:'https://flare-explorer.flare.network',url:'https://flare-explorer.flare.network/token/0xAd552A648C74D49E10027AB8a618A3ad4901c5bE'},
  {g:'XRP',id:'wxrpE',net:'Ethereum',asset:'wXRP (Hex Trust)',type:'wrapped, 1:1 custodial',chain:'eth',to:'0xB73eE5488647a6302EBf5FEE8Af3152F6960AE4c',dec:6,bs:'https://eth.blockscout.com',url:'https://etherscan.io/token/0xB73eE5488647a6302EBf5FEE8Af3152F6960AE4c'},
  {g:'XRP',id:'wxrpO',net:'Optimism',asset:'wXRP (Hex Trust)',type:'wrapped, 1:1 custodial',chain:'op',to:'0xB73eE5488647a6302EBf5FEE8Af3152F6960AE4c',dec:6,url:'https://optimistic.etherscan.io/token/0xB73eE5488647a6302EBf5FEE8Af3152F6960AE4c'},
  {g:'XRP',id:'wxrpS',net:'Solana',asset:'wXRP (Hex Trust)',type:'wrapped, 1:1 custodial',sol:'WXRPpJt44kNmiQK495uuxPkDPHa4js4K1cyDEWXCNKY',url:'https://solscan.io/token/WXRPpJt44kNmiQK495uuxPkDPHa4js4K1cyDEWXCNKY'},
  {g:'XRP',id:'bsc',net:'BNB Chain',asset:'Binance-Peg XRP',type:'pegged, Binance custodial',chain:'bsc',to:'0x1D2F0da169ceB9fC7B3144628dB156f3F6c60dBE',dec:18,url:'https://bscscan.com/token/0x1D2F0da169ceB9fC7B3144628dB156f3F6c60dBE'},
  {g:'RLUSD',id:'rlX',net:'XRP Ledger',asset:'RLUSD',type:'native issued token'},
  {g:'RLUSD',id:'rlE',net:'Ethereum',asset:'RLUSD',type:'ERC-20',chain:'eth',to:'0x8292Bb45bf1Ee4d140127049757C2E0fF06317eD',dec:18,bs:'https://eth.blockscout.com',url:'https://etherscan.io/token/0x8292Bb45bf1Ee4d140127049757C2E0fF06317eD'},
  {g:'RLUSD',id:'rlB',net:'Base',asset:'RLUSD',type:'ERC-20',chain:'base',to:RL2,dec:18,url:'https://basescan.org/token/'+RL2},
  {g:'RLUSD',id:'rlO',net:'Optimism',asset:'RLUSD',type:'ERC-20',chain:'op',to:RL2,dec:18,url:'https://optimistic.etherscan.io/token/'+RL2},
  {g:'RLUSD',id:'rlI',net:'Ink',asset:'RLUSD',type:'ERC-20',chain:'ink',to:RL2,dec:18,bs:'https://explorer.inkonchain.com',url:'https://explorer.inkonchain.com/token/'+RL2},
  {g:'RLUSD',id:'rlU',net:'Unichain',asset:'RLUSD',type:'ERC-20',chain:'uni',to:RL2,dec:18,bs:'https://unichain.blockscout.com',url:'https://unichain.blockscout.com/token/'+RL2},
  {g:'RLUSD',id:'rlV',net:'XRPL EVM sidechain',asset:'RLUSD',type:'ERC-20',chain:'xevm',to:RL2,dec:18,bs:'https://explorer.xrplevm.org',url:'https://explorer.xrplevm.org/token/'+RL2}];
const ETFS=[['XRPC','Canary'],['XRP','Bitwise'],['XRPZ','Franklin'],['GXRP','Grayscale'],['TOXR','21Shares'],['XRPR','REX-Osprey']];
const E={}; // id -> {supply,holders,act,src,t,err}
const rpcCall=async(chain,body)=>{ let last; for(const ep of RPC[chain]){ try{ const j=await fetchJSON(ep,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)},12000); if(j.result!=null) return {r:j.result,src:new URL(ep).host}; last=new Error(j.error&&j.error.message||'no result'); }catch(e){ last=e; } } throw last||new Error('RPC unavailable'); };
async function loadRow(r){ const o=E[r.id]={...(E[r.id]||{}),t:Date.now()}; delete o.err;
  try{
    if(r.chain){ const {r:res,src}=await rpcCall(r.chain,{jsonrpc:'2.0',id:1,method:'eth_call',params:[{to:r.to,data:'0x18160ddd'},'latest']}); o.supply=Number(BigInt(res))/10**r.dec; o.src=src+' totalSupply()'; }
    if(r.sol){ let res=null, src=''; for(const ep of ['https://api.mainnet-beta.solana.com','https://solana-rpc.publicnode.com']){ try{ const j=await fetchJSON(ep,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'getTokenSupply',params:[r.sol]})},12000); if(j.result){ res=j.result; src=new URL(ep).host; break; } }catch(e){} }
      if(!res) throw new Error('Solana public RPC refused the browser request'); o.supply=+res.value.uiAmountString; o.src=src+' getTokenSupply'; }
    if(r.bs){ try{ const j=await fetchJSON(r.bs+'/api/v2/tokens/'+r.to,{},12000); o.holders=+j.holders_count; o.hsrc=new URL(r.bs).host; }catch(e){} }
    if(r.scan){ const j=await fetchJSON(r.scan,{},12000); o.act=`${fN(+j.transactions_today,0)} tx today · ${fN(+j.total_addresses,0)} addresses`; o.src='explorer.xrplevm.org (Blockscout) stats'; }
  }catch(e){ o.err=e.message||String(e); } }
async function loadETF(){ if(!PROXY){ E.etf={err:'needs the local launcher server, which is not running',t:Date.now()}; return; } const out=[];
  for(const [tk,iss] of ETFS){ try{ const j=await fetchJSON(viaProxy(`https://query1.finance.yahoo.com/v8/finance/chart/${tk}?range=5d&interval=1d`),{},15000); const m=j.chart.result[0].meta;
      out.push({tk,iss,px:m.regularMarketPrice,prev:m.chartPreviousClose,vol:m.regularMarketVolume,t:m.regularMarketTime*1000,name:m.longName}); }catch(e){ out.push({tk,iss,err:e.message}); } await sleep(250); }
  E.etf={list:out,t:Date.now(),src:'Yahoo Finance (via local launcher), may be delayed 15 min'}; }
let busy=false;
async function loadAll(){ if(busy) return; busy=true; for(const r of ROWS) if(r.chain||r.sol||r.scan) await loadRow(r); await loadETF(); busy=false; render(); }
function cell(r){ const o=E[r.id]||{}; const coins=val('coins'), tok=val('rlusdTok'), dd=val('daily'), last=dd&&dd[dd.length-1];
  if(r.id==='xrpl') return {s:coins?fN(coins.total,2)+' XRP':'—',a:last?`${fN(last.payments_count,0)} payments/day · ${fN(last.active_accounts,0)} active accts`:'',src:'XRPL total_coins + XRPSCAN',t:(D.coins||{}).t};
  if(r.id==='rlX') return {s:val('rlusdXrpl')!=null?fN(val('rlusdXrpl'))+' RLUSD':'—',a:tok?`${fN(tok.holders,0)} holders · DEX 24h ${fUSD(tok.vol24,1)}`:'',src:'XRPL gateway_balances + XRPSCAN',t:(D.rlusdXrpl||{}).t};
  if(r.id==='xevm') return {s:'not measurable',a:o.err?UNAV(o.err):(o.act||'…'),src:o.src||'Blockscout',t:o.t,note:'XRP is the gas token here; its circulating amount is not exposed by a keyless API'};
  return {s:o.err?UNAV(o.err):o.supply!=null?fN(o.supply)+' '+(r.g==='RLUSD'?'RLUSD':r.asset.split(' ')[0]):'…',a:o.holders!=null?fN(o.holders,0)+' holders':'',src:(o.src||'')+(o.hsrc?' · holders: '+o.hsrc:''),t:o.t}; }
function render(){ const el=Q('#everyBody'); if(!el) return; const px=val('px'); const xp=px&&px.xrp;
  const wrapped=['fxrp','wxrpE','wxrpO','wxrpS','bsc'].map(k=>E[k]&&!E[k].err?E[k].supply||0:0).reduce((a,b)=>a+b,0);
  const rlTot=ROWS.filter(r=>r.g==='RLUSD').map(r=>r.id==='rlX'?(val('rlusdXrpl')||0):E[r.id]&&!E[r.id].err?E[r.id].supply||0:0).reduce((a,b)=>a+b,0);
  const rlX=val('rlusdXrpl')||0;
  let h=`<div class="ev-sum" style="grid-template-columns:1fr 1fr"><div><b>${fN(wrapped)}</b><span>XRP wrapped/pegged on other chains${xp?' · '+fUSD(wrapped*xp,1):''}</span></div><div><b>${rlTot?(rlX/rlTot*100).toFixed(1)+'%':'—'}</b><span>of ${fN(rlTot)} RLUSD (7 chains) is on the XRP Ledger</span></div></div>`;
  h+='<table class="ev-t"><tr><th>Network</th><th>Asset</th><th>Supply</th><th>Holders / activity</th></tr>';
  let g=''; ROWS.forEach(r=>{ if(r.g!==g){ g=r.g; h+=`<tr class="ev-g"><td colspan="4">${g==='XRP'?'XRP: native, wrapped and pegged':'RLUSD: every chain Ripple officially lists'}</td></tr>`; } const c=cell(r);
    h+=`<tr title="${esc(r.net+' · '+r.asset+' · '+r.type+(c.note?' · '+c.note:'')+'\nSource: '+(c.src||'')+(c.t?' · '+fT(c.t):''))}"><td>${esc(r.net)}</td><td>${r.url?`<a href="${r.url}" target="_blank" rel="noopener">${esc(r.asset)}</a>`:esc(r.asset)}</td><td class="num">${c.s}</td><td>${c.a}</td></tr>`; });
  const etf=E.etf; h+=`<tr class="ev-g"><td colspan="4">US spot XRP ETFs (price, day change, shares traded; holdings/AUM have no free keyless source)</td></tr>`;
  if(!etf||etf.err) h+=`<tr><td colspan="4">${UNAV(etf&&etf.err||'loading')}</td></tr>`;
  else h+=`<tr><td colspan="4"><div class="ev-etf">${etf.list.map(x=>x.err?`<span title="${esc(x.err)}"><b>${x.tk}</b> —</span>`:`<span title="${esc((x.name||x.tk)+' · quote '+fT(x.t)+' · '+etf.src)}"><b>${x.tk}</b> $${x.px.toFixed(2)} <i class="${cls(x.px-x.prev)}">${fPct((x.px/x.prev-1)*100,1)}</i> <em>${fN(x.vol,0)} sh</em></span>`).join('')}</div></td></tr>`;
  h+='</table><div class="hint">Funds and treasury companies holding XRP (Evernorth, ETFs): see Who holds XRP.</div>';
  el.innerHTML=h; }
INFO.everywhere='XRP and RLUSD wherever they live. Supplies are read live from each chain with keyless public RPCs (totalSupply / getTokenSupply), holders from public Blockscout explorers where one exists. Wrapped XRP is only as good as its custodian or bridge: wXRP is Hex Trust custody, Binance-Peg XRP is Binance custody, FXRP is backed by Flare FAsset agents. Only RLUSD on the XRP Ledger can route through XRP on the XRPL DEX/AMM. ETF holdings/AUM need paid data, so only price and volume are shown.';
const _ra=window.renderAll; window.renderAll=function(){ _ra(); try{ render(); }catch(e){ console.error(e); } };
window.EVF={loadAll};
})();

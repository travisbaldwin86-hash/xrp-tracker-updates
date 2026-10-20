/* DEMAND RADAR · WORLD layer: Ripple deals/licences by country + sanctions & frozen-funds watch.
   Every seed row has a source link checked Oct 19 2026. Live alarms come from GDELT (direct), UK OFSI Atom (direct, CORS-open),
   and OFAC's recent-actions RSS / programme page (only via the local launcher relay; browsers can't read them directly).
   "Possible corridor" is a factual tag only: sanctions eased in a country = payments that were blocked may now be legal. It is not a forecast. */
(function(){ 'use strict';
const Q=s=>document.querySelector(s);
const DEALS=window.WW_DEALS=[
 {cc:'BT',c:'Bhutan',p:'Royal Monetary Authority',ty:'CBDC pilot',d:'2021-09-22',st:'pilot',u:'https://ripple.com/ripple-press/royal-monetary-authority-of-bhutan-ripple-partner-to-pilot-cbdc-using-private-blockchain'},
 {cc:'PW',c:'Palau',p:'Republic of Palau',ty:'national digital currency / stablecoin pilot',d:'2021-11',st:'pilot',u:'https://ripple.com/insights/ripple-enhances-cbdc-platform/',ll:[134.58,7.51]},
 {cc:'ME',c:'Montenegro',p:'Central Bank of Montenegro',ty:'CBDC / stablecoin strategy + pilot',d:'2023-04-11',st:'pilot',u:'https://www.cbcg.me/en/public-relations/news/press-releases/central-bank-of-montenegro-signs-agreement-with-ripple-to-develop-a-digital-currency-strategy-and-pilot?id='},
 {cc:'HK',c:'Hong Kong',p:'HKMA e-HKD pilot (with Fubon Bank)',ty:'CBDC pilot (tokenisation)',d:'2023-05',st:'pilot',u:'https://www.tradingview.com/news/u_today:4fa04248a094b:0-ripple-s-cbdc-platform-to-be-used-by-four-countries-details/'},
 {cc:'CO',c:'Colombia',p:'Banco de la República',ty:'central-bank pilot',d:'2023',st:'pilot',u:'https://ripple.com/ripple-press/national-bank-of-georgia-selects-ripple-as-key-partner-for-digital-lari-pilot-project/'},
 {cc:'GE',c:'Georgia',p:'National Bank of Georgia',ty:'Digital Lari CBDC pilot',d:'2023-11-02',st:'pilot',u:'https://ripple.com/ripple-press/national-bank-of-georgia-selects-ripple-as-key-partner-for-digital-lari-pilot-project/'},
 {cc:'SG',c:'Singapore',p:'MAS (Ripple Markets APAC)',ty:'licence: Major Payment Institution (DPT services)',d:'2023',st:'live',u:'https://ripple.com/legal/compliance/'},
 {cc:'US',c:'United States',p:'NYDFS (Standard Custody & Trust)',ty:'licence: NY trust charter; issues RLUSD',d:'2024-12',st:'live',u:'https://ripple.com/ripple-press/rlusd-stablecoin-dfsa-approval/'},
 {cc:'IE',c:'Ireland',p:'Central Bank of Ireland',ty:'registration: VASP',d:'',st:'live',u:'https://ripple.com/ripple-press/regulated-crypto-payments-in-the-uae/'},
 {cc:'AE',c:'UAE (Dubai DIFC)',p:'DFSA (Ripple Middle East Ltd)',ty:'licence: crypto payments',d:'2025-03-13',st:'live',u:'https://ripple.com/ripple-press/regulated-crypto-payments-in-the-uae/'},
 {cc:'AE',c:'UAE (Dubai DIFC)',p:'DFSA',ty:'RLUSD recognised crypto token',d:'2025-06-03',st:'live',u:'https://ripple.com/ripple-press/rlusd-stablecoin-dfsa-approval/'},
 {cc:'GB',c:'United Kingdom',p:'FCA (Ripple Markets UK)',ty:'licence: EMI + cryptoasset registration',d:'2026-01-09',st:'live',u:'https://ripple.com/ripple-press/ripple-receives-fca-permissions-to-scale-ripple-payments-in-the-uk/'},
 {cc:'AU',c:'Australia',p:'BC Payments Australia (acquisition)',ty:'licence: AFSL via acquisition',d:'2026-03-11',st:'announced',u:'https://ripple.com/ripple-press/ripple-to-secure-australian-financial-services-license-expanding-payments-offering-across-apac/'}];
// OFAC "Active Sanctions Programs" page, read Oct 19 2026 (programme -> last updated). Country programmes only.
const OFAC_URL='https://ofac.treasury.gov/sanctions-programs-and-country-information';
const PROG=[['AF','Afghanistan-Related','2022-02-25'],['BY','Belarus','2026-10-05'],['MM','Burma-Related','2026-10-09'],['CF','Central African Republic','2023-12-08'],['CU','Cuba','2026-10-15'],['CD','DR Congo-Related','2026-09-23'],['HK','Hong Kong-Related','2026-07-17'],['IR','Iran','2026-10-15'],['IQ','Iraq-Related','2026-10-05'],['LB','Lebanon-Related','2026-02-27'],['LY','Libya','2026-09-30'],['ML','Mali-Related','2026-05-28'],['NI','Nicaragua-related','2026-04-16'],['KP','North Korea','2026-03-12'],['RU','Russian Harmful Foreign Activities + Ukraine-/Russia-related','2026-10-15'],['SO','Somalia','2023-05-24'],['SS','South Sudan-Related','2023-12-08'],['SD','Sudan and Darfur','2026-06-26'],['VE','Venezuela-Related','2026-10-16'],['YE','Yemen-related','2021-11-18'],['SY','Assad-related only (PAARSS); country programme revoked','2026-09-24']];
const EASED=[{cc:'SY',c:'Syria',what:'US Syria sanctions programme revoked (EO 14312); 518 names removed from the SDN list, their property unblocked',d:'2025-07-01',u:'https://home.treasury.gov/news/press-releases/sb0183'}];
const FUNDS=[{cc:'AF',c:'Afghanistan',amt:'$3.5B',what:'Afghan central-bank reserves moved into the Swiss-based "Afghan Fund" (BIS account) for targeted disbursements; not returned to the Taliban',d:'2022-09-14',u:'https://home.treasury.gov/news/press-releases/jy0947'},
 {cc:'IR',c:'Iran',amt:'$6B',what:'Funds moved under a US waiver from restricted accounts in South Korea to restricted accounts in Qatar, humanitarian trade only',d:'2023-09-11',u:'https://www.reuters.com/world/us-allows-6-billion-transfer-part-iran-prisoner-swap-2023-09-11/'}];
const NAMES_CC={};
(window.WORLD&&WORLD.c?Object.entries(WORLD.c):[]).forEach(([cc,v])=>{ NAMES_CC[cc]=v[0]; });
Object.assign(NAMES_CC,{US:'United States',GB:'United Kingdom',AE:'UAE',KP:'North Korea',KR:'South Korea',RU:'Russia',IR:'Iran',SY:'Syria',VE:'Venezuela',MM:'Myanmar',CD:'DR Congo',HK:'Hong Kong',PW:'Palau'});
const ALIAS={MM:/Burma|Myanmar/i,KP:/North Korea|DPRK|Pyongyang/i,KR:/South Korea/i,RU:/Russia|Kremlin|Moscow/i,IR:/\bIran/i,SY:/\bSyria/i,VE:/Venezuela/i,CU:/\bCuba/i,BY:/Belarus/i,AF:/Afghan|Taliban/i,US:/\bU\.?S\.? |United States/i,CD:/Congo/i};
const S=LS.get('world',{ev:[],seen:[]}); const save=()=>LS.set('world',S);
const ccOf=t=>{ for(const [cc,re] of Object.entries(ALIAS)) if(re.test(t)) return cc; for(const [cc,n] of Object.entries(NAMES_CC)){ if(n&&n.length>3&&new RegExp('\\b'+n.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\b','i').test(t)) return cc; } return null; };
function classify(t){ if(/lift(s|ed|ing)? sanctions|sanctions (are |were )?lifted|eas(e|es|ed|ing) sanctions|sanctions relief|remov(e|es|ed) sanctions|delist/i.test(t)) return 'eased';
  if(/general licen[cs]e/i.test(t)) return 'gl'; if(/unfr[eo]+z|frozen (assets|funds).*(releas|return|unlock)|releas\w* frozen/i.test(t)) return 'released';
  if(/new sanctions|impos(e|es|ed) sanctions|sanctions on|sanction(s|ed) \d|designat(es|ed)/i.test(t)) return 'new'; return null; }
const KIND={eased:['SANCTIONS EASED','#4fe08c','Sanctions eased or lifted'],gl:['GENERAL LICENSE','#36e2cf','A general license lets some blocked payments go ahead'],released:['FUNDS RELEASED','#ffd166','Frozen money is being released'],new:['NEW SANCTIONS','#ff4d6d','New sanctions: more payments blocked']};
const isCorr=cc=>DEALS.some(d=>d.cc===cc)?'Ripple already active here':'';
function onItem(x,src,official){ const k=classify(x.title); if(!k) return; const id=(x.title||'').slice(0,100); if(S.seen.includes(id)) return; S.seen.push(id); S.seen=S.seen.slice(-2000);
  const cc=ccOf(x.title); const e={k,cc,c:cc?NAMES_CC[cc]:'',title:x.title,t:x.t||Date.now(),src,link:x.link,official,corr:k==='eased'||k==='gl'||k==='released'};
  S.ev.unshift(e); S.ev=S.ev.slice(0,120); save();
  if(!S.armed||Date.now()-e.t>12*3600e3) return; if(!official&&!(window.RF&&RF.CRED.test(x.source||''))) return;
  fireEvent({key:'ww_'+id,name:KIND[k][0]+(e.c?': '+e.c:''),level:official?2:1,meme:'radio',memeLabel:KIND[k][0],joke:`"${x.title}" (${src}). ${KIND[k][2]}.${e.corr?' Possible corridor: payments that were blocked may become legal. Not a forecast.':''}`,src,t:Date.now(),link:x.link}); }
window.WorldWatch={onNews(list){ list.forEach(x=>onItem(x,x.source||'GDELT',false)); S.armed=1; save(); render(); }};
async function ofsi(){ try{ const xml=await fetchText('https://www.gov.uk/government/organisations/office-of-financial-sanctions-implementation.atom',20000); const doc=new DOMParser().parseFromString(xml,'text/xml');
    [...doc.querySelectorAll('entry')].forEach(en=>{ const g=s=>(en.querySelector(s)||{}).textContent||''; onItem({title:g('title'),t:Date.parse(g('updated')),link:(en.querySelector('link')||{getAttribute:()=>''}).getAttribute('href'),source:'gov.uk'},'UK OFSI (gov.uk)',true); }); S.ofsiT=Date.now(); }catch(e){ S.ofsiErr=e.message; } save(); render(); }
async function ofac(){ if(!PROXY) return; try{ const xml=await fetchText(viaProxy('https://ofac.treasury.gov/rss.xml'),25000); const doc=new DOMParser().parseFromString(xml,'text/xml');
    [...doc.querySelectorAll('item')].slice(0,40).forEach(it=>{ const g=s=>(it.querySelector(s)||{}).textContent||''; onItem({title:g('title'),t:Date.parse(g('pubDate')),link:g('link'),source:'ofac.treasury.gov'},'OFAC recent actions',true); }); S.ofacT=Date.now(); }catch(e){ S.ofacErr=e.message; } save(); render(); }
window.WorldMarks=()=>{ const out=[]; DEALS.forEach((d,i)=>out.push({cc:d.cc,ll:d.ll,col:d.st==='live'?'#36e2cf':d.st==='pilot'?'#9b8cff':'#ffd166',r:4,ph:i}));
  PROG.forEach(([cc],i)=>{ if(cc!=='SY') out.push({cc,col:'#ff4d6d',r:2.5,ph:i*0.7}); });
  EASED.concat(S.ev.filter(e=>e.cc&&e.corr&&Date.now()-e.t<7*864e5)).forEach(e=>out.push({cc:e.cc,col:'#4fe08c',r:4,ring:'#4fe08c'})); return out; };
INFO.world='WORLD: where Ripple is licensed or working with central banks (cyan = live licence, violet = pilot, gold = announced), and sanctions per country (red dots = an active OFAC country programme; green ring = sanctions recently eased). Every Ripple row links to Ripple\'s own page or credible reporting. Sanctions alarms read UK OFSI (direct), GDELT news (direct) and OFAC recent actions (only with the local launcher). "Possible corridor" means payments that were blocked may now be legal; it is a fact tag, not a prediction.';
function ensure(){ if(Q('#world')) return; const s=document.createElement('section'); s.id='world'; s.className='panel';
  s.innerHTML='<div class="panel-head"><h2 data-info="world">World · Ripple by country &amp; sanctions</h2><span class="hint">verified sources only · hover for details</span></div><div id="worldBody"></div>';
  (Q('#holders')||document.body).after(s); }
const stC={live:'g',pilot:'v',announced:'a',ended:'dim'};
function render(){ const el=Q('#worldBody'); if(!el) return; const ev=S.ev.slice(0,8);
  const byC={}; DEALS.forEach(d=>{ (byC[d.c]=byC[d.c]||[]).push(d); });
  let h=`<div class="ww-sum"><div><b>${Object.keys(byC).length}</b><span>countries with a verified Ripple licence or central-bank deal</span></div><div><b>${PROG.length-1}</b><span>countries under an active US (OFAC) country programme</span></div><div><b>${S.ev.filter(e=>e.corr&&Date.now()-e.t<7*864e5).length+EASED.length}</b><span>easing / release events tracked (7 d + seed)</span></div></div>`;
  h+='<div class="ww-cols"><div><div class="ww-h">RIPPLE BY COUNTRY</div>'+Object.entries(byC).map(([c,L])=>`<div class="ww-r">${L.map(d=>`<a href="${d.u}" target="_blank" rel="noopener" title="${esc(d.p+' · '+d.ty+(d.d?' · '+d.d:''))}"><span class="pill ${stC[d.st]}">${d.st}</span> <b>${esc(c)}</b> ${esc(d.ty)} <em>${d.d||''}</em></a>`).join('')}</div>`).join('')+'</div>';
  h+='<div><div class="ww-h">SANCTIONS &amp; FROZEN FUNDS</div>'+ev.map(e=>`<a class="ww-e" href="${esc(e.link||'#')}" target="_blank" rel="noopener" title="${esc(e.title+'\nSource: '+e.src+' · '+fT(e.t))}"><span class="pill" style="--c:${KIND[e.k][1]}">${KIND[e.k][0]}</span> ${e.c?'<b>'+esc(e.c)+'</b> ':''}${esc(e.title.slice(0,110))}${e.corr?' <span class="pill corr">possible corridor</span>':''}</a>`).join('')+
   EASED.map(e=>`<a class="ww-e" href="${e.u}" target="_blank" rel="noopener" title="${esc(e.what)}"><span class="pill" style="--c:#4fe08c">EASED</span> <b>${e.c}</b> ${esc(e.what)} <em>${e.d}</em> <span class="pill corr">possible corridor</span></a>`).join('')+
   FUNDS.map(f=>`<a class="ww-e" href="${f.u}" target="_blank" rel="noopener" title="${esc(f.what)}"><span class="pill" style="--c:#ffd166">FUNDS ${esc(f.amt)}</span> <b>${f.c}</b> ${esc(f.what)} <em>${f.d}</em></a>`).join('')+
   `<div class="ww-prog" title="OFAC Active Sanctions Programs page (programme → last updated)"><a href="${OFAC_URL}" target="_blank" rel="noopener">OFAC country programmes</a>: ${PROG.map(p=>`<span title="${esc(p[1]+' · last updated '+p[2])}">${esc(NAMES_CC[p[0]]||p[0])}</span>`).join(' · ')}</div>`+
   `<div class="hint">Live: GDELT news ${window.GDELT&&GDELT.get('sanc')?'✓ '+fT(GDELT.get('sanc').t):'…'} · UK OFSI ${S.ofsiT?'✓ '+fT(S.ofsiT):S.ofsiErr?'✗':'…'} · OFAC RSS ${PROXY?(S.ofacT?'✓ '+fT(S.ofacT):'…'):'needs the local launcher'}</div></div></div>`;
  el.innerHTML=h; }
document.addEventListener('DOMContentLoaded',()=>{ ensure(); render(); }); if(document.readyState!=='loading'){ ensure(); render(); }
window.WWF={ofsi,ofac};
})();

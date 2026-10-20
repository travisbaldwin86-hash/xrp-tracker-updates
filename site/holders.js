/* DEMAND RADAR · Who Holds XRP + S-4/SPAC tracker.
   Every number below was read from a primary source on Oct 18 2026 (SEC EDGAR filings or the company's own press release).
   Rules: verified sources only; a number that is not disclosed is shown as "not disclosed"; never guess wallet addresses
   (none of the filings read discloses a treasury wallet, so no on-chain balance is tracked). */
(function(){ 'use strict';
const Q=s=>document.querySelector(s), QA=s=>[...document.querySelectorAll(s)];
const ED=(cik,acc,doc)=>`https://www.sec.gov/Archives/edgar/data/${+cik}/${acc.replace(/-/g,'')}/${doc}`;
const CO=cik=>`https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${cik}&type=&dateb=&owner=include&count=40`;
// st: v = verified amount, nd = not disclosed, z = disclosed as none yet, u = reported, unverified (no number shown)
const HOLD=window.HOLD=[
 {n:'Evernorth Holdings',tk:'XRPN',k:'Treasury co.',xrp:473e6,approx:true,asof:'2026-10-09',basis:'press release',st:'v',src:'Evernorth press release, closing of Armada II merger ("approximately 473 million XRP")',url:'https://www.evernorth.xyz/press-release-10-09-2026',cik:'0002092592'},
 {n:'Bitwise XRP ETF',tk:'XRP',k:'Spot ETF',xrp:286838445,asof:'2026-06-30',basis:'10-Q',st:'v',src:'Form 10-Q filed Aug 12 2026, "Ending balance as of June 30, 2026"',url:ED('2039525','0001193125-26-346245','xrp-20260630.htm'),cik:'0002039525'},
 {n:'Canary XRP ETF',tk:'XRPC',k:'Spot ETF',xrp:231279303,asof:'2026-06-30',basis:'10-Q',st:'v',src:'Form 10-Q filed Aug 7 2026, "Ending balance as of June 30, 2026" (fair value $241,278,596)',url:ED('2039505','0001999371-26-017438','xrpc-10q_063026.htm'),cik:'0002039505'},
 {n:'Franklin XRP Trust',tk:'XRPZ',k:'Spot ETF',xrp:225368820.7314,asof:'2026-06-30',basis:'10-Q',st:'v',src:'Form 10-Q filed Aug 14 2026, "the Custodian held 225,368,820.7314 XRP" at June 30, 2026',url:ED('2059438','0001140361-26-033198','ef20077164_10-q.htm'),cik:'0002059438'},
 {n:'21Shares XRP ETF',tk:'TOXR',k:'Spot ETF',xrp:108256464,asof:'2026-06-30',basis:'10-Q',st:'v',src:'Form 10-Q filed Aug 11 2026, "Ending balance as of June 30, 2026"',url:ED('2028835','0001213900-26-087823','ea0299658-10q_21shares.htm'),cik:'0002028835'},
 {n:'Grayscale XRP Trust ETF',tk:'GXRP',k:'Spot ETF',xrp:55035728,asof:'2026-06-30',basis:'10-Q',st:'v',src:'Form 10-Q filed Aug 4 2026, "Balance at June 30, 2026"',url:ED('2037427','0002037427-26-000007','ck0002037427-20260630.htm'),cik:'0002037427'},
 {n:'REX-Osprey XRP + Staking',tk:'XRPR',k:'ETF (40-Act)',xrp:21260382,asof:'2026-10-15',basis:'issuer daily',st:'v',src:'REX issuer holdings page as of 10/15/2026: 21,260,382 XRP held directly (60.74%). It also holds CoinShares Physical XRP ETP units (~$18.4M) — indirect, not counted here. An aggregator figure of 35.0M likely includes that indirect exposure.',url:'https://www.rexshares.com/xrpr/'},
 {n:'ReserveOne',tk:'RONE',k:'Treasury co. (S-4)',st:'nd',note:'XRP target weight 3.84% of portfolio',asof:'2026-05-01',src:'S-4/A filed May 1 2026: planned allocation "3.84% to XRP"; no XRP amount disclosed',url:ED('2078721','0001213900-26-050963','ea0255411-09.htm'),cik:'0002078721'},
 {n:'VivoPower International',tk:'VVPR',k:'Public co.',st:'nd',note:'announced XRP treasury plan',asof:'2025-05-28',src:'6-K May 28 2025 (XRP treasury plan); no XRP holding figure found in filings',url:ED('1681348','0001641172-25-012657','ex99-1.htm'),cik:'0001681348'},
 {n:'Trident Digital Tech',tk:'TDTH',k:'Public co.',st:'nd',note:'$500M XRP treasury plan',asof:'2025-06-12',src:'6-K ex.99.1 Jun 12 2025 announces up to $500M XRP treasury; no holding disclosed',url:ED('1983550','0001213900-25-053614','ea024552401ex99-1_trident.htm'),cik:'0001983550'},
 {n:'Webus International',tk:'WETO',k:'Public co.',st:'z',note:'$300M mandate, "no assets committed or transferred"',asof:'2025-06-02',src:'6-K Jun 2 2025 ex.99.3: "no assets have been committed or transferred"',url:CO('0001941158'),cik:'0001941158'},
 {n:'DataMeds AI (ex-Wellgistics)',tk:'MEDS',k:'Public co.',st:'z',note:'"has not yet purchased XRP"',asof:'2025-09-22',src:'S-1/A Sep 22 2025 and SEC correspondence: has not yet purchased XRP',url:ED('2030763','0001493152-25-014355','forms-1a.htm'),cik:'0002030763'},
 {n:"Nature's Miracle",tk:'NMHI',k:'Public co.',st:'nd',note:'$20M XRP plan',asof:'2026-05-27',src:'10-Q filed May 27 2026 shows no XRP line; plan announced Jul 23 2025',url:ED('1947861','0001213900-26-061507','ea0290245-10q_natures.htm'),cik:'0001947861'},
 {n:'SBI Holdings',tk:'8473.T',k:'Payment / finance',st:'u',note:'large XRP stake reported by media, disputed',src:'Media reports only; SBI discloses a Ripple Labs equity stake, not an XRP count. Reported, unverified.',url:'https://www.sbigroup.co.jp/english/investors/'}];
// S-4 / SPAC deals. proj = XRP the filing said Pubco expects to hold at closing assuming no redemptions.
const DEALS=[
 {n:'Evernorth ← Armada Acquisition Corp. II',tk:'XRPN',cik:'0002092592',wallet:null,
  inflow:[['Sponsor Series C subscription (in kind)',211319096.061435],['Ripple contribution (Contribution Agreement, Oct 19 2025)',126791458],['Contributor related-party subscription (in kind)',50000000],['Bought with $214M advance-funding cash @ $2.5366',84365876.3625],['Advance + delayed funding subscribers (in kind)',800000]],
  outflow:[], closeXRP:473e6, closeSrc:'Evernorth press release Oct 9 2026 (approx.)', closeUrl:'https://www.evernorth.xyz/press-release-10-09-2026',
  filings:[['S-4','2026-03-18','0001193125-26-114155','d944435ds4.htm',594611425],['S-4/A','2026-04-07','0001193125-26-145587','d944435ds4a.htm',594611425],['S-4/A','2026-04-28','0001193125-26-183116','d944435ds4a.htm',594611425],['S-4/A','2026-05-29','0001193125-26-248718','d944435ds4a.htm',639762002],['S-4/A','2026-07-13','0001193125-26-302124','d944435ds4a.htm',639762002],['S-4/A','2026-07-29','0001193125-26-324183','d944435ds4a.htm',639762002],['S-4/A','2026-08-13','0001193125-26-347519','d944435ds4a.htm',689704090],['S-4/A','2026-08-26','0001193125-26-365701','d944435ds4a.htm',null],['424B3','2026-08-27','0001193125-26-371512','d944435d424b3.htm',689704090],['8-K','2026-10-09','0001193125-26-419146','d24481d8k.htm',null]]},
 {n:'ReserveOne ← M3-Brigade Acquisition V',tk:'RONE',cik:'0002078721',wallet:null,inflow:null,outflow:null,note:'Multi-asset treasury; XRP is a 3.84% target weight. XRP committed: not disclosed.',
  filings:[['S-4/A','2026-02-17','0001213900-26-016765','ea0255411-05.htm',null],['S-4/A','2026-03-20','0001213900-26-032458','ea0255411-07.htm',null],['S-4/A','2026-05-01','0001213900-26-050963','ea0255411-09.htm',null]]},
 {n:'Wellgistics Health (now DataMeds AI)',tk:'MEDS',cik:'0002030763',wallet:null,inflow:[],outflow:[],note:'S-1 for an XRP treasury/payments plan; company stated it has not yet purchased XRP.',
  filings:[['S-1','2025-07-24','0001641172-25-020862','forms-1.htm',null],['S-1/A','2025-09-22','0001493152-25-014355','forms-1a.htm',null]]}];
const H={fts:LS.get('holdFts',{list:[],t:0}),news:[],err:{}};
const sum=a=>(a||[]).reduce((s,x)=>s+x[1],0);
const ND='<span class="hd-nd">not disclosed</span>';
let tab=sessionStorage.getItem('holdTab')||'h';
function render(){ const el=Q('#holdBody'); if(!el) return; const px=val('px'), xp=px&&px.xrp, coins=val('coins');
  const tot=HOLD.filter(h=>h.st==='v').reduce((s,h)=>s+h.xrp,0), sup=coins&&coins.total;
  let h=`<div class="hd-sum"><div title="Sum of the verified rows only. Dates differ per row (see As of)."><b>${fN(tot)}</b><span>XRP disclosed (verified rows)</span></div><div title="Share of total XRP supply (XRPL total_coins${(D.coins||{}).t?' · '+fT(D.coins.t):''})"><b>${sup?(tot/sup*100).toFixed(2)+'%':'—'}</b><span>of total supply</span></div><div title="At the live XRP price"><b>${xp?fUSD(tot*xp,1):'—'}</b><span>at live price</span></div></div>`;
  h+=`<div class="seg hd-tabs">${[['h','HOLDERS'],['d','S-4 / SPAC'],['f','NEW FILINGS']].map(([k,l])=>`<button data-t="${k}" class="${tab===k?'on':''}">${l}</button>`).join('')}</div>`;
  if(tab==='h'){ h+='<table class="ev-t hd-t"><tr><th>Holder</th><th>Type</th><th>XRP</th><th>As of</th></tr>';
    HOLD.forEach(r=>{ const v=r.st==='v'?(r.approx?'≈':'')+fN(r.xrp,r.approx?0:0):r.st==='z'?'<span class="hd-z">none yet</span>':r.st==='u'?'<span class="hd-u">reported, unverified</span>':ND;
      h+=`<tr title="${esc(r.n+' ('+r.tk+')'+(r.note?' · '+r.note:'')+'\nSource: '+r.src)}"><td><a href="${r.url}" target="_blank" rel="noopener">${esc(r.n)}</a> <em>${esc(r.tk)}</em></td><td>${esc(r.k)}</td><td class="num">${v}</td><td>${r.asof||''}${r.basis?' <em>'+r.basis+'</em>':''}</td></tr>`; });
    h+='<tr><td colspan="4" class="hint">ETF figures marked 10-Q are filed quarter-end numbers (Jun 30); holdings may have changed since. Daily issuer pages need the local helper; aggregator figures are not shown until checked against an issuer.</td></tr>';
    h+='</table>'; }
  if(tab==='d'){ const net=DEALS.reduce((s,d)=>s+(d.inflow?sum(d.inflow)-sum(d.outflow):0),0), mx=Math.max(...DEALS.map(d=>d.inflow?sum(d.inflow):0),1);
    DEALS.forEach(d=>{ const i=d.inflow?sum(d.inflow):null, o=d.outflow?sum(d.outflow):null;
      const tip=(d.inflow&&d.inflow.length?'In: '+d.inflow.map(x=>x[0]+' '+fN(x[1],0)).join(' · '):'In: not disclosed')+'\nOut: '+(d.outflow&&d.outflow.length?d.outflow.map(x=>x[0]+' '+fN(x[1],0)).join(' · '):d.outflow?'none disclosed':'not disclosed')+(d.closeXRP?`\nAt close: ≈${fN(d.closeXRP,0)} XRP (${d.closeSrc})`:'')+'\nTreasury wallet: no address publicly disclosed, so no live on-chain balance';
      const fl=d.filings.map((f,k)=>{ const prev=k?d.filings.slice(0,k).reverse().find(x=>x[4]!=null):null; const ch=f[4]!=null&&prev?f[4]-prev[4]:0;
        return `<a class="hd-f${ch>0?' up':ch<0?' dn':''}" href="${ED(d.cik,f[2],f[3])}" target="_blank" rel="noopener" title="${esc(f[0]+' filed '+f[1]+' · acc. '+f[2]+(f[4]!=null?'\nProjected XRP at closing (no redemptions): '+fN(f[4],0)+(ch?' ('+(ch>0?'+':'')+fN(ch,0)+' vs previous filing)':''):'\nXRP figure: not disclosed / not applicable'))}">${f[0]}<i>${f[1].slice(2)}</i></a>`; }).join('');
      h+=`<div class="hd-deal" title="${esc(tip)}"><div class="hd-dn"><b>${esc(d.n)}</b> <em>${d.tk}</em><span class="num">${i==null?'in '+ND:i?'net +'+fN(i-(o||0)):'no XRP contributed'}</span></div>
        <div class="hd-bar">${i?`<i class="in" style="width:${i/mx*100}%"></i>`:''}${o?`<i class="out" style="width:${o/mx*100}%"></i>`:''}</div>
        <div class="hd-sub">in ${i==null?ND:fN(i,0)} · out ${o==null?ND:o?fN(o,0):'none disclosed'}${d.closeXRP?' · at close ≈'+fN(d.closeXRP,0):''}${d.note?' · '+esc(d.note):''}</div><div class="hd-fl">${fl}</div></div>`; });
    h+=`<div class="hd-net" title="Sum of disclosed in minus disclosed out across deals; undisclosed deals add nothing">Net disclosed XRP into S-4/SPAC treasuries: <b>+${fN(net)}</b> · no treasury wallet address disclosed in any filing read, so none is tracked on-chain</div>`; }
  if(tab==='f'){ const L=H.fts.list||[]; h+=`<div class="hd-ff">${!PROXY?UNAV('needs the local launcher server, which is not running'):H.err.fts&&!L.length?UNAV(H.err.fts):L.length?L.slice(0,12).map(x=>`<a href="${x.url}" target="_blank" rel="noopener" title="${esc(x.co+' · '+x.form+' filed '+x.date+' · matched '+x.q+'\nSEC EDGAR full-text search · checked '+fT(H.fts.t))}"><b>${esc(x.form)}</b> ${esc(x.date)} ${esc(x.co.replace(/\s*\(CIK.*$/,''))}${x.isNew?' <span class="hd-new">NEW</span>':''}</a>`).join(''):'<span class="hint">checking EDGAR…</span>'}</div>`; }
  el.innerHTML=h; QA('#holdBody .hd-tabs button').forEach(b=>b.onclick=()=>{ tab=b.dataset.t; try{sessionStorage.setItem('holdTab',tab);}catch(e){} render(); }); }
// ---------- alarms: EDGAR full-text search (via local launcher) + tracked holders' new filings + news ----------
const FTS_Q=['"XRP treasury"','"XRP holdings"','"XRP tokens"'];
const DEAL_FORMS='S-4,S-4/A,F-4,F-4/A,424B3,424B4,S-1,S-1/A,PREM14A,DEFM14A';
const DISC_FORMS='8-K,10-Q,10-K,6-K';
const ymd=t=>new Date(t).toISOString().slice(0,10);
async function loadFTS(){ if(!PROXY) return; const seen=LS.get('holdSeen',null), S=new Set(seen||[]), out=[]; let err=null;
  for(const [forms,days,kind] of [[DEAL_FORMS,45,'deal'],[DISC_FORMS,14,'disc']]) for(const q of FTS_Q){ try{
      const j=await fetchJSON(viaProxy(`https://efts.sec.gov/LATEST/search-index?q=${encodeURIComponent(q)}&forms=${encodeURIComponent(forms)}&dateRange=custom&startdt=${ymd(Date.now()-days*864e5)}&enddt=${ymd(Date.now()+864e5)}`),{},25000);
      (j.hits&&j.hits.hits||[]).forEach(x=>{ const s=x._source, [acc,doc]=x._id.split(':'); const id=acc+'|'+(s.display_names||[''])[0]; if(out.find(o=>o.id===id)) return;
        out.push({id,acc,kind,q,form:s.form||s.root_form,date:s.file_date,co:(s.display_names||['?'])[0],url:ED((s.ciks||['0'])[0],acc,doc)}); });
    }catch(e){ err=e.message; } await sleep(400); }
  if(!out.length&&err){ H.err.fts=err; render(); return; } delete H.err.fts;
  out.sort((a,b)=>b.date.localeCompare(a.date)); out.forEach(x=>{ if(S.has(x.id)) return; S.add(x.id); if(!seen) return; x.isNew=true;
    const deal=x.kind==='deal';
    fireEvent({key:'fts_'+x.id,name:deal?'New '+x.form+' mentioning XRP':'NEW DISCLOSURE: '+x.form+' mentioning XRP',level:2,meme:'vault',memeLabel:deal?'NEW S-4 / AMENDMENT':'NEW DISCLOSURE',joke:`${x.co} filed a ${x.form} on ${x.date} that matches ${x.q}. A mention is not a purchase; open the filing before assuming anything.`,src:'SEC EDGAR full-text search',t:now(),link:x.url}); });
  const prevNew=new Set((H.fts.list||[]).filter(x=>x.isNew).map(x=>x.id)); out.forEach(x=>{ if(prevNew.has(x.id)) x.isNew=true; });
  H.fts={list:out.slice(0,40),t:Date.now()}; LS.set('holdFts',H.fts); LS.set('holdSeen',[...S].slice(-3000)); render(); }
// Tracked holders: when a new periodic/current report lands, try to read the XRP balance from it and compare with the board.
const TRACK=HOLD.filter(h=>h.st==='v'&&h.cik).map(h=>({cik:h.cik,n:h.n,tk:h.tk,xrp:h.xrp}));
function parseXRP(html){ const t=html.replace(/<[^>]+>/g,' | ').replace(/&nbsp;|&#160;/g,' ').replace(/(\s*\|\s*)+/g,' | ').replace(/\s+/g,' ');
  let m=t.match(/(?:Ending balance as of|Balance at|Balance as of) [A-Z][a-z]+ \d{1,2}, \d{4}[^|]{0,30}\| ([\d,]{6,}(?:\.\d+)?)/); if(m) return +m[1].replace(/,/g,'');
  m=t.match(/Custodian held ([\d,]{6,}(?:\.\d+)?) XRP/); if(m) return +m[1].replace(/,/g,'');
  m=t.match(/(?:holds?|held|holding) (?:approximately |an aggregate of |a total of )?([\d,.]+)( million)? XRP/i); if(m) return +m[1].replace(/,/g,'')*(m[2]?1e6:1);
  return null; }
async function loadTracked(){ if(!PROXY) return; const seen=LS.get('holdSeenAcc',null), S=new Set(seen||[]);
  for(const c of TRACK){ try{ const j=await fetchJSON(viaProxy('https://data.sec.gov/submissions/CIK'+c.cik+'.json'),{},25000), r=j.filings.recent;
      for(let i=0;i<Math.min(r.form.length,30);i++){ const f=r.form[i]; if(!/^(8-K|10-Q|10-K|424B\d|S-4)/.test(f)) continue; const acc=r.accessionNumber[i]; if(S.has(acc)) continue; S.add(acc); if(!seen) continue;
        const url=ED(c.cik,acc,r.primaryDocument[i]); let got=null; try{ got=parseXRP(await fetchText(viaProxy(url),40000)); }catch(e){}
        const chg=got!=null&&Math.abs(got-c.xrp)/c.xrp>0.005;
        fireEvent({key:'hold_'+acc,name:chg?`${c.tk}: disclosed XRP holding changed`:`${c.tk}: new ${f}`,level:chg?3:1,meme:chg?'vault':'radio',memeLabel:chg?'HOLDING CHANGE':'NEW FILING',
          joke:chg?`${c.n} filed a ${f} (${r.filingDate[i]}). Parsed XRP: ${fN(got,0)} vs ${fN(c.xrp,0)} on the board (${got>c.xrp?'+':''}${fN(got-c.xrp,0)}). Parsed automatically; check the filing.`:`${c.n} filed a ${f} on ${r.filingDate[i]}${got!=null?'; parsed XRP '+fN(got,0)+' (unchanged)':''}.`,src:'SEC EDGAR',t:now(),link:url}); }
    }catch(e){} await sleep(400); }
  LS.set('holdSeenAcc',[...S].slice(-3000)); }
async function loadNewsDisc(){ if(!PROXY) return; try{
    const xml=await fetchText(viaProxy('https://news.google.com/rss/search?q='+encodeURIComponent('"XRP treasury" OR "XRP holdings" OR "buys XRP" OR "acquires XRP" when:7d')+'&hl=en-US&gl=US&ceid=US:en'),20000);
    const doc=new DOMParser().parseFromString(xml,'text/xml'); const seen=LS.get('holdNews',null), S=new Set(seen||[]);
    doc.querySelectorAll('item').forEach(it=>{ const g=s=>(it.querySelector(s)||{}).textContent||''; const title=g('title'), t=Date.parse(g('pubDate'))||0; if(S.has(title)) return; S.add(title);
      if(!seen||now()-t>2*864e5||!/XRP/i.test(title)||!/(treasury|holdings|acquir|purchas|buys|bought|reserve)/i.test(title)) return;
      fireEvent({key:'hn_'+title,name:'XRP treasury headline',level:1,meme:'radio',memeLabel:'TREASURY NEWS',joke:`"${title}". A headline is not a filing; the board only changes on a verified source.`,src:'Google News RSS',t,link:g('link')}); });
    LS.set('holdNews',[...S].slice(-1500)); }catch(e){} }
INFO.holders='Who holds XRP, from primary sources only: SEC filings (10-Q balances, S-4/424B3 deal terms, 8-K closings) and the company\'s own press release. Rows with no disclosed number say "not disclosed"; "none yet" means the company said in a filing it has not bought XRP; media-only claims are marked "reported, unverified" and never counted. Dates differ per row. The S-4/SPAC tab shows XRP contributed or bought per deal, each filing (hover for the projected XRP and the change versus the previous filing) and the net total. No company has publicly disclosed a treasury wallet address, so no wallet is watched on-chain. Alarms: new S-4/amendment or 8-K/10-Q mentioning XRP (SEC EDGAR full-text search), a tracked holder filing a new report with a different XRP balance, and treasury headlines.';
const _ra=window.renderAll; window.renderAll=function(){ _ra(); try{ render(); }catch(e){ console.error(e); } };
render(); setTimeout(()=>{ loadFTS(); loadTracked(); loadNewsDisc(); },15000);
window.HDF={loadFTS,loadTracked,loadNewsDisc};
})();

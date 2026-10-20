/* DEMAND RADAR · one shared fetcher for all tracker windows (rig + floor, same browser profile).
   Leader election through a localStorage lock with heartbeat; only the leader touches the network.
   Followers send their requests to the leader over BroadcastChannel; the leader de-duplicates (in-flight + short cache)
   and broadcasts every response so the other window is pre-warmed. If the leader closes or stalls, a follower takes over
   within ~6 s. Single window = leader = plain fetch with de-duplication. */
(function(){ 'use strict';
if(typeof BroadcastChannel!=='function') return;
const ME=Math.random().toString(36).slice(2)+Date.now().toString(36), LOCK='dr_leader', STALE=6500;
const _fetch=window.fetch.bind(window); const bc=new BroadcastChannel('dr_shared_fetch');
const S=window.SHARED={role:'starting',net:0,cacheHits:0,viaLeader:0,served:0,fallback:0,me:ME};
/* ---------- leader election ---------- */
const readLock=()=>{ try{ return JSON.parse(localStorage.getItem(LOCK)||'null'); }catch(e){ return null; } };
function elect(){ const l=readLock(), now=Date.now();
  if(!l||now-l.t>STALE||l.id===ME){ localStorage.setItem(LOCK,JSON.stringify({id:ME,t:now})); }
  const l2=readLock(); const lead=!!l2&&l2.id===ME; const was=S.role; S.role=lead?'leader':'follower'; S.leaderId=l2&&l2.id;
  if(was!==S.role) console.info('[shared fetch] this window is now the',S.role); }
elect(); setInterval(elect,2000);
addEventListener('beforeunload',()=>{ const l=readLock(); if(l&&l.id===ME){ localStorage.removeItem(LOCK); bc.postMessage({type:'bye'}); } });
const leaderAlive=()=>{ const l=readLock(); return !!l&&l.id!==ME&&Date.now()-l.t<STALE; };
/* ---------- cache policy (per source, matched to each source's polite interval) ---------- */
function ttl(url,body){ let h=''; try{ const x=new URL(url,location.href); h=x.host+x.pathname; const p=x.searchParams.get('u'); if(p) h=new URL(p).host+new URL(p).pathname; }catch(e){}
  if(body){ if(/"method":"(account_objects|account_lines)"/.test(body)) return 280e3; if(/"method":"account_info"/.test(body)&&!/rMxCKbEDwqr76QuheSUMdEGf4B9xJ8m5De/.test(body)) return 280e3; return 12e3; }
  if(/xrpscan\.com\/api\/v1\/metrics/.test(h)) return 280e3; if(/xrpscan\.com\/api\/v1\/(names|well-known)/.test(h)) return 25*60e3;
  if(/news\.google\.com|coingecko\.com|occ\.gov|federalreserve\.gov|data\.sec\.gov/.test(h)) return 110e3;
  if(/stablecoins\.llama\.fi|federalregister\.gov|efts\.sec\.gov|ofac\.treasury\.gov|finance\.yahoo\.com/.test(h)) return 55e3;
  return 12e3; }
const C=new Map(), FLY=new Map(); const MAXB=4e6;
const keyOf=(u,o)=>((o&&o.method)||'GET').toUpperCase()+' '+u+' '+(o&&typeof o.body==='string'?o.body:'');
const mk=e=>new Response(e.body,{status:e.status,statusText:e.st||'',headers:{'Content-Type':e.ct||'text/plain'}});
function fresh(k,u,o){ const e=C.get(k); return e&&Date.now()-e.t<ttl(u,o&&o.body)?e:null; }
setInterval(()=>{ const n=Date.now(); for(const [k,e] of C) if(n-e.t>30*60e3) C.delete(k); },60e3);
async function netFetch(k,u,o){ if(FLY.has(k)) return FLY.get(k);
  const p=(async()=>{ S.net++; const r=await _fetch(u,o); const body=await r.text(); const e={t:Date.now(),status:r.status,st:r.statusText,ct:r.headers.get('content-type')||'',body};
    if(body.length<MAXB&&r.status<500&&r.status!==429){ C.set(k,e); try{ bc.postMessage({type:'res',k,e}); }catch(x){} } return e; })();
  FLY.set(k,p); try{ return await p; } finally{ FLY.delete(k); } }
/* ---------- follower → leader requests ---------- */
const WAIT=new Map(); let rid=0;
function askLeader(k,u,o){ return new Promise((res,rej)=>{ const id=ME+':'+(++rid); const to=setTimeout(()=>{ WAIT.delete(id); const er=new Error('leader timeout'); er.timeout=1; rej(er); },50000);
  WAIT.set(id,{res:e=>{ clearTimeout(to); res(e); },rej:er=>{ clearTimeout(to); rej(er); }});
  bc.postMessage({type:'req',id,k,u,o:{method:o&&o.method||'GET',headers:o&&o.headers||undefined,body:o&&typeof o.body==='string'?o.body:undefined}}); }); }
bc.onmessage=async ev=>{ const m=ev.data||{};
  if(m.type==='res'&&m.k&&m.e){ C.set(m.k,m.e); return; }
  if(m.type==='ans'&&WAIT.has(m.id)){ const w=WAIT.get(m.id); WAIT.delete(m.id); if(m.err){ const er=new Error(m.err); er.fromLeader=1; w.rej(er); } else w.res(m.e); return; }
  if(m.type==='bye'){ setTimeout(elect,50); return; }
  if(m.type==='req'&&S.role==='leader'){ try{ const e=fresh(m.k,m.u,m.o)||await netFetch(m.k,m.u,m.o); S.served++; bc.postMessage({type:'ans',id:m.id,e}); }catch(er){ bc.postMessage({type:'ans',id:m.id,err:String(er&&er.message||er)}); } } };
/* ---------- the shared fetch ---------- */
window.fetch=async function(input,opt){ const u=typeof input==='string'?input:(input&&input.url)||String(input); const o=opt||{};
  if(!/^https?:/i.test(new URL(u,location.href).protocol)||(o.method&&!/^(GET|POST)$/i.test(o.method))||(o.body&&typeof o.body!=='string')) return _fetch(input,opt);
  const k=keyOf(u,o); const hit=fresh(k,u,o); if(hit){ S.cacheHits++; return mk(hit); }
  const abort=o.signal; const race=p=>abort?Promise.race([p,new Promise((_,rej)=>{ if(abort.aborted) rej(new DOMException('Aborted','AbortError')); abort.addEventListener('abort',()=>rej(new DOMException('Aborted','AbortError')),{once:true}); })]):p;
  const plain={method:o.method,headers:o.headers,body:o.body};
  if(S.role!=='leader'&&leaderAlive()){ try{ const e=await race(askLeader(k,u,plain)); S.viaLeader++; return mk(e); }catch(er){ if(er&&(er.name==='AbortError'||er.fromLeader)) throw er; S.fallback++; elect(); } }
  const e=await race(netFetch(k,u,plain)); return mk(e); };
})();

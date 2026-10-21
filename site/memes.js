/* Original meme engine: "Ledge", the DEMAND RADAR mascot (a dramatic little ledger-coin pilot).
   All art is hand-built SVG + CSS animation. No third-party meme images. */
(function(){
const css = `
.mm svg{width:100%;height:100%;display:block}
.mm .bob{animation:mmBob 1.6s ease-in-out infinite;transform-box:fill-box;transform-origin:center}
.mm .shake{animation:mmShake .18s linear infinite;transform-box:fill-box;transform-origin:center}
.mm .sweat{animation:mmDrip 1.1s ease-in infinite}
.mm .sweat.d2{animation-delay:.55s}
.mm .therm{animation:mmTherm 3s ease-in-out infinite;transform-box:fill-box;transform-origin:bottom}
.mm .rocket{animation:mmRocket 3s ease-in infinite}
.mm .flame{animation:mmFlame .12s linear infinite alternate;transform-box:fill-box;transform-origin:top}
.mm .star{animation:mmStar 1.2s linear infinite}
.mm .fall{animation:mmFall 3.2s ease-in infinite}
.mm .wave{animation:mmWave 2.4s ease-in-out infinite}
.mm .boat{animation:mmBoat 1.4s ease-in-out infinite;transform-box:fill-box;transform-origin:bottom}
.mm .splash{animation:mmSplash 2.4s ease-out infinite;transform-box:fill-box;transform-origin:bottom}
.mm .tail{animation:mmTail 2.4s ease-in-out infinite;transform-box:fill-box;transform-origin:bottom}
.mm .fire{animation:mmFire .35s ease-in-out infinite alternate;transform-box:fill-box;transform-origin:bottom}
.mm .run{animation:mmRun 1.2s linear infinite}
.mm .float{animation:mmFloat 3s ease-in-out infinite}
.mm .z{animation:mmZ 2.4s linear infinite;opacity:0}
.mm .z.d2{animation-delay:.8s}.mm .z.d3{animation-delay:1.6s}
.mm .blink{animation:mmBlink 1s steps(2) infinite}
.mm .tilt{animation:mmTilt 2.6s ease-in-out infinite;transform-box:fill-box;transform-origin:center}
.mm .pulse{animation:mmPulse 1s ease-in-out infinite;transform-box:fill-box;transform-origin:center}
.mm .spin{animation:mmSpin 6s linear infinite;transform-box:fill-box;transform-origin:center}
.mm .scan{animation:mmScan 2.5s ease-in-out infinite;transform-box:fill-box;transform-origin:center}
.mm .confetti{animation:mmConf 1.8s linear infinite}
@keyframes mmBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
@keyframes mmShake{0%{transform:translate(0,0)}25%{transform:translate(1.5px,-1px)}50%{transform:translate(-1.5px,1px)}75%{transform:translate(1px,1px)}}
@keyframes mmDrip{0%{transform:translateY(0);opacity:1}100%{transform:translateY(26px);opacity:0}}
@keyframes mmTherm{0%{transform:scaleY(.55)}70%,100%{transform:scaleY(1)}}
@keyframes mmRocket{0%{transform:translate(0,40px)}100%{transform:translate(30px,-150px)}}
@keyframes mmFlame{from{transform:scaleY(.7)}to{transform:scaleY(1.25)}}
@keyframes mmStar{from{transform:translateY(-10px)}to{transform:translateY(140px)}}
@keyframes mmFall{0%,25%{transform:translate(0,0) rotate(0)}30%{transform:translate(18px,-6px) rotate(10deg)}100%{transform:translate(48px,150px) rotate(220deg)}}
@keyframes mmWave{0%,100%{transform:translateX(0)}50%{transform:translateX(-12px)}}
@keyframes mmBoat{0%,100%{transform:rotate(-8deg)}50%{transform:rotate(8deg) translateY(-3px)}}
@keyframes mmSplash{0%,30%{transform:scale(0);opacity:0}45%{transform:scale(1);opacity:1}80%,100%{transform:scale(1.25);opacity:0}}
@keyframes mmTail{0%,20%{transform:translateY(40px)}40%,60%{transform:translateY(0)}85%,100%{transform:translateY(40px)}}
@keyframes mmFire{from{transform:scaleY(.85) skewX(-4deg)}to{transform:scaleY(1.12) skewX(4deg)}}
@keyframes mmRun{0%{transform:translateX(-30px)}50%{transform:translateX(30px) scaleX(1)}50.01%{transform:translateX(30px) scaleX(-1)}100%{transform:translateX(-30px) scaleX(-1)}}
@keyframes mmFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
@keyframes mmZ{0%{transform:translate(0,0) scale(.6);opacity:0}20%{opacity:1}100%{transform:translate(22px,-34px) scale(1.2);opacity:0}}
@keyframes mmBlink{0%{opacity:1}50%{opacity:.25}}
@keyframes mmTilt{0%,100%{transform:rotate(-12deg)}50%{transform:rotate(12deg)}}
@keyframes mmPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.12)}}
@keyframes mmSpin{to{transform:rotate(360deg)}}
@keyframes mmScan{0%,100%{transform:translateX(-18px)}50%{transform:translateX(18px)}}
@keyframes mmConf{from{transform:translateY(-20px) rotate(0)}to{transform:translateY(140px) rotate(360deg)}}
`;
const st=document.createElement('style');st.textContent=css;document.head.appendChild(st);

/* Ledge: coin body + pilot headset. eyes: n|wide|x|dollar|closed|star|side ; mouth: smile|o|flat|grin|wobble|frown */
function ledge(x,y,s,o){o=o||{};const e=o.eyes||'n',m=o.mouth||'smile',c=o.color||'#00f0ff';
 const eye=(cx)=>{switch(e){
  case 'wide':return `<circle cx="${cx}" cy="-4" r="6" fill="#fff"/><circle cx="${cx}" cy="-4" r="2" fill="#071019"/>`;
  case 'x':return `<path d="M${cx-4} -8 l8 8 M${cx+4} -8 l-8 8" stroke="#071019" stroke-width="2.6" stroke-linecap="round"/>`;
  case 'dollar':return `<circle cx="${cx}" cy="-4" r="6" fill="#fff"/><text x="${cx}" y="0" font-size="10" font-weight="700" text-anchor="middle" fill="#0a8f4a" font-family="Arial">$</text>`;
  case 'closed':return `<path d="M${cx-5} -4 q5 4 10 0" stroke="#071019" stroke-width="2.4" fill="none" stroke-linecap="round"/>`;
  case 'star':return `<path d="M${cx} -11 l2 5 5 .5 -4 3.5 1.3 5 -4.3 -2.7 -4.3 2.7 1.3 -5 -4 -3.5 5 -.5z" fill="#ffd34d"/>`;
  case 'side':return `<circle cx="${cx}" cy="-4" r="5.5" fill="#fff"/><circle cx="${cx+2.5}" cy="-4" r="2.2" fill="#071019"/>`;
  default:return `<circle cx="${cx}" cy="-4" r="5" fill="#fff"/><circle cx="${cx+1}" cy="-3.5" r="2.3" fill="#071019"/>`;}};
 const mouth={smile:'<path d="M-7 7 q7 7 14 0" stroke="#071019" stroke-width="2.4" fill="none" stroke-linecap="round"/>',
  o:'<ellipse cx="0" cy="9" rx="4" ry="5" fill="#071019"/>',
  flat:'<path d="M-6 9 h12" stroke="#071019" stroke-width="2.4" stroke-linecap="round"/>',
  grin:'<path d="M-9 5 q9 12 18 0z" fill="#071019"/><path d="M-6 6.5 h12" stroke="#fff" stroke-width="2"/>',
  wobble:'<path d="M-8 9 q2 -3 4 0 t4 0 t4 0 t4 0" stroke="#071019" stroke-width="2.2" fill="none" stroke-linecap="round"/>',
  frown:'<path d="M-7 12 q7 -7 14 0" stroke="#071019" stroke-width="2.4" fill="none" stroke-linecap="round"/>'}[m];
 return `<g transform="translate(${x},${y}) scale(${s})">
  <ellipse cx="-9" cy="27" rx="7" ry="3.5" fill="#0d6f66"/><ellipse cx="9" cy="27" rx="7" ry="3.5" fill="#0d6f66"/>
  <circle r="25" fill="${c}"/><circle r="25" fill="url(#lg)" opacity=".55"/><circle r="20.5" fill="none" stroke="#0b5f58" stroke-width="2" stroke-dasharray="3 3" opacity=".7"/>
  <path d="M-24 -6 q24 -34 48 0" stroke="#1b2a3f" stroke-width="4" fill="none"/><rect x="-29" y="-9" width="8" height="13" rx="3" fill="#1b2a3f"/><rect x="21" y="-9" width="8" height="13" rx="3" fill="#1b2a3f"/>
  <path d="M-25 2 q-4 12 6 14" stroke="#1b2a3f" stroke-width="2" fill="none"/><circle cx="-18" cy="16" r="2.4" fill="#fcee0a"/>
  ${eye(-8)}${eye(9)}${mouth}
 </g>`;}
const defs=`<defs><radialGradient id="lg" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#fff"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/></radialGradient>
 <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0b1a2a"/><stop offset="1" stop-color="#071019"/></linearGradient></defs>`;
const wrap=(inner,bg)=>`<div class="mm"><svg viewBox="0 0 200 130" preserveAspectRatio="xMidYMid meet">${defs}<rect width="200" height="130" fill="${bg||'url(#sky)'}"/>${inner}</svg></div>`;
const txt=(t,x,y,sz,c)=>`<text x="${x}" y="${y}" font-family="Bahnschrift,Segoe UI,Arial" font-weight="700" font-size="${sz||13}" fill="${c||'#fff'}" text-anchor="middle">${t}</text>`;

const S={
 sweat:(v)=>wrap(`<g transform="translate(160,20)"><rect x="-6" y="0" width="12" height="80" rx="6" fill="#1b2a3f"/><rect class="therm" x="-3.5" y="10" width="7" height="68" rx="3.5" fill="#ff2a6d"/><circle cy="84" r="10" fill="#ff2a6d"/><text x="-12" y="18" font-size="8" fill="#fcee0a" text-anchor="end" font-family="Arial">70</text><path d="M-8 16 h-2" stroke="#fcee0a"/></g>
  <g class="shake">${ledge(80,72,1.25,{eyes:'wide',mouth:'wobble'})}</g><path class="sweat" d="M108 50 q4 6 0 9 q-4 -3 0 -9z" fill="#7fd8ff"/><path class="sweat d2" d="M52 46 q4 6 0 9 q-4 -3 0 -9z" fill="#7fd8ff"/>${txt(v||'RSI 69… 70…',80,20,13,'#fcee0a')}`),
 oversold:(v)=>wrap(`<rect x="0" y="104" width="200" height="26" fill="#0f1d2e"/><g transform="rotate(-90 100 92)">${ledge(100,92,1.1,{eyes:'closed',mouth:'flat'})}</g><g transform="translate(140,40) rotate(-12)"><rect x="-26" y="-12" width="52" height="24" rx="4" fill="#fcee0a"/>${txt('ON SALE?',0,5,11,'#071019')}</g>${txt(v||'RSI under 30',70,24,12,'#7fd8ff')}`),
 rocket:(v)=>wrap(`<g class="star"><circle cx="20" cy="0" r="1.5" fill="#fff"/><circle cx="90" cy="30" r="1" fill="#fff"/><circle cx="170" cy="10" r="1.4" fill="#fff"/><circle cx="140" cy="60" r="1" fill="#fff"/></g>
  <g class="rocket"><g transform="translate(95,90) rotate(18)"><path d="M-14 30 q-6 -40 14 -62 q20 22 14 62z" fill="#e6eef8"/><circle cy="-8" r="7" fill="#00f0ff"/><path d="M-14 22 l-10 14 h10z M14 22 l10 14 h-10z" fill="#ff2a6d"/><path class="flame" d="M-8 31 q8 26 16 0z" fill="#fcee0a"/></g>${ledge(70,62,.7,{eyes:'star',mouth:'grin'})}</g>${txt(v||'GOLDEN CROSS',100,122,13,'#ffd34d')}`),
 cliff:(v)=>wrap(`<path d="M0 60 h80 l6 70 h-86z" fill="#1b2a3f"/><path d="M0 60 h80" stroke="#39ff88" stroke-width="2"/><g class="fall">${ledge(60,36,.85,{eyes:'x',mouth:'o'})}</g><path d="M120 130 q30 -20 80 -10 v10z" fill="#0f1d2e"/>${txt(v||'DEATH CROSS',140,30,13,'#ff2a6d')}${txt('50-day under 200-day',140,46,9,'#8197b3')}`),
 whale:(v)=>wrap(`<g class="wave"><path d="M-20 100 q20 -8 40 0 t40 0 t40 0 t40 0 t40 0 t40 0 v40 h-240z" fill="#12406b"/></g>
  <g class="tail"><path d="M140 100 q0 -26 -14 -40 q14 4 18 14 q4 -10 18 -14 q-14 14 -14 40z" fill="#4aa8ff"/></g><g class="splash"><circle cx="126" cy="62" r="3" fill="#bfe6ff"/><circle cx="160" cy="58" r="2.5" fill="#bfe6ff"/><circle cx="144" cy="50" r="2" fill="#bfe6ff"/></g>
  <g class="boat"><path d="M30 92 h56 l-8 12 h-40z" fill="#fcee0a"/>${ledge(58,74,.65,{eyes:'wide',mouth:'o'})}</g>${txt(v||'WHALE ALERT',100,22,14,'#7fd8ff')}`),
 fire:(v)=>wrap(`<g transform="translate(130,104)"><path class="fire" d="M-20 0 q-4 -30 10 -46 q2 16 10 20 q6 -18 2 -30 q24 18 18 56z" fill="#ff7a3d"/><path class="fire" d="M-10 0 q0 -18 8 -26 q4 12 8 10 q8 8 4 16z" fill="#ffd34d"/></g><path d="M75 74 L118 66" stroke="#8a6a4a" stroke-width="2.5"/><ellipse cx="120" cy="65" rx="5" ry="4" fill="#fff"/>
  ${ledge(60,82,1,{eyes:'closed',mouth:'smile'})}${txt(v||'BURN SPIKE',100,22,14,'#ff7a3d')}${txt('fees destroyed = XRP gone forever',100,36,8.5,'#8197b3')}`),
 panic:(v)=>wrap(`<g class="run"><g class="shake">${ledge(100,82,1,{eyes:'wide',mouth:'o'})}</g></g>${txt('!!!',40,50,22,'#ff2a6d')}${txt('!!!',165,60,22,'#ff2a6d')}${txt(v||'EXTREME FEAR',100,22,14,'#ff2a6d')}`),
 greed:(v)=>wrap(`<g class="confetti"><rect x="30" y="0" width="5" height="3" fill="#39ff88"/><rect x="80" y="-30" width="5" height="3" fill="#ffd34d"/><rect x="150" y="-10" width="5" height="3" fill="#00f0ff"/><rect x="120" y="-50" width="5" height="3" fill="#ff2a6d"/></g>
  <g class="bob">${ledge(100,80,1.15,{eyes:'dollar',mouth:'grin'})}</g>${txt(v||'EXTREME GREED',100,22,14,'#39ff88')}`),
 zen:(v)=>wrap(`<circle cx="100" cy="70" r="40" fill="#00f0ff10" class="pulse"/><g class="float">${ledge(100,72,1,{eyes:'closed',mouth:'smile'})}<path d="M70 96 q30 12 60 0" stroke="#00f0ff55" stroke-width="3" fill="none"/></g>${txt(v||'NEUTRAL VIBES',100,22,13,'#00f0ff')}`),
 sleep:(v)=>wrap(`<rect x="40" y="96" width="120" height="10" rx="5" fill="#1b2a3f"/>${ledge(100,78,1,{eyes:'closed',mouth:'flat'})}<text class="z" x="125" y="50" fill="#c86bff" font-size="14" font-family="Arial" font-weight="700">Z</text><text class="z d2" x="125" y="50" fill="#c86bff" font-size="12" font-family="Arial" font-weight="700">z</text><text class="z d3" x="125" y="50" fill="#c86bff" font-size="10" font-family="Arial" font-weight="700">z</text>${txt(v||'SQUEEZE: so quiet…',90,22,13,'#c86bff')}`),
 megaphone:(v)=>wrap(`${ledge(70,78,1,{eyes:'wide',mouth:'o'})}<g class="pulse"><path d="M96 70 l40 -18 v44 l-40 -18z" fill="#fcee0a"/><path d="M146 58 q10 16 0 32 M156 50 q16 24 0 48" stroke="#fcee0a" stroke-width="3" fill="none"/></g>${txt(v||'VOLUME SPIKE',100,22,14,'#fcee0a')}`),
 seesaw:(v)=>wrap(`<g class="tilt"><rect x="30" y="92" width="140" height="6" rx="3" fill="#8197b3"/>${ledge(52,74,.6,{eyes:'wide',mouth:'grin'})}${ledge(70,74,.6,{eyes:'n',mouth:'grin'})}${ledge(148,74,.6,{eyes:'side',mouth:'flat'})}</g><path d="M100 98 l-10 20 h20z" fill="#1b2a3f"/>${txt(v||'CROWDED TRADE',100,22,13,'#fcee0a')}`),
 party:(v)=>wrap(`<g class="confetti"><rect x="40" y="-5" width="5" height="3" fill="#39ff88"/><rect x="100" y="-35" width="5" height="3" fill="#ffd34d"/><rect x="160" y="-15" width="5" height="3" fill="#00f0ff"/></g><g class="bob">${ledge(100,78,1.1,{eyes:'star',mouth:'grin'})}</g><path d="M86 52 l14 -26 l14 26z" fill="#c86bff"/>${txt(v||'ADOPTION UP',100,122,13,'#39ff88')}`),
 shrug:(v)=>wrap(`${ledge(100,74,1.1,{eyes:'side',mouth:'flat'})}<path d="M68 72 l-14 -10 M132 72 l14 -10" stroke="#00f0ff" stroke-width="4" stroke-linecap="round"/>${txt(v||'FLAT. VERY FLAT.',100,22,13,'#8197b3')}`),
 detective:(v)=>wrap(`${ledge(86,78,1,{eyes:'side',mouth:'flat'})}<g class="scan"><circle cx="128" cy="70" r="16" fill="#00f0ff18" stroke="#fcee0a" stroke-width="4"/><path d="M140 82 l14 14" stroke="#fcee0a" stroke-width="5" stroke-linecap="round"/></g>${txt(v||'NOT DISCLOSED',100,22,13,'#fcee0a')}`),
 vault:(v)=>wrap(`<rect x="110" y="40" width="70" height="70" rx="8" fill="#1b2a3f" stroke="#8197b3" stroke-width="2"/><g class="spin" ><circle cx="145" cy="75" r="18" fill="none" stroke="#fcee0a" stroke-width="3"/><path d="M145 57 v36 M127 75 h36" stroke="#fcee0a" stroke-width="2"/></g>
  ${ledge(60,80,.95,{eyes:'dollar',mouth:'smile'})}${txt(v||'TREASURY WATCH',100,22,13,'#ffd34d')}`),
 radio:(v)=>wrap(`<g transform="translate(150,40)"><path d="M0 70 l-12 24 M0 70 l12 24" stroke="#8197b3" stroke-width="3"/><rect x="-3" y="10" width="6" height="62" fill="#8197b3"/><circle class="blink" cy="8" r="5" fill="#ff2a6d"/><path class="pulse" d="M-14 -4 q14 -14 28 0 M-22 -10 q22 -22 44 0" stroke="#00f0ff" stroke-width="2.5" fill="none"/></g>
  ${ledge(70,80,1,{eyes:'wide',mouth:'o'})}${txt(v||'BREAKING',80,22,14,'#00f0ff')}`),
 chain:(v)=>wrap(`<g class="bob"><circle cx="40" cy="70" r="14" fill="#1b2a3f" stroke="#e6eef8" stroke-width="2"/>${txt('X$',40,75,11,'#e6eef8')}</g><path d="M56 70 h20" stroke="#39ff88" stroke-width="4"/><circle cx="92" cy="70" r="14" fill="#1b2a3f" stroke="#39ff88" stroke-width="2"/>${txt('CR',92,75,11,'#39ff88')}
  <path class="blink" d="M108 70 h20" stroke="#fcee0a" stroke-width="4" stroke-dasharray="4 4"/>${ledge(152,72,.7,{eyes:'side',mouth:'o'})}${txt(v||'LINK NOT ANNOUNCED',100,22,12,'#fcee0a')}${txt('?',118,62,14,'#fcee0a')}`),
 calm:(v)=>wrap(`<rect x="20" y="100" width="160" height="4" rx="2" fill="#1b2a3f"/><g class="bob">${ledge(100,74,1.05,{eyes:'n',mouth:'smile'})}</g><path d="M128 64 h18 v14 a9 9 0 0 1 -18 0z" fill="#8197b3"/><path d="M146 68 a5 5 0 0 1 0 8" stroke="#8197b3" stroke-width="2" fill="none"/>${txt(v||'ALL QUIET ON THE LEDGER',100,22,12,'#00f0ff')}`),
};
window.Memes={render:(scene,label)=>(S[scene]||S.calm)(label),scenes:Object.keys(S),ledge,
 logoSVG:()=>`<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">${defs}<rect width="64" height="64" rx="14" fill="#071019"/>${ledge(32,32,1)}</svg>`};
})();

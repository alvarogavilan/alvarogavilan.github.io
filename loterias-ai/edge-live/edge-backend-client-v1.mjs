// EDGE LIVE permanent backend bridge.
// Uses Cloudflare sentinel as the primary 24/7 source when fresh; browser-direct
// polling remains active in the legacy module as an independent cross-check.

const BACKEND='https://loterias-edge-sentinel.k8mwkbp68y.workers.dev';
const PLAN='./evidence/edge-live-multi-execution-plan-v1.json';
const FRESH_SECONDS=12;
const $=id=>document.getElementById(id);
const finite=v=>v!==null&&v!==undefined&&Number.isFinite(Number(v));
const age=t=>{const n=Date.parse(t||'');return Number.isFinite(n)?Math.max(0,Math.floor((Date.now()-n)/1000)):null;};
const money=v=>finite(v)?Number(v).toLocaleString('es-ES',{style:'currency',currency:'EUR',minimumFractionDigits:2,maximumFractionDigits:2}):'—';
const time=t=>{const d=new Date(t);return Number.isFinite(d.getTime())?new Intl.DateTimeFormat('es-ES',{timeZone:'Europe/Madrid',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(d):'—';};
const set=(node,value)=>{if(node&&node.textContent!==value)node.textContent=value;};

const bridge={state:null,plan:null,lanesByName:new Map(),ok:false,lastFetchAt:null,error:null};

async function getJson(url){const r=await fetch(`${url}${url.includes('?')?'&':'?'}t=${Date.now()}`,{cache:'no-store'});if(!r.ok)throw new Error(`HTTP_${r.status}`);return r.json();}

async function refreshPlan(){
  try{
    const p=await getJson(PLAN);bridge.plan=p;
    const lanes=Array.isArray(p?.lanes)?p.lanes:[];
    bridge.lanesByName=new Map(lanes.map(l=>[String(l?.game?.name||'').trim(),l]).filter(([n])=>n));
  }catch{bridge.plan=null;bridge.lanesByName=new Map();}
}

async function refreshBackend(){
  try{
    const body=await getJson(`${BACKEND}/state`);
    const current=body?.current||{};
    const a=age(current?.observedAt);
    if(body?.ok!==true||!current?.meters||a===null||a>FRESH_SECONDS)throw new Error('BACKEND_STALE');
    bridge.state={...body,current};bridge.ok=true;bridge.lastFetchAt=new Date().toISOString();bridge.error=null;
  }catch(e){bridge.ok=false;bridge.error=String(e?.message||e);}
}

function laneKey(lane){return typeof lane?.monitor?.key==='string'?lane.monitor.key:null;}
function gridValue(card,label){const c=[...card.querySelectorAll('.laneGrid > div')].find(d=>d.querySelector('small')?.textContent?.trim()===label);return c?.querySelector('b')||null;}
function ensureBadge(card){
  let b=card.querySelector('.edgeBackendBadge');
  if(!b){b=document.createElement('div');b.className='edgeBackendBadge';b.style.cssText='display:inline-block;margin-top:7px;margin-left:5px;padding:4px 7px;border-radius:999px;border:1px solid #29df8655;background:#29df8612;color:#55e99b;font-size:7px;font-weight:1000;letter-spacing:.04em';card.querySelector('.laneMeta')?.insertAdjacentElement('afterend',b);}
  set(b,'BACKEND 24/7');
}

function applyMeters(){
  if(!bridge.ok)return;
  const c=bridge.state.current,meters=c.meters||{},obs=c.observedAt,a=age(obs);
  for(const card of document.querySelectorAll('#radarList .laneCard')){
    const title=card.querySelector('.laneTop b')?.textContent?.trim();if(!title)continue;
    const lane=bridge.lanesByName.get(title);if(!lane)continue;
    const key=laneKey(lane);
    if(key&&finite(meters[key]))set(gridValue(card,'CONTADOR'),money(meters[key]));
    if((key&&finite(meters[key]))||title==="Fishin' Frenzy: Jackpot King"){
      set(gridValue(card,'ÚLTIMA OBS.'),time(obs));set(gridValue(card,'EDAD DATO'),`${a}s`);ensureBadge(card);
    }
  }
  if(finite(meters['blueprint:JACKPOTKING']))set($('potValue1'),money(meters['blueprint:JACKPOTKING']));
  if(finite(meters['blueprint:JACKPOTKING_REGAL']))set($('potValue2'),money(meters['blueprint:JACKPOTKING_REGAL']));
  if(finite(meters['blueprint:JACKPOTKING_ROYAL']))set($('potValue3'),money(meters['blueprint:JACKPOTKING_ROYAL']));
  set($('observed'),time(obs));set($('freshness'),`${a}s`);if($('freshness'))$('freshness').className=a<=FRESH_SECONDS?'ok':'bad';
  const tg=bridge.state.telegramConfigured===true?'TELEGRAM OK':'TELEGRAM PENDIENTE';
  set($('channel'),`BACKEND 24/7 · ${Number(c.canonicalCount||0)} IDs · ~${Math.round(Number(c.pollingEveryMs||5000)/1000)}s · ${tg}`);
}

function applySignal(){
  if(!bridge.ok)return;
  const box=$('instantSignal'),label=$('instantDecision'),detail=$('instantDetail'),go=$('instantGo');if(!box||!label||!detail)return;
  const s=bridge.state.current?.signal||{};
  const fresh=age(bridge.state.current?.observedAt)<=FRESH_SECONDS;
  if(s.mode==='GREEN'&&fresh){
    const o=s.order||{},g=s.game||{};box.className='instantSignal green';set(label,'🟢 JUGAR AHORA');
    set(detail,`BACKEND 24/7 · ${g.name||'Juego verificado'} · ${money(o.stakePerSpinEUR)} / jugada · máx. ${o.maxSpins||0} · tope ${money(o.maxTotalStakeEUR)} · caduca ${time(o.validUntil)}`);
    if(go){go.hidden=false;go.href=g.url||'#';set(go,'ABRIR JUEGO →');}
  }else if(box.classList.contains('green')&&s.mode!=='GREEN'){
    box.className='instantSignal red';set(label,'🔴 SIN SEÑAL · 0 €');set(detail,'Backend 24/7 activo. La señal ejecutable no está vigente.');if(go)go.hidden=true;
  }
}

function sync(){applyMeters();applySignal();}
refreshPlan();refreshBackend();sync();
setInterval(refreshPlan,10000);
setInterval(refreshBackend,2000);
setInterval(sync,300);
window.addEventListener('online',refreshBackend);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshBackend();});

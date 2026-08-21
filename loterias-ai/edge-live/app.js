import {pickTopLane,buildRadarCards,radarSummary,unmappedLiveRows} from './edge-radar-lanes-v1.mjs';
const DEFAULT_GAME_URL='https://www.botemania.es/juegos/slots-online/fishin-frenzy-jackpot-king';
const BOT_GRAPHQL='https://www.botemania.es/es/graphql';
const BOT_QUERY=`query loadJackpots {
  jackpots { id amount }
  redTigerJackpots { id amount }
  blueprintJackpots { id amount }
}`;
const SOURCES={
  plan:'./evidence/edge-live-execution-plan-v1.json',
  multi:'./evidence/edge-live-multi-execution-plan-v1.json',
  params:'./evidence/botemania-fishin-execution-parameters-v1.json',
  assets:'./evidence/botemania-fishin-public-assets-probe-v1.json',
  metadata:'../casino/jackpots/evidence/botemania-fishin-metadata-probe-v1.json',
  live:'../casino/jackpots/evidence/botemania-jpk-live-gate-v1.json',
  validation:'../casino/jackpots/evidence/botemania-jpk-allocation-validation-result-v1.json'
};
const $=id=>document.getElementById(id);
const eur=x=>Number.isFinite(Number(x))?Number(x).toLocaleString('es-ES',{style:'currency',currency:'EUR',minimumFractionDigits:2,maximumFractionDigits:2}):'—';
const pct=x=>Number.isFinite(Number(x))?(Number(x)*100).toFixed(3)+'%':'—';
const secAge=t=>{const n=Date.parse(t||'');return Number.isFinite(n)?Math.max(0,Math.floor((Date.now()-n)/1000)):null;};
const time=t=>{const d=new Date(t);return Number.isFinite(d.getTime())?new Intl.DateTimeFormat('es-ES',{timeZone:'Europe/Madrid',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(d):'—';};
const clock=()=>new Intl.DateTimeFormat('es-ES',{timeZone:'Europe/Madrid',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(new Date());
const escapeHtml=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const blockerLabel={
  STRUCTURAL_VALIDATION_NOT_PASSED:'La estructura prospectiva todavía no está validada.',
  ECONOMIC_GATE_NOT_PASSED:'El estado económico actual no demuestra expectativa no negativa.',
  EXACT_STAKE_PER_SPIN_NOT_VERIFIED:'Todavía no está verificada la APUESTA TOTAL exacta por giro.',
  EXACT_STAKE_NOT_VERIFIED:'Todavía no está verificado el stake exacto de ejecución.',
  SOURCE_NOT_FRESH:'El dato científico no está suficientemente fresco.',
  SIGNAL_EXPIRED:'La ventana de ejecución ya ha caducado.',
  LIVE_COUNTER_NOT_FOUND:'El contador público esperado no está visible ahora mismo.',
  LIVE_COUNTER_IDENTITY_NOT_VERIFIED:'La identidad del contador todavía no está demostrada.',
  BREAK_EVEN_THRESHOLD_EUR_NOT_VERIFIED:'El umbral económico todavía no está ligado de forma exacta a euros.',
  CURRENT_STATE_BELOW_BREAK_EVEN:'El estado actual está por debajo del punto de equilibrio.',
  EXECUTION_STRATEGY_NOT_VERIFIED:'La estrategia exacta de ejecución todavía no está validada.'
};
let state={plan:null,params:null,assets:null,metadata:null,live:null,validation:null,directByKey:{},directPots:null,directAt:null,directOk:false,directRows:0,directCanonicalRows:0,directAmbiguousKeys:0};

async function json(url){const r=await fetch(`${url}?t=${Date.now()}`,{cache:'no-store'});if(!r.ok)throw new Error(`${r.status} ${url}`);return r.json();}
async function maybeJson(url){try{return await json(url);}catch{return null;}}
function directFresh(){const a=secAge(state.directAt);return state.directOk&&a!=null&&a<=10;}
function selectedLane(){
  const p=state.plan||{},lanes=Array.isArray(p.lanes)?p.lanes:[];
  return pickTopLane(lanes,p?.selectedLaneId);
}
function selectedGame(){return state.plan?.game||selectedLane()?.game||{id:'none',name:'EDGE LIVE',url:DEFAULT_GAME_URL};}
function selectedKey(){return selectedLane()?.monitor?.key||null;}
function selectedDirectRow(){const k=selectedKey();return directFresh()&&k?state.directByKey[k]||null:null;}
function visiblePots(){return directFresh()&&state.directPots?state.directPots:(state.live?.current?.potsEUR||{});}
function selectedCurrentJackpot(){
  const d=selectedDirectRow();
  if(d&&Number.isFinite(Number(d.amountEUR)))return Number(d.amountEUR);
  const n=Number(selectedLane()?.current?.jackpotEUR);
  return Number.isFinite(n)?n:null;
}
function planReady(){const p=state.plan;if(!p||p.state!=='READY_TO_EXECUTE_MANUALLY'||p?.order?.action!=='PLAY')return false;const until=Date.parse(p?.order?.validUntil||'');return Number.isFinite(until)&&Date.now()<=until&&Number(p?.order?.stakePerSpinEUR)>0&&Number(p?.order?.maxSpins)>0;}
function planPrepare(){const p=state.plan;return p?.state==='PREPARE_OPEN_GAME_NO_BET'&&p?.order?.action==='OPEN_GAME_ONLY_NO_BET';}
function phase(){return planReady()?'GREEN':planPrepare()?'YELLOW':'RED';}
function whyText(){
  const blockers=Array.isArray(state.plan?.blockers)?state.plan.blockers:[];
  const ph=phase(),name=selectedGame()?.name||'el juego';
  if(ph==='GREEN')return `Todos los gates de ejecución de ${escapeHtml(name)} están vigentes. Confirma que sigue VERDE antes de la primera jugada y ejecuta exactamente el stake y máximo indicados.`;
  if(ph==='YELLOW')return `PREPÁRATE: abre ${escapeHtml(name)}, pero NO apuestes todavía. Espera la orden VERDE.`;
  if(!blockers.length)return 'No hay una orden ejecutable vigente. EDGE LIVE se mantiene cerrado por seguridad.';
  return blockers.map(b=>`• ${blockerLabel[b]||escapeHtml(b)}`).join('<br>');
}
function renderArtwork(){
  const game=selectedGame();
  const isFishin=String(game?.id||'').includes('fishin-frenzy-jackpot-king');
  if(!isFishin){
    $('gameArt').style.backgroundImage='none';$('gameBg').style.backgroundImage='none';$('gameArt').textContent='🎰';return;
  }
  const probed=state.assets?.decision?.officialPublicArtworkRecovered===true?state.assets?.decision?.preferredArtworkUrl:null;
  const graphql=state.metadata?.decision?.officialImageVariantRecovered===true?state.metadata?.decision?.preferredOfficialImageVariant:null;
  const url=graphql||probed;if(!url)return;
  $('gameArt').textContent='';$('gameArt').style.backgroundImage=`url("${url}")`;$('gameBg').style.backgroundImage=`url("${url}")`;
}
function renderMeters(lane){
  const isJpk=lane?.id==='botemania-jackpot-king';
  if(isJpk){
    const pots=visiblePots();
    $('potLabel1').textContent='JACKPOT KING';$('potValue1').textContent=eur(pots.JACKPOT_KING);
    $('potLabel2').textContent='REGAL';$('potValue2').textContent=eur(pots.REGAL);
    $('potLabel3').textContent='ROYAL';$('potValue3').textContent=eur(pots.ROYAL);
    return;
  }
  const current=selectedCurrentJackpot(),threshold=Number(lane?.economic?.breakEvenJackpotEUR);
  const thresholdKnown=Number.isFinite(threshold)&&threshold>0;
  const distance=Number.isFinite(current)&&thresholdKnown?threshold-current:null;
  $('potLabel1').textContent='JACKPOT ACTUAL';$('potValue1').textContent=eur(current);
  $('potLabel2').textContent='UMBRAL +EV';$('potValue2').textContent=thresholdKnown?eur(threshold):'PENDIENTE';
  $('potLabel3').textContent='DISTANCIA';$('potValue3').textContent=Number.isFinite(distance)?(distance<=0?'SUPERADO':eur(distance)):'—';
}
function render(){
  const p=state.plan||{},l=state.live||{},ph=phase(),ready=ph==='GREEN',prepare=ph==='YELLOW',lane=selectedLane(),game=selectedGame();
  const gameUrl=game?.url||DEFAULT_GAME_URL;
  $('gameCard').href=gameUrl;$('inspectGame').href=gameUrl;renderArtwork();renderMeters(lane);
  $('gameProvider').textContent=`BOTEMANIA · ${String(lane?.type||'EDGE').replaceAll('_',' ')}`;
  $('gameTitle').textContent=game?.name||'EDGE LIVE';
  $('gameSubtitle').textContent=lane?.id==='botemania-jackpot-king'?'JACKPOT KING':'MONITOR ESTRUCTURAL';
  $('gameDescription').textContent=lane?.monitor?'Contador público monitorizado en vivo':'Estado económico monitorizado automáticamente';
  $('orderCard').className='order'+(ready?' ready':prepare?' prepare':'');
  $('decision').textContent=ready?'JUGAR AHORA':prepare?'PREPÁRATE':'NO JUGAR';
  $('signalState').textContent=ready?'SEÑAL VÁLIDA':prepare?'ABRE EL JUEGO · NO APUESTES':'BLOQUEADO';
  $('stakePerSpin').textContent=ready?eur(p.order.stakePerSpinEUR):prepare?'ESPERA VERDE':'—';
  $('maxSpins').textContent=ready?String(p.order.maxSpins):'0';
  $('maxTotal').textContent=ready?eur(p.order.maxTotalStakeEUR):'0,00 €';
  $('entryWindow').textContent=ready?`AHORA · hasta ${time(p.order.validUntil)}`:prepare?'ENTRA EN BOTEMANIA AHORA':'NO JUGAR';
  const remaining=ready?Math.max(0,Math.ceil((Date.parse(p.order.validUntil)-Date.now())/1000)):null;
  $('expiry').textContent=ready?`${remaining}s`:prepare?'≤ 2 min acceso':'—';
  $('instruction').textContent=ready?`CONFIRMA VERDE. ${game.name}: apuesta ${eur(p.order.stakePerSpinEUR)} por jugada, máximo ${p.order.maxSpins}. Si pasa a rojo, PARA.`:prepare?`ABRE ${game.name} y déjalo listo. NO hagas ninguna jugada hasta recibir JUGAR AHORA.`:'NO JUGAR. No realices ninguna jugada.';
  const btn=$('playButton');btn.disabled=ph==='RED';btn.textContent=ready?'ABRIR JUEGO Y EJECUTAR':prepare?'ABRIR JUEGO · SOLO PREPARAR':'NO HAY SEÑAL PARA JUGAR';
  const struct=p?.evidence?.structurePass===true||p?.evidence?.identityVerified===true;$('structure').textContent=struct?'VALIDADA':'PENDIENTE';$('structure').className=struct?'ok':'warn';
  const econ=p?.evidence?.economicPass===true;$('economy').textContent=econ?'VALIDADA':'BLOQUEADA';$('economy').className=econ?'ok':'bad';
  const observedAt=lane?.current?.observedAt||l?.current?.observedAt||p?.coverage?.sourceObservedAt||null;
  const age=selectedDirectRow()?secAge(state.directAt):secAge(observedAt),freshLimit=Number(p?.order?.maxSignalAgeSeconds||180);
  $('freshness').textContent=age==null?'SIN DATO':`${age}s`;$('freshness').className=age!=null&&age<=freshLimit?'ok':age!=null&&age<=freshLimit*2?'warn':'bad';
  $('rtp').textContent=lane?.id==='botemania-jackpot-king'?pct(l?.current?.modelScreen?.bestConservativeRtp):'—';
  $('observed').textContent=time(selectedDirectRow()?state.directAt:observedAt);
  $('channel').textContent=directFresh()?`DIRECTO · ${state.directCanonicalRows} IDs válidos${state.directAmbiguousKeys?` · ${state.directAmbiguousKeys} ambiguos`:''}`:`EVIDENCIA · ${Number(p?.coverage?.liveFeedRows||0)} IDs`;
  $('why').innerHTML=whyText();$('liveDot').style.background=ready?'var(--green)':prepare?'var(--amber)':'var(--red)';
  renderRadar();
}
const mechanismLabel={
  MUST_BE_WON_BY_PROGRESSIVE_NETWORK:'Red progresiva Must-Be-Won-By',
  PROGRESSIVE_VIDEO_POKER:'Vídeo póker progresivo',
  PROGRESSIVE_SLOT_SCORE_RESEARCH:'Slot progresivo (investigación)',
  LEGACY_PROGRESSIVE_SLOT_SCORE_RESEARCH:'Slot progresivo legado (investigación)'
};
const statusBadgeClass=s=>s==='GREEN'?'ok':s==='YELLOW'?'warn':'bad';
function laneCardHtml(c){
  const blockersHtml=c.blockers.length?c.blockers.map(b=>`• ${blockerLabel[b]||escapeHtml(b)}`).join('<br>'):'Sin bloqueos registrados.';
  const distance=Number.isFinite(c.distanceToThresholdEUR)?(c.distanceToThresholdEUR<=0?'SUPERADO':eur(c.distanceToThresholdEUR)):'—';
  const link=c.gameUrl?`<a href="${c.gameUrl}" target="_blank" rel="noopener">Abrir juego real →</a>`:'Juego no identificado todavía';
  const age=c.observedAt?secAge(c.observedAt):null;
  return `<div class="laneCard">
    <div class="laneTop"><b>${escapeHtml(c.name)}</b><span class="badge ${statusBadgeClass(c.status)}">${c.status}</span></div>
    <div class="laneMeta">${escapeHtml(mechanismLabel[c.mechanism]||c.mechanism||'—')} · ${c.operator}</div>
    <div class="laneGrid">
      <div><small>CONTADOR</small><b>${eur(c.currentEUR)}</b></div>
      <div><small>ÚLTIMA OBS.</small><b>${c.observedAt?time(c.observedAt):'—'}</b></div>
      <div><small>EDAD DATO</small><b>${age!=null?`${age}s`:'—'}</b></div>
      <div><small>MOVIMIENTO</small><b>${c.movementDemonstrated==='SI'?'SÍ':c.movementDemonstrated==='NO'?'NO':'N/D'}</b></div>
      <div><small>ESTASIS</small><b>${c.stasisSeconds!=null?`${c.stasisSeconds}s`:'—'}</b></div>
      <div><small>IDENTIDAD</small><b>${c.identityVerified?'SÍ':'NO'}</b></div>
      <div><small>THRESHOLD</small><b>${c.thresholdKnown?'SÍ':'NO'}</b></div>
      <div><small>STAKE</small><b>${c.stakeKnown?'SÍ':'NO'}</b></div>
      <div><small>ESTRATEGIA</small><b>${c.strategyVerified?'SÍ':'NO'}</b></div>
      <div><small>DISTANCIA</small><b>${distance}</b></div>
    </div>
    ${c.killed?`<div class="killedBadge">☠️ DESCARTADO — ${escapeHtml(c.killedReason||'bloqueador no recuperable')}</div>`:c.investigation?'<div class="investBadge">INVESTIGACIÓN — todavía no ejecutable</div>':''}
    ${c.aliasOf?`<div class="laneMeta">Mismo pool que ${escapeHtml(c.aliasOf)} — no se cuenta como oportunidad independiente.</div>`:''}
    <div class="laneBlockers">${blockersHtml}</div>
    <div class="laneLink">${link}</div>
  </div>`;
}
function renderRadar(){
  const lanes=Array.isArray(state.plan?.lanes)?state.plan.lanes:[];
  const summary=radarSummary(lanes);
  $('radarSummary').textContent=`RADAR: ${summary.total} juegos monitorizados / GREEN: ${summary.green} / YELLOW: ${summary.yellow} / RED: ${summary.red}`;
  $('radarList').innerHTML=buildRadarCards(lanes).map(laneCardHtml).join('')||'<div class="laneCard">Sin lanes en el plan todavía.</div>';
  const unmapped=unmappedLiveRows(state.directByKey,lanes);
  $('radarUnmappedList').innerHTML=unmapped.length?unmapped.map(u=>`<div class="tickerRow"><span>${escapeHtml(u.key)}</span><b>${eur(u.amountEUR)}</b></div>`).join(''):'<div class="tickerRow"><span>Sin IDs sin mapear detectados ahora mismo.</span></div>';
}
async function refreshScientific(){
  const [plan,multi,params,assets,metadata,live,validation]=await Promise.all([maybeJson(SOURCES.plan),maybeJson(SOURCES.multi),maybeJson(SOURCES.params),maybeJson(SOURCES.assets),maybeJson(SOURCES.metadata),maybeJson(SOURCES.live),maybeJson(SOURCES.validation)]);
  state.plan=multi||plan;state.params=params;state.assets=assets;state.metadata=metadata;state.live=live;state.validation=validation;render();
}
async function directProbe(){
  try{
    const r=await fetch(BOT_GRAPHQL,{method:'POST',headers:{accept:'application/json','content-type':'application/json',venture:'botemania_es'},body:JSON.stringify({operationName:'loadJackpots',variables:{},query:BOT_QUERY}),cache:'no-store'});
    if(!r.ok)throw new Error(`HTTP ${r.status}`);
    const b=await r.json(),rows=[];
    const add=(network,items)=>{for(const x of Array.isArray(items)?items:[]){const id=String(x?.id??''),amountEUR=Number(x?.amount);if(id&&Number.isFinite(amountEUR))rows.push({network,id,amountEUR});}};
    add('generic',b?.data?.jackpots);add('redTiger',b?.data?.redTigerJackpots);add('blueprint',b?.data?.blueprintJackpots);
    const grouped=new Map();
    for(const x of rows){const k=`${x.network}:${x.id}`;if(!grouped.has(k))grouped.set(k,[]);grouped.get(k).push(x);}
    const directByKey={},ambiguous=[];
    for(const [key,group] of grouped){const amounts=[...new Set(group.map(x=>Number(x.amountEUR).toFixed(6)))];if(amounts.length===1)directByKey[key]=group[0];else ambiguous.push(key);}
    state.directByKey=directByKey;
    const key={JACKPOTKING:'JACKPOT_KING',JACKPOTKING_REGAL:'REGAL',JACKPOTKING_ROYAL:'ROYAL'},pots={};
    for(const x of rows.filter(x=>x.network==='blueprint')){const k=key[String(x.id)],n=Number(x.amountEUR);if(k&&Number.isFinite(n)&&n>0)pots[k]=n;}
    state.directPots=Object.keys(pots).length===3?pots:null;state.directAt=new Date().toISOString();state.directOk=rows.length>0;state.directRows=rows.length;state.directCanonicalRows=Object.keys(directByKey).length;state.directAmbiguousKeys=ambiguous.length;
    $('gameCard').classList.add('flash');setTimeout(()=>$('gameCard').classList.remove('flash'),520);render();
  }catch{state.directOk=false;render();}
}
$('playButton').addEventListener('click',()=>{if(phase()!=='RED')window.open(selectedGame()?.url||DEFAULT_GAME_URL,'_blank','noopener');});
setInterval(()=>{$('clock').textContent=clock();render();},1000);
setInterval(refreshScientific,5000);
setInterval(directProbe,3000);
$('clock').textContent=clock();refreshScientific();directProbe();

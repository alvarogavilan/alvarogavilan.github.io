const GAME_URL='https://www.botemania.es/juegos/slots-online/fishin-frenzy-jackpot-king';
const BOT_GRAPHQL='https://www.botemania.es/es/graphql';
const BOT_QUERY='query loadJackpots { blueprintJackpots { id amount } }';
const SOURCES={
  plan:'./evidence/edge-live-execution-plan-v1.json',
  params:'./evidence/botemania-fishin-execution-parameters-v1.json',
  assets:'./evidence/botemania-fishin-public-assets-probe-v1.json',
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
  EXACT_STAKE_PER_SPIN_NOT_VERIFIED:'Todavía no está verificada la APUESTA TOTAL exacta por giro de la configuración española.',
  SOURCE_NOT_FRESH:'El dato científico no está suficientemente fresco.',
  SIGNAL_EXPIRED:'La ventana de ejecución ya ha caducado.'
};
let state={plan:null,params:null,assets:null,live:null,validation:null,directPots:null,directAt:null,directOk:false};

async function json(url){const r=await fetch(`${url}?t=${Date.now()}`,{cache:'no-store'});if(!r.ok)throw new Error(`${r.status} ${url}`);return r.json();}
async function maybeJson(url){try{return await json(url);}catch{return null;}}
function directFresh(){const a=secAge(state.directAt);return state.directOk&&a!=null&&a<=10;}
function visiblePots(){return directFresh()?state.directPots:(state.live?.current?.potsEUR||{});}
function planReady(){
  const p=state.plan;if(!p||p.state!=='READY_TO_EXECUTE_MANUALLY'||p?.order?.action!=='PLAY')return false;
  const until=Date.parse(p?.order?.validUntil||'');
  return Number.isFinite(until)&&Date.now()<=until&&Number(p?.order?.stakePerSpinEUR)>0&&Number(p?.order?.maxSpins)>0;
}
function whyText(){
  const blockers=Array.isArray(state.plan?.blockers)?state.plan.blockers:[];
  if(planReady())return 'Todos los gates de ejecución están vigentes. Sigue exactamente la apuesta por giro, máximo de giros y caducidad indicados arriba.';
  if(!blockers.length)return 'No hay una orden ejecutable vigente. EDGE LIVE se mantiene cerrado por seguridad.';
  return blockers.map(b=>`• ${blockerLabel[b]||escapeHtml(b)}`).join('<br>');
}
function renderArtwork(){
  const url=state.assets?.decision?.officialPublicArtworkRecovered===true?state.assets?.decision?.preferredArtworkUrl:null;
  if(!url)return;
  $('gameArt').textContent='';$('gameArt').style.backgroundImage=`url("${url}")`;
  $('gameBg').style.backgroundImage=`url("${url}")`;
}
function render(){
  const p=state.plan||{},l=state.live||{},v=state.validation||{};
  const ready=planReady(),pots=visiblePots();
  $('potKing').textContent=eur(pots.JACKPOT_KING);$('potRegal').textContent=eur(pots.REGAL);$('potRoyal').textContent=eur(pots.ROYAL);
  $('gameCard').href=GAME_URL;$('inspectGame').href=GAME_URL;renderArtwork();
  $('orderCard').className='order'+(ready?' ready':'');
  $('decision').textContent=ready?'JUGAR AHORA':'NO JUGAR';$('signalState').textContent=ready?'SEÑAL VÁLIDA':'BLOQUEADO';
  $('stakePerSpin').textContent=ready?eur(p.order.stakePerSpinEUR):'—';$('maxSpins').textContent=ready?String(p.order.maxSpins):'0';$('maxTotal').textContent=ready?eur(p.order.maxTotalStakeEUR):'0,00 €';
  $('entryWindow').textContent=ready?`AHORA · hasta ${time(p.order.validUntil)}`:'NO JUGAR';
  const remaining=ready?Math.max(0,Math.ceil((Date.parse(p.order.validUntil)-Date.now())/1000)):null;$('expiry').textContent=ready?`${remaining}s`:'—';
  $('instruction').textContent=ready?`Abre el juego real. Apuesta ${eur(p.order.stakePerSpinEUR)} por giro, máximo ${p.order.maxSpins} giros, y termina antes de ${time(p.order.validUntil)}.`:'No hay una instrucción económica completa y vigente. No realices ninguna jugada.';
  const btn=$('playButton');btn.disabled=!ready;btn.textContent=ready?'ABRIR JUEGO Y EJECUTAR':'NO HAY SEÑAL PARA JUGAR';
  const struct=v?.outcome==='PASSED_NETWORK_ALLOCATION';$('structure').textContent=struct?'20/20 VALIDADO':'PENDIENTE';$('structure').className=struct?'ok':'warn';
  const econ=p?.evidence?.economicPass===true;$('economy').textContent=econ?'VALIDADA':'BLOQUEADA';$('economy').className=econ?'ok':'bad';
  const age=secAge(l?.current?.observedAt);$('freshness').textContent=age==null?'SIN DATO':`${age}s`;$('freshness').className=age!=null&&age<=90?'ok':age!=null&&age<=360?'warn':'bad';
  $('rtp').textContent=pct(l?.current?.modelScreen?.bestConservativeRtp);$('observed').textContent=time(l?.current?.observedAt);$('channel').textContent=directFresh()?'DIRECTO':'EVIDENCIA';$('why').innerHTML=whyText();$('liveDot').style.background=ready?'var(--green)':(age!=null&&age<=90?'var(--amber)':'var(--red)');
}

async function refreshScientific(){
  const [plan,params,assets,live,validation]=await Promise.all([maybeJson(SOURCES.plan),maybeJson(SOURCES.params),maybeJson(SOURCES.assets),maybeJson(SOURCES.live),maybeJson(SOURCES.validation)]);
  state.plan=plan;state.params=params;state.assets=assets;state.live=live;state.validation=validation;render();
}
async function directProbe(){
  try{
    const r=await fetch(BOT_GRAPHQL,{method:'POST',headers:{accept:'application/json','content-type':'application/json',venture:'botemania_es'},body:JSON.stringify({operationName:'loadJackpots',variables:{},query:BOT_QUERY}),cache:'no-store'});
    if(!r.ok)throw new Error(`HTTP ${r.status}`);
    const b=await r.json(),rows=Array.isArray(b?.data?.blueprintJackpots)?b.data.blueprintJackpots:[];
    const key={JACKPOTKING:'JACKPOT_KING',JACKPOTKING_REGAL:'REGAL',JACKPOTKING_ROYAL:'ROYAL'},pots={};
    for(const x of rows){const k=key[String(x?.id||'')],n=Number(x?.amount);if(k&&Number.isFinite(n)&&n>0)pots[k]=n;}
    if(Object.keys(pots).length!==3)throw new Error('Incomplete counters');
    state.directPots=pots;state.directAt=new Date().toISOString();state.directOk=true;$('gameCard').classList.add('flash');setTimeout(()=>$('gameCard').classList.remove('flash'),520);render();
  }catch{state.directOk=false;render();}
}
$('playButton').addEventListener('click',()=>{if(planReady())window.open(GAME_URL,'_blank','noopener');});
setInterval(()=>{$('clock').textContent=clock();render();},1000);setInterval(refreshScientific,5000);setInterval(directProbe,3000);
$('clock').textContent=clock();refreshScientific();directProbe();

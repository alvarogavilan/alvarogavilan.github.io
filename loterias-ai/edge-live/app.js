const DEFAULT_GAME_URL='https://www.botemania.es/juegos/slots-online/fishin-frenzy-jackpot-king';
const DEFAULT_GAME_NAME="Fishin' Frenzy: Jackpot King";
const BOT_GRAPHQL='https://www.botemania.es/es/graphql';
const BOT_QUERY='query loadJackpots { blueprintJackpots { id amount } }';
const SOURCES={
  plan:'./evidence/edge-live-execution-plan-v1.json',
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
const blockerLabel={STRUCTURAL_VALIDATION_NOT_PASSED:'La estructura prospectiva todavía no está validada.',ECONOMIC_GATE_NOT_PASSED:'El estado económico actual no demuestra expectativa no negativa.',EXACT_STAKE_PER_SPIN_NOT_VERIFIED:'Todavía no está verificada la APUESTA TOTAL exacta por giro de la configuración española.',SOURCE_NOT_FRESH:'El dato científico no está suficientemente fresco.',SIGNAL_EXPIRED:'La ventana de ejecución ya ha caducado.'};
let state={plan:null,params:null,assets:null,metadata:null,live:null,validation:null,directPots:null,directAt:null,directOk:false};
const currentGame=()=>({
  id:state.plan?.game?.id||'fishin-frenzy-jackpot-king',
  name:state.plan?.game?.name||DEFAULT_GAME_NAME,
  url:state.plan?.game?.url||DEFAULT_GAME_URL
});
async function json(url){const r=await fetch(`${url}?t=${Date.now()}`,{cache:'no-store'});if(!r.ok)throw new Error(`${r.status} ${url}`);return r.json();}
async function maybeJson(url){try{return await json(url);}catch{return null;}}
function directFresh(){const a=secAge(state.directAt);return state.directOk&&a!=null&&a<=10;}
function visiblePots(){return directFresh()?state.directPots:(state.live?.current?.potsEUR||{});}
function planReady(){const p=state.plan;if(!p||p.state!=='READY_TO_EXECUTE_MANUALLY'||p?.order?.action!=='PLAY')return false;const until=Date.parse(p?.order?.validUntil||'');return Number.isFinite(until)&&Date.now()<=until&&Number(p?.order?.stakePerSpinEUR)>0&&Number(p?.order?.maxSpins)>0;}
function planPrepare(){const p=state.plan;return p?.state==='PREPARE_OPEN_GAME_NO_BET'&&p?.order?.action==='OPEN_GAME_ONLY_NO_BET';}
function phase(){return planReady()?'GREEN':planPrepare()?'YELLOW':'RED';}
function whyText(){const blockers=Array.isArray(state.plan?.blockers)?state.plan.blockers:[];const ph=phase(),g=currentGame();if(ph==='GREEN')return `Todos los gates de ejecución están vigentes para ${escapeHtml(g.name)}. Confirma que sigue VERDE antes de la primera apuesta y ejecuta exactamente el importe y máximo indicados.`;if(ph==='YELLOW')return `PREPÁRATE: abre Botemania y entra en ${escapeHtml(g.name)}, pero NO apuestes todavía. Espera la orden VERDE.`;if(!blockers.length)return 'No hay una orden ejecutable vigente. EDGE LIVE se mantiene cerrado por seguridad.';return blockers.map(b=>`• ${blockerLabel[b]||escapeHtml(b)}`).join('<br>');}
function renderArtwork(){const g=currentGame();if(g.id!=='fishin-frenzy-jackpot-king')return;const probed=state.assets?.decision?.officialPublicArtworkRecovered===true?state.assets?.decision?.preferredArtworkUrl:null;const graphql=state.metadata?.decision?.officialImageVariantRecovered===true?state.metadata?.decision?.preferredOfficialImageVariant:null;const url=graphql||probed;if(!url)return;$('gameArt').textContent='';$('gameArt').style.backgroundImage=`url("${url}")`;$('gameBg').style.backgroundImage=`url("${url}")`;}
function render(){
  const p=state.plan||{},l=state.live||{},v=state.validation||{},ph=phase(),ready=ph==='GREEN',prepare=ph==='YELLOW',pots=visiblePots(),g=currentGame();
  $('potKing').textContent=eur(pots.JACKPOT_KING);$('potRegal').textContent=eur(pots.REGAL);$('potRoyal').textContent=eur(pots.ROYAL);$('gameCard').href=g.url;$('inspectGame').href=g.url;renderArtwork();
  $('orderCard').className='order'+(ready?' ready':prepare?' prepare':'');
  $('decision').textContent=ready?'JUGAR AHORA':prepare?'PREPÁRATE':'NO JUGAR';
  $('signalState').textContent=ready?'SEÑAL VÁLIDA':prepare?'ABRE EL JUEGO · NO APUESTES':'BLOQUEADO';
  $('stakePerSpin').textContent=ready?eur(p.order.stakePerSpinEUR):prepare?'ESPERA VERDE':'—';
  $('maxSpins').textContent=ready?String(p.order.maxSpins):'0';
  $('maxTotal').textContent=ready?eur(p.order.maxTotalStakeEUR):'0,00 €';
  $('entryWindow').textContent=ready?`AHORA · hasta ${time(p.order.validUntil)}`:prepare?'ENTRA EN BOTEMANIA AHORA':'NO JUGAR';
  const remaining=ready?Math.max(0,Math.ceil((Date.parse(p.order.validUntil)-Date.now())/1000)):null;
  $('expiry').textContent=ready?`${remaining}s`:prepare?'≤ 2 min acceso':'—';
  $('instruction').textContent=ready?`CONFIRMA VERDE. ${g.name}: apuesta ${eur(p.order.stakePerSpinEUR)} por giro, máximo ${p.order.maxSpins} giros. Si pasa a rojo, PARA.`:prepare?`ABRE BOTEMANIA, entra en ${g.name} y déjalo listo. NO hagas ninguna apuesta hasta recibir JUGAR AHORA.`:'NO JUGAR. No realices ninguna apuesta.';
  const btn=$('playButton');btn.disabled=ph==='RED';btn.textContent=ready?'ABRIR JUEGO Y EJECUTAR':prepare?'ABRIR JUEGO · SOLO PREPARAR':'NO HAY SEÑAL PARA JUGAR';
  const struct=v?.outcome==='PASSED_NETWORK_ALLOCATION';$('structure').textContent=struct?'20/20 VALIDADO':'PENDIENTE';$('structure').className=struct?'ok':'warn';const econ=p?.evidence?.economicPass===true;$('economy').textContent=econ?'VALIDADA':'BLOQUEADA';$('economy').className=econ?'ok':'bad';
  const age=secAge(l?.current?.observedAt),freshLimit=Number(p?.order?.maxSignalAgeSeconds||180);$('freshness').textContent=age==null?'SIN DATO':`${age}s`;$('freshness').className=age!=null&&age<=freshLimit?'ok':age!=null&&age<=freshLimit*2?'warn':'bad';$('rtp').textContent=pct(l?.current?.modelScreen?.bestConservativeRtp);$('observed').textContent=time(l?.current?.observedAt);$('channel').textContent=directFresh()?'DIRECTO':'EVIDENCIA';$('why').innerHTML=whyText();$('liveDot').style.background=ready?'var(--green)':prepare?'var(--amber)':'var(--red)';
}
async function refreshScientific(){const [plan,params,assets,metadata,live,validation]=await Promise.all([maybeJson(SOURCES.plan),maybeJson(SOURCES.params),maybeJson(SOURCES.assets),maybeJson(SOURCES.metadata),maybeJson(SOURCES.live),maybeJson(SOURCES.validation)]);state.plan=plan;state.params=params;state.assets=assets;state.metadata=metadata;state.live=live;state.validation=validation;render();}
async function directProbe(){try{const r=await fetch(BOT_GRAPHQL,{method:'POST',headers:{accept:'application/json','content-type':'application/json',venture:'botemania_es'},body:JSON.stringify({operationName:'loadJackpots',variables:{},query:BOT_QUERY}),cache:'no-store'});if(!r.ok)throw new Error(`HTTP ${r.status}`);const b=await r.json(),rows=Array.isArray(b?.data?.blueprintJackpots)?b.data.blueprintJackpots:[];const key={JACKPOTKING:'JACKPOT_KING',JACKPOTKING_REGAL:'REGAL',JACKPOTKING_ROYAL:'ROYAL'},pots={};for(const x of rows){const k=key[String(x?.id||'')],n=Number(x?.amount);if(k&&Number.isFinite(n)&&n>0)pots[k]=n;}if(Object.keys(pots).length!==3)throw new Error('Incomplete counters');state.directPots=pots;state.directAt=new Date().toISOString();state.directOk=true;$('gameCard').classList.add('flash');setTimeout(()=>$('gameCard').classList.remove('flash'),520);render();}catch{state.directOk=false;render();}}
$('playButton').addEventListener('click',()=>{if(phase()!=='RED')window.open(currentGame().url,'_blank','noopener');});setInterval(()=>{$('clock').textContent=clock();render();},1000);setInterval(refreshScientific,5000);setInterval(directProbe,3000);$('clock').textContent=clock();refreshScientific();directProbe();

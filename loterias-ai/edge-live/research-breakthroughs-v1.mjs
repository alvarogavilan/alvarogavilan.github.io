const SOURCE_V2='./evidence/spain-direct-persistent-state-v2.json';
const SOURCE_V1='./evidence/spain-igt-persistent-state-candidates-v1.json';

const esc=(x)=>String(x??'').replace(/[&<>"']/g,(c)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const eur=(x)=>Number.isFinite(Number(x))?Number(x).toLocaleString('es-ES',{style:'currency',currency:'EUR',minimumFractionDigits:2,maximumFractionDigits:2}):'—';
const pct=(x)=>Number.isFinite(Number(x))?`${Number(x).toFixed(2)}%`:'—';

function fromV2(data){
  if(!data||data.realMoneyAllowed!==false||!Array.isArray(data.priority))return [];
  return data.priority.map((c)=>{
    if(c.id==='magic-of-the-nile-9602-spain')return {
      id:c.id,game:c.game,operator:'BETFAIR + MONOPOLY + BOTEMANIA',url:c.spainEvidence?.betfair?.url||'',priority:`#${c.rank} · P0`,
      rtpPct:c.spainEvidence?.betfair?.rtpPct??null,minBetEUR:null,maxBetEUR:null,
      mechanism:'IGT Pure Recharge · estado variable con ventaja documentada',
      status:'P0 · CONFIG 96,02%',action:'NO_PLAY',
      evidenceHeadline:'CONFIGURACIÓN 96,02% EN VARIOS OPERADORES ESPAÑOLES + REGLAS IGT 96,02% QUE GUARDAN GEMAS POR APUESTA ENTRE SESIONES.',
      crossPlayerText:c.physicalCrossPlayerEvidence?.meterSavedAfterCashOut===true?'FÍSICO IGT: SÍ':'NO',
      preWagerText:c.physicalCrossPlayerEvidence?.playersCanShopBetLevelMeters===true?'FÍSICO IGT: SÍ':'NO',
      guard:'España online: falta demostrar que el estado pasa de un usuario a otro; alternativa: localizar una instalación física española exacta.',
      signalMetric:'96,02% ESPAÑA',signalMetricLabel:'RTP CONFIG.'
    };
    if(c.id==='supajax-spain-network-identity')return {
      id:c.id,game:c.game,operator:'PISTA LUCKIA ESPAÑA · MICROGAMING',url:'',priority:`#${c.rank} · P0`,
      rtpPct:null,minBetEUR:null,maxBetEUR:null,
      mechanism:'Vídeo póker progresivo · break-even matemático conocido',
      status:'P0 · RED POR CERRAR',action:'NO_PLAY',
      evidenceHeadline:`TRACKER MUNDIAL: ${pct(c.globalProgressiveEvidence?.estimatedCurrentRtpPct)} RTP ESTIMADO · BOTE ${Number(c.globalProgressiveEvidence?.observedCurrentValue||0).toLocaleString('es-ES')} · BREAK-EVEN ${Number(c.globalProgressiveEvidence?.breakEven||0).toLocaleString('es-ES')}.`,
      crossPlayerText:c.globalProgressiveEvidence?.networkIdentityWithSpainVerified===true?'VERIFICADA':'RED ESPAÑA PENDIENTE',
      preWagerText:c.globalProgressiveEvidence?.freshOperatorCounterVerified===true?'VERIFICADO':'CONTADOR LUCKIA PENDIENTE',
      guard:'La presencia en Luckia procede todavía de una fuente secundaria. No se transfiere el 120,2% mundial a España hasta probar juego, red, moneda, contador y apuesta máxima exactos.',
      signalMetric:pct(c.globalProgressiveEvidence?.estimatedCurrentRtpPct),signalMetricLabel:'RTP GLOBAL REF.'
    };
    if(c.id==='viking-queen-spain-direct-persistence')return {
      id:c.id,game:c.game,operator:'BOTEMANIA + CASINO777',url:c.spainEvidence?.botemania?.url||'',priority:`#${c.rank} · P0`,
      rtpPct:c.spainEvidence?.botemania?.rtpPct??null,minBetEUR:c.spainEvidence?.casino777?.minimumBetEUR??null,maxBetEUR:c.spainEvidence?.casino777?.maximumBetEUR??null,
      mechanism:'Progreso multiplicador guardado por apuesta · prueba española directa',
      status:'P0 · PERSISTENCIA PROBADA',action:'NO_PLAY',
      evidenceHeadline:'DOS OPERADORES ESPAÑOLES DECLARAN DIRECTAMENTE QUE EL PROGRESO DEL MAPA SE GUARDA POR APUESTA.',
      crossPlayerText:'NO PROBADO',preWagerText:'ESTADO VISIBLE; HERENCIA NO PROBADA',
      guard:'No se ha demostrado +EV. El x10 puede ser estado absorbente y el RTP 96,92% de largo plazo puede converger a ese régimen.',
      signalMetric:pct(c.spainEvidence?.botemania?.rtpPct),signalMetricLabel:'RTP ESPAÑA'
    };
    return null;
  }).filter(Boolean);
}

function fromV1(data){
  if(!data||data.realMoneyAllowed!==false||!Array.isArray(data.candidates))return [];
  return data.candidates.map((c)=>{
    const s=c?.spainStateSemantics||{};
    const crossPlayer=s.persistentAcrossPlayersVerified===true;
    const preWager=s.abandonedStateVisibleBeforeWagerVerified===true;
    return {
      id:String(c?.id||''),game:String(c?.game||'Juego sin nombre'),operator:String(data?.operator?.name||'Operador español'),url:String(c?.currentSpainOperatorPage||''),priority:String(c?.decision?.researchPriority||'RESEARCH'),
      minBetEUR:Number.isFinite(Number(c?.currentSpainEconomics?.minimumBetEUR))?Number(c.currentSpainEconomics.minimumBetEUR):null,maxBetEUR:Number.isFinite(Number(c?.currentSpainEconomics?.maximumBetEUR))?Number(c.currentSpainEconomics.maximumBetEUR):null,rtpPct:Number.isFinite(Number(c?.currentSpainEconomics?.theoreticalRtpPct))?Number(c.currentSpainEconomics.theoreticalRtpPct):null,
      mechanism:c?.persistentMechanismEvidence?.primaryIgtPersistentStateConfirmed===true?'IGT: persistent state confirmado':c?.persistentMechanismEvidence?.onlineRulesFact?'Persistencia online documentada en la familia IGT':'Estado variable/persistente documentado',
      status:'P0 · INVESTIGACIÓN',action:'NO_PLAY',evidenceHeadline:'TÍTULO ESPAÑOL ACTUAL DE UNA FAMILIA MUNDIAL DOCUMENTADA DE ADVANTAGE PLAY POR ESTADO PERSISTENTE.',
      crossPlayerText:crossPlayer?'VERIFICADO':'POR CERRAR',preWagerText:preWager?'VERIFICADO':'POR CERRAR',guard:'Falta demostrar que el estado favorable de esta versión española puede quedar abandonado y visible para otro jugador.',
      signalMetric:pct(c?.currentSpainEconomics?.theoreticalRtpPct),signalMetricLabel:'RTP ESPAÑA'
    };
  });
}

export function buildBreakthroughCards(data){return Array.isArray(data?.priority)?fromV2(data):fromV1(data);}

export function cardHtml(c){
  const link=c.url?`<a href="${esc(c.url)}" target="_blank" rel="noopener">Abrir ficha oficial →</a>`:'Fuente primaria española pendiente';
  return `<article class="breakCard">
    <div class="breakTop"><div><div class="breakProvider">${esc(c.operator)} · ESPAÑA</div><div class="breakTitle">${esc(c.game)}</div></div><span class="breakBadge">${esc(c.status)}</span></div>
    <div class="breakMechanism">⚡ ${esc(c.mechanism)}</div>
    <div class="breakGrid">
      <div><small>${esc(c.signalMetricLabel||'RTP')}</small><b>${esc(c.signalMetric||'—')}</b></div>
      <div><small>APUESTA MÍN.</small><b>${eur(c.minBetEUR)}</b></div>
      <div><small>ESTADO / RED</small><b>${esc(c.crossPlayerText||'POR CERRAR')}</b></div>
      <div><small>OBSERVABLE</small><b>${esc(c.preWagerText||'POR CERRAR')}</b></div>
    </div>
    <div class="breakGood">${esc(c.evidenceHeadline)}</div>
    <div class="breakGuard">🔴 NO ES SEÑAL DE APUESTA · ${esc(c.guard)}</div>
    <div class="breakLink">${link}</div>
  </article>`;
}

export function renderBreakthroughs(data,{root=document.getElementById('breakthroughList'),summary=document.getElementById('breakthroughSummary')}={}){
  const cards=buildBreakthroughCards(data);
  if(summary)summary.textContent=cards.length?`${cards.length} HALLAZGOS P0 · ORDENADOS POR DISTANCIA A PRUEBA EJECUTABLE · 0 € HASTA GREEN`:'Sin hallazgos P0 cargados';
  if(root)root.innerHTML=cards.length?cards.map(cardHtml).join(''):'<div class="breakEmpty">Sin nuevos hallazgos cargados.</div>';
  return cards;
}

async function fetchJson(source){const r=await fetch(`${source}?t=${Date.now()}`,{cache:'no-store'});if(!r.ok)throw new Error(`HTTP ${r.status}`);return r.json();}
async function load(){
  try{renderBreakthroughs(await fetchJson(SOURCE_V2));}
  catch{try{renderBreakthroughs(await fetchJson(SOURCE_V1));}catch{renderBreakthroughs(null);}}
}
if(typeof document!=='undefined')load();

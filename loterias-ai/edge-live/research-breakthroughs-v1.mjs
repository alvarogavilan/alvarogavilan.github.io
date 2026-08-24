const SOURCE='./evidence/spain-igt-persistent-state-candidates-v1.json';

const esc=(x)=>String(x??'').replace(/[&<>"']/g,(c)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const eur=(x)=>Number.isFinite(Number(x))?Number(x).toLocaleString('es-ES',{style:'currency',currency:'EUR',minimumFractionDigits:2,maximumFractionDigits:2}):'—';
const pct=(x)=>Number.isFinite(Number(x))?`${Number(x).toFixed(2)}%`:'—';

export function buildBreakthroughCards(data){
  if(!data||data.realMoneyAllowed!==false||!Array.isArray(data.candidates))return [];
  return data.candidates.map((c)=>{
    const s=c?.spainStateSemantics||{};
    const crossPlayer=s.persistentAcrossPlayersVerified===true;
    const preWager=s.abandonedStateVisibleBeforeWagerVerified===true;
    const exactConfig=(c?.identityEvidence?.exactIgtIdentityVerifiedOnEnRachaPage===true)||(c?.identityEvidence?.currentEnRachaExactTitleVerified===true&&c?.identityEvidence?.identityConfidence==='EXACT_CONFIGURATION_VERIFIED');
    return {
      id:String(c?.id||''),
      game:String(c?.game||'Juego sin nombre'),
      operator:String(data?.operator?.name||'Operador español'),
      url:String(c?.currentSpainOperatorPage||''),
      priority:String(c?.decision?.researchPriority||'RESEARCH'),
      minBetEUR:Number.isFinite(Number(c?.currentSpainEconomics?.minimumBetEUR))?Number(c.currentSpainEconomics.minimumBetEUR):null,
      maxBetEUR:Number.isFinite(Number(c?.currentSpainEconomics?.maximumBetEUR))?Number(c.currentSpainEconomics.maximumBetEUR):null,
      rtpPct:Number.isFinite(Number(c?.currentSpainEconomics?.theoreticalRtpPct))?Number(c.currentSpainEconomics.theoreticalRtpPct):null,
      mechanism:c?.persistentMechanismEvidence?.primaryIgtPersistentStateConfirmed===true?'IGT: persistent state confirmado':c?.persistentMechanismEvidence?.onlineRulesFact?'Persistencia online documentada en la familia IGT':'Estado variable/persistente documentado',
      crossPlayerVerified:crossPlayer,
      preWagerVisibleVerified:preWager,
      exactConfigVerified:exactConfig,
      status:'P0 · INVESTIGACIÓN',
      action:'NO_PLAY',
      decisiveBlocker:crossPlayer&&preWager?'OTROS_GATES_PENDIENTES':'FALTA_CONFIRMAR_ESTADO_COMPARTIDO_Y_VISIBLE_ANTES_DE_APOSTAR'
    };
  });
}

export function cardHtml(c){
  const link=c.url?`<a href="${esc(c.url)}" target="_blank" rel="noopener">Abrir ficha oficial →</a>`:'Ficha oficial no disponible';
  return `<article class="breakCard">
    <div class="breakTop"><div><div class="breakProvider">${esc(c.operator)} · ESPAÑA</div><div class="breakTitle">${esc(c.game)}</div></div><span class="breakBadge">${esc(c.status)}</span></div>
    <div class="breakMechanism">⚡ ${esc(c.mechanism)}</div>
    <div class="breakGrid">
      <div><small>RTP PUBLICADO</small><b>${pct(c.rtpPct)}</b></div>
      <div><small>APUESTA MÍN.</small><b>${eur(c.minBetEUR)}</b></div>
      <div><small>ESTADO ENTRE JUGADORES</small><b>${c.crossPlayerVerified?'VERIFICADO':'POR CERRAR'}</b></div>
      <div><small>VISIBLE ANTES DE APOSTAR</small><b>${c.preWagerVisibleVerified?'VERIFICADO':'POR CERRAR'}</b></div>
    </div>
    <div class="breakGood">HALLAZGO REAL: título español actual de una familia mundial documentada de advantage play por estado persistente.</div>
    <div class="breakGuard">🔴 NO ES SEÑAL DE APUESTA · Falta demostrar que el estado favorable de esta versión española puede quedar abandonado y visible para otro jugador.</div>
    <div class="breakLink">${link}</div>
  </article>`;
}

export function renderBreakthroughs(data,{root=document.getElementById('breakthroughList'),summary=document.getElementById('breakthroughSummary')}={}){
  const cards=buildBreakthroughCards(data);
  if(summary)summary.textContent=cards.length?`${cards.length} HALLAZGOS P0 EN ESPAÑA · 0 € HASTA CERRAR ESTADO COMPARTIDO`:'Sin hallazgos P0 cargados';
  if(root)root.innerHTML=cards.length?cards.map(cardHtml).join(''):'<div class="breakEmpty">Sin nuevos hallazgos cargados.</div>';
  return cards;
}

async function load(){
  try{
    const r=await fetch(`${SOURCE}?t=${Date.now()}`,{cache:'no-store'});
    if(!r.ok)throw new Error(`HTTP ${r.status}`);
    renderBreakthroughs(await r.json());
  }catch{
    renderBreakthroughs(null);
  }
}

if(typeof document!=='undefined')load();

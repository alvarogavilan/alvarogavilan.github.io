const SOURCES=[
  './evidence/spain-igt-persistent-state-candidates-v1.json',
  './evidence/spain-igt-physical-variable-state-v1.json'
];

const esc=(x)=>String(x??'').replace(/[&<>"']/g,(c)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]));
const eur=(x)=>Number.isFinite(Number(x))?Number(x).toLocaleString('es-ES',{style:'currency',currency:'EUR',minimumFractionDigits:2,maximumFractionDigits:2}):'—';
const pct=(x)=>Number.isFinite(Number(x))?`${Number(x).toFixed(2)}%`:'—';

function buildOnlineCards(data){
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
      status:'P0 · ONLINE ESPAÑA',
      action:'NO_PLAY',
      sourceType:'ONLINE',
      strongFinding:'Título español actual de una familia mundial documentada de advantage play por estado persistente.',
      guardText:'Falta demostrar que el estado favorable de esta versión española puede quedar abandonado y visible para otro jugador.',
      decisiveBlocker:crossPlayer&&preWager?'OTROS_GATES_PENDIENTES':'FALTA_CONFIRMAR_ESTADO_COMPARTIDO_Y_VISIBLE_ANTES_DE_APOSTAR'
    };
  });
}

function buildPhysicalCards(data){
  if(!data||data.realMoneyAllowed!==false||!data.venue||!Array.isArray(data.candidates))return [];
  return data.candidates.map((c)=>{
    const scarab=c?.id==='casino-la-toja-scarab-igt';
    const local=c?.localFingerprintGates||{};
    const exactVenueTitle=scarab?c?.venueTitleExactMatch===true:c?.venueTitleExactMatchToCanonical===true;
    const globalInheritedState=scarab?c?.globalMechanismComparator?.verifiedFacts?.previousPlayerCanLeaveWildState===true:c?.globalMechanismComparator?.verifiedFacts?.bubbleStateCanBeAbandonedByPreviousPlayer===true;
    const localInheritedState=scarab?local.abandonedBordersVisibleAfterPlayerChangeVerified===true:local.bubblePersistenceVisibleAcrossPlayerChangeVerified===true;
    const preWager=scarab?local.cycleProgressVisibleBeforeWagerVerified===true:local.bubblePersistenceVisibleAcrossPlayerChangeVerified===true;
    return {
      id:String(c?.id||''),
      game:String(c?.game||'Juego sin nombre'),
      operator:String(data?.venue?.name||'Casino físico español'),
      url:String(data?.venue?.officialSlotsPage||''),
      priority:String(c?.decision?.researchPriority||'RESEARCH'),
      minBetEUR:null,
      maxBetEUR:null,
      rtpPct:null,
      mechanism:scarab?'Scarab · estado visible en ciclo de 10 tiradas':'Ocean Magic · burbujas persistentes visibles',
      crossPlayerVerified:localInheritedState,
      preWagerVisibleVerified:preWager,
      exactConfigVerified:exactVenueTitle&&local.exactPaytableMatchesComparator===true,
      globalInheritedStateDocumented:globalInheritedState,
      status:'P0 · FÍSICO ESPAÑA',
      action:'NO_PLAY',
      sourceType:'PHYSICAL',
      strongFinding:scarab?'Instalación física española actual del título exacto Scarab; el mecanismo global documenta estado dejado por el jugador anterior y regla de entrada por estado.':'Instalación física española actual de Ocean’s Magic en familia IGT Crystal; el comparador Ocean Magic documenta ventaja en estados de burbujas favorables.',
      guardText:scarab?'Falta confirmar sin apostar que la configuración local conserva 75 líneas, ciclo 10/10, marcos dorados, paytable y estado abandonado antes de transferir la regla de entrada.':'Falta resolver el nombre canónico y fingerprint local completo antes de transferir cualquier estrategia Ocean Magic.',
      decisiveBlocker:'FALTA_FINGERPRINT_LOCAL_SIN_APOSTAR'
    };
  });
}

export function buildBreakthroughCards(data){
  return data?.venue?buildPhysicalCards(data):buildOnlineCards(data);
}

export function buildCombinedBreakthroughCards(datasets){
  return (Array.isArray(datasets)?datasets:[]).flatMap(buildBreakthroughCards);
}

export function cardHtml(c){
  const link=c.url?`<a href="${esc(c.url)}" target="_blank" rel="noopener">Abrir ficha oficial →</a>`:'Ficha oficial no disponible';
  const sourceLabel=c.sourceType==='PHYSICAL'?'CASINO FÍSICO · ESPAÑA':'ONLINE · ESPAÑA';
  const inheritedLabel=c.sourceType==='PHYSICAL'&&c.globalInheritedStateDocumented?'GLOBAL: SÍ · LOCAL: POR CERRAR':c.crossPlayerVerified?'VERIFICADO':'POR CERRAR';
  return `<article class="breakCard">
    <div class="breakTop"><div><div class="breakProvider">${esc(c.operator)} · ${sourceLabel}</div><div class="breakTitle">${esc(c.game)}</div></div><span class="breakBadge">${esc(c.status)}</span></div>
    <div class="breakMechanism">⚡ ${esc(c.mechanism)}</div>
    <div class="breakGrid">
      <div><small>RTP PUBLICADO</small><b>${pct(c.rtpPct)}</b></div>
      <div><small>APUESTA MÍN.</small><b>${eur(c.minBetEUR)}</b></div>
      <div><small>ESTADO ENTRE JUGADORES</small><b>${inheritedLabel}</b></div>
      <div><small>VISIBLE ANTES DE APOSTAR</small><b>${c.preWagerVisibleVerified?'VERIFICADO':'POR CERRAR'}</b></div>
    </div>
    <div class="breakGood">HALLAZGO REAL: ${esc(c.strongFinding||'candidato P0 español de estado persistente.')}</div>
    <div class="breakGuard">🔴 NO ES SEÑAL DE APUESTA · ${esc(c.guardText||'Faltan gates locales antes de cualquier ejecución.')}</div>
    <div class="breakLink">${link}</div>
  </article>`;
}

export function renderBreakthroughs(data,{root=document.getElementById('breakthroughList'),summary=document.getElementById('breakthroughSummary')}={}){
  const cards=Array.isArray(data)?buildCombinedBreakthroughCards(data):buildBreakthroughCards(data);
  if(summary){
    const physical=cards.filter(c=>c.sourceType==='PHYSICAL').length;
    summary.textContent=cards.length?`${cards.length} HALLAZGOS P0 EN ESPAÑA · ${physical} FÍSICOS · 0 € HASTA CERRAR FINGERPRINT LOCAL`:'Sin hallazgos P0 cargados';
  }
  if(root)root.innerHTML=cards.length?cards.map(cardHtml).join(''):'<div class="breakEmpty">Sin nuevos hallazgos cargados.</div>';
  return cards;
}

async function load(){
  try{
    const datasets=(await Promise.all(SOURCES.map(async(source)=>{
      try{
        const r=await fetch(`${source}?t=${Date.now()}`,{cache:'no-store'});
        if(!r.ok)return null;
        return await r.json();
      }catch{return null;}
    }))).filter(Boolean);
    renderBreakthroughs(datasets);
  }catch{
    renderBreakthroughs(null);
  }
}

if(typeof document!=='undefined')load();

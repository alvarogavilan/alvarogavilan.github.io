const SOURCES=[
  './evidence/spain-igt-persistent-state-candidates-v1.json',
  './evidence/aotgn-spain-live-deployment-targets-v1.json',
  './evidence/betfair-spain-sporting-legends-ap-mccoy-p0-v1.json'
];

export const ONLINE_ONLY=true;
export const NON_PROMO_ONLY=true;

const esc=(x)=>String(x??'').replace(/[&<>"']/g,(c)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const hasNumber=(x)=>x!==null&&x!==''&&Number.isFinite(Number(x));
const eur=(x)=>hasNumber(x)?Number(x).toLocaleString('es-ES',{style:'currency',currency:'EUR',minimumFractionDigits:2,maximumFractionDigits:2}):'—';
const pct=(x)=>hasNumber(x)?`${Number(x).toFixed(2)}%`:'—';
const upper=(x)=>String(x??'').trim().toUpperCase();

const isExplicitPromo=(x)=>{
  if(!x||typeof x!=='object')return false;
  if(x.promotion===true||x.promotional===true||x.isPromotion===true||x.bonus===true||x.isBonus===true)return true;
  const labels=[x.sourceType,x.type,x.category,x.kind,x.classification].map(upper).filter(Boolean);
  return labels.some((v)=>v.includes('PROMO')||v.includes('BONUS')||v.includes('CASHBACK')||v.includes('FREE_SPIN'));
};

const isOnlineDataset=(data)=>{
  if(!data||data.realMoneyAllowed!==false||!Array.isArray(data.candidates))return false;
  if(data.venue||isExplicitPromo(data))return false;
  const declared=upper(data.sourceType);
  return !declared||declared==='ONLINE';
};

function buildOnlineCards(data){
  if(!isOnlineDataset(data))return [];
  return data.candidates.filter((c)=>{
    if(!c||isExplicitPromo(c))return false;
    const declared=upper(c.sourceType);
    return !declared||declared==='ONLINE';
  }).map((c)=>{
    const s=c?.spainStateSemantics||{};
    const crossPlayer=s.persistentAcrossPlayersVerified===true;
    const preWager=s.abandonedStateVisibleBeforeWagerVerified===true;
    const exactConfig=(c?.identityEvidence?.exactIgtIdentityVerifiedOnEnRachaPage===true)||
      (c?.identityEvidence?.currentEnRachaExactTitleVerified===true&&c?.identityEvidence?.identityConfidence==='EXACT_CONFIGURATION_VERIFIED');
    return {
      kind:'IGT_PERSISTENT',id:String(c?.id||''),game:String(c?.game||'Juego sin nombre'),
      operator:String(data?.operator?.name||'Operador español'),url:String(c?.currentSpainOperatorPage||''),
      priority:String(c?.decision?.researchPriority||'RESEARCH'),
      minBetEUR:hasNumber(c?.currentSpainEconomics?.minimumBetEUR)?Number(c.currentSpainEconomics.minimumBetEUR):null,
      maxBetEUR:hasNumber(c?.currentSpainEconomics?.maximumBetEUR)?Number(c.currentSpainEconomics.maximumBetEUR):null,
      rtpPct:hasNumber(c?.currentSpainEconomics?.theoreticalRtpPct)?Number(c.currentSpainEconomics.theoreticalRtpPct):null,
      mechanism:c?.persistentMechanismEvidence?.primaryIgtPersistentStateConfirmed===true?'IGT: persistent state confirmado':
        c?.persistentMechanismEvidence?.onlineRulesFact?'Persistencia online documentada en la familia IGT':'Estado variable/persistente documentado',
      crossPlayerVerified:crossPlayer,preWagerVisibleVerified:preWager,exactConfigVerified:exactConfig,
      status:'P0 · INVESTIGACIÓN',action:'NO_PLAY',sourceType:'ONLINE',promotion:false,
      strongFinding:'Título español actual de una familia mundial documentada de advantage play por estado persistente.',
      guardText:'Falta demostrar que el estado favorable de esta versión española puede quedar abandonado y visible para otro jugador.',
      decisiveBlocker:crossPlayer&&preWager?'OTROS_GATES_PENDIENTES':'FALTA_CONFIRMAR_ESTADO_COMPARTIDO_Y_VISIBLE_ANTES_DE_APOSTAR'
    };
  });
}

function norseGateSummary(data){
  const s=data?.p0Strategy?.stateObservationGate;
  const d=data?.p0Strategy?.currentDeploymentConfigurationGate;
  const t=data?.p0Strategy?.tickerIdentityGate;
  if(!s||!d||!t)return null;
  const deploymentClosed=d.currentSpanishJackpotCategoryPresenceVerified===true&&
    d.exactAognjp2LinkedTitleCurrentlyInJackpotCategory===true&&
    d.dailyTierPublishedForSameOperatorTitle===true&&
    d.dailyDeploymentConfiguredEvidenceStrong===true;
  const providerIdentity=t.aognjp2ToBookOfDwarvesProviderBindingVerified===true||
    d.providerCodeBindingAognjp2ToBookOfDwarvesVerified===true;
  const exactTickerIms=t.exactSpanishTickerImsBindingVerified===true||
    s.exactSpanishTickerImsBindingVerified===true||
    (s.exactTickerHostRecovered===true&&s.exactImsCasinoRecovered===true);
  const configuration=[s.currentPublicPageVerified===true,s.dailyMechanicPublishedOnCurrentPage===true,
    s.spanishInteroperatorPlaytechNetworkVerified===true,deploymentClosed];
  const identity=[providerIdentity,exactTickerIms];
  const live=[(s.sameSessionDailyActiveVerified===true)||(s.dailyActiveNowVerified===true),
    (s.currentDailyAmountRecovered===true)||hasNumber(s.currentDailyJackpotEUR),
    (s.currentGuaranteedHitTimeRecovered===true)||hasNumber(s.guaranteedHitTime)];
  return {
    configurationClosed:configuration.filter(Boolean).length,configurationTotal:configuration.length,
    identityClosed:identity.filter(Boolean).length,identityTotal:identity.length,
    liveClosed:live.filter(Boolean).length,liveTotal:live.length,
    closed:[...configuration,...identity,...live].filter(Boolean).length,
    total:configuration.length+identity.length+live.length,deploymentClosed,providerIdentity
  };
}

function buildNorseCards(data){
  if(!data||upper(data.market)!=='ES'||upper(data.provider)!=='PLAYTECH'||
     data?.execution?.realMoneyAllowed!==false||!data?.p0Strategy)return [];
  const s=data?.p0Strategy?.stateObservationGate;
  const d=data?.p0Strategy?.currentDeploymentConfigurationGate;
  const gs=norseGateSummary(data);
  if(!s||!gs)return [];
  return [{
    kind:'NORSE_P0',id:'playtech-norse-daily-spain-p0',game:'Age of the Gods Norse · Daily P0',
    operator:`${String(s.operator||'JOKERBET')} + ${String(d?.operator||'PartyCasino')}`,
    url:'https://www.jokerbet.es/tragaperras-slots/age-of-the-gods-norse-gods-and-giants.html',
    priority:'P0',status:'P0 · INVESTIGACIÓN',action:'NO_PLAY',sourceType:'ONLINE',promotion:false,
    mechanism:'Playtech Norse Daily · configuración, identidad y estado LIVE separados',
    closedGates:gs.closed,totalGates:gs.total,
    configurationClosed:gs.configurationClosed,configurationTotal:gs.configurationTotal,
    identityClosed:gs.identityClosed,identityTotal:gs.identityTotal,
    liveClosed:gs.liveClosed,liveTotal:gs.liveTotal,
    spanishNetworkVerified:s.spanishInteroperatorPlaytechNetworkVerified===true,
    dailyPublished:s.dailyMechanicPublishedOnCurrentPage===true,
    dailyConfiguredDeploymentVerified:gs.deploymentClosed,providerDailyIdentityVerified:gs.providerIdentity,
    sameSessionDailyVerified:(s.sameSessionDailyActiveVerified===true)||(s.dailyActiveNowVerified===true),
    strongFinding:'JOKERBET aporta mecánica Daily y red española; PartyCasino aporta despliegue español actual de Book of Dwarves; la referencia Playtech vincula Book of Dwarves (gpas_gogold_pop) con aognjp-2 Daily.',
    guardText:'La identidad de proveedor no es estado LIVE: faltan ticker+IMS español exactos, Daily same-session, importe y guaranteedHitTime actuales antes de cualquier ejecución.',
    decisiveBlocker:'FALTA_TICKER_IMS_Y_ESTADO_DAILY_ESPANOL'
  }];
}

const SPORTING_GATE_KEYS=[
  'currentSpanishGamePageVerified','exactSpanishLauncherBindingVerified','dailyWeeklyTimedMechanicVerified',
  'providerSljpCodesVerified','jackpotRtpIndependencePublished','globalCandidateStateObserved',
  'exactServedRtpVariantVerified','powerPlayJackpotStakeWeightingVerified',
  'exactBetfairSpainTickerImsBindingVerified','currentDailyAmountVerified','currentGuaranteedHitTimeVerified',
  'sameSessionDailyActiveVerified','exactStakeToPlayerHazardVerified','prospectiveDailyCycleObserved',
  'firstBetAfterDeadlinePreWagerKnowableVerified'
];

function buildSportingCards(data){
  if(!data||!String(data.version||'').startsWith('betfair-spain-sporting-legends-ap-mccoy-p0')||
     upper(data.market)!=='ES'||upper(data.sourceType)!=='ONLINE'||isExplicitPromo(data)||
     data?.execution?.realMoneyAllowed!==false)return [];
  const g=data.gates||{};
  const closed=SPORTING_GATE_KEYS.filter(k=>g[k]===true).length;
  const econ=data.economicScreen||{};
  const main=econ.mainGame||{};
  const pp=econ.accumulatorPlus||{};
  const retrospective=data.retrospectiveSpainRtpValidation||{};
  return [{
    kind:'SPORTING_P0',id:'betfair-ap-mccoy-sporting-legends-p0',
    game:String(data.game||'AP McCoy Sporting Legends'),operator:String(data.operator||'Betfair Spain'),
    url:String(data?.currentSpanishGamePage?.url||''),priority:'P0',status:'P0 · INVESTIGACIÓN',
    action:'NO_PLAY',sourceType:'ONLINE',promotion:false,
    mechanism:'Sporting Legends Daily · must-win-by temporal · jackpot financiado fuera del RTP base',
    closedGates:closed,totalGates:SPORTING_GATE_KEYS.length,
    conservativeBaseRtpPct:hasNumber(main.conservativeUnboundRtpPct)?Number(main.conservativeUnboundRtpPct):null,
    conservativeBreakEvenAdditionalPct:hasNumber(main.conservativeBreakEvenAdditionalJackpotReturnPct)?Number(main.conservativeBreakEvenAdditionalJackpotReturnPct):null,
    nominalPowerPlayBestRtpPct:hasNumber(pp.publishedMaxRtpPct)?Number(pp.publishedMaxRtpPct):null,
    nominalPowerPlayBreakEvenAdditionalPct:hasNumber(pp.nominalBestVariantBreakEvenAdditionalJackpotReturnPct)?Number(pp.nominalBestVariantBreakEvenAdditionalJackpotReturnPct):null,
    retrospectiveRealizedRtpPct:hasNumber(retrospective.latestObservedApMcCoyRealizedRtpPct)?Number(retrospective.latestObservedApMcCoyRealizedRtpPct):null,
    launcherVerified:g.exactSpanishLauncherBindingVerified===true,
    timedMechanicVerified:g.dailyWeeklyTimedMechanicVerified===true,
    tickerVerified:g.exactBetfairSpainTickerImsBindingVerified===true,
    currentDailyAmountVerified:g.currentDailyAmountVerified===true,
    currentDeadlineVerified:g.currentGuaranteedHitTimeVerified===true,
    hazardVerified:g.exactStakeToPlayerHazardVerified===true,
    exactServedRtpVariantVerified:g.exactServedRtpVariantVerified===true,
    powerPlayWeightingVerified:g.powerPlayJackpotStakeWeightingVerified===true,
    strongFinding:'Betfair España mantiene AP McCoy con Daily/Weekly temporizados; los jackpots están financiados por el operador y no reducen el RTP teórico del juego.',
    guardText:'El RTP realizado 108,41% es retrospectivo y no prueba +EV. Sin variante RTP exacta usamos 93,03% y exigimos +6,97 pp de retorno jackpot en el giro principal. El +2,83 pp nominal de Accumulator Plus queda bloqueado hasta verificar la ponderación de jackpot del Power Play 20×, además de ticker/IMS, deadline y hazard por apuesta.',
    decisiveBlocker:'FALTA_RTP_EXACTO_POWERPLAY_WEIGHTING_ESTADO_SLJP1_Y_HAZARD'
  }];
}

const operationalCardsOnly=(cards)=>(Array.isArray(cards)?cards:[]).filter((c)=>c?.sourceType==='ONLINE'&&!isExplicitPromo(c));
export function buildBreakthroughCards(data){return operationalCardsOnly([...buildOnlineCards(data),...buildNorseCards(data),...buildSportingCards(data)]);}
export function buildCombinedBreakthroughCards(datasets){return operationalCardsOnly((Array.isArray(datasets)?datasets:[]).flatMap(buildBreakthroughCards));}

function igtCardHtml(c){
  const link=c.url?`<a href="${esc(c.url)}" target="_blank" rel="noopener">Abrir ficha oficial →</a>`:'Ficha oficial no disponible';
  const inheritedLabel=c.crossPlayerVerified?'VERIFICADO':'POR CERRAR';
  return `<article class="breakCard"><div class="breakTop"><div><div class="breakProvider">${esc(c.operator)} · ONLINE · ESPAÑA</div><div class="breakTitle">${esc(c.game)}</div></div><span class="breakBadge">${esc(c.status)}</span></div><div class="breakMechanism">⚡ ${esc(c.mechanism)}</div><div class="breakGrid"><div><small>RTP PUBLICADO</small><b>${pct(c.rtpPct)}</b></div><div><small>APUESTA MÍN.</small><b>${eur(c.minBetEUR)}</b></div><div><small>ESTADO ENTRE JUGADORES</small><b>${inheritedLabel}</b></div><div><small>VISIBLE ANTES DE APOSTAR</small><b>${c.preWagerVisibleVerified?'VERIFICADO':'POR CERRAR'}</b></div></div><div class="breakGood">HALLAZGO REAL: ${esc(c.strongFinding||'candidato P0 español de estado persistente.')}</div><div class="breakGuard">🔴 NO ES SEÑAL DE APUESTA · ${esc(c.guardText||'Faltan gates locales antes de cualquier ejecución.')}</div><div class="breakLink">${link}</div></article>`;
}

function norseCardHtml(c){
  const link=c.url?`<a href="${esc(c.url)}" target="_blank" rel="noopener">Abrir ficha española →</a>`:'Ficha española no disponible';
  return `<article class="breakCard"><div class="breakTop"><div><div class="breakProvider">${esc(c.operator)} · ONLINE · ESPAÑA</div><div class="breakTitle">${esc(c.game)}</div></div><span class="breakBadge">${esc(c.status)}</span></div><div class="breakMechanism">⚡ ${esc(c.mechanism)}</div><div class="breakGrid"><div><small>CONFIG / DESPLIEGUE</small><b>${Number(c.configurationClosed)||0}/${Number(c.configurationTotal)||4}</b></div><div><small>IDENTIDAD</small><b>${Number(c.identityClosed)||0}/${Number(c.identityTotal)||2}</b></div><div><small>ESTADO LIVE</small><b>${Number(c.liveClosed)||0}/${Number(c.liveTotal)||3}</b></div><div><small>DINERO REAL</small><b>0 € · NO_PLAY</b></div></div><div class="breakGood">HALLAZGO REAL: ${esc(c.strongFinding)}</div><div class="breakGuard">🔴 NO ES SEÑAL DE APUESTA · ${esc(c.guardText)}</div><div class="breakLink">${link}</div></article>`;
}

function sportingCardHtml(c){
  const link=c.url?`<a href="${esc(c.url)}" target="_blank" rel="noopener">Abrir ficha Betfair España →</a>`:'Ficha española no disponible';
  return `<article class="breakCard"><div class="breakTop"><div><div class="breakProvider">${esc(c.operator)} · ONLINE · ESPAÑA</div><div class="breakTitle">${esc(c.game)}</div></div><span class="breakBadge">${esc(c.status)}</span></div><div class="breakMechanism">⚡ ${esc(c.mechanism)}</div><div class="breakGrid"><div><small>GATES P0</small><b>${Number(c.closedGates)||0}/${Number(c.totalGates)||15}</b></div><div><small>RTP CONSERVADOR SIN VARIANTE</small><b>${pct(c.conservativeBaseRtpPct)}</b></div><div><small>UPLIFT CONSERVADOR PARA 100%</small><b>${pct(c.conservativeBreakEvenAdditionalPct)}</b></div><div><small>POWER PLAY 20×</small><b>${c.powerPlayWeightingVerified?'WEIGHTING VERIFICADO':'2,83% NOMINAL · BLOQUEADO'}</b></div></div><div class="breakGood">HALLAZGO REAL: ${esc(c.strongFinding)}</div><div class="breakGuard">🔴 NO ES SEÑAL DE APUESTA · ${esc(c.guardText)}</div><div class="breakLink">${link}</div></article>`;
}

export function cardHtml(c){
  if(!c||c.sourceType!=='ONLINE'||isExplicitPromo(c))return '';
  if(c.kind==='NORSE_P0')return norseCardHtml(c);
  if(c.kind==='SPORTING_P0')return sportingCardHtml(c);
  return igtCardHtml(c);
}

export function renderBreakthroughs(data,{root=document.getElementById('breakthroughList'),summary=document.getElementById('breakthroughSummary')}={}){
  const cards=operationalCardsOnly(Array.isArray(data)?buildCombinedBreakthroughCards(data):buildBreakthroughCards(data));
  if(summary)summary.textContent=cards.length?`${cards.length} HALLAZGOS P0 ONLINE EN ESPAÑA · 0 FÍSICOS · 0 PROMOS · 0 € HASTA CERRAR GATES LOCALES`:'Sin hallazgos P0 online cargados';
  if(root)root.innerHTML=cards.length?cards.map(cardHtml).filter(Boolean).join(''):'<div class="breakEmpty">Sin nuevos hallazgos online cargados.</div>';
  return cards;
}

async function load(){
  try{
    const datasets=(await Promise.all(SOURCES.map(async(source)=>{
      try{const r=await fetch(`${source}?t=${Date.now()}`,{cache:'no-store'});if(!r.ok)return null;return await r.json();}
      catch{return null;}
    }))).filter(Boolean);
    renderBreakthroughs(datasets);
  }catch{renderBreakthroughs(null);}
}
if(typeof document!=='undefined')load();

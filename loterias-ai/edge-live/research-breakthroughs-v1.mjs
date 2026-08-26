const SOURCES=[
  './evidence/spain-igt-persistent-state-candidates-v1.json',
  './evidence/aotgn-spain-live-deployment-targets-v1.json'
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
  if(data.venue)return false;
  if(isExplicitPromo(data))return false;
  const declared=upper(data.sourceType);
  if(declared&&declared!=='ONLINE')return false;
  return true;
};

function buildOnlineCards(data){
  if(!isOnlineDataset(data))return [];
  return data.candidates
    .filter((c)=>{
      if(!c||isExplicitPromo(c))return false;
      const declared=upper(c.sourceType);
      return !declared||declared==='ONLINE';
    })
    .map((c)=>{
      const s=c?.spainStateSemantics||{};
      const crossPlayer=s.persistentAcrossPlayersVerified===true;
      const preWager=s.abandonedStateVisibleBeforeWagerVerified===true;
      const exactConfig=(c?.identityEvidence?.exactIgtIdentityVerifiedOnEnRachaPage===true)||(c?.identityEvidence?.currentEnRachaExactTitleVerified===true&&c?.identityEvidence?.identityConfidence==='EXACT_CONFIGURATION_VERIFIED');
      return {
        kind:'IGT_PERSISTENT',id:String(c?.id||''),game:String(c?.game||'Juego sin nombre'),operator:String(data?.operator?.name||'Operador español'),url:String(c?.currentSpainOperatorPage||''),priority:String(c?.decision?.researchPriority||'RESEARCH'),
        minBetEUR:hasNumber(c?.currentSpainEconomics?.minimumBetEUR)?Number(c.currentSpainEconomics.minimumBetEUR):null,
        maxBetEUR:hasNumber(c?.currentSpainEconomics?.maximumBetEUR)?Number(c.currentSpainEconomics.maximumBetEUR):null,
        rtpPct:hasNumber(c?.currentSpainEconomics?.theoreticalRtpPct)?Number(c.currentSpainEconomics.theoreticalRtpPct):null,
        mechanism:c?.persistentMechanismEvidence?.primaryIgtPersistentStateConfirmed===true?'IGT: persistent state confirmado':c?.persistentMechanismEvidence?.onlineRulesFact?'Persistencia online documentada en la familia IGT':'Estado variable/persistente documentado',
        crossPlayerVerified:crossPlayer,preWagerVisibleVerified:preWager,exactConfigVerified:exactConfig,status:'P0 · INVESTIGACIÓN',action:'NO_PLAY',sourceType:'ONLINE',promotion:false,
        strongFinding:'Título español actual de una familia mundial documentada de advantage play por estado persistente.',
        guardText:'Falta demostrar que el estado favorable de esta versión española puede quedar abandonado y visible para otro jugador.',
        decisiveBlocker:crossPlayer&&preWager?'OTROS_GATES_PENDIENTES':'FALTA_CONFIRMAR_ESTADO_COMPARTIDO_Y_VISIBLE_ANTES_DE_APOSTAR'
      };
    });
}

function norseGateSummary(data){
  const s=data?.p0Strategy?.stateObservationGate;
  if(!s)return null;
  const gates=[
    s.currentPublicPageVerified===true,
    s.dailyMechanicPublishedOnCurrentPage===true,
    s.spanishInteroperatorPlaytechNetworkVerified===true,
    s.directGameToAognjp2BindingVerified===true,
    (s.sameSessionDailyActiveVerified===true)||(s.dailyActiveNowVerified===true),
    (s.currentDailyAmountRecovered===true)||hasNumber(s.currentDailyJackpotEUR),
    (s.currentGuaranteedHitTimeRecovered===true)||hasNumber(s.guaranteedHitTime),
    (s.exactSpanishTickerImsBindingVerified===true)||(s.exactTickerHostRecovered===true&&s.exactImsCasinoRecovered===true)
  ];
  return {closed:gates.filter(Boolean).length,total:gates.length};
}

function buildNorseCards(data){
  if(!data||upper(data.market)!=='ES'||upper(data.provider)!=='PLAYTECH'||data?.execution?.realMoneyAllowed!==false)return [];
  const s=data?.p0Strategy?.stateObservationGate;
  const gs=norseGateSummary(data);
  if(!s||!gs)return [];
  return [{
    kind:'NORSE_P0',id:'playtech-norse-daily-spain-p0',game:String(s.game||'Age of the Gods Norse'),operator:String(s.operator||'Operador español'),
    url:'https://www.jokerbet.es/tragaperras-slots/age-of-the-gods-norse-gods-and-giants.html',priority:'P0',status:'P0 · INVESTIGACIÓN',action:'NO_PLAY',sourceType:'ONLINE',promotion:false,
    mechanism:'Playtech Norse Daily · red española interoperador',closedGates:gs.closed,totalGates:gs.total,
    spanishNetworkVerified:s.spanishInteroperatorPlaytechNetworkVerified===true,dailyPublished:s.dailyMechanicPublishedOnCurrentPage===true,
    directTickerBindingVerified:s.directGameToAognjp2BindingVerified===true,sameSessionDailyVerified:(s.sameSessionDailyActiveVerified===true)||(s.dailyActiveNowVerified===true),
    strongFinding:'Ficha española actual con mecánica Daily publicada y red Playtech interoperador España verificada.',
    guardText:'Faltan binding directo aognjp-2, Daily same-session, importe/deadline actuales y ticker+IMS español antes de cualquier ejecución.',
    decisiveBlocker:'FALTA_ESTADO_DAILY_Y_BINDING_TICKER_ESPANOL'
  }];
}

const operationalCardsOnly=(cards)=>(Array.isArray(cards)?cards:[]).filter((c)=>c?.sourceType==='ONLINE'&&!isExplicitPromo(c));

export function buildBreakthroughCards(data){return operationalCardsOnly([...buildOnlineCards(data),...buildNorseCards(data)]);}
export function buildCombinedBreakthroughCards(datasets){return operationalCardsOnly((Array.isArray(datasets)?datasets:[]).flatMap(buildBreakthroughCards));}

function igtCardHtml(c){
  const link=c.url?`<a href="${esc(c.url)}" target="_blank" rel="noopener">Abrir ficha oficial →</a>`:'Ficha oficial no disponible';
  const inheritedLabel=c.crossPlayerVerified?'VERIFICADO':'POR CERRAR';
  return `<article class="breakCard">
    <div class="breakTop"><div><div class="breakProvider">${esc(c.operator)} · ONLINE · ESPAÑA</div><div class="breakTitle">${esc(c.game)}</div></div><span class="breakBadge">${esc(c.status)}</span></div>
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

function norseCardHtml(c){
  const link=c.url?`<a href="${esc(c.url)}" target="_blank" rel="noopener">Abrir ficha oficial →</a>`:'Ficha oficial no disponible';
  return `<article class="breakCard">
    <div class="breakTop"><div><div class="breakProvider">${esc(c.operator)} · ONLINE · ESPAÑA</div><div class="breakTitle">${esc(c.game)}</div></div><span class="breakBadge">${esc(c.status)}</span></div>
    <div class="breakMechanism">⚡ ${esc(c.mechanism)}</div>
    <div class="breakGrid">
      <div><small>GATES IDENTIDAD/ESTADO</small><b>${Number(c.closedGates)||0}/${Number(c.totalGates)||8}</b></div>
      <div><small>RED ESPAÑA</small><b>${c.spanishNetworkVerified?'VERIFICADA':'POR CERRAR'}</b></div>
      <div><small>DAILY PUBLICADO</small><b>${c.dailyPublished?'VERIFICADO':'POR CERRAR'}</b></div>
      <div><small>DAILY SAME-SESSION</small><b>${c.sameSessionDailyVerified?'VERIFICADO':'POR CERRAR'}</b></div>
    </div>
    <div class="breakGood">HALLAZGO REAL: ${esc(c.strongFinding)}</div>
    <div class="breakGuard">🔴 NO ES SEÑAL DE APUESTA · ${esc(c.guardText)}</div>
    <div class="breakLink">${link}</div>
  </article>`;
}

export function cardHtml(c){
  if(!c||c.sourceType!=='ONLINE'||isExplicitPromo(c))return '';
  return c.kind==='NORSE_P0'?norseCardHtml(c):igtCardHtml(c);
}

export function renderBreakthroughs(data,{root=document.getElementById('breakthroughList'),summary=document.getElementById('breakthroughSummary')}={}){
  const cards=operationalCardsOnly(Array.isArray(data)?buildCombinedBreakthroughCards(data):buildBreakthroughCards(data));
  if(summary){
    summary.textContent=cards.length?`${cards.length} HALLAZGOS P0 ONLINE EN ESPAÑA · 0 FÍSICOS · 0 PROMOS · 0 € HASTA CERRAR GATES LOCALES`:'Sin hallazgos P0 online cargados';
  }
  if(root)root.innerHTML=cards.length?cards.map(cardHtml).filter(Boolean).join(''):'<div class="breakEmpty">Sin nuevos hallazgos online cargados.</div>';
  return cards;
}

async function load(){
  try{
    const datasets=(await Promise.all(SOURCES.map(async(source)=>{try{const r=await fetch(`${source}?t=${Date.now()}`,{cache:'no-store'});if(!r.ok)return null;return await r.json();}catch{return null;}}))).filter(Boolean);
    renderBreakthroughs(datasets);
  }catch{renderBreakthroughs(null);}
}

if(typeof document!=='undefined')load();

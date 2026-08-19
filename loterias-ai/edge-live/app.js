const ROOT='../';
const SOURCES={
 gate:`${ROOT}casino/evidence/five-euro-real-pilot-gate-v1.json`,
 structure:`${ROOT}casino/jackpots/evidence/botemania-jpk-structural-evidence-synthesis-v1.json`,
 live:`${ROOT}casino/jackpots/evidence/botemania-jpk-live-gate-v1.json`,
 flow:`${ROOT}casino/jackpots/evidence/botemania-jpk-flow-model-v1.json`,
 blackjack:`${ROOT}casino/playuzu/evidence/blackjack-exact-lobby-economics-v1.json`,
 lightning:`${ROOT}casino/lightning/evidence/economic-readiness-ledger-v1.json`
};
const $=id=>document.getElementById(id);
const esc=x=>String(x??'—').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pct=x=>Number.isFinite(Number(x))?(Number(x)*100).toFixed(2)+'%':'—';
const eur=x=>Number.isFinite(Number(x))?Number(x).toLocaleString('es-ES',{style:'currency',currency:'EUR'}):'—';
const secAge=t=>{const ms=Date.now()-Date.parse(t||'');return Number.isFinite(ms)?Math.max(0,Math.floor(ms/1000)):null;};
const age=t=>{const s=secAge(t);if(s==null)return 'fecha desconocida';if(s<60)return `${s}s`;if(s<3600)return `${Math.floor(s/60)}m ${s%60}s`;return `${Math.floor(s/3600)}h ${Math.floor((s%3600)/60)}m`;};
const clock=()=>new Intl.DateTimeFormat('es-ES',{timeZone:'Europe/Madrid',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(new Date());
const localTime=t=>{const d=new Date(t);return Number.isFinite(d.getTime())?new Intl.DateTimeFormat('es-ES',{timeZone:'Europe/Madrid',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(d):'—';};
async function get(url){const r=await fetch(url+`?t=${Date.now()}`,{cache:'no-store'});if(!r.ok)throw new Error(`${r.status} ${url}`);return r.json();}
function laneLabel(id){return ({'botemania-jackpot-king':'Fishin’ Frenzy · Jackpot King','playuzu-goal-goal-goal-blackjack':'Goal Goal Goal Blackjack','lightning-roulette':'Lightning Roulette'})[id]||id;}
let currentGate=null,currentLive=null,lastObservedAt=null,lastFrameWasNew=false,lastRefreshAt=null;
function gateFresh(g){const s=secAge(g?.generatedAt);return Number.isFinite(s)&&s<=360;}
function renderGate(gate){
 currentGate=gate;
 const eligible=(gate?.decision?.eligibleLanes||[]);
 const sourceFresh=gateFresh(gate);
 const real=sourceFresh&&gate?.decision?.pilotAllowed===true&&Number(gate?.decision?.maxTotalStakeEUR)>0&&eligible.length>0;
 $('hero').className='hero '+(real?'live':'blocked');
 $('heroTitle').textContent=real?'OPORTUNIDAD VALIDADA':'NO APUESTES';
 $('heroText').textContent=real?`Gate vigente para ${eligible.map(laneLabel).join(', ')}. Usa sólo el importe publicado y detente si el estado cambia.`:sourceFresh?'No hay ninguna oportunidad con ventaja económica validada en este instante.':'El gate no está suficientemente fresco: bloqueo automático hasta nueva evidencia.';
 $('stake').textContent=real?eur(gate.decision.maxTotalStakeEUR):'0,00 €';
 $('stakeHint').textContent=real?'Límite absoluto del gate; nunca aumentarlo para recuperar pérdidas.':sourceFresh?'Sin gate económico, la cantidad correcta es cero.':'Dato viejo: cantidad autorizada = cero.';
 const lanes=Array.isArray(gate?.lanes)?gate.lanes:[];
 $('opportunities').innerHTML=lanes.map(l=>`<section class="card"><div class="row"><div><div class="name">${esc(laneLabel(l.id))}</div><div class="meta">${esc(l.id)}</div></div><span class="badge ${l.eligible?'ok':'bad'}">${l.eligible?'ELEGIBLE':'BLOQUEADO'}</span></div><div class="reason">${laneReason(l)}</div></section>`).join('')||'<section class="card"><div class="meta">Sin carriles publicados.</div></section>';
 tick();
}
function laneReason(l){const e=l?.evidence||{};if(l?.id==='botemania-jackpot-king')return `Gate live: <b>${esc(e.liveGateState)}</b> · RTP conservador mejor: <b>${pct(e.bestConservativeRtp)}</b> · MBWB España: <b>${e.exactSpainMbwbKnown?'sí':'no'}</b> · hazard exacto: <b>${e.exactHazardKnown?'sí':'no'}</b>.`;if(l?.id==='playuzu-goal-goal-goal-blackjack')return `RTP: <b>${esc(e.exactRtpPct)}%</b> · retorno condicional si reward mapea 1:1: <b>${esc(e.conditionalEffectiveRtpPctIfFieldMapsOneToOne)}%</b> · semántica reward confirmada: <b>${e.rewardFieldSemanticMappingFullyConfirmed?'sí':'no'}</b>.`;if(l?.id==='lightning-roulette')return `Ventaja económica directa validada: <b>${e.fixedFinalEconomicPass?'sí':'no'}</b> · lead actual: <b>${esc(e.strongestCurrentLead)}</b>.`;return esc(JSON.stringify(e));}
function renderMirror(live,flow){
 currentLive=live;
 const observed=live?.current?.observedAt||null;
 lastFrameWasNew=Boolean(observed&&lastObservedAt&&observed!==lastObservedAt);
 if(observed)lastObservedAt=observed;
 const pots=live?.current?.potsEUR||{};
 const intervals=Array.isArray(flow?.intervals)?flow.intervals.slice(-8).reverse():[];
 $('liveFeed').innerHTML=intervals.map(i=>`<div class="feedrow"><span class="feedtime">${localTime(i.to)}</span><span class="feedmove">+${eur(i.activePotGrowthEUR)} · K ${pct(i?.allocationShares?.JACKPOT_KING)} / Rg ${pct(i?.allocationShares?.REGAL)} / Ry ${pct(i?.allocationShares?.ROYAL)}</span><span class="feedstate">${Math.round(Number(i.seconds||0))}s</span></div>`).join('')||'<div class="meta">Todavía no hay intervalos observados para reproducir.</div>';
 $('mirrorReason').innerHTML=`Última captura real: <b>${localTime(observed)}</b> · Jackpot King <b>${eur(pots.JACKPOT_KING)}</b> · Regal <b>${eur(pots.REGAL)}</b> · Royal <b>${eur(pots.ROYAL)}</b>. Esta es una reproducción del <b>estado observable</b>, no de giros que la fuente no publica.`;
 tick();
}
function tick(){
 if($('liveClock'))$('liveClock').textContent=clock();
 const liveAge=currentLive?.current?.observedAt?secAge(currentLive.current.observedAt):null;
 if($('liveAge'))$('liveAge').textContent=liveAge==null?'—':`${liveAge}s`;
 if($('frameState'))$('frameState').textContent=lastFrameWasNew?'NUEVO DATO':'MISMO DATO';
 if($('mirrorDecision')){
   const eligible=(currentGate?.decision?.eligibleLanes||[]);
   const real=gateFresh(currentGate)&&currentGate?.decision?.pilotAllowed===true&&Number(currentGate?.decision?.maxTotalStakeEUR)>0&&eligible.length>0;
   $('mirrorDecision').className='badge '+(real?'ok':'bad');
   $('mirrorDecision').textContent=real?'APUESTA':'NO APUESTES';
 }
 if($('freshness')){
   const gAge=currentGate?.generatedAt?age(currentGate.generatedAt):'—';
   const lAge=currentLive?.current?.observedAt?age(currentLive.current.observedAt):'—';
   $('freshness').textContent=`Gate ${gAge} · estado Botemania ${lAge}`;
 }
}
function renderBotemania(s,l){const p=s?.prospectiveNetworkEvidence?.progress||{},sh=s?.prospectiveNetworkEvidence?.weightedAllocationShares||{},pots=l?.current?.potsEUR||{};const ok=s?.prospectiveNetworkEvidence?.networkAllocationProspectivelyValidated===true;const econ=s?.decision?.economicPromotionAllowed===true;$('botemania').innerHTML=`<div class="row"><div><div class="name">Fishin’ Frenzy · Jackpot King</div><div class="meta">Botemania · estructura prospectiva + gate económico</div></div><span class="badge ${econ?'ok':ok?'warn':'bad'}">${econ?'ECONÓMICO':ok?'ESTRUCTURA VALIDADA':'INVESTIGACIÓN'}</span></div><div class="grid"><div class="metric"><small>INTERVALOS LIMPIOS</small><b>${esc(p.cleanFutureIntervals)}/${esc(p.targetCleanIntervals)}</b></div><div class="metric"><small>CRECIMIENTO</small><b>${eur(p.cumulativeActiveGrowthEUR)}</b></div><div class="metric"><small>JACKPOT KING</small><b>${eur(pots.JACKPOT_KING)}</b></div><div class="metric"><small>ROYAL / REGAL</small><b>${eur(pots.ROYAL)} / ${eur(pots.REGAL)}</b></div></div><div class="reason">Reparto observado: <b>${pct(sh.JACKPOT_KING)}</b> / <b>${pct(sh.REGAL)}</b> / <b>${pct(sh.ROYAL)}</b>. Estado económico: <b>${esc(l?.state)}</b>. Mejor RTP conservador modelado: <b>${pct(l?.current?.modelScreen?.bestConservativeRtp)}</b>.</div>`;}
function renderBlackjack(b){const g=b?.strongestCurrentCandidate||{};$('blackjack').innerHTML=`<div class="row"><div><div class="name">${esc(g.name||'Goal Goal Goal Blackjack')}</div><div class="meta">PlayUZU · candidato más cercano a break-even</div></div><span class="badge ${g.verifiedPositiveEV?'ok':'bad'}">${g.verifiedPositiveEV?'VENTAJA':'NO VALIDADO'}</span></div><div class="grid"><div class="metric"><small>RTP</small><b>${esc(g.exactRtpPct)}%</b></div><div class="metric"><small>REWARD INTERNO</small><b>${esc(g.observedInternalPlusPercent)}%</b></div></div><div class="reason">Falta confirmar semántica exacta del reward, reglas/estrategia y un límite inferior de EV por encima de 100%.</div>`;}
function renderLightning(x){const lead=x?.strongestCurrentLead||'NO_VALIDATED_CURRENT_LEAD_YET',direct=x?.strongestDirectEconomicLane||'NO_VALIDATED_DIRECT_ECONOMIC_EDGE_YET',near=x?.closestBlindBoundary||{};$('lightning').innerHTML=`<div class="row"><div><div class="name">Lightning Roulette</div><div class="meta">Réplicas independientes y carriles físicos</div></div><span class="badge bad">NO VALIDADO</span></div><div class="grid"><div class="metric"><small>LEAD</small><b>${lead==='NO_VALIDATED_CURRENT_LEAD_YET'?'Ninguno':'Sí'}</b></div><div class="metric"><small>RÉPLICA MÁS CERCA</small><b>${esc(near?.progress?.used)}/${esc(near?.progress?.boundary)}</b></div></div><div class="reason">Ventaja económica directa: <b>${esc(direct)}</b>. El rendimiento de los carriles ciegos permanece oculto hasta su frontera fija.</div>`;}
async function refresh(){try{lastRefreshAt=Date.now();const [g,s,l,f,b,x]=await Promise.all([get(SOURCES.gate),get(SOURCES.structure),get(SOURCES.live),get(SOURCES.flow),get(SOURCES.blackjack),get(SOURCES.lightning)]);renderGate(g);renderMirror(l,f);renderBotemania(s,l);renderBlackjack(b);renderLightning(x);}catch(e){$('freshness').innerHTML='<span class="error">Error leyendo evidencia</span>';console.error(e)}}
$('refreshBtn').addEventListener('click',refresh);refresh();setInterval(refresh,5000);setInterval(()=>{lastFrameWasNew=false;tick();},1000);
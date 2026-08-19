const ROOT='../';
const SOURCES={
 gate:`${ROOT}casino/evidence/five-euro-real-pilot-gate-v1.json`,
 structure:`${ROOT}casino/jackpots/evidence/botemania-jpk-structural-evidence-synthesis-v1.json`,
 live:`${ROOT}casino/jackpots/evidence/botemania-jpk-live-gate-v1.json`,
 flow:`${ROOT}casino/jackpots/evidence/botemania-jpk-flow-model-v1.json`
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
let currentGate=null,currentLive=null,lastObservedAt=null,lastFrameWasNew=false;
function gateFresh(g){const s=secAge(g?.generatedAt);return Number.isFinite(s)&&s<=360;}
function botLane(g){return (Array.isArray(g?.lanes)?g.lanes:[]).find(x=>x?.id==='botemania-jackpot-king')||null;}
function botPilotAllowed(g){const lane=botLane(g);const eligible=(g?.decision?.eligibleLanes||[]);return gateFresh(g)&&lane?.eligible===true&&g?.decision?.pilotAllowed===true&&eligible.includes('botemania-jackpot-king')&&Number(g?.decision?.maxTotalStakeEUR)>0;}
function renderGate(g){
 currentGate=g;
 const lane=botLane(g), real=botPilotAllowed(g), fresh=gateFresh(g), e=lane?.evidence||{};
 $('hero').className='hero '+(real?'live':'blocked');
 $('heroTitle').textContent=real?'APUESTA':'NO APUESTES';
 $('heroText').textContent=real?'Fishin’ Frenzy: Jackpot King ha superado el gate económico Botemania. Usa sólo el importe máximo publicado mientras el dato siga vigente.':fresh?'Fishin’ Frenzy: Jackpot King sigue vigilado, pero el gate económico Botemania no ha pasado.':'El gate está desactualizado: bloqueo automático hasta nueva evidencia.';
 $('stake').textContent=real?eur(g.decision.maxTotalStakeEUR):'0,00 €';
 $('stakeHint').textContent=real?'Límite absoluto del piloto manual; no recargar ni perseguir pérdidas.':fresh?'Gate Botemania no superado.':'Dato viejo: cantidad autorizada = cero.';
 $('opportunities').innerHTML=`<section class="card"><div class="row"><div><div class="name">Fishin’ Frenzy: Jackpot King</div><div class="meta">Botemania · candidato operativo nº1</div></div><span class="badge ${real?'ok':'bad'}">${real?'APUESTA':'BLOQUEADO'}</span></div><div class="reason">Gate live: <b>${esc(e.liveGateState)}</b> · mejor RTP conservador: <b>${pct(e.bestConservativeRtp)}</b> · MBWB España exacto: <b>${e.exactSpainMbwbKnown?'sí':'no'}</b> · hazard exacto: <b>${e.exactHazardKnown?'sí':'no'}</b> · reparto de red prospectivamente validado: <b>${e.networkAllocationProspectivelyValidated?'sí':'no'}</b>.</div></section>`;
 tick();
}
function renderMirror(live,flow){
 currentLive=live;
 const observed=live?.current?.observedAt||null;
 lastFrameWasNew=Boolean(observed&&lastObservedAt&&observed!==lastObservedAt);
 if(observed)lastObservedAt=observed;
 const pots=live?.current?.potsEUR||{};
 const intervals=Array.isArray(flow?.intervals)?flow.intervals.slice(-10).reverse():[];
 $('liveFeed').innerHTML=intervals.map(i=>`<div class="feedrow"><span class="feedtime">${localTime(i.to)}</span><span class="feedmove">+${eur(i.activePotGrowthEUR)} · K ${pct(i?.allocationShares?.JACKPOT_KING)} / Rg ${pct(i?.allocationShares?.REGAL)} / Ry ${pct(i?.allocationShares?.ROYAL)}</span><span class="feedstate">${Math.round(Number(i.seconds||0))}s</span></div>`).join('')||'<div class="meta">Todavía no hay intervalos observados para reproducir.</div>';
 $('mirrorReason').innerHTML=`Última captura real: <b>${localTime(observed)}</b> · Jackpot King <b>${eur(pots.JACKPOT_KING)}</b> · Regal <b>${eur(pots.REGAL)}</b> · Royal <b>${eur(pots.ROYAL)}</b>. La decisión visible se recalcula con el gate Botemania; no se inventan giros que la fuente no publique.`;
 tick();
}
function renderBotemania(s,l){const p=s?.prospectiveNetworkEvidence?.progress||{},sh=s?.prospectiveNetworkEvidence?.weightedAllocationShares||{},pots=l?.current?.potsEUR||{},c=s?.prospectiveNetworkEvidence?.checks||{};const struct=s?.prospectiveNetworkEvidence?.networkAllocationProspectivelyValidated===true;const econ=s?.decision?.economicPromotionAllowed===true;$('botemania').innerHTML=`<div class="row"><div><div class="name">Fishin’ Frenzy: Jackpot King</div><div class="meta">Único juego operativo de EDGE LIVE ahora</div></div><span class="badge ${econ?'ok':struct?'warn':'bad'}">${econ?'ECONÓMICO':struct?'ESTRUCTURA VALIDADA':'VALIDANDO'}</span></div><div class="grid"><div class="metric"><small>INTERVALOS LIMPIOS</small><b>${esc(p.cleanFutureIntervals)}/${esc(p.targetCleanIntervals)}</b></div><div class="metric"><small>CRECIMIENTO</small><b>${eur(p.cumulativeActiveGrowthEUR)}</b></div><div class="metric"><small>INFORMATIVOS</small><b>${esc(p.informativeIntervals)}/${esc(p.targetInformativeIntervals)}</b></div><div class="metric"><small>JACKPOT KING</small><b>${eur(pots.JACKPOT_KING)}</b></div><div class="metric"><small>ROYAL</small><b>${eur(pots.ROYAL)}</b></div><div class="metric"><small>REGAL</small><b>${eur(pots.REGAL)}</b></div></div><div class="reason">Reparto observado: <b>${pct(sh.JACKPOT_KING)}</b> / <b>${pct(sh.REGAL)}</b> / <b>${pct(sh.ROYAL)}</b>. Bandas ponderadas: <b>${c.weightedShareBands?'OK':'NO'}</b> · simetría Regal/Royal: <b>${c.regalRoyalSymmetry?'OK':'NO'}</b> · bandas por intervalo: <b>${c.perIntervalBroadBand?'OK':'NO'}</b>. Estado económico: <b>${esc(l?.state)}</b> · mejor RTP conservador: <b>${pct(l?.current?.modelScreen?.bestConservativeRtp)}</b>.</div>`;}
function tick(){
 if($('liveClock'))$('liveClock').textContent=clock();
 const liveAge=currentLive?.current?.observedAt?secAge(currentLive.current.observedAt):null;
 if($('liveAge'))$('liveAge').textContent=liveAge==null?'—':`${liveAge}s`;
 if($('frameState'))$('frameState').textContent=lastFrameWasNew?'NUEVO DATO':'MISMO DATO';
 if($('mirrorDecision')){const real=botPilotAllowed(currentGate);$('mirrorDecision').className='badge '+(real?'ok':'bad');$('mirrorDecision').textContent=real?'APUESTA':'NO APUESTES';}
 if($('freshness')){const gAge=currentGate?.generatedAt?age(currentGate.generatedAt):'—';const lAge=currentLive?.current?.observedAt?age(currentLive.current.observedAt):'—';$('freshness').textContent=`Gate Botemania ${gAge} · estado del bote ${lAge}`;}
}
async function refresh(){try{const [g,s,l,f]=await Promise.all([get(SOURCES.gate),get(SOURCES.structure),get(SOURCES.live),get(SOURCES.flow)]);renderGate(g);renderMirror(l,f);renderBotemania(s,l);}catch(e){$('freshness').innerHTML='<span class="error">Error leyendo evidencia Botemania</span>';console.error(e)}}
$('refreshBtn').addEventListener('click',refresh);refresh();setInterval(refresh,5000);setInterval(()=>{lastFrameWasNew=false;tick();},1000);
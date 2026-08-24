const BACKEND='https://loterias-edge-sentinel.k8mwkbp68y.workers.dev';
const EVIDENCE='./evidence/jackpot-king-shared-pool-economics-v1.json';
const PRIORITY='./evidence/green-distance-priority-v1.json';
const $=id=>document.getElementById(id);
const pct=v=>Number.isFinite(Number(v))?(Number(v)*100).toFixed(2)+'%':'—';
const money=v=>Number.isFinite(Number(v))?Number(v).toLocaleString('es-ES',{style:'currency',currency:'EUR',minimumFractionDigits:2,maximumFractionDigits:2}):'—';
const time=t=>{const d=new Date(t);return Number.isFinite(d.getTime())?new Intl.DateTimeFormat('es-ES',{timeZone:'Europe/Madrid',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(d):'—';};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

const lab={science:null,evidence:null,jpk:null,winfall:null,priority:null,error:null};
async function j(url){const r=await fetch(`${url}${url.includes('?')?'&':'?'}t=${Date.now()}`,{cache:'no-store'});if(!r.ok)throw new Error(`HTTP_${r.status}`);return r.json();}

function panel(){
  let p=$('edgeScience24x7');
  if(p)return p;
  p=document.createElement('section');p.id='edgeScience24x7';
  p.style.cssText='margin:12px 0 14px;border:1px solid #2b6b4e;border-radius:18px;background:linear-gradient(145deg,#071711,#0b2a20);padding:12px;color:#eafff3;font-family:inherit;box-shadow:0 12px 30px #0005';
  const anchor=$('radarSummary')||$('radarList')||$('gameCard');
  if(anchor)anchor.insertAdjacentElement('afterend',p);else document.body.appendChild(p);
  return p;
}

function eventLine(e){
  if(!e)return '';
  const type=String(e.type||'');
  if(type==='RESET_OR_AWARD_CANDIDATE')return `<div style="margin-top:8px;padding:8px;border-radius:11px;background:#ffc85710;border:1px solid #ffc85733;font-size:8px;line-height:1.5"><b style="color:#ffc857">⚠ RESET/AWARD CANDIDATE</b><br>${esc(e.meter_key||'—')} · ${money(e.before_eur)} → ${money(e.after_eur)} · Δ ${money(e.delta_eur)} · ${time(e.observed_at)}<br><span style="color:#9bb1a6">Evento científico: no demuestra por sí solo un premio ni autoriza jugar.</span></div>`;
  if(type==='CONTINUITY_GAP')return `<div style="margin-top:8px;font-size:8px;color:#ffb3b8">Gap de continuidad detectado · ${time(e.observed_at)}</div>`;
  return '';
}

function tierLine(label,key){
  const tier=lab.jpk?.research?.tiers?.[key];
  if(!tier)return `${label}: endpoint research pendiente`;
  const n=Number(tier?.aggregateCandidates?.candidateCount||0);
  const med=tier?.recentWindow?.beforeEUR?.median;
  return `${label}: ${n} caídas cand. · pre-caída mediana ${money(med)} · actual ${money(tier.currentEUR)}`;
}

function winfallBox(){
  const r=lab.winfall?.research;
  if(!r)return '';
  const count=Number(r?.pairedResetCandidates?.prospectiveCandidateCount||0);
  const need=Number(r?.protocol?.minimumProspectivePairedResetsForConditionalHazardFit||10);
  const d=r?.conditionalConstantHazardDiagnostic||{};
  const exactBound=r?.currentPair?.exactWinfallLiveIdVerified===true;
  const fit=d?.eligibleForFit===true;
  const conditional=fit&&Number.isFinite(Number(d?.breakEvenJackpotEURIfPairIsExactWinfallPoolAndCandidatesAreAwards))
    ?` · break-even condicional ${money(d.breakEvenJackpotEURIfPairIsExactWinfallPoolAndCandidatesAreAwards)}`:'';
  return `<div style="margin-top:7px;padding:8px;border-radius:11px;background:#7bbcff0a;border:1px solid #7bbcff22;font-size:7px;line-height:1.55"><b style="color:#9ed6ff">WINFALL · PROSPECTIVO DURABLE</b><br>Pares reset candidatos: <b>${count}/${need}</b> · binding exacto Winfall: <b style="color:#ffb3b8">${exactBound?'SÍ':'NO'}</b> · fit condicional: <b style="color:${fit?'#ffc857':'#9bb1a6'}">${fit?'DISPONIBLE':'BLOQUEADO'}</b>${conditional}<br><span style="color:#8fa79b">Pares ≠ premio · pares ≠ identidad · k constante es hipótesis · threshold condicional ≠ ejecución.</span></div>`;
}

function greenDistanceBox(){
  const rows=Array.isArray(lab.priority?.priority)?lab.priority.priority.slice(0,3):[];
  if(!rows.length)return '';
  const lines=rows.map(r=>{
    const blocker=Array.isArray(r.blocking)&&r.blocking.length?r.blocking[0]:'sin blocker resumido';
    return `<div style="margin-top:4px"><b>#${Number(r.rank)||'—'} · ${esc(r.name)}</b><br><span style="color:#9bb1a6">siguiente cierre: ${esc(blocker)}</span></div>`;
  }).join('');
  return `<div style="margin-top:8px;padding:9px;border-radius:12px;background:#f7c94b0b;border:1px solid #f7c94b26;font-size:7px;line-height:1.5"><div style="display:flex;justify-content:space-between;gap:8px"><b style="color:#ffd86b">CAMINO A GREEN</b><span style="color:#ff9aa2">NINGÚN THRESHOLD EJECUTABLE</span></div>${lines}<div style="margin-top:5px;color:#8fa79b">Ranking de distancia científica, no probabilidad de ganar. El contrato de ejecución sigue siendo la única autoridad.</div></div>`;
}

function render(){
  const p=panel(),s=lab.science?.science||null,t=lab.science?.telemetry||null,e=lab.evidence||null;
  if(!s){p.innerHTML='<div style="font-size:9px;font-weight:1000">LAB 24/7 · INICIALIZANDO</div><div style="margin-top:5px;font-size:8px;color:#91a99e">Esperando telemetría científica del backend permanente.</div>';return;}
  const resets=(lab.science?.recentEvents||[]).filter(x=>x?.type==='RESET_OR_AWARD_CANDIDATE');
  const candidate=e?.currentBestBaseRtpScreen;
  const trigger=e?.crossTitleTriggerFingerprint;
  const conflicts=Array.isArray(e?.spainOperatorManufacturerConflicts)?e.spainOperatorManufacturerConflicts:[];
  const irishConflict=conflicts.find(x=>String(x?.game||'').includes('Irish Riches'))||null;
  const mirrors=Array.isArray(t?.stableMirrorCandidates)?t.stableMirrorCandidates:[];
  const latest=(lab.science?.recentEvents||[])[0]||null;
  const triggerExamples=Array.isArray(trigger?.examples)?trigger.examples.map(x=>Number(x?.requiredOverlaySymbols)).filter(Number.isFinite):[];
  const triggerRange=triggerExamples.length?`${Math.min(...triggerExamples)}–${Math.max(...triggerExamples)} overlays según título/fuente`:'pendiente';
  const conflictLine=irishConflict?`<br><span style="color:#ffb3b8">Irish Riches ES: <b>${Number(irishConflict.operatorRequiredOverlaySymbols)||'—'}</b> símbolos vs Blueprint: <b>${Number(irishConflict.manufacturerRequiredOverlaySymbols)||'—'}</b> · <b>FINGERPRINT EN CONFLICTO</b> · no ejecutable.</span>`:'';
  const jpkResearch=lab.jpk?.research;
  const jpkBox=jpkResearch?`<div style="margin-top:7px;padding:8px;border-radius:11px;background:#ffffff07;border:1px solid #ffffff14;font-size:7px;line-height:1.55"><b style="color:#9ed6ff">JPK · DISTRIBUCIÓN DE CAÍDAS CANDIDATAS</b><br>${esc(tierLine('ROYAL','blueprint:JACKPOTKING_ROYAL'))}<br>${esc(tierLine('REGAL','blueprint:JACKPOTKING_REGAL'))}<br>${esc(tierLine('JACKPOT KING','blueprint:JACKPOTKING'))}<br><span style="color:#8fa79b">Caída ≠ premio · endpoint ≠ MBWB · distribución ≠ hazard/EV.</span></div>`:'';
  p.innerHTML=`
    <div style="display:flex;justify-content:space-between;gap:8px;align-items:center"><div><div style="font-size:8px;font-weight:1000;letter-spacing:.08em;color:#66eba4">LABORATORIO 24/7</div><div style="font-size:15px;font-weight:1000;margin-top:2px">Datos acumulándose aunque cierres el iPhone</div></div><span style="padding:5px 8px;border-radius:999px;background:#ff687212;border:1px solid #ff687244;color:#ff8c94;font-size:7px;font-weight:1000">INVESTIGACIÓN · 0 €</span></div>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:5px;margin-top:10px">
      <div style="padding:8px;background:#ffffff08;border-radius:10px;text-align:center"><small style="font-size:6px;color:#8fa79b">MUESTRAS</small><b style="display:block;font-size:13px;margin-top:2px">${Number(s.sampleCount||0).toLocaleString('es-ES')}</b></div>
      <div style="padding:8px;background:#ffffff08;border-radius:10px;text-align:center"><small style="font-size:6px;color:#8fa79b">CONTINUIDAD</small><b style="display:block;font-size:13px;margin-top:2px">${pct(s.gapFreePct)}</b></div>
      <div style="padding:8px;background:#ffffff08;border-radius:10px;text-align:center"><small style="font-size:6px;color:#8fa79b">GAPS</small><b style="display:block;font-size:13px;margin-top:2px">${Number(s.gapCount||0)}</b></div>
      <div style="padding:8px;background:#ffffff08;border-radius:10px;text-align:center"><small style="font-size:6px;color:#8fa79b">RESET CAND.</small><b style="display:block;font-size:13px;margin-top:2px">${resets.length}</b></div>
    </div>
    ${greenDistanceBox()}
    <div style="margin-top:9px;padding:9px;border-radius:12px;background:#29df860b;border:1px solid #29df8628;font-size:8px;line-height:1.55"><b style="color:#66eba4">JACKPOT KING · MEJOR BASE VERIFICADA EN ESTE PACK</b><br>${candidate?`${esc(candidate.game)} · base ${pct(candidate.baseRtp)}`:'Pendiente'}<br><span style="color:#9bb1a6">Pool compartido: sí · hazard igual por € entre títulos: <b style="color:#ffc857">NO DEMOSTRADO</b>. Contribución ≠ probabilidad.</span><br><span style="color:#9bb1a6">Fingerprint de entrada público: <b style="color:#ffc857">DIVERGENTE</b> · ${esc(triggerRange)}. Distinto trigger visible ≠ hazard cuantificado, pero prohíbe asumir igualdad.</span>${conflictLine}</div>
    ${jpkBox}
    ${winfallBox()}
    <div style="margin-top:7px;font-size:7px;color:#8fa79b">${Number(s.metersTracked||0)} contadores caracterizados · ${mirrors.length} pares espejo sostenidos · última muestra ${time(s.lastObservedAt)}</div>
    ${eventLine(latest)}
  `;
}

async function refreshScience(){try{lab.science=await j(`${BACKEND}/science/status?events=12`);lab.error=null;}catch(e){lab.error=String(e?.message||e);}render();}
async function refreshJpk(){try{lab.jpk=await j(`${BACKEND}/science/jpk?limit=200`);}catch{lab.jpk=null;}render();}
async function refreshWinfall(){try{lab.winfall=await j(`${BACKEND}/science/winfall?limit=500`);}catch{lab.winfall=null;}render();}
async function refreshEvidence(){try{lab.evidence=await j(EVIDENCE);}catch{}render();}
async function refreshPriority(){try{lab.priority=await j(PRIORITY);}catch{}render();}

refreshScience();refreshJpk();refreshWinfall();refreshEvidence();refreshPriority();render();
setInterval(refreshScience,5000);
setInterval(refreshJpk,15000);
setInterval(refreshWinfall,15000);
setInterval(refreshEvidence,60000);
setInterval(refreshPriority,60000);
window.addEventListener('online',()=>{refreshScience();refreshJpk();refreshWinfall();refreshPriority();});
document.addEventListener('visibilitychange',()=>{if(!document.hidden){refreshScience();refreshJpk();refreshWinfall();refreshPriority();}});

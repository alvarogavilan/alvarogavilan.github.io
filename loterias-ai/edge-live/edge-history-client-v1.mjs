const BACKEND='https://loterias-edge-sentinel.k8mwkbp68y.workers.dev';
const $=id=>document.getElementById(id);
const money=v=>Number.isFinite(Number(v))?Number(v).toLocaleString('es-ES',{style:'currency',currency:'EUR',minimumFractionDigits:2,maximumFractionDigits:2}):'—';
const pct=v=>Number.isFinite(Number(v))?(Number(v)*100).toFixed(1)+'%':'—';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const lab={ath:null,cycles:null};
async function j(path){const r=await fetch(`${BACKEND}${path}${path.includes('?')?'&':'?'}t=${Date.now()}`,{cache:'no-store'});if(!r.ok)throw new Error(`HTTP_${r.status}`);return r.json();}

function panel(){
  let p=$('edgeHistory24x7');
  if(p)return p;
  p=document.createElement('section');p.id='edgeHistory24x7';
  p.style.cssText='margin:12px 0 14px;border:1px solid #335b72;border-radius:18px;background:linear-gradient(145deg,#07121a,#0a2230);padding:12px;color:#eaf7ff;font-family:inherit;box-shadow:0 12px 30px #0004';
  const anchor=$('edgeScience24x7')||$('radarSummary')||$('radarList');
  if(anchor)anchor.insertAdjacentElement('afterend',p);else document.body.appendChild(p);
  return p;
}

function athRows(){
  const rows=Array.isArray(lab.ath?.research?.rows)?lab.ath.research.rows:[];
  return rows.filter(r=>Number.isFinite(Number(r.currentPctOfObservedATH))).sort((a,b)=>Number(b.currentPctOfObservedATH)-Number(a.currentPctOfObservedATH)).slice(0,5);
}
function cycleLeaders(){
  const rows=Array.isArray(lab.cycles?.research?.perMeter)?lab.cycles.research.perMeter:[];
  return rows.filter(r=>Number(r.fullObservedCandidateCycleCount)>0).sort((a,b)=>Number(b.fullObservedCandidateCycleCount)-Number(a.fullObservedCandidateCycleCount)).slice(0,5);
}

function render(){
  const p=panel();
  if(!lab.ath&&!lab.cycles){
    p.innerHTML='<div style="font-size:9px;font-weight:1000">HISTORIA 24/7 · ESPERANDO V11/V12</div><div style="margin-top:5px;font-size:7px;color:#91a9b7">El módulo falla cerrado si los endpoints históricos aún no están desplegados.</div>';
    return;
  }
  const a=lab.ath?.research||null,c=lab.cycles?.research||null;
  const as=a?.summary||{},cs=c?.summary||{};
  const athLines=athRows().map(r=>`<div style="margin-top:4px"><b>${esc(r.meterKey)}</b> · ${money(r.currentEUR)} · <span style="color:#9ed6ff">${pct(r.currentPctOfObservedATH)} ATH</span><br><span style="color:#8099a8">ATH observado ${money(r.observedATHSinceEdgeMonitoringEUR)}${r.athTimestampExact?' · fecha exacta':' · fecha histórica heredada no exacta'}</span></div>`).join('')||'<div style="margin-top:5px;color:#8099a8">ATH aún sin datos de runtime verificables.</div>';
  const cycleLines=cycleLeaders().map(r=>`<div style="margin-top:4px"><b>${esc(r.meterKey)}</b> · ${Number(r.fullObservedCandidateCycleCount)} ciclos completos candidatos<br><span style="color:#8099a8">pico medio ${money(r.averageFullObservedPeakEUR)} · pico máx ${money(r.maximumFullObservedPeakEUR)}</span></div>`).join('')||'<div style="margin-top:5px;color:#8099a8">Aún no hay ciclos completos post-v12.</div>';
  p.innerHTML=`
    <div style="display:flex;justify-content:space-between;gap:8px;align-items:center"><div><div style="font-size:8px;font-weight:1000;letter-spacing:.08em;color:#9ed6ff">HISTORIA 24/7</div><div style="font-size:14px;font-weight:1000;margin-top:2px">ATH + ciclos por contador</div></div><span style="padding:5px 8px;border-radius:999px;background:#ffc85710;border:1px solid #ffc85733;color:#ffc857;font-size:7px;font-weight:1000">HISTORIA ≠ EV</span></div>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:5px;margin-top:10px">
      <div style="padding:7px;background:#ffffff08;border-radius:10px;text-align:center"><small style="font-size:6px;color:#8099a8">METERS ATH</small><b style="display:block;font-size:12px;margin-top:2px">${Number(as.metersTracked||0)}</b></div>
      <div style="padding:7px;background:#ffffff08;border-radius:10px;text-align:center"><small style="font-size:6px;color:#8099a8">ATH FECHADOS</small><b style="display:block;font-size:12px;margin-top:2px">${Number(as.exactAthTimestampCount||0)}</b></div>
      <div style="padding:7px;background:#ffffff08;border-radius:10px;text-align:center"><small style="font-size:6px;color:#8099a8">CICLOS CAND.</small><b style="display:block;font-size:12px;margin-top:2px">${Number(cs.completedCandidateCycles||0)}</b></div>
      <div style="padding:7px;background:#ffffff08;border-radius:10px;text-align:center"><small style="font-size:6px;color:#8099a8">CICLOS COMPLETOS</small><b style="display:block;font-size:12px;margin-top:2px">${Number(cs.fullObservedCandidateCycles||0)}</b></div>
    </div>
    <div style="margin-top:9px;padding:8px;border-radius:11px;background:#ffffff07;border:1px solid #ffffff12;font-size:7px;line-height:1.5"><b style="color:#9ed6ff">MÁS CERCA DE SU ATH OBSERVADO</b>${athLines}</div>
    <div style="margin-top:7px;padding:8px;border-radius:11px;background:#ffffff07;border:1px solid #ffffff12;font-size:7px;line-height:1.5"><b style="color:#9ed6ff">CICLOS OBSERVADOS</b>${cycleLines}</div>
    <div style="margin-top:7px;font-size:7px;color:#8099a8">ATH = máximo observado desde EDGE, no máximo mundial anterior · reset candidato ≠ premio · ciclo completo candidato ≠ jackpot ganado · ${Number(cs.verifiedAwardCycles||0)} ciclos con premio verificado.</div>`;
}

async function refreshAth(){try{lab.ath=await j('/science/ath?limit=1000');}catch{lab.ath=null;}render();}
async function refreshCycles(){try{lab.cycles=await j('/science/cycles?limit=500');}catch{lab.cycles=null;}render();}
refreshAth();refreshCycles();render();
setInterval(refreshAth,30000);
setInterval(refreshCycles,30000);
window.addEventListener('online',()=>{refreshAth();refreshCycles();});
document.addEventListener('visibilitychange',()=>{if(!document.hidden){refreshAth();refreshCycles();}});

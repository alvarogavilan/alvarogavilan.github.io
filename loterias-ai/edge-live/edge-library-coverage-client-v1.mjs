const BACKEND='https://loterias-edge-sentinel.k8mwkbp68y.workers.dev';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pct=v=>Number.isFinite(Number(v))?(Number(v)*100).toFixed(2)+'%':'—';
let data=null;
async function load(){try{const r=await fetch(`${BACKEND}/library/coverage?t=${Date.now()}`,{cache:'no-store'});if(!r.ok)throw new Error();data=await r.json();}catch{data=null;}render();}
function render(){
  const parent=document.getElementById('edgeUniversalLibrary');if(!parent)return;
  let box=document.getElementById('edgeLibraryCoverage');if(!box){box=document.createElement('div');box.id='edgeLibraryCoverage';box.style.cssText='margin-top:8px;padding:8px;border-radius:11px;background:#ffffff06;border:1px solid #ffffff12;font-size:7px;line-height:1.45';parent.appendChild(box);}
  const c=data?.coverage;if(!c){box.innerHTML='<b style="color:#d4b5ff">COBERTURA HISTÓRICA</b><div style="margin-top:4px;color:#8e80a5">Esperando ledger de cobertura v14.</div>';return;}
  const rows=Array.isArray(c.rows)?c.rows:[];
  const lines=rows.map(r=>`<div style="margin-top:5px"><b>${esc(r.label)}</b> · <span style="color:${r.status==='COMPLETE_FOR_FROZEN_TARGET'?'#9be7ba':'#ffc857'}">${r.coveragePct===null?'TOTAL PENDIENTE DE CONGELAR':pct(r.coveragePct)}</span><br><span style="color:#8e80a5">guardados ${Number(r.observedCount||0).toLocaleString('es-ES')}${r.expectedCount!==null?' / '+Number(r.expectedCount).toLocaleString('es-ES'):''}${r.missingCount!==null?' · faltan '+Number(r.missingCount).toLocaleString('es-ES'):''}</span></div>`).join('');
  box.innerHTML=`<div style="display:flex;justify-content:space-between;gap:8px"><b style="color:#d4b5ff">COBERTURA HISTÓRICA</b><span>${Number(c.completeFrozenTargets||0)}/${Number(c.knownExpectedCountTargets||0)} objetivos congelados completos</span></div>${lines}<div style="margin-top:6px;color:#8e80a5">Nunca se marca “completo” si el total esperado no está congelado con evidencia oficial.</div>`;
}
load();setInterval(load,60000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)load();});
const wait=setInterval(()=>{if(document.getElementById('edgeUniversalLibrary')){clearInterval(wait);render();}},500);

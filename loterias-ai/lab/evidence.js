(function(){
'use strict';
if(!/\/loterias-ai\/(lab|laboratorio)\/?/.test(location.pathname))return;
const MAP={bonoloto:'bonoloto',primitiva:'primitiva',euromillones:'euromillones',gordo:'gordo-primitiva',eurodreams:'eurodreams'};
const pct=v=>Number.isFinite(Number(v))?(Number(v)*100).toFixed(2)+'%':'—';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let wf=null;
function verdict(g){
 const w=g?.winner,b=g?.baseline,ci=w?.excessConfidence95;
 if(!w||!b)return 'Sin ganador walk-forward normalizado';
 if(ci&&Number(ci.lower)>0)return 'Exceso medio > 0 con IC95% positivo';
 if(ci&&Number(ci.upper)<0)return 'Exceso medio < 0 con IC95% negativo';
 return 'IC95% del exceso medio cruza 0: no hay prueba global';
}
function summary(g){
 if(!g)return 'Sin evidencia walk-forward en este master';
 if(g.status!=='complete')return `${g.status||'pendiente'} · ${(g.draws||0).toLocaleString('es-ES')} sorteos`;
 const w=g.winner,b=g.baseline;
 return `${(w?.drawsEvaluated||0).toLocaleString('es-ES')} evaluaciones · ≥3 ${pct(w?.hitRateAtLeast3)} vs NULL ${pct(b?.hitRateAtLeast3)} · ${verdict(g)}`;
}
function ensureSide(){
 const side=document.getElementById('side');if(!side)return null;
 let line=document.getElementById('sideWalkForward');
 if(!line){line=document.createElement('div');line.id='sideWalkForward';line.className='sideLine';line.innerHTML='<b>EVIDENCIA WALK-FORWARD</b><span id="sideWalkForwardText">Selecciona un juego</span>';const truth=side.querySelector('.truth');if(truth)side.insertBefore(line,truth);else side.appendChild(line);}
 return document.getElementById('sideWalkForwardText');
}
function updateSide(det){const t=ensureSide();if(!t||!det)return;const key=MAP[det.dataset.id];t.textContent=key?summary(wf?.games?.[key]):'Este juego usa un modelo separado del walk-forward numérico master.';}
function boxFor(id,g){
 if(!g)return `<div class="box wfEvidence"><div class="boxtitle">EVIDENCIA WALK-FORWARD</div><div class="notice">Aún no existe evidencia numérica normalizada en el master para este juego.</div></div>`;
 const w=g.winner,b=g.baseline,ci=w?.excessConfidence95;
 return `<div class="box wfEvidence" style="margin-top:10px"><div class="boxtitle">EVIDENCIA WALK-FORWARD · RESEARCH ONLY</div><div class="metricrow"><div class="metric"><small>SORTEOS</small><strong>${(g.draws||0).toLocaleString('es-ES')}</strong></div><div class="metric"><small>EVALUADOS</small><strong>${(w?.drawsEvaluated||0).toLocaleString('es-ES')}</strong></div><div class="metric"><small>ESTRATEGIA</small><strong>${esc(w?.id||'—')}</strong></div><div class="metric"><small>≥3 / NULL</small><strong>${pct(w?.hitRateAtLeast3)} / ${pct(b?.hitRateAtLeast3)}</strong></div></div><div class="notice"><b>Lectura:</b> ${esc(verdict(g))}.${ci?` Exceso medio vs azar: ${Number(w.excessAverageHitsVsRandom||0).toFixed(4)}; IC95% ${Number(ci.lower).toFixed(4)} → ${Number(ci.upper).toFixed(4)}.`:''} Una mejora en ≥3 no equivale por sí sola a ventaja monetaria ni a un pleno predecible.</div></div>`;
}
function apply(){
 const list=document.getElementById('list');if(!list||!wf)return;
 list.querySelectorAll('.game').forEach(det=>{
   const id=det.dataset.id;if(det.querySelector('.wfEvidence'))return;
   const body=det.querySelector('.body');if(!body)return;
   const key=MAP[id];body.insertAdjacentHTML('beforeend',boxFor(id,key?wf.games?.[key]:null));
   if(!det.dataset.wfWired){det.dataset.wfWired='1';det.addEventListener('toggle',()=>{if(det.open)updateSide(det)});}
 });
 const open=list.querySelector('.game[open]');if(open)updateSide(open);
}
fetch('../data/backtests/master-walkforward.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error(r.status);return r.json()}).then(x=>{wf=x;apply();setTimeout(apply,1000);setTimeout(apply,3000)}).catch(()=>{});
})();

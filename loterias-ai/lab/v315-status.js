(()=>{
  'use strict';
  const STATUS='../data/research/metapleno-v315-prospective-status.json';
  const fmt=n=>Number(n||0).toLocaleString('es-ES');
  async function render(){
    const det=document.querySelector('.game[data-id="primitiva"]');
    if(!det)return;
    let host=det.querySelector('[data-v315-status]');
    if(!host){
      host=document.createElement('div');
      host.dataset.v315Status='1';
      host.className='notice';
      host.style.border='1px solid #315c80';
      host.style.background='#0a1f31';
      const body=det.querySelector('.body');
      if(!body)return;
      body.insertBefore(host,body.firstChild);
    }
    host.innerHTML='<b>v315 · Bonoloto → Primitiva</b><br> Cargando estado prospectivo ciego…';
    try{
      const r=await fetch(STATUS+'?v='+Date.now(),{cache:'no-store'});
      if(!r.ok)throw new Error('HTTP '+r.status);
      const d=await r.json(),p=d.progress||{},disc=d.disclosure||{};
      const settled=Number(p.officiallySettledTargets||0),boundary=Number(p.fixedDecisionBoundary||200),remaining=Number(p.remainingToFixedBoundary??Math.max(0,boundary-settled));
      host.innerHTML=`<b style="color:#54e4a3">v315 · TRANSFERENCIA PROSPECTIVA CIEGA</b><br>`+
        `Bonoloto → Primitiva · <b>${fmt(p.sealedTargets)}</b> objetivo(s) sellado(s) · <b>${fmt(settled)}/${fmt(boundary)}</b> oficialmente liquidados · faltan <b>${fmt(remaining)}</b> para la decisión fija.`+
        `<br>Primer objetivo sellado: <b>${p.firstSealedTarget||'—'}</b> · último: <b>${p.latestSealedTarget||'—'}</b>.`+
        `<br><span style="color:#89a7c4">${disc.candidatePerformanceHidden?'Rendimiento de los 12 candidatos oculto hasta la frontera de 200.':'Frontera final alcanzada.'} Sin retuning · sin optional stopping · SELAE obligatorio · dinero real: NO.</span>`;
    }catch(e){
      host.innerHTML='<b>v315 · prospectivo ciego</b><br><span style="color:#89a7c4">Estado administrativo no disponible ahora. El gabinete sigue funcionando sin inventar datos.</span>';
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',render,{once:true});else render();
  document.addEventListener('toggle',e=>{if(e.target?.matches?.('.game[data-id="primitiva"]')&&e.target.open)render();},true);
})();

(()=>{
  if(window.__LOT_AI_FULL_ETA__) return; window.__LOT_AI_FULL_ETA__=true;
  const SEEN='lotai_seen_proposals_v2';
  const fmt=n=>Number(n||0).toLocaleString('es-ES');
  const read=()=>{try{return Object.values(JSON.parse(localStorage.getItem(SEEN)||'{}'))}catch{return []}};
  const comb=(n,k)=>{let r=1;for(let i=1;i<=k;i++)r=r*(n-k+i)/i;return r};
  const totalComb=comb(49,6), budget8Lines=28, p=budget8Lines/totalComb;
  const expected=Math.round(1/p), median=Math.round(Math.log(.5)/Math.log(1-p));
  function injectShell(){
    if(document.getElementById('fullHorizon')) return;
    const stats=document.querySelector('.stats'); if(!stats) return;
    const sec=document.createElement('section');sec.id='fullHorizon';sec.className='card';
    sec.style.cssText='margin-top:12px;border-color:#cfe7da;background:linear-gradient(180deg,#fff,#f5fbf8)';
    sec.innerHTML='<div class="row"><div><div class="name">Horizonte al pleno</div><div class="meta">Estimación descriptiva, nunca cuenta atrás ni promesa.</div></div><span class="badge pending">AUTO-CALIBRADO</span></div><div class="metrics" style="margin-top:12px"><div class="metric"><small>Sorteos observados</small><strong id="etaObserved">—</strong></div><div class="metric"><small>ETA empírica AI</small><strong id="etaEmpirical">—</strong></div><div class="metric"><small>Azar Budget8</small><strong id="etaBaseline">—</strong></div></div><div class="evidence" id="etaExplain">Calculando...</div>';
    stats.insertAdjacentElement('afterend',sec);
  }
  async function render(){
    injectShell(); if(!document.getElementById('fullHorizon')) return;
    const seen=read(), draws=new Set(seen.map(x=>`${x.gameId}|${x.targetDate}`));
    document.getElementById('etaObserved').textContent=fmt(draws.size);
    document.getElementById('etaBaseline').textContent='~'+fmt(expected);
    try{
      const d=await fetch('../data/research/metapleno-research-registry.json?eta='+Date.now(),{cache:'no-store'}).then(r=>{if(!r.ok)throw 0;return r.json()});
      const s=d.summary||{}, clean=Number(s.repeatFullSignalArtifacts||0), configs=Number(s.knownCandidateConfigurations||0), single=Number(s.singleFullSignalArtifacts||0);
      if(clean>0){
        const configsPer=Math.round(configs/clean);
        document.getElementById('etaEmpirical').textContent='~'+fmt(configsPer)+' cfg';
        document.getElementById('etaExplain').innerHTML=`Con ${fmt(clean)} pleno(s) replicado(s), el ritmo observado es ~<b>${fmt(configsPer)} configuraciones por pleno limpio</b>. Es una extrapolación del laboratorio, no una predicción de fecha. En modo real llevamos <b>${fmt(draws.size)} sorteo(s) observado(s)</b>.`;
      }else{
        document.getElementById('etaEmpirical').textContent='Aún no estimable';
        document.getElementById('etaExplain').innerHTML=`Hemos registrado <b>${fmt(configs)} configuraciones</b>, pero todavía <b>0 plenos replicados</b>. ${single?`Existe ${fmt(single)} pleno aislado de investigación, pero no sirve para calibrar una ETA fiable. `:''}Como referencia puramente aleatoria, un Budget8 de 28 líneas tiene un pleno esperado aproximadamente cada <b>${fmt(expected)} sorteos</b> (mediana ~${fmt(median)}). Nuestro objetivo es demostrar una tasa prospectiva significativamente mejor antes de usar una ETA propia.`;
      }
    }catch{
      document.getElementById('etaEmpirical').textContent='Datos pendientes';
      document.getElementById('etaExplain').textContent='No se ha podido leer el registro científico. No se estima el horizonte.';
    }
  }
  render(); setInterval(render,5*60*1000);
})();

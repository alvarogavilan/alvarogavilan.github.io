(()=>{
  if(window.__LOT_AI_FULL_ETA__) return; window.__LOT_AI_FULL_ETA__=true;
  const SEEN='lotai_seen_proposals_v2';
  const fmt=n=>Number(n||0).toLocaleString('es-ES');
  const read=()=>{try{return Object.values(JSON.parse(localStorage.getItem(SEEN)||'{}'))}catch{return []}};
  const comb=(n,k)=>{let r=1;for(let i=1;i<=k;i++)r=r*(n-k+i)/i;return r};
  const totalComb=comb(49,6), budget8Lines=28, p=budget8Lines/totalComb;
  const expected=Math.round(1/p), median=Math.round(Math.log(.5)/Math.log(1-p));
  const MIN_REPLICATED_FULLS=3;
  function injectShell(){
    if(document.getElementById('fullHorizon'))return;
    const stats=document.querySelector('.stats');if(!stats)return;
    const sec=document.createElement('section');sec.id='fullHorizon';sec.className='card';
    sec.style.cssText='margin-top:12px;border-color:#cfe7da;background:linear-gradient(180deg,#fff,#f5fbf8)';
    sec.innerHTML='<div class="row"><div><div class="name">Horizonte al pleno</div><div class="meta">Estimación auditada: nunca cuenta atrás ni promesa.</div></div><span class="badge pending" id="etaBadge">EVIDENCIA EN CURSO</span></div><div class="metrics" style="margin-top:12px"><div class="metric"><small>Sorteos reales observados</small><strong id="etaObserved">—</strong></div><div class="metric"><small>Ritmo empírico AI</small><strong id="etaEmpirical">—</strong></div><div class="metric"><small>Referencia azar Budget8</small><strong id="etaBaseline">—</strong></div></div><div class="evidence" id="etaExplain">Calculando...</div><div class="evidence" id="etaRequirements" style="margin-top:8px"></div>';
    stats.insertAdjacentElement('afterend',sec)
  }
  async function render(){
    injectShell();if(!document.getElementById('fullHorizon'))return;
    const seen=read(),draws=new Set(seen.map(x=>`${x.gameId}|${x.targetDate||x.drawDate||'sin-fecha'}`));
    document.getElementById('etaObserved').textContent=fmt(draws.size);
    document.getElementById('etaBaseline').textContent='~'+fmt(expected)+' sorteos';
    try{
      const d=await fetch('../data/research/metapleno-research-registry.json?eta='+Date.now(),{cache:'no-store'}).then(r=>{if(!r.ok)throw 0;return r.json()});
      const s=d.summary||{},clean=Number(s.repeatFullSignalArtifacts||0),configs=Number(s.knownCandidateConfigurations||0),single=Number(s.singleFullSignalArtifacts||0);
      const remaining=Math.max(0,MIN_REPLICATED_FULLS-clean);
      const badge=document.getElementById('etaBadge');
      if(clean>=MIN_REPLICATED_FULLS){
        const configsPer=Math.max(1,Math.round(configs/clean));
        document.getElementById('etaEmpirical').textContent='~'+fmt(configsPer)+' cfg/pleno';
        badge.textContent='CALIBRACIÓN DISPONIBLE';
        document.getElementById('etaExplain').innerHTML=`El laboratorio acumula <b>${fmt(clean)} plenos replicados</b> sobre <b>${fmt(configs)} configuraciones</b>: ritmo descriptivo ~<b>${fmt(configsPer)} configuraciones por pleno replicado</b>. Esto describe el laboratorio; no predice cuándo llegará el siguiente pleno real.`;
        document.getElementById('etaRequirements').innerHTML=`<b>Qué exigimos antes de convertirlo en una ETA útil:</b> supervivencia fuera de muestra y prospectiva congelada, comparación contra NULL/azar y estabilidad del efecto. Si la ventaja no sobrevive, la ETA vuelve a bloquearse.`;
      }else{
        document.getElementById('etaEmpirical').textContent='NO ESTIMABLE';
        badge.textContent='BLOQUEADO POR EVIDENCIA';
        document.getElementById('etaExplain').innerHTML=`<b>Por qué no podemos estimarlo todavía:</b> hay <b>${fmt(configs)} configuraciones investigadas</b>, <b>${fmt(clean)} plenos replicados</b> y ${single?`<b>${fmt(single)} pleno(s) aislado(s)</b>`:'<b>0 plenos aislados registrados</b>'}. Un acierto aislado puede ser azar y no permite inferir una frecuencia reproducible. Inventar ahora una fecha sería científicamente falso.`;
        document.getElementById('etaRequirements').innerHTML=`<b>Qué falta exactamente:</b> exigimos al menos <b>${MIN_REPLICATED_FULLS} plenos replicados</b> como umbral operativo inicial; faltan <b>${fmt(remaining)}</b>. Después deberán sobrevivir a validación OOS/prospectiva y superar controles NULL. Referencia sin ventaja: 28 líneas entre ${fmt(totalComb)} combinaciones ⇒ esperanza ~<b>${fmt(expected)} sorteos</b>, mediana ~<b>${fmt(median)}</b>.`;
      }
    }catch{
      document.getElementById('etaEmpirical').textContent='DATOS PENDIENTES';
      document.getElementById('etaBadge').textContent='REGISTRO NO DISPONIBLE';
      document.getElementById('etaExplain').textContent='No se ha podido leer el registro científico. El sistema se niega a estimar el horizonte sin evidencia verificable.';
      document.getElementById('etaRequirements').textContent='Acción requerida: recuperar el registro, validar integridad y recalcular. No se sustituye la ausencia de datos por una estimación inventada.';
    }
  }
  render();setInterval(render,5*60*1000);
})();

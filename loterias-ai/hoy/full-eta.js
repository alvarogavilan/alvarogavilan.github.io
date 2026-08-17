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
    sec.innerHTML='<div class="row"><div><div class="name">Horizonte al pleno</div><div class="meta">Estado auditado: evidencia útil, nunca cuenta atrás ni promesa.</div></div><span class="badge pending" id="etaBadge">EVIDENCIA EN CURSO</span></div><div class="metrics" style="margin-top:12px"><div class="metric"><small>INTENTOS PROSPECTIVOS EVALUADOS</small><strong id="etaObserved">—</strong></div><div class="metric"><small>MEJOR RESULTADO PROSPECTIVO</small><strong id="etaEmpirical">—</strong></div><div class="metric"><small>REFERENCIA AZAR BUDGET8</small><strong id="etaBaseline">—</strong></div></div><div class="evidence" id="etaExplain">Calculando...</div><div class="evidence" id="etaRequirements" style="margin-top:8px"></div>';
    stats.insertAdjacentElement('afterend',sec)
  }
  async function render(){
    injectShell();if(!document.getElementById('fullHorizon'))return;
    const localSeen=read(),localDraws=new Set(localSeen.map(x=>`${x.gameId}|${x.targetDate||x.drawDate||'sin-fecha'}`));
    document.getElementById('etaObserved').textContent=fmt(localDraws.size);
    document.getElementById('etaEmpirical').textContent='—';
    document.getElementById('etaBaseline').textContent='~'+fmt(expected)+' sorteos';
    try{
      const [d,ledger]=await Promise.all([
        fetch('../data/research/metapleno-research-registry.json?eta='+Date.now(),{cache:'no-store'}).then(r=>{if(!r.ok)throw 0;return r.json()}),
        fetch('../data/shadow/public-attempts-v1.json?eta='+Date.now(),{cache:'no-store'}).then(r=>r.ok?r.json():null).catch(()=>null)
      ]);
      const s=d.summary||{},clean=Number(s.repeatFullSignalArtifacts||0),configs=Number(s.knownCandidateConfigurations||0),single=Number(s.singleFullSignalArtifacts||0);
      const attempts=Array.isArray(ledger?.attempts)?ledger.attempts:[],evaluated=Number(ledger?.counts?.evaluated||attempts.length||localDraws.size),best=attempts.length?Math.max(...attempts.map(a=>Number(a.bestMainHits||0))):0;
      const latest=attempts.slice().sort((a,b)=>String(b.targetDrawDate||'').localeCompare(String(a.targetDrawDate||'')))[0];
      const remaining=Math.max(0,MIN_REPLICATED_FULLS-clean),badge=document.getElementById('etaBadge');
      document.getElementById('etaObserved').textContent=fmt(evaluated);
      document.getElementById('etaEmpirical').textContent=attempts.length?`${best}/6`:'SIN LEDGER';
      if(clean>=MIN_REPLICATED_FULLS){
        const configsPer=Math.max(1,Math.round(configs/clean));
        badge.textContent='CALIBRACIÓN DESCRIPTIVA';
        document.getElementById('etaExplain').innerHTML=`El laboratorio acumula <b>${fmt(clean)} plenos replicados</b> sobre <b>${fmt(configs)} configuraciones</b> (~<b>${fmt(configsPer)} configuraciones por pleno replicado</b>). En el ledger prospectivo público hay <b>${fmt(evaluated)} intentos evaluados</b> y el mejor resultado observado es <b>${best}/6</b>${latest?.targetDrawDate?` (último objetivo: <b>${latest.targetDrawDate}</b>)`:''}. Esto describe lo ocurrido; no predice la fecha del próximo pleno.`;
        document.getElementById('etaRequirements').innerHTML='<b>Para convertirlo en un horizonte defendible:</b> la frecuencia debe sobrevivir fuera de muestra, prospectiva congelada, controles NULL/azar y replicación temporal suficiente. Si falla cualquiera de esos controles, el horizonte permanece bloqueado.';
      }else{
        badge.textContent='HORIZONTE BLOQUEADO';
        document.getElementById('etaExplain').innerHTML=`<b>No hay una ETA honesta todavía.</b> Sí hay información útil: <b>${fmt(configs)} configuraciones investigadas</b>, <b>${fmt(clean)} plenos replicados</b>, <b>${fmt(evaluated)} intentos prospectivos evaluados</b> y mejor resultado prospectivo <b>${best}/6</b>${latest?.targetDrawDate?` con último sorteo objetivo <b>${latest.targetDrawDate}</b>`:''}. Un acierto aislado o una muestra corta no permite inferir cuándo llegará un pleno.`;
        document.getElementById('etaRequirements').innerHTML=`<b>Qué falta exactamente:</b> umbral operativo inicial de <b>${MIN_REPLICATED_FULLS} plenos replicados</b>; faltan <b>${fmt(remaining)}</b>. Después deben sobrevivir OOS/prospectiva y superar NULL. ${single?`Hay además <b>${fmt(single)} señal(es) de pleno aislada(s)</b> que no cuentan como réplica. `:''}<br><b>Referencia sin ventaja:</b> 28 líneas entre ${fmt(totalComb)} combinaciones ⇒ esperanza ~<b>${fmt(expected)} sorteos</b>, mediana ~<b>${fmt(median)}</b>. No es una predicción del laboratorio.`;
      }
    }catch{
      document.getElementById('etaBadge').textContent='REGISTRO NO DISPONIBLE';
      document.getElementById('etaExplain').textContent='No se ha podido leer el registro científico. El sistema se niega a estimar el horizonte sin evidencia verificable.';
      document.getElementById('etaRequirements').textContent='Acción requerida: recuperar el registro, validar integridad y recalcular. No se sustituye la ausencia de datos por una estimación inventada.';
    }
  }
  render();setInterval(render,5*60*1000);
})();

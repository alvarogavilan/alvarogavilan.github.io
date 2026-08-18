(function(){
  'use strict';
  if(!/\/loterias-ai\/(lab|laboratorio)\/?/.test(location.pathname)) return;

  const GAMES=[
    {id:'euromillones',name:'Euromillones',rule:'5/50 + 2/12 Estrellas',space:'139.838.160 combinaciones',state:'EN INVESTIGACIÓN',min:'250 sorteos',priority:'HIGH',dims:'frecuencia · gaps · estabilidad · pares · estructura · walk-forward · holdout · NULL'},
    {id:'primitiva',name:'La Primitiva',rule:'6/49 + Reintegro',space:'139.838.160 combinaciones incluyendo reintegro',state:'ARTEFACTO CONGELADO',min:'250 sorteos',priority:'HIGH',dims:'frecuencia · gaps · estabilidad · afinidades · estructura · walk-forward · holdout · economía',model:'../data/daily/primitiva-model-next.json'},
    {id:'bonoloto',name:'Bonoloto',rule:'6/49 + Reintegro',space:'139.838.160 combinaciones incluyendo reintegro',state:'ARTEFACTO CONGELADO',min:'250 sorteos',priority:'HIGH',dims:'frecuencia · gaps · momentum · mean reversion · pares · walk-forward · holdout · economía',model:'../data/daily/bonoloto-model-latest.json'},
    {id:'gordo',name:'El Gordo de la Primitiva',rule:'5/54 + Clave',space:'31.625.100 combinaciones',state:'EN INVESTIGACIÓN',min:'200 sorteos',priority:'HIGH',dims:'frecuencia · gaps · estabilidad · estructura · walk-forward · holdout · NULL'},
    {id:'eurodreams',name:'EuroDreams',rule:'6/40 + Sueño 1/5',space:'19.191.900 combinaciones',state:'EN INVESTIGACIÓN',min:'150 sorteos',priority:'HIGH',dims:'frecuencia · gaps · estructura · régimen de premios · walk-forward · holdout'},
    {id:'loteria-nacional',name:'Lotería Nacional',rule:'Número 00000–99999',space:'100.000 números',state:'EN INVESTIGACIÓN',min:'300 sorteos',priority:'VERY HIGH',dims:'número completo · posiciones · terminaciones · reintegros · tipo de sorteo · día · premios · geografía descriptiva'},
    {id:'navidad',name:'Lotería de Navidad',rule:'Número 00000–99999',space:'100.000 números',state:'ESTACIONAL',min:'50 sorteos',priority:'DEFERRED SEASONAL',dims:'número completo · terminaciones · series históricas · estructura de premios · control estacional'},
    {id:'nino',name:'El Niño',rule:'Número 00000–99999',space:'100.000 números',state:'ESTACIONAL',min:'50 sorteos',priority:'DEFERRED SEASONAL',dims:'número completo · terminaciones · reintegros · estructura de premios · control estacional'},
    {id:'quiniela',name:'La Quiniela',rule:'14 partidos · 1/X/2',space:'modelo específico de fútbol',state:'MODELO SEPARADO',min:'modelo separado',priority:'HIGH',dims:'probabilidad 1X2 · calibración por partido · dependencia del boleto · holdout cronológico'},
    {id:'elige8',name:'Elige8',rule:'8 partidos · 1/X/2',space:'modelo específico de fútbol',state:'MODELO SEPARADO',min:'modelo separado',priority:'HIGH',dims:'probabilidad 1X2 · calibración · selección de eventos · holdout cronológico'},
    {id:'quinigol',name:'Quinigol',rule:'6 partidos · 0/1/2/M',space:'modelo específico de marcadores',state:'MODELO SEPARADO',min:'modelo separado',priority:'HIGH',dims:'distribución de goles · marcadores 0/1/2/M · calibración · holdout cronológico'},
    {id:'lototurf',name:'Lototurf',rule:'Carreras hípicas',space:'espacio específico por carrera',state:'MODELO SEPARADO',min:'modelo separado',priority:'HIGH',dims:'participantes · pista · distancia · condiciones · probabilidades por carrera · validación'},
    {id:'quintuple-plus',name:'Quíntuple Plus',rule:'Carreras hípicas',space:'espacio específico por carrera',state:'MODELO SEPARADO',min:'modelo separado',priority:'HIGH',dims:'participantes · orden de llegada · pista · distancia · probabilidades · validación'}
  ];

  const esc=v=>String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
  const cls=s=>s==='ARTEFACTO CONGELADO'?'live':s==='MODELO SEPARADO'?'sep':'work';
  function fallbackCard(g){
    return `<details class="game resilient-game" data-id="${esc(g.id)}" data-name="${esc(g.name)}" data-rule="${esc(g.rule)}" data-space="${esc(g.space)}" data-state="${esc(g.state)}"${g.model?` data-model="${esc(g.model)}"`:''}><summary><div class="sumleft"><div class="name">${esc(g.name)}</div><div class="brief">${esc(g.rule)} · ${esc(g.space)}</div></div><span class="tag ${cls(g.state)}">${esc(g.state)}</span></summary><div class="body"><div class="detailgrid"><div><div class="box"><div class="boxtitle">QUÉ ESTUDIA ESTE GABINETE</div><div class="rules">${esc(g.rule)}</div><div class="meta">${esc(g.space)} · histórico mínimo: <b>${esc(g.min)}</b> · prioridad: <b>${esc(g.priority)}</b>.</div><div class="notice"><b>Dimensiones:</b> ${esc(g.dims)}</div></div><div class="model" id="res-model-${esc(g.id)}"><div class="notice">${g.model?'Abre este gabinete para cargar sus combinaciones congeladas reales.':'No hay un artefacto congelado con números publicado ahora para este juego; no se inventan combinaciones.'}</div></div></div><div><div class="box"><div class="boxtitle">RESUMEN CLARO</div><div class="metricrow"><div class="metric"><small>ESTADO</small><strong>${esc(g.state)}</strong></div><div class="metric"><small>HISTÓRICO</small><strong>${esc(g.min)}</strong></div><div class="metric"><small>PRIORIDAD</small><strong>${esc(g.priority)}</strong></div><div class="metric"><small>ARTEFACTO</small><strong>${g.model?'sí':'no'}</strong></div></div></div></div></div></div></details>`;
  }

  function updateSide(det,m){
    const title=document.getElementById('sideTitle'),rules=document.getElementById('sideRules'),space=document.getElementById('sideSpace'),state=document.getElementById('sideState'),combos=document.getElementById('sideCombos');
    if(title) title.textContent=det.dataset.name||'—';
    if(rules) rules.textContent=det.dataset.rule||'—';
    if(space) space.textContent=det.dataset.space||'—';
    if(state) state.textContent=m?.status||det.dataset.state||'—';
    if(combos) combos.textContent=m?.tickets?.length?`${m.tickets.length} combinación(es) · objetivo ${m.targetDrawDate||'—'}`:(det.dataset.model?'artefacto disponible':'ninguna congelada publicada ahora');
  }

  async function loadModel(det){
    if(!det.dataset.model||det.dataset.resLoaded) return;
    det.dataset.resLoaded='1';
    const el=document.getElementById('res-model-'+det.dataset.id);
    if(!el) return;
    el.innerHTML='<div class="notice">Cargando artefacto congelado…</div>';
    try{
      const r=await fetch(det.dataset.model,{cache:'no-store'}); if(!r.ok) throw new Error('HTTP '+r.status);
      const m=await r.json(),tickets=Array.isArray(m.tickets)?m.tickets:[];
      el.innerHTML=`<div class="box"><div class="boxtitle">COMBINACIONES CONGELADAS · OBJETIVO ${esc(m.targetDrawDate||'—')}</div><div class="meta">Estado: <b>${esc(m.status||'—')}</b> · Estrategia: <b>${esc(m.strategy||'—')}</b> · Histórico: <b>${Number(m.historyCount||0).toLocaleString('es-ES')}</b> sorteos.</div>${tickets.length?tickets.map(t=>`<div class="ticket"><div><div class="nums">${(t.numbers||[]).map(esc).join(' · ')}</div><div class="meta">Combinación ${esc(t.ticket||'')}</div></div></div>`).join(''):'<div class="notice">El artefacto no contiene combinaciones.</div>'}<div class="notice">Fotografía científica emitida antes del resultado objetivo; no equivale a recomendación vigente.</div></div>`;
      updateSide(det,m);
    }catch(e){
      det.dataset.resLoaded='';
      el.innerHTML=`<div class="notice err">No se pudo cargar el artefacto (${esc(e.message)}), pero el desplegable sigue funcionando.</div>`;
    }
  }

  function wire(list){
    list.querySelectorAll('.game').forEach(det=>{
      if(det.dataset.resWired) return;
      det.dataset.resWired='1';
      det.addEventListener('toggle',()=>{
        if(!det.open) return;
        list.querySelectorAll('.game').forEach(x=>{if(x!==det)x.open=false});
        updateSide(det);
        if(det.classList.contains('resilient-game')) loadModel(det);
      });
    });
  }

  function injectEconomicLink(){
    if(document.getElementById('lightningEconomicLink')) return;
    const side=document.getElementById('side');
    if(!side) return;
    const wrap=document.createElement('div');
    wrap.id='lightningEconomicLink';
    wrap.className='truth';
    wrap.style.marginTop='12px';
    wrap.innerHTML='<b style="display:block;color:#ffd166;margin-bottom:5px">⚡ LIGHTNING · SEGMENTO LIMPIO V2</b><span>Fuente autoritativa nueva tras la discontinuidad · timing v3 · RNG físico v2 · 132 selectores con warm-up ciego.</span><br><a href="../casino/economia/segmento-limpio/" style="display:inline-block;margin-top:7px;font-weight:900">Abrir panel limpio →</a><br><a href="../casino/economia/" style="display:inline-block;margin-top:7px">Abrir estudio económico completo →</a>';
    side.appendChild(wrap);
  }

  function ensure(){
    const list=document.getElementById('list'); if(!list) return;
    if(list.querySelectorAll('.game').length===0){
      list.className='';
      list.innerHTML=GAMES.map(fallbackCard).join('');
      const games=document.getElementById('games'),numeric=document.getElementById('numeric'),frozen=document.getElementById('frozen');
      if(games) games.textContent='13'; if(numeric) numeric.textContent='8'; if(frozen) frozen.textContent='2';
    }
    wire(list);
    injectEconomicLink();
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>{setTimeout(ensure,900);setTimeout(ensure,2500)});
  else {setTimeout(ensure,900);setTimeout(ensure,2500)}
})();

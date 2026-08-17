(()=>{
  if(window.__LOT_AI_ATTEMPT_LEDGER_UI__) return;
  window.__LOT_AI_ATTEMPT_LEDGER_UI__=true;
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const eur=n=>Number(n||0).toLocaleString('es-ES',{style:'currency',currency:'EUR'});
  const gameNames={bonoloto:'Bonoloto',primitiva:'Primitiva',euromillones:'Euromillones',eurodreams:'EuroDreams',gordo:'El Gordo','gordo-primitiva':'El Gordo',quiniela:'Quiniela',quinigol:'Quinigol','loteria-nacional':'Lotería Nacional'};
  const PLAYED='lotai_played_v2';
  const readPlayed=()=>{try{return Object.values(JSON.parse(localStorage.getItem(PLAYED)||'{}'))}catch{return []}};
  const dateTime=v=>{if(!v)return '—';try{return new Intl.DateTimeFormat('es-ES',{timeZone:'Europe/Madrid',dateStyle:'short',timeStyle:'short'}).format(new Date(v))}catch{return String(v)}};
  const drawDate=v=>{if(!v)return 'SIN FECHA';try{return new Intl.DateTimeFormat('es-ES',{timeZone:'Europe/Madrid',day:'2-digit',month:'2-digit',year:'numeric'}).format(new Date(v+'T12:00:00Z'))}catch{return String(v)}};
  let suppress=false,lastPayload=null;
  const playedFor=a=>readPlayed().some(p=>p.gameId===a.game&&p.targetDate===a.targetDrawDate);
  function ticketHTML(t){const nums=Array.isArray(t.numbers)?t.numbers.join(' · '):'selección no normalizada';return `<div class="ticket"><div><div class="nums">${esc(nums)}</div><div class="meta">${esc(t.label||'candidato')} · ${Number(t.mainHits||0)}/6${t.complementaryHit?' · complementario':''}</div></div></div>`}
  function attemptHTML(a){
    const r=a.officialResult||{},main=Array.isArray(r.main)?r.main:[],tickets=Array.isArray(a.tickets)?a.tickets:[],pool=Array.isArray(a.coveragePool)?a.coveragePool:[],pm=a.postmortem||{},played=playedFor(a),full=a.fullTargetHit===true,mode=a.mode||'PAPER';
    const extras=[r.complementary!=null?`C ${esc(r.complementary)}`:'',r.reintegro!=null?`R ${esc(r.reintegro)}`:''].filter(Boolean).join(' · ');
    const frozen=a.frozenAt?dateTime(a.frozenAt):'freeze no normalizado en legado';
    return `<div class="historyrow" style="padding:14px 0"><div class="row"><div><div class="name">${esc(gameNames[a.game]||a.game)} · ${drawDate(a.targetDrawDate)}</div><div class="meta">${esc(a.engine||'motor sin nombre')} · ${esc(a.status||'EVALUADO')}</div><span class="badge ${full?'ok':'result'}">${full?'PLENO VALIDADO':`${esc(mode)} · ${Number(a.bestMainHits||0)}/6`}</span></div><div style="text-align:right"><div class="hitbig">${Number(a.bestMainHits||0)}/6</div><div class="meta">${played?'MARCADA COMO JUGADA EN ESTE DISPOSITIVO':Number(a.realStakeEUR||0)>0?'DINERO REAL':'0 € REALES'}</div></div></div><div class="evidence"><b>Sorteo oficial:</b> ${main.length?main.map(esc).join(' · '):'resultado no normalizado'}${extras?` · ${extras}`:''}<div class="meta" style="margin-top:4px">Verificación: ${esc(r.verification||'persistida')} · evaluado ${dateTime(a.evaluatedAt)}</div></div>${tickets.length?`<div class="evidence"><b>Selección congelada antes del resultado</b>${tickets.map(ticketHTML).join('')}</div>`:pool.length?`<div class="evidence"><b>Pool congelado:</b> ${pool.map(esc).join(' · ')}<div class="meta">El artefacto legado no guardó tickets normalizados; no se reconstruyen a posteriori.</div></div>`:`<div class="evidence"><b>Selección:</b> el artefacto legado no conserva una representación pública normalizada. No se inventa.</div>`}<div class="metrics" style="margin-top:8px"><div class="metric"><small>FECHA OBJETIVO</small><strong>${drawDate(a.targetDrawDate)}</strong></div><div class="metric"><small>FREEZE</small><strong style="font-size:10px">${esc(frozen)}</strong></div><div class="metric"><small>COSTE TEÓRICO</small><strong>${eur(a.theoreticalCostEUR)}</strong></div></div><div class="evidence"><b>Post-mortem científico</b><div style="margin-top:5px">${esc(pm.explanation||'Sin explicación causal demostrada.')}</div>${pm.learning?`<div class="meta" style="margin-top:5px"><b>Aprendizaje:</b> ${esc(pm.learning)}</div>`:''}${pm.nextAction?`<div class="meta" style="margin-top:5px"><b>Siguiente prueba:</b> ${esc(pm.nextAction)}</div>`:''}<div class="meta" style="margin-top:5px">Causa atribuida: <b>${esc(pm.causalAttribution||'UNKNOWN')}</b> · integridad prospectiva: <b>${a.prospectiveIntegrity===true?'SÍ':'NO CONFIRMADA'}</b></div></div></div>`;
  }
  async function render(){
    const el=document.getElementById('attemptResults');if(!el)return;
    try{
      const r=await fetch('../data/shadow/public-attempts-v1.json?ui='+Date.now(),{cache:'no-store'});if(!r.ok)throw new Error('ledger '+r.status);
      const d=await r.json(),arr=Array.isArray(d.attempts)?d.attempts:[];lastPayload=d;
      if(!arr.length)return;
      suppress=true;
      el.dataset.source='public-attempts-v1';
      el.innerHTML=`<div class="row" style="margin-bottom:8px"><div><div class="name">Ledger científico persistente</div><div class="meta">No depende de este iPhone · generado ${dateTime(d.generatedAt)}</div></div><span class="badge result">${Number(d.counts?.evaluated||arr.length)} EVALUADOS</span></div>${arr.slice().sort((a,b)=>String(b.targetDrawDate||'').localeCompare(String(a.targetDrawDate||''))).slice(0,12).map(attemptHTML).join('')}<div class="meta" style="margin-top:10px">Fuente: evaluaciones persistidas en GitHub. No se reconstruyen resultados desde el chat ni se usa información futura para seleccionar.</div>`;
      setTimeout(()=>{suppress=false},0);
    }catch(e){
      if(!lastPayload) console.warn('Loterías AI: ledger persistente no disponible; se conserva el fallback local.',e);
    }
  }
  const el=document.getElementById('attemptResults');
  if(el){const obs=new MutationObserver(()=>{if(!suppress)setTimeout(render,60)});obs.observe(el,{childList:true,subtree:false})}
  setTimeout(render,120);setTimeout(render,900);setInterval(render,5*60*1000);
})();

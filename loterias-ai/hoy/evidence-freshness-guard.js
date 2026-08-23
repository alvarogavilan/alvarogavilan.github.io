(()=>{
  const MAX_AGE_MS=2*60*60*1000;
  const $=id=>document.getElementById(id);
  window.__LOTERIAS_AI_TODAY_EVIDENCE_FRESH__=false;
  const madridDate=()=>{
    const p=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Madrid',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
    const g=t=>p.find(x=>x.type===t)?.value;
    return `${g('year')}-${g('month')}-${g('day')}`;
  };
  const blockActions=()=>{
    document.querySelectorAll('[data-play],.copybtn').forEach(b=>{
      b.disabled=true;
      b.setAttribute('aria-disabled','true');
      b.setAttribute('title','Bloqueado: evidencia operativa desfasada');
      b.style.opacity='.45';
      b.style.pointerEvents='none';
    });
  };
  const unblockActions=()=>{
    document.querySelectorAll('[data-play],.copybtn').forEach(b=>{
      b.disabled=false;
      b.removeAttribute('aria-disabled');
      if(b.getAttribute('title')==='Bloqueado: evidencia operativa desfasada')b.removeAttribute('title');
      b.style.opacity='';
      b.style.pointerEvents='';
    });
  };
  const block=(message)=>{
    window.__LOTERIAS_AI_TODAY_EVIDENCE_FRESH__=false;
    const fresh=$('freshLabel'),games=$('todayGames'),gate=$('gate');
    if(fresh){fresh.textContent='EVIDENCIA DESFASADA · NO APOSTAR';fresh.style.background='#7b2020';fresh.style.borderColor='#ffffff55';}
    if(games)games.innerHTML=`<div class="empty"><b>Datos de hoy no verificables.</b><br>${message}<br>NO APOSTAR ni copiar combinaciones hasta que el sistema publique un manifiesto vigente y estricto.</div>`;
    if(gate)gate.innerHTML='<div class="row"><div><div class="name">Decisión de dinero real</div><div class="meta">Bloqueada porque la evidencia operativa no cumple el contrato estricto de hoy.</div><span class="badge blocked">NO APOSTAR</span></div><div style="text-align:right"><div class="hitbig">0,00 €</div><div class="meta">autorizado</div></div></div>';
    blockActions();
  };
  document.addEventListener('click',e=>{
    const action=e.target?.closest?.('[data-play],.copybtn');
    if(action&&window.__LOTERIAS_AI_TODAY_EVIDENCE_FRESH__!==true){
      e.preventDefault();
      e.stopImmediatePropagation();
      blockActions();
    }
  },true);
  new MutationObserver(()=>{
    if(window.__LOTERIAS_AI_TODAY_EVIDENCE_FRESH__!==true)blockActions();
  }).observe(document.documentElement,{childList:true,subtree:true});
  async function fetchJson(url){
    const r=await fetch(url,{cache:'no-store'});
    if(!r.ok)throw new Error(`${url} unavailable`);
    return r.json();
  }
  async function check(){
    try{
      const runner=await fetchJson('../data/ops/actions-runner-health.json?freshness='+Date.now());
      if(runner?.state!=='HEALTHY'||runner?.runnerReached!==true){
        block('La automatización de GitHub Actions no está operativa; no se puede garantizar que los datos de hoy estén actualizados.');
        return;
      }
      const d=await fetchJson('../data/ui/today-manifest.json?freshness='+Date.now());
      const local=madridDate(),ts=Date.parse(d.generatedAt||''),age=Date.now()-ts;
      if(d.today!==local){block(`El manifiesto corresponde a ${d.today||'una fecha no verificable'}, no a ${local}.`);return;}
      if(d.strictToday!==true){block('El manifiesto no confirma strictToday=true.');return;}
      if(d.staleFallbackAllowed!==false){block('El manifiesto no bloquea explícitamente el uso de fallback desfasado.');return;}
      if(!Number.isFinite(ts)||age<0||age>MAX_AGE_MS){
        const mins=Number.isFinite(age)?Math.max(0,Math.round(age/60000)):null;
        block(mins===null?'El manifiesto no tiene una hora verificable.':`Última evidencia generada hace ${mins} minutos.`);
        return;
      }
      window.__LOTERIAS_AI_TODAY_EVIDENCE_FRESH__=true;
      unblockActions();
    }catch{
      block('No se puede verificar la salud del runner o la frescura del manifiesto de hoy.');
    }
  }
  check();
  setInterval(check,30000);
})();
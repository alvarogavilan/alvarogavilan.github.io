(()=>{
  const MAX_AGE_MS=2*60*60*1000;
  const $=id=>document.getElementById(id);
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
  const block=(message)=>{
    const fresh=$('freshLabel'),games=$('todayGames'),gate=$('gate');
    if(fresh){fresh.textContent='EVIDENCIA DESFASADA · NO APOSTAR';fresh.style.background='#7b2020';fresh.style.borderColor='#ffffff55';}
    if(games)games.innerHTML=`<div class="empty"><b>Datos de hoy no verificables.</b><br>${message}<br>NO APOSTAR ni copiar combinaciones hasta que el sistema publique un manifiesto vigente y estricto.</div>`;
    if(gate)gate.innerHTML='<div class="row"><div><div class="name">Decisión de dinero real</div><div class="meta">Bloqueada porque la evidencia operativa no cumple el contrato estricto de hoy.</div><span class="badge blocked">NO APOSTAR</span></div><div style="text-align:right"><div class="hitbig">0,00 €</div><div class="meta">autorizado</div></div></div>';
    blockActions();
    window.__LOTERIAS_AI_TODAY_EVIDENCE_FRESH__=false;
  };
  async function check(){
    try{
      const r=await fetch('../data/ui/today-manifest.json?freshness='+Date.now(),{cache:'no-store'});
      if(!r.ok)throw new Error('manifest unavailable');
      const d=await r.json(),local=madridDate(),ts=Date.parse(d.generatedAt||''),age=Date.now()-ts;
      if(d.today!==local){block(`El manifiesto corresponde a ${d.today||'una fecha no verificable'}, no a ${local}.`);return;}
      if(d.strictToday!==true){block('El manifiesto no confirma strictToday=true.');return;}
      if(d.staleFallbackAllowed!==false){block('El manifiesto no bloquea explícitamente el uso de fallback desfasado.');return;}
      if(!Number.isFinite(ts)||age<0||age>MAX_AGE_MS){
        const mins=Number.isFinite(age)?Math.max(0,Math.round(age/60000)):null;
        block(mins===null?'El manifiesto no tiene una hora verificable.':`Última evidencia generada hace ${mins} minutos.`);
        return;
      }
      window.__LOTERIAS_AI_TODAY_EVIDENCE_FRESH__=true;
    }catch{
      block('No se puede verificar la frescura del manifiesto de hoy.');
    }
  }
  check();
  setInterval(check,30000);
})();
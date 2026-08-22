(()=>{
  const MAX_AGE_MS=2*60*60*1000;
  const $=id=>document.getElementById(id);
  const madridDate=()=>{
    const p=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Madrid',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
    const g=t=>p.find(x=>x.type===t)?.value;
    return `${g('year')}-${g('month')}-${g('day')}`;
  };
  const block=(message)=>{
    const fresh=$('freshLabel'),games=$('todayGames'),gate=$('gate');
    if(fresh){fresh.textContent='EVIDENCIA DESFASADA · NO APOSTAR';fresh.style.background='#7b2020';fresh.style.borderColor='#ffffff55';}
    if(games)games.innerHTML=`<div class="empty"><b>Datos de hoy demasiado antiguos.</b><br>${message}<br>NO APOSTAR hasta que el sistema publique un manifiesto vigente.</div>`;
    if(gate)gate.innerHTML='<div class="row"><div><div class="name">Decisión de dinero real</div><div class="meta">Bloqueada porque la evidencia operativa está desfasada.</div><span class="badge blocked">NO APOSTAR</span></div><div style="text-align:right"><div class="hitbig">0,00 €</div><div class="meta">autorizado</div></div></div>';
    document.querySelectorAll('[data-play]').forEach(b=>{b.disabled=true;b.style.opacity='.45';});
  };
  async function check(){
    try{
      const r=await fetch('../data/ui/today-manifest.json?freshness='+Date.now(),{cache:'no-store'});
      if(!r.ok)throw new Error('manifest unavailable');
      const d=await r.json(),local=madridDate(),ts=Date.parse(d.generatedAt||''),age=Date.now()-ts;
      if(d.today!==local||d.strictToday!==true||d.staleFallbackAllowed!==false)return;
      if(!Number.isFinite(ts)||age<0||age>MAX_AGE_MS){
        const mins=Number.isFinite(age)?Math.max(0,Math.round(age/60000)):null;
        block(mins===null?'El manifiesto no tiene una hora verificable.':`Última evidencia generada hace ${mins} minutos.`);
      }
    }catch{
      block('No se puede verificar la frescura del manifiesto de hoy.');
    }
  }
  check();
  setInterval(check,30000);
})();

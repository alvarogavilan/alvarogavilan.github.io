(()=>{
  const $=id=>document.getElementById(id);
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const eur=n=>Number(n||0).toLocaleString('es-ES',{style:'currency',currency:'EUR'});
  const cp=t=>window.copyText?window.copyText(t):navigator.clipboard?.writeText(t);
  const gameNames={bonoloto:'Bonoloto',primitiva:'Primitiva',euromillones:'Euromillones',eurodreams:'EuroDreams',gordo:'El Gordo',quiniela:'Quiniela',quinigol:'Quinigol','loteria-nacional':'Lotería Nacional'};
  function madridDate(){
    const p=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Madrid',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
    const g=t=>p.find(x=>x.type===t)?.value;
    return `${g('year')}-${g('month')}-${g('day')}`;
  }
  function dateHuman(){return new Intl.DateTimeFormat('es-ES',{timeZone:'Europe/Madrid',weekday:'long',day:'2-digit',month:'long',year:'numeric'}).format(new Date()).toUpperCase()}
  function lineHTML(line,i,prefix){return `<div class="ticket"><div><div class="nums">${esc(line.display||line.copy)}</div><div class="meta">${esc(line.label||`Apuesta ${i+1}`)}${line.meta?` · ${esc(line.meta)}`:''}</div></div><button class="copybtn" data-copy="${prefix}-${i}">Copiar</button></div>`}
  function entryBody(e,prefix,alternative=false){
    const lines=e.lines||[], unit=e.unitCostEUR||((e.theoreticalCostEUR&&lines.length)?e.theoreticalCostEUR/lines.length:0);
    const copyAll=lines.map(x=>x.copy).join('\n');
    const pool=e.pool?.length?`<div class="evidence"><b>Pool:</b> <span class="nums">${e.pool.join(' · ')}</span><div class="actions" style="margin-top:8px"><button class="copybtn" data-pool="${prefix}">Copiar pool</button></div></div>`:'';
    return `<div class="row"><div><div class="name">${esc(e.title)}</div><span class="badge ${alternative?'alt':'shadow'}">${alternative?'ALTERNATIVA · NO SUMAR':esc(e.kind||'SHADOW')}</span></div><div style="text-align:right"><b>${eur(e.theoreticalCostEUR)}</b><div class="meta">coste teórico</div></div></div>${lines.length?`<div class="evidence"><b>Precio individual:</b> ${eur(unit)} por línea · ${lines.length} ${lines.length===1?'apuesta':'apuestas'}.</div><div class="actions" style="margin-top:9px"><button class="copybtn primary" data-all="${prefix}">Copiar ${lines.length===1?'apuesta':`todas (${lines.length})`}</button></div><div class="evidence">${lines.map((x,i)=>lineHTML(x,i,prefix)).join('')}</div>`:''}${pool}${e.purpose?`<div class="meta" style="margin-top:9px">${esc(e.purpose)}</div>`:''}${e.realMoneyPass?'<span class="badge ok">REVISIÓN DINERO REAL</span>':'<span class="badge blocked">0 € REALES · SHADOW</span>'}<span class="manifest-copy" data-text="${esc(copyAll)}" data-prefix="${prefix}" hidden></span>`;
  }
  function bindEntry(e,prefix){
    const lines=e.lines||[];
    document.querySelectorAll(`[data-copy^="${prefix}-"]`).forEach(b=>{const i=Number(b.dataset.copy.slice(prefix.length+1));b.onclick=()=>cp(lines[i]?.copy||'')});
    const all=document.querySelector(`[data-all="${prefix}"]`);if(all)all.onclick=()=>cp(lines.map(x=>x.copy).join('\n'));
    const pool=document.querySelector(`[data-pool="${prefix}"]`);if(pool)pool.onclick=()=>cp((e.pool||[]).join(' '));
  }
  function renderGame(g,idx){
    const alt=(g.alternatives||[]);
    const alternatives=alt.length?`<details><summary>Ver ${alt.length} alternativa${alt.length===1?'':'s'} Shadow · NO SUMAR</summary><div class="altbox">${alt.map((e,j)=>`<div style="margin:12px 0">${entryBody(e,`g${idx}a${j}`,true)}</div>`).join('')}</div></details>`:'';
    return `<div class="section">${esc(gameNames[g.gameId]||g.gameId)} · hoy</div><section class="card" id="game-${idx}">${entryBody(g.primary,`g${idx}p`,false)}${alternatives}${alt.length?'<div class="warning"><b>Importante:</b> estas estrategias compiten por el mismo juego y sorteo. El coste mostrado arriba es el de la propuesta primaria; no se suman entre sí.</div>':''}</section>`;
  }
  function bindGames(games){games.forEach((g,i)=>{bindEntry(g.primary,`g${i}p`);(g.alternatives||[]).forEach((e,j)=>bindEntry(e,`g${i}a${j}`))})}
  async function gate(){try{const d=await fetch('../data/gates/real-money-status.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw 0;return r.json()}),s=d.summary||{};$('gate').innerHTML=`<div class="row"><div><div class="name">Autorización automática</div><div class="meta">Gate científico. Las alternativas del mismo sorteo no se acumulan.</div><span class="badge blocked">${(s.eligible||0)>0?'REVISIÓN NECESARIA':'NO APTO PARA DINERO REAL'}</span></div><b>${eur(s.approvedStakeTodayEUR||0)}</b></div>`}catch{$('gate').innerHTML='<div class="meta">Gate no disponible: fail-closed.</div>'}}
  async function run(){
    const local=madridDate();$('dateLabel').textContent=`HOY · ${dateHuman()}`;
    try{
      const d=await fetch('../data/ui/today-manifest.json?ts='+Date.now(),{cache:'no-store'}).then(r=>{if(!r.ok)throw 0;return r.json()});
      if(d.today!==local||d.strictToday!==true||d.staleFallbackAllowed!==false){$('freshLabel').textContent='SIN DATOS ACTUALIZADOS PARA HOY';$('todayGames').innerHTML=`<div class="empty"><b>No voy a mostrar apuestas antiguas.</b><br>El manifest disponible corresponde a ${esc(d.today||'otra fecha')} y hoy en Madrid es ${local}. Esperando actualización automática.</div>`;return}
      const games=(d.games||[]).filter(g=>g.targetDate===local&&g.primary?.targetDate===local);
      $('freshLabel').textContent=`ACTUALIZADO ${new Intl.DateTimeFormat('es-ES',{timeZone:'Europe/Madrid',hour:'2-digit',minute:'2-digit'}).format(new Date(d.generatedAt))} · ${games.length} JUEGO${games.length===1?'':'S'}`;
      $('todayGames').innerHTML=games.length?games.map(renderGame).join(''):'<div class="empty"><b>Hoy no hay ninguna propuesta vigente.</b><br>No se arrastra automáticamente ninguna apuesta de ayer. El sistema seguirá actualizando esta pantalla cuando aparezcan nuevos freezes de hoy.</div>';
      bindGames(games);
    }catch{$('freshLabel').textContent='ACTUALIZACIÓN PENDIENTE';$('todayGames').innerHTML='<div class="empty"><b>Resumen de hoy aún no disponible.</b><br>Fail-closed: no se muestran propuestas antiguas como sustitución.</div>'}
    finally{gate()}
  }
  run();
  setInterval(run,5*60*1000);
})();
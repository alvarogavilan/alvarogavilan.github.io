const BACKEND='https://loterias-edge-sentinel.k8mwkbp68y.workers.dev';
const $=id=>document.getElementById(id);
const money=(v,c='EUR')=>Number.isFinite(Number(v))?Number(v).toLocaleString('es-ES',{style:'currency',currency:c||'EUR',maximumFractionDigits:2}):'—';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=t=>{const d=new Date(t);return Number.isFinite(d.getTime())?new Intl.DateTimeFormat('es-ES',{timeZone:'Europe/Madrid',dateStyle:'short',timeStyle:'medium'}).format(d):String(t||'—');};
const state={summary:null,sources:null,rows:[],error:null};
async function j(path){const r=await fetch(`${BACKEND}${path}${path.includes('?')?'&':'?'}t=${Date.now()}`,{cache:'no-store'});if(!r.ok)throw new Error(`HTTP_${r.status}`);return r.json();}

function panel(){
  let p=$('edgeUniversalLibrary');if(p)return p;
  p=document.createElement('section');p.id='edgeUniversalLibrary';
  p.style.cssText='margin:12px 0 14px;border:1px solid #544478;border-radius:18px;background:linear-gradient(145deg,#100c18,#20152d);padding:12px;color:#f8f3ff;font-family:inherit;box-shadow:0 12px 30px #0005';
  const anchor=$('edgeHistory24x7')||$('edgeScience24x7')||$('radarSummary');if(anchor)anchor.insertAdjacentElement('afterend',p);else document.body.appendChild(p);
  return p;
}
function recordLine(r){
  const nums=Array.isArray(r.numbers)&&r.numbers.length?` · ${r.numbers.join(' · ')}${Array.isArray(r.secondary)&&r.secondary.length?' + '+r.secondary.join(' · '):''}`:'';
  const amt=Number.isFinite(Number(r.amountValue))?` · ${money(r.amountValue,r.currency)}`:'';
  const precision=r.eventTimePrecision&&r.eventTimePrecision!=='SECOND'?` · ${esc(r.eventTimePrecision)}`:'';
  return `<div style="padding:7px 0;border-top:1px solid #ffffff10"><div style="font-size:8px;font-weight:900">${esc(r.gameOrDraw)} <span style="font-size:6px;color:#bda7dc">${esc(r.recordType)}</span></div><div style="font-size:7px;color:#d6cce4;margin-top:2px">${esc(fmt(r.eventAt))}${precision}${nums}${amt}</div><div style="font-size:6px;color:#8e80a5;margin-top:2px">${esc(r.jurisdiction)} · ${esc(r.operator||r.provider||'—')} · ${esc(r.sourceClass)} · ${esc(r.confidence)}</div></div>`;
}
function render(){
  const p=panel(),s=state.summary?.library||null;
  if(!s){p.innerHTML='<b style="font-size:9px">BIBLIOTECA UNIVERSAL · INICIALIZANDO</b><div style="font-size:7px;color:#a99bb9;margin-top:4px">Esperando índice histórico interno.</div>';return;}
  const domains=(s.byDomain||[]).map(x=>`${esc(x.domain)} ${Number(x.count).toLocaleString('es-ES')}`).join(' · ');
  const rows=state.rows.map(recordLine).join('')||'<div style="padding:8px 0;font-size:7px;color:#a99bb9">Sin resultados para este filtro.</div>';
  p.innerHTML=`
    <div style="display:flex;justify-content:space-between;gap:8px"><div><div style="font-size:8px;font-weight:1000;letter-spacing:.08em;color:#d4b5ff">BIBLIOTECA UNIVERSAL EDGE</div><div style="font-size:15px;font-weight:1000;margin-top:2px">Todo el histórico, dentro de EDGE</div></div><span style="padding:5px 8px;border-radius:999px;background:#d4b5ff10;border:1px solid #d4b5ff33;color:#d4b5ff;font-size:7px;font-weight:1000">INTERNO · INDEXADO</span></div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:5px;margin-top:10px"><div style="padding:8px;background:#ffffff08;border-radius:10px;text-align:center"><small style="font-size:6px;color:#9889ac">REGISTROS</small><b style="display:block;font-size:13px">${Number(s.records||0).toLocaleString('es-ES')}</b></div><div style="padding:8px;background:#ffffff08;border-radius:10px;text-align:center"><small style="font-size:6px;color:#9889ac">FUENTES</small><b style="display:block;font-size:13px">${Number(s.activeSources||0)}</b></div><div style="padding:8px;background:#ffffff08;border-radius:10px;text-align:center"><small style="font-size:6px;color:#9889ac">JURISD.</small><b style="display:block;font-size:13px">${Number((s.byJurisdiction||[]).length)}</b></div></div>
    <div style="margin-top:7px;font-size:6px;color:#9f91af">${domains||'—'} · desde ${esc(s.earliestEventAt?fmt(s.earliestEventAt):'—')} hasta ${esc(s.latestEventAt?fmt(s.latestEventAt):'—')}</div>
    <div style="display:grid;grid-template-columns:1fr auto;gap:5px;margin-top:9px"><input id="edgeLibraryQ" placeholder="Buscar juego, sorteo, contador, pool, evento…" style="min-width:0;border:1px solid #ffffff22;border-radius:10px;background:#ffffff08;color:#fff;padding:8px;font-size:8px"/><button id="edgeLibrarySearch" style="border:1px solid #d4b5ff55;border-radius:10px;background:#d4b5ff14;color:#e6d6ff;padding:7px 10px;font-size:7px;font-weight:900">BUSCAR</button></div>
    <div style="display:flex;gap:5px;margin-top:5px;flex-wrap:wrap"><button data-domain="" class="libDomain">TODO</button><button data-domain="LOTTERY" class="libDomain">SORTEOS</button><button data-domain="SLOT_JACKPOT" class="libDomain">SLOTS/JACKPOTS</button></div>
    <div id="edgeLibraryRows" style="margin-top:8px">${rows}</div>
    <div style="margin-top:7px;font-size:6px;color:#8e80a5">Los enlaces de fuente son sólo procedencia. Los registros consultables están guardados/indexados internamente. Histórico/patrones ≠ prueba predictiva ni autorización de apuesta.</div>`;
  for(const b of p.querySelectorAll('.libDomain'))b.style.cssText='border:1px solid #ffffff22;border-radius:999px;background:#ffffff08;color:#d9cee8;padding:5px 8px;font-size:6px';
  const search=(domain='')=>runSearch({q:$('edgeLibraryQ')?.value||'',domain});
  $('edgeLibrarySearch')?.addEventListener('click',()=>search(''));
  $('edgeLibraryQ')?.addEventListener('keydown',e=>{if(e.key==='Enter')search('');});
  for(const b of p.querySelectorAll('.libDomain'))b.addEventListener('click',()=>search(b.dataset.domain||''));
}
async function runSearch({q='',domain=''}={}){try{const p=new URLSearchParams({limit:'40'});if(q)p.set('q',q);if(domain)p.set('domain',domain);const x=await j(`/library/search?${p.toString()}`);state.rows=Array.isArray(x.rows)?x.rows:[];state.error=null;}catch(e){state.rows=[];state.error=String(e?.message||e);}render();}
async function refresh(){try{const [summary,sources,latest]=await Promise.all([j('/library/summary'),j('/library/sources'),j('/library/search?limit=20')]);state.summary=summary;state.sources=sources;state.rows=latest.rows||[];state.error=null;}catch(e){state.error=String(e?.message||e);}render();}
refresh();render();setInterval(refresh,60000);window.addEventListener('online',refresh);document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});

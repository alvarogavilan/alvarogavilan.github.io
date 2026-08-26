const SOURCE='./evidence/aotgn-spain-live-deployment-targets-v1.json';

const hasFinite=v=>v!==null&&v!==undefined&&Number.isFinite(Number(v));
const progress=(gates)=>{const closed=gates.filter(g=>g.closed).length;const total=gates.length;return {gates,closed,total,pct:total?Math.round((closed/total)*1000)/10:0,open:gates.filter(g=>!g.closed)};};

function gateState(data){
  const s=data?.p0Strategy?.stateObservationGate||null;
  const d=data?.p0Strategy?.currentDeploymentConfigurationGate||null;
  const t=data?.p0Strategy?.tickerIdentityGate||null;
  if(!s||!d||!t)return null;
  const deploymentClosed=d.currentSpanishJackpotCategoryPresenceVerified===true&&
    d.exactAognjp2LinkedTitleCurrentlyInJackpotCategory===true&&
    d.dailyTierPublishedForSameOperatorTitle===true&&
    d.dailyDeploymentConfiguredEvidenceStrong===true;
  const providerIdentity=t.aognjp2ToBookOfDwarvesProviderBindingVerified===true||d.providerCodeBindingAognjp2ToBookOfDwarvesVerified===true;
  const exactTickerIms=t.exactSpanishTickerImsBindingVerified===true||s.exactSpanishTickerImsBindingVerified===true||
    (s.exactTickerHostRecovered===true&&s.exactImsCasinoRecovered===true);
  const currentAmount=s.currentDailyAmountRecovered===true||hasFinite(s.currentDailyJackpotEUR);
  const currentTime=s.currentGuaranteedHitTimeRecovered===true||hasFinite(s.guaranteedHitTime);
  const activeNow=s.sameSessionDailyActiveVerified===true||s.dailyActiveNowVerified===true;
  const configuration=progress([
    {key:'currentPublicPageVerified',label:'Ficha española actual verificada',closed:s.currentPublicPageVerified===true},
    {key:'dailyMechanicPublishedOnCurrentPage',label:'Mecánica Daily publicada',closed:s.dailyMechanicPublishedOnCurrentPage===true},
    {key:'spanishInteroperatorPlaytechNetworkVerified',label:'Red Playtech interoperador España verificada',closed:s.spanishInteroperatorPlaytechNetworkVerified===true},
    {key:'currentSpanishDailyDeploymentConfigured',label:'Despliegue español actual de Daily identificado',closed:deploymentClosed},
  ]);
  const identity=progress([
    {key:'aognjp2ToBookOfDwarvesProviderBindingVerified',label:'Identidad proveedor Book of Dwarves ↔ aognjp-2',closed:providerIdentity},
    {key:'exactSpanishTickerImsBindingVerified',label:'Ticker + IMS español exactos',closed:exactTickerIms},
  ]);
  const live=progress([
    {key:'sameSessionDailyActiveVerified',label:'Daily activo en misma sesión',closed:activeNow},
    {key:'currentDailyAmountRecovered',label:'Importe Daily actual',closed:currentAmount},
    {key:'currentGuaranteedHitTimeRecovered',label:'guaranteedHitTime actual',closed:currentTime},
  ]);
  return {s,d,t,configuration,identity,live};
}

export function summarizeP0NorseProgress(data){
  const state=gateState(data);
  if(!state)return {ready:false,target:null,deployment:null,ticker:null,gates:[],closed:0,total:9,pct:0,open:[],configuration:progress([]),identity:progress([]),live:progress([])};
  const {s,d,t,configuration,identity,live}=state;
  const gates=[...configuration.gates,...identity.gates,...live.gates];
  const closed=configuration.closed+identity.closed+live.closed;
  const total=gates.length;
  const pct=total?Math.round((closed/total)*1000)/10:0;
  return {ready:true,target:s,deployment:d,ticker:t,gates,closed,total,pct,open:gates.filter(g=>!g.closed),configuration,identity,live};
}

const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const bar=(section)=>Math.max(0,Math.min(100,section.pct));
const lane=(label,section,color)=>`<div style="margin-top:9px;padding:10px;border-radius:13px;background:#ffffff08;border:1px solid #ffffff12"><div style="display:flex;justify-content:space-between;gap:8px;font-size:8px;font-weight:1000"><span>${label}</span><span style="color:${color}">${section.closed}/${section.total} · ${section.pct.toFixed(1).replace('.',',')}%</span></div><div style="height:6px;border-radius:999px;background:#ffffff12;margin-top:7px;overflow:hidden"><div style="height:100%;width:${bar(section)}%;background:${color};border-radius:999px"></div></div></div>`;

function ensurePanel(){
  let p=document.getElementById('p0ResearchProgress');
  if(p)return p;
  p=document.createElement('section');
  p.id='p0ResearchProgress';
  p.style.cssText='margin:0 0 14px;padding:14px;border-radius:24px;border:1px solid #2f7254;background:linear-gradient(145deg,#071b15,#0d2d21);box-shadow:0 16px 38px #0006;color:#f5fff9';
  const anchor=document.querySelector('.breakthroughHero');
  if(anchor)anchor.insertAdjacentElement('beforebegin',p);
  else (document.querySelector('main')||document.body).appendChild(p);
  return p;
}

function render(data,error=null){
  const p=ensurePanel();
  const s=summarizeP0NorseProgress(data);
  if(!s.ready){
    p.innerHTML=`<div style="font-size:9px;font-weight:1000;letter-spacing:.12em;color:#66eba4">AVANCE CIENTÍFICO · P0</div><div style="font-size:15px;font-weight:1000;margin-top:4px">${error?'No se pudo cargar el estado P0':'Esperando matriz P0'}</div><div style="margin-top:6px;font-size:8px;color:#9bb1a6">La señal de dinero real sigue siendo una capa separada.</div>`;
    return;
  }
  const closed=s.gates.filter(g=>g.closed).map(g=>g.label);
  const open=s.open.map(g=>g.label);
  p.innerHTML=`
    <div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start">
      <div><div style="font-size:9px;font-weight:1000;letter-spacing:.12em;color:#66eba4">AVANCE CIENTÍFICO · P0 NORSE</div><div style="font-size:18px;font-weight:1000;margin-top:4px">${s.closed}/${s.total} gates de esta subetapa cerrados</div></div>
      <span style="padding:6px 8px;border-radius:999px;border:1px solid #66eba455;background:#29df8612;color:#66eba4;font-size:8px;font-weight:1000">${s.pct.toFixed(1).replace('.',',')}%</span>
    </div>
    ${lane('A · CONFIGURACIÓN / DESPLIEGUE',s.configuration,'#66eba4')}
    ${lane('B · IDENTIDAD PROVEEDOR / TICKER',s.identity,'#70b9ff')}
    ${lane('C · ESTADO LIVE',s.live,'#ffd987')}
    <div style="margin-top:6px;font-size:7px;color:#8fa79b">Este porcentaje mide solo cierre científico de esta subetapa. NO es probabilidad de ganar, EV ni distancia lineal hasta GREEN.</div>
    <div style="margin-top:10px;font-size:11px;font-weight:1000">JOKERBET + PartyCasino · Age of the Gods Norse · España</div>
    <div style="margin-top:8px;padding:9px;border-radius:13px;background:#29df8609;border:1px solid #29df8626;font-size:8px;line-height:1.55"><b style="color:#66eba4">CERRADO (${closed.length})</b><br>${closed.map(x=>'✓ '+esc(x)).join('<br>')}</div>
    <div style="margin-top:7px;padding:9px;border-radius:13px;background:#ff5b6608;border:1px solid #ff5b6626;font-size:8px;line-height:1.55"><b style="color:#ff9298">FALTA (${open.length})</b><br>${open.map(x=>'• '+esc(x)).join('<br>')}</div>
    <div style="margin-top:8px;font-size:8px;line-height:1.55;color:#ffd987"><b>Después de estos gates:</b> aún se exige ciclo prospectivo, rollover observado y verificabilidad de primera contribución antes de cualquier ejecución.</div>
    <div style="margin-top:9px;padding:9px;border-radius:13px;background:#2a1115;border:1px solid #733039;font-size:9px;font-weight:1000;color:#ffd3d6">DINERO REAL: BLOQUEADO · 0 € · 0 JUGADAS · NO_PLAY</div>
  `;
}

async function load(){
  try{
    const r=await fetch(`${SOURCE}?t=${Date.now()}`,{cache:'no-store'});
    if(!r.ok)throw new Error(`HTTP_${r.status}`);
    render(await r.json());
  }catch(e){render(null,String(e?.message||e));}
}

if(typeof document!=='undefined'){
  load();
  setInterval(load,60000);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)load();});
}

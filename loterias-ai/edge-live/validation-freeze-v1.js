const FREEZE_URL='../casino/jackpots/evidence/botemania-jpk-allocation-validation-result-v1.json';
let frozenValidation=null;
const fp=x=>Number.isFinite(Number(x))?(Number(x)*100).toFixed(3)+'%':'—';
async function loadFrozenValidation(){
 try{
  const r=await fetch(`${FREEZE_URL}?t=${Date.now()}`,{cache:'no-store'});if(!r.ok)return;
  const x=await r.json();if(x?.frozen!==true||x?.outcome!=='PASSED_NETWORK_ALLOCATION')return;
  frozenValidation=x;enforceFrozenBoundary();
 }catch{}
}
function enforceFrozenBoundary(){
 const x=frozenValidation;if(!x)return;const b=x?.boundarySnapshot||{},s=b?.weightedAllocationShares||{};
 const ci=document.getElementById('calcIntervals'),cr=document.getElementById('calcRemaining'),bar=document.getElementById('protocolBar'),calc=document.getElementById('calculator');
 if(ci&&ci.textContent!=='20/20 · VALIDADO')ci.textContent='20/20 · VALIDADO';
 if(cr&&cr.textContent!=='0 · CERRADO')cr.textContent='0 · CERRADO';
 if(bar)bar.style.width='100%';
 if(calc&&!document.getElementById('freezeBanner')){
  const d=document.createElement('div');d.id='freezeBanner';d.className='reason';d.style.border='1px solid #335f45';d.innerHTML=`<b>✅ VALIDACIÓN PROSPECTIVA CONGELADA</b><br>Frontera exacta: ${b.cleanFutureIntervals}/20 · crecimiento ${Number(b.cumulativeActiveGrowthEUR||0).toFixed(2)} € · informativos ${b.informativeIntervals} · reparto K ${fp(s.JACKPOT_KING)} / Regal ${fp(s.REGAL)} / Royal ${fp(s.ROYAL)}.<br><b>Este hito está cerrado.</b> Las muestras posteriores son monitorización y no alteran el resultado.`;
  const progress=calc.querySelector('.progress');progress?.insertAdjacentElement('beforebegin',d);
 }
}
loadFrozenValidation();
setInterval(loadFrozenValidation,5000);
setInterval(enforceFrozenBoundary,300);

const finite=v=>{if(v===null||v===undefined||v==='')return null;const n=Number(v);return Number.isFinite(n)?n:null;};
const ageSeconds=(t,nowMs)=>{const n=Date.parse(t||'');return Number.isFinite(n)?Math.max(0,Math.floor((nowMs-n)/1000)):null;};

function networkCandidate(allNetwork,nowMs,maxAgeSeconds){
  const observedAt=allNetwork?.observedAt||allNetwork?.generatedAt||null;
  const king=finite(allNetwork?.currentByKey?.['blueprint:JACKPOTKING']?.amountEUR);
  const regal=finite(allNetwork?.currentByKey?.['blueprint:JACKPOTKING_REGAL']?.amountEUR);
  const royal=finite(allNetwork?.currentByKey?.['blueprint:JACKPOTKING_ROYAL']?.amountEUR);
  const complete=[king,regal,royal].every(v=>v!==null&&v>0);
  const age=ageSeconds(observedAt,nowMs);
  return {sourceClass:'ALL_NETWORK_BLUEPRINT_EXACT_IDS',observedAt,ageSeconds:age,sourceFresh:complete&&age!==null&&age<=maxAgeSeconds,complete,potsEUR:{JACKPOT_KING:king,REGAL:regal,ROYAL:royal}};
}
function observerCandidate(observer,nowMs,maxAgeSeconds){
  const observedAt=observer?.latest?.observedAt||null;
  const pots=observer?.latest?.labeledPots||{};
  const king=finite(pots?.JACKPOT_KING),regal=finite(pots?.REGAL),royal=finite(pots?.ROYAL);
  const complete=[king,regal,royal].every(v=>v!==null&&v>0);
  const readable=observer?.latest?.sourceReadable===true&&finite(observer?.latest?.graphql?.httpStatus)===200;
  const age=ageSeconds(observedAt,nowMs);
  return {sourceClass:'LEGACY_JPK_OBSERVER',observedAt,ageSeconds:age,sourceFresh:readable&&complete&&age!==null&&age<=maxAgeSeconds,complete:readable&&complete,potsEUR:{JACKPOT_KING:king,REGAL:regal,ROYAL:royal}};
}
export function selectJpkLiveSource({allNetwork={},observer={},nowMs=Date.now(),maxAgeSeconds=180}={}){
  const network=networkCandidate(allNetwork,nowMs,maxAgeSeconds);
  if(network.complete)return network;
  return observerCandidate(observer,nowMs,maxAgeSeconds);
}

export function modelMatchesJpkState(ev={},current={},maxAmountDiffEUR=0.02){
  const evPots=ev?.current?.potsEUR||{};
  const cur=current?.potsEUR||{};
  for(const k of ['JACKPOT_KING','REGAL','ROYAL']){
    const a=finite(evPots?.[k]),b=finite(cur?.[k]);
    if(a===null||b===null||Math.abs(a-b)>maxAmountDiffEUR)return false;
  }
  const evObs=Date.parse(ev?.current?.observedAt||'');
  const curObs=Date.parse(current?.observedAt||'');
  if(!Number.isFinite(evObs)||!Number.isFinite(curObs))return false;
  return Math.abs(evObs-curObs)<=180000;
}

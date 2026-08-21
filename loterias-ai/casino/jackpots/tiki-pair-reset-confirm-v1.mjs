#!/usr/bin/env node
import fs from 'node:fs';

const ENDPOINT='https://www.botemania.es/es/graphql';
const LEDGER='loterias-ai/casino/jackpots/evidence/botemania-generic-fast-reset-ledger-v1.json';
const OUT='loterias-ai/casino/jackpots/evidence/tiki-pair-reset-confirm-v1.json';
const TARGETS=['tikitemple2_1','progressivealice1'];
const QUERY='query loadJackpots { jackpots { id amount } }';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const finite=v=>Number.isFinite(Number(v))?Number(v):null;

async function sample(){
  const observedAt=new Date().toISOString();
  try{
    const r=await fetch(ENDPOINT,{method:'POST',headers:{accept:'application/json','content-type':'application/json',venture:'botemania_es',origin:'https://www.botemania.es',referer:'https://www.botemania.es/','cache-control':'no-cache, no-store, max-age=0','user-agent':'loterias-ai-tiki-pair-reset-confirm/1.0'},body:JSON.stringify({operationName:'loadJackpots',variables:{},query:QUERY}),signal:AbortSignal.timeout(10000)});
    const text=await r.text();let body=null;try{body=JSON.parse(text)}catch{}
    const rows=(body?.data?.jackpots||[]).map(x=>({id:String(x?.id??''),amountEUR:finite(x?.amount)})).filter(x=>x.id&&x.amountEUR!==null);
    const targets={};
    for(const id of TARGETS){
      const rs=rows.filter(x=>x.id===id);
      const amounts=[...new Set(rs.map(x=>x.amountEUR))];
      targets[id]={rowCount:rs.length,distinctAmountsEUR:amounts,uniqueIdentityInSnapshot:rs.length>=1&&amounts.length===1,amountEUR:amounts.length===1?amounts[0]:null};
    }
    return {observedAt,httpStatus:r.status,graphqlErrors:(body?.errors||[]).map(e=>String(e?.message||e)).slice(0,5),rowCount:rows.length,targets};
  }catch(e){
    return {observedAt,httpStatus:null,graphqlErrors:[String(e?.name||e?.message||e)],rowCount:0,targets:Object.fromEntries(TARGETS.map(id=>[id,{rowCount:0,distinctAmountsEUR:[],uniqueIdentityInSnapshot:false,amountEUR:null}]))};
  }
}

export function evaluateResetPair(ledger, samples, generatedAt=new Date().toISOString()){
  const targetEvidence={};
  for(const id of TARGETS){
    const events=(ledger?.events||[]).filter(e=>e?.network==='generic'&&e?.id===id&&finite(e?.previousEUR)!==null&&finite(e?.currentEUR)!==null&&finite(e?.dropFraction)!==null);
    const event=events.at(-1)||null;
    const vals=samples.map(s=>finite(s?.targets?.[id]?.amountEUR));
    const snapshotsUnique=samples.every(s=>s?.targets?.[id]?.uniqueIdentityInSnapshot===true);
    const samplesFinite=vals.every(v=>v!==null);
    const baselineEUR=finite(event?.previousEUR);
    const eventPostEUR=finite(event?.currentEUR);
    const dropFraction=finite(event?.dropFraction);
    const maxFresh=samplesFinite?Math.max(...vals):null;
    const remainsLowPostReset=baselineEUR!==null&&maxFresh!==null&&maxFresh<=baselineEUR*0.15;
    const largeDrop=dropFraction!==null&&dropFraction>=0.80;
    const confirmed=Boolean(event&&snapshotsUnique&&samplesFinite&&largeDrop&&remainsLowPostReset);
    targetEvidence[id]={
      event:event?{observedAt:event.observedAt,previousEUR:baselineEUR,currentEUR:eventPostEUR,dropEUR:finite(event.dropEUR),dropFraction,identityClass:event.identityClass||null,priorClassification:event.classification||null}:null,
      freshSamples:samples.map(s=>({observedAt:s.observedAt,httpStatus:s.httpStatus,rowCount:s?.targets?.[id]?.rowCount??0,distinctAmountsEUR:s?.targets?.[id]?.distinctAmountsEUR||[],uniqueIdentityInSnapshot:s?.targets?.[id]?.uniqueIdentityInSnapshot===true})),
      confirmation:{snapshotsUnique,samplesFinite,largeDrop,remainsLowPostReset,maxFreshEUR:maxFresh,classification:confirmed?'CONFIRMED_METER_RESET':'RESET_NOT_CONFIRMED',meterResetConfirmed:confirmed}
    };
  }
  const a=targetEvidence[TARGETS[0]],b=targetEvidence[TARGETS[1]];
  const ae=a?.event,be=b?.event;
  const eventSynchronized=Boolean(ae&&be&&ae.observedAt===be.observedAt&&Math.abs(ae.previousEUR-be.previousEUR)<0.005&&Math.abs(ae.currentEUR-be.currentEUR)<0.005);
  const freshPairEqual=samples.every(s=>{
    const x=finite(s?.targets?.[TARGETS[0]]?.amountEUR),y=finite(s?.targets?.[TARGETS[1]]?.amountEUR);
    return x!==null&&y!==null&&Math.abs(x-y)<0.005;
  });
  const bothConfirmed=TARGETS.every(id=>targetEvidence[id].confirmation.meterResetConfirmed===true);
  return {
    version:'tiki-pair-reset-confirm-v1',generatedAt,operator:'botemania-es',targets:TARGETS,
    targetEvidence,
    pairSignature:{eventSynchronized,freshPairEqual,bothConfirmed,classification:bothConfirmed&&eventSynchronized&&freshPairEqual?'SYNCHRONIZED_SHARED_RESET_SIGNATURE':'PAIR_SIGNATURE_NOT_CONFIRMED'},
    inference:{
      sharedResetSignatureConfirmed:bothConfirmed&&eventSynchronized&&freshPairEqual,
      exactAliasProven:false,
      exactGameIdentityProven:false,
      tikiTemploIdentityProven:false,
      tikiTropicoIdentityProven:false,
      triggeringGameKnown:false,
      jackpotWinConfirmed:false,
      seedPointEstimateEUR:null,
      currentPositiveEvProven:false,
      economicPromotionAllowed:false,
      realMoneyAllowed:false
    },
    guards:{earlierDivergencePreventsExactAliasClaim:true,correlatedResetNeverEqualsGameBinding:true,noPostResetValueEqualsExactSeed:true,noTriggerAttribution:true,noBetting:true,realMoneyAllowed:false}
  };
}

if(import.meta.url===`file://${process.argv[1]}`){
  const ledger=read(LEDGER);
  const first=await sample();
  await sleep(3000);
  const second=await sample();
  const out=evaluateResetPair(ledger,[first,second]);
  fs.mkdirSync('loterias-ai/casino/jackpots/evidence',{recursive:true});
  fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');
  console.log(JSON.stringify({targets:out.targetEvidence,pairSignature:out.pairSignature,inference:out.inference},null,2));
}

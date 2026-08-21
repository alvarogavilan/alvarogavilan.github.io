#!/usr/bin/env node
import fs from 'node:fs';

const ENDPOINT='https://www.botemania.es/es/graphql';
const LEDGER='loterias-ai/casino/jackpots/evidence/botemania-generic-fast-reset-ledger-v1.json';
const TARGETS=['tikitemple2_1','progressivealice1'];
const QUERY='query loadJackpots { jackpots { id amount } }';
export const PROTOCOL_FROZEN_AT='2026-08-21T16:21:00.000Z';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const finite=v=>{if(v===null||v===undefined||v==='')return null;const n=Number(v);return Number.isFinite(n)?n:null;};
const sameCent=(a,b)=>{const x=finite(a),y=finite(b);return x!==null&&y!==null&&Math.round(x*100)===Math.round(y*100);};
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));

export function findNewSynchronizedCandidate(ledger={},frozenAt=PROTOCOL_FROZEN_AT){
  const events=Array.isArray(ledger?.events)?ledger.events:[];
  const byTime=new Map();
  for(const e of events){
    if(e?.network!=='generic'||!TARGETS.includes(e?.id)) continue;
    if(!e?.observedAt||Date.parse(e.observedAt)<Date.parse(frozenAt)) continue;
    const prev=finite(e?.previousEUR),cur=finite(e?.currentEUR),drop=finite(e?.dropFraction);
    if(prev===null||cur===null||drop===null||prev<=0||cur>=prev||drop<0.80) continue;
    if(!byTime.has(e.observedAt)) byTime.set(e.observedAt,{});
    byTime.get(e.observedAt)[e.id]=e;
  }
  const candidates=[];
  for(const [observedAt,pair] of byTime){
    const a=pair[TARGETS[0]],b=pair[TARGETS[1]];
    if(!a||!b) continue;
    if(!sameCent(a.previousEUR,b.previousEUR)||!sameCent(a.currentEUR,b.currentEUR)) continue;
    if(a?.classification==='CONFIRMED_METER_RESET'&&b?.classification==='CONFIRMED_METER_RESET') continue;
    candidates.push({observedAt,a,b,previousEUR:(Number(a.previousEUR)+Number(b.previousEUR))/2,currentEUR:(Number(a.currentEUR)+Number(b.currentEUR))/2});
  }
  return candidates.sort((x,y)=>Date.parse(x.observedAt)-Date.parse(y.observedAt)).at(-1)||null;
}

async function sample(){
  const observedAt=new Date().toISOString();
  try{
    const r=await fetch(ENDPOINT,{method:'POST',headers:{accept:'application/json','content-type':'application/json',venture:'botemania_es',origin:'https://www.botemania.es',referer:'https://www.botemania.es/','cache-control':'no-cache, no-store, max-age=0','user-agent':'loterias-ai-tiki-pair-auto-confirm/1.0'},body:JSON.stringify({operationName:'loadJackpots',variables:{},query:QUERY}),signal:AbortSignal.timeout(10000)});
    const text=await r.text();let body=null;try{body=JSON.parse(text)}catch{}
    const rows=(body?.data?.jackpots||[]).map(x=>({id:String(x?.id??''),amountEUR:finite(x?.amount)})).filter(x=>x.id&&x.amountEUR!==null);
    const targets={};
    for(const id of TARGETS){
      const rs=rows.filter(x=>x.id===id);const amounts=[...new Set(rs.map(x=>x.amountEUR))];
      targets[id]={rowCount:rs.length,distinctAmountsEUR:amounts,uniqueIdentityInSnapshot:rs.length>=1&&amounts.length===1,amountEUR:amounts.length===1?amounts[0]:null};
    }
    return {observedAt,httpStatus:r.status,graphqlErrors:(body?.errors||[]).map(e=>String(e?.message||e)).slice(0,5),rowCount:rows.length,targets};
  }catch(e){
    return {observedAt,httpStatus:null,graphqlErrors:[String(e?.name||e?.message||e)],rowCount:0,targets:Object.fromEntries(TARGETS.map(id=>[id,{rowCount:0,distinctAmountsEUR:[],uniqueIdentityInSnapshot:false,amountEUR:null}]))};
  }
}

export function evaluateCandidate(candidate,samples=[]){
  if(!candidate||samples.length<2) return {confirmed:false,reason:'NO_NEW_CANDIDATE_OR_INSUFFICIENT_SAMPLES'};
  const perTarget={};
  for(const id of TARGETS){
    const event=id===TARGETS[0]?candidate.a:candidate.b;
    const baseline=finite(event?.previousEUR);const firstPost=finite(event?.currentEUR);
    const vals=samples.slice(0,2).map(s=>finite(s?.targets?.[id]?.amountEUR));
    const twoFreshUnique=samples.slice(0,2).every(s=>s?.httpStatus===200&&s?.targets?.[id]?.uniqueIdentityInSnapshot===true);
    const allFinite=vals.every(v=>v!==null);
    const maxFresh=allFinite?Math.max(...vals):null;
    const remainsLow=baseline!==null&&maxFresh!==null&&maxFresh<=baseline*0.15;
    const largeDrop=finite(event?.dropFraction)!==null&&Number(event.dropFraction)>=0.80;
    perTarget[id]={event,baseline,firstPost,vals,twoFreshUnique,allFinite,maxFresh,remainsLow,largeDrop,confirmed:Boolean(twoFreshUnique&&allFinite&&remainsLow&&largeDrop)};
  }
  const a=perTarget[TARGETS[0]],b=perTarget[TARGETS[1]];
  const freshPairEqual=samples.slice(0,2).every(s=>sameCent(s?.targets?.[TARGETS[0]]?.amountEUR,s?.targets?.[TARGETS[1]]?.amountEUR));
  const confirmed=a.confirmed&&b.confirmed&&freshPairEqual;
  return {confirmed,freshPairEqual,perTarget,reason:confirmed?'SYNCHRONIZED_SHARED_RESET_SIGNATURE_CONFIRMED':'FRESH_CONFIRMATION_FAILED_CLOSED'};
}

export function buildPerIdEvidence(id,candidate,evaluation,samples,generatedAt=new Date().toISOString()){
  const d=evaluation?.perTarget?.[id];if(!d?.confirmed) return null;
  const event=d.event;
  return {
    version:`botemania-${id}-reset-confirm-v1`,generatedAt,operator:'botemania-es',target:{network:'generic',id},
    baseline:{observedAt:event?.fromObservedAt||null,amountEUR:d.baseline,identityClass:'EXACT_NETWORK_PLUS_UNIQUE_ID',identityExact:true,sourceEventObservedAt:event?.observedAt||candidate?.observedAt||null},
    confirmationSamples:samples.slice(0,2).map(s=>({observedAt:s.observedAt,httpStatus:s.httpStatus,targetRowCount:s?.targets?.[id]?.rowCount??0,targetDistinctAmounts:s?.targets?.[id]?.distinctAmountsEUR||[],uniqueIdentityInSnapshot:s?.targets?.[id]?.uniqueIdentityInSnapshot===true})),
    transition:{baselineEUR:d.baseline,firstObservedPostResetEUR:d.firstPost,confirmedPostResetUpperBoundEUR:d.maxFresh,dropEUR:finite(event?.dropEUR)??(d.baseline-d.firstPost),dropFraction:finite(event?.dropFraction),classification:'CONFIRMED_RESET_OF_STABLE_FEED_ID'},
    inference:{meterResetConfirmed:true,jackpotWinConfirmed:false,triggeringGameKnown:false,triggeringTierKnown:false,seedPointEstimateEUR:null,postResetSeedUpperBoundEUR:d.maxFresh,currentPositiveEvProven:false,economicPromotionAllowed:false,realMoneyAllowed:false},
    guards:{noResetEqualsJackpotWin:true,noPostResetEqualsExactSeed:true,noTriggerAttribution:true,twoFreshUniqueCurrentSamplesRequired:true,noBetting:true,realMoneyAllowed:false}
  };
}

if(import.meta.url===`file://${process.argv[1]}`){
  const ledger=read(LEDGER);const candidate=findNewSynchronizedCandidate(ledger);
  if(!candidate){console.log(JSON.stringify({status:'NOOP',reason:'NO_NEW_POST_FREEZE_SYNCHRONIZED_PAIR_CANDIDATE',protocolFrozenAt:PROTOCOL_FROZEN_AT},null,2));process.exit(0);}
  const first=await sample();await sleep(3000);const second=await sample();const samples=[first,second];
  const evaluation=evaluateCandidate(candidate,samples);
  if(!evaluation.confirmed){console.log(JSON.stringify({status:'FAIL_CLOSED',candidate:{observedAt:candidate.observedAt,previousEUR:candidate.previousEUR,currentEUR:candidate.currentEUR},reason:evaluation.reason,samples},null,2));process.exit(0);}
  const generatedAt=new Date().toISOString();
  fs.mkdirSync('loterias-ai/casino/jackpots/evidence',{recursive:true});
  for(const id of TARGETS){
    const evidence=buildPerIdEvidence(id,candidate,evaluation,samples,generatedAt);
    fs.writeFileSync(`loterias-ai/casino/jackpots/evidence/botemania-${id}-reset-confirm-v1.json`,JSON.stringify(evidence,null,2)+'\n');
  }
  const pair={version:'tiki-pair-latest-auto-confirm-v1',generatedAt,operator:'botemania-es',protocolFrozenAt:PROTOCOL_FROZEN_AT,candidate:{observedAt:candidate.observedAt,previousEUR:candidate.previousEUR,currentEUR:candidate.currentEUR},freshSamples:samples,pairSignature:{eventSynchronized:true,freshPairEqual:evaluation.freshPairEqual,bothConfirmed:true,classification:'SYNCHRONIZED_SHARED_RESET_SIGNATURE'},inference:{exactAliasProven:false,exactGameIdentityProven:false,triggeringGameKnown:false,jackpotWinConfirmed:false,seedPointEstimateEUR:null,currentPositiveEvProven:false,economicPromotionAllowed:false,realMoneyAllowed:false},guards:{correlatedResetNeverEqualsGameBinding:true,noPostResetEqualsExactSeed:true,noTriggerAttribution:true,noBetting:true,realMoneyAllowed:false}};
  fs.writeFileSync('loterias-ai/casino/jackpots/evidence/tiki-pair-latest-auto-confirm-v1.json',JSON.stringify(pair,null,2)+'\n');
  fs.writeFileSync('/tmp/tiki-pair-reset-confirmed','1\n');
  console.log(JSON.stringify({status:'CONFIRMED',candidate:pair.candidate,pairSignature:pair.pairSignature},null,2));
}

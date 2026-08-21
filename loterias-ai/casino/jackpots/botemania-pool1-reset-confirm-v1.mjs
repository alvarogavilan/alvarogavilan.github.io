#!/usr/bin/env node
import fs from 'node:fs';

const ENDPOINT='https://www.botemania.es/es/graphql';
const BASELINE='loterias-ai/casino/jackpots/evidence/botemania-generic-fast-reset-ledger-v1.json';
const OUT='loterias-ai/casino/jackpots/evidence/botemania-pool1-reset-confirm-v1.json';
const TARGET='pool1';
const QUERY='query loadJackpots { jackpots { id amount } }';
const read=p=>{try{return JSON.parse(fs.readFileSync(p,'utf8'));}catch{return null}};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

async function sample(){
  const observedAt=new Date().toISOString();
  try{
    const r=await fetch(ENDPOINT,{method:'POST',headers:{accept:'application/json','content-type':'application/json',venture:'botemania_es',origin:'https://www.botemania.es',referer:'https://www.botemania.es/','cache-control':'no-cache, no-store, max-age=0','user-agent':'loterias-ai-pool1-reset-confirm/1.0'},body:JSON.stringify({operationName:'loadJackpots',variables:{},query:QUERY}),signal:AbortSignal.timeout(10000)});
    const text=await r.text();let body=null;try{body=JSON.parse(text)}catch{}
    const rows=(body?.data?.jackpots||[]).map(x=>({id:String(x?.id??''),amountEUR:Number(x?.amount)})).filter(x=>x.id&&Number.isFinite(x.amountEUR));
    const targetRows=rows.filter(x=>x.id===TARGET);
    const targetDistinctAmounts=[...new Set(targetRows.map(x=>x.amountEUR))];
    return {observedAt,httpStatus:r.status,graphqlErrors:(body?.errors||[]).map(e=>String(e?.message||e)).slice(0,5),rowCount:rows.length,targetRowCount:targetRows.length,targetDistinctAmounts,uniqueIdentityInSnapshot:targetRows.length>=1&&targetDistinctAmounts.length===1,rows};
  }catch(e){return {observedAt,httpStatus:null,graphqlErrors:[String(e?.name||e?.message||e)],rowCount:0,targetRowCount:0,targetDistinctAmounts:[],uniqueIdentityInSnapshot:false,rows:[]};}
}

const baseline=read(BASELINE)||{};
const baseTrack=(baseline?.lastTracks||[]).find(x=>x?.network==='generic'&&x?.id===TARGET)||null;
const baselineEUR=Number.isFinite(Number(baseTrack?.amountEUR))?Number(baseTrack.amountEUR):null;
const baselineIdentityExact=baseTrack?.identityClass==='EXACT_NETWORK_PLUS_UNIQUE_ID';
const baselineObservedAt=baseline?.sourceFeedGeneratedAt||baseline?.generatedAt||null;

const first=await sample();
await sleep(3000);
const second=await sample();
const vals=[first,second].map(s=>s.targetDistinctAmounts.length===1?s.targetDistinctAmounts[0]:null);
const bothCurrentUnique=first.uniqueIdentityInSnapshot===true&&second.uniqueIdentityInSnapshot===true;
const bothFinite=vals.every(Number.isFinite);
const maxCurrent=bothFinite?Math.max(...vals):null;
const minCurrent=bothFinite?Math.min(...vals):null;
const currentBandStable=bothFinite&&maxCurrent>0&&((maxCurrent-minCurrent)/maxCurrent)<=0.05;
const dropEUR=baselineEUR!==null&&maxCurrent!==null?baselineEUR-maxCurrent:null;
const dropFraction=dropEUR!==null&&baselineEUR>0?dropEUR/baselineEUR:null;
const resetScale=dropFraction!==null&&dropFraction>=0.20;
const resetConfirmed=baselineIdentityExact&&bothCurrentUnique&&bothFinite&&currentBandStable&&resetScale;

// Record co-occurring raw IDs/amounts in the second sample for topology research,
// but never treat them as stable identities when one ID carries multiple amounts.
const grouped={};
for(const r of second.rows){(grouped[r.id]??=[]).push(r.amountEUR);}
const cooccurring=Object.entries(grouped).map(([id,amounts])=>({id,distinctAmountsEUR:[...new Set(amounts)],stableWithinSnapshot:[...new Set(amounts)].length===1})).filter(x=>x.id!==TARGET);
const samePostResetAmount=cooccurring.filter(x=>x.distinctAmountsEUR.length===1&&maxCurrent!==null&&Math.abs(x.distinctAmountsEUR[0]-maxCurrent)<0.005);

const out={
  version:'botemania-pool1-reset-confirm-v1',
  generatedAt:new Date().toISOString(),
  operator:'botemania-es',
  target:{network:'generic',id:TARGET},
  baseline:{observedAt:baselineObservedAt,amountEUR:baselineEUR,identityClass:baseTrack?.identityClass||null,identityExact:baselineIdentityExact,rowCount:baseTrack?.rowCount??null,sourceLedgerVersion:baseline?.version||null},
  confirmationSamples:[first,second].map(s=>({observedAt:s.observedAt,httpStatus:s.httpStatus,graphqlErrors:s.graphqlErrors,rowCount:s.rowCount,targetRowCount:s.targetRowCount,targetDistinctAmounts:s.targetDistinctAmounts,uniqueIdentityInSnapshot:s.uniqueIdentityInSnapshot})),
  transition:{baselineEUR,currentMinEUR:minCurrent,currentMaxEUR:maxCurrent,dropEUR:dropEUR!==null?+dropEUR.toFixed(2):null,dropFraction:dropFraction!==null?+dropFraction.toFixed(6):null,currentBandStable,resetScaleThreshold:0.20,classification:resetConfirmed?'CONFIRMED_RESET_OF_STABLE_FEED_ID':'RESET_NOT_CONFIRMED'},
  topologyObservation:{samePostResetAmount,cooccurringAmbiguousIds:cooccurring.filter(x=>!x.stableWithinSnapshot)},
  inference:{
    meterResetConfirmed:resetConfirmed,
    jackpotWinConfirmed:false,
    triggeringGameKnown:false,
    triggeringTierKnown:false,
    seedPointEstimateEUR:null,
    postResetSeedUpperBoundEUR:resetConfirmed?maxCurrent:null,
    currentPositiveEvProven:false,
    economicPromotionAllowed:false,
    realMoneyAllowed:false,
    reason:resetConfirmed?'The exact stable feed ID pool1 fell by at least 20% from its committed exact-ID baseline and remained in the low post-drop band across two fresh unique-ID samples. This proves a meter reset/large drop of pool1, not a jackpot win, triggering game, tier, or exact seed.':'Required stable-ID reset confirmation conditions did not all pass.'
  },
  guards:{baselineMustBeExactStableId:true,twoFreshUniqueCurrentSamplesRequired:true,noRankIdentity:true,noResetEqualsJackpotWin:true,noPostResetEqualsExactSeed:true,noTriggerAttribution:true,noBetting:true,realMoneyAllowed:false}
};
fs.mkdirSync('loterias-ai/casino/jackpots/evidence',{recursive:true});
fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({baseline:out.baseline,confirmationSamples:out.confirmationSamples,transition:out.transition,topologyObservation:out.topologyObservation,inference:out.inference},null,2));

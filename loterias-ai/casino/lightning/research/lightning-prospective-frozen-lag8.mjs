#!/usr/bin/env node
import fs from 'node:fs';

const DATA='loterias-ai/casino/lightning/data/casinoorg-lightningroulette.jsonl';
const FREEZE='loterias-ai/casino/lightning/evidence/prospective-lag8-freeze.json';
const OUT='loterias-ai/casino/lightning/evidence/prospective-lag8.json';
const LAG=8, P0=1/37, MIN_N=1000, ALPHA=0.01;

const rows=fs.readFileSync(DATA,'utf8').trim().split(/\n+/).filter(Boolean).map(JSON.parse)
  .filter(x=>x.trainingEligible!==false&&Number.isInteger(Number(x.winner))&&Number(x.winner)>=0&&Number(x.winner)<=36&&typeof x.timestamp==='string'&&x.timestamp.length>0)
  .sort((a,b)=>String(a.timestamp).localeCompare(String(b.timestamp)));
if(rows.length<100) throw new Error(`Need >=100 authoritative rows, got ${rows.length}`);

let freeze;
if(fs.existsSync(FREEZE)) {
  freeze=JSON.parse(fs.readFileSync(FREEZE,'utf8'));
  if(freeze.lag!==LAG || !freeze.cutoffTimestamp) throw new Error('Invalid immutable lag-8 freeze');
} else {
  freeze={
    version:'lightning-prospective-lag8-freeze-v1',
    createdAt:new Date().toISOString(),
    lag:LAG,
    cutoffTimestamp:rows.at(-1).timestamp,
    baselineProbability:P0,
    minimumProspectiveComparisons:MIN_N,
    alpha:ALPHA,
    selectedFrom:'lightning-permutation-walkforward-v3',
    exploratorySelectionPUpper:0.04147926036981509,
    multiplicityNote:'lag 8 was selected exploratorily from 20 lags; this prospective test is the confirmatory lane',
    immutable:true,
    claimAllowed:false,
    realMoney:false
  };
  fs.writeFileSync(FREEZE,JSON.stringify(freeze,null,2)+'\n');
}

const all=rows.map(r=>({t:r.timestamp,w:Number(r.winner)}));
let matches=0,n=0;
for(let i=LAG;i<all.length;i++){
  if(all[i].t<=freeze.cutoffTimestamp) continue;
  // Both observations must be in chronological sequence; the target observation alone defines prospectivity.
  n++;
  if(all[i].w===all[i-LAG].w) matches++;
}

function logChoose(n,k){let s=0;for(let i=1;i<=k;i++)s+=Math.log(n-k+i)-Math.log(i);return s}
function binomUpper(n,k,p){
  if(n===0) return null;
  let sum=0;
  for(let x=k;x<=n;x++){
    const lp=logChoose(n,x)+x*Math.log(p)+(n-x)*Math.log1p(-p);
    sum+=Math.exp(lp);
    if(sum>=1) return 1;
  }
  return Math.min(1,sum);
}
const rate=n?matches/n:null,pUpper=n?binomUpper(n,matches,P0):null;
const enough=n>=MIN_N;
const statisticallyPass=enough&&pUpper!==null&&pUpper<ALPHA&&rate>P0;
const payload={
  version:'lightning-prospective-frozen-lag8-v1',generatedAt:new Date().toISOString(),
  freeze:{lag:freeze.lag,cutoffTimestamp:freeze.cutoffTimestamp,baselineProbability:P0,minimumProspectiveComparisons:MIN_N,alpha:ALPHA},
  prospective:{comparisons:n,matches,rate,pUpper,excessVsUniform:rate==null?null:rate-P0,enoughData:enough,statisticallyPass},
  guards:{frozenBeforeProspectiveObservation:true,noRetuning:true,claimAllowed:false,realMoney:false,realMoneyAuthorized:false,authorizedStakeEUR:0,next:enough?'review-confirmatory-result':'accumulate-authoritative-prospective-rounds'}
};
fs.writeFileSync(OUT,JSON.stringify(payload,null,2)+'\n');
console.log(JSON.stringify(payload,null,2));

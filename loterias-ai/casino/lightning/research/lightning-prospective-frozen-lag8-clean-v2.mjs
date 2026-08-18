#!/usr/bin/env node
import fs from 'node:fs';

const DATA='loterias-ai/casino/lightning/data/casinoorg-lightningroulette-segment-v2.jsonl';
const FREEZE='loterias-ai/casino/lightning/evidence/prospective-lag8-clean-v2-freeze-v1.json';
const OUT='loterias-ai/casino/lightning/evidence/prospective-lag8-clean-v2-status-v1.json';

const freeze=JSON.parse(fs.readFileSync(FREEZE,'utf8'));
if(freeze?.guards?.immutable!==true || freeze?.protocol?.noRetuning!==true || freeze?.lag!==8) throw new Error('Invalid clean lag8 freeze');
if(freeze?.protocol?.performanceBlindBeforeBoundary!==true || freeze?.protocol?.first1000Only!==true) throw new Error('Blind fixed-boundary protocol required');

const rows=fs.readFileSync(DATA,'utf8').trim().split(/\n+/).filter(Boolean).map(JSON.parse)
  .filter(x=>x.trainingEligible!==false&&Number.isInteger(Number(x.winner))&&Number(x.winner)>=0&&Number(x.winner)<=36&&typeof x.timestamp==='string'&&x.timestamp.length>0)
  .sort((a,b)=>String(a.timestamp).localeCompare(String(b.timestamp)));

const start=String(freeze.prospectiveStartsAt);
const lag=Number(freeze.lag);
const boundary=Number(freeze.fixedBoundaryComparisons);
const p0=Number(freeze.baselineProbability);
const alpha=Number(freeze.alpha);
const totalReturn=Number(freeze.economicModel?.nonMultipliedStraightUpTotalReturn);
const breakEven=Number(freeze.economicModel?.conservativeBreakEvenHitRate);
if(!Number.isInteger(boundary)||boundary<=0||!Number.isFinite(totalReturn)||totalReturn<=0) throw new Error('Invalid economic boundary');

const comparisons=[];
for(let i=lag;i<rows.length;i++){
  if(String(rows[i].timestamp)<start) continue;
  comparisons.push({
    t:String(rows[i].timestamp),
    hit:Number(rows[i].winner)===Number(rows[i-lag].winner)
  });
}

const used=comparisons.slice(0,boundary);
const n=used.length;
const complete=n>=boundary;
const remaining=Math.max(0,boundary-n);

function logChoose(n,k){let s=0;for(let i=1;i<=k;i++)s+=Math.log(n-k+i)-Math.log(i);return s;}
function binomUpper(n,k,p){
  let sum=0;
  for(let x=k;x<=n;x++){
    const lp=logChoose(n,x)+x*Math.log(p)+(n-x)*Math.log1p(-p);
    sum+=Math.exp(lp);
    if(sum>=1)return 1;
  }
  return Math.min(1,sum);
}

let final=null;
if(complete){
  const matches=used.reduce((s,x)=>s+(x.hit?1:0),0);
  const rate=matches/boundary;
  const pUpper=binomUpper(boundary,matches,p0);
  const conservativeBaseRoi=totalReturn*rate-1;
  const statisticalPass=pUpper<alpha&&rate>p0;
  const economicPass=rate>breakEven&&conservativeBaseRoi>0;
  final={
    comparisons:boundary,
    matches,
    hitRate:rate,
    baselineProbability:p0,
    pUpper,
    alpha,
    conservativeBreakEvenHitRate:breakEven,
    conservativeBaseRoi,
    conservativeProfitPer100Units:conservativeBaseRoi*100,
    luckyMultiplierUpliftIncluded:false,
    statisticalPass,
    economicPass,
    scientificPromotionCandidate:statisticalPass&&economicPass
  };
}

const payload={
  version:'lightning-prospective-lag8-clean-v2-status-v1',
  generatedAt:new Date().toISOString(),
  freezeVersion:freeze.version,
  sourceSegment:freeze.sourceSegment,
  prospectiveStartsAt:start,
  progress:{
    totalCleanRows:rows.length,
    fixedBoundaryComparisons:boundary,
    comparisonsUsed:n,
    comparisonsRemaining:remaining,
    firstEligibleAt:used[0]?.t||null,
    lastEligibleAt:used.at(-1)?.t||null,
    postBoundaryRowsIgnored:Math.max(0,comparisons.length-boundary)
  },
  disclosure: complete ? {
    policy:'FIXED_BOUNDARY_FINAL_DISCLOSURE',
    performanceHidden:false,
    pValueHidden:false,
    directionHidden:false
  } : {
    policy:'ADMINISTRATIVE_PROGRESS_ONLY',
    performanceHidden:true,
    pValueHidden:true,
    directionHidden:true
  },
  final,
  gates:{
    fixedBoundaryComplete:complete,
    statisticalPass:final?.statisticalPass===true,
    conservativeEconomicPass:final?.economicPass===true,
    scientificPromotionCandidate:final?.scientificPromotionCandidate===true,
    automaticBettingAllowed:false,
    realMoneyAllowed:false
  },
  guards:{
    ruleFrozenBeforeProspectiveStart:true,
    first1000Only:true,
    noRetuning:true,
    noOptionalStopping:true,
    postBoundaryCannotRescue:true,
    luckyMultiplierUpliftExcludedFromPromotion:true,
    realMoneyAllowed:false,
    realStakeEUR:0
  }
};

fs.writeFileSync(OUT,JSON.stringify(payload,null,2)+'\n');
console.log(JSON.stringify(payload,null,2));

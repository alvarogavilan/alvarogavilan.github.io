#!/usr/bin/env node
import fs from 'node:fs';

const DATA='loterias-ai/casino/lightning/data/casinoorg-lightningroulette-segment-v2.jsonl';
const FREEZE='loterias-ai/casino/lightning/evidence/prospective-transition-family-v1-freeze.json';
const OUT='loterias-ai/casino/lightning/evidence/prospective-transition-family-v1-status.json';
const freeze=JSON.parse(fs.readFileSync(FREEZE,'utf8'));
if(freeze.version!=='lightning-prospective-transition-family-v1-freeze'||freeze.fixedBoundaryRounds!==5000||freeze.perCandidateAlpha!==0.00125||freeze.realMoneyAllowed!==false)throw new Error('transition family freeze drift');
const rows=fs.readFileSync(DATA,'utf8').trim().split(/\n+/).filter(Boolean).map(x=>JSON.parse(x)).filter(r=>r.trainingEligible===true&&Number.isInteger(Number(r.winner))).sort((a,b)=>String(a.timestamp).localeCompare(String(b.timestamp)));
const wheel=freeze.rouletteWheelOrder.map(Number),wheelIndex=new Map(wheel.map((n,i)=>[n,i])),N=freeze.fixedBoundaryRounds,start=freeze.prospectiveStartsAt;
const ids=freeze.candidateFamily;
const historyWinners=rows.map(r=>Number(r.winner));
const eligibleIndices=[];for(let i=0;i<rows.length;i++)if(String(rows[i].timestamp)>=start)eligibleIndices.push(i);
const used=eligibleIndices.slice(0,N),postBoundaryRowsIgnored=Math.max(0,eligibleIndices.length-N);
const addWheel=(n,delta)=>wheel[(wheelIndex.get(n)+delta+wheel.length)%wheel.length];
function markovMode(i,limit){
  const prev=historyWinners[i-1];if(prev===undefined)return 0;
  const counts=new Map();const first=Math.max(0,i-1-limit);
  for(let j=first;j<i-1;j++)if(historyWinners[j]===prev){const next=historyWinners[j+1];counts.set(next,(counts.get(next)||0)+1)}
  if(!counts.size)return prev;
  return [...counts.entries()].sort((a,b)=>b[1]-a[1]||a[0]-b[0])[0][0];
}
function predictions(i){
  const prev=historyWinners[i-1]??0,two=historyWinners[i-2]??prev;
  return [prev,two,addWheel(prev,1),addWheel(prev,-1),addWheel(prev,Math.floor(wheel.length/2)),markovMode(i,50),markovMode(i,200),markovMode(i,Number.MAX_SAFE_INTEGER)];
}
const stats=Object.fromEntries(ids.map(id=>[id,{hits:0}]));
for(const i of used){const truth=historyWinners[i],preds=predictions(i);for(let k=0;k<ids.length;k++)if(preds[k]===truth)stats[ids[k]].hits++;}
function binomTail(n,k,p){if(k<=0)return 1;let prob=(1-p)**n,cdf=prob;for(let x=0;x<k-1;x++){prob*=((n-x)/(x+1))*(p/(1-p));cdf+=prob;}return Math.max(0,Math.min(1,1-cdf));}
function wilsonLower(k,n,z=1.959963984540054){if(!n)return 0;const ph=k/n,den=1+z*z/n,center=ph+z*z/(2*n),adj=z*Math.sqrt(ph*(1-ph)/n+z*z/(4*n*n));return (center-adj)/den;}
let final=null;
if(used.length===N){
  const p0=Number(freeze.nullHitProbability),breakEven=Number(freeze.economicBreakEvenHitRate),alpha=Number(freeze.perCandidateAlpha);
  const candidates=ids.map(id=>{const hits=stats[id].hits,hitRate=hits/N,pValue=binomTail(N,hits,p0),wilson95Lower=wilsonLower(hits,N),conservativeROI=(hits*Number(freeze.nonMultipliedGrossReturnX)-N)/N,pass=pValue<alpha&&hitRate>breakEven&&wilson95Lower>breakEven&&conservativeROI>0;return{id,hits,hitRate,pValue,wilson95Lower,conservativeROI,pass};}).sort((a,b)=>a.pValue-b.pValue||b.hitRate-a.hitRate||a.id.localeCompare(b.id));
  final={fixedBoundaryRounds:N,candidates,anyScientificPromotionCandidate:candidates.some(x=>x.pass),familyWiseAlpha:freeze.familyWiseAlpha,perCandidateAlpha:freeze.perCandidateAlpha,interpretation:candidates.some(x=>x.pass)?'AT_LEAST_ONE_FROZEN_TRANSITION_SELECTOR_PASSED_FIXED_PROSPECTIVE_GATE_REPLICATION_REQUIRED':'NO_FROZEN_TRANSITION_SELECTOR_PASSED_FIXED_PROSPECTIVE_GATE'};
}
const status={
  version:'lightning-prospective-transition-family-v1-status',generatedAt:new Date().toISOString(),freezeVersion:freeze.version,sourceSegment:freeze.sourceSegment,prospectiveStartsAt:start,
  progress:{totalCleanRows:rows.length,fixedBoundaryRounds:N,roundsUsed:used.length,roundsRemaining:Math.max(0,N-used.length),firstEligibleAt:used.length?rows[used[0]].timestamp:null,lastEligibleAt:used.length?rows[used.at(-1)].timestamp:null,postBoundaryRowsIgnored},
  disclosure:{policy:'ADMINISTRATIVE_PROGRESS_ONLY',candidatePerformanceHidden:used.length<N,candidateRankingHidden:used.length<N,roiHidden:used.length<N,pValuesHidden:used.length<N},
  final,
  gates:{fixedBoundaryComplete:used.length===N,scientificPromotionCandidate:final?.anyScientificPromotionCandidate===true,automaticBettingAllowed:false,realMoneyAllowed:false},
  guards:{pastInformationOnly:true,currentRoundWinnerForbiddenForSelection:true,currentRoundLuckySelectionForbidden:true,first5000Only:true,noRetuning:true,noOptionalStopping:true,bonferroniFamilyWiseAlpha:0.01,perCandidateAlpha:0.00125,luckyMultiplierUpliftExcludedFromPromotion:true,realMoneyAllowed:false,realStakeEUR:0}
};
fs.writeFileSync(OUT,JSON.stringify(status,null,2)+'\n');
console.log(JSON.stringify({progress:status.progress,disclosure:status.disclosure,gates:status.gates},null,2));

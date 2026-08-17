#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const input='loterias-ai/casino/lightning/data/casinoorg-lightningroulette.jsonl';
const output='loterias-ai/casino/lightning/evidence/economic-coverage-window-v1.json';
const TOTAL_STAKE=15;
const WINDOWS=[4,5,6,7,8,9,10];
const COVERAGES=[3,4];
const N=37;
const NORMAL_GROSS_X=30;

function wilson(hits,total,z=1.96){
  if(!total)return {lower:null,upper:null};
  const p=hits/total,zz=z*z,den=1+zz/total;
  const center=(p+zz/(2*total))/den;
  const half=z*Math.sqrt((p*(1-p)+zz/(4*total))/total)/den;
  return {lower:Math.max(0,center-half),upper:Math.min(1,center+half)};
}
function round(v,d=6){return Number.isFinite(v)?Number(v.toFixed(d)):null}
function timestampOf(r){
  const v=r.ts??r.timestamp??r.time??r.observedAt??r.createdAt;
  const t=Date.parse(v);
  return Number.isFinite(t)?t:null;
}
function luckyPairs(r){
  if(Array.isArray(r.lightning))return r.lightning.map(x=>({number:Number(x?.number),multiplier:Number(x?.multiplier)})).filter(x=>Number.isInteger(x.number)&&x.number>=0&&x.number<=36);
  if(Array.isArray(r.luckyNumbers)&&r.luckyNumbers.some(x=>typeof x==='object'))return r.luckyNumbers.map(x=>({number:Number(x?.number??x?.value),multiplier:Number(x?.multiplier)})).filter(x=>Number.isInteger(x.number)&&x.number>=0&&x.number<=36);
  const nums=Array.isArray(r.allLuckyNumbers)?r.allLuckyNumbers:(Array.isArray(r.luckyNumbers)?r.luckyNumbers:[]);
  const mults=Array.isArray(r.allLuckyMultipliers)?r.allLuckyMultipliers:[];
  return nums.map((n,i)=>({number:Number(n),multiplier:Number(mults[i])})).filter(x=>Number.isInteger(x.number)&&x.number>=0&&x.number<=36);
}
function classifyGap(g){
  if(g==null)return null;
  if(g<=3)return '0-3';
  if(g<=7)return '4-7';
  if(g<=15)return '8-15';
  return '16+';
}

const raw=fs.readFileSync(input,'utf8').split(/\r?\n/).filter(Boolean).map((line,i)=>({r:JSON.parse(line),rawIndex:i}));
let rows=raw.filter(x=>x.r.trainingEligible!==false&&Number.isInteger(Number(x.r.winner))&&Number(x.r.winner)>=0&&Number(x.r.winner)<=36).map(x=>{
  const pairs=luckyPairs(x.r);
  const winner=Number(x.r.winner);
  const winnerPair=pairs.find(p=>p.number===winner);
  const explicitMultiplier=Number(x.r.winnerMultiplier);
  const multiplier=Number.isFinite(explicitMultiplier)&&explicitMultiplier>0?explicitMultiplier:(Number.isFinite(winnerPair?.multiplier)&&winnerPair.multiplier>0?winnerPair.multiplier:null);
  return {...x,winner,ts:timestampOf(x.r),pairs,winnerLightning:Boolean(x.r.winnerIsLightning??winnerPair),winnerMultiplier:multiplier};
});
const validTs=rows.filter(x=>x.ts!=null).length;
if(validTs===rows.length)rows.sort((a,b)=>a.ts-b.ts||a.rawIndex-b.rawIndex);
const n=rows.length;
if(n<100)throw new Error(`Insufficient rows for economic study: ${n}`);

const winnerLightningEvents=rows.map(x=>x.winnerLightning);
const eventCount=winnerLightningEvents.filter(Boolean).length;
const eventRate=eventCount/n;
const eventMultipliers=rows.filter(x=>x.winnerLightning&&Number.isFinite(x.winnerMultiplier)).map(x=>x.winnerMultiplier);
const multiplierFreq={};for(const m of eventMultipliers)multiplierFreq[m]=(multiplierFreq[m]||0)+1;

const interEventGaps=[];let prev=null;
for(let i=0;i<n;i++)if(winnerLightningEvents[i]){if(prev!=null)interEventGaps.push(i-prev);prev=i;}
const sortedGaps=[...interEventGaps].sort((a,b)=>a-b);
const q=p=>sortedGaps.length?sortedGaps[Math.min(sortedGaps.length-1,Math.floor((sortedGaps.length-1)*p))]:null;
const gapSummary={count:sortedGaps.length,min:sortedGaps[0]??null,p25:q(.25),median:q(.5),p75:q(.75),p90:q(.9),max:sortedGaps.at(-1)??null,mean:round(interEventGaps.reduce((a,b)=>a+b,0)/Math.max(1,interEventGaps.length),3)};

const theoreticalCoverage={};
for(const k of COVERAGES){
  const stakePerNumber=TOTAL_STAKE/k;
  const normalHitNet=NORMAL_GROSS_X*stakePerNumber-TOTAL_STAKE;
  const baseline=k/N;
  const breakEven=k/NORMAL_GROSS_X;
  const windows={};
  for(const h of WINDOWS){
    const anyHit=1-Math.pow(1-baseline,h);
    const firstHitAtEndNet=NORMAL_GROSS_X*stakePerNumber-TOTAL_STAKE*h;
    windows[h]={
      nullProbabilityAtLeastOneCoveredWinner:round(anyHit),
      netPnlIfOnlyOneNormalHitOccursOnRoundH:round(firstHitAtEndNet,2),
      positiveIfSingleNormalHitNoLaterThanRound:Math.floor(NORMAL_GROSS_X/k-1e-12),
      expectedPnlWithoutLightningEUR:round(h*TOTAL_STAKE*(NORMAL_GROSS_X/N-1),2)
    };
  }
  theoreticalCoverage[k]={
    totalStakeEUR:TOTAL_STAKE,
    stakePerNumberEUR:round(stakePerNumber,2),
    uniformSingleRoundHitProbability:round(baseline),
    normalHitNetPnlEUR:round(normalHitNet,2),
    breakEvenHitRateWithoutLightning:round(breakEven),
    requiredRelativeLiftVsUniform:round(breakEven/baseline-1),
    windows
  };
}

const windowStudy={};
for(const h of WINDOWS){
  let hits=0,total=0,lastEvent=null;
  const buckets={};for(const b of ['0-3','4-7','8-15','16+'])buckets[b]={hits:0,total:0};
  for(let i=0;i<n-h;i++){
    if(winnerLightningEvents[i])lastEvent=i;
    const future=winnerLightningEvents.slice(i+1,i+1+h).some(Boolean);
    hits+=future?1:0;total++;
    const b=classifyGap(lastEvent==null?null:i-lastEvent);
    if(b){buckets[b].total++;if(future)buckets[b].hits++;}
  }
  const unconditional=hits/Math.max(1,total);
  const conditional={};
  for(const [b,x] of Object.entries(buckets)){
    const rate=x.hits/Math.max(1,x.total);
    const ci=wilson(x.hits,x.total);
    conditional[b]={anchors:x.total,hits:x.hits,rate:round(rate),ratioVsUnconditional:round(rate/Math.max(unconditional,1e-12)),wilson95:{lower:round(ci.lower),upper:round(ci.upper)}};
  }
  const ci=wilson(hits,total);
  windowStudy[h]={anchors:total,hits,unconditionalRate:round(unconditional),wilson95:{lower:round(ci.lower),upper:round(ci.upper)},conditionalByRoundsSinceLastWinningLightning:conditional};
}

let payoutUsable=0,payoutFactorSum=0;
for(const row of rows){
  let factor=NORMAL_GROSS_X;
  if(row.winnerLightning){
    if(!Number.isFinite(row.winnerMultiplier))continue;
    factor=row.winnerMultiplier;
  }
  payoutUsable++;
  payoutFactorSum+=factor;
}
const avgWinnerPayoutFactor=payoutFactorSum/Math.max(1,payoutUsable);
const empiricalRandomCoverageExpectedGrossEUR=TOTAL_STAKE*avgWinnerPayoutFactor/N;
const empiricalRandomCoverageExpectedPnlEUR=empiricalRandomCoverageExpectedGrossEUR-TOTAL_STAKE;

const result={
  version:'economic-coverage-window-v1',
  generatedAt:new Date().toISOString(),
  mode:'PAPER_ONLY',
  source:{file:input,rounds:n,chronologySortedByTimestamp:validTs===rows.length,timestampsParsed:validTs},
  gameAssumptions:{singleZeroNumbers:N,normalStraightGrossReturnX:NORMAL_GROSS_X,totalStakeEUR:TOTAL_STAKE,luckyPayoutInterpretation:'gross return multiplier x when winner is covered; current Evolution wording',realMoney:false},
  theoreticalCoverage,
  observedLightning:{winningLightningEvents:eventCount,winningLightningRate:round(eventRate),winningLightningWilson95:Object.fromEntries(Object.entries(wilson(eventCount,n)).map(([k,v])=>[k,round(v)])),winningMultiplierObserved:eventMultipliers.length,multiplierFrequency:multiplierFreq,interWinningLightningGapRounds:gapSummary},
  multiplierWindowStudy4to10:windowStudy,
  empiricalRandomCoverageEconomics:{usableRounds:payoutUsable,averageWinnerPayoutFactorX:round(avgWinnerPayoutFactor),expectedGrossPer15EURRound:round(empiricalRandomCoverageExpectedGrossEUR,4),expectedPnlPer15EURRound:round(empiricalRandomCoverageExpectedPnlEUR,4),expectedRoi:round(empiricalRandomCoverageExpectedPnlEUR/TOTAL_STAKE),note:'Baseline expectation for number selection independent of the future winner. Coverage 3 and 4 have the same random expected value; coverage changes variance and hit frequency, not baseline EV.'},
  interpretation:{
    normalHitConditional:'Con 15 EUR repartidos por igual, un único acierto normal produce un cobro grande, pero la viabilidad de sesión depende de cuántas rondas se hayan financiado antes del acierto.',
    multiplierTiming:'La ausencia previa de un ganador Lightning no se trata como prueba de que uno esté debido. Las ventanas 4-10 sólo son una hipótesis empírica que debe superar NULL, OOS y prospectivo.',
    predictiveUseAllowed:false,
    realMoneyAllowed:false,
    nextGate:'freeze a rule using only past data, then validate window/timing signal out-of-sample and prospectively'
  }
};
fs.mkdirSync(path.dirname(output),{recursive:true});
fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n');
console.log('ECONOMIC_STUDY_JSON_START');
console.log(JSON.stringify(result,null,2));
console.log('ECONOMIC_STUDY_JSON_END');

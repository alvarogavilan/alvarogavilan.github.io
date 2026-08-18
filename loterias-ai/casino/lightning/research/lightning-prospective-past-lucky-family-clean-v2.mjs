#!/usr/bin/env node
import fs from 'node:fs';

const DATA='loterias-ai/casino/lightning/data/casinoorg-lightningroulette-segment-v2.jsonl';
const FREEZE='loterias-ai/casino/lightning/evidence/prospective-past-lucky-family-clean-v2-freeze-v1.json';
const OUT='loterias-ai/casino/lightning/evidence/prospective-past-lucky-family-clean-v2-status-v1.json';
const WHEEL=[0,32,15,19,4,21,2,25,17,34,6,27,13,36,11,30,8,23,10,5,24,16,33,1,20,14,31,9,22,18,29,7,28,12,35,3,26];
const POS=new Map(WHEEL.map((n,i)=>[n,i]));

const freeze=JSON.parse(fs.readFileSync(FREEZE,'utf8'));
const expected=['previousLuckyMaxMultiplier','previousLuckyMinMultiplier','previousLuckyWheelNearestPreviousWinner','previousLuckyWheelFarthestPreviousWinner'];
if(freeze.version!=='lightning-prospective-past-lucky-family-clean-v2-freeze-v1'||freeze.immutable!==true||freeze.realMoneyAllowed!==false)throw new Error('invalid immutable past-lucky freeze');
if(JSON.stringify(freeze.candidateFamily)!==JSON.stringify(expected))throw new Error('past-lucky candidate family drift');
const START=Date.parse(freeze.prospectiveStartsAt), B=Number(freeze.fixedBoundaryRounds), P0=Number(freeze.nullHitProbability), BREAK=Number(freeze.economicBreakEvenHitRate), FWA=Number(freeze.familyWiseAlpha), PER=FWA/expected.length;
if(!Number.isFinite(START)||B!==5000||Math.abs(P0-1/37)>1e-12||Math.abs(BREAK-1/30)>1e-12||FWA!==0.01||Math.abs(PER-0.0025)>1e-12)throw new Error('past-lucky economic protocol drift');

function luckyPairs(r){
  const nums=Array.isArray(r.allLuckyNumbers)?r.allLuckyNumbers:[];
  const mults=Array.isArray(r.allLuckyMultipliers)?r.allLuckyMultipliers:[];
  return nums.map((n,i)=>({number:Number(n),multiplier:Number(mults[i])})).filter(x=>Number.isInteger(x.number)&&x.number>=0&&x.number<=36);
}
function wheelDistance(a,b){const x=POS.get(a),y=POS.get(b),d=Math.abs(x-y);return Math.min(d,37-d);}
function choose(prev,id){
  const pairs=luckyPairs(prev);
  if(!pairs.length||pairs.some(p=>!Number.isFinite(p.multiplier)||p.multiplier<=0))return null;
  if(id==='previousLuckyMaxMultiplier')return [...pairs].sort((a,b)=>b.multiplier-a.multiplier||a.number-b.number)[0].number;
  if(id==='previousLuckyMinMultiplier')return [...pairs].sort((a,b)=>a.multiplier-b.multiplier||a.number-b.number)[0].number;
  if(id==='previousLuckyWheelNearestPreviousWinner')return [...pairs].sort((a,b)=>wheelDistance(a.number,prev.winner)-wheelDistance(b.number,prev.winner)||a.number-b.number)[0].number;
  if(id==='previousLuckyWheelFarthestPreviousWinner')return [...pairs].sort((a,b)=>wheelDistance(b.number,prev.winner)-wheelDistance(a.number,prev.winner)||a.number-b.number)[0].number;
  throw new Error(`unknown selector ${id}`);
}
function logChoose(n,k){let s=0;for(let i=1;i<=k;i++)s+=Math.log(n-k+i)-Math.log(i);return s;}
function binomUpper(n,k,p){let sum=0;for(let x=k;x<=n;x++){sum+=Math.exp(logChoose(n,x)+x*Math.log(p)+(n-x)*Math.log1p(-p));if(sum>=1)return 1;}return Math.min(1,sum);}
function wilson(n,k,z=1.959963984540054){const ph=k/n,den=1+z*z/n,c=(ph+z*z/(2*n))/den,h=z*Math.sqrt((ph*(1-ph)+z*z/(4*n))/n)/den;return{lower:c-h,upper:c+h};}

const rows=fs.readFileSync(DATA,'utf8').trim().split(/\n+/).filter(Boolean).map(JSON.parse)
  .filter(r=>r.trainingEligible!==false&&Number.isInteger(Number(r.winner))&&Number(r.winner)>=0&&Number(r.winner)<=36&&typeof r.timestamp==='string')
  .map(r=>({...r,winner:Number(r.winner)})).sort((a,b)=>String(a.timestamp).localeCompare(String(b.timestamp)));
const eligible=[];
for(let i=1;i<rows.length;i++){
  if(Date.parse(rows[i].timestamp)<=START)continue;
  const prev=rows[i-1];
  if(expected.every(id=>Number.isInteger(choose(prev,id))))eligible.push(i);
}
const used=eligible.slice(0,B), enough=used.length>=B;
const out={
  version:'lightning-prospective-past-lucky-family-clean-v2-status-v1',generatedAt:new Date().toISOString(),freezeVersion:freeze.version,sourceSegment:'authoritative-v2',prospectiveStartsAt:freeze.prospectiveStartsAt,
  progress:{totalCleanRows:rows.length,fixedBoundaryRounds:B,roundsUsed:used.length,roundsRemaining:Math.max(0,B-used.length),firstEligibleAt:used.length?rows[used[0]].timestamp:null,lastEligibleAt:used.length?rows[used.at(-1)].timestamp:null,postBoundaryRowsIgnored:Math.max(0,eligible.length-B)},
  disclosure:{policy:enough?'FIXED_BOUNDARY_OPEN':'ADMINISTRATIVE_PROGRESS_ONLY',candidatePerformanceHidden:!enough,candidateRankingHidden:!enough,roiHidden:!enough,pValuesHidden:!enough},
  final:null,
  gates:{fixedBoundaryComplete:enough,anyStatisticalAndEconomicPass:false,independentReplicationStillRequired:true,automaticBettingAllowed:false,realMoneyAllowed:false},
  guards:{pastInformationOnly:true,currentRoundLuckySelectionForbidden:true,allFourSelectorsFrozenBeforeProspectiveStart:true,first5000Only:true,noRetuning:true,noOptionalStopping:true,bonferroniFamilyWiseAlpha:FWA,perCandidateAlpha:PER,postBoundaryCannotRescue:true,realMoneyAllowed:false,realStakeEUR:0}
};
if(enough){
  const results=expected.map(id=>{
    let hits=0,actualGross=0;
    for(const i of used){
      const pick=choose(rows[i-1],id),row=rows[i];
      if(pick!==row.winner)continue;
      hits++;
      const currentLucky=luckyPairs(row).find(x=>x.number===row.winner);
      actualGross+=Number.isFinite(currentLucky?.multiplier)&&currentLucky.multiplier>0?currentLucky.multiplier:30;
    }
    const rate=hits/B,p=binomUpper(B,hits,P0),ci=wilson(B,hits),conservativeROI=(hits*30-B)/B,actualROI=(actualGross-B)/B;
    const pass=p<PER&&rate>BREAK&&ci.lower>BREAK&&conservativeROI>0;
    return{id,hits,n:B,rate,pUpper:p,wilson95:ci,conservativeNonMultipliedROI:conservativeROI,actualObservedROIIncludingLuckyUplift:actualROI,statisticalPass:p<PER,economicBreakEvenPass:rate>BREAK,lowerBoundEconomicPass:ci.lower>BREAK,promotionCandidate:pass};
  });
  out.final={results,passingSelectors:results.filter(x=>x.promotionCandidate).map(x=>x.id),familyWiseAlpha:FWA,perCandidateAlpha:PER,economicBreakEvenHitRate:BREAK,nonMultipliedGrossReturnX:30};
  out.gates.anyStatisticalAndEconomicPass=out.final.passingSelectors.length>0;
}
const semantic=JSON.stringify(out);let oldCore=null;if(fs.existsSync(OUT)){const old=JSON.parse(fs.readFileSync(OUT,'utf8'));delete old.generatedAt;oldCore=JSON.stringify(old);}const core=JSON.parse(semantic);delete core.generatedAt;if(oldCore===JSON.stringify(core)){console.log(JSON.stringify({changed:false,...out.progress,fixedBoundaryComplete:enough}));process.exit(0);}fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify({changed:true,...out.progress,fixedBoundaryComplete:enough},null,2));

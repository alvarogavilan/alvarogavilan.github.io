#!/usr/bin/env node
import fs from 'node:fs';

const DATA='loterias-ai/casino/xxxtreme/discovery/history-72h.jsonl';
const FREEZE='loterias-ai/casino/xxxtreme/evidence/prospective-selected-family-v1-freeze.json';
const OUT='loterias-ai/casino/xxxtreme/discovery/selected-family-untouched-audit-v1.json';
const wheel=[0,32,15,19,4,21,2,25,17,34,6,27,13,36,11,30,8,23,10,5,24,16,33,1,20,14,31,9,22,18,29,7,28,12,35,3,26];
const wi=new Map(wheel.map((n,i)=>[n,i]));
const rows=fs.readFileSync(DATA,'utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse).sort((a,b)=>String(a.timestamp).localeCompare(String(b.timestamp)));
const freeze=JSON.parse(fs.readFileSync(FREEZE,'utf8'));
if(freeze.version!=='xxxtreme-prospective-selected-family-v1-freeze'||freeze.selectedCandidates?.length!==8||freeze.guards?.postCutoffHistoricalRowsNotUsedForCandidateSelection!==true)throw new Error('selected-family freeze drift');
const cutoff=freeze.selectionCutoff;
const holdoutIndices=[];for(let i=0;i<rows.length;i++)if(String(rows[i].timestamp)>=cutoff)holdoutIndices.push(i);
if(holdoutIndices.length!==333)throw new Error(`expected 333 untouched rows, got ${holdoutIndices.length}`);
const winners=rows.map(r=>Number(r.winner));
function predict(spec,i){
  const prev=winners[i-1]??0;
  if(spec.type==='lag')return winners[i-Number(spec.k)]??prev;
  if(spec.type==='wheelOffset')return wheel[(wi.get(prev)+Number(spec.offset)+wheel.length)%wheel.length];
  if(spec.type==='frequencyHot'){
    const window=Number(spec.window),counts=new Map();
    for(const x of winners.slice(Math.max(0,i-window),i))counts.set(x,(counts.get(x)||0)+1);
    return Array.from({length:37},(_,n)=>[n,counts.get(n)||0]).sort((a,b)=>b[1]-a[1]||a[0]-b[0])[0][0];
  }
  throw new Error(`unsupported frozen spec ${JSON.stringify(spec)}`);
}
function binomTail(n,k,p){if(k<=0)return 1;let prob=(1-p)**n,cdf=prob;for(let x=0;x<k-1;x++){prob*=((n-x)/(x+1))*(p/(1-p));cdf+=prob;}return Math.max(0,Math.min(1,1-cdf));}
function wilsonLower(k,n,z=1.959963984540054){if(!n)return 0;const ph=k/n,den=1+z*z/n,center=ph+z*z/(2*n),adj=z*Math.sqrt(ph*(1-ph)/n+z*z/(4*n*n));return (center-adj)/den;}
const P0=1/37,ALPHA=0.00125,BASE_GROSS_X=20,BASE_BREAK_EVEN=1/20;
const candidates=[];
for(const c of freeze.selectedCandidates){
  let hits=0,baseGross=0,observedGross=0,multipliedHits=0;const returns=[];
  for(const i of holdoutIndices){
    const prediction=predict(c.spec,i),row=rows[i],truth=Number(row.winner);let gross=0;
    if(prediction===truth){
      hits++;baseGross+=BASE_GROSS_X;
      const lucky=(row.luckyEvents||[]).find(x=>Number(x.number)===truth&&Number.isFinite(Number(x.multiplier))&&Number(x.multiplier)>0);
      gross=lucky?Number(lucky.multiplier):BASE_GROSS_X;
      if(lucky)multipliedHits++;
      observedGross+=gross;
    }
    returns.push(gross);
  }
  const n=holdoutIndices.length,hitRate=hits/n,pValue=binomTail(n,hits,P0),wilson95Lower=wilsonLower(hits,n),baseOnlyROI=(baseGross-n)/n,observedMultiplierROI=(observedGross-n)/n;
  const sorted=[...returns].sort((a,b)=>b-a),largestSingleReturnX=sorted[0]||0,returnWithoutLargest=Math.max(0,observedGross-largestSingleReturnX),roiWithoutLargest=(returnWithoutLargest-(n-1))/(n-1);
  candidates.push({
    id:c.id,spec:c.spec,rankAtFreeze:c.rankAtFreeze,n,hits,hitRate,liftVsUniform:hitRate/P0,pValue,wilson95Lower,
    predictiveFamilyGate:pValue<ALPHA&&wilson95Lower>P0,
    economics:{baseStraightUpProfitPayout:'19:1',baseGrossReturnX:BASE_GROSS_X,baseBreakEvenHitRate:BASE_BREAK_EVEN,baseOnlyGrossReturn:baseGross,baseOnlyROI,baseOnlyEconomicPass:hitRate>BASE_BREAK_EVEN&&wilson95Lower>BASE_BREAK_EVEN&&baseOnlyROI>0,multipliedHits,observedGrossReturn:observedGross,observedMultiplierROI,largestSingleReturnX,top1ShareOfObservedReturn:observedGross>0?largestSingleReturnX/observedGross:null,roiWithoutLargestObservedReturn:roiWithoutLargest}
  });
}
candidates.sort((a,b)=>a.pValue-b.pValue||b.hitRate-a.hitRate||a.rankAtFreeze-b.rankAtFreeze);
const payload={
  version:'xxxtreme-selected-family-untouched-audit-v1',generatedAt:new Date().toISOString(),mode:'UNTOUCHED_POST_SELECTION_HISTORICAL_AUDIT',selectionCutoff:cutoff,rows:holdoutIndices.length,firstAt:rows[holdoutIndices[0]]?.timestamp,lastAt:rows[holdoutIndices.at(-1)]?.timestamp,
  sourceContract:{baseStraightUpProfitPayout:'19:1',baseGrossReturnX:20,lightningComparisonBaseProfitPayout:'29:1',conservativeBaseBreakEvenHitRate:0.05,multiplierGrossReturnInterpretation:'Use source lucky multiplier x as gross returned units for paper accounting; operator settlement semantics still require deployment-grade verification before any monetary claim.'},
  multiplicity:{selectedCandidates:8,familyWiseAlpha:0.01,perCandidateAlpha:ALPHA},
  candidates,
  summary:{anyPredictiveFamilyGate:candidates.some(x=>x.predictiveFamilyGate),anyBaseOnlyEconomicPass:candidates.some(x=>x.economics.baseOnlyEconomicPass),bestPredictive:candidates[0]||null,bestBaseOnlyROI:[...candidates].sort((a,b)=>b.economics.baseOnlyROI-a.economics.baseOnlyROI)[0]||null,bestObservedMultiplierROI:[...candidates].sort((a,b)=>b.economics.observedMultiplierROI-a.economics.observedMultiplierROI)[0]||null},
  guards:{candidateFamilyFrozenBeforeAudit:true,holdoutRowsExcludedFromSelection:true,sequentialPastOnlyPrediction:true,currentRoundLuckyFeaturesNotUsedForSelection:true,postHocHistoricalAuditCannotPromote:true,futureProspectiveStillRequired:true,automaticBettingAllowed:false,realMoneyAllowed:false,realStakeEUR:0}
};
fs.writeFileSync(OUT,JSON.stringify(payload,null,2)+'\n');
console.log(JSON.stringify({summary:payload.summary,candidates:candidates.map(x=>({id:x.id,spec:x.spec,hits:x.hits,hitRate:x.hitRate,pValue:x.pValue,predictiveFamilyGate:x.predictiveFamilyGate,baseOnlyROI:x.economics.baseOnlyROI,observedMultiplierROI:x.economics.observedMultiplierROI,top1Share:x.economics.top1ShareOfObservedReturn}))},null,2));

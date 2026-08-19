#!/usr/bin/env node
import fs from 'node:fs';

const DATA='loterias-ai/casino/xxxtreme/data/casinoorg-xxxtremelightningroulette-segment-v1.jsonl';
const FREEZE='loterias-ai/casino/xxxtreme/evidence/prospective-selected-family-v1-freeze.json';
const OUT='loterias-ai/casino/xxxtreme/evidence/prospective-selected-family-v1-status.json';
const freeze=JSON.parse(fs.readFileSync(FREEZE,'utf8'));
const warmup=Number(freeze.prospectiveWarmupRounds),N=Number(freeze.fixedBoundaryRounds),p0=Number(freeze.uniformNullHitProbability),alpha=Number(freeze.perCandidateAlpha),selected=freeze.selectedCandidates||[];
if(freeze.version!=='xxxtreme-prospective-selected-family-v1-freeze'||selected.length!==8||warmup!==100||N!==3000||alpha!==0.00125||freeze.guards?.freezeWrittenBeforeProspectiveStart!==true||freeze.guards?.realMoneyAllowed!==false)throw new Error('XXXtreme selected-family freeze drift');
const rows=fs.existsSync(DATA)?fs.readFileSync(DATA,'utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse).filter(r=>r.trainingEligibleWinner===true&&String(r.timestamp)>=freeze.prospectiveStartsAt&&Number.isInteger(Number(r.winner))).sort((a,b)=>String(a.timestamp).localeCompare(String(b.timestamp))):[];
if(rows.some(r=>String(r.timestamp)<freeze.prospectiveStartsAt))throw new Error('selected-family pre-start row leakage');
const winners=rows.map(r=>Number(r.winner));
const WHEEL=[0,32,15,19,4,21,2,25,17,34,6,27,13,36,11,30,8,23,10,5,24,16,33,1,20,14,31,9,22,18,29,7,28,12,35,3,26],wi=new Map(WHEEL.map((n,i)=>[n,i]));
function predict(spec,i){
  const prev=winners[i-1]??0;
  if(spec.type==='lag')return winners[i-Number(spec.k)]??prev;
  if(spec.type==='wheelOffset')return WHEEL[(wi.get(prev)+Number(spec.offset)+WHEEL.length)%WHEEL.length];
  if(spec.type==='frequencyHot'){
    const window=Number(spec.window),m=new Map();for(const x of winners.slice(Math.max(0,i-window),i))m.set(x,(m.get(x)||0)+1);
    return Array.from({length:37},(_,n)=>[n,m.get(n)||0]).sort((a,b)=>b[1]-a[1]||a[0]-b[0])[0][0];
  }
  throw new Error(`unsupported frozen spec ${JSON.stringify(spec)}`);
}
const scored=Array.from({length:Math.max(0,Math.min(N,rows.length-warmup))},(_,k)=>warmup+k),stats=Object.fromEntries(selected.map(x=>[x.id,{hits:0}]));
for(const i of scored){const truth=winners[i];for(const x of selected)if(predict(x.spec,i)===truth)stats[x.id].hits++;}
function binomTail(n,k,p){if(k<=0)return 1;let prob=(1-p)**n,cdf=prob;for(let x=0;x<k-1;x++){prob*=((n-x)/(x+1))*(p/(1-p));cdf+=prob;}return Math.max(0,Math.min(1,1-cdf));}
function wilsonLower(k,n,z=1.959963984540054){if(!n)return 0;const ph=k/n,den=1+z*z/n,center=ph+z*z/(2*n),adj=z*Math.sqrt(ph*(1-ph)/n+z*z/(4*n*n));return (center-adj)/den;}
let final=null;
if(scored.length===N){
  const candidates=selected.map(x=>{const hits=stats[x.id].hits,hitRate=hits/N,pValue=binomTail(N,hits,p0),wilson95Lower=wilsonLower(hits,N),pass=pValue<alpha&&wilson95Lower>p0;return{id:x.id,spec:x.spec,rankAtFreeze:x.rankAtFreeze,hits,hitRate,pValue,wilson95Lower,pass};}).sort((a,b)=>a.pValue-b.pValue||b.hitRate-a.hitRate||a.rankAtFreeze-b.rankAtFreeze);
  final={fixedBoundaryRounds:N,candidates,anyScientificSignal:candidates.some(x=>x.pass),interpretation:candidates.some(x=>x.pass)?'DISCOVERY_SELECTED_FROZEN_CANDIDATE_PASSED_UNTOUCHED_PROSPECTIVE_GATE_REPLICATION_REQUIRED':'NO_DISCOVERY_SELECTED_CANDIDATE_PASSED_UNTOUCHED_PROSPECTIVE_GATE',economicInterpretationAllowed:false};
}
const status={version:'xxxtreme-prospective-selected-family-v1-status',generatedAt:new Date().toISOString(),freezeVersion:freeze.version,prospectiveStartsAt:freeze.prospectiveStartsAt,progress:{totalPostStartRows:rows.length,warmupRequired:warmup,warmupRowsUsed:Math.min(rows.length,warmup),warmupComplete:rows.length>=warmup,fixedBoundaryRounds:N,roundsScored:scored.length,roundsRemaining:Math.max(0,N-scored.length),firstScoredAt:scored.length?rows[scored[0]].timestamp:null,lastScoredAt:scored.length?rows[scored.at(-1)].timestamp:null,postBoundaryRowsIgnored:Math.max(0,rows.length-warmup-N)},disclosure:{policy:'ADMINISTRATIVE_PROGRESS_ONLY',candidatePerformanceHidden:scored.length<N,candidateRankingHidden:scored.length<N,pValuesHidden:scored.length<N},final,gates:{fixedBoundaryComplete:scored.length===N,scientificSignal:final?.anyScientificSignal===true,economicInterpretationAllowed:false,automaticBettingAllowed:false,realMoneyAllowed:false},guards:{selectedCandidatesFrozenBeforeProspectiveStart:true,postStartWarmupOnly:true,noPreStartPredictiveState:true,currentRoundLuckyFeaturesForbidden:true,first3000ScoredOnly:true,noRetuning:true,noOptionalStopping:true,familyWiseAlpha:0.01,perCandidateAlpha:alpha,realMoneyAllowed:false,realStakeEUR:0}};
fs.writeFileSync(OUT,JSON.stringify(status,null,2)+'\n');console.log(JSON.stringify({progress:status.progress,disclosure:status.disclosure,gates:status.gates},null,2));

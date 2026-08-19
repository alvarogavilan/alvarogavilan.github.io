#!/usr/bin/env node
// Operational post-barrier pulse marker; frozen scientific rules below are unchanged.
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const DATA='loterias-ai/casino/xxxtreme/data/casinoorg-xxxtremelightningroulette-segment-v1.jsonl';
const FREEZE='loterias-ai/casino/xxxtreme/evidence/prospective-transition-family-v1-freeze.json';
const OUT='loterias-ai/casino/xxxtreme/evidence/prospective-transition-family-v1-status.json';
const SELECTED_ENGINE='loterias-ai/casino/xxxtreme/research/prospective-selected-family-v1.mjs';
const SELECTED_FREEZE='loterias-ai/casino/xxxtreme/evidence/prospective-selected-family-v1-freeze.json';
const SELECTED_STATUS='loterias-ai/casino/xxxtreme/evidence/prospective-selected-family-v1-status.json';
const freeze=JSON.parse(fs.readFileSync(FREEZE,'utf8'));
const warmup=Number(freeze.prospectiveWarmupRounds),N=Number(freeze.fixedBoundaryRounds),alpha=Number(freeze.perCandidateAlpha),p0=Number(freeze.uniformNullHitProbability);
if(freeze.version!=='xxxtreme-prospective-transition-family-v1-freeze'||warmup!==200||N!==5000||alpha!==0.00125||freeze.guards?.preBarrierPredictiveStateUsed!==false||freeze.guards?.realMoneyAllowed!==false)throw new Error('XXXtreme transition freeze drift');
const rows=fs.existsSync(DATA)?fs.readFileSync(DATA,'utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse).filter(r=>r.trainingEligibleWinner===true&&Number.isInteger(Number(r.winner))).sort((a,b)=>String(a.timestamp).localeCompare(String(b.timestamp))):[];
if(rows.some(r=>Date.parse(r.timestamp)<=Date.parse(freeze.prospectiveStartsAt)))throw new Error('XXXtreme transition dataset contains pre-barrier row');
const wheel=freeze.rouletteWheelOrder.map(Number),wheelIndex=new Map(wheel.map((n,i)=>[n,i])),ids=freeze.candidateFamily,winners=rows.map(r=>Number(r.winner));
const addWheel=(n,d)=>wheel[(wheelIndex.get(n)+d+wheel.length)%wheel.length];
function markovMode(i,limit){const prev=winners[i-1];if(prev===undefined)return 0;const counts=new Map(),first=Math.max(0,i-1-limit);for(let j=first;j<i-1;j++)if(winners[j]===prev){const nx=winners[j+1];counts.set(nx,(counts.get(nx)||0)+1)}if(!counts.size)return prev;return [...counts.entries()].sort((a,b)=>b[1]-a[1]||a[0]-b[0])[0][0];}
function predictions(i){const prev=winners[i-1]??0,two=winners[i-2]??prev;return[prev,two,addWheel(prev,1),addWheel(prev,-1),addWheel(prev,Math.floor(wheel.length/2)),markovMode(i,50),markovMode(i,200),markovMode(i,Number.MAX_SAFE_INTEGER)];}
const scoredIndices=Array.from({length:Math.max(0,Math.min(N,rows.length-warmup))},(_,k)=>warmup+k),stats=Object.fromEntries(ids.map(id=>[id,{hits:0}]));
for(const i of scoredIndices){const truth=winners[i],pred=predictions(i);for(let k=0;k<ids.length;k++)if(pred[k]===truth)stats[ids[k]].hits++;}
function binomTail(n,k,p){if(k<=0)return 1;let prob=(1-p)**n,cdf=prob;for(let x=0;x<k-1;x++){prob*=((n-x)/(x+1))*(p/(1-p));cdf+=prob;}return Math.max(0,Math.min(1,1-cdf));}
function wilsonLower(k,n,z=1.959963984540054){if(!n)return 0;const ph=k/n,den=1+z*z/n,center=ph+z*z/(2*n),adj=z*Math.sqrt(ph*(1-ph)/n+z*z/(4*n*n));return (center-adj)/den;}
let final=null;if(scoredIndices.length===N){const candidates=ids.map(id=>{const hits=stats[id].hits,hitRate=hits/N,pValue=binomTail(N,hits,p0),wilson95Lower=wilsonLower(hits,N),pass=pValue<alpha&&wilson95Lower>p0;return{id,hits,hitRate,pValue,wilson95Lower,pass};}).sort((a,b)=>a.pValue-b.pValue||b.hitRate-a.hitRate||a.id.localeCompare(b.id));final={fixedBoundaryRounds:N,candidates,anyScientificSignal:candidates.some(x=>x.pass),interpretation:candidates.some(x=>x.pass)?'AT_LEAST_ONE_FROZEN_SELECTOR_BEAT_UNIFORM_NULL_REPLICATION_REQUIRED':'NO_FROZEN_SELECTOR_BEAT_STRICT_PROSPECTIVE_GATE',economicInterpretationAllowed:false};}
const status={version:'xxxtreme-prospective-transition-family-v1-status',generatedAt:new Date().toISOString(),freezeVersion:freeze.version,sourceSegment:freeze.sourceSegment,prospectiveStartsAt:freeze.prospectiveStartsAt,progress:{totalPostBarrierRows:rows.length,warmupRequired:warmup,warmupRowsUsed:Math.min(rows.length,warmup),warmupComplete:rows.length>=warmup,fixedBoundaryRounds:N,roundsScored:scoredIndices.length,roundsRemaining:Math.max(0,N-scoredIndices.length),firstScoredAt:scoredIndices.length?rows[scoredIndices[0]].timestamp:null,lastScoredAt:scoredIndices.length?rows[scoredIndices.at(-1)].timestamp:null,postBoundaryRowsIgnored:Math.max(0,rows.length-warmup-N)},disclosure:{policy:'ADMINISTRATIVE_PROGRESS_ONLY',candidatePerformanceHidden:scoredIndices.length<N,candidateRankingHidden:scoredIndices.length<N,pValuesHidden:scoredIndices.length<N},final,gates:{fixedBoundaryComplete:scoredIndices.length===N,scientificSignal:final?.anyScientificSignal===true,economicInterpretationAllowed:false,automaticBettingAllowed:false,realMoneyAllowed:false},guards:{postBarrierWarmupOnly:true,preBarrierPredictiveStateUsed:false,pastWinnersOnly:true,currentRoundLuckyFeaturesForbidden:true,first5000ScoredOnly:true,noRetuning:true,noOptionalStopping:true,perCandidateAlpha:alpha,realMoneyAllowed:false,realStakeEUR:0}};

// Run the independently frozen discovery-selected lane inside this same paid cycle.
// Its standalone status is folded into the persisted generic status so no new workflow output or cron is required.
if(fs.existsSync(SELECTED_ENGINE)&&fs.existsSync(SELECTED_FREEZE)){
  const r=spawnSync(process.execPath,[SELECTED_ENGINE],{encoding:'utf8',stdio:['ignore','pipe','pipe']});
  if(r.status!==0){process.stderr.write(r.stdout||'');process.stderr.write(r.stderr||'XXXtreme selected-family refresh failed\n');process.exit(r.status||1);}
  if(fs.existsSync(SELECTED_STATUS)){
    const selectedStatus=JSON.parse(fs.readFileSync(SELECTED_STATUS,'utf8'));
    if(selectedStatus?.gates?.realMoneyAllowed!==false||selectedStatus?.gates?.economicInterpretationAllowed!==false)throw new Error('XXXtreme selected-family safety drift');
    if(Number(selectedStatus?.progress?.roundsScored)<Number(selectedStatus?.progress?.fixedBoundaryRounds)&&(selectedStatus?.final!==null||selectedStatus?.disclosure?.candidatePerformanceHidden!==true||selectedStatus?.disclosure?.pValuesHidden!==true))throw new Error('XXXtreme selected-family blindness drift');
    status.selectedFamilyV1=selectedStatus;
  }
}
fs.mkdirSync('loterias-ai/casino/xxxtreme/evidence',{recursive:true});fs.writeFileSync(OUT,JSON.stringify(status,null,2)+'\n');console.log(JSON.stringify({progress:status.progress,selectedFamilyV1:status.selectedFamilyV1?{progress:status.selectedFamilyV1.progress,disclosure:status.selectedFamilyV1.disclosure,gates:status.selectedFamilyV1.gates}:null,disclosure:status.disclosure,gates:status.gates},null,2));

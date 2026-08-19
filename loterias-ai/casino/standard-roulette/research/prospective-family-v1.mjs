#!/usr/bin/env node
import fs from 'node:fs';
const ROOT='loterias-ai/casino/standard-roulette';
const freeze=JSON.parse(fs.readFileSync(`${ROOT}/evidence/independent-streams-v1-freeze.json`,'utf8'));
const N=Number(freeze.initialProspectiveFamily.fixedBoundaryRoundsPerStream),alpha=Number(freeze.initialProspectiveFamily.perCandidateAlpha),p0=Number(freeze.roulette.uniformNullHitProbability),be=Number(freeze.roulette.baseEconomicBreakEvenHitRate),gross=Number(freeze.roulette.baseGrossReturnX);
if(N!==5000||alpha!==0.0025||gross!==36||Math.abs(be-1/36)>1e-12||freeze.guards?.realMoneyAllowed!==false)throw new Error('standard prospective freeze drift');
const W=[0,32,15,19,4,21,2,25,17,34,6,27,13,36,11,30,8,23,10,5,24,16,33,1,20,14,31,9,22,18,29,7,28,12,35,3,26],wi=new Map(W.map((n,i)=>[n,i]));
const ids=['lag1','lag2','wheelPlus1','wheelMinus1'];
function preds(w,i){const p=w[i-1]??0,t=w[i-2]??p;return[p,t,W[(wi.get(p)+1)%37],W[(wi.get(p)+36)%37]];}
function binomTail(n,k,p){if(k<=0)return 1;let prob=(1-p)**n,cdf=prob;for(let x=0;x<k-1;x++){prob*=((n-x)/(x+1))*(p/(1-p));cdf+=prob;}return Math.max(0,Math.min(1,1-cdf));}
function wilsonLower(k,n,z=1.959963984540054){if(!n)return 0;const ph=k/n,den=1+z*z/n,center=ph+z*z/(2*n),adj=z*Math.sqrt(ph*(1-ph)/n+z*z/(4*n*n));return(center-adj)/den;}
fs.mkdirSync(`${ROOT}/evidence`,{recursive:true});
for(const stream of freeze.streams){
  const dataPath=`${ROOT}/data/${stream.id}-segment-v1.jsonl`,out=`${ROOT}/evidence/${stream.id}-prospective-family-v1-status.json`;
  const rows=fs.existsSync(dataPath)?fs.readFileSync(dataPath,'utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse).sort((a,b)=>a.timestamp.localeCompare(b.timestamp)):[];
  if(rows.some(r=>Date.parse(r.timestamp)<=Date.parse(freeze.prospectiveStartsAt)))throw new Error(`${stream.id} pre-barrier row in prospective dataset`);
  const w=rows.map(r=>Number(r.winner)),used=Math.min(N,Math.max(0,w.length-2)),stats=Object.fromEntries(ids.map(id=>[id,{hits:0}]));
  for(let k=0;k<used;k++){const i=k+2,truth=w[i],pp=preds(w,i);for(let j=0;j<ids.length;j++)if(pp[j]===truth)stats[ids[j]].hits++;}
  let final=null;if(used===N){const candidates=ids.map(id=>{const hits=stats[id].hits,rate=hits/N,p=binomTail(N,hits,p0),wl=wilsonLower(hits,N),baseROI=rate*gross-1,statisticalPass=p<alpha,economicPass=rate>be&&wl>be,pass=statisticalPass&&economicPass;return{id,hits,hitRate:rate,pValue:p,wilson95Lower:wl,baseROI,statisticalPass,economicPass,pass};});final={fixedBoundaryRounds:N,candidates,anyDirectEconomicSignal:candidates.some(x=>x.pass),interpretation:candidates.some(x=>x.pass)?'FROZEN_STANDARD_ROULETTE_SELECTOR_PASSED_STATISTICAL_AND_BASE_ECONOMIC_GATE_REPLICATION_REQUIRED':'NO_FROZEN_SELECTOR_PASSED_FIXED_GATE'};}
  const status={version:'standard-roulette-prospective-family-v1-status',generatedAt:new Date().toISOString(),streamId:stream.id,freezeVersion:freeze.version,progress:{postBarrierRows:rows.length,warmupRows:Math.min(2,rows.length),roundsScored:used,fixedBoundaryRounds:N,roundsRemaining:Math.max(0,N-used)},disclosure:{policy:'ADMINISTRATIVE_COUNTS_ONLY',candidatePerformanceHidden:used<N,candidateRankingHidden:used<N,pValuesHidden:used<N,roiHidden:used<N},final,gates:{fixedBoundaryComplete:used===N,directEconomicSignal:final?.anyDirectEconomicSignal===true,automaticBettingAllowed:false,realMoneyAllowed:false},economics:{straightUpProfitPayout:'35:1',baseGrossReturnX:gross,baseEconomicBreakEvenHitRate:be},guards:{first5000Only:true,noRetuning:true,noOptionalStopping:true,postBoundaryCannotRescue:true,perCandidateAlpha:alpha,preBarrierPredictiveStateUsed:false,realMoneyAllowed:false,realStakeEUR:0}};
  fs.writeFileSync(out,JSON.stringify(status,null,2)+'\n');
  console.log(JSON.stringify({streamId:stream.id,progress:status.progress,disclosure:status.disclosure,gates:status.gates},null,2));
}

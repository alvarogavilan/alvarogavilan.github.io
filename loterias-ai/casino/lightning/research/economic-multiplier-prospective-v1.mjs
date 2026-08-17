#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const DATA='loterias-ai/casino/lightning/data/casinoorg-lightningroulette.jsonl';
const FREEZE='loterias-ai/casino/lightning/evidence/economic-multiplier-window-prospective-freeze-v1.json';
const PROTOCOL='loterias-ai/casino/lightning/evidence/economic-multiplier-prospective-decision-protocol-v1.json';
const PROVENANCE='loterias-ai/casino/lightning/evidence/economic-multiplier-window-freeze-provenance-v1.json';
const OUT='loterias-ai/casino/lightning/evidence/economic-multiplier-window-prospective-status-v1.json';

const f=JSON.parse(fs.readFileSync(FREEZE,'utf8'));
const d=JSON.parse(fs.readFileSync(PROTOCOL,'utf8'));
const provenance=JSON.parse(fs.readFileSync(PROVENANCE,'utf8'));
const freezeMs=Date.parse(f.frozenAt);
const protocolFreezeMs=Date.parse(d.freeze?.frozenAt);
const threshold=Number(f.frozenRule.roundsSinceLastWinningLightningAtLeast);
const horizon=Number(f.frozenRule.predictNextRounds);
const p0=Number(f.frozenNull.iidProbabilityAtLeastOneIn7);
const p1=Number(f.frozenNull.empiricalAllAnchor7RoundRateAtFreeze);
const calibrationReference=Number(d.calibration.referenceProbability);
const finalBoundary=Number(d.fixedFinalBoundary.postFreezeRounds);

if(d.freeze?.version!==f.version)throw new Error('Decision protocol freeze version mismatch');
if(!Number.isFinite(freezeMs)||!Number.isFinite(protocolFreezeMs)||protocolFreezeMs!==freezeMs)throw new Error('Decision protocol frozenAt instant mismatch');
if(d.freeze?.rule?.roundsSinceLastWinningLightningAtLeast!==threshold||d.freeze?.rule?.predictNextRounds!==horizon)throw new Error('Decision protocol timing rule mismatch');
if(f.frozenRule.noRetuning!==true||d.freeze?.rule?.noRetuning!==true)throw new Error('Immutable no-retuning rule required');
if(provenance.verdict!=='CHAIN_OF_CUSTODY_VERIFIED'||provenance.checks?.postHocRuleSubstitutionDetected!==false)throw new Error('Verified clean freeze provenance required');
if(d.registrationState?.closedProspectiveEpisodesObservedBeforeRegistration!==0)throw new Error('Decision protocol was not registered before first closed episode');
if(!Number.isInteger(finalBoundary)||finalBoundary<Number(f.gates.minimumProspectivePaperRoundsBeforeAnyPromotion))throw new Error('Fixed final boundary cannot lower frozen minimum');

function t(row){const x=Date.parse(row.ts??row.timestamp??row.observedAt??row.createdAt);return Number.isFinite(x)?x:null;}
function event(row){
  if(typeof row.winnerIsLightning==='boolean')return row.winnerIsLightning;
  const ns=Array.isArray(row.allLuckyNumbers)?row.allLuckyNumbers.map(Number):(Array.isArray(row.luckyNumbers)?row.luckyNumbers.map(Number):[]);
  return ns.includes(Number(row.winner));
}
function wilson(k,n,z=1.96){
  if(!n)return {lower:null,upper:null};
  const p=k/n,zz=z*z,den=1+zz/n,center=(p+zz/(2*n))/den,half=z*Math.sqrt((p*(1-p)+zz/(4*n))/n)/den;
  return {lower:Math.max(0,center-half),upper:Math.min(1,center+half)};
}
function round(v,digits=6){return Number.isFinite(v)?Number(v.toFixed(digits)):null;}

let rows=fs.readFileSync(DATA,'utf8').split(/\r?\n/).filter(Boolean).map((x,i)=>({...JSON.parse(x),_i:i}))
  .filter(x=>x.trainingEligible!==false&&Number.isInteger(Number(x.winner))&&Number(x.winner)>=0&&Number(x.winner)<=36)
  .map(x=>({...x,_ts:t(x),_event:event(x)}));
if(!rows.every(x=>x._ts!=null))throw new Error('Prospective evaluator requires timestamps for every eligible row');
rows.sort((a,b)=>a._ts-b._ts||a._i-b._i);

function evaluate(limitPostFreezeRounds=null){
  let lastEvent=null,active=null,postFreezeRounds=0;
  const closed=[];
  for(let i=0;i<rows.length;i++){
    const row=rows[i],isPost=row._ts>freezeMs;
    if(isPost)postFreezeRounds++;

    if(active&&i>active.triggerIndex){
      active.futureRounds++;
      if(row._event){
        active.success=true;active.closedIndex=i;active.closedAt=new Date(row._ts).toISOString();closed.push(active);active=null;
      }else if(active.futureRounds>=horizon){
        active.success=false;active.closedIndex=i;active.closedAt=new Date(row._ts).toISOString();closed.push(active);active=null;
      }
    }

    if(row._event)lastEvent=i;
    const gap=lastEvent==null?null:i-lastEvent;
    if(isPost&&!active&&gap!=null&&gap>=threshold){
      active={triggerIndex:i,triggerAt:new Date(row._ts).toISOString(),gapAtTrigger:gap,futureRounds:0,success:null};
    }

    if(limitPostFreezeRounds!=null&&isPost&&postFreezeRounds>=limitPostFreezeRounds)break;
  }
  const successes=closed.filter(x=>x.success).length,total=closed.length,rate=successes/Math.max(1,total),ci=wilson(successes,total);
  return {
    postFreezeRounds,
    closedEpisodes:total,
    successes,
    failures:total-successes,
    successRate:round(rate),
    wilson95:{lower:round(ci.lower),upper:round(ci.upper)},
    liftVsPrimary:round(rate-p0),
    relativeLiftVsPrimary:round(rate/p0-1),
    calibrationReferenceInsideWilson95:ci.lower!=null&&ci.upper!=null&&calibrationReference>=ci.lower&&calibrationReference<=ci.upper,
    pendingEpisode:active?{triggerAt:active.triggerAt,gapAtTrigger:active.gapAtTrigger,futureRoundsObserved:active.futureRounds}:null,
    recentClosedEpisodes:closed.slice(-20).map(x=>({triggerAt:x.triggerAt,gapAtTrigger:x.gapAtTrigger,success:x.success,closedAt:x.closedAt,futureRounds:x.futureRounds}))
  };
}

const live=evaluate(null);
const directionalReached=live.closedEpisodes>=Number(f.gates.minimumClosedEpisodesForDirectionalRead);
const formalDescriptiveReached=live.closedEpisodes>=Number(f.gates.minimumClosedEpisodesForFormalRead);
const finalBoundaryReached=live.postFreezeRounds>=finalBoundary;
const fixedFinal=finalBoundaryReached?evaluate(finalBoundary):null;
const fixedFinalTimingPass=Boolean(fixedFinal&&
  fixedFinal.closedEpisodes>=Number(d.fixedFinalBoundary.minimumClosedEpisodes)&&
  fixedFinal.wilson95.lower!=null&&fixedFinal.wilson95.lower>p0&&
  fixedFinal.successRate>p1&&
  fixedFinal.calibrationReferenceInsideWilson95&&
  f.frozenRule.noRetuning===true&&
  provenance.verdict==='CHAIN_OF_CUSTODY_VERIFIED'
);

let status='ACCUMULATING';
if(directionalReached)status='DIRECTIONAL_DESCRIPTIVE_ONLY';
if(formalDescriptiveReached)status='FORMAL_DESCRIPTIVE_ONLY';
if(finalBoundaryReached)status='FIXED_FINAL_AVAILABLE';

const separateNumberSelectionProspectiveEdge=false;
const promotionGatePass=fixedFinalTimingPass&&separateNumberSelectionProspectiveEdge;

const result={
  version:'economic-multiplier-window-prospective-status-v1',
  generatedAt:new Date().toISOString(),
  freezeVersion:f.version,
  decisionProtocolVersion:d.version,
  frozenAt:f.frozenAt,
  rule:f.frozenRule,
  postFreezeRounds:live.postFreezeRounds,
  closedEpisodes:live.closedEpisodes,
  successes:live.successes,
  failures:live.failures,
  successRate:live.successRate,
  wilson95:live.wilson95,
  frozenNull:{primary:p0,secondary:p1},
  calibration:{
    referenceProbability:calibrationReference,
    referenceSource:d.calibration.referenceSource,
    referenceInsideCurrentWilson95:live.calibrationReferenceInsideWilson95,
    formalCriterion:d.calibration.formalCriterion
  },
  liftVsPrimary:live.liftVsPrimary,
  relativeLiftVsPrimary:live.relativeLiftVsPrimary,
  pendingEpisode:live.pendingEpisode,
  status,
  readPolicy:{
    before30:d.readPolicy.before30ClosedEpisodes,
    after30Before100:d.readPolicy.atOrAfter30ClosedEpisodesBefore100,
    after100BeforeBoundary:d.readPolicy.atOrAfter100ClosedEpisodesBefore10000PostFreezeRounds,
    promotionEvaluation:d.readPolicy.promotionEvaluation,
    postBoundaryDataMayRescueV1:d.readPolicy.postBoundaryDataMayRescueV1
  },
  fixedFinal:fixedFinal?{
    boundaryPostFreezeRounds:finalBoundary,
    closedEpisodes:fixedFinal.closedEpisodes,
    successes:fixedFinal.successes,
    failures:fixedFinal.failures,
    successRate:fixedFinal.successRate,
    wilson95:fixedFinal.wilson95,
    liftVsPrimary:fixedFinal.liftVsPrimary,
    calibrationReferenceInsideWilson95:fixedFinal.calibrationReferenceInsideWilson95,
    timingGatePass:fixedFinalTimingPass,
    postBoundaryDataIgnoredForPromotion:true
  }:null,
  gates:{
    directionalSampleReached:directionalReached,
    formalSampleReached:formalDescriptiveReached,
    lowerCiAbovePrimaryNull:live.wilson95.lower!=null&&live.wilson95.lower>p0,
    positiveVsSecondary:live.successRate>p1,
    calibrationReferenceInsideWilson95:live.calibrationReferenceInsideWilson95,
    minimum10000ProspectiveRoundsReached:finalBoundaryReached,
    fixedFinalTimingGatePass:fixedFinalTimingPass,
    formalTimingGatePass:fixedFinalTimingPass,
    separateNumberSelectionProspectiveEdge,
    promotionGatePass,
    realMoneyAllowed:false
  },
  recentClosedEpisodes:live.recentClosedEpisodes,
  guards:{
    provenanceVerified:true,
    calibrationProtocolRegisteredBeforeFirstClosedEpisode:true,
    singleFixedPromotionWindow:true,
    post10000OptionalStoppingRescueBlocked:true,
    noRetuning:true,
    separateProspectiveNumberEdgeRequired:true,
    automaticBettingAllowed:false,
    realMoneyAllowed:false
  }
};

fs.mkdirSync(path.dirname(OUT),{recursive:true});
fs.writeFileSync(OUT,JSON.stringify(result,null,2)+'\n');
console.log('PROSPECTIVE_TIMING_JSON_START');
console.log(JSON.stringify(result,null,2));
console.log('PROSPECTIVE_TIMING_JSON_END');
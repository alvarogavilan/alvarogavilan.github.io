#!/usr/bin/env node
import fs from 'node:fs';

const STATUS='loterias-ai/casino/jackpots/evidence/botemania-jpk-allocation-prospective-status-v1.json';
const PROTOCOL='loterias-ai/casino/jackpots/evidence/botemania-jpk-allocation-prospective-protocol-v1.json';
const OUT='loterias-ai/casino/jackpots/evidence/botemania-jpk-allocation-validation-result-v1.json';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));

if(fs.existsSync(OUT)){
 const existing=read(OUT);
 if(existing?.frozen===true){console.log(JSON.stringify({state:'ALREADY_FROZEN',outcome:existing.outcome,frozenAt:existing.frozenAt},null,2));process.exit(0);}
}
const status=read(STATUS),protocol=read(PROTOCOL);
const p=status?.progress||{},c=status?.checks||{};
const complete=Number(p.cleanFutureIntervals)>=Number(p.targetCleanIntervals)&&c.enoughGrowth===true&&c.enoughInformative===true;
if(!complete){console.log(JSON.stringify({state:'NOT_COMPLETE',cleanFutureIntervals:p.cleanFutureIntervals,target:p.targetCleanIntervals},null,2));process.exit(0);}
const passed=status?.decision?.networkAllocationProspectivelyValidated===true;
const result={
 version:'botemania-jpk-allocation-validation-result-v1',
 frozen:true,
 frozenAt:new Date().toISOString(),
 protocolFrozenAt:protocol?.frozenAt||null,
 operator:'botemania-es',
 outcome:passed?'PASSED_NETWORK_ALLOCATION':'FAILED_FROZEN_CRITERIA',
 boundarySnapshot:{state:status.state,progress:status.progress,weightedAllocationShares:status.weightedAllocationShares,weightedRegalRoyalDifference:status.weightedRegalRoyalDifference,informativeIntervalsInsideBroadBand:status.informativeIntervalsInsideBroadBand,informativeIntervalsInsideBroadBandFraction:status.informativeIntervalsInsideBroadBandFraction,checks:status.checks},
 interpretation:{proves:passed?'Future clean network meter increments satisfy the preregistered network-level approximately 60/20/20 allocation criteria.':'The preregistered network-allocation criteria were not satisfied.',doesNotProve:['Exact Fishin Frenzy per-title contribution split','Exact Spain Royal/Regal MBWB','Exact jackpot hazard','Positive EV','Authorization to wager']},
 guards:{immutableFirstCompletionSnapshot:true,noRetuning:true,noOptionalStopping:true,economicPromotionByThisResultAlone:false,realMoneyAllowed:false,automaticBettingAllowed:false}
};
fs.writeFileSync(OUT,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));

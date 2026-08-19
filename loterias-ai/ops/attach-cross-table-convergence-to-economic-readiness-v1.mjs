#!/usr/bin/env node
import fs from 'node:fs';

const LEDGER='loterias-ai/casino/lightning/evidence/economic-readiness-ledger-v1.json';
const CROSS='loterias-ai/casino/cross-table/lag1-blind-convergence-status-v1.json';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const ledger=read(LEDGER),cross=read(CROSS);

if(ledger?.realMoneyAllowed!==false) throw new Error('economic ledger safety drift');
if(cross?.guards?.realMoneyAllowed!==false||cross?.guards?.noInterimPerformanceRead!==true) throw new Error('cross-table safety drift');
const complete=cross?.progress?.lightning?.complete===true&&cross?.progress?.xxxtreme?.complete===true;
if(!complete&&(cross?.disclosure?.performanceHidden!==true||cross?.disclosure?.jointClaimHidden!==true||cross?.final!==null)) throw new Error('cross-table blind disclosure drift');

const finalSummary=complete&&cross.final?{
  mechanismReplication:cross.final?.joint?.mechanismReplication===true,
  lightningEconomicCandidate:cross.final?.joint?.lightningEconomicCandidate===true,
  dualTableEconomicCandidate:cross.final?.joint?.dualTableEconomicCandidate===true,
  interpretation:cross.final?.interpretation||null,
  realMoneyAuthorization:false
}:null;

ledger.crossTableConvergence={
  version:cross.version,
  freezeVersion:cross.freezeVersion,
  hypothesisFamily:'LAG_1_REPEAT_PREVIOUS_WINNER',
  tables:['LIGHTNING','XXXTREME'],
  status:complete?'BOTH_FIXED_BOUNDARIES_OPEN':'BLINDED_ACCUMULATING',
  progress:cross.progress,
  disclosure:cross.disclosure,
  finalAvailable:complete&&cross.final!==null,
  finalSummary,
  claimPolicy:{
    requiresIndependentPassInBothTables:true,
    noCombinedPValueFishing:true,
    noInterimPerformancePeeking:true,
    noRetuning:true,
    noOptionalStopping:true,
    independentFurtherReplicationRequiredBeforeRealMoney:true
  },
  realMoneyAllowed:false,
  realStakeEUR:0
};
ledger.generatedAt=new Date().toISOString();
fs.writeFileSync(LEDGER,JSON.stringify(ledger,null,2)+'\n');
console.log(JSON.stringify({crossTableConvergence:ledger.crossTableConvergence},null,2));

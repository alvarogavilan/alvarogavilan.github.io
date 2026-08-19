#!/usr/bin/env node
import fs from 'node:fs';

const GATE='loterias-ai/casino/lightning/evidence/economic-promotion-gate-v1.json';
const CROSS='loterias-ai/casino/cross-table/lag1-blind-convergence-status-v1.json';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const gate=read(GATE),cross=read(CROSS);

if(gate?.policy?.realMoneyAllowed!==false||gate?.mode!=='PAPER_ONLY') throw new Error('promotion gate safety drift');
if(cross?.guards?.realMoneyAllowed!==false||cross?.guards?.requiresBothFixedFinals!==true) throw new Error('cross-table gate safety drift');
const complete=cross?.progress?.lightning?.complete===true&&cross?.progress?.xxxtreme?.complete===true;
if(!complete&&(cross?.disclosure?.performanceHidden!==true||cross?.disclosure?.jointClaimHidden!==true||cross?.final!==null)) throw new Error('cross-table blind disclosure drift');
const replication=complete&&cross?.final?.joint?.mechanismReplication===true;

gate.crossTableLag1Replication={
  version:cross.version,
  status:complete?(replication?'FIXED_FINAL_REPLICATION_OBSERVED':'FIXED_FINAL_NO_REPLICATION'):'BLINDED_ACCUMULATING',
  progress:cross.progress,
  performanceHidden:cross?.disclosure?.performanceHidden===true,
  jointClaimHidden:cross?.disclosure?.jointClaimHidden===true,
  scientificReplicationObserved:replication,
  directEconomicClaimAllowed:false,
  automaticBettingAllowed:false,
  realMoneyAllowed:false,
  independentFurtherReplicationRequired:true
};
gate.policy={...gate.policy,crossTableReplicationRequiresIndependentPassInBothTables:true,crossTableReplicationAloneCannotAuthorizeRealMoney:true};
gate.generatedAt=new Date().toISOString();
fs.writeFileSync(GATE,JSON.stringify(gate,null,2)+'\n');
console.log(JSON.stringify({crossTableLag1Replication:gate.crossTableLag1Replication},null,2));

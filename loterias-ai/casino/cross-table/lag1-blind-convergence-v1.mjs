#!/usr/bin/env node
import fs from 'node:fs';

const FREEZE='loterias-ai/casino/cross-table/lag1-blind-convergence-freeze-v1.json';
const L='loterias-ai/casino/lightning/evidence/prospective-lag-family-clean-v2-status-v1.json';
const X='loterias-ai/casino/xxxtreme/evidence/prospective-transition-family-v1-status.json';
const OUT='loterias-ai/casino/cross-table/lag1-blind-convergence-status-v1.json';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const freeze=read(FREEZE),l=read(L),x=read(X),xs=x?.selectedFamilyV1||null;
if(freeze.version!=='casino-cross-table-lag1-blind-convergence-freeze-v1'||freeze.immutable!==true||freeze.safety?.realMoneyAllowed!==false)throw new Error('cross-table freeze drift');
if(l.freezeVersion!==freeze.custody.lightningFreezeVersion||xs?.freezeVersion!==freeze.custody.xxxtremeFreezeVersion)throw new Error('source freeze custody drift');
const lDone=l?.gates?.fixedBoundaryComplete===true&&l?.final!==null;
const xDone=xs?.gates?.fixedBoundaryComplete===true&&xs?.final!==null;
let final=null;
if(lDone&&xDone){
  const lr=(l.final.results||[]).find(r=>Number(r.lag)===1);
  const xr=(xs.final.candidates||[]).find(r=>r.id===freeze.custody.xxxtremeLag1CandidateId&&r.spec?.type==='lag'&&Number(r.spec?.k)===1);
  if(!lr||!xr)throw new Error('lag-1 final result missing');
  const lStat=lr.statisticalPass===true;
  const lEcon=lr.promotionCandidate===true;
  const xStat=xr.pass===true;
  const xRate=Number(xr.hitRate),xLower=Number(xr.wilson95Lower),xBreak=Number(freeze.perTableRules.xxxtreme.baseEconomicBreakEvenHitRate);
  const xEcon=xStat&&xRate>xBreak&&xLower>xBreak;
  const mechanismReplication=lStat&&xStat;
  final={
    lightning:{lag:1,hits:lr.hits,n:lr.n,rate:lr.rate,pUpper:lr.pUpper,wilson95:lr.wilson95,statisticalPass:lStat,economicPass:lEcon,baseGrossReturnX:30},
    xxxtreme:{candidateId:xr.id,lag:1,hits:xr.hits,n:xs.final.fixedBoundaryRounds,rate:xRate,pUpper:xr.pValue,wilson95Lower:xLower,statisticalPass:xStat,economicPass:xEcon,baseGrossReturnX:20},
    joint:{mechanismReplication,lightningEconomicCandidate:mechanismReplication&&lEcon,dualTableEconomicCandidate:mechanismReplication&&lEcon&&xEcon},
    interpretation:mechanismReplication?(lEcon?'CROSS_TABLE_LAG1_REPLICATED; LIGHTNING ECONOMIC GATE ALSO PASSED; FURTHER INDEPENDENT REPLICATION REQUIRED':'CROSS_TABLE_LAG1_REPLICATED STATISTICALLY; NO LIGHTNING ECONOMIC PROMOTION'):'NO_CROSS_TABLE_LAG1_CONFIRMATION',
    realMoneyAuthorization:false
  };
}
const status={
  version:'casino-cross-table-lag1-blind-convergence-status-v1',generatedAt:new Date().toISOString(),freezeVersion:freeze.version,
  progress:{lightning:{complete:lDone,comparisonsUsed:l?.progress?.comparisonsUsed??0,comparisonsRequired:5000},xxxtreme:{complete:xDone,warmupRowsUsed:xs?.progress?.warmupRowsUsed??0,roundsScored:xs?.progress?.roundsScored??0,roundsRequired:3000}},
  disclosure:{policy:lDone&&xDone?'BOTH_FIXED_BOUNDARIES_OPEN':'ADMINISTRATIVE_PROGRESS_ONLY',performanceHidden:!(lDone&&xDone),jointClaimHidden:!(lDone&&xDone)},
  final,
  guards:{requiresBothFixedFinals:true,noInterimPerformanceRead:true,noRetuning:true,noOptionalStopping:true,tableSpecificEconomics:true,automaticBettingAllowed:false,realMoneyAllowed:false,realStakeEUR:0}
};
fs.mkdirSync('loterias-ai/casino/cross-table',{recursive:true});
fs.writeFileSync(OUT,JSON.stringify(status,null,2)+'\n');
console.log(JSON.stringify({progress:status.progress,disclosure:status.disclosure,finalAvailable:final!==null},null,2));

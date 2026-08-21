#!/usr/bin/env node
import fs from 'node:fs';

const p='loterias-ai/casino/jackpots/evidence/bouncy-bubbles-passive-identity-v1.json';
const x=JSON.parse(fs.readFileSync(p,'utf8'));
for(const phase of ['feedBefore','feedAfter']){
  for(const op of ['botemania','monopoly']){
    const row=x?.[phase]?.[op];
    if(!row) continue;
    row.targetUniqueLegacyRowCountFlag=row.targetUnique;
    row.targetUniqueDistinctAmount=Array.isArray(row.targetAmountsEUR)&&row.targetAmountsEUR.length===1;
    row.identityRule='EXACT_ID_WITH_ONE_DISTINCT_AMOUNT; duplicate same-ID/same-amount rows do not create amount ambiguity';
  }
}
x.normalization={
  version:'bouncy-bubbles-passive-identity-normalize-v1',
  reason:'The discovery probe originally set targetUnique from raw matching-row count. The repository stable generic identity rule collapses duplicate same-ID/same-amount rows and quarantines only simultaneous distinct amounts. This postprocessor records the correct one-distinct-amount criterion without altering any network discovery result.',
  noIdentityPromotion:true,
  noEconomicPromotion:true
};
fs.writeFileSync(p,JSON.stringify(x,null,2)+'\n');
console.log(JSON.stringify({feedBefore:x.feedBefore,feedAfter:x.feedAfter,normalization:x.normalization},null,2));

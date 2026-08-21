import assert from 'node:assert/strict';
import fs from 'node:fs';
import { normalizeConfirmedResetEvidence } from '../casino/jackpots/confirmed-reset-evidence-v1.mjs';

const dir='loterias-ai/casino/jackpots/evidence';
const cases=[
  ['botemania-tikitemple2-1-reset-confirm-v1.json','tikitemple2_1'],
  ['botemania-progressivealice1-reset-confirm-v1.json','progressivealice1']
];
for(const [file,id] of cases){
  const raw=JSON.parse(fs.readFileSync(`${dir}/${file}`,'utf8'));
  const normalized=normalizeConfirmedResetEvidence(raw,{sourceFile:`${dir}/${file}`});
  assert.ok(normalized,`${file} must satisfy independent confirmation schema`);
  assert.equal(normalized.trackKey,`generic:${id}`);
  assert.equal(normalized.baselineEUR,1208.43);
  assert.equal(normalized.postResetUpperBoundEUR,5.06);
  assert.equal(normalized.workflowRunId,32494665594);
  assert.equal(normalized.jackpotWinConfirmed,false);
  assert.equal(normalized.triggeringGameKnown,false);
  assert.equal(normalized.seedPointEstimateEUR,null);
  assert.equal(normalized.economicPromotionAllowed,false);
  assert.equal(normalized.realMoneyAllowed,false);
}
console.log('tiki-pair-persisted-reset-evidence-v1.test.mjs: PASS');

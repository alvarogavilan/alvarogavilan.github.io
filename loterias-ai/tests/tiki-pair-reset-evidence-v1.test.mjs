import assert from 'node:assert/strict';
import fs from 'node:fs';
import {normalizeConfirmedResetEvidence} from '../casino/jackpots/confirmed-reset-evidence-v1.mjs';

for(const file of [
  'loterias-ai/casino/jackpots/evidence/botemania-tikitemple2-reset-confirm-v1.json',
  'loterias-ai/casino/jackpots/evidence/botemania-progressivealice1-reset-confirm-v1.json'
]){
  const raw=JSON.parse(fs.readFileSync(file,'utf8'));
  const n=normalizeConfirmedResetEvidence(raw,{sourceFile:file});
  assert.ok(n,`confirmation must normalize: ${file}`);
  assert.equal(n.baselineEUR,1208.43);
  assert.equal(n.postResetUpperBoundEUR,5.06);
  assert.equal(n.jackpotWinConfirmed,false);
  assert.equal(n.triggeringGameKnown,false);
  assert.equal(n.seedPointEstimateEUR,null);
  assert.equal(n.realMoneyAllowed,false);
}
const pair=JSON.parse(fs.readFileSync('loterias-ai/casino/jackpots/evidence/tiki-pair-reset-confirm-v1-run-32494665594.json','utf8'));
assert.equal(pair.pairSignature.classification,'SYNCHRONIZED_SHARED_RESET_SIGNATURE');
assert.equal(pair.inference.sharedResetSignatureConfirmed,true);
assert.equal(pair.inference.exactAliasProven,false);
assert.equal(pair.inference.exactGameIdentityProven,false);
assert.equal(pair.inference.tikiTropicoIdentityProven,false);
assert.equal(pair.inference.tikiTemploIdentityProven,false);
assert.equal(pair.inference.realMoneyAllowed,false);
console.log('tiki-pair-reset-evidence-v1.test.mjs: PASS');

#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';

const p='loterias-ai/edge-live/evidence/ultimate-video-poker-gamesys-lineage-comparator-v1.json';
const x=JSON.parse(fs.readFileSync(p,'utf8'));

assert.equal(x.target.providerId,'roxor-gaming');
assert.equal(x.target.monitorKey,'generic:WAGER_BET');
assert.equal(x.closureState.configurationEquivalentToBotemaniaVerified,false);
assert.equal(x.closureState.economicPromotionAllowed,false);
assert.equal(x.closureState.realMoneyAllowed,false);
assert.equal(x.botemaniaObservedEvidence.exactVariantRtpVerified,false);
assert.equal(x.botemaniaObservedEvidence.breakEvenJackpotEUR,null);
assert.deepEqual(x.botemaniaObservedEvidence.historicalManualScreenPaytableShape,[1,2,3,4,5,7,25,50,800]);

const serialized=JSON.stringify(x);
assert.match(serialized,/95\.95% RTP/,'Playtech contamination guard must remain explicit');
assert.match(serialized,/14,111 coins/,'Gtech 20\/7\/5 false-threshold guard must remain explicit');
assert.ok(x.prohibitedSubstitutions.some(y=>y.sourceFamily==='Playtech'));
assert.ok(x.prohibitedSubstitutions.some(y=>/Gtech/.test(y.sourceFamily)));

for(const e of x.lineageEvidence){
  assert.equal(typeof e.source,'string');
  assert.ok(e.source.startsWith('https://'));
}

console.log('ultimate-video-poker-gamesys-lineage-v1.test.mjs: ok');

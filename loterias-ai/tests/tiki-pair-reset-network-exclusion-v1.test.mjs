import assert from 'node:assert/strict';
import fs from 'node:fs';

const E='loterias-ai/casino/jackpots/evidence/tiki-pair-reset-network-exclusion-v1.json';
const x=JSON.parse(fs.readFileSync(E,'utf8'));

assert.equal(x.snapshotComparison.canonicalIdentityCount,13);
const large=x.snapshotComparison.rows.filter(r=>Number(r.dropFraction)>=0.5).map(r=>r.key).sort();
assert.deepEqual(large,['generic:progressivealice1','generic:tikitemple2_1']);
assert.deepEqual([...x.result.largeDropKeys].sort(),large);
assert.equal(x.result.otherCanonicalKeysWithLargeDrop.length,0);
assert.equal(x.result.pairSpecificResetAmongTrackedCanonicalMeters,true);
assert.equal(x.result.exactAliasProven,false);
assert.equal(x.result.exactGameBindingRecovered,false);
assert.equal(x.result.triggeringGameKnown,false);
assert.equal(x.result.jackpotWinConfirmed,false);
assert.equal(x.result.seedPointEstimateEUR,null);
assert.equal(x.result.economicPromotionAllowed,false);
assert.equal(x.result.realMoneyAllowed,false);
assert.equal(x.guards.noPairResetEqualsExactAlias,true);
assert.equal(x.guards.noPairResetEqualsGameBinding,true);
assert.equal(x.guards.noPostResetEqualsExactSeed,true);
console.log('tiki-pair-reset-network-exclusion-v1: PASS');

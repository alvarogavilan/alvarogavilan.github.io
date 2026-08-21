#!/usr/bin/env node
import fs from 'node:fs';
import assert from 'node:assert/strict';

const eq=JSON.parse(fs.readFileSync('loterias-ai/casino/jackpots/evidence/diamond-bonanza-spain-pool-equivalence-v1.json','utf8'));
const cmp=JSON.parse(fs.readFileSync('loterias-ai/casino/jackpots/evidence/diamond-bonanza-external-mechanism-comparator-v1.json','utf8'));

assert.equal(eq.comparison.exactTargetIdPresentBoth,true);
assert.equal(eq.comparison.sameAmountToCent,true);
assert.equal(eq.comparison.identicalSpanishPublicRules,true);
assert.equal(eq.interpretation.sameSpanishSharedPoolStronglySupported,true);
assert.equal(eq.interpretation.exactHistoricalGBP25pConfigurationEquivalent,false);
assert.equal(eq.interpretation.seed500EURVerified,false);
assert.equal(eq.interpretation.averageHit7309EURVerified,false);
assert.equal(eq.interpretation.breakEvenJackpotEURVerified,false);
assert.equal(eq.interpretation.realMoneyAllowed,false);

assert.equal(cmp.guards.noGbpToEurNominalSubstitution,true);
assert.equal(cmp.guards.noHistoricalAverageHitAsSpainFact,true);
assert.equal(cmp.guards.noBallyRtpPlusContributionArithmeticWithoutDefinition,true);
assert.equal(cmp.unresolved.currentSpainSeedEUR,null);
assert.equal(cmp.unresolved.currentSpainJackpotContributionPct,null);
assert.equal(cmp.unresolved.breakEvenJackpotEUR,null);
assert.equal(cmp.guards.realMoneyAllowed,false);

const tiers=cmp.historicalGamesysComparator.tiers;
assert.deepEqual(tiers.map(x=>x.seedGBP/x.coinGBP),[2000,2000,2000]);
console.log('diamond-bonanza-evidence-guards-v1.test.mjs: ok');

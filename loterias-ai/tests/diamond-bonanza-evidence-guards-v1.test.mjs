#!/usr/bin/env node
import fs from 'node:fs';
import assert from 'node:assert/strict';

const eq=JSON.parse(fs.readFileSync('loterias-ai/casino/jackpots/evidence/diamond-bonanza-spain-pool-equivalence-v1.json','utf8'));
const cmp=JSON.parse(fs.readFileSync('loterias-ai/casino/jackpots/evidence/diamond-bonanza-external-mechanism-comparator-v1.json','utf8'));
const cms=JSON.parse(fs.readFileSync('loterias-ai/casino/jackpots/evidence/diamond-bonanza-botemania-cms-observation-2026-08-21.json','utf8'));

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

assert.equal(cms.provenance.workflowRunId,32467687145);
assert.equal(cms.provenance.workflowJobId,96727690808);
assert.equal(cms.recoveredSpanishMetadata.providerId,'roxor-gaming');
assert.equal(cms.recoveredSpanishMetadata.providerName,'Roxor Gaming');
assert.deepEqual(cms.recoveredSpanishMetadata.denominationRangeBoundsEUR,{min:0.25,max:1});
assert.equal(cms.recoveredSpanishMetadata.exactDenominationSetVerified,false);
assert.equal(cms.recoveredSpanishMetadata.fixedPaylines,5);
assert.equal(cms.recoveredSpanishMetadata.totalRtpPct,95.44);
assert.equal(cms.recoveredSpanishMetadata.progressiveJackpotsMentioned,true);
assert.equal(cms.unresolvedSpanishEconomics.jackpotContributionPct,null);
assert.equal(cms.unresolvedSpanishEconomics.exactProgressiveTrigger,null);
assert.equal(cms.unresolvedSpanishEconomics.maxBetEUR,null);
assert.equal(cms.unresolvedSpanishEconomics.seedEUR,null);
assert.equal(cms.unresolvedSpanishEconomics.breakEvenJackpotEUR,null);
assert.equal(cms.interpretation.economicPromotionAllowed,false);
assert.equal(cms.interpretation.realMoneyAllowed,false);
assert.equal(cms.guards.stakeEUR,0);

const tiers=cmp.historicalGamesysComparator.tiers;
assert.deepEqual(tiers.map(x=>x.seedGBP/x.coinGBP),[2000,2000,2000]);
console.log('diamond-bonanza-evidence-guards-v1.test.mjs: ok');

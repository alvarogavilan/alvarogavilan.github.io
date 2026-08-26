import assert from 'node:assert/strict';
import fs from 'node:fs';

const p='loterias-ai/edge-live/evidence/betfair-spain-apmccoy-provider-variant-narrowing-v1.json';
const d=JSON.parse(fs.readFileSync(p,'utf8'));

assert.equal(d.market,'ES');
assert.equal(d.sourceType,'ONLINE');
assert.equal(d.promotion,false);
assert.equal(d.providerReference.sportingDailyCode,'sljp-1');
assert.deepEqual(d.providerReference.listedApMcCoyVariants.map(x=>x.gameCode),['tonymc','tmccoy']);
assert.equal(d.providerReference.listedApMcCoyVariants.find(x=>x.gameCode==='tmccoy')?.explicitNonPttpLabel,true);
assert.equal(d.currentBetfairSpainRules.playtechPowerPlayExplicitlyPresent,true);
assert.equal(d.currentBetfairSpainRules.internalPlaytechGameCodeExposedByPublicLauncher,false);
assert.equal(d.variantNarrowing.tmccoyNonPttpVariantExcludedForCurrentBetfairRules,true);
assert.equal(d.variantNarrowing.tonymcPromotedAsExactBetfairInternalCode,false);
assert.equal(d.variantNarrowing.exactBetfairSpainInternalGameVariantVerified,false);
assert.equal(d.execution.decision,'NO_PLAY');
assert.equal(d.execution.realMoneyAllowed,false);
assert.equal(d.execution.realStakeEUR,0);
assert.equal(d.execution.maxSpins,0);
assert.equal(d.execution.maxTotalStakeEUR,0);
assert.equal(d.hardGuards.providerVariantExclusionDoesNotProveExactRemainingVariant,true);
assert.equal(d.hardGuards.noRealMoneyPromotionFromVariantNarrowingAlone,true);

console.log('betfair-spain-apmccoy-provider-variant-narrowing-v1.test.mjs: PASS');

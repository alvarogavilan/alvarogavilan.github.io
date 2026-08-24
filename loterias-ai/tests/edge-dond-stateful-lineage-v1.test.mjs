import assert from 'node:assert/strict';
import fs from 'node:fs';

const e=JSON.parse(fs.readFileSync('loterias-ai/edge-live/evidence/deal-or-no-deal-stateful-lineage-v1.json','utf8'));
assert.equal(e.status,'RESEARCH_ONLY_NO_PLAY');
assert.equal(e.realMoneyAllowed,false);
assert.equal(e.currentBotemaniaFeed.key,'generic:DealOrNoDealStateful3');
assert.equal(e.currentBotemaniaFeed.identityVerified,false);
assert.equal(e.currentBotemaniaFeed.currentPlayableGameVerified,false);
assert.equal(e.historicalGamesysOriginalDond5p.lifecycle.standaloneJackpotStillAvailable,false);
assert.equal(e.historicalGamesysOriginalDond5p.lifecycle.combinedInto,'Tiki Temple 5p Jackpot');
assert.ok(e.currentThirdPartyMirrorCorroboration.observedPairs.every(x=>x.exactDisplayedMatch===true));
assert.equal(e.identityAssessment.nominalMagnitudeCannotIdentifyTier,true);
assert.equal(e.identityAssessment.legacyInternalIdCannotProveCurrentPlayableGame,true);
assert.equal(e.identityAssessment.mergedPoolLineageBlocksStandaloneEconomics,true);
assert.equal(e.identityAssessment.crossMarketDenominationMappingAllowed,false);
assert.equal(e.execution.decision,'NO_PLAY');
for(const key of ['identityVerified','thresholdVerified','stakeVerified','strategyVerified','rulesFingerprintVerified','prospectiveValidationPassed'])assert.equal(e.execution[key],false);
assert.equal(e.execution.exactStakeEUR,null);
assert.equal(e.execution.thresholdEUR,null);
assert.equal(e.execution.maxSpins,0);
assert.equal(e.execution.maxTotalStakeEUR,0);
assert.equal(e.hardGuards.sameMagnitudeIsNotIdentity,true);
assert.equal(e.hardGuards.realMoneyAllowed,false);

console.log('edge-dond-stateful-lineage-v1.test.mjs: PASS');

import assert from 'node:assert/strict';
import fs from 'node:fs';

const path = 'loterias-ai/edge-live/evidence/spain-igt-persistent-state-candidates-v1.json';
const e = JSON.parse(fs.readFileSync(path, 'utf8'));

assert.equal(e.status, 'DISCOVERY_HIGH_PRIORITY_NO_PLAY');
assert.equal(e.realMoneyAllowed, false);
assert.equal(e.operator.name, 'EnRacha');
assert.equal(e.operator.legalEntity, 'Rank Digital Ceuta S.A.U.');
assert.equal(e.portfolioFinding.currentSpainRegulatedOperatorHasAtLeastTwoDocumentedGlobalApTitles, true);
assert.deepEqual(e.portfolioFinding.titles, ['Ocean Magic', 'Regal Riches']);

const ocean = e.candidates.find((x) => x.id === 'enracha-ocean-magic');
assert.ok(ocean);
assert.equal(ocean.currentSpainEconomics.minimumBetEUR, 0.50);
assert.equal(ocean.currentSpainEconomics.maximumBetEUR, 250.00);
assert.equal(ocean.currentSpainEconomics.theoreticalRtpPct, 92.18);
assert.equal(ocean.identityEvidence.sameTitleAndExactRtpIgtComparator.provider, 'IGT');
assert.equal(ocean.identityEvidence.sameTitleAndExactRtpIgtComparator.rtpPct, 92.18);
assert.equal(ocean.persistentMechanismEvidence.onlineRulesCopyright, '2017 IGT');
assert.equal(ocean.persistentMechanismEvidence.mechanismFamilyTransferOnly, true);
assert.equal(ocean.persistentMechanismEvidence.configurationEquivalentToEnRacha, false);
assert.equal(ocean.spainStateSemantics.persistentAcrossPlayersVerified, false);
assert.equal(ocean.spainStateSemantics.abandonedStateVisibleBeforeWagerVerified, false);
assert.equal(ocean.advantagePlayEvidence.exactSpainStrategyTransferAllowed, false);
assert.equal(ocean.evModel.exactPositiveEntrySetVerifiedForSpain, false);
assert.equal(ocean.decision.maxSpins, 0);
assert.equal(ocean.decision.maxTotalStakeEUR, 0);
assert.equal(ocean.decision.realMoneyAllowed, false);

const regal = e.candidates.find((x) => x.id === 'enracha-regal-riches');
assert.ok(regal);
assert.equal(regal.currentSpainEconomics.minimumBetEUR, 0.10);
assert.equal(regal.currentSpainEconomics.maximumBetEUR, 10.00);
assert.equal(regal.currentSpainEconomics.theoreticalRtpPct, 94.00);
assert.equal(regal.persistentMechanismEvidence.primaryIgtPersistentStateConfirmed, true);
assert.deepEqual(regal.persistentMechanismEvidence.currentGenericEntryGuidance, {
  blueMeter: 8,
  purpleMeter: 56,
  greenMeter: 81,
  yellowMeter: 106,
});
assert.equal(regal.persistentMechanismEvidence.genericThresholdsTransferToSpain, false);
assert.equal(regal.spainStateSemantics.persistentAcrossPlayersVerified, false);
assert.equal(regal.spainStateSemantics.favorableCurrentMeterStateVerified, false);
assert.equal(regal.evModel.exactPositiveEntrySetVerifiedForSpain, false);
assert.equal(regal.decision.maxSpins, 0);
assert.equal(regal.decision.realMoneyAllowed, false);

assert.equal(e.hardGuards.sameTitleDoesNotProveSameConfiguration, true);
assert.equal(e.hardGuards.sameRtpDoesNotProveSameStateScope, true);
assert.equal(e.hardGuards.foreignPersistentRuleDoesNotProveSpainCrossPlayerPersistence, true);
assert.equal(e.hardGuards.foreignEntryThresholdsNeverTransferWithoutExactConfiguration, true);
assert.equal(e.hardGuards.historicalOnlineExploitDoesNotProveCurrentSpainExploit, true);
assert.equal(e.hardGuards.monthlyActualRtpIsNotAnEntrySignal, true);
assert.equal(e.hardGuards.noLoginAutomation, true);
assert.equal(e.hardGuards.noRealMoneyLaunch, true);
assert.equal(e.hardGuards.noWagerProbe, true);
assert.equal(e.hardGuards.executionContractRemainsSoleGreenAuthority, true);
assert.equal(e.hardGuards.realMoneyAllowed, false);

console.log('spain-igt-persistent-state-candidates-v1.test.mjs: PASS');

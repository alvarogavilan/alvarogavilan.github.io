import assert from 'node:assert/strict';
import fs from 'node:fs';

const e=JSON.parse(fs.readFileSync('loterias-ai/edge-live/evidence/spain-igt-physical-variable-state-v1.json','utf8'));
assert.equal(e.mode,'RESEARCH_ONLY_NO_PLAY');
assert.equal(e.realMoneyAllowed,false);
assert.equal(e.venue.name,'Casino La Toja');
assert.equal(e.venue.currentPhysicalInstallationClaim,true);
assert.deepEqual(e.venue.publishedIgtCrystalTitles,['Ocean’s Magic','Scarab']);

const scarab=e.candidates.find(x=>x.id==='casino-la-toja-scarab-igt');
assert.ok(scarab);
assert.equal(scarab.venueTitleExactMatch,true);
assert.equal(scarab.currentSpainPresence.verifiedFromVenueOfficialPage,true);
assert.equal(scarab.globalMechanismComparator.verifiedFacts.paylines,75);
assert.equal(scarab.globalMechanismComparator.verifiedFacts.cycleSpins,10);
assert.equal(scarab.globalMechanismComparator.verifiedFacts.previousPlayerCanLeaveWildState,true);
assert.equal(scarab.globalMechanismComparator.strategyTransferToSpainAllowed,false);
assert.equal(scarab.localFingerprintGates.abandonedBordersVisibleAfterPlayerChangeVerified,false);
assert.equal(scarab.localFingerprintGates.exactPaytableMatchesComparator,false);
assert.equal(scarab.localFingerprintGates.comparatorStrategyValidatedForLocalConfig,false);
assert.equal(scarab.decision.maxSpins,0);
assert.equal(scarab.decision.maxTotalStakeEUR,0);
assert.equal(scarab.decision.realMoneyAllowed,false);

const ocean=e.candidates.find(x=>x.id==='casino-la-toja-oceans-magic-igt');
assert.ok(ocean);
assert.equal(ocean.venueTitleExactMatchToCanonical,false);
assert.equal(ocean.globalMechanismComparator.verifiedFacts.variableStateClassification,true);
assert.equal(ocean.globalMechanismComparator.verifiedFacts.bubbleStateCanBeAbandonedByPreviousPlayer,true);
assert.equal(ocean.globalMechanismComparator.verifiedFacts.positivePlayerAdvantageCanExistInFavorableBubblePositions,true);
assert.deepEqual(ocean.globalMechanismComparator.analysisCalibration.simulatedBaseReturnPctRange,[85,86]);
assert.equal(ocean.globalMechanismComparator.strategyTransferToSpainAllowed,false);
assert.equal(ocean.localFingerprintGates.canonicalTitleScreenVerified,false);
assert.equal(ocean.localFingerprintGates.bubblePersistenceVisibleAcrossPlayerChangeVerified,false);
assert.equal(ocean.decision.maxSpins,0);
assert.equal(ocean.decision.realMoneyAllowed,false);

assert.equal(e.portfolioFinding.currentSpainPhysicalVenuePublishesAtLeastOneExactDocumentedVariableStateApTitle,true);
assert.equal(e.portfolioFinding.exactTitle,'Scarab');
assert.equal(e.hardGuards.venueTitleDoesNotProveComparatorConfiguration,true);
assert.equal(e.hardGuards.foreignStrategyDoesNotAutoTransfer,true);
assert.equal(e.hardGuards.noWageringForFingerprintResearch,true);
assert.equal(e.hardGuards.realMoneyAllowed,false);

console.log('spain-igt-physical-variable-state-v1.test.mjs: PASS');

import assert from 'node:assert/strict';
import fs from 'node:fs';

const e=JSON.parse(fs.readFileSync('loterias-ai/edge-live/evidence/spain-scarab-primary-regulatory-closure-v1.json','utf8'));

assert.equal(e.status,'PRIMARY_EVIDENCE_STRENGTHENED_LOCAL_CONFIG_UNRESOLVED_NO_PLAY');
assert.equal(e.realMoneyAllowed,false);
assert.equal(e.candidate.game,'Scarab');
assert.equal(e.candidate.venue,'Casino La Toja');
assert.equal(e.candidate.currentVenueEvidence.venueListsExactScarabTitle,true);
assert.equal(e.candidate.currentVenueEvidence.familyBetRangeIsExactScarabStakeMapping,false);

const primary=e.igtPrimaryEvidence;
assert.equal(primary.officialGamePage.facts.globalIgtGame,true);
assert.equal(primary.officialGamePage.facts.wildStaysMechanic,true);
assert.equal(primary.officialGamePage.facts.every10SpinsCollectedScarabsTurnWild,true);
assert.equal(primary.officialGamePage.facts.operatorSelectableDenominations,true);
assert.equal(primary.officialGamePage.facts.multipleRtpOptions,true);
assert.deepEqual(primary.officialIgtBrochureComparator.facts.lineOptions,[40,75]);
assert.deepEqual(primary.officialIgtBrochureComparator.facts.paybackOptionsPctFor75Lines,[85,87,89,91,93,95,96]);
assert.equal(primary.officialIgtBrochureComparator.facts.multiDenomination,true);
assert.equal(primary.officialIgtBrochureComparator.exactCasinoLaTojaConfigurationIdentified,false);

assert.equal(e.independentApComparator.facts.previousPlayerCanLeaveWildState,true);
assert.equal(e.independentApComparator.facts.game10Of10MeansNextSpinStartsFreshCycle,true);
assert.equal(e.independentApComparator.localStrategyTransferAllowed,false);

const reg=e.galiciaRegulatoryEvidence;
assert.equal(reg.registerProcedure.procedure,'PR326X');
assert.equal(reg.registerProcedure.facts.typeCMachinesMustBeHomologatedAndRegistered,true);
assert.equal(reg.registerProcedure.facts.registrationRequiresCompleteGameDescription,true);
assert.equal(reg.registerProcedure.facts.registrationRequiresOperatingMemory,true);
assert.equal(reg.registerLaw.facts.registerStoresModelDenomination,true);
assert.equal(reg.machineRegulation.facts.gamePriceIsFixedForEachModelInRegistrationResolution,true);
assert.equal(reg.machineRegulation.facts.multiDenominationMachinesMayBeHomologated,true);
assert.equal(reg.publicIndexedScarabResolutionRecovered,false);
assert.equal(reg.publicIndexedIgtCrystalResolutionRecovered,false);

assert.equal(e.scientificImplication.primaryManufacturerMechanismConfirmed,true);
assert.equal(e.scientificImplication.currentSpainPhysicalExactTitleConfirmedByVenue,true);
assert.equal(e.scientificImplication.configurationVariabilityConfirmedByManufacturer,true);
assert.equal(e.scientificImplication.localConfigurationStillFundamental,true);

for(const [key,value] of Object.entries(e.closureGates)){
  assert.equal(value,false,`closure gate ${key} must remain false`);
}
assert.equal(e.decision.thresholdNow,null);
assert.equal(e.decision.exactStakeEUR,null);
assert.equal(e.decision.maxSpins,0);
assert.equal(e.decision.maxTotalStakeEUR,0);
assert.equal(e.decision.realMoneyAllowed,false);
assert.equal(e.hardGuards.manufacturerGlobalRtpOptionsDoNotIdentifyLocalRtp,true);
assert.equal(e.hardGuards.venueFamilyBetRangeDoesNotIdentifyExactScarabStake,true);
assert.equal(e.hardGuards.independentComparatorAdviceDoesNotAutoTransfer,true);
assert.equal(e.hardGuards.registrationProcedureDoesNotProveRecordContentsUntilRecordRecovered,true);
assert.equal(e.hardGuards.realMoneyAllowed,false);

console.log('spain-scarab-primary-regulatory-closure-v1.test.mjs: PASS');

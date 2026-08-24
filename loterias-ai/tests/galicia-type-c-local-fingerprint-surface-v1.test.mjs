import assert from 'node:assert/strict';
import fs from 'node:fs';

const e=JSON.parse(fs.readFileSync('loterias-ai/edge-live/evidence/galicia-type-c-local-fingerprint-surface-v1.json','utf8'));
const f=e.survivingPrimarySource.facts;

assert.equal(e.status,'CURRENT_PRIMARY_REGULATORY_LOCAL_FINGERPRINT_SURFACE_IDENTIFIED_NO_PLAY');
assert.equal(e.jurisdiction,'ES-GA');
assert.equal(e.realMoneyAllowed,false);
assert.equal(e.currentRegulationStatus.decreto39_2008Status,'EN_VIGOR');
assert.equal(e.currentRegulationStatus.facts.existingGamingRegulationsRemainInForceUnlessContraryToLaw3_2023,true);
assert.equal(e.currentRegulationStatus.facts.decreto39_2008Article22ExpresslyRepealed,true);
assert.equal(e.currentRegulationStatus.facts.historicalArticle22DetailsExcludedFromCurrentProof,true);
assert.equal(f.typeCPriceFixedPerModelInRegistrationResolution,true);
assert.equal(f.typeCMaxPrizeFixedPerModelInRegistrationResolution,true);
assert.equal(f.typeCMayUseMultiplePaylines,true);
assert.equal(f.typeCMayBeMultidenomination,true);
assert.equal(f.typeCFrontOrVideoMustShowNumberOfBetsPerPlay,true);
assert.equal(f.typeCFrontOrVideoMustShowGameRules,true);
assert.equal(f.typeCFrontOrVideoMustShowAcceptedDenominationValues,true);
assert.equal(f.typeCFrontOrVideoMustShowWinningCombinationsAndPrizeAmounts,true);
assert.equal(f.typeCFrontOrVideoMustShowMinimumReturnPercentage,true);
assert.equal(f.factoryPlateMustShowManufacturerRegistrationCode,true);
assert.equal(f.factoryPlateMustShowGaliciaModelRegistrationCode,true);
assert.equal(f.factoryPlateMustShowMachineSeriesAndNumber,true);
assert.equal(f.manufacturingCertificateIncludesTypeAndModelName,true);
assert.equal(f.manufacturingCertificateIncludesModelRegistryNumberAndMachineSerial,true);
assert.equal(f.exploitationAuthorizationIndividualizesSpecificMachineAgainstHomologatedModel,true);
assert.equal(f.oneExploitationAuthorizationCopyPlacedInMachine,true);
assert.equal(f.substantialModificationIncludesPriceGameProgramOrGainPlan,true);
assert.equal(f.substantialModificationKeepsRegistryNumberWithAlphabeticSuffix,true);
assert.equal(e.currentRegistrationProcedure.procedure,'PR326X');
assert.equal(e.currentRegistrationProcedure.facts.typeCRegistrationProcedureCurrentlyOpen,true);
assert.equal(e.currentRegistrationProcedure.facts.requiresCompleteGameDescription,true);
assert.equal(e.currentRegistrationProcedure.facts.requiresOperatingMemory,true);
assert.equal(e.currentRegistrationProcedure.facts.requiresOneGameStorageMediumCopy,true);
assert.equal(e.currentRegistrationProcedure.facts.requiresCounterTypeDescriptionAndConformityEvidence,true);
assert.equal(e.currentLawSource.facts.registerStoresModelDenomination,true);
assert.equal(e.currentLawSource.facts.registerStoresGeneralCharacteristics,true);
assert.equal(e.fieldCaptureProtocol.requiresWager,false);
assert.ok(e.fieldCaptureProtocol.minimumHighValueImages.length>=3);
assert.equal(e.closureImpact.closesAnyScarabGateNow,false);
assert.equal(e.closureImpact.noWagerLocalIdentifierRecoveryLegallySupported,true);
assert.equal(e.closureImpact.currentProcedureConfirmsTechnicalFingerprintArtifactsExist,true);
assert.equal(e.closureImpact.realMoneyAllowed,false);
assert.equal(e.hardGuards.repealedArticle22NeverUsedAsCurrentAuthority,true);
assert.equal(e.hardGuards.legalDisclosureRequirementDoesNotProveExactLocalValuesUntilObserved,true);
assert.equal(e.hardGuards.minimumReturnDisplayDoesNotEqualConfiguredRtpUnlessItsSemanticsAreVerified,true);
assert.equal(e.hardGuards.modelRegistryCodeDoesNotByItselfIdentifySoftwareBuildUnlessMappedByEvidence,true);
assert.equal(e.hardGuards.currentProcedureDoesNotProveSubmittedTechnicalFilesArePubliclyAccessible,true);
assert.equal(e.hardGuards.noWagerNeededForThisCaptureProtocol,true);
assert.equal(e.hardGuards.realMoneyAllowed,false);

for(const forbidden of [
  'registrationMemoryMustStateBetPrice',
  'registrationMemoryMustStateMaxPrizeAndGainPlan',
  'registrationMemoryMustStatePrizePercentageAndCalculationCycle',
  'technicalRegistrationDossierHasConfidentialityProtection'
]) assert.equal(Object.hasOwn(f,forbidden),false,`repealed article 22 fact leaked into current proof: ${forbidden}`);

console.log('galicia-type-c-local-fingerprint-surface-v1.test.mjs: PASS');

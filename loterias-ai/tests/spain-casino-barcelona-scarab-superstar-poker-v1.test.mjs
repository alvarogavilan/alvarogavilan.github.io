import assert from 'node:assert/strict';
import fs from 'node:fs';

const e=JSON.parse(fs.readFileSync('loterias-ai/edge-live/evidence/spain-casino-barcelona-scarab-superstar-poker-v1.json','utf8'));

assert.equal(e.status,'PRIMARY_IGT_SPAIN_SCARAB_CHOOSER_DEPLOYMENT_CURRENT_CATEGORY_CONFIRMED_EXACT_PACK_UNRESOLVED_NO_PLAY');
assert.equal(e.market,'ES-CT');
assert.equal(e.realMoneyAllowed,false);
assert.equal(e.candidate.venue,'Casino Barcelona');
assert.equal(e.candidate.provider,'IGT');
assert.equal(e.candidate.commercialTheme,'Scarab');
assert.equal(e.candidate.hostGamePack,'Super Star Poker II');
assert.equal(e.candidate.hardware,'PeakBarTop Buddy Bar');
assert.equal(e.candidate.launchEvidence.facts.officialIgtPrimarySource,true);
assert.equal(e.candidate.launchEvidence.facts.casinoBarcelonaSpainNamed,true);
assert.equal(e.candidate.launchEvidence.facts.superStarPokerIIGamePackLaunched,true);
assert.equal(e.candidate.launchEvidence.facts.scarabVideoSlotExplicitlyIncludedInGamePack,true);
assert.equal(e.candidate.launchEvidence.facts.hardwareScreenSizeInches,23);

const current=e.candidate.currentVenueCategoryEvidence.facts;
assert.equal(current.officialCasinoBarcelonaSource,true);
assert.equal(current.physicalCasinoCurrentlyListsVideoPoker,true);
assert.equal(current.physicalCasinoCurrentlyListsMultiGameVideoSlots,true);
assert.equal(current.multiGameDescriptionIncludesPokerBingoKeno,true);
assert.equal(current.exactIgtVideoPokerAreaNamed,false);
assert.equal(current.exactSuperStarPokerIIPackNamed,false);
assert.equal(current.exactScarabThemeNamed,false);
assert.equal(e.candidate.industryFreshnessBridge.facts.casinoBarcelonaProfiledIn2025,true);
assert.equal(e.candidate.industryFreshnessBridge.facts.profileReferences2024IgtVideoPokerAreaAddition,true);
assert.equal(e.candidate.industryFreshnessBridge.facts.provesExactPackStillInstalledIn2026,false);
assert.equal(e.candidate.freshness.currentVenueStillOffersPhysicalVideoPokerIn2026,true);
assert.equal(e.candidate.freshness.currentPhysicalSuperStarPokerIIPresenceConfirmedIn2026,false);
assert.equal(e.candidate.freshness.currentExactScarabChooserAvailabilityConfirmedIn2026,false);

assert.equal(e.globalChooserSoftwareFingerprints.mississippi.facts.idNumber,'AB020SSAD003');
assert.equal(e.globalChooserSoftwareFingerprints.mississippi.facts.sha1,'13EA7C5A8A2F9E4FB644370714DC708CEE8ABBA6');
assert.equal(e.globalChooserSoftwareFingerprints.kansas.facts.approvalIdentifier,'MO-22-IGT-21-08');
assert.equal(e.globalChooserSoftwareFingerprints.westVirginia2026.facts.approvalIdentifier,'MO-22-IGT-21-08');
assert.equal(e.globalChooserSoftwareFingerprints.westVirginia2026.facts.chooserProgram,true);
assert.equal(e.globalChooserSoftwareFingerprints.westVirginia2026.facts.chooserProvidesInterfaceToNavigateBetweenDifferentGames,true);

for(const [key,value] of Object.entries(e.scarabTransferBoundary)){
  if(key==='sameCommercialScarabTitleAsStandaloneComparator') assert.equal(value,true);
  else if(key!=='reason') assert.equal(value,false,`transfer boundary ${key} must remain false`);
}
for(const [key,value] of Object.entries(e.localFingerprintGates)){
  assert.equal(value,false,`local fingerprint gate ${key} must remain false`);
}
assert.equal(e.nextProof.requiresWager,false);
assert.equal(e.nextProof.priority,'P0_PARALLEL_FINGERPRINT_TARGET');
assert.ok(e.nextProof.targets.length>=4);
assert.equal(e.decision.researchPriority,'P0_PARALLEL_SPAIN_SCARAB_FINGERPRINT');
assert.equal(e.decision.thresholdNow,null);
assert.equal(e.decision.exactStakeEUR,null);
assert.equal(e.decision.maxSpins,0);
assert.equal(e.decision.maxTotalStakeEUR,0);
assert.equal(e.decision.realMoneyAllowed,false);
assert.equal(e.hardGuards.currentVideoPokerCategoryDoesNotProveCurrentExactIgtPack,true);
assert.equal(e.hardGuards['2024LaunchDoesNotProve2026ExactPackPresence'],true);
assert.equal(e.hardGuards.gamePackInclusionDoesNotProveExactLocalScarabMechanics,true);
assert.equal(e.hardGuards.foreignChooserFingerprintDoesNotIdentifyCasinoBarcelonaBinary,true);
assert.equal(e.hardGuards.commercialTitleDoesNotIdentifyLocalBinary,true);
assert.equal(e.hardGuards.deterministicTheoremDoesNotAutoTransferToChooserHostedScarab,true);
assert.equal(e.hardGuards.noWagerNeededForNextResearchStep,true);
assert.equal(e.hardGuards.executionContractRemainsSoleGreenAuthority,true);
assert.equal(e.hardGuards.realMoneyAllowed,false);

console.log('spain-casino-barcelona-scarab-superstar-poker-v1.test.mjs: PASS');

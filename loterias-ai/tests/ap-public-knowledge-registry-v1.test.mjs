import assert from 'node:assert/strict';
import {getApPublicKnowledgeRegistry,evaluateMustHitByCandidate,evaluateOceanMagicDeployment,evaluateOnlineInitialStateCandidate,evaluateRegalRichesDeployment,getLotteryRuleOverlaySearchTargets} from '../edge-backend/src/ap-public-knowledge-registry-v1.mjs';

const registry=getApPublicKnowledgeRegistry();
assert.equal(registry.execution.decision,'NO_PLAY');
assert.equal(registry.execution.realMoneyAllowed,false);
assert.equal(registry.hardGuards.youtubeIsDiscoveryNotExecutionAuthority,true);
assert.equal(registry.hardGuards.multiAccountCyclingForbidden,true);
assert.equal(registry.hardGuards.regionalVariantCanRemovePersistentFeature,true);
assert.equal(registry.hardGuards.uniformMhbTriggerCannotBeAssumed,true);
assert.equal(registry.categories.TRUE_MUST_HIT_BY.ordinaryProgressiveClosenessIsSufficient,false);
assert.equal(registry.categories.TRUE_MUST_HIT_BY.uniformTriggerMayBeAssumed,false);
assert.equal(registry.categories.OCEAN_MAGIC_VARIABLE_STATE.regionalVariantCanRemovePersistence,true);
assert.equal(registry.categories.ONLINE_PERSISTENT_INITIAL_STATE.crossPlayerInheritanceRequired,false);
assert.equal(registry.categories.ONLINE_PERSISTENT_INITIAL_STATE.multiAccountCyclingAllowed,false);
assert.equal(registry.categories.REGAL_RICHES_PERSISTENT_MHB.creatorEntryThresholdsAreExecutionAuthority,false);
assert.equal(registry.categories.REGAL_RICHES_PERSISTENT_MHB.familyRuleCandidates.purpleMinorMustHitBy,75);
assert.equal(registry.categories.REGAL_RICHES_PERSISTENT_MHB.familyRuleCandidates.greenMajorMustHitBy,100);
assert.equal(registry.categories.REGAL_RICHES_PERSISTENT_MHB.familyRuleCandidates.yellowMegaMustHitBy,125);

const fakeNearMax=evaluateMustHitByCandidate({progressiveNearAdvertisedMaximum:true});
assert.equal(fakeNearMax.admittedForExactEvResearch,false);
assert.ok(fakeNearMax.warnings.includes('NEAR_MAXIMUM_IS_NOT_MHB_EVIDENCE'));
assert.equal(fakeNearMax.execution.realMoneyAllowed,false);

const noTriggerModel=evaluateMustHitByCandidate({explicitMustHitByRuleVerified:true,exactBoundaryVerified:true,currentMeterVerified:true,qualifyingStakeVerified:true,exactServedConfigurationVerified:true,baseCostModelVerified:true});
assert.equal(noTriggerModel.admittedForExactEvResearch,false);
assert.ok(noTriggerModel.missing.includes('triggerCostModelVerified'));

const invalidUniform=evaluateMustHitByCandidate({explicitMustHitByRuleVerified:true,exactBoundaryVerified:true,currentMeterVerified:true,qualifyingStakeVerified:true,exactServedConfigurationVerified:true,baseCostModelVerified:true,uniformTriggerAssumed:true});
assert.equal(invalidUniform.admittedForExactEvResearch,false);
assert.ok(invalidUniform.warnings.includes('UNIFORM_TRIGGER_CANNOT_BE_ASSUMED'));

const researchReady=evaluateMustHitByCandidate({explicitMustHitByRuleVerified:true,exactBoundaryVerified:true,currentMeterVerified:true,qualifyingStakeVerified:true,exactServedConfigurationVerified:true,baseCostModelVerified:true,conservativeWorstCaseCostBoundVerified:true});
assert.equal(researchReady.admittedForExactEvResearch,true);
assert.equal(researchReady.triggerCostModel.verified,true);
assert.equal(researchReady.execution.realMoneyAllowed,false);

const oceanCrossDeployment=evaluateOceanMagicDeployment({exactIgtProviderFingerprintVerified:true,persistentRuleVerified:true,preWagerStateVisible:true,crossPlayerPersistenceVerified:false,stateSpecificEvVerified:false});
assert.equal(oceanCrossDeployment.researchStage,'EXACT_DEPLOYMENT_INHERITANCE_REQUIRED');
assert.equal(oceanCrossDeployment.currentObservationCanUsePhysicalOrForeignVideoAsSpanishState,false);
assert.equal(oceanCrossDeployment.execution.realMoneyAllowed,false);

const oceanRegionalOnly=evaluateOceanMagicDeployment({exactIgtProviderFingerprintVerified:true,foreignPersistentVariantObserved:true,sameTitleProviderRtpMatched:true,persistentRuleVerified:false});
assert.equal(oceanRegionalOnly.researchStage,'EXACT_PERSISTENCE_RULE_REQUIRED');
assert.ok(oceanRegionalOnly.warnings.includes('FOREIGN_PERSISTENT_VARIANT_CANNOT_PROVE_SPANISH_PERSISTENCE'));
assert.ok(oceanRegionalOnly.warnings.includes('SAME_TITLE_PROVIDER_RTP_DO_NOT_PROVE_PERSISTENCE'));
assert.equal(oceanRegionalOnly.execution.realMoneyAllowed,false);

const initialStateBlocked=evaluateOnlineInitialStateCandidate({multiAccountCyclingProposed:true,historicalOceanMagicEdgeTransferred:true});
assert.equal(initialStateBlocked.admittedForExactEvResearch,false);
assert.ok(initialStateBlocked.warnings.includes('MULTI_ACCOUNT_CYCLING_FORBIDDEN'));
assert.ok(initialStateBlocked.warnings.includes('HISTORICAL_OCEAN_MAGIC_EDGE_CANNOT_TRANSFER'));
assert.equal(initialStateBlocked.execution.realMoneyAllowed,false);

const initialStateResearchReady=evaluateOnlineInitialStateCandidate({exactServedConfigurationVerified:true,preWagerInitialStateVerified:true,initialStateScopeVerified:true,exactTheoreticalRtpVerified:true,stateSpecificEvVerified:true,repeatabilityVerified:true});
assert.equal(initialStateResearchReady.admittedForExactEvResearch,true);
assert.equal(initialStateResearchReady.doesNotRequireCrossPlayerInheritance,true);
assert.equal(initialStateResearchReady.execution.decision,'NO_PLAY');

const regalHeuristicOnly=evaluateRegalRichesDeployment({gameId:'regal-riches-aig',creatorSuggestedEntryThresholdUsed:true,servedBoundaries:{purpleMinorMustHitBy:75,greenMajorMustHitBy:100,yellowMegaMustHitBy:125}});
assert.equal(regalHeuristicOnly.admittedForStateSpecificEvResearch,false);
assert.equal(regalHeuristicOnly.exactBoundariesVerified,false);
assert.ok(regalHeuristicOnly.warnings.includes('CREATOR_ENTRY_THRESHOLD_IS_DISCOVERY_ONLY'));
assert.equal(regalHeuristicOnly.execution.realMoneyAllowed,false);

const regalReloadOnly=evaluateRegalRichesDeployment({gameId:'regal-riches-aig',exactIgtProviderFingerprintVerified:true,exactServedRulesFingerprintVerified:true,persistentMeterRuleVerified:true,preWagerMeterStateVisible:true,reloadPersistenceVerified:true,crossPlayerPersistenceVerified:false,exactTheoreticalRtpVerified:true,exactStakeConfigurationVerified:true,stateSpecificEvVerified:true,servedBoundaries:{purpleMinorMustHitBy:75,greenMajorMustHitBy:100,yellowMegaMustHitBy:125}});
assert.equal(regalReloadOnly.exactBoundariesVerified,true);
assert.equal(regalReloadOnly.admittedForStateSpecificEvResearch,false);
assert.ok(regalReloadOnly.warnings.includes('RELOAD_DOES_NOT_PROVE_CROSS_PLAYER_INHERITANCE'));
assert.equal(regalReloadOnly.execution.realMoneyAllowed,false);

const lottery=getLotteryRuleOverlaySearchTargets();
assert.ok(lottery.targets.includes('ROLLDOWN_OR_FORCED_REDISTRIBUTION'));
assert.ok(lottery.forbiddenTargets.includes('FUTURE_INFORMATION'));
assert.ok(lottery.forbiddenTargets.includes('PAST_DRAW_NUMBER_PATTERN'));
assert.equal(lottery.execution.realMoneyAllowed,false);

console.log('ap-public-knowledge-registry-v1.test.mjs PASS');

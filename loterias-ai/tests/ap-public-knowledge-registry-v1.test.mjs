import assert from 'node:assert/strict';
import {getApPublicKnowledgeRegistry,evaluateMustHitByCandidate,evaluateOceanMagicDeployment,getLotteryRuleOverlaySearchTargets} from '../edge-backend/src/ap-public-knowledge-registry-v1.mjs';

const registry=getApPublicKnowledgeRegistry();
assert.equal(registry.execution.decision,'NO_PLAY');
assert.equal(registry.execution.realMoneyAllowed,false);
assert.equal(registry.hardGuards.youtubeIsDiscoveryNotExecutionAuthority,true);
assert.equal(registry.categories.TRUE_MUST_HIT_BY.ordinaryProgressiveClosenessIsSufficient,false);

const fakeNearMax=evaluateMustHitByCandidate({progressiveNearAdvertisedMaximum:true});
assert.equal(fakeNearMax.admittedForExactEvResearch,false);
assert.ok(fakeNearMax.warnings.includes('NEAR_MAXIMUM_IS_NOT_MHB_EVIDENCE'));
assert.equal(fakeNearMax.execution.realMoneyAllowed,false);

const researchReady=evaluateMustHitByCandidate({
  explicitMustHitByRuleVerified:true,
  exactBoundaryVerified:true,
  currentMeterVerified:true,
  qualifyingStakeVerified:true,
  exactServedConfigurationVerified:true,
  baseCostModelVerified:true
});
assert.equal(researchReady.admittedForExactEvResearch,true);
assert.equal(researchReady.execution.decision,'NO_PLAY');
assert.equal(researchReady.execution.realMoneyAllowed,false);

const oceanCrossDeployment=evaluateOceanMagicDeployment({
  exactIgtProviderFingerprintVerified:true,
  persistentRuleVerified:true,
  preWagerStateVisible:true,
  crossPlayerPersistenceVerified:false,
  stateSpecificEvVerified:false
});
assert.equal(oceanCrossDeployment.researchStage,'EXACT_DEPLOYMENT_INHERITANCE_REQUIRED');
assert.equal(oceanCrossDeployment.currentObservationCanUsePhysicalOrForeignVideoAsSpanishState,false);
assert.equal(oceanCrossDeployment.execution.realMoneyAllowed,false);

const lottery=getLotteryRuleOverlaySearchTargets();
assert.ok(lottery.targets.includes('ROLLDOWN_OR_FORCED_REDISTRIBUTION'));
assert.ok(lottery.forbiddenTargets.includes('FUTURE_INFORMATION'));
assert.ok(lottery.forbiddenTargets.includes('PAST_DRAW_NUMBER_PATTERN'));
assert.equal(lottery.execution.realMoneyAllowed,false);

console.log('ap-public-knowledge-registry-v1.test.mjs PASS');

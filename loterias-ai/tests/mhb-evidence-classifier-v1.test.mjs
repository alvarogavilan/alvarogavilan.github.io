import assert from 'node:assert/strict';
import {classifyMhbEvidence} from '../edge-backend/src/mhb-evidence-classifier-v1.mjs';

const nameOnly=classifyMhbEvidence({risingRewardsNamePresent:true});
assert.equal(nameOnly.classification,'FAMILY_NAME_ONLY_NOT_MHB_PROVEN');
assert.equal(nameOnly.admittedToMhbResearchLane,false);
assert.ok(nameOnly.warnings.includes('FAMILY_NAME_CANNOT_PROVE_MHB'));
assert.equal(nameOnly.execution.realMoneyAllowed,false);

const giveMeGold=classifyMhbEvidence({
  exactOperatorTitleBound:true,
  risingRewardsNamePresent:true,
  publishedMaximumPresent:true,
  triggerProbabilityIncreasesWithMeter:true,
  explicitMustHitByWording:false,
  mandatoryAwardAtBoundaryVerified:false
});
assert.equal(giveMeGold.classification,'BOUNDED_OR_RISING_RANDOM_JACKPOT_NOT_MHB_PROVEN');
assert.equal(giveMeGold.admittedToMhbResearchLane,false);
assert.ok(giveMeGold.warnings.includes('PUBLISHED_MAXIMUM_CANNOT_PROVE_MHB'));
assert.ok(giveMeGold.warnings.includes('INCREASING_TRIGGER_PROBABILITY_CANNOT_PROVE_MHB'));

const minotaur=classifyMhbEvidence({
  exactOperatorTitleBound:true,
  risingRewardsNamePresent:true,
  publishedMaximumPresent:true,
  explicitMustHitByWording:true,
  mandatoryAwardAtBoundaryVerified:true
});
assert.equal(minotaur.classification,'EXPLICIT_MHB_RULE_CANDIDATE');
assert.equal(minotaur.admittedToMhbResearchLane,true);
assert.equal(minotaur.execution.decision,'NO_PLAY');
assert.equal(minotaur.execution.realMoneyAllowed,false);

console.log('mhb-evidence-classifier-v1.test.mjs: PASS');

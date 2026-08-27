import assert from 'node:assert/strict';
import {evaluateBetfairApMcCoyAttemptPlanActivation,getApprovedBetfairApMcCoyAttemptPlanActivation} from '../casino/jackpots/betfair-apmccoy-attempt-plan-activation-v1.mjs';

const fake='a'.repeat(40),binding='bf_es|https://ticker.example/new_jackpotxml.php|https://launcher.betfair.es/initialResources/es_ES_desktop|es1';
let r=evaluateBetfairApMcCoyAttemptPlanActivation({activationReviewCommit:fake,bindingScopeKey:binding,firstScheduledGhtEpochSeconds:2_000});
assert.equal(r.valid,false);
assert.equal(r.reason,'ACTIVATION_REVIEW_COMMIT_NOT_CODE_ALLOWLISTED');
assert.equal(r.planActivated,false);
assert.equal(r.execution.decision,'NO_PLAY');
assert.equal(r.execution.realMoneyAllowed,false);
assert.equal(getApprovedBetfairApMcCoyAttemptPlanActivation(fake),null);

r=evaluateBetfairApMcCoyAttemptPlanActivation({activationReviewCommit:'not-a-sha',bindingScopeKey:binding,firstScheduledGhtEpochSeconds:2_000});
assert.equal(r.valid,false);
assert.equal(r.reason,'ACTIVATION_REVIEW_COMMIT_NOT_CODE_ALLOWLISTED');
console.log('betfair-apmccoy-attempt-plan-activation-v1.test.mjs: PASS');

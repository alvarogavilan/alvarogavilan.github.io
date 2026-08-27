import assert from 'node:assert/strict';
import {reviewBetfairApMcCoyScheduledAttemptLedger,isApprovedBetfairApMcCoyAttemptLedgerReviewCommit} from '../casino/jackpots/betfair-apmccoy-scheduled-attempt-ledger-review-v1.mjs';

const freeze='e82f6d61dffa21ec3ca7ec940c51fc3fe36f0e1a';
const digest='b'.repeat(64),ledgerCommit='c'.repeat(40),fakeReview='a'.repeat(40),fakeActivation='d'.repeat(40);
const binding='bf_es|https://ticker.example/new_jackpotxml.php|https://launcher.betfair.es/initialResources/es_ES_desktop|';
const entries=Array.from({length:7},(_,i)=>({attemptId:`a${i+1}`,scheduledGhtEpochSeconds:2_000+i*86_400,terminalClass:i===0?'CAPTURE_FAILED':'MISSED_SCHEDULED_OPPORTUNITY',evidenceDigestSha256:digest,reason:i===0?'network capture failed':'scheduled opportunity not captured'}));
const base={version:'betfair-apmccoy-scheduled-attempt-ledger-v1',planFreezeCommitSha:freeze,activationReviewCommit:fakeActivation,targetScheduledOpportunities:7,stoppingRuleType:'FIXED_FIRST_SEVEN_SCHEDULED_DISTINCT_DAILY_GHT_OPPORTUNITIES',stopRuleChangedAfterObservation:false,bindingScopeKey:binding,entries};

let r=reviewBetfairApMcCoyScheduledAttemptLedger({ledger:base,ledgerCommit,reviewCommit:fakeReview});
assert.equal(r.valid,false);
assert.equal(r.reason,'ATTEMPT_PLAN_ACTIVATION_NOT_VERIFIED');
assert.equal(r.activation.reason,'ACTIVATION_REVIEW_COMMIT_NOT_CODE_ALLOWLISTED');
assert.equal(r.execution.decision,'NO_PLAY');
assert.equal(r.execution.realMoneyAllowed,false);
assert.equal(isApprovedBetfairApMcCoyAttemptLedgerReviewCommit(fakeReview),false);

r=reviewBetfairApMcCoyScheduledAttemptLedger({ledger:{...base,entries:entries.slice(0,6)},ledgerCommit,reviewCommit:fakeReview});
assert.equal(r.valid,false);
assert.equal(r.reason,'EXACTLY_SEVEN_SCHEDULED_ATTEMPT_ENTRIES_REQUIRED');

r=reviewBetfairApMcCoyScheduledAttemptLedger({ledger:{...base,stopRuleChangedAfterObservation:true},ledgerCommit,reviewCommit:fakeReview});
assert.equal(r.valid,false);
assert.equal(r.reason,'STOPPING_RULE_MUST_REMAIN_UNCHANGED');

r=reviewBetfairApMcCoyScheduledAttemptLedger({ledger:base,reviewCommit:fakeReview});
assert.equal(r.valid,false);
assert.equal(r.reason,'COMMITTED_ATTEMPT_LEDGER_SHA_REQUIRED');

r=reviewBetfairApMcCoyScheduledAttemptLedger({ledger:{...base,activationReviewCommit:null},ledgerCommit,reviewCommit:fakeReview});
assert.equal(r.valid,false);
assert.equal(r.reason,'ATTEMPT_PLAN_ACTIVATION_NOT_VERIFIED');
assert.equal(r.activation.reason,'ACTIVATION_REVIEW_COMMIT_NOT_CODE_ALLOWLISTED');

console.log('betfair-apmccoy-scheduled-attempt-ledger-review-v1.test.mjs: PASS');

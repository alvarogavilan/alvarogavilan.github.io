import assert from 'node:assert/strict';
import {reviewBetfairApMcCoyScheduledAttemptLedger,isApprovedBetfairApMcCoyAttemptLedgerReviewCommit} from '../casino/jackpots/betfair-apmccoy-scheduled-attempt-ledger-review-v1.mjs';

const freeze='e82f6d61dffa21ec3ca7ec940c51fc3fe36f0e1a';
const digest='b'.repeat(64),fakeReview='a'.repeat(40);
const binding='bf_es|https://ticker.example/new_jackpotxml.php|https://launcher.betfair.es/initialResources/es_ES_desktop|';
const entries=Array.from({length:7},(_,i)=>({attemptId:`a${i+1}`,scheduledGhtEpochSeconds:2_000+i*86_400,terminalClass:i===0?'CAPTURE_FAILED':'MISSED_SCHEDULED_OPPORTUNITY',evidenceDigestSha256:digest,reason:i===0?'network capture failed':'scheduled opportunity not captured'}));
const base={version:'betfair-apmccoy-scheduled-attempt-ledger-v1',planFreezeCommitSha:freeze,targetScheduledOpportunities:7,stoppingRuleType:'FIXED_FIRST_SEVEN_SCHEDULED_DISTINCT_DAILY_GHT_OPPORTUNITIES',stopRuleChangedAfterObservation:false,bindingScopeKey:binding,entries};

let r=reviewBetfairApMcCoyScheduledAttemptLedger({ledger:base,reviewCommit:fakeReview});
assert.equal(r.valid,false);
assert.equal(r.reason,'ATTEMPT_LEDGER_REVIEW_COMMIT_NOT_CODE_ALLOWLISTED');
assert.equal(r.scheduledAttemptCount,7);
assert.equal(r.nonCycleFailureCount,7);
assert.equal(r.execution.decision,'NO_PLAY');
assert.equal(r.execution.realMoneyAllowed,false);
assert.equal(isApprovedBetfairApMcCoyAttemptLedgerReviewCommit(fakeReview),false);

r=reviewBetfairApMcCoyScheduledAttemptLedger({ledger:{...base,entries:entries.slice(0,6)},reviewCommit:fakeReview});
assert.equal(r.valid,false);
assert.equal(r.reason,'EXACTLY_SEVEN_SCHEDULED_ATTEMPT_ENTRIES_REQUIRED');

const duplicateGht=entries.map(x=>({...x}));duplicateGht[6].scheduledGhtEpochSeconds=duplicateGht[5].scheduledGhtEpochSeconds;
r=reviewBetfairApMcCoyScheduledAttemptLedger({ledger:{...base,entries:duplicateGht},reviewCommit:fakeReview});
assert.equal(r.valid,false);
assert.equal(r.reason,'MISSING_OR_DUPLICATE_SCHEDULED_GHT');

const missingDigest=entries.map(x=>({...x}));delete missingDigest[3].evidenceDigestSha256;
r=reviewBetfairApMcCoyScheduledAttemptLedger({ledger:{...base,entries:missingDigest},reviewCommit:fakeReview});
assert.equal(r.valid,false);
assert.equal(r.reason,'NON_CYCLE_FAILURE_EVIDENCE_DIGEST_REQUIRED');

r=reviewBetfairApMcCoyScheduledAttemptLedger({ledger:{...base,stopRuleChangedAfterObservation:true},reviewCommit:fakeReview});
assert.equal(r.valid,false);
assert.equal(r.reason,'STOPPING_RULE_MUST_REMAIN_UNCHANGED');

console.log('betfair-apmccoy-scheduled-attempt-ledger-review-v1.test.mjs: PASS');

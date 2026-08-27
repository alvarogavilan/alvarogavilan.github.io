import assert from 'node:assert/strict';
import {reviewBetfairApMcCoyRaceAssumptions} from '../casino/jackpots/betfair-apmccoy-race-assumptions-review-v1.mjs';

const fakeReview='a'.repeat(40);
const base={
  protocolId:'betfair-apmccoy-race-v1',
  completeProspectiveLedgerCommit:'b'.repeat(40),
  cycleIds:['ght-001','ght-002'],
  bindingScopeKey:'bf_es|https://ticker.example/new_jackpotxml.php|https://launcher.betfair.es/initialResources/es_ES_desktop|es1',
  assumptionEvidenceId:'apmccoy-race-assumptions-v1',
  samplingWindowFrozenBeforeFirstCycle:true,
  allEligibleDistinctDailyGhtCyclesIncluded:true,
  failedShortAndAmbiguousCyclesRetained:true,
  assumptionsSelectedUsingSurvivalOutcomes:false,
  completeProspectiveCycleLedgerVerified:true,
  binomialSamplingAssumptionJustified:true,
  currentCycleExchangeabilityVerified:true,
};

let r=reviewBetfairApMcCoyRaceAssumptions({assumptions:base,reviewCommit:fakeReview});
assert.equal(r.valid,false);
assert.equal(r.reason,'RACE_ASSUMPTION_REVIEW_COMMIT_NOT_CODE_ALLOWLISTED');
assert.equal(r.independentRaceAssumptionsReviewed,false);
assert.equal(r.usableForExecution,false);
assert.equal(r.execution.decision,'NO_PLAY');
assert.equal(r.execution.realMoneyAllowed,false);

r=reviewBetfairApMcCoyRaceAssumptions({assumptions:{...base,cycleIds:['ght-001','ght-001']},reviewCommit:fakeReview});
assert.equal(r.reason,'NONEMPTY_UNIQUE_CYCLE_IDS_REQUIRED');
r=reviewBetfairApMcCoyRaceAssumptions({assumptions:{...base,bindingScopeKey:''},reviewCommit:fakeReview});
assert.equal(r.reason,'BINDING_SCOPE_KEY_REQUIRED');
r=reviewBetfairApMcCoyRaceAssumptions({assumptions:{...base,samplingWindowFrozenBeforeFirstCycle:false},reviewCommit:fakeReview});
assert.equal(r.reason,'SAMPLING_WINDOW_NOT_FROZEN_BEFORE_FIRST_CYCLE');
r=reviewBetfairApMcCoyRaceAssumptions({assumptions:{...base,allEligibleDistinctDailyGhtCyclesIncluded:false},reviewCommit:fakeReview});
assert.equal(r.reason,'ALL_ELIGIBLE_DISTINCT_DAILY_GHT_CYCLES_NOT_INCLUDED');
r=reviewBetfairApMcCoyRaceAssumptions({assumptions:{...base,failedShortAndAmbiguousCyclesRetained:false},reviewCommit:fakeReview});
assert.equal(r.reason,'FAILED_SHORT_OR_AMBIGUOUS_CYCLES_NOT_RETAINED');
r=reviewBetfairApMcCoyRaceAssumptions({assumptions:{...base,assumptionsSelectedUsingSurvivalOutcomes:true},reviewCommit:fakeReview});
assert.equal(r.reason,'ASSUMPTIONS_MUST_BE_INDEPENDENT_OF_SURVIVAL_OUTCOMES');
r=reviewBetfairApMcCoyRaceAssumptions({assumptions:{...base,completeProspectiveCycleLedgerVerified:false},reviewCommit:fakeReview});
assert.equal(r.reason,'COMPLETE_PROSPECTIVE_CYCLE_LEDGER_NOT_ATTESTED');
r=reviewBetfairApMcCoyRaceAssumptions({assumptions:{...base,binomialSamplingAssumptionJustified:false},reviewCommit:fakeReview});
assert.equal(r.reason,'BINOMIAL_SAMPLING_ASSUMPTION_NOT_JUSTIFIED');
r=reviewBetfairApMcCoyRaceAssumptions({assumptions:{...base,currentCycleExchangeabilityVerified:false},reviewCommit:fakeReview});
assert.equal(r.reason,'CURRENT_CYCLE_EXCHANGEABILITY_NOT_VERIFIED');

console.log('betfair-apmccoy-race-assumptions-review-v1.test.mjs: PASS');

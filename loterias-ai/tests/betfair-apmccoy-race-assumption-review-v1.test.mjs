import assert from 'node:assert/strict';
import {reviewBetfairApMcCoyRaceAssumptions} from '../casino/jackpots/betfair-apmccoy-race-assumption-review-v1.mjs';

const fakeSha='0123456789abcdef0123456789abcdef01234567';
const base={
  protocolId:'betfair-apmccoy-post-ght-v1',
  cycleIds:['ght-1','ght-2'],
  assumptionEvidenceId:'prospective-ledger-review-v1',
  bindingScopeKey:'bf_es|https://ticker.example/new_jackpotxml.php|https://launcher.betfair.es/initialResources/es_ES_desktop|sljp',
  samplingWindowFrozenBeforeFirstCycle:true,
  allEligibleDistinctDailyGhtCyclesIncluded:true,
  failedShortAndAmbiguousCyclesRetained:true,
  binomialIidAssumptionJustified:true,
  currentCycleExchangeabilityVerified:true,
  assumptionsSelectedUsingSurvivalOutcomes:false,
};
let r=reviewBetfairApMcCoyRaceAssumptions({assumptionArtifact:base,reviewCommit:fakeSha});
assert.equal(r.valid,false);
assert.equal(r.reason,'RACE_ASSUMPTION_REVIEW_COMMIT_NOT_CODE_ALLOWLISTED');
assert.equal(r.raceExecutionAssumptionsVerified,false);
assert.equal(r.usableForExecution,false);
assert.equal(r.execution.decision,'NO_PLAY');
assert.equal(r.execution.realMoneyAllowed,false);

r=reviewBetfairApMcCoyRaceAssumptions({assumptionArtifact:{...base,binomialIidAssumptionJustified:false},reviewCommit:fakeSha});
assert.equal(r.valid,false);
assert.equal(r.reason,'BINOMIAL_IID_OR_EQUIVALENT_MODEL_NOT_JUSTIFIED');

r=reviewBetfairApMcCoyRaceAssumptions({assumptionArtifact:{...base,allEligibleDistinctDailyGhtCyclesIncluded:false},reviewCommit:fakeSha});
assert.equal(r.valid,false);
assert.equal(r.reason,'COMPLETE_ELIGIBLE_GHT_LEDGER_REQUIRED');

r=reviewBetfairApMcCoyRaceAssumptions({assumptionArtifact:{...base,failedShortAndAmbiguousCyclesRetained:false},reviewCommit:fakeSha});
assert.equal(r.valid,false);
assert.equal(r.reason,'FAILED_SHORT_AMBIGUOUS_CYCLES_MUST_BE_RETAINED');

r=reviewBetfairApMcCoyRaceAssumptions({assumptionArtifact:{...base,assumptionsSelectedUsingSurvivalOutcomes:true},reviewCommit:fakeSha});
assert.equal(r.valid,false);
assert.equal(r.reason,'ASSUMPTION_SELECTION_MUST_BE_INDEPENDENT_OF_SURVIVAL_OUTCOMES');

r=reviewBetfairApMcCoyRaceAssumptions({assumptionArtifact:{...base,cycleIds:['ght-1','ght-1']},reviewCommit:fakeSha});
assert.equal(r.valid,false);
assert.equal(r.reason,'NONEMPTY_UNIQUE_CYCLE_IDS_REQUIRED');

console.log('betfair-apmccoy-race-assumption-review-v1.test.mjs: PASS');

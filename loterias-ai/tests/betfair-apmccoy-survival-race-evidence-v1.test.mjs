import assert from 'node:assert/strict';
import {deriveBetfairApMcCoyRaceEvidenceFromReviewedSurvival} from '../casino/jackpots/betfair-apmccoy-survival-race-evidence-v1.mjs';

let r=deriveBetfairApMcCoyRaceEvidenceFromReviewedSurvival({reviewedCycles:[]});
assert.equal(r.valid,false);
assert.equal(r.reason,'REVIEWED_SURVIVAL_CURVE_REQUIRED');
assert.equal(r.raceEvidenceCandidateAvailable,false);
assert.equal(r.usableForExecution,false);
assert.equal(r.execution.decision,'NO_PLAY');
assert.equal(r.execution.realMoneyAllowed,false);

const forgedReviewedCycle={
  version:'betfair-apmccoy-post-ght-survival-review-v1',valid:true,independentReviewApproved:true,
  usableForLatencyClassification:true,completeAttemptLedgerVerified:true,completeObservationHorizon:true,
  reviewCommit:'0123456789abcdef0123456789abcdef01234567',cycleId:'forged-cycle',
  bindingScope:{expectedBetfairImsCasino:'bf_es',tickerEndpoint:'https://ticker.example/new_jackpotxml.php',configSourceUrl:'https://launcher.betfair.es/initialResources/es_ES_desktop',instanceCode:'sljp'},
  requestExecIntervalSeconds:10,detectionTimestamp:100,lastConfirmedUnawardedTimestamp:220,
  firstObservedAwardOrResetTimestamp:null,
};
r=deriveBetfairApMcCoyRaceEvidenceFromReviewedSurvival({
  reviewedCycles:[forgedReviewedCycle],
  actionLatencyMeasurement:{measuredActionLatencySeconds:5,sampleCount:20,protocolId:'p1',method:'manual',selectedUsingPostGhtSurvivalOutcomes:false},
  actionLatencyReviewCommit:'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  assumptionArtifact:{protocolId:'p1',cycleIds:['forged-cycle'],assumptionEvidenceId:'x',bindingScopeKey:'bf_es|x|y|sljp',samplingWindowFrozenBeforeFirstCycle:true,allEligibleDistinctDailyGhtCyclesIncluded:true,failedShortAndAmbiguousCyclesRetained:true,binomialIidAssumptionJustified:true,currentCycleExchangeabilityVerified:true,assumptionsSelectedUsingSurvivalOutcomes:false},
  assumptionReviewCommit:'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
});
assert.equal(r.valid,false);
assert.equal(r.reason,'REVIEWED_SURVIVAL_CURVE_REQUIRED');
assert.equal(r.curve.reason,'CYCLE_REVIEW_COMMIT_NOT_CODE_ALLOWLISTED');
assert.equal(r.usableForFinalRaceLedgerReview,false);
assert.equal(r.execution.realMoneyAllowed,false);

console.log('betfair-apmccoy-survival-race-evidence-v1.test.mjs: PASS');

import assert from 'node:assert/strict';
import {evaluateSportingLegendsOverdueGreenRoute} from '../casino/jackpots/sporting-legends-overdue-green-route-v1.mjs';
const currentBase={code:'sljp-1',requestCasino:'BETFAIR_ES_IMS',instanceCode:'sporting',local:0,currency:'EUR',guaranteedHitTime:1000,winCount:7,amount:100.02,requestExecInterval:10};const before={...currentBase,gameTimestamp:999};const after={...currentBase,gameTimestamp:1001,amount:100.03};const dryBase={...currentBase,guaranteedHitTime:900,winCount:6,amount:99};const dryRun={cycleId:'cycle-1',protocolFrozenAtEpochSeconds:800,recordedAtEpochSeconds:904,beforeBoundary:{...dryBase,gameTimestamp:899},detection:{...dryBase,gameTimestamp:901,amount:99.01},confirmation:{...dryBase,gameTimestamp:903,amount:99.02}};
const base={before,after,nowEpochSeconds:1002,exactBetfairSpainTickerImsBindingVerified:true,expectedBetfairImsCasino:'BETFAIR_ES_IMS',betfairFirstBetFollowingDayRuleVerified:true,providerGuaranteedHitTimeDefinesFollowingDayBoundaryVerified:true,conservativeBaseRtpPct:93.03,stakeEUR:0.25,currentDailyAmountExactVerified:true,stakeAtDecisionExactVerified:true,measuredActionLatencySeconds:0.4,measuredActionLatencyVerified:true,frozenActionLatencyCeilingSeconds:2,frozenProtocolId:'p1',dryRunCycles:[dryRun]};
let r=evaluateSportingLegendsOverdueGreenRoute(base);assert.equal(r.decision,'NO_PLAY');assert.equal(r.reason,'EMPIRICAL_RACE_BOUND_NOT_EXECUTABLE');assert.equal(r.empiricalRaceBound.reason,'BINOMIAL_EXECUTION_ASSUMPTIONS_NOT_VERIFIED');

const closed={...base,binomialIidAssumptionJustified:true,completeProspectiveCycleLedgerVerified:true,currentCycleExchangeabilityVerified:true,assumptionEvidenceId:'race-model-assumptions-v1'};
r=evaluateSportingLegendsOverdueGreenRoute(closed);
assert.equal(r.version,'sporting-legends-overdue-green-route-v1.3-reviewed-ledger-gate');
assert.equal(r.decision,'NO_PLAY');
assert.equal(r.realMoneyAllowed,false);
assert.equal(r.reason,'PROSPECTIVE_RACE_LEDGER_INDEPENDENT_REVIEW_REQUIRED');
assert.equal(r.empiricalRaceBound.executionAssumptionsClosed,true);
assert.equal(r.validatedDryRunCycles[0].outcome,'SUCCESS');
assert.equal(r.raceExecutionAssumptionsVerified,true);
assert.equal(r.raceConfidenceVerified,true);
assert.equal(r.preReviewStructuredRaceEvidenceValid,true);
assert.equal(r.preReviewRaceWindowBudgetVerified,true);
assert.equal(r.raceLedgerIndependentlyReviewed,false);
assert.equal(r.raceWindowBudgetVerified,false);
assert.equal(r.executionGates.prospectiveRaceLedgerIndependentReviewVerified,false);
assert.equal(r.dryRunSummary.independentRaceLedgerReviewSupplied,false);
assert.equal(r.dryRunSummary.independentRaceLedgerReviewVerified,false);
assert.equal(r.guards.callerSuppliedDryRunObjectsCannotBypassIndependentReview,true);

// A caller can supply review-shaped metadata, but cannot add its own commit SHA to the
// code-owned allowlist. Synthetic prospective cycles therefore remain NO_PLAY.
const selfReview={type:'GITHUB_REVIEWED_PROSPECTIVE_RACE_LEDGER',reviewCommitSha:'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',protocolId:'p1',cycleIds:['cycle-1']};
r=evaluateSportingLegendsOverdueGreenRoute({...closed,independentRaceLedgerReview:selfReview});
assert.equal(r.dryRunSummary.independentRaceLedgerReviewSupplied,true);
assert.equal(r.raceLedgerIndependentReviewMetadataVerified,true);
assert.equal(r.raceLedgerReviewCommitApproved,false);
assert.equal(r.raceLedgerIndependentlyReviewed,false);
assert.equal(r.decision,'NO_PLAY');
assert.equal(r.reason,'PROSPECTIVE_RACE_LEDGER_INDEPENDENT_REVIEW_REQUIRED');
assert.equal(r.maxSpins,0);

// Adversarial regression: caller-supplied RTP must never manufacture a GREEN by
// lowering the break-even race threshold below the conservative published floor.
const floorScreen=evaluateSportingLegendsOverdueGreenRoute({...closed,stakeEUR:100,conservativeBaseRtpPct:93.03});
assert.equal(floorScreen.decision,'NO_PLAY');
assert.equal(floorScreen.conservativeBaseRtpPct,93.03);
assert.ok(floorScreen.breakEvenFirstBetProbability>floorScreen.firstBetProbabilityLowerBound);
const injected100=evaluateSportingLegendsOverdueGreenRoute({...closed,stakeEUR:100,conservativeBaseRtpPct:100});
assert.equal(injected100.version,'sporting-legends-overdue-green-route-v1.3-reviewed-ledger-gate');
assert.equal(injected100.decision,'NO_PLAY');
assert.equal(injected100.realMoneyAllowed,false);
assert.equal(injected100.requestedConservativeBaseRtpPct,100);
assert.equal(injected100.conservativeBaseRtpPct,93.03);
assert.equal(injected100.maxUnverifiedExecutionBaseRtpPct,93.03);
assert.equal(injected100.callerRtpCappedForExecution,true);
assert.equal(injected100.breakEvenFirstBetProbability,floorScreen.breakEvenFirstBetProbability);
assert.equal(injected100.guards.callerSuppliedHigherRtpCannotEaseGreenThreshold,true);
const injectedPublishedMax=evaluateSportingLegendsOverdueGreenRoute({...closed,stakeEUR:100,conservativeBaseRtpPct:97.17});
assert.equal(injectedPublishedMax.decision,'NO_PLAY');
assert.equal(injectedPublishedMax.requestedConservativeBaseRtpPct,97.17);
assert.equal(injectedPublishedMax.conservativeBaseRtpPct,93.03);
assert.equal(injectedPublishedMax.breakEvenFirstBetProbability,floorScreen.breakEvenFirstBetProbability);

r=evaluateSportingLegendsOverdueGreenRoute({...closed,dryRunCycles:[{...dryRun,confirmation:{...dryRun.confirmation,winCount:7,amount:30}}]});assert.equal(r.decision,'NO_PLAY');
r=evaluateSportingLegendsOverdueGreenRoute({...closed,measuredActionLatencySeconds:2.1});assert.equal(r.reason,'MEASURED_LATENCY_EXCEEDS_FROZEN_CEILING');
r=evaluateSportingLegendsOverdueGreenRoute({...closed,confidence:0.80});assert.equal(r.decision,'NO_PLAY');assert.equal(r.reason,'RACE_EVIDENCE_EXECUTION_CONTRACT_NOT_VERIFIED');assert.equal(r.raceConfidenceVerified,false);
r=evaluateSportingLegendsOverdueGreenRoute({...closed,exactBetfairSpainTickerImsBindingVerified:false});assert.equal(r.reason,'INVALID_DRY_RUN_CYCLE');
console.log('sporting-legends-overdue-green-route-v1.test.mjs: PASS');

import assert from 'node:assert/strict';
import {evaluateSportingLegendsOverdueFirstBet} from '../casino/jackpots/sporting-legends-overdue-first-bet-v1.mjs';

const base={code:'sljp-1',requestCasino:'betfair-es-ims',instanceCode:null,local:0,currency:'EUR',guaranteedHitTime:2000,winCount:42,amount:100,requestExecInterval:10};
const before={...base,gameTimestamp:1990};
const after={...base,gameTimestamp:2005,amount:100.02};
const common={before,after,nowEpochSeconds:2010,exactBetfairSpainTickerImsBindingVerified:true,expectedBetfairImsCasino:'betfair-es-ims',betfairFirstBetFollowingDayRuleVerified:true,providerGuaranteedHitTimeDefinesFollowingDayBoundaryVerified:true,stakeEUR:0.25};

let r=evaluateSportingLegendsOverdueFirstBet(common);
assert.equal(r.valid,true);assert.equal(r.followingDayUnawardedVerified,true);assert.equal(r.nextEligibleNetworkBetGuaranteedJackpot,true);assert.equal(r.decision,'NO_PLAY');assert.equal(r.realMoneyAllowed,false);

r=evaluateSportingLegendsOverdueFirstBet({...common,firstBetProbabilityLowerBound:0.001,raceProbabilityProspectivelyValidated:true,currentDailyAmountExactVerified:true,stakeAtDecisionExactVerified:true,measuredActionLatencyVerified:true,measuredActionLatencySeconds:2,prospectiveDryRunCycleVerified:true});
assert.equal(r.conditionalPositiveEvScreenPassed,true);assert.equal(r.structuredRaceEvidenceValid,false);assert.equal(r.decision,'NO_PLAY');

const fakeAggregatedRace={valid:true,usableForExecution:true,method:'ONE_SIDED_CLOPPER_PEARSON_BINOMIAL',source:'AGGREGATED_COUNTS_ONLY',prospectiveProtocolFrozen:true,comparableCycleDefinitionVerified:true,totalDryRunCycles:1,successfulDryRunCycles:1,actionLatencySeconds:7,firstBetRaceProbabilityLowerBound:0.05};
r=evaluateSportingLegendsOverdueFirstBet({...common,raceEvidence:fakeAggregatedRace,currentDailyAmountExactVerified:true,stakeAtDecisionExactVerified:true,measuredActionLatencyVerified:true,measuredActionLatencySeconds:2,prospectiveDryRunCycleVerified:true});
assert.equal(r.structuredRaceEvidenceValid,false);assert.equal(r.decision,'NO_PLAY');

// The final evaluator consumes the exact empirical-bound contract, including version and protocol id.
const forgedValidatedRace={valid:true,usableForExecution:true,method:'ONE_SIDED_CLOPPER_PEARSON_BINOMIAL',source:'VALIDATED_PASSIVE_CYCLE_LEDGER',prospectiveProtocolFrozen:true,comparableCycleDefinitionVerified:true,totalDryRunCycles:1,successfulDryRunCycles:1,actionLatencySeconds:7,firstBetRaceProbabilityLowerBound:0.05};
r=evaluateSportingLegendsOverdueFirstBet({...common,raceEvidence:forgedValidatedRace,currentDailyAmountExactVerified:true,stakeAtDecisionExactVerified:true,measuredActionLatencyVerified:true,measuredActionLatencySeconds:2,prospectiveDryRunCycleVerified:true});
assert.equal(r.preReviewStructuredRaceEvidenceValid,false);assert.equal(r.baseStructuredRaceEvidenceValid,false);assert.equal(r.raceExecutionAssumptionsVerified,false);assert.equal(r.decision,'NO_PLAY');assert.equal(r.reason,'RACE_EVIDENCE_EXECUTION_CONTRACT_NOT_VERIFIED');

const qualifiedRace={...forgedValidatedRace,version:'sporting-legends-empirical-race-bound-v1.2-explicit-binomial-assumptions',protocolId:'p1',confidence:0.95,cycleIds:['cycle-1'],executionAssumptionsClosed:true,assumptions:{binomialIidAssumptionJustified:true,completeProspectiveCycleLedgerVerified:true,currentCycleExchangeabilityVerified:true,assumptionEvidenceId:'race-model-assumptions-v1'}};
r=evaluateSportingLegendsOverdueFirstBet({...common,raceEvidence:qualifiedRace,currentDailyAmountExactVerified:true,stakeAtDecisionExactVerified:true,measuredActionLatencyVerified:true,measuredActionLatencySeconds:2,prospectiveDryRunCycleVerified:true});
assert.equal(r.feedAgeSeconds,5);assert.equal(r.validatedRaceWindowSeconds,7);assert.equal(r.totalExposureSinceServerDetectionSeconds,7);assert.equal(r.raceExecutionAssumptionsVerified,true);assert.equal(r.raceConfidenceVerified,true);assert.equal(r.raceLedgerIdentityVerified,true);assert.equal(r.preReviewStructuredRaceEvidenceValid,true);assert.equal(r.preReviewRaceWindowBudgetVerified,true);assert.equal(r.raceLedgerIndependentlyReviewed,false);assert.equal(r.baseStructuredRaceEvidenceValid,false);assert.equal(r.structuredRaceEvidenceValid,false);assert.equal(r.conditionalPositiveEvScreenPassed,true);assert.equal(r.decision,'NO_PLAY');assert.equal(r.realMoneyAllowed,false);assert.equal(r.maxSpins,0);assert.equal(r.reason,'PROSPECTIVE_RACE_LEDGER_INDEPENDENT_REVIEW_REQUIRED');assert.equal(r.executionGates.prospectiveRaceLedgerIndependentReviewVerified,false);assert.equal(r.approvedProspectiveRaceLedgerReviewCommitCount,0);

// Even a structurally perfect self-attested review cannot authorize money because the
// review commit must be present in the code-owned approved commit allowlist.
const selfAttestedRace={...qualifiedRace,independentReview:{type:'GITHUB_REVIEWED_PROSPECTIVE_RACE_LEDGER',reviewCommitSha:'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',protocolId:'p1',cycleIds:['cycle-1']}};
r=evaluateSportingLegendsOverdueFirstBet({...common,raceEvidence:selfAttestedRace,currentDailyAmountExactVerified:true,stakeAtDecisionExactVerified:true,measuredActionLatencyVerified:true,measuredActionLatencySeconds:2,prospectiveDryRunCycleVerified:true});
assert.equal(r.raceLedgerIndependentReviewMetadataVerified,true);assert.equal(r.raceLedgerReviewCommitApproved,false);assert.equal(r.raceLedgerIndependentlyReviewed,false);assert.equal(r.decision,'NO_PLAY');assert.equal(r.reason,'PROSPECTIVE_RACE_LEDGER_INDEPENDENT_REVIEW_REQUIRED');assert.equal(r.realMoneyAllowed,false);

r=evaluateSportingLegendsOverdueFirstBet({...common,raceEvidence:{...qualifiedRace,confidence:0.80},currentDailyAmountExactVerified:true,stakeAtDecisionExactVerified:true,measuredActionLatencyVerified:true,measuredActionLatencySeconds:2,prospectiveDryRunCycleVerified:true});
assert.equal(r.raceConfidenceVerified,false);assert.equal(r.preReviewStructuredRaceEvidenceValid,false);assert.equal(r.structuredRaceEvidenceValid,false);assert.equal(r.decision,'NO_PLAY');assert.equal(r.reason,'RACE_EVIDENCE_EXECUTION_CONTRACT_NOT_VERIFIED');

r=evaluateSportingLegendsOverdueFirstBet({...common,raceEvidence:{...qualifiedRace,actionLatencySeconds:6},currentDailyAmountExactVerified:true,stakeAtDecisionExactVerified:true,measuredActionLatencyVerified:true,measuredActionLatencySeconds:2,prospectiveDryRunCycleVerified:true});
assert.equal(r.preReviewStructuredRaceEvidenceValid,true);assert.equal(r.totalExposureSinceServerDetectionSeconds,7);assert.equal(r.validatedRaceWindowSeconds,6);assert.equal(r.preReviewRaceWindowBudgetVerified,false);assert.equal(r.raceWindowBudgetVerified,false);assert.equal(r.reason,'VALIDATED_RACE_WINDOW_EXHAUSTED');assert.equal(r.decision,'NO_PLAY');

// Caller-supplied high RTP cannot reduce the execution hurdle below 93.03%.
const floor=evaluateSportingLegendsOverdueFirstBet({...common,stakeEUR:100,conservativeBaseRtpPct:93.03,raceEvidence:qualifiedRace,currentDailyAmountExactVerified:true,stakeAtDecisionExactVerified:true,measuredActionLatencyVerified:true,measuredActionLatencySeconds:2,prospectiveDryRunCycleVerified:true});
const injected=evaluateSportingLegendsOverdueFirstBet({...common,stakeEUR:100,conservativeBaseRtpPct:100,raceEvidence:qualifiedRace,currentDailyAmountExactVerified:true,stakeAtDecisionExactVerified:true,measuredActionLatencyVerified:true,measuredActionLatencySeconds:2,prospectiveDryRunCycleVerified:true});
assert.equal(injected.requestedConservativeBaseRtpPct,100);assert.equal(injected.conservativeBaseRtpPct,93.03);assert.equal(injected.callerRtpCappedForExecution,true);assert.equal(injected.breakEvenFirstBetProbability,floor.breakEvenFirstBetProbability);assert.equal(injected.decision,'NO_PLAY');

let bad=evaluateSportingLegendsOverdueFirstBet({...common,expectedBetfairImsCasino:null});assert.equal(bad.valid,false);assert.equal(bad.reason,'EXPECTED_BETFAIR_IMS_NOT_SUPPLIED');
bad=evaluateSportingLegendsOverdueFirstBet({...common,before:{...before,gameTimestamp:1900}});assert.equal(bad.reason,'BEFORE_SNAPSHOT_TOO_FAR_FROM_BOUNDARY');
bad=evaluateSportingLegendsOverdueFirstBet({...common,after:{...after,gameTimestamp:2050}});assert.equal(bad.reason,'AFTER_SNAPSHOT_TOO_FAR_FROM_BOUNDARY');
bad=evaluateSportingLegendsOverdueFirstBet({...common,after:{...after,requestExecInterval:20}});assert.equal(bad.reason,'EXEC_INTERVAL_CHANGED');
bad=evaluateSportingLegendsOverdueFirstBet({...common,before:{...before,requestExecInterval:null}});assert.equal(bad.reason,'INCOMPLETE_PROTOCOL_FIELDS');
bad=evaluateSportingLegendsOverdueFirstBet({...common,nowEpochSeconds:2030});assert.equal(bad.reason,'FEED_TOO_STALE');
console.log('sporting-legends-overdue-first-bet-v1.test.mjs: PASS');

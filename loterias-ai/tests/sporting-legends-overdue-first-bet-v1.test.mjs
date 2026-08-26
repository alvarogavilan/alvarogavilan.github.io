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

// A caller cannot forge the old executable shape anymore: explicit statistical assumptions,
// confidence and a complete unique prospective cycle ledger are consumed by the final evaluator.
const forgedValidatedRace={valid:true,usableForExecution:true,method:'ONE_SIDED_CLOPPER_PEARSON_BINOMIAL',source:'VALIDATED_PASSIVE_CYCLE_LEDGER',prospectiveProtocolFrozen:true,comparableCycleDefinitionVerified:true,totalDryRunCycles:1,successfulDryRunCycles:1,actionLatencySeconds:7,firstBetRaceProbabilityLowerBound:0.05};
r=evaluateSportingLegendsOverdueFirstBet({...common,raceEvidence:forgedValidatedRace,currentDailyAmountExactVerified:true,stakeAtDecisionExactVerified:true,measuredActionLatencyVerified:true,measuredActionLatencySeconds:2,prospectiveDryRunCycleVerified:true});
assert.equal(r.baseStructuredRaceEvidenceValid,false);assert.equal(r.raceExecutionAssumptionsVerified,false);assert.equal(r.decision,'NO_PLAY');assert.equal(r.reason,'RACE_EVIDENCE_EXECUTION_CONTRACT_NOT_VERIFIED');

const qualifiedRace={...forgedValidatedRace,confidence:0.95,cycleIds:['cycle-1'],executionAssumptionsClosed:true,assumptions:{binomialIidAssumptionJustified:true,completeProspectiveCycleLedgerVerified:true,currentCycleExchangeabilityVerified:true,assumptionEvidenceId:'race-model-assumptions-v1'}};
r=evaluateSportingLegendsOverdueFirstBet({...common,raceEvidence:qualifiedRace,currentDailyAmountExactVerified:true,stakeAtDecisionExactVerified:true,measuredActionLatencyVerified:true,measuredActionLatencySeconds:2,prospectiveDryRunCycleVerified:true});
assert.equal(r.feedAgeSeconds,5);assert.equal(r.validatedRaceWindowSeconds,7);assert.equal(r.totalExposureSinceServerDetectionSeconds,7);assert.equal(r.raceExecutionAssumptionsVerified,true);assert.equal(r.raceConfidenceVerified,true);assert.equal(r.raceLedgerIdentityVerified,true);assert.equal(r.raceWindowBudgetVerified,true);assert.equal(r.structuredRaceEvidenceValid,true);assert.equal(r.decision,'GREEN');assert.equal(r.realMoneyAllowed,true);assert.equal(r.maxSpins,1);

r=evaluateSportingLegendsOverdueFirstBet({...common,raceEvidence:{...qualifiedRace,confidence:0.80},currentDailyAmountExactVerified:true,stakeAtDecisionExactVerified:true,measuredActionLatencyVerified:true,measuredActionLatencySeconds:2,prospectiveDryRunCycleVerified:true});
assert.equal(r.raceConfidenceVerified,false);assert.equal(r.structuredRaceEvidenceValid,false);assert.equal(r.decision,'NO_PLAY');assert.equal(r.reason,'RACE_EVIDENCE_EXECUTION_CONTRACT_NOT_VERIFIED');

r=evaluateSportingLegendsOverdueFirstBet({...common,raceEvidence:{...qualifiedRace,actionLatencySeconds:6},currentDailyAmountExactVerified:true,stakeAtDecisionExactVerified:true,measuredActionLatencyVerified:true,measuredActionLatencySeconds:2,prospectiveDryRunCycleVerified:true});
assert.equal(r.baseStructuredRaceEvidenceValid,true);assert.equal(r.totalExposureSinceServerDetectionSeconds,7);assert.equal(r.validatedRaceWindowSeconds,6);assert.equal(r.raceWindowBudgetVerified,false);assert.equal(r.structuredRaceEvidenceValid,false);assert.equal(r.reason,'VALIDATED_RACE_WINDOW_EXHAUSTED');assert.equal(r.decision,'NO_PLAY');

let bad=evaluateSportingLegendsOverdueFirstBet({...common,expectedBetfairImsCasino:null});assert.equal(bad.valid,false);assert.equal(bad.reason,'EXPECTED_BETFAIR_IMS_NOT_SUPPLIED');
bad=evaluateSportingLegendsOverdueFirstBet({...common,before:{...before,gameTimestamp:1900}});assert.equal(bad.reason,'BEFORE_SNAPSHOT_TOO_FAR_FROM_BOUNDARY');
bad=evaluateSportingLegendsOverdueFirstBet({...common,after:{...after,gameTimestamp:2050}});assert.equal(bad.reason,'AFTER_SNAPSHOT_TOO_FAR_FROM_BOUNDARY');
bad=evaluateSportingLegendsOverdueFirstBet({...common,after:{...after,requestExecInterval:20}});assert.equal(bad.reason,'EXEC_INTERVAL_CHANGED');
bad=evaluateSportingLegendsOverdueFirstBet({...common,before:{...before,requestExecInterval:null}});assert.equal(bad.reason,'INCOMPLETE_PROTOCOL_FIELDS');
bad=evaluateSportingLegendsOverdueFirstBet({...common,nowEpochSeconds:2030});assert.equal(bad.reason,'FEED_TOO_STALE');
console.log('sporting-legends-overdue-first-bet-v1.test.mjs: PASS');

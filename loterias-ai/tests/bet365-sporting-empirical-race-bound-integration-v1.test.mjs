import assert from 'node:assert/strict';
import {deriveProspectiveEmpiricalRaceLowerBoundFromValidatedCycles} from '../casino/jackpots/sporting-legends-empirical-race-bound-v1.mjs';
import {deriveBet365SportingEmpiricalRaceLowerBound} from '../casino/jackpots/bet365-sporting-empirical-race-bound-v1.mjs';

const bet365Cycle=(id,outcome='SUCCESS')=>({
  version:'bet365-sporting-passive-race-cycle-v1',validatorVersion:'bet365-sporting-passive-race-cycle-v1',
  valid:true,usableForRaceEvidence:true,cycleId:id,protocolId:'bet365-frank-p1',
  prospectivelyObserved:true,comparableCycleDefinitionVerified:true,passiveDryRun:true,
  operator:'bet365 Spain',market:'ES',jackpotsCasino:'bet365_es',tickerEndpoint:'https://ticker.example/webtickers',
  servedTenCentJackpotEligibilityVerified:true,bet365FirstBetFollowingDayRuleVerified:true,
  actionLatencySeconds:2,outcome,
});

let r=deriveBet365SportingEmpiricalRaceLowerBound({cycles:[bet365Cycle('b1')],protocolId:'bet365-frank-p1',actionLatencySeconds:2,prospectiveProtocolFrozen:true});
assert.equal(r.valid,true);
assert.equal(r.usableForExecution,false);
assert.equal(r.reason,'BET365_BINOMIAL_EXECUTION_ASSUMPTIONS_NOT_VERIFIED');
assert.ok(Math.abs(r.firstBetRaceProbabilityLowerBound-0.05)<1e-10);

r=deriveBet365SportingEmpiricalRaceLowerBound({cycles:[{...bet365Cycle('b1'),servedTenCentJackpotEligibilityVerified:false}],protocolId:'bet365-frank-p1',actionLatencySeconds:2,prospectiveProtocolFrozen:true});
assert.equal(r.valid,false);
assert.equal(r.reason,'BET365_EXECUTION_SCOPE_NOT_CLOSED');

r=deriveProspectiveEmpiricalRaceLowerBoundFromValidatedCycles({cycles:[bet365Cycle('b1')],protocolId:'bet365-frank-p1',actionLatencySeconds:2,prospectiveProtocolFrozen:true});
assert.equal(r.valid,false);
assert.equal(r.reason,'INVALID_CYCLE_EVIDENCE');

const generic={valid:true,usableForRaceEvidence:true,validatorVersion:'sporting-legends-passive-race-cycle-v1',passiveDryRun:true,prospectivelyObserved:true,comparableCycleDefinitionVerified:true,cycleId:'g1',protocolId:'generic-p1',actionLatencySeconds:2,outcome:'SUCCESS'};
r=deriveBet365SportingEmpiricalRaceLowerBound({cycles:[generic],protocolId:'generic-p1',actionLatencySeconds:2,prospectiveProtocolFrozen:true});
assert.equal(r.valid,false);
assert.equal(r.reason,'INVALID_BET365_CYCLE_EVIDENCE');

r=deriveBet365SportingEmpiricalRaceLowerBound({cycles:[bet365Cycle('b1'),bet365Cycle('b2','FAILURE')],protocolId:'bet365-frank-p1',actionLatencySeconds:2,prospectiveProtocolFrozen:true,binomialIidAssumptionJustified:true,completeProspectiveCycleLedgerVerified:true,currentCycleExchangeabilityVerified:true,assumptionEvidenceId:'bet365-frank-race-assumptions-v1'});
assert.equal(r.valid,true);
assert.equal(r.usableForExecution,true);
assert.equal(r.executionAssumptionsClosed,true);
assert.equal(r.successfulDryRunCycles,1);
assert.equal(r.totalDryRunCycles,2);

console.log('bet365-sporting-empirical-race-bound-integration-v1.test.mjs: PASS');

import assert from 'node:assert/strict';
import {deriveBet365SportingEmpiricalRaceLowerBound as derive} from '../casino/jackpots/bet365-sporting-empirical-race-bound-v1.mjs';

const cycle=(id,outcome='SUCCESS',overrides={})=>({
  version:'bet365-sporting-passive-race-cycle-v1',validatorVersion:'bet365-sporting-passive-race-cycle-v1',valid:true,usableForRaceEvidence:true,
  cycleId:id,protocolId:'frank-race-v1',prospectivelyObserved:true,comparableCycleDefinitionVerified:true,passiveDryRun:true,
  operator:'bet365 Spain',market:'ES',jackpotsCasino:'bet365_es',tickerEndpoint:'https://ticker.example/webtickers',servedTenCentJackpotEligibilityVerified:true,bet365FirstBetFollowingDayRuleVerified:true,
  actionLatencySeconds:5,outcome,...overrides,
});

let r=derive({cycles:[cycle('c1'),cycle('c2'),cycle('c3','FAILURE')],protocolId:'frank-race-v1',actionLatencySeconds:5,prospectiveProtocolFrozen:true});
assert.equal(r.valid,true);assert.equal(r.usableForExecution,false);assert.equal(r.successfulDryRunCycles,2);assert.equal(r.totalDryRunCycles,3);assert.equal(r.firstBetRaceProbabilityLowerBound>0,true);assert.equal(r.reason,'BET365_BINOMIAL_EXECUTION_ASSUMPTIONS_NOT_VERIFIED');assert.equal(r.execution.decision,'NO_PLAY');

r=derive({cycles:[cycle('c1'),cycle('c2')],protocolId:'frank-race-v1',actionLatencySeconds:5,prospectiveProtocolFrozen:true,binomialIidAssumptionJustified:true,completeProspectiveCycleLedgerVerified:true,currentCycleExchangeabilityVerified:true,assumptionEvidenceId:'review-001'});
assert.equal(r.valid,true);assert.equal(r.usableForExecution,true);assert.equal(r.executionAssumptionsClosed,true);assert.equal(r.reason,'VALIDATED_BET365_PASSIVE_CYCLE_CLOPPER_PEARSON_BOUND_AVAILABLE');assert.equal(r.execution.realMoneyAllowed,false);

r=derive({cycles:[cycle('c1'),cycle('c1')],protocolId:'frank-race-v1',actionLatencySeconds:5,prospectiveProtocolFrozen:true});
assert.equal(r.valid,false);assert.equal(r.reason,'MISSING_OR_DUPLICATE_CYCLE_ID');
r=derive({cycles:[cycle('c1'),cycle('c2','SUCCESS',{tickerEndpoint:'https://other.example/webtickers'})],protocolId:'frank-race-v1',actionLatencySeconds:5,prospectiveProtocolFrozen:true});
assert.equal(r.valid,false);assert.equal(r.reason,'BINDING_SCOPE_CHANGED_ACROSS_LEDGER');
r=derive({cycles:[cycle('c1','SUCCESS',{bet365FirstBetFollowingDayRuleVerified:false})],protocolId:'frank-race-v1',actionLatencySeconds:5,prospectiveProtocolFrozen:true});
assert.equal(r.valid,false);assert.equal(r.reason,'BET365_EXECUTION_SCOPE_NOT_CLOSED');
r=derive({cycles:[cycle('c1','SUCCESS',{validatorVersion:'sporting-legends-passive-race-cycle-v1'})],protocolId:'frank-race-v1',actionLatencySeconds:5,prospectiveProtocolFrozen:true});
assert.equal(r.valid,false);assert.equal(r.reason,'INVALID_BET365_CYCLE_EVIDENCE');
r=derive({cycles:[cycle('c1')],protocolId:'frank-race-v1',actionLatencySeconds:5,prospectiveProtocolFrozen:false});
assert.equal(r.valid,false);assert.equal(r.reason,'PROSPECTIVE_PROTOCOL_NOT_FROZEN');

console.log('bet365-sporting-empirical-race-bound-v1.test.mjs: PASS');

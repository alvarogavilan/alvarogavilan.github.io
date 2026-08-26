import assert from 'node:assert/strict';
import {deriveProspectiveEmpiricalRaceLowerBound} from '../casino/jackpots/sporting-legends-empirical-race-bound-v1.mjs';

let r=deriveProspectiveEmpiricalRaceLowerBound({
  successfulDryRunCycles:1,totalDryRunCycles:1,confidence:0.95,
  prospectiveProtocolFrozen:true,comparableCycleDefinitionVerified:true,
});
assert.equal(r.valid,true);
assert.equal(r.usableForExecution,true);
assert.equal(r.method,'ONE_SIDED_CLOPPER_PEARSON_BINOMIAL');
assert.ok(Math.abs(r.firstBetRaceProbabilityLowerBound-0.05)<1e-10);
assert.equal(r.guards.noPoissonStationarityAssumption,true);
assert.equal(r.guards.passiveDryRunsOnly,true);

r=deriveProspectiveEmpiricalRaceLowerBound({
  successfulDryRunCycles:2,totalDryRunCycles:2,confidence:0.95,
  prospectiveProtocolFrozen:true,comparableCycleDefinitionVerified:true,
});
assert.ok(Math.abs(r.firstBetRaceProbabilityLowerBound-Math.sqrt(0.05))<1e-10);

r=deriveProspectiveEmpiricalRaceLowerBound({
  successfulDryRunCycles:0,totalDryRunCycles:5,confidence:0.95,
  prospectiveProtocolFrozen:true,comparableCycleDefinitionVerified:true,
});
assert.equal(r.firstBetRaceProbabilityLowerBound,0);

r=deriveProspectiveEmpiricalRaceLowerBound({
  successfulDryRunCycles:1,totalDryRunCycles:1,
  prospectiveProtocolFrozen:false,comparableCycleDefinitionVerified:true,
});
assert.equal(r.valid,false);
assert.equal(r.reason,'PROSPECTIVE_PROTOCOL_NOT_FROZEN');
assert.equal(r.usableForExecution,false);

console.log('sporting-legends-empirical-race-bound-v1.test.mjs: PASS');

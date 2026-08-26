import assert from 'node:assert/strict';
import {deriveZeroArrivalPoissonRaceLowerBound,requiredZeroArrivalWindowForRaceGate} from '../casino/jackpots/sporting-legends-race-bound-v1.mjs';

const r=deriveZeroArrivalPoissonRaceLowerBound({zeroArrivalWindowSeconds:5,actionLatencySeconds:5,confidence:0.95});
assert.equal(r.valid,true);
assert.equal(r.usableForExecution,false);
assert.ok(Math.abs(r.firstBetRaceProbabilityLowerBound-0.05)<1e-12);
assert.equal(r.guards.realMoneyAllowed,false);
assert.equal(r.guards.poissonModelRequiresProspectiveValidation,true);

const validated=deriveZeroArrivalPoissonRaceLowerBound({zeroArrivalWindowSeconds:5,actionLatencySeconds:5,confidence:0.95,poissonArrivalModelProspectivelyValidated:true});
assert.equal(validated.valid,true);
assert.equal(validated.usableForExecution,true);
assert.equal(validated.reason,'PROSPECTIVE_MODEL_BOUND_AVAILABLE');

const breakEven=((1-0.9303)*0.25)/100.02;
const t=requiredZeroArrivalWindowForRaceGate({breakEvenFirstBetProbability:breakEven,actionLatencySeconds:5,confidence:0.95});
assert.equal(t.valid,true);
assert.ok(t.requiredZeroArrivalWindowSeconds>1.7&&t.requiredZeroArrivalWindowSeconds<1.8);
assert.equal(t.guards.realMoneyAllowed,false);

assert.equal(deriveZeroArrivalPoissonRaceLowerBound({zeroArrivalWindowSeconds:0,actionLatencySeconds:5}).valid,false);
assert.equal(requiredZeroArrivalWindowForRaceGate({breakEvenFirstBetProbability:1,actionLatencySeconds:5}).valid,false);

console.log('sporting-legends-race-bound-v1.test.mjs: PASS');

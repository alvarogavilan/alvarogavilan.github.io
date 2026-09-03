import assert from 'node:assert/strict';
import {breakEvenHazardPerWagerEUR,proportionalHazardIdentifiabilityWitness,executionIdentifiabilityGate} from '../digital-twins/core/jackpot-king-hazard-identifiability.mjs';

// Synthetic proof fixture only; award and candidate Total Bet are not live/operator inputs.
const base=0.9332,award=1000,maxCandidateTotalBetEUR=1;
const q=breakEvenHazardPerWagerEUR({baseRtpRatio:base,jackpotAwardEUR:award});
assert.ok(Math.abs(q-0.0000668)<1e-15);
const witness=proportionalHazardIdentifiabilityWitness({baseRtpRatio:base,jackpotAwardEUR:award,maxCandidateTotalBetEUR});
assert.equal(witness.feasible,true);
assert.equal(witness.exactRelations.lowReturnBelowOne,true);
assert.equal(witness.exactRelations.highReturnAboveOne,true);
assert.ok(Math.abs(witness.lowWitness.returnRatio-0.9666)<1e-12);
assert.ok(Math.abs(witness.highWitness.returnRatio-1.0668)<1e-12);
assert.equal(witness.conclusion,'ABSOLUTE_HAZARD_COEFFICIENT_NOT_IDENTIFIED_BY_QUALITATIVE_PUBLIC_RULES');
assert.equal(executionIdentifiabilityGate({}).decision,'NO_PLAY');
assert.equal(executionIdentifiabilityGate({absoluteHazardPerWagerEURLowerBound:1e-9}).decision,'HAZARD_BOUND_AVAILABLE_CONTINUE_OTHER_GATES');
console.log('jackpot-king-hazard-identifiability.test.mjs: PASS');

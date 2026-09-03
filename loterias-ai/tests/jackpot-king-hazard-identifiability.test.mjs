import assert from 'node:assert/strict';
import {breakEvenHazardPerWagerEUR,proportionalHazardIdentifiabilityWitness,mhbMonotonePreCapNonIdentificationWitness,executionIdentifiabilityGate} from '../digital-twins/core/jackpot-king-hazard-identifiability.mjs';

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

const mhb=mhbMonotonePreCapNonIdentificationWitness({currentAmountEUR:190,boundaryEUR:200,epsilonHazardPerWagerEUR:1e-12,maxCandidateTotalBetEUR:20});
assert.equal(mhb.satisfiesQualitativeIncreasingRule,true);
assert.equal(mhb.compatibleWithMustBeWonByBoundary,true);
assert.ok(Math.abs(mhb.fractionOfBoundary-0.95)<1e-15);
assert.equal(mhb.conclusion,'NO_POSITIVE_PRE_CAP_HAZARD_LOWER_BOUND_FROM_MHB_PLUS_MONOTONICITY_ALONE');

assert.equal(executionIdentifiabilityGate({}).decision,'NO_PLAY');
assert.equal(executionIdentifiabilityGate({absoluteHazardPerWagerEURLowerBound:1e-9}).decision,'HAZARD_BOUND_AVAILABLE_CONTINUE_OTHER_GATES');
console.log('jackpot-king-hazard-identifiability.test.mjs: PASS');

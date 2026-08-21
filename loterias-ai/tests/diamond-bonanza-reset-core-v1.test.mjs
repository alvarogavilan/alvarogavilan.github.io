#!/usr/bin/env node
import assert from 'node:assert/strict';
import { classifyDiamondTransition } from '../casino/jackpots/diamond-bonanza-reset-core-v1.mjs';

assert.equal(classifyDiamondTransition({priorAmountEUR:null,currentAmountEUR:8032.9}).classification,'BASELINE');
assert.equal(classifyDiamondTransition({priorAmountEUR:8032.9,currentAmountEUR:8032.9}).classification,'UNCHANGED');
const grow=classifyDiamondTransition({priorAmountEUR:8032.9,currentAmountEUR:8033.1});
assert.equal(grow.classification,'POSITIVE_GROWTH');
assert.equal(grow.positiveGrowthObserved,true);
const unverifiedDrop=classifyDiamondTransition({priorAmountEUR:8033.1,currentAmountEUR:500,priorPositiveGrowthObserved:false});
assert.equal(unverifiedDrop.classification,'RESET_SCALE_DROP_WITHOUT_PRIOR_POSITIVE_GROWTH');
assert.equal(unverifiedDrop.usableForSeedInference,false);
assert.equal(unverifiedDrop.postDropAmountUpperBoundForSeedEUR,null);
const candidate=classifyDiamondTransition({priorAmountEUR:8033.1,currentAmountEUR:505.25,priorPositiveGrowthObserved:true});
assert.equal(candidate.classification,'RESET_SCALE_DROP_CANDIDATE');
assert.equal(candidate.usableForSeedInference,true);
assert.equal(candidate.postDropAmountUpperBoundForSeedEUR,505.25);
assert.equal(candidate.seedPointEstimateEUR,null);
assert.equal(candidate.jackpotWinVerified,false);
const small=classifyDiamondTransition({priorAmountEUR:8033.1,currentAmountEUR:7900,priorPositiveGrowthObserved:true});
assert.equal(small.classification,'SMALL_DROP_CANDIDATE');
assert.equal(small.usableForSeedInference,false);
console.log('diamond-bonanza-reset-core-v1.test.mjs: ok');

import assert from 'node:assert/strict';
import {predictPhysicsSector,walkForwardPhysicsValidation} from '../edge-backend/src/roulette-current-spin-physics-learner-v1.mjs';
const same=Array.from({length:300},()=>({ballPeriodMs:520,rotorPeriodMs:3100,ballPeriodDeltaMs:18,rotorPhase01:.25,directionRelation:-1,observationToCloseMs:1800,outcomeNumber:17}));
let r=predictPhysicsSector(same.slice(0,100),same[100],{minTrainingSpins:50,neighbors:15,sectorRadius:2});
assert.equal(r.ok,true);assert.equal(r.predictedCenterNumber,17);assert.ok(r.predictedNumbers.includes(17));assert.equal(r.execution.realMoneyAllowed,false);
r=walkForwardPhysicsValidation(same,{minTrainingSpins:100,neighbors:15,sectorRadius:2,straightProfitOdds:35});
assert.equal(r.ok,true);assert.equal(r.predictions,200);assert.equal(r.hits,200);assert.equal(r.practiceVerdict,'WALK_FORWARD_PHYSICS_RESEARCH_CANDIDATE');assert.equal(r.execution.decision,'NO_PLAY');
r=predictPhysicsSector([],same[0],{minTrainingSpins:50});assert.equal(r.reason,'INSUFFICIENT_TRAINING_SPINS');
console.log('roulette-current-spin-physics-learner-v1.test.mjs: PASS');

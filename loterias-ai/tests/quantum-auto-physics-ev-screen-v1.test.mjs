import assert from 'node:assert/strict';
import {evaluateQuantumAutoPhysicsEv,breakEvenTable} from '../edge-backend/src/quantum-auto-physics-ev-screen-v1.mjs';
const t=breakEvenTable(5);assert.equal(t[4].breakEvenHitRateIgnoringMultipliers,Number((5/30).toFixed(8)));assert.equal(t[4].fairHitRate,Number((5/37).toFixed(8)));
let r=evaluateQuantumAutoPhysicsEv({predictedPocketCount:5,holdoutHits:250,holdoutRounds:1000,unitStakeEUR:.2,exactTimingWindowVerified:true,exactPayoutRuleVerified:true,predictionsFrozenBeforeOutcome:true,exactStableTableIdentity:true});assert.equal(r.ok,true);assert.equal(r.practiceVerdict,'CONSERVATIVE_POSITIVE_PHYSICS_OVERLAY_CANDIDATE');assert.ok(r.metrics.conservativeExpectedNetEURPerRound>0);assert.equal(r.execution.realMoneyAllowed,false);
r=evaluateQuantumAutoPhysicsEv({predictedPocketCount:5,holdoutHits:170,holdoutRounds:1000,unitStakeEUR:.2,exactTimingWindowVerified:true,exactPayoutRuleVerified:true,predictionsFrozenBeforeOutcome:true,exactStableTableIdentity:true});assert.equal(r.practiceVerdict,'NO_CONSERVATIVE_POSITIVE_EDGE');
r=evaluateQuantumAutoPhysicsEv({predictedPocketCount:5,holdoutHits:250,holdoutRounds:1000,unitStakeEUR:.2});assert.equal(r.practiceVerdict,'BLOCKED_UNVERIFIED_LIVE_INPUTS');
console.log('quantum-auto-physics-ev-screen-v1.test.mjs: PASS');

import assert from 'node:assert/strict';
import { laneExecutionReadyWithLifecycle, sanitizeLegacySingleLane } from '../edge-live/edge-live-multi-execution-plan-v1.mjs';

// A killed lane must never become executionReady, no matter how favorable
// the economic/identity/stake gates look.
assert.equal(laneExecutionReadyWithLifecycle('KILLED_NOT_CURRENTLY_ACTIONABLE', true, true, true), false);
assert.equal(laneExecutionReadyWithLifecycle('KILLED_NOT_CURRENTLY_ACTIONABLE', false, false, false), false);

// A non-killed lane still needs all three real gates to pass.
assert.equal(laneExecutionReadyWithLifecycle(null, true, true, true), true);
assert.equal(laneExecutionReadyWithLifecycle(null, true, true, false), false);
assert.equal(laneExecutionReadyWithLifecycle(null, true, false, true), false);
assert.equal(laneExecutionReadyWithLifecycle(null, false, true, true), false);

// An unrelated/unknown lifecycle status string must not be treated as a kill.
assert.equal(laneExecutionReadyWithLifecycle('SOME_OTHER_STATUS', true, true, true), true);

const baseNow=Date.parse('2026-08-21T12:00:00.000Z');
const staleGreen=sanitizeLegacySingleLane({
  generatedAt:'2026-08-20T06:49:17.452Z',
  state:'READY_TO_EXECUTE_MANUALLY',
  order:{action:'PLAY',stakePerSpinEUR:0.1,maxSpins:10,maxTotalStakeEUR:1,entryMode:'EXECUTE'},
  evidence:{observedAt:'2026-08-20T06:48:55.020Z',sourceFresh:true,withinFreshExecutionWindow:true,signalAgeSeconds:22},
  blockers:[]
},baseNow);
assert.equal(staleGreen.phase,'RED');
assert.equal(staleGreen.executionReady,false);
assert.equal(staleGreen.prepareOnly,false);
assert.equal(staleGreen.order.action,'DO_NOT_PLAY');
assert.equal(staleGreen.order.stakePerSpinEUR,0);
assert.equal(staleGreen.order.maxTotalStakeEUR,0);
assert.equal(staleGreen.evidence.sourceFresh,false);
assert.equal(staleGreen.evidence.withinFreshExecutionWindow,false);
assert.ok(staleGreen.evidence.signalAgeSeconds>180);
assert.ok(staleGreen.blockers.includes('SOURCE_NOT_FRESH'));

const freshGreen=sanitizeLegacySingleLane({
  generatedAt:'2026-08-21T11:59:50.000Z',
  state:'READY_TO_EXECUTE_MANUALLY',
  order:{action:'PLAY',stakePerSpinEUR:0.1,maxSpins:10,maxTotalStakeEUR:1,entryMode:'EXECUTE'},
  evidence:{observedAt:'2026-08-21T11:59:50.000Z',sourceFresh:true,withinFreshExecutionWindow:true},
  blockers:[]
},baseNow);
assert.equal(freshGreen.phase,'GREEN');
assert.equal(freshGreen.executionReady,true);
assert.equal(freshGreen.order.action,'PLAY');
assert.equal(freshGreen.evidence.sourceFresh,true);
assert.equal(freshGreen.evidence.signalAgeSeconds,10);

const staleYellow=sanitizeLegacySingleLane({
  state:'PREPARE_OPEN_GAME_NO_BET',
  order:{action:'OPEN_GAME_ONLY_NO_BET',stakePerSpinEUR:0,maxSpins:0,maxTotalStakeEUR:0},
  evidence:{observedAt:'2026-08-21T11:50:00.000Z',sourceFresh:true,withinFreshExecutionWindow:true},
  blockers:[]
},baseNow);
assert.equal(staleYellow.phase,'RED');
assert.equal(staleYellow.prepareOnly,false);
assert.equal(staleYellow.order.action,'DO_NOT_PLAY');
assert.ok(staleYellow.blockers.includes('SOURCE_NOT_FRESH'));

console.log('edge-live-multi-execution-plan-lifecycle-v1.test.mjs: PASS');

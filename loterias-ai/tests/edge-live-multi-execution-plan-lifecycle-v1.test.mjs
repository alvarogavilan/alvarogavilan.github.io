import assert from 'node:assert/strict';
import { laneExecutionReadyWithLifecycle } from '../edge-live/edge-live-multi-execution-plan-v1.mjs';

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

console.log('edge-live-multi-execution-plan-lifecycle-v1.test.mjs: PASS');

import assert from 'node:assert/strict';
import { simulateRTP } from '../casino/video-poker/monte-carlo-rtp-v1.mjs';
import { STANDARD_9_6_JACKS_OR_BETTER_PAYTABLE } from '../casino/video-poker/jacks-or-better-strategy-v1.mjs';

// Fast CI regression guard only - NOT the mandatory high-precision
// validation (that is uvp-validation-run-v1.mjs, run separately at 2,000,000
// trials and persisted as evidence/uvp-9-6-validation-run-v1.json). This
// fast, deterministic-seed run just needs to be wide enough to reliably
// catch a gross implementation bug (wrong paytable, broken evaluator,
// broken strategy) without making every CI run pay for 2M trials.
const result = simulateRTP({ paytable: STANDARD_9_6_JACKS_OR_BETTER_PAYTABLE, trials: 100000, seed: 42 });

assert.equal(result.trials, 100000);
assert.equal(result.exactCombinatorialRTP, false);
assert.equal(result.method, 'MONTE_CARLO_STANDARD_STRATEGY_REAL_SIMULATED_DRAWS');
// A correct 9/6 Jacks-or-Better implementation must land well above 90%
// (any serious evaluator/strategy/paytable bug drops this sharply) and
// nowhere near or above 105% (a paytable or double-counting bug).
assert.ok(result.rtpEstimatePct > 90, `RTP estimate suspiciously low: ${result.rtpEstimatePct}%`);
assert.ok(result.rtpEstimatePct < 105, `RTP estimate suspiciously high: ${result.rtpEstimatePct}%`);
// Reproducibility: same seed, same trial count must give the exact same result.
const repeat = simulateRTP({ paytable: STANDARD_9_6_JACKS_OR_BETTER_PAYTABLE, trials: 100000, seed: 42 });
assert.equal(repeat.rtpEstimatePct, result.rtpEstimatePct);

console.log(`video-poker-monte-carlo-v1.test.mjs: PASS (rtpEstimatePct=${result.rtpEstimatePct})`);

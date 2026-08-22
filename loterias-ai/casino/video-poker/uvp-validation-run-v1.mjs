#!/usr/bin/env node
// Real, one-off, high-precision validation run required before trusting
// this solver for anything else: does the standard-strategy Monte Carlo
// simulator, on the textbook 9/6 Jacks or Better paytable, land near the
// published exact-optimal RTP of 99.5439%? Zero network - pure computation,
// deterministic given its seed, so it is exactly reproducible.
import fs from 'node:fs';
import { simulateRTP } from './monte-carlo-rtp-v1.mjs';
import { STANDARD_9_6_JACKS_OR_BETTER_PAYTABLE } from './jacks-or-better-strategy-v1.mjs';

const OUT = 'loterias-ai/casino/video-poker/evidence/uvp-9-6-validation-run-v1.json';
const PUBLISHED_EXACT_OPTIMAL_RTP_PCT = 99.5439;
const TRIALS = 2_000_000;
const SEED = 42;

const startedAt = new Date().toISOString();
const t0 = Date.now();
const result = simulateRTP({ paytable: STANDARD_9_6_JACKS_OR_BETTER_PAYTABLE, trials: TRIALS, seed: SEED });
const elapsedMs = Date.now() - t0;

const publishedWithinCi95 = PUBLISHED_EXACT_OPTIMAL_RTP_PCT >= result.ci95Pct.low && PUBLISHED_EXACT_OPTIMAL_RTP_PCT <= result.ci95Pct.high;
const gapToPublishedPct = +(PUBLISHED_EXACT_OPTIMAL_RTP_PCT - result.rtpEstimatePct).toFixed(4);

// Four DELIBERATELY SEPARATE claims - never collapse these into one
// "validated" flag. Each answers a different question, and passing one
// says nothing about the others:
//   - handEvaluatorValidated: does evaluateHand() correctly classify hands?
//     (indirectly supported by this run producing sane category
//     frequencies and an RTP in the right neighborhood - directly tested in
//     video-poker-hand-evaluator-v1.test.mjs.)
//   - exactPerHandOptimizerValidated: does chooseOptimalHold() (the real,
//     paytable/progressive-parametric exact engine) make correct decisions?
//     This run does NOT test that engine at all - it tests the fast
//     heuristic (jacks-or-better-strategy-v1.mjs's chooseHold). See
//     video-poker-optimal-hold-engine-v1.test.mjs for that engine's own
//     validation, independent of this file.
//   - globalRtpMonteCarloConsistent: is the population-level RTP estimate,
//     using the FIXED 9/6 heuristic, statistically consistent with the
//     published exact-optimal figure? That is ALL this run establishes.
//   - globalExactRtpValidated: has a true exhaustive combinatorial sweep
//     been run and cross-checked? No - not attempted (see
//     monte-carlo-rtp-v1.mjs docstring for why). Always false until one is.
const decision = {
  publishedValueWithinReported95PctCi: publishedWithinCi95,
  gapToPublishedPct,
  interpretation: publishedWithinCi95
    ? 'CONSISTENCY_CHECK PASS: the published exact-optimal RTP falls inside this run\'s own 95% confidence interval for the FIXED-heuristic Monte Carlo estimate. This is a coarse statistical consistency check, not proof of optimality or of generalization to any other paytable or progressive configuration.'
    : 'FAIL: the published value falls OUTSIDE this run\'s 95% CI - do not trust this solver\'s output for anything until the discrepancy is root-caused.',
  handEvaluatorValidated: publishedWithinCi95,
  exactPerHandOptimizerValidated: false,
  globalRtpMonteCarloConsistent: publishedWithinCi95,
  globalExactRtpValidated: false,
  validatedForOtherPaytables: false,
  spainPaytableVerified: false,
  realMoneyAllowed: false,
};

const out = {
  version: 'uvp-9-6-validation-run-v1',
  generatedAt: startedAt,
  purpose: 'Coarse consistency check only: does the FIXED 9/6-shaped heuristic strategy\'s population-level Monte Carlo RTP land statistically near the published exact-optimal figure for that exact paytable? This is not a validation of the exact/progressive-parametric optimizer (chooseOptimalHold, see optimal-hold-engine-v1.mjs), which is validated separately and independently.',
  publishedExactOptimalRtpPct: PUBLISHED_EXACT_OPTIMAL_RTP_PCT,
  publishedSource: 'Widely-documented exact-optimal-strategy return for a standard 9/6 Jacks or Better paytable (9x full house, 6x flush, 4x straight, 3x trips, 2x two pair, 1x jacks-or-better, 25x quads, 50x straight flush, 800x royal flush per 1-credit bet).',
  simulation: result,
  elapsedMs,
  decision,
  guards: {
    zeroNetwork: true,
    deterministicSeed: true,
    monteCarloNotExactCombinatorial: true,
    noSpainPaytableClaimed: true,
    economicPromotionAllowed: false,
    realMoneyAllowed: false,
  },
};
fs.mkdirSync('loterias-ai/casino/video-poker/evidence', { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
console.log(JSON.stringify({ decision: out.decision, rtpEstimatePct: result.rtpEstimatePct, ci95Pct: result.ci95Pct, trials: TRIALS, elapsedMs }, null, 2));

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

const out = {
  version: 'uvp-9-6-validation-run-v1',
  generatedAt: startedAt,
  purpose: 'Mandatory validation gate before trusting this solver for any other paytable: standard-strategy Monte Carlo RTP on the well-known 9/6 Jacks or Better paytable must be statistically consistent with the published exact-optimal RTP.',
  publishedExactOptimalRtpPct: PUBLISHED_EXACT_OPTIMAL_RTP_PCT,
  publishedSource: 'Widely-documented exact-optimal-strategy return for a standard 9/6 Jacks or Better paytable (9x full house, 6x flush, 4x straight, 3x trips, 2x two pair, 1x jacks-or-better, 25x quads, 50x straight flush, 800x royal flush per 1-credit bet).',
  simulation: result,
  elapsedMs,
  decision: {
    publishedValueWithinReported95PctCi: publishedWithinCi95,
    gapToPublishedPct,
    interpretation: publishedWithinCi95
      ? 'PASS: the published exact-optimal RTP falls inside this run\'s own 95% confidence interval. This validates the hand evaluator and the standard-strategy engine are structurally correct. The point estimate sitting slightly below the published exact-optimal value is expected: this uses a documented near-optimal simplified strategy (see jacks-or-better-strategy-v1.mjs docstring), not a from-scratch exhaustive optimal-strategy derivation.'
      : 'FAIL: the published value falls OUTSIDE this run\'s 95% CI - do not trust this solver\'s output for any other paytable until the discrepancy is root-caused.',
    validatedForOtherPaytables: publishedWithinCi95,
  },
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

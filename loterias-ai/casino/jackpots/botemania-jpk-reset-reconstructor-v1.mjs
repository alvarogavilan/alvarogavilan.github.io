#!/usr/bin/env node
import fs from 'node:fs';
import { classifyTierTransition, summarizeTierResets, MATERIAL_RESET_DROP_RATIO, MIN_CLEAN_RESETS_PER_TIER } from './jpk-reset-classifier-core-v2.mjs';

const OBS = 'loterias-ai/casino/jackpots/evidence/botemania-jackpot-king-observer-v1.json';
const FAST = 'loterias-ai/casino/jackpots/evidence/botemania-jpk-fast-reset-ledger-v1.json';
const MBWB = 'loterias-ai/casino/jackpots/evidence/botemania-fishin-ingame-mbwb-v1.json';
const OUT = 'loterias-ai/casino/jackpots/evidence/botemania-jpk-reset-reconstructor-v1.json';
const read = (p) => { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; } };

const j = read(OBS) || {};
const fast = read(FAST) || {};
const mbwb = read(MBWB) || {};
const xs = (j.observations || [])
  .filter((o) => o?.labeledPots && o.observedAt)
  .sort((a, b) => Date.parse(a.observedAt) - Date.parse(b.observedAt));
const seedHyp = { ROYAL: 500, REGAL: 5000 };
const tiers = ['ROYAL', 'REGAL'];
const sibling = { ROYAL: 'REGAL', REGAL: 'ROYAL' };

const windows = [];
for (let i = 1; i < xs.length; i++) {
  const a = xs[i - 1];
  const b = xs[i];
  const dt = (Date.parse(b.observedAt) - Date.parse(a.observedAt)) / 1000;
  if (!(dt > 0)) continue;

  for (const tier of tiers) {
    const sib = sibling[tier];
    const from = Number(a.labeledPots[tier]);
    const to = Number(b.labeledPots[tier]);
    const sibFrom = Number(a.labeledPots[sib]);
    const sibTo = Number(b.labeledPots[sib]);
    const kingFrom = Number(a.labeledPots.JACKPOT_KING);
    const kingTo = Number(b.labeledPots.JACKPOT_KING);
    if (![from, to, sibFrom, sibTo, kingFrom, kingTo].every(Number.isFinite)) continue;
    if (!(from > to)) continue;

    const c = classifyTierTransition({
      tier,
      from,
      to,
      siblingTier: sib,
      siblingFrom: sibFrom,
      siblingTo: sibTo,
      jackpotKingFrom: kingFrom,
      jackpotKingTo: kingTo,
    });
    const drop = from - to;
    const lower = c.cleanSingleTierCandidate ? from : null;
    const upper = c.cleanSingleTierCandidate ? from + c.siblingGrowthEUR : null;
    const seed = seedHyp[tier];
    const seedPoint = c.cleanSingleTierCandidate ? from + c.siblingGrowthEUR - to + seed : null;

    windows.push({
      source: 'PERSISTED_OBSERVER_WINDOWS',
      tier,
      fromObservedAt: a.observedAt,
      toObservedAt: b.observedAt,
      seconds: dt,
      fromEUR: +from.toFixed(2),
      toEUR: +to.toFixed(2),
      observedDropEUR: +drop.toFixed(2),
      dropRatio: c.dropRatio,
      siblingTier: sib,
      siblingGrowthEUR: c.siblingGrowthEUR,
      jackpotKingGrowthEUR: c.jackpotKingGrowthEUR,
      classification: c.classification,
      rawNegativeMove: c.rawNegativeMove,
      materialTierDropCandidate: c.materialTierDropCandidate,
      cleanSingleTierCandidate: c.cleanSingleTierCandidate,
      awardIntervalEUR: c.cleanSingleTierCandidate ? {
        lower: +lower.toFixed(2),
        upper: +upper.toFixed(2),
        width: +Math.max(0, upper - lower).toFixed(4),
      } : null,
      seedHypothesisPointEstimateEUR: c.cleanSingleTierCandidate ? +seedPoint.toFixed(2) : null,
      seedHypothesisEUR: seed,
      assumptions: {
        singleResetWithinWindow: c.cleanSingleTierCandidate,
        royalRegalEqualActiveAllocationWithinWindow: c.cleanSingleTierCandidate,
        reserveAtResetUnknown: true,
        seedPointEstimateHypothesisOnly: true,
        materialResetDropRatioMinimum: MATERIAL_RESET_DROP_RATIO,
      },
      usableForSpainHazardValidation: c.usableForSpainHazardValidation,
    });
  }
}

const fastEvents = (Array.isArray(fast?.events) ? fast.events : [])
  .filter((e) => ['ROYAL', 'REGAL'].includes(e?.tier) && e?.cleanSingleTierCandidate === true)
  .map((e) => ({
    source: 'FAST_15S_RESET_LEDGER',
    tier: e.tier,
    fromObservedAt: e.fromObservedAt || null,
    toObservedAt: e.observedAt || null,
    seconds: e.fromObservedAt && e.observedAt ? (Date.parse(e.observedAt) - Date.parse(e.fromObservedAt)) / 1000 : null,
    fromEUR: Number(e.fromEUR),
    toEUR: Number(e.toEUR),
    observedDropEUR: Number.isFinite(Number(e.fromEUR)) && Number.isFinite(Number(e.toEUR)) ? +(Number(e.fromEUR) - Number(e.toEUR)).toFixed(2) : null,
    dropRatio: Number.isFinite(Number(e.dropRatio)) ? Number(e.dropRatio) : null,
    siblingTier: e.siblingTier || sibling[e.tier],
    siblingGrowthEUR: Number(e.siblingGrowthEUR),
    jackpotKingGrowthEUR: Number(e.jackpotKingGrowthEUR),
    classification: 'CLEAN_SINGLE_TIER_RESET_CANDIDATE',
    rawNegativeMove: true,
    materialTierDropCandidate: true,
    cleanSingleTierCandidate: true,
    awardIntervalEUR: e.awardIntervalEUR || null,
    seedHypothesisPointEstimateEUR: null,
    seedHypothesisEUR: seedHyp[e.tier],
    assumptions: {
      singleResetWithinWindow: true,
      royalRegalEqualActiveAllocationWithinWindow: true,
      reserveAtResetUnknown: true,
      fastSamplingTargetSeconds: 15,
      materialResetDropRatioMinimum: MATERIAL_RESET_DROP_RATIO,
    },
    usableForSpainHazardValidation: true,
    eventId: e.eventId || null,
  }));

const key = (x) => `${x.tier}|${x.toObservedAt || x.fromObservedAt}|${Number(x.fromEUR).toFixed(2)}|${Number(x.toEUR).toFixed(2)}`;
const merged = new Map();
for (const x of [...windows, ...fastEvents]) {
  const k = key(x);
  const prior = merged.get(k);
  if (!prior || x.source === 'FAST_15S_RESET_LEDGER') merged.set(k, x);
}
const all = [...merged.values()].sort((a, b) => Date.parse(a.toObservedAt || a.fromObservedAt) - Date.parse(b.toObservedAt || b.fromObservedAt));
const clean = all.filter((x) => x.cleanSingleTierCandidate === true);
const baseSummary = summarizeTierResets(all, MIN_CLEAN_RESETS_PER_TIER);
const widths = clean.map((x) => Number(x.awardIntervalEUR?.width)).filter(Number.isFinite).sort((a, b) => a - b);
const exactMbwb = mbwb?.decision?.exactSpainMbwbKnown === true;
const capEUR = exactMbwb ? mbwb?.mustBeWonBeforeEUR : null;

const out = {
  version: 'botemania-jpk-reset-reconstructor-v1.2-material-tier-separated',
  generatedAt: new Date().toISOString(),
  operator: 'botemania-es',
  sources: [OBS, FAST, MBWB],
  method: 'MERGE_INTERVAL_CENSORING_WITH_FAST_EVENTS;_10PCT_MATERIALITY;_ROYAL_REGAL_NEVER_POOLED',
  evidenceBasis: 'Raw negative meter moves are preserved for audit but are not resets. A persisted tier transition must fall by at least 10% and have non-decreasing sibling and Jackpot King meters to become a clean single-tier reset candidate. Royal and Regal hazard readiness is computed separately.',
  windows: all,
  summary: {
    // Backward-compatible raw count: this is NOT a reset count.
    detectedTierDrops: baseSummary.rawNegativeMoves,
    detectedTierDropsSemantic: 'RAW_NEGATIVE_METER_MOVES_NOT_CONFIRMED_RESETS',
    ...baseSummary,
    noiseOrDiscontinuityMoves: all.filter((x) => x.rawNegativeMove === true && x.cleanSingleTierCandidate !== true).length,
    classificationCounts: Object.fromEntries([...new Set(all.map((x) => x.classification))].map((k) => [k, all.filter((x) => x.classification === k).length])),
    fastCleanCandidates: clean.filter((x) => x.source === 'FAST_15S_RESET_LEDGER').length,
    minimumCleanResetsForHazardFit: MIN_CLEAN_RESETS_PER_TIER,
    medianIntervalWidthEUR: widths.length ? widths[Math.floor(widths.length / 2)] : null,
  },
  mbwb: { exactSpainMbwbKnown: exactMbwb, capEUR },
  decision: {
    exactSpainMbwbKnown: exactMbwb,
    royalHazardFitReady: baseSummary.royalHazardFitReady,
    regalHazardFitReady: baseSummary.regalHazardFitReady,
    anyTierHazardFitReady: baseSummary.anyTierHazardFitReady,
    hazardFitReady: baseSummary.hazardFitReady,
    exactHazardKnown: false,
    realMoneyAllowed: false,
  },
  guards: {
    intervalCensoringPreserved: true,
    rawNegativeMoveNeverEqualsReset: true,
    minimumMaterialDropRatio: MATERIAL_RESET_DROP_RATIO,
    fastEventsDeduplicated: true,
    noSeedPointEstimateAsFact: true,
    royalRegalHazardsNeverPooled: true,
    noHazardFitBeforePerTierMinimumResets: true,
    noBetting: true,
    realMoneyAllowed: false,
  },
};

fs.mkdirSync('loterias-ai/casino/jackpots/evidence', { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
console.log(JSON.stringify({ summary: out.summary, decision: out.decision }, null, 2));

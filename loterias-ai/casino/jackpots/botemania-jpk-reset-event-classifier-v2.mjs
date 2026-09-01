#!/usr/bin/env node
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

export const MIN_CLEAN_RESETS_PER_TIER = 10;
const TIERS = ['ROYAL', 'REGAL'];

function finite(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function round(v, d = 4) {
  return Number.isFinite(v) ? +v.toFixed(d) : null;
}

function transitionKey(w) {
  return `${w.fromObservedAt || ''}|${w.toObservedAt || ''}|${w.source || ''}`;
}

export function normalizeWindow(w) {
  if (!w || !TIERS.includes(w.tier)) return null;
  const from = finite(w.fromEUR);
  const to = finite(w.toEUR);
  const siblingDelta = finite(w.siblingGrowthEUR);
  const kingDelta = finite(w.jackpotKingGrowthEUR);
  if (![from, to, siblingDelta, kingDelta].every(Number.isFinite)) return null;
  const targetDelta = to - from;
  const royalDelta = w.tier === 'ROYAL' ? targetDelta : siblingDelta;
  const regalDelta = w.tier === 'REGAL' ? targetDelta : siblingDelta;
  return {
    transitionKey: transitionKey(w),
    source: w.source || null,
    fromObservedAt: w.fromObservedAt || null,
    toObservedAt: w.toObservedAt || null,
    seconds: finite(w.seconds),
    royalDeltaEUR: royalDelta,
    regalDeltaEUR: regalDelta,
    jackpotKingDeltaEUR: kingDelta,
    originatingTier: w.tier,
    raw: w,
  };
}

function closeEnough(a, b, tolerance = 0.011) {
  return Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= tolerance;
}

export function collapseTransitionGroup(group) {
  const rows = group.map(normalizeWindow).filter(Boolean);
  if (!rows.length) return null;
  const first = rows[0];
  const inconsistent = rows.some((r) =>
    !closeEnough(r.royalDeltaEUR, first.royalDeltaEUR) ||
    !closeEnough(r.regalDeltaEUR, first.regalDeltaEUR) ||
    !closeEnough(r.jackpotKingDeltaEUR, first.jackpotKingDeltaEUR)
  );
  const royalDelta = first.royalDeltaEUR;
  const regalDelta = first.regalDeltaEUR;
  const kingDelta = first.jackpotKingDeltaEUR;
  const royalDown = royalDelta < 0;
  const regalDown = regalDelta < 0;
  const kingDown = kingDelta < 0;

  let classification = 'NO_NEGATIVE_TIER_MOVE';
  let strictResetTier = null;
  if (inconsistent) {
    classification = 'INCONSISTENT_DUPLICATE_TRANSITION';
  } else if (royalDown && regalDown && kingDown) {
    classification = 'COORDINATED_NETWORK_NEGATIVE_MOVE';
  } else if (royalDown && regalDown) {
    classification = 'MULTI_TIER_NEGATIVE_MOVE';
  } else if (royalDown && !regalDown && !kingDown) {
    classification = 'STRICT_ROYAL_RESET_CANDIDATE';
    strictResetTier = 'ROYAL';
  } else if (regalDown && !royalDown && !kingDown) {
    classification = 'STRICT_REGAL_RESET_CANDIDATE';
    strictResetTier = 'REGAL';
  } else if (royalDown || regalDown) {
    classification = 'UNRESOLVED_SINGLE_TIER_NEGATIVE_MOVE';
  }

  return {
    transitionKey: first.transitionKey,
    source: first.source,
    fromObservedAt: first.fromObservedAt,
    toObservedAt: first.toObservedAt,
    seconds: first.seconds,
    rawTierDownRecords: rows.filter((r) => r.raw?.observedDropEUR > 0).length,
    representedTiers: [...new Set(rows.map((r) => r.originatingTier))].sort(),
    deltasEUR: {
      ROYAL: round(royalDelta),
      REGAL: round(regalDelta),
      JACKPOTKING: round(kingDelta),
    },
    classification,
    strictResetCandidate: strictResetTier !== null,
    strictResetTier,
    usableForHazardFit: strictResetTier !== null,
    guards: {
      duplicateRowsConsistent: !inconsistent,
      coordinatedNegativeMoveNeverCountsAsReset: true,
      multiTierNegativeMoveNeverCountsAsReset: true,
      pooledRoyalRegalHazardProhibited: true
    }
  };
}

export function classifyWindows(windows = [], minPerTier = MIN_CLEAN_RESETS_PER_TIER) {
  const groups = new Map();
  for (const w of windows) {
    const n = normalizeWindow(w);
    if (!n) continue;
    if (!groups.has(n.transitionKey)) groups.set(n.transitionKey, []);
    groups.get(n.transitionKey).push(w);
  }
  const transitions = [...groups.values()].map(collapseTransitionGroup).filter(Boolean)
    .sort((a, b) => Date.parse(a.toObservedAt || a.fromObservedAt || 0) - Date.parse(b.toObservedAt || b.fromObservedAt || 0));
  const resets = transitions.filter((e) => e.strictResetCandidate);
  const royal = resets.filter((e) => e.strictResetTier === 'ROYAL').length;
  const regal = resets.filter((e) => e.strictResetTier === 'REGAL').length;
  const royalReady = royal >= minPerTier;
  const regalReady = regal >= minPerTier;
  return {
    transitions,
    summary: {
      rawTierDownRecords: windows.filter((w) => finite(w?.observedDropEUR) > 0).length,
      uniqueTransitionsWithNegativeTierMove: transitions.filter((e) => e.deltasEUR.ROYAL < 0 || e.deltasEUR.REGAL < 0).length,
      coordinatedNetworkNegativeTransitions: transitions.filter((e) => e.classification === 'COORDINATED_NETWORK_NEGATIVE_MOVE').length,
      multiTierNegativeTransitions: transitions.filter((e) => e.classification === 'MULTI_TIER_NEGATIVE_MOVE').length,
      unresolvedSingleTierNegativeTransitions: transitions.filter((e) => e.classification === 'UNRESOLVED_SINGLE_TIER_NEGATIVE_MOVE').length,
      inconsistentDuplicateTransitions: transitions.filter((e) => e.classification === 'INCONSISTENT_DUPLICATE_TRANSITION').length,
      strictResetCandidates: resets.length,
      royalStrictResetCandidates: royal,
      regalStrictResetCandidates: regal,
      minimumCleanResetsPerTierForHazardFit: minPerTier,
      royalHazardFitReady: royalReady,
      regalHazardFitReady: regalReady,
      anyTierHazardFitReady: royalReady || regalReady,
      bothTiersHazardFitReady: royalReady && regalReady,
      pooledHazardFitReady: false
    }
  };
}

export function runSelfTest() {
  const pair = (royalDelta, regalDelta, kingDelta, t = '2026-01-01T00:00:00Z') => [
    { source: 'TEST', tier: 'ROYAL', fromObservedAt: t, toObservedAt: '2026-01-01T00:00:10Z', fromEUR: 1000, toEUR: 1000 + royalDelta, siblingGrowthEUR: regalDelta, jackpotKingGrowthEUR: kingDelta, observedDropEUR: Math.max(0, -royalDelta) },
    { source: 'TEST', tier: 'REGAL', fromObservedAt: t, toObservedAt: '2026-01-01T00:00:10Z', fromEUR: 10000, toEUR: 10000 + regalDelta, siblingGrowthEUR: royalDelta, jackpotKingGrowthEUR: kingDelta, observedDropEUR: Math.max(0, -regalDelta) }
  ];
  const coordinated = classifyWindows(pair(-0.01, -0.01, -0.01));
  if (coordinated.summary.strictResetCandidates !== 0) throw new Error('coordinated move counted as reset');
  if (coordinated.transitions[0].classification !== 'COORDINATED_NETWORK_NEGATIVE_MOVE') throw new Error('coordinated move misclassified');

  const royal = classifyWindows(pair(-100, 1, 2));
  if (royal.transitions[0].classification !== 'STRICT_ROYAL_RESET_CANDIDATE') throw new Error('royal reset not recognized');

  const unresolved = classifyWindows(pair(-100, 1, -2));
  if (unresolved.summary.strictResetCandidates !== 0) throw new Error('king-negative single-tier move incorrectly clean');

  const tenRoyal = [];
  for (let i = 0; i < 10; i++) {
    const from = `2026-01-${String(i + 1).padStart(2, '0')}T00:00:00Z`;
    const to = `2026-01-${String(i + 1).padStart(2, '0')}T00:00:10Z`;
    tenRoyal.push({ source: `TEST${i}`, tier: 'ROYAL', fromObservedAt: from, toObservedAt: to, fromEUR: 1000, toEUR: 900, siblingGrowthEUR: 1, jackpotKingGrowthEUR: 2, observedDropEUR: 100 });
  }
  const readiness = classifyWindows(tenRoyal);
  if (!readiness.summary.royalHazardFitReady || readiness.summary.regalHazardFitReady || readiness.summary.bothTiersHazardFitReady) throw new Error('per-tier readiness broken');
  if (readiness.summary.pooledHazardFitReady !== false) throw new Error('pooled hazard must stay prohibited');

  return { selfTest: 'PASS', coordinatedMoveExcluded: true, strictRoyalDetected: true, kingNegativeExcluded: true, perTierHazardGate: true, pooledHazardProhibited: true };
}

async function cli() {
  if (process.argv.includes('--self-test')) {
    console.log(JSON.stringify(runSelfTest(), null, 2));
    return;
  }
  const IN = 'loterias-ai/casino/jackpots/evidence/botemania-jpk-reset-reconstructor-v1.json';
  const OUT = 'loterias-ai/casino/jackpots/evidence/botemania-jpk-reset-event-classifier-v2.json';
  const prior = JSON.parse(fs.readFileSync(IN, 'utf8'));
  const classified = classifyWindows(Array.isArray(prior.windows) ? prior.windows : []);
  const out = {
    version: 'botemania-jpk-reset-event-classifier-v2',
    generatedAt: new Date().toISOString(),
    operator: 'botemania-es',
    input: IN,
    method: 'EVENT_LEVEL_COORDINATED_NEGATIVE_MOVE_EXCLUSION_WITH_PER_TIER_HAZARD_GATE',
    transitions: classified.transitions,
    summary: classified.summary,
    priorSummary: prior.summary || null,
    decision: {
      royalHazardFitReady: classified.summary.royalHazardFitReady,
      regalHazardFitReady: classified.summary.regalHazardFitReady,
      anyTierHazardFitReady: classified.summary.anyTierHazardFitReady,
      exactHazardKnown: false,
      realMoneyAllowed: false
    },
    guards: {
      rawDownMoveIsNotPrize: true,
      transitionDeduplicationRequired: true,
      coordinatedNegativeMovesExcludedFromResets: true,
      royalRegalHazardsNeverPooled: true,
      noSeedAssumptionRequiredForClassification: true,
      noHazardFitBeforePerTierMinimum: true,
      noBetting: true,
      realMoneyAllowed: false
    }
  };
  fs.mkdirSync('loterias-ai/casino/jackpots/evidence', { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
  console.log(JSON.stringify({ summary: out.summary, decision: out.decision }, null, 2));
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) await cli();

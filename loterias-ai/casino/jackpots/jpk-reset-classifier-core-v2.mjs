export const MATERIAL_RESET_DROP_RATIO = 0.10;
export const MIN_CLEAN_RESETS_PER_TIER = 10;

const finite = (v) => Number.isFinite(Number(v));

export function classifyTierTransition({
  tier,
  from,
  to,
  siblingTier,
  siblingFrom,
  siblingTo,
  jackpotKingFrom,
  jackpotKingTo,
  materialDropRatio = MATERIAL_RESET_DROP_RATIO,
}) {
  if (!['ROYAL', 'REGAL'].includes(tier)) throw new Error(`INVALID_TIER_${tier}`);
  if (!['ROYAL', 'REGAL'].includes(siblingTier) || siblingTier === tier) throw new Error(`INVALID_SIBLING_${siblingTier}`);
  if (![from, to, siblingFrom, siblingTo, jackpotKingFrom, jackpotKingTo].every(finite)) {
    return {
      tier,
      siblingTier,
      classification: 'INVALID_NUMERIC_INPUT',
      rawNegativeMove: false,
      materialTierDropCandidate: false,
      cleanSingleTierCandidate: false,
      usableForSpainHazardValidation: false,
      dropRatio: null,
      siblingGrowthEUR: null,
      jackpotKingGrowthEUR: null,
    };
  }

  const a = Number(from);
  const b = Number(to);
  const sibA = Number(siblingFrom);
  const sibB = Number(siblingTo);
  const kingA = Number(jackpotKingFrom);
  const kingB = Number(jackpotKingTo);
  const drop = a - b;
  const dropRatio = a > 0 && drop > 0 ? drop / a : 0;
  const siblingGrowth = sibB - sibA;
  const jackpotKingGrowth = kingB - kingA;
  const rawNegativeMove = drop > 0;
  const materialTierDropCandidate = rawNegativeMove && dropRatio >= materialDropRatio;
  const broadConcurrentNegative = rawNegativeMove && siblingGrowth < 0 && jackpotKingGrowth < 0;

  let classification = 'NON_NEGATIVE_TRANSITION';
  if (broadConcurrentNegative) classification = 'BROAD_SOURCE_DISCONTINUITY';
  else if (rawNegativeMove && !materialTierDropCandidate) classification = 'SUBMATERIAL_REVERSAL';
  else if (materialTierDropCandidate && (siblingGrowth < 0 || jackpotKingGrowth < 0)) classification = 'MATERIAL_DROP_CONTAMINATED';
  else if (materialTierDropCandidate) classification = 'CLEAN_SINGLE_TIER_RESET_CANDIDATE';

  const cleanSingleTierCandidate = classification === 'CLEAN_SINGLE_TIER_RESET_CANDIDATE';
  return {
    tier,
    siblingTier,
    classification,
    rawNegativeMove,
    materialTierDropCandidate,
    cleanSingleTierCandidate,
    usableForSpainHazardValidation: cleanSingleTierCandidate,
    dropRatio: +dropRatio.toFixed(8),
    siblingGrowthEUR: +siblingGrowth.toFixed(4),
    jackpotKingGrowthEUR: +jackpotKingGrowth.toFixed(4),
  };
}

export function summarizeTierResets(rows, minimumCleanResetsPerTier = MIN_CLEAN_RESETS_PER_TIER) {
  const all = Array.isArray(rows) ? rows : [];
  const rawNegativeMoves = all.filter((x) => x?.rawNegativeMove === true).length;
  const material = all.filter((x) => x?.materialTierDropCandidate === true);
  const clean = all.filter((x) => x?.cleanSingleTierCandidate === true);
  const royal = clean.filter((x) => x?.tier === 'ROYAL').length;
  const regal = clean.filter((x) => x?.tier === 'REGAL').length;
  const royalHazardFitReady = royal >= minimumCleanResetsPerTier;
  const regalHazardFitReady = regal >= minimumCleanResetsPerTier;
  return {
    rawNegativeMoves,
    materialTierDropCandidates: material.length,
    cleanSingleTierCandidates: clean.length,
    royal,
    regal,
    minimumCleanResetsPerTier,
    royalHazardFitReady,
    regalHazardFitReady,
    anyTierHazardFitReady: royalHazardFitReady || regalHazardFitReady,
    bothTiersHazardFitReady: royalHazardFitReady && regalHazardFitReady,
    // Legacy aggregate field is deliberately conservative: it is true only
    // when BOTH independently modeled tiers have enough clean resets.
    hazardFitReady: royalHazardFitReady && regalHazardFitReady,
    noCrossTierPooling: true,
  };
}

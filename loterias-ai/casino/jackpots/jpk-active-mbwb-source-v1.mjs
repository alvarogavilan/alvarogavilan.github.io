export function selectActiveJpkMbwb({ spanishEvidence = null, legacyHypothesis = null } = {}) {
  const exact = spanishEvidence?.decision?.exactSpainMbwbKnown === true;
  const royalExact = Number(spanishEvidence?.mustBeWonBeforeEUR?.ROYAL);
  const regalExact = Number(spanishEvidence?.mustBeWonBeforeEUR?.REGAL);
  const hasExactNumbers = exact && Number.isFinite(royalExact) && Number.isFinite(regalExact) && royalExact > 0 && regalExact > 0;

  const royalLegacy = Number(legacyHypothesis?.ROYAL);
  const regalLegacy = Number(legacyHypothesis?.REGAL);
  const hasLegacy = Number.isFinite(royalLegacy) && Number.isFinite(regalLegacy) && royalLegacy > 0 && regalLegacy > 0;

  if (hasExactNumbers) {
    return {
      capEUR: { ROYAL: royalExact, REGAL: regalExact },
      sourceClass: 'EXACT_SPAIN_IN_GAME_MBWB',
      exactSpainMbwbKnown: true,
      legacyHypothesisSuperseded: hasLegacy && (royalLegacy !== royalExact || regalLegacy !== regalExact),
      legacyHypothesisEUR: hasLegacy ? { ROYAL: royalLegacy, REGAL: regalLegacy } : null,
      realMoneyAllowed: false,
    };
  }

  if (hasLegacy) {
    return {
      capEUR: { ROYAL: royalLegacy, REGAL: regalLegacy },
      sourceClass: 'LEGACY_CROSS_MARKET_HYPOTHESIS_ONLY',
      exactSpainMbwbKnown: false,
      legacyHypothesisSuperseded: false,
      legacyHypothesisEUR: { ROYAL: royalLegacy, REGAL: regalLegacy },
      realMoneyAllowed: false,
    };
  }

  return {
    capEUR: { ROYAL: null, REGAL: null },
    sourceClass: 'NO_USABLE_MBWB',
    exactSpainMbwbKnown: false,
    legacyHypothesisSuperseded: false,
    legacyHypothesisEUR: null,
    realMoneyAllowed: false,
  };
}

// Priority #2 (Winfall Wishes economy): pure, zero-network synthesis of
// economic facts that are ALREADY sitting in three separately-committed
// evidence files but were never consolidated into one place:
//   - botemania-all-games-census-v1.json   (operator/provider text, stake
//     range text, cap/must-drop keyword search results)
//   - botemania-zero-reset-priority-v1.json (structured RTP, contribution,
//     zero-reset context, shared-network flag)
//   - winfall-shared-network-triangulation-v1.json (which other pages are
//     officially claimed to share the same pot)
//   - botemania-winfall-wishes-identity-binding-probe-v1.json (live-ID
//     binding status)
//
// This module only extracts facts that are already explicitly present in
// that text - it never infers, estimates, or imports a number from a
// different game/operator/version. Every field that is not directly
// supported by already-fetched text is left as `null`/`false` with an
// honest "why" field, per the standing rule that null must never be read
// as 0 and absence of evidence must never be read as a negative fact about
// reality (only as a fact about what has been searched so far).
const dec = (s) => Number(String(s).replace(/\./g, '').replace(',', '.'));

export function parseOperator(betContexts) {
  for (const c of betContexts || []) {
    const m = /Operada por\s+([^,]+),/i.exec(c);
    if (m) return m[1].trim();
  }
  return null;
}

export function parseManufacturerFromCopyright(betContexts) {
  for (const c of betContexts || []) {
    const m = /©\s*(\d{4})\s+([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ0-9 .'&-]{2,80}?)(?:\s*$)/.exec(c);
    if (m) return { year: Number(m[1]), name: m[2].trim() };
  }
  return null;
}

export function parseStakeRangeEUR(betContexts, gameTitle) {
  for (const c of betContexts || []) {
    const m = /va de\s*([\d.,]+)\s*(c|€|eur)\s*a\s*([\d.,]+)\s*(c|€|eur)/i.exec(c);
    if (!m) continue;
    const lowUnit = m[2].toLowerCase();
    const highUnit = m[4].toLowerCase();
    const low = lowUnit === 'c' ? dec(m[1]) / 100 : dec(m[1]);
    const high = highUnit === 'c' ? dec(m[3]) / 100 : dec(m[3]);
    if (low > 0 && high > 0 && high >= low) return { minStakeEUR: low, maxStakeEUR: high, sourceContext: c };
  }
  return null;
}

export function parseContributionFlatClaim(betContexts) {
  for (const c of betContexts || []) {
    const m = /contribuye al Bote Progresivo es siempre de\s*([\d,]+)\s*%.*?independientemente del valor de tu apuesta/i.exec(c);
    if (m) return { flatRegardlessOfStakeClaimed: true, claimedPct: dec(m[1]), sourceContext: c };
  }
  return null;
}

export function parseAveragePayoutProseEUR(betContexts) {
  for (const c of betContexts || []) {
    const m = /(?:de media pagaremos entre|pagaremos un promedio de)\s*([\d,]+)\s*€\s*en premios/i.exec(c);
    if (m) return { valueEUR: dec(m[1]), sourceContext: c };
  }
  return null;
}

export function findCapOrMustDropContexts(census) {
  return census?.capContexts?.length ? census.capContexts : [];
}

export function buildWinfallEconomicsDossier({ census, priority, triangulation, identityBinding }) {
  const slug = 'winfall-wishes-jackpot';
  const censusGame = (census?.games || []).find((g) => g.slug === slug) || null;
  const priorityGame = (priority?.ranked || []).find((g) => g.slug === slug) || null;

  const operator = censusGame ? parseOperator(censusGame.betContexts) : null;
  const manufacturer = censusGame ? parseManufacturerFromCopyright(censusGame.betContexts) : null;
  const stakeRange = censusGame ? parseStakeRangeEUR(censusGame.betContexts) : null;
  const contributionFlatClaim = censusGame ? parseContributionFlatClaim(censusGame.betContexts) : null;
  const averagePayoutProse = censusGame ? parseAveragePayoutProseEUR(censusGame.betContexts) : null;
  const capContexts = censusGame ? findCapOrMustDropContexts(censusGame) : [];

  const structuredBaseRtpPct = priorityGame?.baseRtpPct ?? null;
  const prosePayoutMismatchesStructuredRtp =
    structuredBaseRtpPct != null && averagePayoutProse != null
      ? Math.abs(averagePayoutProse.valueEUR - structuredBaseRtpPct) > 0.05
      : null;

  const triangulationTarget = (triangulation?.pages || []).find((p) => p.slug === slug) || null;
  const officiallySharedWith = triangulation?.hypothesis?.officiallySharedWith ?? null;

  return {
    slug,
    provider: {
      operatorLicenseHolder: operator,
      gameManufacturer: manufacturer ? manufacturer.name : null,
      gameManufacturerCopyrightYear: manufacturer ? manufacturer.year : null,
      source: 'PUBLIC_PAGE_TEXT_ALREADY_FETCHED_BY_CENSUS_CRAWL',
    },
    stake: {
      minStakeEUR: stakeRange?.minStakeEUR ?? null,
      maxStakeEUR: stakeRange?.maxStakeEUR ?? null,
      anyStakeQualifiesStructurally: priorityGame?.anyStake ?? null,
      contributionFlatRegardlessOfStakeClaimedInProse: contributionFlatClaim?.flatRegardlessOfStakeClaimed ?? null,
      contributionPctClaimedInProse: contributionFlatClaim?.claimedPct ?? null,
      contributionPctStructured: priorityGame?.explicitProgressiveContributionPct ?? null,
    },
    rtp: {
      baseRtpPctStructured: structuredBaseRtpPct,
      publishedBasePlusKnownContributionPct: priorityGame?.publishedBasePlusKnownContributionPct ?? null,
      averagePayoutProseEUR: averagePayoutProse?.valueEUR ?? null,
      prosePayoutMismatchesStructuredRtp,
      note: prosePayoutMismatchesStructuredRtp
        ? "Botemania's own unstructured marketing prose sentence for this game states a different average-payout figure than its own structured RTP line. Treated as a site copy inconsistency, NOT as a competing RTP value - baseRtpPctStructured (from the explicit 'Porcentaje de Retorno al Jugador' line) remains the only figure used downstream."
        : null,
    },
    sharedNetwork: {
      structuredFlagSaysShared: priorityGame?.sharedNetwork ?? null,
      officiallyClaimedPartners: officiallySharedWith,
      renderedDomTriangulationRun: !!triangulationTarget,
      renderedDomTriangulationFoundDynamicSpecificMatch: triangulationTarget ? (triangulationTarget.dynamicSpecificMatches?.length > 0) : null,
    },
    liveIdentityBinding: {
      probeRun: !!identityBinding,
      exactBindingCandidateFound: identityBinding?.decision?.exactBindingCandidateFound ?? null,
      identityVerified: identityBinding?.decision?.identityVerified ?? null,
    },
    capOrMustDrop: {
      keywordSearchContextsFound: capContexts,
      // Per standing rule: absence of a match in the text searched so far is
      // a fact about the search, never proof the mechanism doesn't exist.
      note: 'capContexts empty means the specific must-drop/must-be-won-by keyword patterns were not found in this page\'s stripped text - this does NOT prove the absence of a cap, only that this specific search did not find one.',
    },
    stillUnknown: {
      exactResetTriggerMechanism: 'Zero-reset contexts confirm the pot resets to 0€ after an award, but the exact trigger probability/hazard function (random-per-spin vs. scheduled vs. must-hit-by-date) is not documented in any evidence fetched so far.',
      publicWinnerHistory: 'No evidence file fetched so far contains a public winner history or distribution of amounts won for this specific game.',
      manufacturerManualsOrPatents: 'No manufacturer (Roxor Gaming Limited) manual, patent, or rules document has been fetched for this specific game/configuration.',
      multilingualWorldDocumentationOfSameExactConfig: 'No cross-jurisdiction documentation of this exact game build/configuration has been fetched or verified as equivalent.',
    },
    guards: {
      zeroNetworkPureSynthesisFromAlreadyFetchedText: true,
      noParameterImportedFromDifferentGameOrOperator: true,
      realMoneyAllowed: false,
    },
  };
}

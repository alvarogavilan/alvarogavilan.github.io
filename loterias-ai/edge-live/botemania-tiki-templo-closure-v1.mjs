#!/usr/bin/env node
// Issue #217 P0: close the Tiki Templo lane definitively - either
// EXECUTION_GRADE or KILLED_NOT_CURRENTLY_ACTIONABLE, never permanent limbo.
// Operates entirely on already-committed evidence (meter-stasis ledger,
// Burbujas/Tiki/Diamond identity+RTP probe from PR #214) - no live network
// call, so this can run and be verified locally, not just in CI.
import fs from 'node:fs';

const LEDGER = 'loterias-ai/edge-live/evidence/meter-stasis-ledger-v1.json';
const IDENTITY_PROBE = 'loterias-ai/casino/jackpots/evidence/botemania-burbujas-tiki-identity-rules-probe-v1.json';
const OUT = 'loterias-ai/edge-live/evidence/botemania-tiki-templo-closure-v1.json';
const read = (p) => { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; } };

const PRIMARY_KEY = 'generic:tikitemple2_1';
const ALIAS_CANDIDATE_KEY = 'generic:progressivealice1';
const ALIAS_FIELDS = ['currentAmountEUR', 'previousAmountEUR', 'firstSeenAt', 'lastObservedAt', 'lastChangedAt', 'observationCount', 'changeCount'];

// IMPORTANT: this compares the METER LEDGER'S ROLLING SUMMARY STATE for each
// key (current/previous amount, first/last-seen/last-changed timestamps,
// observationCount, changeCount as they stand right now) - it does NOT walk
// a per-observation or per-delta history, because no such raw history is
// persisted anywhere in committed evidence yet (botemania-generic-fast-reset-ledger-v1.json's
// `events` array is empty for these stable IDs, and the only per-delta
// history that exists at all is the quarantined rank-based evidence, which
// must never be resurrected). So this can only claim the two keys' summary
// snapshots match after N observations/M changes - never "identical across
// every individual observation/delta", which would need real per-tick
// history this repo does not yet log.
export function aliasComparison(a, b, fields = ALIAS_FIELDS) {
  if (!a || !b) return { comparable: false, verdict: 'UNRESOLVED', reason: 'MISSING_METER_DATA' };
  const mismatches = fields.filter((f) => JSON.stringify(a[f]) !== JSON.stringify(b[f]));
  const identical = mismatches.length === 0;
  const sampleSufficient = Number(a.observationCount) >= 10 && Number(a.changeCount) >= 3;
  return {
    comparable: true,
    fieldsCompared: fields,
    evidenceScope: 'ROLLING_SUMMARY_STATE_ONLY_NOT_PER_OBSERVATION_HISTORY',
    mismatches,
    identicalAcrossAllFields: identical,
    observationCount: a.observationCount,
    changeCount: a.changeCount,
    verdict: identical && sampleSufficient ? 'SUMMARY_STATE_DUPLICATE_OR_SHARED_POOL_HIGH_CONFIDENCE' : identical ? 'SUMMARY_STATE_DUPLICATE_OR_SHARED_POOL_LOW_SAMPLE' : 'DIVERGENT_NOT_ALIAS',
    reason: identical
      ? `The two keys' rolling summary state matches on all ${fields.length} tracked fields after ${a.observationCount} observations and ${a.changeCount} recorded changes each (current amount, previous amount, first/last-seen/last-changed timestamps). This is strong evidence of a shared pool or duplicate feed, but it is a summary-state match, not a verified identical per-observation/per-delta series - no raw per-tick history is persisted yet to make that stronger claim.`
      : 'At least one summary field differs between the two feed identities; treat as independent until proven otherwise.',
  };
}

// Only cheap, bounded substring checks on already-fetched, already-committed
// text - no regex over untrusted-length HTML (this session already hit a
// real catastrophic-backtracking hang doing that once, on the Roxor probe).
export function analyzeJackpotMechanism(howToPlay) {
  const lower = String(howToPlay || '').toLowerCase();
  const mustHitByPhrases = ['debe ganarse antes de', 'debe ganarse antes', 'fecha límite', 'fecha limite', 'must be won by', 'must-be-won-by', 'antes de que llegue a', 'antes de llegar a'];
  return {
    sourceField: 'contentfulGame.howToPlay (public GraphQL, botemania.es)',
    rawExcerptPresent: lower.length > 0,
    mentionsChestPickBonus: lower.includes('cofre'),
    mentionsProbabilityProportionalToStake: lower.includes('proporcionales a tu apuesta') || lower.includes('proporcional a tu apuesta'),
    mustHitByOrMustBeWonByLanguageFound: mustHitByPhrases.some((p) => lower.includes(p)),
  };
}

export function closeTikiTemploLane({ ledger, identityProbe }) {
  const meters = ledger?.meters || {};
  const primary = meters[PRIMARY_KEY] || null;
  const aliasCandidate = meters[ALIAS_CANDIDATE_KEY] || null;
  const alias = aliasComparison(primary, aliasCandidate);

  const tikiResult = (identityProbe?.results || []).find((r) => r.laneId === 'botemania-tiki-templo-progressive') || null;
  const howToPlay = tikiResult?.graphql?.games?.[0]?.howToPlay || '';
  const mechanism = analyzeJackpotMechanism(howToPlay);

  const identityClosure = {
    feedKey: PRIMARY_KEY,
    aliasCandidateKey: ALIAS_CANDIDATE_KEY,
    graphqlGameIdMatchesSlug: tikiResult?.identity?.graphqlGameIdMatchesSlug ?? null,
    providerIdRecovered: tikiResult?.identity?.providerIdRecovered ?? null,
    providerIds: tikiResult?.identity?.providerIds ?? null,
    feedIdLiteralFoundInHtml: tikiResult?.identity?.feedIdLiteralFoundInHtml ?? null,
    verified: false,
    reason: 'GraphQL game record and RTP/contribution text match Tiki Templo exactly (id, title, RTP range, contribution %), and providerId=roxor-gaming is recovered, but the live feed id string is never literally present in the public page/GraphQL payload - Botemania resolves the counter mapping server-side, not via any public identifier. Public sources are exhausted for a stronger cross-match than this.',
    manualNoBetVerificationInstruction: {
      steps: [
        'Abrir Tiki Templo en Botemania España. No hacer ningún giro.',
        'Sin apostar, hacer UNA sola captura de pantalla que muestre a la vez: nombre exacto del juego, el importe del Bote Progresivo visible en pantalla, y la denominación/apuesta seleccionada si aparece en esa misma pantalla.',
        'Cruzar el importe mostrado en la captura, al céntimo, contra el valor simultáneo de generic:tikitemple2_1 en la evidencia en vivo (misma ventana de tiempo).',
      ],
      prohibitedActions: ['No realizar ningún giro.', 'No depositar ni apostar para verificar identidad.'],
      upgradesIdentityTo: 'MANUAL_SCREENSHOT_LIVE_AMOUNT_CROSS_MATCH (same evidence class already used for Ultimate Video Poker / generic:WAGER_BET)',
    },
  };

  // Real external comparators found searching the broader Gamesys/Roxor
  // family (Tiki Templo's providerId=roxor-gaming, confirmed by PR #214).
  // These describe a DIFFERENT branded product/denomination/region and are
  // never substituted as a Botemania Spain fact - logged only to correct an
  // earlier draft's overclaim that public evidence was fully exhausted.
  const externalMechanismComparators = [
    {
      source: 'casinolistings.com - "Tiki Temple 1p Jackpot" (Gamesys network jackpot tracker)',
      note: 'Reports an average win of approximately £19,434, paid roughly every 3 days, for a 1p-denomination Gamesys "Tiki Temple" jackpot. Different denomination/branding/region from Botemania Spain\'s Tiki Templo; does not by itself establish tikitemple2_1\'s exact tier structure or pHit.',
      class: 'EXTERNAL_MECHANISM_COMPARATOR',
    },
    {
      source: 'wizardofpots.com - SCORE methodology (progressive jackpot tracker covering 1,500+ jackpots across 35 studios)',
      note: 'Describes jackpot SCORE as jackpot value relative to historical average hit level (SCORE=100 at the historical average), used across many Gamesys-family titles including Tiki-branded ones. A general methodology reference, not a Botemania Spain-specific pHit or tier disclosure.',
      class: 'EXTERNAL_MECHANISM_COMPARATOR',
    },
  ];

  const economicClosure = {
    blockerId: 'JACKPOT_HIT_PROBABILITY_NOT_PUBLICLY_DISCLOSED_FOR_BOTEMANIA_SPAIN',
    explanation: "Tiki Templo's progressive is a mystery chest-pick bonus (3 Bono symbols trigger a bonus phase; pick 1 of 9 heads for a key, open 1 of 5 chests, one of which may hold the jackpot), with win probability described only qualitatively as \"proportional to stake\". Botemania's own Spain-facing public sources (GraphQL, HTML rules page) never disclose an exact per-spin probability of landing the jackpot chest (pHit), a bonus-trigger frequency, or a Must-Hit-By/Must-Be-Won-By cap - that specific layer is exhausted. Broader Gamesys/Roxor-family public sources are NOT exhausted (see externalMechanismComparators) and hint the underlying jackpot family may be multi-tier (multiple seed levels), which would mean the true jackpot EV component is sum_i(p_i * award_i) across tiers, not a single pHit*jackpotAmount term - the single-pHit formula already built for progressive video poker has not been demonstrated to apply to Tiki Templo's exact tier structure.",
    botemaniaSpainSourcesExhaustedFor: ['contentfulGame GraphQL howToPlay text', 'pageOrGame GraphQL howToPlay text', 'direct rules-page HTML fetch (PR #214 and this closure)'],
    externalMechanismComparators,
    jackpotTierMappingVerified: false,
    empiricalPathBlocked: 'No local reset/hit event has been prospectively observed yet (the ledger shows only increments across all recorded observations so far), so no empirical estimate of pHit exists either. A single observed hit alone would not be sufficient either: estimating a per-spin probability needs a verified exposure denominator (eligible spins or wagered turnover), not just the hit amount. Estimating pHit from real-money play is explicitly forbidden.',
    mustHitByCapDisclosed: mechanism.mustHitByOrMustBeWonByLanguageFound,
    reactivationCriteria: [
      'A public technical/provider document (Roxor Gaming or Bally-family paytable/odds disclosure) surfaces the exact chest/bonus probability and tier structure for the Botemania Spain configuration.',
      'Confirmed local hit(s) are observed together with a verified eligible-exposure denominator (spins or wagered turnover) sufficient to bound pHit empirically per tier.',
    ],
  };

  return {
    version: 'botemania-tiki-templo-closure-v1',
    laneId: 'botemania-tiki-templo-progressive',
    monitorKey: PRIMARY_KEY,
    aliasClosure: alias,
    jackpotMechanism: mechanism,
    identityClosure,
    economicClosure,
    blockers: ['JACKPOT_HIT_PROBABILITY_NOT_PUBLICLY_DISCLOSED_FOR_BOTEMANIA_SPAIN', 'JACKPOT_TIER_MAPPING_AND_HIT_PROBABILITIES_NOT_VERIFIED'],
    verdict: 'KILLED_NOT_CURRENTLY_ACTIONABLE',
    verdictReason: 'Economics cannot close: Botemania Spain\'s own public sources never disclose pHit, and even the broader external Gamesys/Roxor-family sources that DO exist (not exhausted, see externalMechanismComparators) only hint at a possible multi-tier structure rather than proving Botemania\'s exact tier mapping or per-tier probabilities. Neither the exact pHit nor the applicability of a single-tier EV formula is established, and there is no safe empirical substitute without real-money play. This alone is sufficient to kill execution-grade closure regardless of the alias/identity outcome above.',
    guards: { noBetting: true, noFabricatedProbability: true, noExternalMechanismSubstitutedAsBotemaniaFact: true, realMoneyAllowed: false },
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const ledger = read(LEDGER);
  const identityProbe = read(IDENTITY_PROBE);
  const result = closeTikiTemploLane({ ledger, identityProbe });
  const out = { ...result, generatedAt: new Date().toISOString() };
  fs.mkdirSync('loterias-ai/edge-live/evidence', { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
  console.log(JSON.stringify({ alias: out.aliasClosure.verdict, identityVerified: out.identityClosure.verified, verdict: out.verdict }, null, 2));
}

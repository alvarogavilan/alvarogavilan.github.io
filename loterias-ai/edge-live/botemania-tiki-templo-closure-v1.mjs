#!/usr/bin/env node
// Issue #217 P0: close the Tiki Templo lane definitively - either
// EXECUTION_GRADE or KILLED_NOT_CURRENTLY_ACTIONABLE, never permanent limbo.
import fs from 'node:fs';

const LEDGER = 'loterias-ai/edge-live/evidence/meter-stasis-ledger-v1.json';
const IDENTITY_PROBE = 'loterias-ai/casino/jackpots/evidence/botemania-burbujas-tiki-identity-rules-probe-v1.json';
const DIVERGENCE_EVIDENCE = 'loterias-ai/edge-live/evidence/tiki-alice-simultaneous-divergence-v1.json';
const OUT = 'loterias-ai/edge-live/evidence/botemania-tiki-templo-closure-v1.json';
const read = (p) => { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; } };

const PRIMARY_KEY = 'generic:tikitemple2_1';
const ALIAS_CANDIDATE_KEY = 'generic:progressivealice1';
const ALIAS_FIELDS = ['currentAmountEUR', 'previousAmountEUR', 'firstSeenAt', 'lastObservedAt', 'lastChangedAt', 'observationCount', 'changeCount'];

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
      ? `The two keys' rolling summary state matches on all ${fields.length} tracked fields after ${a.observationCount} observations and ${a.changeCount} recorded changes each. This is only summary-state evidence, not verified per-observation identity.`
      : 'At least one summary field differs between the two feed identities; they cannot be treated as one exact meter from this state.',
  };
}

export function applyPermanentAliasDisproof(rollingComparison, divergenceEvidence) {
  if (divergenceEvidence?.conclusion?.exactAliasDisproved !== true) return rollingComparison;
  return {
    ...rollingComparison,
    exactAliasDisproved: true,
    sameExactMeterDisproved: divergenceEvidence?.conclusion?.sameExactMeterDisproved === true,
    relatedOrCorrelatedPoolStillPossible: divergenceEvidence?.conclusion?.sharedOrCorrelatedMechanismStillPossible === true,
    divergenceObservedAt: divergenceEvidence?.observedAt || null,
    divergenceEvidenceFile: DIVERGENCE_EVIDENCE,
    divergenceAmountsEUR: {
      tiki: divergenceEvidence?.meters?.[PRIMARY_KEY]?.amountEUR ?? null,
      alice: divergenceEvidence?.meters?.[ALIAS_CANDIDATE_KEY]?.amountEUR ?? null,
    },
    verdict: 'NOT_EXACT_ALIAS_OBSERVED_DIVERGENCE',
    reason: 'A same-sample public observation contained different amounts for tikitemple2_1 and progressivealice1. That permanently disproves one exact instantaneous meter/alias. Similar change timing may still indicate a related or correlated progressive family, which remains unresolved.',
  };
}

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

export function closeTikiTemploLane({ ledger, identityProbe, divergenceEvidence = null }) {
  const meters = ledger?.meters || {};
  const primary = meters[PRIMARY_KEY] || null;
  const aliasCandidate = meters[ALIAS_CANDIDATE_KEY] || null;
  const rollingAlias = aliasComparison(primary, aliasCandidate);
  const alias = applyPermanentAliasDisproof(rollingAlias, divergenceEvidence);

  const tikiResult = (identityProbe?.results || []).find((r) => r.laneId === 'botemania-tiki-templo-progressive') || null;
  const howToPlay = tikiResult?.graphql?.games?.[0]?.howToPlay || '';
  const mechanism = analyzeJackpotMechanism(howToPlay);

  const identityClosure = {
    feedKey: PRIMARY_KEY,
    aliasCandidateKey: ALIAS_CANDIDATE_KEY,
    aliasCandidateRelationship: alias.exactAliasDisproved === true ? 'RELATED_OR_CORRELATED_POOL_UNRESOLVED' : 'UNRESOLVED',
    graphqlGameIdMatchesSlug: tikiResult?.identity?.graphqlGameIdMatchesSlug ?? null,
    providerIdRecovered: tikiResult?.identity?.providerIdRecovered ?? null,
    providerIds: tikiResult?.identity?.providerIds ?? null,
    feedIdLiteralFoundInHtml: tikiResult?.identity?.feedIdLiteralFoundInHtml ?? null,
    verified: false,
    reason: 'GraphQL game record and RTP/contribution text match Tiki Templo exactly (id, title, RTP range, contribution %), and providerId=roxor-gaming is recovered, but the live feed id string is never literally present in the public page/GraphQL payload. Exact in-game amount cross-match is still required.',
    manualNoBetVerificationInstruction: {
      steps: [
        'Abrir Tiki Templo en Botemania España. No hacer ningún giro.',
        'Sin apostar, hacer UNA sola captura de pantalla que muestre a la vez: nombre exacto del juego, el importe del Bote Progresivo visible en pantalla, y la denominación/apuesta seleccionada si aparece en esa misma pantalla.',
        'Cruzar el importe mostrado en la captura, al céntimo, contra el valor simultáneo de generic:tikitemple2_1 en la evidencia en vivo (misma ventana de tiempo).',
      ],
      prohibitedActions: ['No realizar ningún giro.', 'No depositar ni apostar para verificar identidad.'],
      upgradesIdentityTo: 'MANUAL_SCREENSHOT_LIVE_AMOUNT_CROSS_MATCH',
    },
  };

  const externalMechanismComparators = [
    {
      source: 'casinolistings.com - "Tiki Temple 1p Jackpot" (Gamesys network jackpot tracker)',
      note: 'Reports an average win of approximately £19,434, paid roughly every 3 days, for a 1p-denomination Gamesys Tiki Temple jackpot. Different denomination/branding/region from Botemania Spain; not exact tier or pHit evidence.',
      class: 'EXTERNAL_MECHANISM_COMPARATOR',
    },
    {
      source: 'wizardofpots.com - SCORE methodology',
      note: 'General progressive-jackpot prioritisation methodology covering Gamesys-family titles; not a Botemania Spain-specific pHit or tier disclosure.',
      class: 'EXTERNAL_MECHANISM_COMPARATOR',
    },
  ];

  const economicClosure = {
    blockerId: 'JACKPOT_HIT_PROBABILITY_NOT_PUBLICLY_DISCLOSED_FOR_BOTEMANIA_SPAIN',
    explanation: "Tiki Templo's progressive is a mystery chest-pick bonus. Botemania Spain discloses only that jackpot probability is proportional to stake, not exact bonus-trigger/per-tier hit probabilities or a Must-Hit-By cap. Broader Gamesys/Roxor-family sources hint at multi-tier mechanics, so the correct jackpot EV would require sum_i(p_i * award_i), not an assumed single pHit*jackpot term.",
    botemaniaSpainSourcesExhaustedFor: ['contentfulGame GraphQL howToPlay text', 'pageOrGame GraphQL howToPlay text', 'direct rules-page HTML fetch'],
    externalMechanismComparators,
    jackpotTierMappingVerified: false,
    empiricalPathBlocked: 'A hit/reset without a verified eligible-exposure denominator cannot identify per-spin pHit. Real-money play for data collection is forbidden.',
    mustHitByCapDisclosed: mechanism.mustHitByOrMustBeWonByLanguageFound,
    reactivationCriteria: [
      'A public technical/provider document surfaces the exact chest/bonus probability and tier structure for the Botemania Spain configuration.',
      'Confirmed local hit(s) are observed together with a verified eligible-exposure denominator sufficient to bound pHit empirically per tier.',
    ],
  };

  return {
    version: 'botemania-tiki-templo-closure-v1.1-alias-disproof-monotonic',
    laneId: 'botemania-tiki-templo-progressive',
    monitorKey: PRIMARY_KEY,
    aliasClosure: alias,
    jackpotMechanism: mechanism,
    identityClosure,
    economicClosure,
    blockers: ['JACKPOT_HIT_PROBABILITY_NOT_PUBLICLY_DISCLOSED_FOR_BOTEMANIA_SPAIN', 'JACKPOT_TIER_MAPPING_AND_HIT_PROBABILITIES_NOT_VERIFIED'],
    verdict: 'KILLED_NOT_CURRENTLY_ACTIONABLE',
    verdictReason: 'Economics cannot close because exact Botemania Spain tier probabilities are unknown. The former exact-alias hypothesis with progressivealice1 is separately disproved by same-sample amount divergence and is not used economically.',
    guards: { noBetting: true, noFabricatedProbability: true, noExternalMechanismSubstitutedAsBotemaniaFact: true, exactAliasDisproofIsMonotonic: true, realMoneyAllowed: false },
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const ledger = read(LEDGER);
  const identityProbe = read(IDENTITY_PROBE);
  const divergenceEvidence = read(DIVERGENCE_EVIDENCE);
  const result = closeTikiTemploLane({ ledger, identityProbe, divergenceEvidence });
  const out = { ...result, generatedAt: new Date().toISOString() };
  fs.mkdirSync('loterias-ai/edge-live/evidence', { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
  console.log(JSON.stringify({ alias: out.aliasClosure.verdict, identityVerified: out.identityClosure.verified, verdict: out.verdict }, null, 2));
}

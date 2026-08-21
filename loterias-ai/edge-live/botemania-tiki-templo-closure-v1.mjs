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

export function aliasComparison(a, b, fields = ALIAS_FIELDS) {
  if (!a || !b) return { comparable: false, verdict: 'UNRESOLVED', reason: 'MISSING_METER_DATA' };
  const mismatches = fields.filter((f) => JSON.stringify(a[f]) !== JSON.stringify(b[f]));
  const identical = mismatches.length === 0;
  const sampleSufficient = Number(a.observationCount) >= 10 && Number(a.changeCount) >= 3;
  return {
    comparable: true,
    fieldsCompared: fields,
    mismatches,
    identicalAcrossAllFields: identical,
    observationCount: a.observationCount,
    changeCount: a.changeCount,
    verdict: identical && sampleSufficient ? 'SAME_POOL_ALIAS_HIGH_CONFIDENCE' : identical ? 'SAME_POOL_ALIAS_LOW_SAMPLE' : 'DIVERGENT_NOT_ALIAS',
    reason: identical
      ? `Identical across all ${fields.length} tracked fields over ${a.observationCount} observations and ${a.changeCount} independent change events; two independent progressive meters matching to the cent across multiple independent change events by chance has negligible probability.`
      : 'At least one field differs between the two feed identities; treat as independent until proven otherwise.',
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

  const economicClosure = {
    blockerId: 'JACKPOT_HIT_PROBABILITY_NOT_PUBLICLY_DISCLOSED',
    explanation: "Tiki Templo's progressive is a mystery chest-pick bonus (3 Bono symbols trigger a bonus phase; pick 1 of 9 heads for a key, open 1 of 5 chests, one of which may hold the jackpot), with win probability described only qualitatively as \"proportional to stake\". No exact per-spin probability of landing the jackpot chest (pHit), no bonus-trigger frequency, and no Must-Hit-By/Must-Be-Won-By cap are published anywhere in the public rules text. The same EV structure already built for progressive video poker (breakEvenJackpotEUR = stakePerSpin * (1-baseRtp) / pHit) applies structurally, but pHit itself is the one input this investigation could not recover from any public source.",
    publicSourcesExhausted: ['contentfulGame GraphQL howToPlay text', 'pageOrGame GraphQL howToPlay text', 'direct rules-page HTML fetch (PR #214 and this closure)'],
    empiricalPathBlocked: 'No local reset/hit event has been prospectively observed yet (the ledger shows only increments across all recorded observations so far), so no empirical estimate of pHit exists either. Estimating pHit from real-money play is explicitly forbidden.',
    mustHitByCapDisclosed: mechanism.mustHitByOrMustBeWonByLanguageFound,
    reactivationCriteria: [
      'A public technical/provider document (Roxor Gaming or Bally-family paytable/odds disclosure) surfaces the exact chest/bonus probability.',
      'A clean, stable-identity local reset event is prospectively observed with enough surrounding spin/time data to bound pHit empirically.',
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
    verdict: 'KILLED_NOT_CURRENTLY_ACTIONABLE',
    verdictReason: 'Economics cannot close: the one missing input (per-spin probability of landing the progressive jackpot chest) is not publicly disclosed and has no safe empirical substitute without real-money play. This alone is sufficient to kill execution-grade closure regardless of the alias/identity outcome above.',
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

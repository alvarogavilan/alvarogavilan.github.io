import assert from 'node:assert/strict';
import {
  parseOperator,
  parseManufacturerFromCopyright,
  parseStakeRangeEUR,
  parseContributionFlatClaim,
  parseAveragePayoutProseEUR,
  buildWinfallEconomicsDossier,
} from '../casino/archive/botemania-winfall-economics-synthesis-v1.mjs';

const REAL_BET_CONTEXTS = [
  'Apuestas Deportivas Bingo Casino Online Slingo Todos Los Juegos Casino en Vivo Hasta 25€ y 200 Tiradas Gratis REGÍSTRATE Deposita y Juega Mín',
  'Apuestas)',
  'valor moneda disponible en Winfall Wishes Jackpot va de 25c a 25€',
  'apuestas',
  'Apuesta Total',
  'apuesta/s que contribuye al Bote Progresivo es siempre de 0,60%, independientemente del valor de tu apuesta',
  'apuestas, de media pagaremos entre 93,96 € en premios',
  'APUESTAS Operada por Gamesys Spain, S',
  'apuestas 403/GA/1104 y las licencias singulares para Apuestas deportivas de contrapartida 602/ADC/1030 y Otras apuestas de contrapartida 603/AOC/1030',
  'Apuestas haz clic aquí © 2026 Roxor Gaming Limited',
];

assert.equal(parseOperator(REAL_BET_CONTEXTS), 'Gamesys Spain');

{
  const m = parseManufacturerFromCopyright(REAL_BET_CONTEXTS);
  assert.equal(m.name, 'Roxor Gaming Limited');
  assert.equal(m.year, 2026);
}

{
  const r = parseStakeRangeEUR(REAL_BET_CONTEXTS);
  assert.equal(r.minStakeEUR, 0.25);
  assert.equal(r.maxStakeEUR, 25);
}

{
  const c = parseContributionFlatClaim(REAL_BET_CONTEXTS);
  assert.equal(c.flatRegardlessOfStakeClaimed, true);
  assert.equal(c.claimedPct, 0.6);
}

{
  const p = parseAveragePayoutProseEUR(REAL_BET_CONTEXTS);
  assert.equal(p.valueEUR, 93.96);
}

// Missing/unparseable text must fail closed to null, never throw.
assert.equal(parseOperator([]), null);
assert.equal(parseOperator(undefined), null);
assert.equal(parseManufacturerFromCopyright(['no copyright here']), null);
assert.equal(parseStakeRangeEUR(['no stake range here']), null);
assert.equal(parseContributionFlatClaim(['no contribution claim here']), null);
assert.equal(parseAveragePayoutProseEUR(['no payout prose here']), null);

// End-to-end synthesis: the real, already-known mismatch between Winfall's
// structured base RTP (94.85) and its own prose average-payout sentence
// (93.96, which is actually Bote de Secretos del Fénix's RTP) must be
// flagged, not silently swallowed or used to override the structured value.
{
  const census = { games: [{ slug: 'winfall-wishes-jackpot', betContexts: REAL_BET_CONTEXTS, capContexts: [] }] };
  const priority = { ranked: [{ slug: 'winfall-wishes-jackpot', baseRtpPct: 94.85, publishedBasePlusKnownContributionPct: 95.45, explicitProgressiveContributionPct: [0.6], anyStake: true, sharedNetwork: true }] };
  const triangulation = { hypothesis: { officiallySharedWith: ['Wonderland', 'La Isla de Tiki Templo'] }, pages: [{ slug: 'winfall-wishes-jackpot', dynamicSpecificMatches: [] }] };
  const identityBinding = { decision: { exactBindingCandidateFound: false, identityVerified: false } };

  const dossier = buildWinfallEconomicsDossier({ census, priority, triangulation, identityBinding });
  assert.equal(dossier.provider.operatorLicenseHolder, 'Gamesys Spain');
  assert.equal(dossier.provider.gameManufacturer, 'Roxor Gaming Limited');
  assert.equal(dossier.stake.minStakeEUR, 0.25);
  assert.equal(dossier.stake.maxStakeEUR, 25);
  assert.equal(dossier.rtp.baseRtpPctStructured, 94.85);
  assert.equal(dossier.rtp.averagePayoutProseEUR, 93.96);
  assert.equal(dossier.rtp.prosePayoutMismatchesStructuredRtp, true);
  assert.ok(dossier.rtp.note, 'a mismatch must always carry an explanatory note');
  assert.deepEqual(dossier.sharedNetwork.officiallyClaimedPartners, ['Wonderland', 'La Isla de Tiki Templo']);
  assert.equal(dossier.sharedNetwork.renderedDomTriangulationFoundDynamicSpecificMatch, false);
  assert.equal(dossier.liveIdentityBinding.identityVerified, false);
  assert.ok(dossier.stillUnknown.publicWinnerHistory);
}

// Missing source files (census/priority/triangulation/identityBinding all
// null) must fail closed to a fully-null dossier, never throw.
{
  const dossier = buildWinfallEconomicsDossier({ census: null, priority: null, triangulation: null, identityBinding: null });
  assert.equal(dossier.provider.operatorLicenseHolder, null);
  assert.equal(dossier.rtp.baseRtpPctStructured, null);
  assert.equal(dossier.rtp.prosePayoutMismatchesStructuredRtp, null);
  assert.equal(dossier.liveIdentityBinding.probeRun, false);
}

console.log('winfall-economics-synthesis-v1.test.mjs: PASS');

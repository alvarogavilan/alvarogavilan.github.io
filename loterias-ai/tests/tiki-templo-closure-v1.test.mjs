import assert from 'node:assert/strict';
import { aliasComparison, analyzeJackpotMechanism, closeTikiTemploLane } from '../edge-live/botemania-tiki-templo-closure-v1.mjs';

// Identical meters across enough observations/changes must resolve as a
// high-confidence alias, not two independent opportunities.
{
  const a = { currentAmountEUR: 1048.23, previousAmountEUR: 1048.21, firstSeenAt: 't0', lastObservedAt: 't1', lastChangedAt: 't1', observationCount: 60, changeCount: 6 };
  const b = { ...a };
  const r = aliasComparison(a, b);
  assert.equal(r.identicalAcrossAllFields, true);
  assert.equal(r.verdict, 'SAME_POOL_ALIAS_HIGH_CONFIDENCE');
}

// Identical but with too few observations/changes must not overclaim confidence.
{
  const a = { currentAmountEUR: 10, previousAmountEUR: 10, firstSeenAt: 't0', lastObservedAt: 't1', lastChangedAt: 't1', observationCount: 2, changeCount: 1 };
  const b = { ...a };
  const r = aliasComparison(a, b);
  assert.equal(r.verdict, 'SAME_POOL_ALIAS_LOW_SAMPLE');
}

// Any divergent field must break the alias claim.
{
  const a = { currentAmountEUR: 1048.23, previousAmountEUR: 1048.21, firstSeenAt: 't0', lastObservedAt: 't1', lastChangedAt: 't1', observationCount: 60, changeCount: 6 };
  const b = { ...a, currentAmountEUR: 999.99 };
  const r = aliasComparison(a, b);
  assert.equal(r.identicalAcrossAllFields, false);
  assert.equal(r.verdict, 'DIVERGENT_NOT_ALIAS');
  assert.deepEqual(r.mismatches, ['currentAmountEUR']);
}

// Missing meter data must fail closed to UNRESOLVED, never silently "same".
{
  const r = aliasComparison(null, { currentAmountEUR: 1 });
  assert.equal(r.comparable, false);
  assert.equal(r.verdict, 'UNRESOLVED');
}

// Mechanism detection: the real Tiki Templo howToPlay text describes a
// chest-pick bonus with stake-proportional odds and no MHB/MBWB cap language.
{
  const realish = 'El Bote Progresivo de Tiki Templo se puede ganar en tres sencillos pasos: elige uno de los cinco cofres. El Bote Progresivo puede ganarse con cualquier apuesta. Las probabilidades de llevarte el Bote son proporcionales a tu apuesta.';
  const m = analyzeJackpotMechanism(realish);
  assert.equal(m.mentionsChestPickBonus, true);
  assert.equal(m.mentionsProbabilityProportionalToStake, true);
  assert.equal(m.mustHitByOrMustBeWonByLanguageFound, false);
}

// A text that DOES disclose a must-hit-by/must-be-won-by cap must be flagged,
// since that would change the EV model entirely (deadline-driven hazard vs a
// flat per-spin hit probability).
{
  const capped = 'El bote debe ganarse antes de que llegue a 5.000 EUR.';
  const m = analyzeJackpotMechanism(capped);
  assert.equal(m.mustHitByOrMustBeWonByLanguageFound, true);
}

// Empty/missing howToPlay text must not crash and must report no evidence.
{
  const m = analyzeJackpotMechanism(undefined);
  assert.equal(m.rawExcerptPresent, false);
  assert.equal(m.mentionsChestPickBonus, false);
}

// End-to-end closure: given fixtures shaped like the real committed evidence,
// the lane must close as KILLED_NOT_CURRENTLY_ACTIONABLE, never a fabricated
// EXECUTION_GRADE, since pHit is never present anywhere in the fixture.
{
  const ledger = {
    meters: {
      'generic:tikitemple2_1': { currentAmountEUR: 1048.23, previousAmountEUR: 1048.21, firstSeenAt: 't0', lastObservedAt: 't1', lastChangedAt: 't1', observationCount: 60, changeCount: 6 },
      'generic:progressivealice1': { currentAmountEUR: 1048.23, previousAmountEUR: 1048.21, firstSeenAt: 't0', lastObservedAt: 't1', lastChangedAt: 't1', observationCount: 60, changeCount: 6 },
    },
  };
  const identityProbe = {
    results: [{
      laneId: 'botemania-tiki-templo-progressive',
      identity: { graphqlGameIdMatchesSlug: true, providerIdRecovered: true, providerIds: ['roxor-gaming'], feedIdLiteralFoundInHtml: false },
      graphql: { games: [{ howToPlay: 'Elige uno de los cinco cofres. Las probabilidades de llevarte el Bote son proporcionales a tu apuesta.' }] },
    }],
  };
  const result = closeTikiTemploLane({ ledger, identityProbe });
  assert.equal(result.verdict, 'KILLED_NOT_CURRENTLY_ACTIONABLE');
  assert.equal(result.aliasClosure.verdict, 'SAME_POOL_ALIAS_HIGH_CONFIDENCE');
  assert.equal(result.identityClosure.verified, false);
  assert.ok(Array.isArray(result.identityClosure.manualNoBetVerificationInstruction.steps) && result.identityClosure.manualNoBetVerificationInstruction.steps.length > 0);
  assert.equal(result.economicClosure.blockerId, 'JACKPOT_HIT_PROBABILITY_NOT_PUBLICLY_DISCLOSED');
}

// Missing evidence entirely must still return a well-formed, fail-closed result.
{
  const result = closeTikiTemploLane({ ledger: null, identityProbe: null });
  assert.equal(result.verdict, 'KILLED_NOT_CURRENTLY_ACTIONABLE');
  assert.equal(result.aliasClosure.verdict, 'UNRESOLVED');
}

console.log('tiki-templo-closure-v1.test.mjs: PASS');

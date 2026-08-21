import assert from 'node:assert/strict';
import { findStateBlobs, findParameterizedJackpotQuery, findLiteralIdHits, summarizeCandidates } from '../casino/jackpots/botemania-winfall-wishes-identity-binding-probe-v1.mjs';

// findStateBlobs: must correctly extract a bounded, balanced JSON object
// after a known SSR/hydration marker, and must not falsely match text that
// merely mentions the marker name without a following object.
{
  const html = `<html><script>window.__NEXT_DATA__={"a":1,"b":{"c":2}};</script></html>`;
  const hits = findStateBlobs(html);
  assert.equal(hits.length, 1);
  assert.equal(hits[0].marker, '__NEXT_DATA__');
  assert.equal(hits[0].parsedOk, true);
}
{
  const html = `<html>talking about __APOLLO_STATE__ but no object follows</html>`;
  const hits = findStateBlobs(html);
  assert.equal(hits.length, 0);
}
// Must not hang or crash on adversarial input with many braces and no marker.
{
  const adversarial = '{'.repeat(50000) + '}'.repeat(50000);
  const t0 = Date.now();
  const hits = findStateBlobs(adversarial);
  assert.ok(Date.now() - t0 < 2000, 'must stay fast on brace-heavy input with no marker present');
  assert.equal(hits.length, 0);
}

// findParameterizedJackpotQuery: only counts a hit when BOTH a game-selector
// variable AND a query/mutation keyword appear near "jackpot" - a bare
// mention of "jackpot" alone (e.g. marketing copy) must not count.
{
  // "jackpot" appears exactly once so this asserts exactly one anchor hit;
  // the real script may report >1 hit when "jackpot" recurs (e.g. inside an
  // operation name too) - that's fine, callers only check hits.length > 0.
  const withVar = 'query GetGamePot($gameId: String!) { jackpot(gameId: $gameId) { id amount } }';
  assert.equal(findParameterizedJackpotQuery(withVar).length, 1);
}
{
  const bareMention = 'Gana el Bote Progresivo jackpot con cualquier apuesta.';
  assert.equal(findParameterizedJackpotQuery(bareMention).length, 0);
}
{
  const queryNoVar = 'query LoadJackpots { jackpots { id amount } }';
  assert.equal(findParameterizedJackpotQuery(queryNoVar).length, 0, 'a query mentioning jackpot without a per-game selector variable is the already-known generic/shared query, not a binding candidate');
}

// findLiteralIdHits: exact substring match only, never a partial/fuzzy match.
{
  const text = 'embedded id tikitemple2_1 somewhere';
  const hits = findLiteralIdHits(text, ['tikitemple2_1', 'progressivealice1']);
  assert.equal(hits.length, 1);
  assert.equal(hits[0].id, 'tikitemple2_1');
}

// summarizeCandidates: the core anti-p-hacking logic. A literal ID or
// parameterized query found on the primary target must be discarded as a
// candidate if either control also has it - a shared/global response must
// never count as a binding.
{
  const primary = { role: 'PRIMARY_TARGET', pageLiteralIdHits: [{ id: 'X1' }], scriptResults: [], pageParamHits: [{}], contentfulGame: { jackpotFieldNonNull: false } };
  const control1 = { role: 'CONTROL_A', pageLiteralIdHits: [], scriptResults: [], pageParamHits: [], contentfulGame: { jackpotFieldNonNull: false } };
  const control2 = { role: 'CONTROL_B', pageLiteralIdHits: [], scriptResults: [], pageParamHits: [], contentfulGame: { jackpotFieldNonNull: false } };
  const s = summarizeCandidates([primary, control1, control2]);
  assert.equal(s.candidatesFound, 1);
  assert.deepEqual(s.candidates, ['X1']);
  assert.equal(s.parameterizedQuerySpecificToPrimary, true);
}
{
  // Same literal id also appears on a control -> must be excluded.
  const primary = { role: 'PRIMARY_TARGET', pageLiteralIdHits: [{ id: 'X1' }], scriptResults: [], pageParamHits: [], contentfulGame: { jackpotFieldNonNull: false } };
  const control1 = { role: 'CONTROL_A', pageLiteralIdHits: [{ id: 'X1' }], scriptResults: [], pageParamHits: [], contentfulGame: { jackpotFieldNonNull: false } };
  const control2 = { role: 'CONTROL_B', pageLiteralIdHits: [], scriptResults: [], pageParamHits: [], contentfulGame: { jackpotFieldNonNull: false } };
  const s = summarizeCandidates([primary, control1, control2]);
  assert.equal(s.candidatesFound, 0);
  assert.deepEqual(s.controlsReproducedSameLiteralIds, ['X1']);
}
{
  // Parameterized query present on primary AND a control -> not specific, not a candidate signal.
  const primary = { role: 'PRIMARY_TARGET', pageLiteralIdHits: [], scriptResults: [], pageParamHits: [{}], contentfulGame: { jackpotFieldNonNull: false } };
  const control1 = { role: 'CONTROL_A', pageLiteralIdHits: [], scriptResults: [{ paramHits: [{}], literalIdHits: [] }], pageParamHits: [], contentfulGame: { jackpotFieldNonNull: false } };
  const control2 = { role: 'CONTROL_B', pageLiteralIdHits: [], scriptResults: [], pageParamHits: [], contentfulGame: { jackpotFieldNonNull: false } };
  const s = summarizeCandidates([primary, control1, control2]);
  assert.equal(s.parameterizedQuerySpecificToPrimary, false);
  assert.equal(s.controlsAlsoHaveParameterizedJackpotQuery, true);
}
// Missing primary must fail closed, never throw or fabricate a candidate.
{
  const s = summarizeCandidates([{ role: 'CONTROL_A', pageLiteralIdHits: [], scriptResults: [] }]);
  assert.equal(s.candidatesFound, 0);
  assert.deepEqual(s.candidates, []);
}

console.log('winfall-wishes-identity-binding-v1.test.mjs: PASS');

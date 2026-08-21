import assert from 'node:assert/strict';
import { parseRtpPctsFromContexts } from '../casino/archive/botemania-rtp-pct-parser-v1.mjs';

// Real bug: La Isla de Tiki Trópico Dorado's own page text has no "%" next
// to the base RTP figure, only next to the contribution. Both numbers must
// be recovered, and the base one must be the one >=70 (contribution stays
// small, per the existing downstream `v>=70&&v<100` selection elsewhere).
{
  const ctx = ['Porcentaje de Retorno al Jugador (RTP) Porcentaje de Retorno al Jugador: 95,39 (Base) Contribución al Bote: 0,38% El porcentaje de retorno esperado es la cantidad que pagamos a los jugadores en proporción con la cantidad apostada en el juego'];
  const pcts = parseRtpPctsFromContexts(ctx);
  assert.ok(pcts.includes(95.39), `expected 95.39 to be recovered even without a trailing %, got ${JSON.stringify(pcts)}`);
  assert.ok(pcts.includes(0.38));
}

// Regression: the normal case (a literal "%" right after the number) must
// keep working exactly as before.
{
  const ctx = ['Porcentaje de Retorno al Jugador: 94,85% (base)'];
  assert.deepEqual(parseRtpPctsFromContexts(ctx), [94.85]);
}

// A range-shaped context (two numbers, both with "%") must still recover both.
{
  const ctx = ['Porcentaje de Retorno al Jugador: 80,51 % - 88,21 % (Base) Contribución al Bote: 6,70%'];
  const pcts = parseRtpPctsFromContexts(ctx);
  assert.deepEqual(pcts.sort((a, b) => a - b), [6.7, 80.51, 88.21]);
}

// Out-of-range numbers (>=100, or 0) must never be included, even if they
// happen to be followed by "(base)" somehow in adversarial input. A 3-digit
// integer like "100" must never be read as a 2-digit number by matching only
// its last two digits.
{
  const ctx = ['Some unrelated figure: 100 (base) and 0 (base)'];
  assert.deepEqual(parseRtpPctsFromContexts(ctx), []);
}

// Empty/missing contexts must fail closed to an empty array, never throw.
assert.deepEqual(parseRtpPctsFromContexts([]), []);
assert.deepEqual(parseRtpPctsFromContexts(undefined), []);
assert.deepEqual(parseRtpPctsFromContexts(null), []);

// Duplicate values across multiple contexts must be deduplicated.
{
  const ctx = ['RTP: 95,00% aquí', 'y también RTP: 95,00% otra vez'];
  assert.deepEqual(parseRtpPctsFromContexts(ctx), [95]);
}

console.log('rtp-pct-parser-v1.test.mjs: PASS');

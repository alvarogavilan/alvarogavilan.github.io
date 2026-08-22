import assert from 'node:assert/strict';
import {
  parseGraphqlBody,
  detectResetEvents,
  evaluateTikiAlicePairedReset,
  jpkJointCapture,
  TIKI_ALICE_FROZEN_GATE,
  RESET_DROP_FRACTION_THRESHOLD,
} from '../mobile/edge-live-watch/core-v1.mjs';

// parseGraphqlBody: normal case
{
  const body = { data: { jackpots: [{ id: 'pool1', amount: 212.09 }], redTigerJackpots: [], blueprintJackpots: [{ id: 'JACKPOTKING', amount: 128000 }] } };
  const { currentByKey, ambiguousKeys } = parseGraphqlBody(body);
  assert.equal(currentByKey['generic:pool1'].amountEUR, 212.09);
  assert.equal(currentByKey['blueprint:JACKPOTKING'].amountEUR, 128000);
  assert.deepEqual(ambiguousKeys, []);
}

// parseGraphqlBody: alias collapse (equal amounts) vs ambiguous (differing amounts)
{
  const body = {
    data: {
      jackpots: [{ id: 'dup1', amount: 5 }, { id: 'dup1', amount: 5 }, { id: 'ambig1', amount: 5 }, { id: 'ambig1', amount: 7 }],
      redTigerJackpots: [], blueprintJackpots: [],
    },
  };
  const { currentByKey, ambiguousKeys } = parseGraphqlBody(body);
  assert.equal(currentByKey['generic:dup1'].amountEUR, 5);
  assert.equal(currentByKey['generic:ambig1'], undefined);
  assert.deepEqual(ambiguousKeys, ['generic:ambig1']);
}

// parseGraphqlBody: malformed entries fail closed (dropped, not thrown)
{
  const body = { data: { jackpots: [{ id: '', amount: 5 }, { id: 'x', amount: 'not-a-number' }, { amount: 5 }], redTigerJackpots: null, blueprintJackpots: undefined } };
  const { rows } = parseGraphqlBody(body);
  assert.deepEqual(rows, []);
}
assert.deepEqual(parseGraphqlBody(null).rows, []);
assert.deepEqual(parseGraphqlBody({}).rows, []);

// detectResetEvents: real threshold behavior (>=20% drop required)
{
  const prev = { 'generic:pool1': { network: 'generic', id: 'pool1', amountEUR: 100 } };
  const cur79 = { 'generic:pool1': { network: 'generic', id: 'pool1', amountEUR: 79 } }; // 21% drop -> reset
  const cur81 = { 'generic:pool1': { network: 'generic', id: 'pool1', amountEUR: 81 } }; // 19% drop -> not a reset
  assert.equal(detectResetEvents(cur79, prev, 't2', 't1').length, 1);
  assert.equal(detectResetEvents(cur81, prev, 't2', 't1').length, 0);
}

// detectResetEvents: growth, equal, or missing prior never counts as a reset
{
  const prev = { 'generic:x': { network: 'generic', id: 'x', amountEUR: 10 } };
  assert.equal(detectResetEvents({ 'generic:x': { network: 'generic', id: 'x', amountEUR: 15 } }, prev, 't2', 't1').length, 0);
  assert.equal(detectResetEvents({ 'generic:x': { network: 'generic', id: 'x', amountEUR: 10 } }, prev, 't2', 't1').length, 0);
  assert.equal(detectResetEvents({ 'generic:x': { network: 'generic', id: 'x', amountEUR: 1 } }, {}, 't2', 't1').length, 0);
}

// evaluateTikiAlicePairedReset: the real frozen gate values replay as a match
{
  const events = [
    { key: 'generic:tikitemple2_1', observedAt: 'T', previousAmountEUR: 1208.43, currentAmountEUR: 2.82 },
    { key: 'generic:progressivealice1', observedAt: 'T', previousAmountEUR: 1208.43, currentAmountEUR: 2.82 },
  ];
  const r = evaluateTikiAlicePairedReset(events);
  assert.equal(r.status, 'PROSPECTIVE_PAIRED_RESET_CANDIDATE');
  assert.equal(r.exactAliasVerified, false);
  assert.equal(r.evEnabled, false);
  assert.equal(r.realMoneyAllowed, false);
  assert.equal(r.forFeed, 'tiki-alice-paired-reset-relationship-v1');
}

// evaluateTikiAlicePairedReset: never a false positive on mismatched timestamps, amounts, or a lone reset
{
  const tikiOnly = [{ key: 'generic:tikitemple2_1', observedAt: 'T', previousAmountEUR: 100, currentAmountEUR: 1 }];
  assert.equal(evaluateTikiAlicePairedReset(tikiOnly), null);

  const mismatchedTime = [
    { key: 'generic:tikitemple2_1', observedAt: 'T1', previousAmountEUR: 100, currentAmountEUR: 1 },
    { key: 'generic:progressivealice1', observedAt: 'T2', previousAmountEUR: 100, currentAmountEUR: 1 },
  ];
  assert.equal(evaluateTikiAlicePairedReset(mismatchedTime), null);

  const mismatchedAmounts = [
    { key: 'generic:tikitemple2_1', observedAt: 'T', previousAmountEUR: 1062.65, currentAmountEUR: 1 },
    { key: 'generic:progressivealice1', observedAt: 'T', previousAmountEUR: 1062.79, currentAmountEUR: 1 },
  ];
  // Real historical divergence (1062.65 vs 1062.79) must NOT be treated as a match under a 0.01 tolerance.
  assert.equal(evaluateTikiAlicePairedReset(mismatchedAmounts), null);
}

// jpkJointCapture: complete only when all three tiers are present together
{
  const full = { 'blueprint:JACKPOTKING': { amountEUR: 1 }, 'blueprint:JACKPOTKING_REGAL': { amountEUR: 2 }, 'blueprint:JACKPOTKING_ROYAL': { amountEUR: 3 } };
  assert.equal(jpkJointCapture(full).complete, true);
  const partial = { 'blueprint:JACKPOTKING': { amountEUR: 1 } };
  assert.equal(jpkJointCapture(partial).complete, false);
  assert.equal(jpkJointCapture(partial).rows['blueprint:JACKPOTKING_REGAL'], null);
}

assert.equal(RESET_DROP_FRACTION_THRESHOLD, 0.20);
assert.equal(TIKI_ALICE_FROZEN_GATE.independentPairedResetCount, 1);
assert.equal(TIKI_ALICE_FROZEN_GATE.requiredForPromotion, 2);

console.log('edge-mobile-watch-core-v1.test.mjs: PASS');

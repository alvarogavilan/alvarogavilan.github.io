import assert from 'node:assert/strict';
import { rolldownEvPerTicket, clampNonNegative, EUROMILLONES_CAP_ROLLDOWN_MECHANISM } from '../casino/jackpots/lottery-rolldown-ev-engine-v1.mjs';

assert.equal(clampNonNegative(5), 5);
assert.equal(clampNonNegative(-5), 0);
assert.equal(clampNonNegative(NaN), 0);

// Hand-computed: expectedWinners=100, fundPerWinner=10000, evBoost/ticket=10, /euro=5, totalRtp=5.5
{
  const r = rolldownEvPerTicket({ redistributedFundEUR: 1000000, pCategory: 0.001, expectedTotalTickets: 100000, ticketPriceEUR: 2, baseRtp: 0.5 });
  assert.equal(r.blocked, false);
  assert.equal(r.expectedWinners, 100);
  assert.equal(r.lowSampleWarning, false);
  assert.ok(Math.abs(r.evBoostPerTicket - 10) < 1e-9);
  assert.ok(Math.abs(r.totalRtp - 5.5) < 1e-9);
  assert.equal(r.verdict, 'CANDIDATE_PLAY');
}

// Low expected-winner count must force NO_PLAY even if the point-estimate RTP clears 100%
{
  const r = rolldownEvPerTicket({ redistributedFundEUR: 1000000, pCategory: 0.001, expectedTotalTickets: 1000, ticketPriceEUR: 2, baseRtp: 0.5 });
  assert.equal(r.expectedWinners, 1);
  assert.equal(r.lowSampleWarning, true);
  assert.equal(r.verdict, 'NO_PLAY');
}

// Missing input must block instead of producing NaN
assert.equal(rolldownEvPerTicket({ redistributedFundEUR: 1000000, pCategory: NaN, expectedTotalTickets: 1000, ticketPriceEUR: 2, baseRtp: 0.5 }).blocked, true);

// The tracked mechanism record must not claim primary-source confirmation or current activity it hasn't earned
assert.equal(EUROMILLONES_CAP_ROLLDOWN_MECHANISM.primarySourceConfirmed, false);
assert.equal(EUROMILLONES_CAP_ROLLDOWN_MECHANISM.currentlyActive, false);

console.log('lottery-rolldown-ev-engine-v1.test.mjs: PASS');

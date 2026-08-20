import assert from 'node:assert/strict';
import {
  rolldownEvPerTicket,
  exactTargetCategoryFundEvPerTicket,
  clampNonNegative,
  EUROMILLONES_CAP_ROLLDOWN_MECHANISM,
} from '../casino/jackpots/lottery-rolldown-ev-engine-v1.mjs';

assert.equal(clampNonNegative(5), 5);
assert.equal(clampNonNegative(-5), 0);
assert.equal(clampNonNegative(NaN), 0);

{
  const r = rolldownEvPerTicket({
    redistributedFundEUR: 1000000,
    pCategory: 0.001,
    totalTickets: 100000,
    ticketPriceEUR: 2,
    baseRtpExcludingRedistribution: 0.5,
  });
  assert.equal(r.blocked, false);
  assert.equal(r.expectedWinners, 100);
  assert.equal(r.lowSampleWarning, false);
  assert.ok(Math.abs(r.evBoostPerTicket - 10) < 1e-8);
  assert.ok(Math.abs(r.totalRtp - 5.5) < 1e-8);
  assert.equal(r.verdict, 'CANDIDATE_PLAY');
  assert.equal(r.conservativeBecauseLowerCategoryCascadeOmitted, true);
}

{
  const f = exactTargetCategoryFundEvPerTicket({ redistributedFundEUR: 1000000, pCategory: 0.001, totalTickets: 1000 });
  assert.equal(f.blocked, false);
  assert.equal(f.expectedWinners, 1);
  assert.ok(Math.abs(f.pAtLeastOneWinner - (1 - (0.999 ** 1000))) < 1e-9);
  assert.ok(Math.abs(f.evFundPerTicket - (1000000 * (1 - 0.999 ** 1000) / 1000)) < 1e-6);

  const r = rolldownEvPerTicket({
    redistributedFundEUR: 1000000,
    pCategory: 0.001,
    totalTickets: 1000,
    ticketPriceEUR: 2,
    baseRtpExcludingRedistribution: 0.5,
  });
  assert.equal(r.expectedWinners, 1);
  assert.equal(r.lowSampleWarning, true);
  assert.equal(r.verdict, 'NO_PLAY');
}

assert.equal(rolldownEvPerTicket({ redistributedFundEUR: 1000000, pCategory: NaN, totalTickets: 1000, ticketPriceEUR: 2, baseRtpExcludingRedistribution: 0.5 }).blocked, true);
assert.equal(exactTargetCategoryFundEvPerTicket({ redistributedFundEUR: 1000000, pCategory: 0.001, totalTickets: 1000.5 }).blocked, true);

assert.equal(EUROMILLONES_CAP_ROLLDOWN_MECHANISM.primarySourceConfirmed, true);
assert.equal(EUROMILLONES_CAP_ROLLDOWN_MECHANISM.capEUR, 250000000);
assert.equal(EUROMILLONES_CAP_ROLLDOWN_MECHANISM.currentlyActive, false);
assert.equal(EUROMILLONES_CAP_ROLLDOWN_MECHANISM.guards.realMoneyAllowed, false);

console.log('lottery-rolldown-ev-engine-v1.test.mjs: PASS');

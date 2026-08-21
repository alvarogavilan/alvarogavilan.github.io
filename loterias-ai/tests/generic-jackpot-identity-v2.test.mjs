import assert from 'node:assert/strict';
import { canonicalizeGenericRows, detectStableDrops } from '../casino/jackpots/generic-jackpot-identity-v2.mjs';

{
  const { tracks, quarantined } = canonicalizeGenericRows([
    { id: 'WAGER_BET', amountEUR: 3448.25 },
    { id: 'WAGER_BET', amountEUR: 3448.25 },
    { id: 'JACKPOT', amountEUR: 1500 },
    { id: 'JACKPOT', amountEUR: 15000 },
  ]);
  assert.equal(tracks.length, 1);
  assert.equal(tracks[0].trackKey, 'generic:WAGER_BET');
  assert.equal(tracks[0].collapsedAliasRows, 1);
  assert.equal(tracks[0].identityClass, 'EXACT_NETWORK_PLUS_UNIQUE_ID');
  assert.equal(quarantined.length, 1);
  assert.equal(quarantined[0].id, 'JACKPOT');
  assert.deepEqual(quarantined[0].distinctAmounts, [1500, 15000]);
  assert.ok(!JSON.stringify({ tracks, quarantined }).includes('::0'));
  assert.ok(!JSON.stringify({ tracks, quarantined }).includes('::1'));
}

{
  const prior = canonicalizeGenericRows([{ id: 'WAGER_BET', amountEUR: 3500 }]).tracks;
  const current = canonicalizeGenericRows([{ id: 'WAGER_BET', amountEUR: 3400 }]).tracks;
  const events = detectStableDrops({ currentTracks: current, priorTracks: prior, observedAt: '2026-08-21T00:00:00.000Z' });
  assert.equal(events.length, 1);
  assert.equal(events[0].trackKey, 'generic:WAGER_BET');
  assert.equal(events[0].identityClass, 'EXACT_NETWORK_PLUS_UNIQUE_ID');
  assert.equal(events[0].classification, 'UNCLASSIFIED_DROP_CANDIDATE');
}

{
  const prior = canonicalizeGenericRows([{ id: 'JACKPOT', amountEUR: 1000 }, { id: 'JACKPOT', amountEUR: 10000 }]).tracks;
  const current = canonicalizeGenericRows([{ id: 'JACKPOT', amountEUR: 500 }, { id: 'JACKPOT', amountEUR: 11000 }]).tracks;
  assert.equal(prior.length, 0);
  assert.equal(current.length, 0);
  assert.equal(detectStableDrops({ currentTracks: current, priorTracks: prior, observedAt: '2026-08-21T00:00:00.000Z' }).length, 0);
}

console.log('generic-jackpot-identity-v2.test.mjs: PASS');

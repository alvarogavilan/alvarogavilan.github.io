#!/usr/bin/env node
import assert from 'node:assert/strict';
import { classifyTierTransition, summarizeTierResets } from './jpk-reset-classifier-core-v2.mjs';

const classify = (overrides = {}) => classifyTierTransition({
  tier: 'ROYAL',
  from: 2000,
  to: 600,
  siblingTier: 'REGAL',
  siblingFrom: 15000,
  siblingTo: 15005,
  jackpotKingFrom: 120000,
  jackpotKingTo: 120100,
  ...overrides,
});

{
  const x = classify({
    from: 1634.12,
    to: 1633.76,
    siblingFrom: 15491.22,
    siblingTo: 15490.86,
    jackpotKingFrom: 128000,
    jackpotKingTo: 127998.89,
  });
  assert.equal(x.rawNegativeMove, true);
  assert.equal(x.materialTierDropCandidate, false);
  assert.equal(x.cleanSingleTierCandidate, false);
  assert.equal(x.classification, 'BROAD_SOURCE_DISCONTINUITY');
}

{
  const x = classify({
    from: 1665.76,
    to: 1663.47,
    siblingFrom: 15522.86,
    siblingTo: 15476.17,
    jackpotKingFrom: 128500,
    jackpotKingTo: 128097.86,
  });
  assert.equal(x.materialTierDropCandidate, false);
  assert.equal(x.classification, 'BROAD_SOURCE_DISCONTINUITY');
}

{
  const x = classify();
  assert.equal(x.materialTierDropCandidate, true);
  assert.equal(x.cleanSingleTierCandidate, true);
  assert.equal(x.classification, 'CLEAN_SINGLE_TIER_RESET_CANDIDATE');
  assert.equal(x.usableForSpainHazardValidation, true);
}

{
  const rows = Array.from({ length: 10 }, (_, i) => classify({
    from: 2000 + i,
    to: 600,
    siblingFrom: 15000 + i,
    siblingTo: 15005 + i,
    jackpotKingFrom: 120000 + i,
    jackpotKingTo: 120100 + i,
  }));
  const s = summarizeTierResets(rows);
  assert.equal(s.royal, 10);
  assert.equal(s.regal, 0);
  assert.equal(s.royalHazardFitReady, true);
  assert.equal(s.regalHazardFitReady, false);
  assert.equal(s.anyTierHazardFitReady, true);
  assert.equal(s.hazardFitReady, false, '10 Royal resets must never make pooled JPK hazard ready');
  assert.equal(s.noCrossTierPooling, true);
}

{
  const royalRows = Array.from({ length: 10 }, () => classify());
  const regalRows = Array.from({ length: 10 }, () => classify({
    tier: 'REGAL',
    from: 20000,
    to: 6000,
    siblingTier: 'ROYAL',
    siblingFrom: 2000,
    siblingTo: 2005,
  }));
  const s = summarizeTierResets([...royalRows, ...regalRows]);
  assert.equal(s.royalHazardFitReady, true);
  assert.equal(s.regalHazardFitReady, true);
  assert.equal(s.hazardFitReady, true);
}

console.log('jpk-reset-classifier-core-v2: ok');

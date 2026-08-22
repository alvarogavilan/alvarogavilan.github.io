import assert from 'node:assert/strict';
import fs from 'node:fs';
import { extractProgressiveContributionPcts } from '../casino/archive/progressive-contribution-core-v1.mjs';

assert.deepEqual(
  extractProgressiveContributionPcts('Retorno para el Jugador: 91,51 % Contribución al Bote: 0,49%'),
  [0.49],
);
assert.deepEqual(
  extractProgressiveContributionPcts('Porcentaje de Retorno para el Jugador: 93,03% + 1,92% (contribución al Bote)'),
  [1.92],
);
assert.deepEqual(
  extractProgressiveContributionPcts('RTP: 95,39 (Base) Contribución al Bote: 0,38%'),
  [0.38],
);
assert.deepEqual(
  extractProgressiveContributionPcts('RTP: 94,85% (base)'),
  [],
);

const evidence=JSON.parse(fs.readFileSync('loterias-ai/casino/archive/evidence/botemania-zero-reset-priority-v1.json','utf8'));
const bySlug=new Map((evidence.ranked||[]).map(row=>[row.slug,row]));
const boteman=bySlug.get('boteman');
const duble=bySlug.get('duble-buble-bote-triple');
assert.ok(boteman?.rtpContexts?.length, 'Boteman archived operator RTP context is required');
assert.ok(duble?.rtpContexts?.length, 'Duble Buble archived operator RTP context is required');
assert.deepEqual(extractProgressiveContributionPcts(boteman.rtpContexts.join(' ')),[1.92]);
assert.deepEqual(extractProgressiveContributionPcts(duble.rtpContexts.join(' ')),[0.49]);
assert.equal(Number((boteman.baseRtpPct+1.92).toFixed(2)),94.95);
assert.equal(Number((duble.baseRtpPct+0.49).toFixed(2)),92.00);

const networkMap=JSON.parse(fs.readFileSync('loterias-ai/casino/archive/evidence/botemania-progressive-network-map-v1.json','utf8'));
const resetZeroCount=(networkMap.rows||[]).filter(row=>row.resetZero===true).length;
assert.ok(resetZeroCount>0, 'archived network map must expose the known zero-reset family');
const globalGateSource=fs.readFileSync('loterias-ai/casino/botemania-global-economic-gate-v1.mjs','utf8');
assert.match(globalGateSource,/const MAP='loterias-ai\/casino\/archive\/evidence\/botemania-progressive-network-map-v1\.json'/);
assert.doesNotMatch(globalGateSource,/const MAP='loterias-ai\/casino\/jackpots\/evidence\/botemania-progressive-network-map-v1\.json'/);

console.log('progressive-contribution-parser-v1.test.mjs: PASS');

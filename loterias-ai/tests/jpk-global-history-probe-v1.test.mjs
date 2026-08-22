import assert from 'node:assert/strict';
import {normalizeMoney,extractJpkWinCandidates,discoverCandidateResources} from '../casino/jackpots/jpk-global-history-probe-v1.mjs';

assert.deepEqual(normalizeMoney('£3,024'),{currency:'£',amount:3024});
assert.deepEqual(normalizeMoney('€3.024,50'),{currency:'€',amount:3024.5});
assert.equal(normalizeMoney('not money'),null);

const html=`
<html><head><script src="/_next/static/chunks/jackpot-history.js"></script></head><body>
<div>Jackpot King Royal — £3,024 — 5 August 2020</div>
<div>Jackpot King Regal — £15,859 — 27 November 2019</div>
<a href="/api/jackpot/history?network=jackpot-king">history</a>
</body></html>`;
const rows=extractJpkWinCandidates(html);
assert(rows.some(x=>x.tier==='ROYAL'&&x.amount===3024&&x.normalizedByUkPublishedCap===Number((3024/3500).toFixed(6))));
assert(rows.some(x=>x.tier==='REGAL'&&x.amount===15859&&x.normalizedByUkPublishedCap===Number((15859/35000).toFixed(6))));
const resources=discoverCandidateResources(html,'https://example.test/jackpot-king');
assert(resources.includes('https://example.test/_next/static/chunks/jackpot-history.js'));
assert(resources.some(x=>x.includes('/api/jackpot/history')));

console.log('jpk-global-history-probe-v1 tests passed');

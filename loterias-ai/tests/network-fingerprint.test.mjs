import assert from 'node:assert/strict';
import {compareTimedMeterSeries,cachedSearchSnapshotGate} from '../digital-twins/core/network-fingerprint.mjs';

const cached=cachedSearchSnapshotGate([
  {source:'Paf',crawlLabel:'today',v:19758},
  {source:'Goldenbull',crawlLabel:'today',v:18855}
]);
assert.equal(cached.binding,'CANDIDATE_ONLY');
assert.equal(cached.executionBinding,false);
assert.equal(cached.reason,'SEARCH_CACHE_HAS_NO_EXACT_CAPTURE_TIMESTAMPS');

const t=Date.parse('2026-09-03T02:00:00+02:00');
const ref=[{t,v:20000},{t:t+60000,v:20001.2},{t:t+120000,v:20002.4}];
const same=[{t:t+1000,v:20000.3},{t:t+61000,v:20001.5},{t:t+121000,v:20002.7}];
const match=compareTimedMeterSeries(ref,same,{maxTimeSkewMs:2000,maxAbsoluteDifferenceEUR:0.5,maxRateRelativeError:0.01,minOverlappingIntervals:2});
assert.equal(match.binding,'NETWORK_FINGERPRINT_MATCH_ONLY');
assert.equal(match.executionBinding,false,'fingerprint match must never become execution binding by itself');

const wrong=[{t:t+1000,v:19900},{t:t+61000,v:19904},{t:t+121000,v:19908}];
const mismatch=compareTimedMeterSeries(ref,wrong,{maxTimeSkewMs:2000,maxAbsoluteDifferenceEUR:2,maxRateRelativeError:0.05,minOverlappingIntervals:2});
assert.equal(mismatch.binding,'CANDIDATE_ONLY');

console.log(JSON.stringify({ok:true,cached,match,mismatch},null,2));

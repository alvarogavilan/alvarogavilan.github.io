import assert from 'node:assert/strict';
import {summarizeP0NorseProgress} from '../edge-live/edge-research-progress-v1.mjs';

const data={p0Strategy:{stateObservationGate:{operator:'JOKERBET',game:'Gods and Giants',currentPublicPageVerified:true,dailyMechanicPublishedOnCurrentPage:true,spanishInteroperatorPlaytechNetworkVerified:true,directGameToAognjp2BindingVerified:false},tickerIdentityGate:{game:'Book of Dwarves'}}};
const s=summarizeP0NorseProgress(data);
assert.equal(s.ready,true);
assert.equal(s.closed,3);
assert.equal(s.total,8);
assert.equal(s.pct,37.5);
assert.equal(s.open.length,5);

const progressed={p0Strategy:{stateObservationGate:{...data.p0Strategy.stateObservationGate,directGameToAognjp2BindingVerified:true,sameSessionDailyActiveVerified:true,currentDailyJackpotEUR:123.45,guaranteedHitTime:1780000000,exactTickerHostRecovered:true,exactImsCasinoRecovered:true},tickerIdentityGate:{}}};
const p=summarizeP0NorseProgress(progressed);
assert.equal(p.closed,8);
assert.equal(p.pct,100);

const none=summarizeP0NorseProgress({});
assert.equal(none.ready,false);
console.log('edge-research-progress-v1.test.mjs: PASS');

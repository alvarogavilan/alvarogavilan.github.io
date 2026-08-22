import assert from 'node:assert/strict';
import {buildLegacyPriorityScreen} from '../casino/jackpots/botemania-legacy-priority-screen-v1.mjs';

const comparators={sources:[
  {feedKey:'generic:diamondbonanza25BTM',currentSpainTitle:'Danza de los Diamantes',sourceUrl:'diamond',historicalWinsRecorded:1060,historicalAverageWinGBP:7309,currentSpainPublishedRTP:0.9544},
  {feedKey:'generic:WAGER_BET',currentSpainTitle:'Ultimate Video Poker',sourceUrl:'uvp',historicalWinsRecorded:49,historicalAverageWinGBP:13305,historicalBreakEvenGBP:17477},
  {feedKey:'generic:tikitemple2_1',currentSpainTitle:'Tiki Templo',sourceUrl:'tiki',historicalWinsRecorded:203,historicalAverageWinGBP:104433}
]};
const live={observedAt:'2026-08-22T10:00:00.000Z',currentByKey:{
  'generic:diamondbonanza25BTM':{amountEUR:8032.9},
  'generic:WAGER_BET':{amountEUR:3448.25},
  'generic:tikitemple2_1':{amountEUR:19.66}
}};

const fresh=buildLegacyPriorityScreen(live,comparators,'2026-08-22T10:20:00.000Z');
assert.equal(fresh.sourceFresh,true);
assert.equal(fresh.ranked[0].feedKey,'generic:diamondbonanza25BTM');
assert.equal(fresh.ranked[0].nominalVsHistoricalAverageRatio,1.099);
assert.equal(fresh.ranked[1].feedKey,'generic:WAGER_BET');
assert.equal(fresh.ranked[1].nominalVsHistoricalBreakEvenRatio,0.1973);
assert.equal(fresh.ranked.every(x=>x.realMoneyAllowed===false),true);
assert.equal(fresh.guards.nominalCrossMarketRatiosAreDiscoveryOnly,true);

const stale=buildLegacyPriorityScreen(live,comparators,'2026-08-22T11:00:01.000Z');
assert.equal(stale.sourceFresh,false);
assert.equal(stale.ranked.every(x=>x.action==='RECAPTURE_REQUIRED_BEFORE_ANY_CURRENT_STATE_CLAIM'),true);
assert.equal(stale.guards.staleMetersCannotTriggerPlay,true);

console.log('PASS botemania-legacy-priority-screen-v1');

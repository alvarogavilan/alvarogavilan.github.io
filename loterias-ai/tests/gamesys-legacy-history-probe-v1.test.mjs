import assert from 'node:assert/strict';
import {parseMoney,parseStats} from '../casino/jackpots/gamesys-legacy-history-probe-v1.mjs';

assert.deepEqual(parseMoney('£7,309'),{currency:'£',amount:7309});
assert.deepEqual(parseMoney('€7.309,50'),{currency:'€',amount:7309.5});

const html=`<html><body><h4>Jackpot Information</h4>
Software Gamesys Seeds At £500 Wins Recorded 1,060 Average Win £7,309 Biggest Win £35,781 Smallest Win £502 Average Time 5d 16h Chance of Win 1 in 160,689
<h4>Recent Jackpot Wins</h4>4 years ago £6,235 5 years ago £7,965<h4>Biggest Jackpot Wins</h4></body></html>`;
const s=parseStats(html);
assert.deepEqual(s.seed,{currency:'£',amount:500});
assert.equal(s.winsRecorded,1060);
assert.deepEqual(s.averageWin,{currency:'£',amount:7309});
assert.deepEqual(s.biggestWin,{currency:'£',amount:35781});
assert.deepEqual(s.smallestWin,{currency:'£',amount:502});
assert.equal(s.chanceOneIn,160689);
assert.equal(s.recentWins.length,2);

console.log('gamesys-legacy-history-probe-v1 tests passed');

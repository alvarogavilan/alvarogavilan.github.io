import assert from 'node:assert/strict';
import {analyzeCasino777RobertoSportingHarObject} from '../scripts/analyze-casino777-roberto-sporting-har.mjs';

const page='https://www.casino777.es/roberto-carlos-sporting-legends';
const ticker='https://ticker.example/new_jackpotxml.php?info=1&casino=casino777-real&game=sljp-1&currency=eur&local=0';
const xml='<request currency="eur" startTimestamp="1000" execInterval="10" game="sljp-1" casino="casino777-real" info="1"><gamedata timestamp="1010" local="0" winc="7" gamegroup="sljp" game="sljp-1"><amount-list><amount pos="0" currency="eur" guaranteedHitTime="1050">123.45</amount></amount-list></gamedata></request>';
const har={log:{entries:[
  {request:{url:page},response:{content:{text:'gpas_rcarlos_pop'}}},
  {request:{url:ticker},response:{content:{text:xml}}}
]}};

let r=analyzeCasino777RobertoSportingHarObject(har);
assert.equal(r.ok,true);
assert.equal(r.exactTargetPageObserved,true);
assert.equal(r.exactCasino777ServedProviderCodeVerified,true);
assert.equal(r.currentSljp1RowRecovered,true);
assert.equal(r.currentDailyAmountExactCandidate,123.45);
assert.equal(r.currentGuaranteedHitTimeExactCandidate,1050);
assert.equal(r.currentWinCountExactCandidate,7);
assert.equal(r.currentTimestampExactCandidate,1010);
assert.equal(r.exactCasino777JackpotsCasinoImsCandidate,'casino777-real');
assert.equal(r.exactTickerSessionCandidate,true);
assert.equal(r.execution.decision,'NO_PLAY');
assert.equal(r.execution.realMoneyAllowed,false);
assert.equal(r.execution.maxSpins,0);

const weeklyXml=xml.replaceAll('sljp-1','sljp-2');
r=analyzeCasino777RobertoSportingHarObject({log:{entries:[
  {request:{url:page},response:{content:{text:'gpas_rcarlos_pop'}}},
  {request:{url:ticker.replace('sljp-1','sljp-2')},response:{content:{text:weeklyXml}}}
]}});
assert.equal(r.currentSljp1RowRecovered,false);
assert.equal(r.exactTickerSessionCandidate,false);
assert.equal(r.execution.decision,'NO_PLAY');

r=analyzeCasino777RobertoSportingHarObject({log:{entries:[{request:{url:ticker},response:{content:{text:xml}}}]}});
assert.equal(r.exactTargetPageObserved,false);
assert.equal(r.currentSljp1RowRecovered,true);
assert.equal(r.exactTickerSessionCandidate,false);
assert.equal(r.execution.decision,'NO_PLAY');

r=analyzeCasino777RobertoSportingHarObject({log:{entries:[
  {request:{url:page},response:{content:{text:'gpas_rcarlos_pop'}}},
  {request:{url:'https://ticker.example/new_jackpotxml.php?info=1&casino=one&game=sljp-1&currency=eur&local=0'},response:{content:{text:xml.replaceAll('casino777-real','one')}}},
  {request:{url:'https://ticker.example/new_jackpotxml.php?info=1&casino=two&game=sljp-1&currency=eur&local=0'},response:{content:{text:xml.replaceAll('casino777-real','two')}}}
]}});
assert.equal(r.exactTickerSessionCandidate,false);
assert.equal(r.exactCasino777JackpotsCasinoImsCandidate,null);
assert.equal(r.execution.realMoneyAllowed,false);

console.log('analyze-casino777-roberto-sporting-har.test.mjs: PASS');

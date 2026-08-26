import assert from 'node:assert/strict';
import {analyzeSafeBet365BobbyHarText} from '../scripts/analyze-bet365-bobby-sporting-har.mjs';

const har={log:{entries:[
  {
    startedDateTime:'2026-08-26T20:00:00.000Z',
    request:{method:'GET',url:'https://casino.bet365.es/launch?gameCode=gpas_bgeorge_pop&token=LAUNCH_SECRET',headers:[{name:'Authorization',value:'Bearer HEADER_SECRET'}]},
    response:{status:200,content:{mimeType:'application/json',text:'{"title":"Bobby George: Sporting Legends","gameCode":"gpas_bgeorge_pop","minBet":0.10,"baseCost":10,"betValues":[0.1,0.2,0.5],"token":"BODY_SECRET"}'}},
  },
  {
    startedDateTime:'2026-08-26T20:00:01.000Z',
    request:{method:'GET',url:'https://ticker.example/webtickers?game=sljp-1&casino=bet365_es&currency=EUR&local=0&instanceCode=es1&token=QUERY_SECRET',headers:[{name:'Cookie',value:'SESSION=COOKIE_SECRET'}]},
    response:{status:200,content:{mimeType:'application/json',text:'{"game":"sljp-1","casino":"bet365_es","currency":"EUR","local":0,"instanceCode":"es1","token":"RESPONSE_SECRET"}'}},
  },
]}};

const r=analyzeSafeBet365BobbyHarText(JSON.stringify(har),{sourceName:'private-bobby.har'});
assert.equal(r.ok,true);
assert.equal(r.version,'bet365-bobby-safe-har-cli-v1.1-stake-candidates');
assert.equal(r.sourceName,'private-bobby.har');
assert.equal(r.exactTargetMarkerObserved,true);
assert.equal(r.exactTargetDailyTickerCandidateObserved,true);
assert.equal(r.stakeMenuCandidateObserved,true);
assert.ok(r.stakeMenuCandidateCount>=3);
assert.ok(r.observedStakeKeys.includes('minbet'));
assert.ok(r.observedStakeKeys.includes('basecost'));
assert.deepEqual(r.stakeMenuCandidates.find(x=>x.normalizedKey==='minbet')?.numericValues,[0.1]);
assert.equal(r.servedStakeMenuSemanticsVerified,false);
assert.equal(r.servedTenCentTotalStakeVerified,false);
assert.equal(r.tenCentJackpotEligibilityVerified,false);
assert.equal(r.servedBet365SessionBindingVerified,false);
assert.equal(r.usableForOverduePair,false);
assert.equal(r.execution.decision,'NO_PLAY');
assert.equal(r.execution.realMoneyAllowed,false);
assert.equal(r.execution.realStakeEUR,0);
assert.equal(r.execution.maxSpins,0);
assert.equal(r.execution.maxTotalStakeEUR,0);
assert.equal(r.hardGuards.stakeCandidatesAreStructuralOnly,true);
assert.equal(r.hardGuards.tenCentCandidateCannotProveJackpotEligibility,true);
const serialized=JSON.stringify(r);
for(const secret of ['LAUNCH_SECRET','HEADER_SECRET','BODY_SECRET','QUERY_SECRET','COOKIE_SECRET','RESPONSE_SECRET'])assert.equal(serialized.includes(secret),false);
assert.equal(serialized.includes('?game='),false);
assert.equal(serialized.includes('Authorization'),false);
assert.equal(serialized.includes('Cookie'),false);

const bad=analyzeSafeBet365BobbyHarText('{bad');
assert.equal(bad.ok,false);
assert.equal(bad.reason,'HAR_PARSE_FAILED');
assert.equal(bad.execution.decision,'NO_PLAY');
assert.equal(bad.execution.maxSpins,0);

console.log('analyze-bet365-bobby-sporting-har.test.mjs: PASS');

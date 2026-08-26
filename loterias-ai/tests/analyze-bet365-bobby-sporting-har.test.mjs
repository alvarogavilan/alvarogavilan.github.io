import assert from 'node:assert/strict';
import {analyzeSafeBet365BobbyHarText} from '../scripts/analyze-bet365-bobby-sporting-har.mjs';

const xml=`<request currency="eur" startTimestamp="1787774390" execInterval="10" game="sljp-1" casino="bet365_es" info="1"><gamedata timestamp="1787774403" local="0" winc="17" gamegroup="sljp" game="sljp-1"><amount-list><amount pos="0" sign="€" step="0" wins="0.00" instancecode="es1" currency="eur" guaranteedHitTime="1787775000">1234.56</amount></amount-list></gamedata></request>`;
const har={log:{entries:[
  {
    startedDateTime:'2026-08-26T20:00:00.000Z',
    request:{method:'GET',url:'https://casino.bet365.es/launch?gameCode=gpas_bgeorge_pop&token=LAUNCH_SECRET',headers:[{name:'Authorization',value:'Bearer HEADER_SECRET'}]},
    response:{status:200,content:{mimeType:'application/json',text:'{"title":"Bobby George: Sporting Legends","gameCode":"gpas_bgeorge_pop","minBet":0.10,"baseCost":10,"betValues":[0.1,0.2,0.5],"token":"BODY_SECRET"}'}},
  },
  {
    startedDateTime:'2026-08-26T20:00:05.000Z',
    request:{method:'GET',url:'https://ticker.example/new_jackpotxml.php?info=1&game=sljp-1&casino=bet365_es&currency=EUR&local=0&instanceCode=es1&token=QUERY_SECRET',headers:[{name:'Cookie',value:'SESSION=COOKIE_SECRET'}]},
    response:{status:200,content:{mimeType:'application/xml',text:xml}},
  },
]}};

const r=analyzeSafeBet365BobbyHarText(JSON.stringify(har),{sourceName:'private-bobby.har'});
assert.equal(r.ok,true);
assert.equal(r.version,'bet365-bobby-safe-har-cli-v1.2-legacy-daily-vector');
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
assert.equal(r.legacySljp1Candidate.valid,true);
assert.equal(r.legacySljp1Candidate.exactLegacySljp1ProtocolFieldsRecovered,true);
assert.equal(r.legacySljp1Candidate.snapshot.code,'sljp-1');
assert.equal(r.legacySljp1Candidate.snapshot.amount,1234.56);
assert.equal(r.legacySljp1Candidate.snapshot.guaranteedHitTime,1787775000);
assert.equal(r.legacySljp1Candidate.snapshot.winCount,17);
assert.equal(r.legacySljp1Candidate.snapshot.gameTimestamp,1787774403);
assert.equal(r.legacySljp1Candidate.snapshot.requestExecInterval,10);
assert.equal(r.legacySljp1Candidate.feedAgeSeconds,2);
assert.equal(r.legacySljp1Candidate.bet365LicenseeBindingVerified,false);
assert.equal(r.legacySljp1Candidate.currentSljp1ExecutionStateVerified,false);
assert.equal(r.servedBet365SessionBindingVerified,false);
assert.equal(r.usableForOverduePair,false);
assert.equal(r.execution.decision,'NO_PLAY');
assert.equal(r.execution.realMoneyAllowed,false);
assert.equal(r.execution.realStakeEUR,0);
assert.equal(r.execution.maxSpins,0);
assert.equal(r.execution.maxTotalStakeEUR,0);
assert.equal(r.hardGuards.stakeCandidatesAreStructuralOnly,true);
assert.equal(r.hardGuards.tenCentCandidateCannotProveJackpotEligibility,true);
assert.equal(r.hardGuards.legacyDailyVectorCannotProveBet365EndpointOwnership,true);
const serialized=JSON.stringify(r);
for(const secret of ['LAUNCH_SECRET','HEADER_SECRET','BODY_SECRET','QUERY_SECRET','COOKIE_SECRET'])assert.equal(serialized.includes(secret),false);
assert.equal(serialized.includes('?info='),false);
assert.equal(serialized.includes('<request'),false);
assert.equal(serialized.includes('Authorization'),false);
assert.equal(serialized.includes('Cookie'),false);

const bad=analyzeSafeBet365BobbyHarText('{bad');
assert.equal(bad.ok,false);
assert.equal(bad.reason,'HAR_PARSE_FAILED');
assert.equal(bad.execution.decision,'NO_PLAY');
assert.equal(bad.execution.maxSpins,0);

console.log('analyze-bet365-bobby-sporting-har.test.mjs: PASS');

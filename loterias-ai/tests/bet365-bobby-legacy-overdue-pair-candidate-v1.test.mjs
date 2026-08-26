import assert from 'node:assert/strict';
import {evaluateBet365BobbyLegacyOverduePairCandidate} from '../edge-backend/src/bet365-bobby-legacy-overdue-pair-candidate-v1.mjs';

const target=(time='2026-08-26T19:59:50.000Z')=>({startedDateTime:time,request:{method:'GET',url:'https://casino.bet365.es/launch?gameCode=gpas_bgeorge_pop&token=SECRET',headers:[]},response:{status:200,content:{mimeType:'application/json',text:'{"title":"Bobby George: Sporting Legends","gameCode":"gpas_bgeorge_pop"}'}}});
const xml=({timestamp,amount=1234.56,winc=17,ght=1787774400,exec=10})=>`<request currency="eur" startTimestamp="1787774380" execInterval="${exec}" game="sljp-1" casino="bet365_es" info="1"><gamedata timestamp="${timestamp}" local="0" winc="${winc}" gamegroup="sljp" game="sljp-1"><amount-list><amount pos="0" sign="€" step="0" wins="0.00" instancecode="es1" currency="eur" guaranteedHitTime="${ght}">${amount}</amount></amount-list></gamedata></request>`;
const ticker=({time,timestamp,amount,winc=17,ght=1787774400,exec=10})=>({startedDateTime:time,request:{method:'GET',url:'https://ticker.example/new_jackpotxml.php?info=1&game=sljp-1&casino=bet365_es&currency=EUR&local=0&instanceCode=es1&token=QUERY_SECRET',headers:[]},response:{status:200,content:{mimeType:'application/xml',text:xml({timestamp,amount,winc,ght,exec})}}});
const makeHar=(t)=>({log:{entries:[target(),t]}});
const before=makeHar(ticker({time:'2026-08-26T19:59:59.000Z',timestamp:1787774398,amount:1234.56}));
const after=makeHar(ticker({time:'2026-08-26T20:00:05.000Z',timestamp:1787774402,amount:1234.57}));

let r=evaluateBet365BobbyLegacyOverduePairCandidate({beforeHar:before,afterHar:after,beforeSourceName:'before.har',afterSourceName:'after.har'});
assert.equal(r.valid,true);
assert.equal(r.version,'bet365-bobby-legacy-overdue-pair-candidate-v1');
assert.equal(r.candidateFollowingDayUnawardedStateObserved,true);
assert.equal(r.deadlineEpochSeconds,1787774400);
assert.equal(r.beforeLeadSeconds,2);
assert.equal(r.afterLagSeconds,2);
assert.equal(r.requestExecIntervalSeconds,10);
assert.equal(r.sameTickerEndpoint,true);
assert.equal(r.sameRequestCasino,true);
assert.equal(r.sameInstanceCode,true);
assert.equal(r.sameGuaranteedHitTime,true);
assert.equal(r.winCountUnchanged,true);
assert.equal(r.jackpotNondecreasing,true);
assert.equal(r.providerFirstBetFollowingDayRuleDocumented,true);
assert.equal(r.providerAnyBetAnySizeJackpotEligibilityDocumented,true);
assert.equal(r.bet365LicenseeBindingVerified,false);
assert.equal(r.operatorRuleAdoptionVerified,false);
assert.equal(r.servedTenCentTotalStakeVerified,false);
assert.equal(r.tenCentJackpotEligibilityVerified,false);
assert.equal(r.usableForExecution,false);
assert.equal(r.execution.decision,'NO_PLAY');
assert.equal(r.execution.realMoneyAllowed,false);
assert.equal(r.execution.maxSpins,0);
assert.equal(JSON.stringify(r).includes('QUERY_SECRET'),false);
assert.equal(JSON.stringify(r).includes('<request'),false);

const won=makeHar(ticker({time:'2026-08-26T20:00:05.000Z',timestamp:1787774402,amount:100,winc:18}));
r=evaluateBet365BobbyLegacyOverduePairCandidate({beforeHar:before,afterHar:won});
assert.equal(r.valid,false);
assert.equal(r.reason,'JACKPOT_WIN_COUNT_CHANGED');
assert.equal(r.candidateFollowingDayUnawardedStateObserved,false);

const reset=makeHar(ticker({time:'2026-08-26T20:00:05.000Z',timestamp:1787774402,amount:100,winc:17}));
r=evaluateBet365BobbyLegacyOverduePairCandidate({beforeHar:before,afterHar:reset});
assert.equal(r.valid,false);
assert.equal(r.reason,'JACKPOT_AMOUNT_RESET_OR_DECREASED');

const newDeadline=makeHar(ticker({time:'2026-08-26T20:00:05.000Z',timestamp:1787774402,amount:1234.57,ght:1787860800}));
r=evaluateBet365BobbyLegacyOverduePairCandidate({beforeHar:before,afterHar:newDeadline});
assert.equal(r.valid,false);
assert.equal(r.reason,'GUARANTEED_HIT_TIME_CHANGED_OR_RESET');

const tooLate=makeHar(ticker({time:'2026-08-26T20:00:25.000Z',timestamp:1787774422,amount:1234.57}));
r=evaluateBet365BobbyLegacyOverduePairCandidate({beforeHar:before,afterHar:tooLate});
assert.equal(r.valid,false);
assert.equal(r.reason,'SERVER_FEED_TOO_STALE');

r=evaluateBet365BobbyLegacyOverduePairCandidate({beforeHar:after,afterHar:before});
assert.equal(r.valid,false);
assert.equal(r.reason,'CAPTURE_ORDER_NOT_FORWARD');

console.log('bet365-bobby-legacy-overdue-pair-candidate-v1.test.mjs: PASS');

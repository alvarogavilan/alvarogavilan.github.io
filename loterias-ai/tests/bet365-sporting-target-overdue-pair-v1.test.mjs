import assert from 'node:assert/strict';
import {evaluateBet365SportingTargetOverduePair as evaluate} from '../edge-backend/src/bet365-sporting-target-overdue-pair-v1.mjs';

const meta={
  gpas_bgeorge_pop:'Bobby George: Sporting Legends',
  gpas_slblara_pop:'Brian Lara: Sporting Legends',
  gpas_slfbruno_pop:'Frank Bruno: Sporting Legends',
};
const target=(code,time='2026-08-26T19:59:50.000Z')=>({startedDateTime:time,request:{method:'GET',url:`https://casino.bet365.es/launch?gameCode=${code}&token=SECRET`,headers:[]},response:{status:200,content:{mimeType:'application/json',text:JSON.stringify({title:meta[code],gameCode:code})}}});
const xml=({timestamp,amount=1234.56,winc=17,ght=1787774400,exec=10})=>`<request currency="eur" startTimestamp="1787774380" execInterval="${exec}" game="sljp-1" casino="bet365_es" info="1"><gamedata timestamp="${timestamp}" local="0" winc="${winc}" gamegroup="sljp" game="sljp-1"><amount-list><amount pos="0" sign="€" step="0" wins="0.00" instancecode="es1" currency="eur" guaranteedHitTime="${ght}">${amount}</amount></amount-list></gamedata></request>`;
const ticker=({time,timestamp,amount,winc=17,ght=1787774400,exec=10})=>({startedDateTime:time,request:{method:'GET',url:'https://ticker.example/new_jackpotxml.php?info=1&game=sljp-1&casino=bet365_es&currency=EUR&local=0&instanceCode=es1&token=QUERY_SECRET',headers:[]},response:{status:200,content:{mimeType:'application/xml',text:xml({timestamp,amount,winc,ght,exec})}}});
const makeHar=(code,t)=>({log:{entries:[target(code),t]}});

for(const code of Object.keys(meta)){
  const before=makeHar(code,ticker({time:'2026-08-26T19:59:59.000Z',timestamp:1787774398,amount:1234.56}));
  const after=makeHar(code,ticker({time:'2026-08-26T20:00:05.000Z',timestamp:1787774402,amount:1234.57}));
  const r=evaluate({gameCode:code,beforeHar:before,afterHar:after,beforeSourceName:`${code}-before.har`,afterSourceName:`${code}-after.har`});
  assert.equal(r.valid,true);
  assert.equal(r.gameCode,code);
  assert.equal(r.title,meta[code]);
  assert.equal(r.exactTargetSameBindingCrossGhtVerified,true);
  assert.equal(r.candidateFollowingDayUnawardedStateObserved,true);
  assert.equal(r.sameTickerEndpoint,true);
  assert.equal(r.sameRequestCasino,true);
  assert.equal(r.sameInstanceCode,true);
  assert.equal(r.sameGuaranteedHitTime,true);
  assert.equal(r.winCountUnchanged,true);
  assert.equal(r.jackpotNondecreasing,true);
  assert.equal(r.bet365LicenseeBindingVerified,false);
  assert.equal(r.servedTenCentTotalStakeVerified,false);
  assert.equal(r.operatorFollowingDayRuleAdoptionVerified,false);
  assert.equal(r.usableForExecution,false);
  assert.equal(r.execution.decision,'NO_PLAY');
  assert.equal(JSON.stringify(r).includes('QUERY_SECRET'),false);
  assert.equal(JSON.stringify(r).includes('<request'),false);
}

const frank='gpas_slfbruno_pop';
const before=makeHar(frank,ticker({time:'2026-08-26T19:59:59.000Z',timestamp:1787774398,amount:1234.56}));
let r=evaluate({gameCode:frank,beforeHar:before,afterHar:makeHar(frank,ticker({time:'2026-08-26T20:00:05.000Z',timestamp:1787774402,amount:100,winc:18}))});
assert.equal(r.valid,false);assert.equal(r.reason,'JACKPOT_WIN_COUNT_CHANGED');
r=evaluate({gameCode:frank,beforeHar:before,afterHar:makeHar(frank,ticker({time:'2026-08-26T20:00:05.000Z',timestamp:1787774402,amount:100,winc:17}))});
assert.equal(r.valid,false);assert.equal(r.reason,'JACKPOT_AMOUNT_RESET_OR_DECREASED');
r=evaluate({gameCode:frank,beforeHar:before,afterHar:makeHar(frank,ticker({time:'2026-08-26T20:00:05.000Z',timestamp:1787774402,amount:1234.57,ght:1787860800}))});
assert.equal(r.valid,false);assert.equal(r.reason,'GUARANTEED_HIT_TIME_CHANGED_OR_RESET');
const brianAfter=makeHar('gpas_slblara_pop',ticker({time:'2026-08-26T20:00:05.000Z',timestamp:1787774402,amount:1234.57}));
r=evaluate({gameCode:frank,beforeHar:before,afterHar:brianAfter});
assert.equal(r.valid,false);assert.equal(r.reason,'AFTER_TARGET_SLJP1_CANDIDATE_INVALID');

console.log('bet365-sporting-target-overdue-pair-v1.test.mjs: PASS');

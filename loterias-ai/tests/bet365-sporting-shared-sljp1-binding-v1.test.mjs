import assert from 'node:assert/strict';
import {verifyBet365SportingSharedSljp1Binding} from '../edge-backend/src/bet365-sporting-shared-sljp1-binding-v1.mjs';

const title={
  gpas_bgeorge_pop:'Bobby George: Sporting Legends',
  gpas_slblara_pop:'Brian Lara: Sporting Legends',
  gpas_slfbruno_pop:'Frank Bruno: Sporting Legends',
};
const target=(code,time)=>({startedDateTime:time,request:{method:'GET',url:`https://casino.bet365.es/launch?gameCode=${code}&token=SECRET`,headers:[]},response:{status:200,content:{mimeType:'application/json',text:JSON.stringify({title:title[code],gameCode:code})}}});
const xml=({timestamp,amount,ght=1787774400,winc=17,exec=10,instance='es1',casino='bet365_es'})=>`<request currency="eur" startTimestamp="1787774380" execInterval="${exec}" game="sljp-1" casino="${casino}" info="1"><gamedata timestamp="${timestamp}" local="0" winc="${winc}" gamegroup="sljp" game="sljp-1"><amount-list><amount pos="0" sign="€" step="0" wins="0.00" instancecode="${instance}" currency="eur" guaranteedHitTime="${ght}">${amount}</amount></amount-list></gamedata></request>`;
const ticker=({time,timestamp,amount,ght,winc,instance='es1',host='ticker.example'})=>({startedDateTime:time,request:{method:'GET',url:`https://${host}/new_jackpotxml.php?info=1&game=sljp-1&casino=bet365_es&currency=EUR&local=0&instanceCode=${instance}&token=QUERY_SECRET`,headers:[]},response:{status:200,content:{mimeType:'application/xml',text:xml({timestamp,amount,ght,winc,instance})}}});
const har=(code,{time,timestamp,amount,ght=1787774400,winc=17,instance='es1',host='ticker.example'})=>({log:{entries:[target(code,'2026-08-26T19:59:50.000Z'),ticker({time,timestamp,amount,ght,winc,instance,host})]}});

const sessions=[
  {gameCode:'gpas_bgeorge_pop',sourceName:'bobby.har',har:har('gpas_bgeorge_pop',{time:'2026-08-26T19:59:59.000Z',timestamp:1787774398,amount:1234.56})},
  {gameCode:'gpas_slblara_pop',sourceName:'brian.har',har:har('gpas_slblara_pop',{time:'2026-08-26T20:00:01.000Z',timestamp:1787774399,amount:1234.57})},
  {gameCode:'gpas_slfbruno_pop',sourceName:'frank.har',har:har('gpas_slfbruno_pop',{time:'2026-08-26T20:00:02.000Z',timestamp:1787774400,amount:1234.58})},
];
let r=verifyBet365SportingSharedSljp1Binding({sessions});
assert.equal(r.valid,true);
assert.equal(r.sameSuppliedSessionSljp1StateVerified,true);
assert.equal(r.targets.length,3);
assert.equal(r.shared.instanceCode,'es1');
assert.equal(r.shared.guaranteedHitTime,1787774400);
assert.equal(r.shared.winCount,17);
assert.equal(r.bet365LicenseeBindingVerified,false);
assert.equal(r.equalTenCentJackpotEligibilityVerified,false);
assert.equal(r.usableForLatencySelection,false);
assert.equal(r.usableForExecution,false);
assert.equal(r.execution.decision,'NO_PLAY');
assert.equal(JSON.stringify(r).includes('QUERY_SECRET'),false);
assert.equal(JSON.stringify(r).includes('SECRET'),false);

const differentInstance=[sessions[0],{...sessions[1],har:har('gpas_slblara_pop',{time:'2026-08-26T20:00:01.000Z',timestamp:1787774399,amount:1234.57,instance:'es2'})}];
r=verifyBet365SportingSharedSljp1Binding({sessions:differentInstance});
assert.equal(r.valid,false);
assert.equal(r.reason,'RESPONSE_INSTANCE_CODE_NOT_SHARED_OR_MISSING');

const differentGht=[sessions[0],{...sessions[1],har:har('gpas_slblara_pop',{time:'2026-08-26T20:00:01.000Z',timestamp:1787774399,amount:1234.57,ght:1787860800})}];
r=verifyBet365SportingSharedSljp1Binding({sessions:differentGht});
assert.equal(r.valid,false);
assert.equal(r.reason,'GUARANTEED_HIT_TIME_NOT_SHARED');

const differentWin=[sessions[0],{...sessions[1],har:har('gpas_slblara_pop',{time:'2026-08-26T20:00:01.000Z',timestamp:1787774399,amount:1234.57,winc:18})}];
r=verifyBet365SportingSharedSljp1Binding({sessions:differentWin});
assert.equal(r.valid,false);
assert.equal(r.reason,'WIN_COUNT_NOT_SHARED');

r=verifyBet365SportingSharedSljp1Binding({sessions:[sessions[0],sessions[0]]});
assert.equal(r.valid,false);
assert.equal(r.reason,'DUPLICATE_TARGET_GAME_CODE');

console.log('bet365-sporting-shared-sljp1-binding-v1.test.mjs: PASS');

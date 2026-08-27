import assert from 'node:assert/strict';
import {validateBet365FrankPostGhtSurvivalCycle as validate} from '../casino/jackpots/bet365-frank-post-ght-survival-cycle-v1.mjs';

const GAME='gpas_slfbruno_pop';
const epoch=iso=>Date.parse(iso)/1000;
const ght=epoch('2026-08-27T01:25:00Z');
const iso=s=>new Date(s*1000).toISOString();
const xml=({ts,amount=1500,winc=7,deadline=ght,exec=10})=>`<request currency="eur" startTimestamp="${ts-2}" execInterval="${exec}" game="sljp-1" casino="bet365_es" info="1"><gamedata timestamp="${ts}" local="0" winc="${winc}" gamegroup="sljp" game="sljp-1"><amount-list><amount pos="0" sign="€" step="0" wins="0.00" instancecode="es1" currency="eur" guaranteedHitTime="${deadline}">${amount}</amount></amount-list></gamedata></request>`;
function har({ts,amount=1500,winc=7,deadline=ght,exec=10}){
  const tickerTime=ts+1;
  return {log:{entries:[
    {startedDateTime:iso(tickerTime-3),request:{method:'GET',url:'https://casino.bet365.es/play/FrankBrunoSL',headers:[]},response:{status:200,content:{text:'login'}}},
    {startedDateTime:iso(tickerTime-2),request:{method:'GET',url:`https://casino.bet365.es/launch?game=${GAME}&token=SECRET`,headers:[]},response:{status:200,content:{mimeType:'application/json',text:JSON.stringify({title:'Frank Bruno: Sporting Legends',gameCode:GAME})}}},
    {startedDateTime:iso(tickerTime-1),request:{method:'GET',url:'https://casino.bet365.es/initialResources/es_ES_desktop?token=HIDDEN',headers:[]},response:{status:200,content:{mimeType:'application/json',text:JSON.stringify({jackpotsCasino:'bet365_es',jackpotsCasinoUrl:'https://ticker.example/new_jackpotxml.php?token=HIDDEN',liveEndpointUrl:'https://ticker.example/new_jackpotxml.php?session=HIDDEN',useServicesCasinoJackpots:true})}}},
    {startedDateTime:iso(tickerTime),request:{method:'GET',url:'https://ticker.example/new_jackpotxml.php?info=1&game=sljp-1&casino=bet365_es&currency=EUR&local=0&instanceCode=es1&token=QUERY_SECRET',headers:[]},response:{status:200,content:{mimeType:'application/xml',text:xml({ts,amount,winc,deadline,exec})}}},
  ]}};
}
const item=(name,state)=>({sourceName:name,har:har(state)});

const before=item('before.har',{ts:ght-2,amount:1500});
const rightCensored=[2,22,42,62,82,102,122].map((lag,i)=>item(`post-${i}.har`,{ts:ght+lag,amount:1500.01+i/100}));
let r=validate({cycleId:'frank-survival-001',before,postGht:rightCensored});
assert.equal(r.valid,true);
assert.equal(r.reason,'COMPLETE_RIGHT_CENSORED_POST_GHT_SURVIVAL_CANDIDATE');
assert.equal(r.rightCensored,true);
assert.equal(r.completeObservationHorizon,true);
assert.equal(r.prospectiveSurvivalCandidate,true);
assert.equal(r.detectionLagSeconds,2);
assert.equal(r.survivalLowerBoundSeconds,120);
assert.equal(r.firstObservedAwardOrResetTimestamp,null);
assert.equal(r.completeAttemptLedgerVerified,false);
assert.equal(r.usableForLatencyClassification,false);
assert.equal(r.usableForRaceEvidence,false);
assert.equal(r.execution.decision,'NO_PLAY');
assert.equal(r.execution.realMoneyAllowed,false);
for(const secret of ['SECRET','HIDDEN','QUERY_SECRET'])assert.equal(JSON.stringify(r).includes(secret),false);

const terminal=[
  item('detection.har',{ts:ght+2,amount:1500.01}),
  item('survives.har',{ts:ght+12,amount:1500.02}),
  item('terminal.har',{ts:ght+20,amount:100,winc:8,deadline:ght+86400}),
];
r=validate({cycleId:'frank-survival-002',before,postGht:terminal});
assert.equal(r.valid,true);
assert.equal(r.reason,'COMPLETE_INTERVAL_CENSORED_POST_GHT_AWARD_RESET_CANDIDATE');
assert.equal(r.rightCensored,false);
assert.equal(r.lastConfirmedUnawardedTimestamp,ght+12);
assert.equal(r.firstObservedAwardOrResetTimestamp,ght+20);
assert.deepEqual(r.awardResetInterval,{lowerExclusiveTimestamp:ght+12,upperInclusiveTimestamp:ght+20});
assert.equal(r.survivalLowerBoundSeconds,10);

r=validate({cycleId:'frank-survival-short',before,postGht:rightCensored.slice(0,3)});
assert.equal(r.valid,false);
assert.equal(r.reason,'OBSERVATION_STOPPED_BEFORE_FROZEN_HORIZON');

const gap=[item('gap-detect.har',{ts:ght+2,amount:1500.01}),item('gap-late.har',{ts:ght+30,amount:1500.02})];
r=validate({cycleId:'frank-survival-gap',before,postGht:gap});
assert.equal(r.valid,false);
assert.equal(r.reason,'POST_GHT_SERVER_GAP_TOO_LARGE');

const extraAfterTerminal=[...terminal,item('illegal-after-terminal.har',{ts:ght+30,amount:101,winc:8,deadline:ght+86400})];
r=validate({cycleId:'frank-survival-extra',before,postGht:extraAfterTerminal});
assert.equal(r.valid,false);
assert.equal(r.reason,'POST_TERMINAL_SNAPSHOTS_FORBIDDEN');

const duplicateNames=[item('same.har',{ts:ght+2,amount:1500.01}),item('same.har',{ts:ght+12,amount:1500.02})];
r=validate({cycleId:'frank-survival-dup',before,postGht:duplicateNames});
assert.equal(r.valid,false);
assert.equal(r.reason,'SOURCE_NAMES_MUST_BE_UNIQUE');

console.log('bet365-frank-post-ght-survival-cycle-v1.test.mjs: PASS');

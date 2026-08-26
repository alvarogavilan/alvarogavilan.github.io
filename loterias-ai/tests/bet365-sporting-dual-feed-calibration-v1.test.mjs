import assert from 'node:assert/strict';
import {analyzeBet365SportingDualFeedCalibrationSample,evaluateBet365SportingDualFeedCalibrationSeries} from '../edge-backend/src/bet365-sporting-dual-feed-calibration-v1.mjs';

const code='gpas_bgeorge_pop';
const launch=()=>({startedDateTime:'2026-08-26T20:00:00.000Z',request:{method:'GET',url:`https://casino.bet365.es/launch?game=${code}&token=SECRET`,headers:[{name:'cookie',value:'PRIVATE'}]},response:{status:200,content:{mimeType:'application/json',text:JSON.stringify({title:'Bobby George: Sporting Legends',gameCode:code})}}});
const config=()=>({startedDateTime:'2026-08-26T20:00:01.000Z',request:{method:'GET',url:'https://casino.bet365.es/initialResources/es_ES_desktop?token=QUERY_SECRET',headers:[]},response:{status:200,content:{mimeType:'application/json',text:JSON.stringify({nested:{jackpotsCasino:'bet365_es',jackpotsCasinoUrl:'https://ticker.example/webtickers?token=HIDDEN',liveEndpointUrl:'wss://ticker.example/webtickers?session=HIDDEN',useServicesCasinoJackpots:true}})}}});
const xml=({timestamp,amount,ght=1787774400,winc=17})=>`<request currency="eur" startTimestamp="1787774380" execInterval="10" game="sljp-1" casino="bet365_es" info="1"><gamedata timestamp="${timestamp}" local="0" winc="${winc}" gamegroup="sljp" game="sljp-1"><amount-list><amount pos="0" sign="€" step="0" wins="0.00" instancecode="es1" currency="eur" guaranteedHitTime="${ght}">${amount}</amount></amount-list></gamedata></request>`;
const legacy=({time,timestamp,amount,ght,winc})=>({startedDateTime:time,request:{method:'GET',url:'https://ticker-legacy.example/new_jackpotxml.php?info=1&game=sljp-1&casino=bet365_es&currency=EUR&local=0&instanceCode=es1&token=SECRET2',headers:[]},response:{status:200,content:{mimeType:'application/xml',text:xml({timestamp,amount,ght,winc})}}});
const modern=({time,timestamp,amount,ght=1787774400,winc=17,instanceCode='es1'})=>({startedDateTime:time,request:{method:'GET',url:'https://ticker.example/webtickers?info=1&game=sljp-1&casino=bet365_es&currency=EUR&local=0&instanceCode=es1&token=SECRET3',headers:[]},response:{status:200,content:{mimeType:'application/json',text:JSON.stringify({data:{game:'sljp-1',currency:'EUR',local:0,casino:'bet365_es',instanceCode,gameGroup:'sljp',amount,guaranteedHitTime:ght,timestamp,winc}})}}});
const har=({baseSecond=2,timestamp=1787774398,amount=123.45,modernAmount=amount,modernTimestamp=timestamp,modernInstance='es1'})=>({log:{entries:[launch(),config(),legacy({time:`2026-08-26T20:00:0${baseSecond}.000Z`,timestamp,amount}),modern({time:`2026-08-26T20:00:0${baseSecond+1}.000Z`,timestamp:modernTimestamp,amount:modernAmount,instanceCode:modernInstance})]}});

let s=analyzeBet365SportingDualFeedCalibrationSample(har({}),{gameCode:code,sourceName:'sample1.har'});
assert.equal(s.valid,true);
assert.equal(s.calibrationCandidate,true);
assert.equal(s.exactStateVectorMatch,true);
assert.equal(s.sameRequestCasino,true);
assert.equal(s.sameInstanceCode,true);
assert.equal(s.sameExactTarget,true);
assert.equal(s.empiricalModernResponseMappingVerified,false);
assert.equal(s.exactModernResponseSemanticsVerified,false);
assert.equal(s.usableForOverduePair,false);
assert.equal(s.execution.decision,'NO_PLAY');
assert.equal(JSON.stringify(s).includes('SECRET'),false);
assert.equal(JSON.stringify(s).includes('PRIVATE'),false);
assert.equal(JSON.stringify(s).includes('HIDDEN'),false);

let mismatch=analyzeBet365SportingDualFeedCalibrationSample(har({modernAmount:999}),{gameCode:code});
assert.equal(mismatch.valid,true);
assert.equal(mismatch.exactStateVectorMatch,false);
assert.equal(mismatch.calibrationCandidate,false);

let instanceMismatch=analyzeBet365SportingDualFeedCalibrationSample(har({modernInstance:'es2'}),{gameCode:code});
assert.equal(instanceMismatch.valid,false);
assert.equal(instanceMismatch.reason,'DUAL_FEEDS_NOT_SAME_TARGET_CASINO_INSTANCE');

const samples=[
 analyzeBet365SportingDualFeedCalibrationSample(har({baseSecond:2,timestamp:1787774398,amount:123.45}),{gameCode:code,sourceName:'s1.har'}),
 analyzeBet365SportingDualFeedCalibrationSample(har({baseSecond:4,timestamp:1787774400,amount:123.46}),{gameCode:code,sourceName:'s2.har'}),
 analyzeBet365SportingDualFeedCalibrationSample(har({baseSecond:6,timestamp:1787774402,amount:123.47}),{gameCode:code,sourceName:'s3.har'}),
];
let series=evaluateBet365SportingDualFeedCalibrationSeries(samples);
assert.equal(series.valid,true);
assert.equal(series.uniqueExactCalibrationSampleCount,3);
assert.equal(series.distinctServerTimestampCount,3);
assert.equal(series.distinctAmountCount,3);
assert.equal(series.oneLogicalScope,true);
assert.equal(series.empiricalModernResponseMappingVerified,true);
assert.equal(series.exactModernResponseSemanticsVerified,false);
assert.equal(series.prospectiveProtocolVerified,false);
assert.equal(series.usableForOverduePair,false);
assert.equal(series.execution.decision,'NO_PLAY');

series=evaluateBet365SportingDualFeedCalibrationSeries([samples[0],samples[0],samples[0]]);
assert.equal(series.empiricalModernResponseMappingVerified,false);
assert.equal(series.uniqueExactCalibrationSampleCount,1);

series=evaluateBet365SportingDualFeedCalibrationSeries(samples,{minExactSamples:1});
assert.equal(series.valid,false);
assert.equal(series.reason,'INVALID_CALIBRATION_SERIES_POLICY');

console.log('bet365-sporting-dual-feed-calibration-v1.test.mjs: PASS');

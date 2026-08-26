import assert from 'node:assert/strict';
import {analyzeBetfairSportingDualFeedCalibrationSample,evaluateBetfairSportingDualFeedCalibrationSeries} from '../edge-backend/src/betfair-sporting-dual-feed-calibration-v1.mjs';

const launcher=()=>({request:{method:'GET',url:'https://launcher.betfair.es/?RPBucket=casino&dataChannel=casino&gameId=ap-mccoy-sporting-legends-cptn&launchProduct=casino&mode=real',headers:[]},response:{status:200,content:{text:'launcher'}}});
const initial=()=>({request:{method:'GET',url:'https://launcher.betfair.es/initialResources/es_ES_desktop',headers:[]},response:{status:200,content:{mimeType:'application/json',text:JSON.stringify({jackpotsCasino:'bf_es',jackpotsCasinoUrl:'https://legacy.example/new_jackpotxml.php',liveEndpointUrl:'https://webtickers.malmegas.com/webtickers'})}}});
const legacy=(timestamp,amount,winc=7,ght=1100)=>({
  startedDateTime:new Date(timestamp*1000).toISOString(),
  request:{method:'GET',url:'https://legacy.example/new_jackpotxml.php?info=1&casino=bf_es&game=sljp-1&currency=eur&local=0',headers:[]},
  response:{status:200,content:{mimeType:'text/xml',text:`<request casino="bf_es" currency="eur" game="sljp-1" info="1" startTimestamp="${timestamp-10}" execInterval="10"><gamedata game="sljp-1" gamegroup="sljp" local="0" timestamp="${timestamp}" winc="${winc}"><amount currency="EUR" guaranteedHitTime="${ght}" step="0.01" wins="1000">${amount}</amount></gamedata></request>`}},
});
const modern=(timestamp,amount,winc=7,ght=1100,captureOffset=1)=>({
  startedDateTime:new Date((timestamp+captureOffset)*1000).toISOString(),
  request:{method:'POST',url:'https://webtickers.malmegas.com/webtickers?info=1&casino=bf_es&game=sljp-1&currency=EUR&local=0',headers:[],postData:{mimeType:'application/json',text:'{}'}},
  response:{status:200,content:{mimeType:'application/json',text:JSON.stringify({game:'sljp-1',currency:'EUR',local:0,timestamp,winc,amount,guaranteedHitTime:ght})}},
});
const har=(timestamp,amount,modernAmount=amount)=>({log:{entries:[launcher(),initial(),legacy(timestamp,amount),modern(timestamp,modernAmount)]}});

let r=analyzeBetfairSportingDualFeedCalibrationSample(har(1000,123.45),{sourceName:'dual-1.har',maxCaptureSkewSeconds:2});
assert.equal(r.valid,true);
assert.equal(r.sameLauncherEntry,true);
assert.equal(r.sameInitialResourcesEntry,true);
assert.equal(r.sameBetfairImsCasino,true);
assert.equal(r.expectedBetfairImsCasino,'bf_es');
assert.equal(r.legacyTickerEndpoint,'https://legacy.example/new_jackpotxml.php');
assert.equal(r.modernTickerEndpoint,'https://webtickers.malmegas.com/webtickers');
assert.equal(r.captureSkewSeconds,1);
assert.equal(r.captureSkewWithinPolicy,true);
assert.deepEqual(r.legacyStateVector,r.modernStateVector);
assert.equal(r.exactStateVectorMatch,true);
assert.equal(r.calibrationCandidate,true);
assert.equal(r.empiricalModernResponseMappingVerified,false);
assert.equal(r.exactModernResponseSemanticsVerified,false);
assert.equal(r.usableForOverduePair,false);
assert.equal(r.execution.decision,'NO_PLAY');
assert.equal(r.execution.realMoneyAllowed,false);
assert.equal(r.execution.maxSpins,0);
assert.equal(r.hardGuards.legacyAndModernEndpointScopePreserved,true);

// A near-simultaneous modern row with any state-field mismatch is not a calibration candidate.
r=analyzeBetfairSportingDualFeedCalibrationSample(har(1000,123.45,123.46),{sourceName:'mismatch.har',maxCaptureSkewSeconds:2});
assert.equal(r.valid,true);
assert.equal(r.captureSkewWithinPolicy,true);
assert.equal(r.exactStateVectorMatch,false);
assert.equal(r.calibrationCandidate,false);
assert.equal(r.execution.realMoneyAllowed,false);

// Exact state equality outside the capture-skew policy also fails closed.
const skewed={log:{entries:[launcher(),initial(),legacy(1000,123.45),modern(1000,123.45,7,1100,10)]}};
r=analyzeBetfairSportingDualFeedCalibrationSample(skewed,{sourceName:'skewed.har',maxCaptureSkewSeconds:2});
assert.equal(r.valid,true);
assert.equal(r.exactStateVectorMatch,true);
assert.equal(r.captureSkewWithinPolicy,false);
assert.equal(r.calibrationCandidate,false);
assert.equal(r.execution.maxTotalStakeEUR,0);

const samples=[
  analyzeBetfairSportingDualFeedCalibrationSample(har(1000,123.45),{maxCaptureSkewSeconds:2}),
  analyzeBetfairSportingDualFeedCalibrationSample(har(1010,123.55),{maxCaptureSkewSeconds:2}),
  analyzeBetfairSportingDualFeedCalibrationSample(har(1020,123.65),{maxCaptureSkewSeconds:2}),
];
const series=evaluateBetfairSportingDualFeedCalibrationSeries(samples);
assert.equal(series.valid,true);
assert.equal(series.version,'betfair-sporting-dual-feed-calibration-series-v1.2-unique-contract-samples');
assert.equal(series.contractValidCalibrationSampleCount,3);
assert.equal(series.exactCalibrationSampleCount,3);
assert.equal(series.uniqueExactCalibrationSampleCount,3);
assert.equal(series.duplicateExactCalibrationSampleCount,0);
assert.equal(series.rejectedSampleCount,0);
assert.equal(series.distinctServerTimestampCount,3);
assert.equal(series.distinctAmountCount,3);
assert.equal(series.logicalScopeCount,1);
assert.equal(series.oneLogicalScope,true);
assert.equal(series.empiricalModernResponseMappingVerified,true);
assert.equal(series.exactModernResponseSemanticsVerified,false);
assert.equal(series.usableForOverduePair,false);
assert.equal(series.execution.decision,'NO_PLAY');
assert.equal(series.execution.realMoneyAllowed,false);
assert.equal(series.hardGuards.fullSampleContractRecomputed,true);
assert.equal(series.hardGuards.duplicateCapturesDoNotCountTowardCalibration,true);
assert.equal(series.hardGuards.noAutomaticPromotionToOverdueGate,true);
assert.equal(series.hardGuards.oneExactImsAndEndpointScopeRequired,true);

// Repeating one exact HAR/sample cannot manufacture the minimum calibration series.
const repeated=evaluateBetfairSportingDualFeedCalibrationSeries([samples[0],samples[0],samples[0]]);
assert.equal(repeated.contractValidCalibrationSampleCount,3);
assert.equal(repeated.uniqueExactCalibrationSampleCount,1);
assert.equal(repeated.duplicateExactCalibrationSampleCount,2);
assert.equal(repeated.enoughSamples,false);
assert.equal(repeated.empiricalModernResponseMappingVerified,false);
assert.equal(repeated.execution.realMoneyAllowed,false);

// Series evaluation recomputes state equality instead of trusting caller-set booleans.
const forgedMismatch={
  ...samples[0],
  calibrationCandidate:true,
  exactStateVectorMatch:true,
  modernStateVector:{...samples[0].modernStateVector,amount:samples[0].modernStateVector.amount+1},
};
const forged=evaluateBetfairSportingDualFeedCalibrationSeries([forgedMismatch,samples[1],samples[2]]);
assert.equal(forged.contractValidCalibrationSampleCount,2);
assert.equal(forged.rejectedSampleCount,1);
assert.equal(forged.enoughSamples,false);
assert.equal(forged.empiricalModernResponseMappingVerified,false);
assert.equal(forged.execution.maxSpins,0);

const mixedScope=[...samples];
mixedScope[2]={...mixedScope[2],expectedBetfairImsCasino:'other_es'};
const mixed=evaluateBetfairSportingDualFeedCalibrationSeries(mixedScope);
assert.equal(mixed.logicalScopeCount,2);
assert.equal(mixed.oneLogicalScope,false);
assert.equal(mixed.empiricalModernResponseMappingVerified,false);
assert.equal(mixed.execution.realMoneyAllowed,false);

const insufficient=evaluateBetfairSportingDualFeedCalibrationSeries(samples.slice(0,2));
assert.equal(insufficient.empiricalModernResponseMappingVerified,false);
assert.equal(insufficient.exactModernResponseSemanticsVerified,false);
assert.equal(insufficient.execution.maxSpins,0);

console.log('betfair-sporting-dual-feed-calibration-v1.test.mjs: PASS');

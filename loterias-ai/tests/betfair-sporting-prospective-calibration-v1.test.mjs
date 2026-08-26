import assert from 'node:assert/strict';
import {analyzeBetfairSportingDualFeedCalibrationSample} from '../edge-backend/src/betfair-sporting-dual-feed-calibration-v1.mjs';
import {evaluateBetfairSportingProspectiveCalibration} from '../edge-backend/src/betfair-sporting-prospective-calibration-v1.mjs';

const launcher=()=>({request:{method:'GET',url:'https://launcher.betfair.es/?RPBucket=casino&dataChannel=casino&gameId=ap-mccoy-sporting-legends-cptn&launchProduct=casino&mode=real',headers:[]},response:{status:200,content:{text:'launcher'}}});
const initial=()=>({request:{method:'GET',url:'https://launcher.betfair.es/initialResources/es_ES_desktop',headers:[]},response:{status:200,content:{mimeType:'application/json',text:JSON.stringify({jackpotsCasino:'bf_es',jackpotsCasinoUrl:'https://legacy.example/new_jackpotxml.php',liveEndpointUrl:'https://webtickers.malmegas.com/webtickers'})}}});
const legacy=(timestamp,amount,ght)=>({
  startedDateTime:new Date(timestamp*1000).toISOString(),
  request:{method:'GET',url:'https://legacy.example/new_jackpotxml.php?info=1&casino=bf_es&game=sljp-1&currency=eur&local=0',headers:[]},
  response:{status:200,content:{mimeType:'text/xml',text:`<request casino="bf_es" currency="eur" game="sljp-1" info="1" startTimestamp="${timestamp-10}" execInterval="10"><gamedata game="sljp-1" gamegroup="sljp" local="0" timestamp="${timestamp}" winc="7"><amount currency="EUR" guaranteedHitTime="${ght}" step="0.01" wins="1000">${amount}</amount></gamedata></request>`}},
});
const modern=(timestamp,amount,ght)=>({
  startedDateTime:new Date((timestamp+1)*1000).toISOString(),
  request:{method:'POST',url:'https://webtickers.malmegas.com/webtickers?info=1&casino=bf_es&game=sljp-1&currency=EUR&local=0',headers:[],postData:{mimeType:'application/json',text:'{}'}},
  response:{status:200,content:{mimeType:'application/json',text:JSON.stringify({game:'sljp-1',currency:'EUR',local:0,timestamp,winc:7,amount,guaranteedHitTime:ght})}},
});
const sample=(timestamp,amount,sourceName,ght=1787774000)=>analyzeBetfairSportingDualFeedCalibrationSample({log:{entries:[launcher(),initial(),legacy(timestamp,amount,ght),modern(timestamp,amount,ght)]}},{sourceName,maxCaptureSkewSeconds:2});

const s1=sample(1787773200,123.45,'prospective-1.har');
const s2=sample(1787773210,123.55,'prospective-2.har');
const s3=sample(1787773220,123.65,'prospective-3.har');
assert.equal(s1.calibrationCandidate,true);
assert.equal(s2.calibrationCandidate,true);
assert.equal(s3.calibrationCandidate,true);

const r=evaluateBetfairSportingProspectiveCalibration([s1,s2,s3]);
assert.equal(r.valid,true);
assert.equal(r.version,'betfair-sporting-prospective-calibration-v1');
assert.equal(r.freezeCommitSha,'3f397f820914bfdd39b42e4bd5262bd1b986751f');
assert.equal(r.freezeCommitEpochSeconds,1787773120);
assert.equal(r.allCapturesStrictlyAfterFreezeCommit,true);
assert.equal(r.strictCaptureOrderVerified,true);
assert.equal(r.uniqueNamedSourcesVerified,true);
assert.equal(r.prospectiveTimingCandidate,true);
assert.equal(r.series.empiricalModernResponseMappingVerified,true);
assert.equal(r.empiricalModernResponseMappingVerified,true);
assert.equal(r.prospectiveCalibrationCandidate,true);
assert.equal(r.completeAttemptLedgerVerified,false);
assert.equal(r.exactModernResponseSemanticsVerified,false);
assert.equal(r.usableForOverduePair,false);
assert.equal(r.execution.decision,'NO_PLAY');
assert.equal(r.execution.realMoneyAllowed,false);
assert.equal(r.execution.maxSpins,0);
assert.equal(r.hardGuards.retrospectiveSamplesCannotBecomeProspective,true);
assert.equal(r.hardGuards.noAutomaticPromotionToOverdueGate,true);

const old=sample(1787773100,123.35,'retrospective.har');
const retrospective=evaluateBetfairSportingProspectiveCalibration([old,s2,s3]);
assert.equal(retrospective.valid,false);
assert.equal(retrospective.reason,'CAPTURE_NOT_STRICTLY_AFTER_FROZEN_PROTOCOL_COMMIT');
assert.equal(retrospective.prospectiveCalibrationCandidate,false);
assert.equal(retrospective.execution.realMoneyAllowed,false);

const reordered=evaluateBetfairSportingProspectiveCalibration([s2,s1,s3]);
assert.equal(reordered.valid,false);
assert.equal(reordered.reason,'PROSPECTIVE_CAPTURE_ORDER_NOT_STRICTLY_FORWARD');
assert.equal(reordered.execution.maxTotalStakeEUR,0);

const duplicateName={...s3,sourceName:'prospective-2.har'};
const duplicateSource=evaluateBetfairSportingProspectiveCalibration([s1,s2,duplicateName]);
assert.equal(duplicateSource.valid,false);
assert.equal(duplicateSource.reason,'DUPLICATE_PROSPECTIVE_SOURCE_NAME');
assert.equal(duplicateSource.execution.realMoneyAllowed,false);

const mismatch=analyzeBetfairSportingDualFeedCalibrationSample({log:{entries:[launcher(),initial(),legacy(1787773230,123.75,1787774000),modern(1787773230,123.76,1787774000)]}},{sourceName:'mismatch.har',maxCaptureSkewSeconds:2});
assert.equal(mismatch.calibrationCandidate,false);
const withMismatch=evaluateBetfairSportingProspectiveCalibration([s1,s2,mismatch]);
assert.equal(withMismatch.valid,false);
assert.equal(withMismatch.reason,'NON_CALIBRATION_SAMPLE_IN_PROSPECTIVE_SET');
assert.equal(withMismatch.completeAttemptLedgerVerified,false);
assert.equal(withMismatch.execution.realMoneyAllowed,false);

const tooFew=evaluateBetfairSportingProspectiveCalibration([s1,s2]);
assert.equal(tooFew.valid,false);
assert.equal(tooFew.reason,'INSUFFICIENT_PROSPECTIVE_SAMPLE_SET');
assert.equal(tooFew.execution.maxSpins,0);

console.log('betfair-sporting-prospective-calibration-v1.test.mjs: PASS');

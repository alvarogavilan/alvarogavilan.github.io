import assert from 'node:assert/strict';
import {evaluateBet365SportingProspectiveCalibration} from '../edge-backend/src/bet365-sporting-prospective-calibration-v1.mjs';

const epoch=s=>Date.parse(s)/1000;
const sample=({name,start,timestamp,amount})=>({
  version:'bet365-sporting-dual-feed-calibration-v1',valid:true,calibrationCandidate:true,exactStateVectorMatch:true,
  gameCode:'gpas_bgeorge_pop',sourceName:name,requestCasino:'bet365_es',instanceCode:'es1',
  legacyTickerEndpoint:'https://legacy.example/new_jackpotxml.php',modernTickerEndpoint:'https://modern.example/webtickers',
  legacyCaptureEpochSeconds:start,modernCaptureEpochSeconds:start+1,maxCaptureSkewSeconds:5,captureSkewWithinPolicy:true,
  sameRequestCasino:true,sameInstanceCode:true,sameExactTarget:true,
  legacyStateVector:{game:'sljp-1',currency:'EUR',local:0,amount,guaranteedHitTime:epoch('2026-08-27T00:00:00Z'),gameTimestamp:timestamp,winCount:17,instanceCode:'es1'},
  modernStateVector:{game:'sljp-1',currency:'EUR',local:0,amount,guaranteedHitTime:epoch('2026-08-27T00:00:00Z'),gameTimestamp:timestamp,winCount:17,instanceCode:'es1'},
});
const after=epoch('2026-08-26T22:25:00Z');
const samples=[
 sample({name:'future-1.har',start:after,timestamp:1787783100,amount:123.45}),
 sample({name:'future-2.har',start:after+10,timestamp:1787783110,amount:123.46}),
 sample({name:'future-3.har',start:after+20,timestamp:1787783120,amount:123.47}),
];
let r=evaluateBet365SportingProspectiveCalibration(samples);
assert.equal(r.valid,true);
assert.equal(r.freezeCommitSha,'cb84f404840a4a2a7ed0f0b3fabab156dc23eec8');
assert.equal(r.allCapturesStrictlyAfterFreezeCommit,true);
assert.equal(r.strictCaptureOrderVerified,true);
assert.equal(r.uniqueNamedSourcesVerified,true);
assert.equal(r.empiricalModernResponseMappingVerified,true);
assert.equal(r.prospectiveCalibrationCandidate,true);
assert.equal(r.exactModernResponseSemanticsVerified,false);
assert.equal(r.completeAttemptLedgerVerified,false);
assert.equal(r.servedTenCentEligibilityVerified,false);
assert.equal(r.operatorFollowingDayRuleAdoptionVerified,false);
assert.equal(r.usableForOverduePair,false);
assert.equal(r.usableForExecution,false);
assert.equal(r.execution.decision,'NO_PLAY');

const pre=[...samples];pre[0]=sample({name:'old.har',start:epoch('2026-08-26T22:24:00Z'),timestamp:1787783000,amount:123.44});
r=evaluateBet365SportingProspectiveCalibration(pre);
assert.equal(r.valid,false);
assert.equal(r.reason,'CAPTURE_NOT_STRICTLY_AFTER_FROZEN_PROTOCOL_COMMIT');

const reversed=[samples[1],samples[0],samples[2]];
r=evaluateBet365SportingProspectiveCalibration(reversed);
assert.equal(r.valid,false);
assert.equal(r.reason,'PROSPECTIVE_CAPTURE_ORDER_NOT_STRICTLY_FORWARD');

const duplicateNames=[samples[0],{...samples[1],sourceName:'future-1.har'},samples[2]];
r=evaluateBet365SportingProspectiveCalibration(duplicateNames);
assert.equal(r.valid,false);
assert.equal(r.reason,'PROSPECTIVE_SOURCE_NAMES_MISSING_OR_DUPLICATE');

console.log('bet365-sporting-prospective-calibration-v1.test.mjs: PASS');

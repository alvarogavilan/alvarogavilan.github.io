import assert from 'node:assert/strict';
import {analyzeBetfairSportingCorrelatedWebtickersPair} from '../edge-backend/src/betfair-sporting-webtickers-correlated-pair-v1.mjs';

const launcher={request:{method:'GET',url:'https://launcher.betfair.es/?RPBucket=casino&dataChannel=casino&gameId=ap-mccoy-sporting-legends-cptn&launchProduct=casino&mode=real',headers:[]},response:{status:200,content:{text:'launcher'}}};
const initial={request:{method:'GET',url:'https://launcher.betfair.es/initialResources/es_ES_desktop',headers:[]},response:{status:200,content:{mimeType:'application/json',text:'{"jackpotsCasino":"bf_es","liveEndpointUrl":"https://webtickers.malmegas.com/webtickers"}'}};
const entry=(timestamp,winc,amount,ght=1100,captureTimestamp=timestamp)=>({
  startedDateTime:new Date(captureTimestamp*1000).toISOString(),
  request:{method:'POST',url:'https://webtickers.malmegas.com/webtickers?info=1&casino=bf_es&game=sljp-1&currency=EUR&local=0',headers:[],postData:{mimeType:'application/json',text:'{}'}},
  response:{status:200,content:{mimeType:'application/json',text:JSON.stringify({rows:[{game:'sljp-1',currency:'EUR',local:0,timestamp,winc,amount,guaranteedHitTime:ght}]})}},
});
const har=(timestamp,winc,amount,ght=1100,captureTimestamp=timestamp)=>({log:{entries:[launcher,initial,entry(timestamp,winc,amount,ght,captureTimestamp)]}});

let r=analyzeBetfairSportingCorrelatedWebtickersPair({beforeHar:har(1095,7,123.45),afterHar:har(1105,7,123.55)});
assert.equal(r.version,'betfair-sporting-webtickers-correlated-pair-v1.1-capture-order-attested');
assert.equal(r.valid,true);
assert.equal(r.captureTimeAdvanced,true);
assert.equal(r.beforeCaptureTime,new Date(1095*1000).toISOString());
assert.equal(r.afterCaptureTime,new Date(1105*1000).toISOString());
assert.equal(r.sameBetfairImsCasino,true);
assert.equal(r.sameConfiguredEndpoint,true);
assert.equal(r.sameGuaranteedHitTime,true);
assert.equal(r.winCountUnchanged,true);
assert.equal(r.amountNondecreasing,true);
assert.equal(r.serverTimeAdvanced,true);
assert.equal(r.deadlineCrossedCandidate,true);
assert.equal(r.sameCycleContinuityCandidate,true);
assert.equal(r.unawardedAcrossDeadlineCandidate,true);
assert.equal(r.pairCandidateVerified,true);
assert.equal(r.exactModernResponseSemanticsVerified,false);
assert.equal(r.usableForOverduePair,false);
assert.equal(r.execution.decision,'NO_PLAY');
assert.equal(r.execution.realMoneyAllowed,false);
assert.equal(r.execution.maxSpins,0);
assert.equal(r.hardGuards.forwardHarCaptureOrderRequired,true);

// A changed win count breaks same-cycle/unawarded continuity even if timestamps cross GHT.
r=analyzeBetfairSportingCorrelatedWebtickersPair({beforeHar:har(1095,7,123.45),afterHar:har(1105,8,123.55)});
assert.equal(r.valid,true);
assert.equal(r.deadlineCrossedCandidate,true);
assert.equal(r.winCountUnchanged,false);
assert.equal(r.sameCycleContinuityCandidate,false);
assert.equal(r.unawardedAcrossDeadlineCandidate,false);
assert.equal(r.pairCandidateVerified,false);
assert.equal(r.execution.realMoneyAllowed,false);

// A new GHT is treated as a cycle change, never as overdue continuity.
r=analyzeBetfairSportingCorrelatedWebtickersPair({beforeHar:har(1095,7,123.45,1100),afterHar:har(1105,7,120.00,1200)});
assert.equal(r.valid,true);
assert.equal(r.sameGuaranteedHitTime,false);
assert.equal(r.sameCycleContinuityCandidate,false);
assert.equal(r.unawardedAcrossDeadlineCandidate,false);
assert.equal(r.execution.maxTotalStakeEUR,0);

// Even apparently advancing server fields cannot be paired if HAR capture chronology is equal or reversed.
r=analyzeBetfairSportingCorrelatedWebtickersPair({beforeHar:har(1095,7,123.45,1100,1200),afterHar:har(1105,7,123.55,1100,1200)});
assert.equal(r.valid,false);
assert.equal(r.reason,'HAR_CAPTURE_ORDER_NOT_FORWARD');
assert.equal(r.pairCandidateVerified,false);
assert.equal(r.execution.realMoneyAllowed,false);

r=analyzeBetfairSportingCorrelatedWebtickersPair({beforeHar:har(1095,7,123.45,1100,1201),afterHar:har(1105,7,123.55,1100,1200)});
assert.equal(r.valid,false);
assert.equal(r.reason,'HAR_CAPTURE_ORDER_NOT_FORWARD');
assert.equal(r.execution.maxSpins,0);

const bad=analyzeBetfairSportingCorrelatedWebtickersPair({beforeHar:'{bad',afterHar:har(1105,7,123.55)});
assert.equal(bad.valid,false);
assert.equal(bad.reason,'BEFORE_EXACT_CORRELATED_CANDIDATE_NOT_UNIQUE');
assert.equal(bad.execution.realMoneyAllowed,false);
console.log('betfair-sporting-webtickers-correlated-pair-v1.test.mjs: PASS');

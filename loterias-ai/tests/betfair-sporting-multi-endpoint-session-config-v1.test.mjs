import assert from 'node:assert/strict';
import {analyzeBetfairSportingWebtickersRequestSemantics} from '../edge-backend/src/betfair-sporting-webtickers-request-semantics-v1.mjs';
import {analyzeBetfairSportingCorrelatedWebtickersSession} from '../edge-backend/src/betfair-sporting-webtickers-correlated-session-v1.mjs';

const launcher={request:{method:'GET',url:'https://launcher.betfair.es/?RPBucket=casino&dataChannel=casino&gameId=ap-mccoy-sporting-legends-cptn&launchProduct=casino&mode=real',headers:[]},response:{status:200,content:{text:'launcher'}}};
const dualInitial={
  request:{method:'GET',url:'https://launcher.betfair.es/initialResources/es_ES_desktop',headers:[]},
  response:{status:200,content:{mimeType:'application/json',text:JSON.stringify({
    jackpotsCasino:'bf_es',
    jackpotsCasinoUrl:'https://legacy-ticker.example/new_jackpotxml.php',
    liveEndpointUrl:'https://webtickers.malmegas.com/webtickers',
  })}},
};
const modern={
  startedDateTime:'2026-08-26T19:30:00Z',
  request:{method:'POST',url:'https://webtickers.malmegas.com/webtickers?info=1&casino=bf_es&game=sljp-1&currency=EUR&local=0',headers:[],postData:{mimeType:'application/json',text:'{}'}},
  response:{status:200,content:{mimeType:'application/json',text:JSON.stringify({game:'sljp-1',currency:'EUR',local:0,timestamp:1000,winc:7,amount:123.45,guaranteedHitTime:1100})}},
};
const har={log:{entries:[launcher,dualInitial,modern]}};

const req=analyzeBetfairSportingWebtickersRequestSemantics(har,{sourceName:'dual-endpoint.har'});
assert.equal(req.exactApMcCoyProviderDocumentedDailyRequestObserved,true);
assert.equal(req.exactApMcCoyProviderDocumentedDailyRequestMatchCount,1);
const ro=req.requestSemanticObservations.find(x=>x.exactApMcCoySessionProvenanceVerified===true&&x.requestContractSemanticsSupportedByProviderSpec===true);
assert.ok(ro);
assert.equal(ro.exactSessionTargetBindingMatchCount,1);
assert.equal(ro.exactSessionConfiguredBindingCount,2);
assert.equal(ro.alternateConfiguredBindingCount,1);
assert.equal(req.hardGuards.alternateConfiguredTickerEndpointsMayCoexist,true);
assert.equal(req.execution.decision,'NO_PLAY');
assert.equal(req.execution.realMoneyAllowed,false);

const correlated=analyzeBetfairSportingCorrelatedWebtickersSession(har,{sourceName:'dual-endpoint.har'});
assert.equal(correlated.correlatedExactDailyCandidateCount,1);
const c=correlated.correlatedExactDailyCandidates[0];
assert.equal(c.targetBindingMatchCount,1);
assert.equal(c.configuredBindingCount,2);
assert.equal(c.alternateConfiguredBindingCount,1);
assert.equal(c.request.exactSessionTargetBindingMatchCount,1);
assert.equal(c.request.alternateConfiguredBindingCount,1);
assert.equal(correlated.hardGuards.alternateConfiguredTickerEndpointsMayCoexist,true);
assert.equal(correlated.exactModernResponseSemanticsVerified,false);
assert.equal(correlated.usableForOverduePair,false);
assert.equal(correlated.execution.decision,'NO_PLAY');
assert.equal(correlated.execution.realMoneyAllowed,false);
assert.equal(correlated.execution.maxSpins,0);
assert.equal(correlated.execution.maxTotalStakeEUR,0);

console.log('betfair-sporting-multi-endpoint-session-config-v1.test.mjs: PASS');

import assert from 'node:assert/strict';
import {analyzeSafeModernPairText} from '../scripts/analyze-betfair-sporting-modern-pair.mjs';

const launcher={request:{method:'GET',url:'https://launcher.betfair.es/?RPBucket=casino&dataChannel=casino&gameId=ap-mccoy-sporting-legends-cptn&launchProduct=casino&mode=real',headers:[]},response:{status:200,content:{text:'launcher'}}};
const initial={request:{method:'GET',url:'https://launcher.betfair.es/initialResources/es_ES_desktop?token=CONFIG_SECRET',headers:[{name:'Authorization',value:'Bearer HEADER_SECRET'}]},response:{status:200,content:{mimeType:'application/json',text:'{"jackpotsCasino":"bf_es","liveEndpointUrl":"https://webtickers.malmegas.com/webtickers?route=ROUTE_SECRET"}'}};
const make=(timestamp,amount,winc=7)=>JSON.stringify({log:{entries:[launcher,initial,{
  startedDateTime:new Date(timestamp*1000).toISOString(),
  request:{method:'POST',url:'https://webtickers.malmegas.com/webtickers?info=1&casino=bf_es&game=sljp-1&currency=EUR&local=0&token=QUERY_SECRET',headers:[{name:'Cookie',value:'sid=COOKIE_SECRET'}],postData:{mimeType:'application/json',text:'{}'}},
  response:{status:200,content:{mimeType:'application/json',text:JSON.stringify({game:'sljp-1',currency:'EUR',local:0,timestamp,winc,amount,guaranteedHitTime:1100,token:'RESPONSE_SECRET'})}},
}]}});

const r=analyzeSafeModernPairText(make(1095,123.45),make(1105,123.55));
assert.equal(r.ok,true);
assert.equal(r.analysis.pairCandidateVerified,true);
assert.equal(r.analysis.unawardedAcrossDeadlineCandidate,true);
assert.equal(r.analysis.exactModernResponseSemanticsVerified,false);
assert.equal(r.analysis.usableForOverduePair,false);
assert.equal(r.execution.decision,'NO_PLAY');
assert.equal(r.execution.realMoneyAllowed,false);
const serialized=JSON.stringify(r);
for(const secret of ['CONFIG_SECRET','HEADER_SECRET','ROUTE_SECRET','QUERY_SECRET','COOKIE_SECRET','RESPONSE_SECRET'])assert.equal(serialized.includes(secret),false);
assert.equal(r.hardGuards.rawHarNeverEmitted,true);

const bad=analyzeSafeModernPairText('{bad',make(1105,123.55));
assert.equal(bad.ok,false);
assert.equal(bad.reason,'BEFORE_HAR_PARSE_FAILED');
assert.equal(bad.execution.realMoneyAllowed,false);
console.log('analyze-betfair-sporting-modern-pair.test.mjs: PASS');

import assert from 'node:assert/strict';
import {analyzeSafeSportingCrossGameFull} from '../scripts/analyze-betfair-sporting-cross-game-full.mjs';

const AP='ap-mccoy-sporting-legends-cptn',FRANKIE='frankie-dettori-sporting-legends-cptn';
const raw=(gameId,{capture=1000,gameTs=1000,amount=123.45}={})=>JSON.stringify({log:{entries:[
  {startedDateTime:new Date((capture-2)*1000).toISOString(),request:{method:'GET',url:`https://launcher.betfair.es/?RPBucket=casino&dataChannel=casino&gameId=${gameId}&launchProduct=casino&mode=real&token=LAUNCH_SECRET`,headers:[{name:'Cookie',value:'sid=COOKIE_SECRET'}]},response:{status:200,content:{text:''}}},
  {startedDateTime:new Date((capture-1)*1000).toISOString(),request:{method:'GET',url:'https://launcher.betfair.es/initialResources/es_ES_desktop?token=CONFIG_QUERY_SECRET',headers:[{name:'Authorization',value:'Bearer CONFIG_HEADER_SECRET'}]},response:{status:200,content:{mimeType:'application/json',text:JSON.stringify({jackpotsCasino:'bf_es',jackpotsCasinoUrl:'https://legacy.example/new_jackpotxml.php?secret=LEGACY_CONFIG_SECRET',liveEndpointUrl:'https://webtickers.malmegas.com/webtickers?secret=MODERN_CONFIG_SECRET',limits:{minBet:0.01,betValues:[0.01,0.02,0.05]},token:'CONFIG_BODY_SECRET'})}}},
  {startedDateTime:new Date(capture*1000).toISOString(),request:{method:'GET',url:'https://legacy.example/new_jackpotxml.php?info=1&casino=bf_es&game=sljp-1&currency=EUR&local=0&token=LEGACY_QUERY_SECRET',headers:[]},response:{status:200,content:{mimeType:'text/xml',text:`<request casino="bf_es" currency="EUR" game="sljp-1" info="1" startTimestamp="${gameTs-10}" execInterval="10"><gamedata game="sljp-1" gamegroup="sljp" local="0" timestamp="${gameTs}" winc="7"><amount currency="EUR" guaranteedHitTime="1100" step="0.01" wins="1000">${amount}</amount></gamedata></request>`}}},
  {startedDateTime:new Date((capture+1)*1000).toISOString(),request:{method:'POST',url:'https://webtickers.malmegas.com/webtickers?token=MODERN_QUERY_SECRET',headers:[{name:'Authorization',value:'Bearer MODERN_HEADER_SECRET'}],postData:{mimeType:'application/json',text:'{"info":1,"casino":"bf_es","game":"sljp-1","currency":"EUR","local":0,"token":"MODERN_BODY_SECRET"}'}},response:{status:200,content:{mimeType:'application/json',text:'{"ok":true,"token":"MODERN_RESPONSE_SECRET"}'}}},
]}});

const result=analyzeSafeSportingCrossGameFull({leftRaw:raw(AP,{capture:1000,gameTs:1000,amount:123.45}),rightRaw:raw(FRANKIE,{capture:1005,gameTs:1005,amount:123.55}),leftGameId:AP,rightGameId:FRANKIE,maxCaptureSkewSeconds:10});
assert.equal(result.ok,true);
assert.equal(result.evidenceSummary.exactSharedLegacySljp1ServerBindingVerified,true);
assert.equal(result.evidenceSummary.sameModernConfiguredSljp1TransportBindingVerified,true);
assert.equal(result.evidenceSummary.exactSharedModernSljp1ServerStateVerified,false);
assert.equal(result.evidenceSummary.leftStakeMenuCandidateObserved,true);
assert.equal(result.evidenceSummary.rightStakeMenuCandidateObserved,true);
assert.equal(result.evidenceSummary.crossGameExecutionEquivalentVerified,false);
assert.equal(result.evidenceSummary.greenNow,false);
assert.equal(result.execution.decision,'NO_PLAY');
assert.equal(result.execution.realMoneyAllowed,false);
assert.equal(result.hardGuards.modernConfiguredRoutingDoesNotEqualServerState,true);
const serialized=JSON.stringify(result);
for(const secret of ['LAUNCH_SECRET','COOKIE_SECRET','CONFIG_QUERY_SECRET','CONFIG_HEADER_SECRET','LEGACY_CONFIG_SECRET','MODERN_CONFIG_SECRET','CONFIG_BODY_SECRET','LEGACY_QUERY_SECRET','MODERN_QUERY_SECRET','MODERN_HEADER_SECRET','MODERN_BODY_SECRET','MODERN_RESPONSE_SECRET'])assert.equal(serialized.includes(secret),false);
assert.equal(serialized.includes('?'),false);

const malformed=analyzeSafeSportingCrossGameFull({leftRaw:'{bad',rightRaw:raw(FRANKIE),leftGameId:AP,rightGameId:FRANKIE});
assert.equal(malformed.ok,false);
assert.equal(malformed.reason,'LEFT_HAR_PARSE_FAILED');
assert.equal(malformed.execution.maxSpins,0);

console.log('analyze-betfair-sporting-cross-game-full.test.mjs: PASS');

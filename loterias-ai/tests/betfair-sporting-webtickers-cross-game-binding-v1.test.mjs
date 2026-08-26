import assert from 'node:assert/strict';
import {evaluateBetfairSportingWebtickersCrossGameBinding} from '../edge-backend/src/betfair-sporting-webtickers-cross-game-binding-v1.mjs';

const AP='ap-mccoy-sporting-legends-cptn',FRANKIE='frankie-dettori-sporting-legends-cptn',RONNIE='ronnie-osullivan-sporting-legends-cptn';
const launcher=gameId=>({request:{method:'GET',url:`https://launcher.betfair.es/?RPBucket=casino&dataChannel=casino&gameId=${gameId}&launchProduct=casino&mode=real`,headers:[]},response:{status:200,content:{text:''}}});
const initial=(casino='bf_es',endpoint='https://webtickers.malmegas.com/webtickers')=>({request:{method:'GET',url:'https://launcher.betfair.es/initialResources/es_ES_desktop',headers:[]},response:{status:200,content:{mimeType:'application/json',text:JSON.stringify({jackpotsCasino:casino,liveEndpointUrl:endpoint})}}});
const post=(casino='bf_es',endpoint='https://webtickers.malmegas.com/webtickers')=>({request:{method:'POST',url:`${endpoint}?token=SECRET_QUERY`,headers:[{name:'Authorization',value:'Bearer SECRET_HEADER'}],postData:{mimeType:'application/json',text:JSON.stringify({info:1,casino,game:'sljp-1',currency:'EUR',local:0,token:'SECRET_BODY'})}},response:{status:200,content:{mimeType:'application/json',text:'{"ok":true,"token":"SECRET_RESPONSE"}'}}});
const har=(gameId,{casino='bf_es',endpoint='https://webtickers.malmegas.com/webtickers'}={})=>({log:{entries:[launcher(gameId),initial(casino,endpoint),post(casino,endpoint)]}});

let r=evaluateBetfairSportingWebtickersCrossGameBinding({leftHar:har(AP),rightHar:har(FRANKIE),leftGameId:AP,rightGameId:FRANKIE});
assert.equal(r.valid,true);
assert.equal(r.sameBetfairImsCasino,true);
assert.equal(r.sameConfiguredTickerEndpoint,true);
assert.equal(r.bothExactDailyRequestRoutes,true);
assert.equal(r.sameConfiguredSljp1TransportBindingVerified,true);
assert.equal(r.exactSharedSljp1ServerStateVerified,false);
assert.equal(r.crossGameExecutionEquivalentVerified,false);
assert.equal(r.execution.decision,'NO_PLAY');
assert.equal(r.execution.realMoneyAllowed,false);
assert.equal(r.hardGuards.modernResponseStateNotInferred,true);
let serialized=JSON.stringify(r);
for(const secret of ['SECRET_QUERY','SECRET_HEADER','SECRET_BODY','SECRET_RESPONSE'])assert.equal(serialized.includes(secret),false);
assert.equal(serialized.includes('?'),false);

r=evaluateBetfairSportingWebtickersCrossGameBinding({leftHar:har(AP),rightHar:har(RONNIE,{casino:'other_es'}),leftGameId:AP,rightGameId:RONNIE});
assert.equal(r.valid,true);
assert.equal(r.sameBetfairImsCasino,false);
assert.equal(r.sameConfiguredSljp1TransportBindingVerified,false);
assert.equal(r.execution.maxSpins,0);

r=evaluateBetfairSportingWebtickersCrossGameBinding({leftHar:har(AP),rightHar:har(FRANKIE,{endpoint:'https://other.example/webtickers'}),leftGameId:AP,rightGameId:FRANKIE});
assert.equal(r.valid,true);
assert.equal(r.sameConfiguredTickerEndpoint,false);
assert.equal(r.sameConfiguredSljp1TransportBindingVerified,false);

r=evaluateBetfairSportingWebtickersCrossGameBinding({leftHar:har(AP),rightHar:har(AP),leftGameId:AP,rightGameId:AP});
assert.equal(r.valid,false);
assert.equal(r.reason,'TWO_DISTINCT_SPORTING_GAME_IDS_REQUIRED');
assert.equal(r.execution.realMoneyAllowed,false);

console.log('betfair-sporting-webtickers-cross-game-binding-v1.test.mjs: PASS');

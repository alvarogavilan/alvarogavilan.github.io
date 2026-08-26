import assert from 'node:assert/strict';
import {analyzeSafeCrossGameHarTexts} from '../scripts/analyze-betfair-sporting-cross-game.mjs';

const AP='ap-mccoy-sporting-legends-cptn',RONNIE='ronnie-osullivan-sporting-legends-cptn';
const raw=(gameId,{capture=1000,gameTs=1000,amount=123.45}={})=>JSON.stringify({log:{entries:[
  {startedDateTime:new Date((capture-2)*1000).toISOString(),request:{method:'GET',url:`https://launcher.betfair.es/?RPBucket=casino&dataChannel=casino&gameId=${gameId}&launchProduct=casino&mode=real&token=LAUNCH_SECRET`,headers:[{name:'Cookie',value:'sid=COOKIE_SECRET'}]},response:{status:200,content:{text:'launcher'}}},
  {startedDateTime:new Date((capture-1)*1000).toISOString(),request:{method:'GET',url:'https://launcher.betfair.es/initialResources/es_ES_desktop?token=CONFIG_SECRET',headers:[{name:'Authorization',value:'Bearer AUTH_SECRET'}]},response:{status:200,content:{mimeType:'application/json',text:JSON.stringify({jackpotsCasino:'bf_es',jackpotsCasinoUrl:'https://legacy.example/new_jackpotxml.php?secret=CONFIG_ENDPOINT_SECRET'})}}},
  {startedDateTime:new Date(capture*1000).toISOString(),request:{method:'GET',url:'https://legacy.example/new_jackpotxml.php?info=1&casino=bf_es&game=sljp-1&currency=EUR&local=0&token=TICKER_SECRET',headers:[{name:'Authorization',value:'Bearer TICKER_AUTH_SECRET'}]},response:{status:200,content:{mimeType:'text/xml',text:`<request casino="bf_es" currency="EUR" game="sljp-1" info="1" startTimestamp="${gameTs-10}" execInterval="10"><gamedata game="sljp-1" gamegroup="sljp" local="0" timestamp="${gameTs}" winc="7"><amount currency="EUR" guaranteedHitTime="1100" step="0.01" wins="1000">${amount}</amount></gamedata></request>`}}},
]}});

const result=analyzeSafeCrossGameHarTexts({leftRaw:raw(AP,{capture:1000,gameTs:1000,amount:123.45}),rightRaw:raw(RONNIE,{capture:1005,gameTs:1005,amount:123.55}),leftGameId:AP,rightGameId:RONNIE,maxCaptureSkewSeconds:10});
assert.equal(result.ok,true);
assert.equal(result.analysis.exactSharedSljp1NetworkBindingVerified,true);
assert.equal(result.analysis.crossGameExecutionEquivalentVerified,false);
assert.equal(result.execution.decision,'NO_PLAY');
assert.equal(result.execution.realMoneyAllowed,false);
assert.equal(result.hardGuards.rawHarNeverEmitted,true);
const serialized=JSON.stringify(result);
for(const secret of ['LAUNCH_SECRET','COOKIE_SECRET','CONFIG_SECRET','AUTH_SECRET','CONFIG_ENDPOINT_SECRET','TICKER_SECRET','TICKER_AUTH_SECRET'])assert.equal(serialized.includes(secret),false);
assert.equal(serialized.includes('?'),false);

const malformed=analyzeSafeCrossGameHarTexts({leftRaw:'{bad',rightRaw:raw(RONNIE),leftGameId:AP,rightGameId:RONNIE});
assert.equal(malformed.ok,false);
assert.equal(malformed.reason,'LEFT_HAR_PARSE_FAILED');
assert.equal(malformed.execution.maxSpins,0);

const relaxed=analyzeSafeCrossGameHarTexts({leftRaw:raw(AP),rightRaw:raw(RONNIE),leftGameId:AP,rightGameId:RONNIE,maxCaptureSkewSeconds:61});
assert.equal(relaxed.ok,false);
assert.equal(relaxed.reason,'INVALID_CAPTURE_SKEW_POLICY');
assert.equal(relaxed.maxAllowedCaptureSkewSeconds,60);

console.log('analyze-betfair-sporting-cross-game.test.mjs: PASS');

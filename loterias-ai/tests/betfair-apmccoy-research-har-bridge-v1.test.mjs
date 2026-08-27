import assert from 'node:assert/strict';
import {evaluateBetfairApMcCoyResearchHarPair as evaluate} from '../casino/jackpots/betfair-apmccoy-research-har-bridge-v1.mjs';

const launcher=()=>({startedDateTime:new Date(1989*1000).toISOString(),request:{method:'GET',url:'https://launcher.betfair.es/?RPBucket=casino&dataChannel=casino&gameId=ap-mccoy-sporting-legends-cptn&launchProduct=casino&mode=real&returnURL=https%3A%2F%2Fcasino.betfair.es%2Fjuego%2Fap-mccoy-sporting-legends-cptn&switchedToPopup=true',headers:[]},response:{status:200,headers:[],content:{text:''}}});
const config=()=>({request:{method:'GET',url:'https://launcher.betfair.es/initialResources/es_ES_desktop',headers:[]},response:{status:200,headers:[],content:{mimeType:'application/json',text:JSON.stringify({jackpotsCasino:'bf_es',jackpotsCasinoUrl:'https://tickers.playtech.example/new_jackpotxml.php'})}}});
const ticker=(ts,amount,winCount=42,ght=2000)=>({startedDateTime:new Date(ts*1000).toISOString(),request:{method:'GET',url:'https://tickers.playtech.example/new_jackpotxml.php?casino=bf_es&currency=EUR&game=sljp-1&local=0&winc=0',headers:[]},response:{status:200,headers:[],content:{mimeType:'text/xml',text:`<request casino="bf_es" currency="eur" game="sljp-1" startTimestamp="${ts-10}" execInterval="10"/><gamedata game="sljp-1" gamegroup="sljp" local="0" timestamp="${ts}" winc="${winCount}"><amount currency="EUR" guaranteedHitTime="${ght}" step="0.01" wins="1000">${amount}</amount></gamedata>`}}});
const har=(ts,amount,winCount=42)=>({log:{entries:[launcher(),config(),ticker(ts,amount,winCount)]}});

let r=evaluate({beforeHar:har(1990,100),afterHar:har(2005,100.02),decisionNowEpochSeconds:2010});
assert.equal(r.version,'betfair-apmccoy-research-har-bridge-v1');
assert.equal(r.valid,true);
assert.equal(r.researchStateAvailable,true);
assert.equal(r.usableForEvResearch,true);
assert.equal(r.usableForExecution,false);
assert.equal(r.decision,'NO_PLAY');
assert.equal(r.realMoneyAllowed,false);
assert.equal(r.realStakeEUR,0);
assert.equal(r.maxSpins,0);
assert.equal(r.maxTotalStakeEUR,0);
assert.equal(r.hardGuards.researchOnly,true);
assert.equal(r.hardGuards.underlyingLegacyGreenCannotPropagate,true);
assert.equal(r.hardGuards.separateFinalExecutionAdapterRequired,true);
assert.equal(r.finalEvaluation.followingDayUnawardedVerified,true);

r=evaluate({beforeHar:{log:{entries:[]}},afterHar:har(2005,100.02),decisionNowEpochSeconds:2010});
assert.equal(r.valid,false);
assert.equal(r.researchStateAvailable,false);
assert.equal(r.usableForExecution,false);
assert.equal(r.decision,'NO_PLAY');
assert.equal(r.realMoneyAllowed,false);
assert.equal(r.hardGuards.underlyingLegacyGreenCannotPropagate,true);

console.log('betfair-apmccoy-research-har-bridge-v1.test.mjs: PASS');

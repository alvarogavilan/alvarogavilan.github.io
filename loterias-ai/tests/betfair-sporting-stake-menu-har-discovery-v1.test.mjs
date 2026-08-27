import assert from 'node:assert/strict';
import {discoverBetfairSportingStakeMenuCandidates} from '../edge-backend/src/betfair-sporting-stake-menu-har-discovery-v1.mjs';

const FRANKIE='frankie-dettori-sporting-legends-cptn',AP='ap-mccoy-sporting-legends-cptn';
const launcher=gameId=>({request:{method:'GET',url:`https://launcher.betfair.es/?RPBucket=casino&dataChannel=casino&gameId=${gameId}&launchProduct=casino&mode=real&token=LAUNCH_SECRET`,headers:[{name:'Cookie',value:'sid=COOKIE_SECRET'}]},response:{status:200,content:{text:''}}});
const cfg={request:{method:'POST',url:'https://game.example/config?token=QUERY_SECRET',headers:[{name:'Authorization',value:'Bearer HEADER_SECRET'}],postData:{mimeType:'application/json',text:'{"availableTotalBets":[999],"token":"CLIENT_SECRET"}'}},response:{status:200,content:{mimeType:'application/json',text:JSON.stringify({limits:{minBet:0.01,maxBet:625,betValues:[0.01,0.02,0.05,0.1,0.25],availableTotalBets:[0.10,0.20,0.50],activePaylines:25},token:'RESPONSE_SECRET'})}};
const ws={request:{method:'GET',url:'wss://game.example/state?token=WS_QUERY_SECRET',headers:[]},response:{status:101,content:{text:''}},_webSocketMessages:[{type:'send',data:'{"minBet":777,"token":"SEND_SECRET"}'},{type:'receive',data:'{"stakeValues":[0.01,0.02],"coinValues":[0.01,0.02,0.05],"token":"RECEIVE_SECRET"}'}]};

let r=discoverBetfairSportingStakeMenuCandidates({log:{entries:[launcher(FRANKIE),cfg,ws]}},{gameId:FRANKIE,sourceName:'frankie.har'});
assert.equal(r.valid,true);
assert.equal(r.stakeMenuCandidateObserved,true);
assert.ok(r.candidateCount>=6);
assert.ok(r.observedNormalizedKeys.includes('minbet'));
assert.ok(r.observedNormalizedKeys.includes('betvalues'));
assert.ok(r.observedNormalizedKeys.includes('availabletotalbets'));
assert.ok(r.observedNormalizedKeys.includes('stakevalues'));
assert.ok(r.observedNormalizedKeys.includes('coinvalues'));
assert.ok(r.observedNormalizedKeys.includes('activepaylines'));
assert.equal(r.strongTotalStakeMenuCandidateObserved,true);
assert.equal(r.strongTotalStakeMenuCandidateCount,1);
assert.equal(r.strongTotalStakeMenuCandidates[0].semanticClass,'EXPLICIT_TOTAL_STAKE_MENU');
assert.equal(r.strongTotalStakeMenuCandidates[0].valueWasArray,true);
assert.deepEqual(r.strongTotalStakeMenuCandidates[0].numericValues,[0.1,0.2,0.5]);
assert.equal(r.servedStakeMenuSemanticsVerified,false);
assert.equal(r.stakeAtDecisionExactVerified,false);
assert.equal(r.execution.decision,'NO_PLAY');
assert.equal(r.execution.realMoneyAllowed,false);
assert.equal(r.hardGuards.clientSelectedBetValuesIgnored,true);
assert.equal(r.hardGuards.strongMenuCandidateStillRequiresIndependentReview,true);
assert.equal(r.candidates.some(x=>x.numericValues.includes(999)),false);
assert.equal(r.candidates.some(x=>x.numericValues.includes(777)),false);
let serialized=JSON.stringify(r);
for(const secret of ['LAUNCH_SECRET','COOKIE_SECRET','QUERY_SECRET','HEADER_SECRET','CLIENT_SECRET','RESPONSE_SECRET','WS_QUERY_SECRET','SEND_SECRET','RECEIVE_SECRET'])assert.equal(serialized.includes(secret),false);
assert.equal(serialized.includes('?'),false);

// Preserve-log traffic after another real game launch cannot be attributed to Frankie.
r=discoverBetfairSportingStakeMenuCandidates({log:{entries:[launcher(FRANKIE),launcher(AP),cfg]}},{gameId:FRANKIE});
assert.equal(r.valid,true);
assert.equal(r.stakeMenuCandidateObserved,false);
assert.equal(r.candidateCount,0);
assert.equal(r.strongTotalStakeMenuCandidateObserved,false);
assert.equal(r.execution.maxSpins,0);

const malformed=discoverBetfairSportingStakeMenuCandidates('{bad',{gameId:FRANKIE});
assert.equal(malformed.valid,false);
assert.equal(malformed.reason,'HAR_PARSE_FAILED');
assert.equal(malformed.execution.realMoneyAllowed,false);

console.log('betfair-sporting-stake-menu-har-discovery-v1.test.mjs: PASS');

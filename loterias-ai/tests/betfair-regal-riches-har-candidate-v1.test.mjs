import assert from 'node:assert/strict';
import {extractBetfairRegalRichesHarCandidate} from '../edge-live/betfair-regal-riches-har-candidate-v1.mjs';

const entry=(url,text)=>({request:{url,headers:[]},response:{status:200,headers:[],content:{mimeType:'application/json',text}}});
const launcher='https://launcher.betfair.es/?RPBucket=casino&dataChannel=casino&gameId=regal-riches-aig&launchProduct=casino&mode=real&token=LAUNCH_SECRET';
const har={log:{entries:[
  entry(launcher,''),
  entry('https://games.example/config?session=SECRET','Regal Riches IGT RTP 94.21 denomination bet level Progressive Wild Guaranteed Wild'),
  entry('https://games.example/state?auth=SECRET','Regal Riches Progressive Wild blue meter purple meter green meter yellow meter persistent current meter state')
]}};
const out=extractBetfairRegalRichesHarCandidate(har,{sourceName:'regal.har'});
assert.equal(out.valid,true);
assert.equal(out.targetLauncherObserved,true);
assert.equal(out.providerIgtCandidateCount>0,true);
assert.equal(out.configurationCandidateCount>0,true);
assert.equal(out.stateCandidateCount>0,true);
assert.equal(out.exactSpainServedIgtProviderFingerprintVerified,false);
assert.equal(out.crossPlayerPersistenceVerified,false);
assert.equal(out.stateSpecificEvVerified,false);
assert.equal(out.execution.decision,'NO_PLAY');
assert.equal(out.execution.realMoneyAllowed,false);
const serialized=JSON.stringify(out);
for(const secret of ['LAUNCH_SECRET','SECRET'])assert.equal(serialized.includes(secret),false);
assert.equal(serialized.includes('?'),false);

const fake={log:{entries:[entry('https://launcher.betfair.es/?RPBucket=casino&dataChannel=casino&gameId=other-game&mode=real',''),entry('https://games.example/state','Regal Riches IGT persistent blue meter')]}};
const blocked=extractBetfairRegalRichesHarCandidate(fake,{sourceName:'wrong.har'});
assert.equal(blocked.valid,false);
assert.equal(blocked.reason,'EXACT_BETFAIR_SPAIN_REGAL_RICHES_REAL_LAUNCHER_REQUIRED');
assert.equal(blocked.execution.realMoneyAllowed,false);

console.log('betfair-regal-riches-har-candidate-v1.test.mjs PASS');

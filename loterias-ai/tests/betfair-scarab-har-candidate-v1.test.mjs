import assert from 'node:assert/strict';
import {extractBetfairScarabHarCandidate} from '../edge-live/betfair-scarab-har-candidate-v1.mjs';

const entry=(url,text)=>({request:{url,headers:[]},response:{status:200,headers:[],content:{mimeType:'application/json',text}}});
const launcher='https://launcher.betfair.es/?RPBucket=casino&dataChannel=casino&gameId=scarab-aig&launchProduct=casino&mode=real&token=LAUNCH_SECRET';
const har={log:{entries:[
  entry(launcher,''),
  entry('https://games.example/config?secret=CONFIG_SECRET','Scarab IGT RTP 96.00 total bet denomination 10-spin cycle'),
  entry('https://games.example/state?auth=STATE_SECRET','Scarab game 6 of 10 gold border saved account denomination state')
]}};
const out=extractBetfairScarabHarCandidate(har,{sourceName:'scarab.har'});
assert.equal(out.valid,true);
assert.equal(out.targetLauncherObserved,true);
assert.equal(out.providerIgtCandidateCount>0,true);
assert.equal(out.cycleCandidateCount>0,true);
assert.equal(out.accountStateCandidateCount>0,true);
assert.equal(out.currentCycleStateVerified,false);
assert.equal(out.accountPrivateStateVerified,false);
assert.equal(out.initialStatePositiveEvVerified,false);
assert.equal(out.execution.decision,'NO_PLAY');
assert.equal(out.execution.realMoneyAllowed,false);
const serialized=JSON.stringify(out);
for(const secret of ['LAUNCH_SECRET','CONFIG_SECRET','STATE_SECRET'])assert.equal(serialized.includes(secret),false);
assert.equal(serialized.includes('?'),false);

const wrong={log:{entries:[entry('https://launcher.betfair.es/?RPBucket=casino&dataChannel=casino&gameId=other-aig&mode=real',''),entry('https://games.example/state','Scarab IGT game 9 of 10 gold border')]}};
const blocked=extractBetfairScarabHarCandidate(wrong,{sourceName:'wrong.har'});
assert.equal(blocked.valid,false);
assert.equal(blocked.reason,'EXACT_BETFAIR_SPAIN_SCARAB_REAL_LAUNCHER_REQUIRED');
assert.equal(blocked.execution.realMoneyAllowed,false);

console.log('betfair-scarab-har-candidate-v1.test.mjs PASS');

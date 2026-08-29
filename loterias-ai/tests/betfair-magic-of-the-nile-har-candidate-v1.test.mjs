import assert from 'node:assert/strict';
import {extractBetfairMagicOfTheNileHarCandidate} from '../edge-live/betfair-magic-of-the-nile-har-candidate-v1.mjs';

const entry=(url,text)=>({request:{url,headers:[]},response:{status:200,headers:[],content:{mimeType:'application/json',text}}});
const launcher='https://launcher.betfair.es/?RPBucket=casino&dataChannel=casino&gameId=magic-of-nile-aig&launchProduct=casino&mode=real&token=LAUNCH_SECRET';
const har={log:{entries:[
  entry(launcher,''),
  entry('https://games.example/config?secret=CONFIG_SECRET','Magic of the Nile IGT RTP total bet denomination three obelisks free respin modifier'),
  entry('https://games.example/state?auth=STATE_SECRET','Magic of the Nile red gem blue gem green gem obelisk saved separately per bet level remain between sessions')
]}};
const out=extractBetfairMagicOfTheNileHarCandidate(har,{sourceName:'nile.har'});
assert.equal(out.valid,true);
assert.equal(out.targetLauncherObserved,true);
assert.equal(out.providerIgtCandidateCount>0,true);
assert.equal(out.configurationCandidateCount>0,true);
assert.equal(out.gemStateCandidateCount>0,true);
assert.equal(out.currentGemVectorVerified,false);
assert.equal(out.accountPrivateStateVerified,false);
assert.equal(out.stateSpecificEvVerified,false);
assert.equal(out.execution.decision,'NO_PLAY');
assert.equal(out.execution.realMoneyAllowed,false);
const serialized=JSON.stringify(out);
for(const secret of ['LAUNCH_SECRET','CONFIG_SECRET','STATE_SECRET'])assert.equal(serialized.includes(secret),false);
assert.equal(serialized.includes('?'),false);

const wrong={log:{entries:[entry('https://launcher.betfair.es/?RPBucket=casino&dataChannel=casino&gameId=other-aig&mode=real',''),entry('https://games.example/state','Magic of the Nile IGT red gem blue gem green gem')]}};
const blocked=extractBetfairMagicOfTheNileHarCandidate(wrong,{sourceName:'wrong.har'});
assert.equal(blocked.valid,false);
assert.equal(blocked.reason,'EXACT_BETFAIR_SPAIN_MAGIC_OF_THE_NILE_REAL_LAUNCHER_REQUIRED');
assert.equal(blocked.execution.realMoneyAllowed,false);

console.log('betfair-magic-of-the-nile-har-candidate-v1.test.mjs PASS');

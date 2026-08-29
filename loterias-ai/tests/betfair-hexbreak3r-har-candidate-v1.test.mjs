import assert from 'node:assert/strict';
import {extractBetfairHexbreak3rHarCandidate} from '../edge-live/betfair-hexbreak3r-har-candidate-v1.mjs';

const launcherUrl='https://launcher.betfair.es/?RPBucket=casino&dataChannel=casino&gameId=hexbreak3r-aig&launchProduct=casino&mode=real&token=SECRET';
const har={log:{entries:[
  {request:{url:launcherUrl},response:{status:200,content:{text:''}}},
  {request:{url:'https://games.example/config?secret=ABC'},response:{status:200,content:{mimeType:'application/json',text:JSON.stringify({title:'Hexbreak3r',provider:'IGT',rtp:'96.5%',betLevels:[0.8,1.6,2.4,3.2,4.0],mechanic:'expanding reel horseshoe luck zone progressive reel 3 ways to win persistent per bet level'})}}}
]}};

const out=extractBetfairHexbreak3rHarCandidate(har,{sourceName:'hex.har'});
assert.equal(out.valid,true);
assert.equal(out.target.gameId,'hexbreak3r-aig');
assert.equal(out.exactSpainGameIdPubliclyVerified,true);
assert.equal(out.targetLauncherObserved,true);
assert.equal(out.providerIgtCandidateCount,1);
assert.equal(out.configurationCandidateCount,1);
assert.equal(out.reelStateCandidateCount,1);
assert.equal(out.exactCurrentReelHeightsVerified,false);
assert.equal(out.stateSpecificEvVerified,false);
assert.equal(out.usableForExecution,false);
assert.equal(out.execution.decision,'NO_PLAY');
assert.equal(out.execution.realMoneyAllowed,false);
const serialized=JSON.stringify(out);
assert.equal(serialized.includes('SECRET'),false);
assert.equal(serialized.includes('ABC'),false);
assert.equal(serialized.includes('?'),false);

const wrongLauncher=JSON.parse(JSON.stringify(har));
wrongLauncher.log.entries[0].request.url=launcherUrl.replace('hexbreak3r-aig','guessed-hex-id');
const wrong=extractBetfairHexbreak3rHarCandidate(wrongLauncher,{sourceName:'wrong.har'});
assert.equal(wrong.valid,false);
assert.equal(wrong.reason,'EXACT_BETFAIR_SPAIN_HEXBREAK3R_REAL_LAUNCHER_REQUIRED');
assert.equal(wrong.execution.realMoneyAllowed,false);

console.log('betfair-hexbreak3r-har-candidate-v1.test.mjs PASS');

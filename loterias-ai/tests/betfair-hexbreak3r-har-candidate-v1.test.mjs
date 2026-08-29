import assert from 'node:assert/strict';
import {extractBetfairHexbreak3rHarCandidate} from '../edge-live/betfair-hexbreak3r-har-candidate-v1.mjs';

const launcherUrl='https://launcher.betfair.es/?RPBucket=casino&dataChannel=casino&gameId=observed-hex-id&launchProduct=casino&mode=real&token=SECRET';
const har={log:{entries:[
  {request:{url:launcherUrl},response:{status:200,content:{text:''}}},
  {request:{url:'https://games.example/config?secret=ABC'},response:{status:200,content:{mimeType:'application/json',text:JSON.stringify({title:'Hexbreak3r',provider:'IGT',rtp:'96.5%',betLevels:[0.8,1.6,2.4,3.2,4.0],mechanic:'expanding reel horseshoe luck zone progressive reel 3 ways to win persistent per bet level'})}}}
]}};

const out=extractBetfairHexbreak3rHarCandidate(har,{sourceName:'hex.har'});
assert.equal(out.valid,true);
assert.equal(out.identityCandidateVerified,true);
assert.deepEqual(out.observedTitleBoundGameIds,['observed-hex-id']);
assert.equal(out.providerIgtCandidateCount,1);
assert.equal(out.configurationCandidateCount,1);
assert.equal(out.reelStateCandidateCount,1);
assert.equal(out.exactSpainGameIdIndependentlyReviewed,false);
assert.equal(out.exactCurrentReelHeightsVerified,false);
assert.equal(out.stateSpecificEvVerified,false);
assert.equal(out.usableForExecution,false);
assert.equal(out.execution.decision,'NO_PLAY');
assert.equal(out.execution.realMoneyAllowed,false);
const serialized=JSON.stringify(out);
assert.equal(serialized.includes('SECRET'),false);
assert.equal(serialized.includes('ABC'),false);
assert.equal(serialized.includes('?'),false);

const noLauncher=extractBetfairHexbreak3rHarCandidate({log:{entries:[]}},{sourceName:'none.har'});
assert.equal(noLauncher.valid,false);
assert.equal(noLauncher.execution.realMoneyAllowed,false);

console.log('betfair-hexbreak3r-har-candidate-v1.test.mjs PASS');

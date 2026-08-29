import assert from 'node:assert/strict';
import {extractBetfairGoldenEgyptHarCandidate} from '../edge-live/betfair-golden-egypt-har-candidate-v1.mjs';

const launcher='https://launcher.betfair.es/?RPBucket=arcade&dataChannel=arcade&gameId=golden-egypt-aem&launchProduct=arcade&mode=real&token=SECRET';
const har={log:{entries:[
  {request:{url:launcher},response:{status:200,content:{text:''}}},
  {request:{url:'https://game.example/help?secret=ABC'},response:{status:200,content:{mimeType:'text/plain',text:'Golden Egypt IGT Wild Stays 2 Plays. Collect two Coin symbols on the same reel and that reel is Wild for the next two spins. 25 paylines. Total Bet. RTP.'}}}
]}};
const out=extractBetfairGoldenEgyptHarCandidate(har,{sourceName:'golden.har'});
assert.equal(out.valid,true);
assert.equal(out.targetLauncherObserved,true);
assert.equal(out.providerIgtCandidateCount,1);
assert.equal(out.igtWildStaysMechanicCandidateCount,1);
assert.equal(out.persistentStateCandidateCount,1);
assert.equal(out.exactSpainProviderVerified,false);
assert.equal(out.exactSpainIgtWildStays2PlaysVerified,false);
assert.equal(out.usableForExecution,false);
assert.equal(out.execution.decision,'NO_PLAY');
const serialized=JSON.stringify(out);
assert.equal(serialized.includes('SECRET'),false);
assert.equal(serialized.includes('ABC'),false);
assert.equal(serialized.includes('?'),false);

const mgaHar=JSON.parse(JSON.stringify(har));
mgaHar.log.entries[1].response.content.text='Golden Egypt MGA Games RTP 90% apuesta total';
const mga=extractBetfairGoldenEgyptHarCandidate(mgaHar,{sourceName:'mga.har'});
assert.equal(mga.valid,true);
assert.equal(mga.providerMgaCandidateCount,1);
assert.equal(mga.igtWildStaysMechanicCandidateCount,0);
assert.equal(mga.execution.realMoneyAllowed,false);

console.log('betfair-golden-egypt-har-candidate-v1.test.mjs PASS');

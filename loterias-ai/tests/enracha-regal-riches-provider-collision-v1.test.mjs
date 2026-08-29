import assert from 'node:assert/strict';
import {extractEnRachaIgtPersistentHarCandidate as extract} from '../edge-live/enracha-igt-persistent-har-candidate-v1.mjs';

const entry=(url,body)=>({request:{url,headers:[]},response:{status:200,content:{mimeType:'application/json',text:body}}});

const rtgHar={log:{entries:[
  entry('https://www.enracha.es/juegos/regal-riches','Regal Riches'),
  entry('https://games.example/config',JSON.stringify({title:'Regal Riches',provider:'Realtime Gaming',rtp:94.00,minBet:0.10,maxBet:10})),
  entry('https://games.example/help','Regal Riches banked meter remains persistent by bet level')
]}};
let r=extract(rtgHar,{gameId:'regal-riches',sourceName:'regal-rtg.har'});
assert.equal(r.valid,true);
assert.equal(r.providerConflictCandidateCount,1);
assert.equal(r.configurationCandidateCount,0);
assert.equal(r.stateCandidateCount,0);
assert.equal(r.reason,'KNOWN_TITLE_COLLISION_REQUIRES_EXACT_PROVIDER_REVIEW');
assert.equal(r.usableForExecution,false);
assert.equal(r.execution.realMoneyAllowed,false);

const unknownProviderHar={log:{entries:[
  entry('https://www.enracha.es/juegos/regal-riches','Regal Riches'),
  entry('https://games.example/help','Regal Riches Guaranteed Wilds blue meter remains persistent by bet level')
]}};
r=extract(unknownProviderHar,{gameId:'regal-riches'});
assert.equal(r.configurationCandidateCount,0);
assert.equal(r.stateCandidateCount,0);
assert.equal(r.execution.decision,'NO_PLAY');

const igtHar={log:{entries:[
  entry('https://www.enracha.es/juegos/regal-riches','Regal Riches'),
  entry('https://games.example/config',JSON.stringify({title:'Regal Riches',provider:'IGT',rtp:94.00,minBet:0.10,maxBet:10})),
  entry('https://games.example/help','Regal Riches IGT Guaranteed Wilds blue meter remains persistent by bet level')
]}};
r=extract(igtHar,{gameId:'regal-riches'});
assert.equal(r.providerConflictCandidateCount,0);
assert.equal(r.configurationCandidateCount,1);
assert.equal(r.stateCandidateCount,1);
assert.equal(r.usableForExecution,false);

console.log('enracha-regal-riches-provider-collision-v1.test.mjs: PASS');

import assert from 'node:assert/strict';
import {extractEnRachaIgtPersistentHarCandidate as extract,supportedEnRachaIgtTargets} from '../edge-live/enracha-igt-persistent-har-candidate-v1.mjs';

const entry=(url,body,status=200,mimeType='application/json')=>({request:{method:'GET',url,headers:[{name:'Authorization',value:'Bearer REQUEST_SECRET'},{name:'Cookie',value:'sid=COOKIE_SECRET'}]},response:{status,headers:[{name:'Set-Cookie',value:'server=SECRET'}],content:{mimeType,text:body}}});

const regal={log:{entries:[
  entry('https://www.enracha.es/juegos/regal-riches?token=PAGE_SECRET','<html>Regal Riches</html>',200,'text/html'),
  entry('https://games.example/config?session=CONFIG_SECRET',JSON.stringify({title:'Regal Riches',provider:'IGT',rtp:94.00,minBet:0.10,maxBet:10.00})),
  entry('https://games.example/help?token=RULE_SECRET','Regal Riches stores banked Guaranteed Wilds by bet level. Blue meter and Purple meter progress remain persistent until reset.')
]}};
let r=extract(regal,{gameId:'regal-riches',sourceName:'regal.har'});
assert.equal(r.valid,true);
assert.equal(r.targetPageObserved,true);
assert.equal(r.providerTitleCandidateCount,1);
assert.equal(r.configurationCandidateCount,1);
assert.equal(r.stateCandidateCount,1);
assert.equal(r.exactEnRachaIgtWrapperFingerprintVerified,false);
assert.equal(r.persistentStateSemanticsVerified,false);
assert.equal(r.crossPlayerPersistenceVerified,false);
assert.equal(r.abandonedStateVisibleBeforeWagerVerified,false);
assert.equal(r.execution.decision,'NO_PLAY');
assert.equal(r.execution.realMoneyAllowed,false);
const serialized=JSON.stringify(r);
for(const secret of ['PAGE_SECRET','CONFIG_SECRET','RULE_SECRET','REQUEST_SECRET','COOKIE_SECRET','stores banked'])assert.equal(serialized.includes(secret),false);

const ocean={log:{entries:[
  entry('https://www.enracha.es/juegos/ocean-magic','Ocean Magic',200,'text/html'),
  entry('https://games.example/config',JSON.stringify({title:'Ocean Magic',provider:'International Game Technology',rtp:'92.18',minimumBet:'0.50',maximumBet:'250.00'})),
  entry('https://games.example/rules','Ocean Magic Wild Bubble positions persist by bet level between spins.')
]}};
r=extract(ocean,{gameId:'ocean-magic'});
assert.equal(r.valid,true);
assert.equal(r.configurationCandidateCount,1);
assert.equal(r.stateCandidateCount,1);
assert.equal(r.candidates.some(x=>x.concepts.stateMechanic&&x.concepts.persistence&&x.concepts.betLevel),true);
assert.equal(r.usableForExecution,false);

r=extract({log:{entries:[entry('https://www.enracha.es/juegos/other','generic game')] }},{gameId:'regal-riches'});
assert.equal(r.valid,false);
assert.equal(r.reason,'EXACT_ENRACHA_TARGET_SESSION_MARKER_REQUIRED');

r=extract(regal,{gameId:'not-supported'});
assert.equal(r.valid,false);
assert.equal(r.reason,'SUPPORTED_TARGET_GAME_REQUIRED');
assert.equal(Object.keys(supportedEnRachaIgtTargets()).length,2);

console.log('enracha-igt-persistent-har-candidate-v1.test.mjs: PASS');

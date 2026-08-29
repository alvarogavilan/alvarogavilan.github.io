import assert from 'node:assert/strict';
import {analyzeEnRachaIgtHarText} from '../scripts/analyze-enracha-igt-har.mjs';

const har={log:{entries:[
  {request:{url:'https://www.enracha.es/juegos/regal-riches?token=PAGE_SECRET',headers:[]},response:{status:200,content:{mimeType:'text/html',text:'Regal Riches'}}},
  {request:{url:'https://games.example/config?token=CONFIG_SECRET',headers:[{name:'Cookie',value:'sid=COOKIE_SECRET'}]},response:{status:200,content:{mimeType:'application/json',text:JSON.stringify({title:'Regal Riches',provider:'IGT',rtp:94.00,minBet:0.10,maxBet:10.00})}}},
  {request:{url:'https://games.example/help?token=RULE_SECRET',headers:[]},response:{status:200,content:{mimeType:'text/plain',text:'Regal Riches keeps banked Guaranteed Wilds persistent by bet level in the Blue meter.'}}}
]}};

let r=analyzeEnRachaIgtHarText(JSON.stringify(har),{gameId:'regal-riches',sourceName:'regal.har'});
assert.equal(r.ok,true);
assert.equal(r.analysis.valid,true);
assert.equal(r.analysis.configurationCandidateCount,1);
assert.equal(r.analysis.stateCandidateCount,1);
assert.equal(r.analysis.crossPlayerPersistenceVerified,false);
assert.equal(r.execution.decision,'NO_PLAY');
assert.equal(r.execution.realMoneyAllowed,false);
const serialized=JSON.stringify(r);
for(const secret of ['PAGE_SECRET','CONFIG_SECRET','RULE_SECRET','COOKIE_SECRET','keeps banked'])assert.equal(serialized.includes(secret),false);

r=analyzeEnRachaIgtHarText('{bad',{gameId:'regal-riches'});
assert.equal(r.ok,false);
assert.equal(r.reason,'HAR_PARSE_FAILED');
assert.equal(r.execution.realMoneyAllowed,false);

r=analyzeEnRachaIgtHarText(JSON.stringify(har),{gameId:'unsupported'});
assert.equal(r.ok,true);
assert.equal(r.analysis.valid,false);
assert.equal(r.analysis.reason,'SUPPORTED_TARGET_GAME_REQUIRED');
assert.equal(r.execution.realMoneyAllowed,false);

console.log('analyze-enracha-igt-har-v1.test.mjs: PASS');

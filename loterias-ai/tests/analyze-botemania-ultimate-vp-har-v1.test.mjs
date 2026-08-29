import assert from 'node:assert/strict';
import {analyzeBotemaniaUltimateVpHarText} from '../scripts/analyze-botemania-ultimate-vp-har.mjs';

const har={log:{entries:[
  {request:{url:'https://www.botemania.es/juegos/casino-online/ultimate-video-poker?token=PAGE_SECRET',headers:[]},response:{status:200,content:{mimeType:'text/html',text:'Ultimate Video Poker'}}},
  {request:{url:'https://games.example/rules?token=RULE_SECRET',headers:[{name:'Cookie',value:'sid=COOKIE_SECRET'}]},response:{status:200,content:{mimeType:'text/plain',text:'The progressive jackpot is awarded for a Royal Flush of Spades when 5 coins are wagered at max bet.'}}}
]}};
let r=analyzeBotemaniaUltimateVpHarText(JSON.stringify(har),{sourceName:'u.har'});
assert.equal(r.ok,true);
assert.equal(r.analysis.valid,true);
assert.equal(r.analysis.triggerCandidateCount,1);
assert.equal(r.analysis.qualifyingStakeCandidateCount,1);
assert.equal(r.execution.decision,'NO_PLAY');
assert.equal(r.execution.realMoneyAllowed,false);
const s=JSON.stringify(r);
for(const secret of ['PAGE_SECRET','RULE_SECRET','COOKIE_SECRET','Royal Flush of Spades'])assert.equal(s.includes(secret),false);

r=analyzeBotemaniaUltimateVpHarText('{bad');
assert.equal(r.ok,false);
assert.equal(r.reason,'HAR_PARSE_FAILED');
assert.equal(r.execution.realMoneyAllowed,false);

console.log('analyze-botemania-ultimate-vp-har-v1.test.mjs: PASS');

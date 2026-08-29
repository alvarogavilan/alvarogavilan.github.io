import assert from 'node:assert/strict';
import {extractBotemaniaUltimateVpHarRuleCandidates as extract} from '../edge-live/botemania-ultimate-vp-har-rule-candidate-v1.mjs';

const entry=(url,body,status=200,mimeType='application/json')=>({request:{method:'GET',url,headers:[{name:'Authorization',value:'Bearer REQUEST_SECRET'},{name:'Cookie',value:'sid=COOKIE_SECRET'}]},response:{status,headers:[{name:'Set-Cookie',value:'server=SECRET'}],content:{mimeType,text:body}}});
const har={log:{entries:[
  entry('https://www.botemania.es/juegos/casino-online/ultimate-video-poker?token=PAGE_SECRET','<html>Ultimate Video Poker</html>',200,'text/html'),
  entry('https://games.example/config?session=CONFIG_SECRET',JSON.stringify({title:'Ultimate Video Poker',provider:'Roxor Gaming'})),
  entry('https://games.example/help/rules?token=RULE_SECRET','For Jotas o Mejor Progresivo, the progressive jackpot is awarded only for a Royal Flush of Spades. To qualify for the jackpot, wager 5 coins at the maximum bet. The ordinary Royal Flush pays 800x.'),
]}};

let r=extract(har,{sourceName:'ultimate.har'});
assert.equal(r.valid,true);
assert.equal(r.targetPageObserved,true);
assert.equal(r.triggerCandidateCount,1);
assert.equal(r.qualifyingStakeCandidateCount,1);
assert.equal(r.candidateCount,1);
assert.equal(r.candidates[0].concepts.royalFlush,true);
assert.equal(r.candidates[0].concepts.spades,true);
assert.equal(r.candidates[0].concepts.exactFiveCoins,true);
assert.equal(r.candidates[0].concepts.maxBet,true);
assert.equal(r.candidates[0].concepts.ordinaryRoyal800,true);
assert.equal(r.candidates[0].reviewUse,'TRIGGER_AND_QUALIFYING_STAKE_REVIEW_CANDIDATE');
assert.equal(r.exactJackpotTriggerVerified,false);
assert.equal(r.exactJackpotQualifyingStakeVerified,false);
assert.equal(r.execution.decision,'NO_PLAY');
assert.equal(r.execution.realMoneyAllowed,false);
const serialized=JSON.stringify(r);
for(const secret of ['PAGE_SECRET','CONFIG_SECRET','RULE_SECRET','REQUEST_SECRET','COOKIE_SECRET'])assert.equal(serialized.includes(secret),false);
assert.equal(serialized.includes('Royal Flush of Spades'),false);

r=extract({log:{entries:[entry('https://www.botemania.es/otra-pagina','generic jackpot rules')]}});
assert.equal(r.valid,false);
assert.equal(r.reason,'EXACT_ULTIMATE_VIDEO_POKER_SESSION_MARKER_REQUIRED');

r=extract({log:{entries:[entry('https://www.botemania.es/juegos/casino-online/ultimate-video-poker','<html>Ultimate Video Poker</html>',200,'text/html'),entry('https://games.example/assets.js','ordinary video poker help with no progressive rule',200,'application/javascript')]}});
assert.equal(r.valid,true);
assert.equal(r.candidateCount,0);
assert.equal(r.reason,'TARGET_SESSION_FOUND_BUT_NO_DECISIVE_RULE_CANDIDATE_RECOVERED');
assert.equal(r.usableForExecution,false);

console.log('botemania-ultimate-vp-har-rule-candidate-v1.test.mjs: PASS');

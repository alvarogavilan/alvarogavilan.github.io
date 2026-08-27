import assert from 'node:assert/strict';
import {detectBet365SportingServedFollowingDayRuleCandidate as detect} from '../edge-backend/src/bet365-sporting-served-following-day-rule-candidate-v1.mjs';

const play=()=>({startedDateTime:'2026-08-27T01:00:00.000Z',request:{method:'GET',url:'https://casino.bet365.es/play/FrankBrunoSL',headers:[]},response:{status:200,content:{text:'login'}}});
const launch=()=>({startedDateTime:'2026-08-27T01:00:01.000Z',request:{method:'GET',url:'https://casino.bet365.es/launch?game=gpas_slfbruno_pop&token=SECRET',headers:[]},response:{status:200,content:{mimeType:'application/json',text:JSON.stringify({title:'Frank Bruno: Sporting Legends',gameCode:'gpas_slfbruno_pop'})}}});
const config=()=>({startedDateTime:'2026-08-27T01:00:02.000Z',request:{method:'GET',url:'https://casino.bet365.es/initialResources/es_ES_desktop?token=HIDDEN',headers:[]},response:{status:200,content:{mimeType:'application/json',text:JSON.stringify({jackpotsCasino:'bet365_es',jackpotsCasinoUrl:'https://ticker.example/webtickers?token=HIDDEN',liveEndpointUrl:'wss://ticker.example/webtickers?session=HIDDEN',useServicesCasinoJackpots:true})}}});
const ticker=()=>({startedDateTime:'2026-08-27T01:00:03.000Z',request:{method:'GET',url:'wss://ticker.example/webtickers?info=1&game=sljp-1&casino=bet365_es&currency=EUR&local=0&instanceCode=es1&token=QUERY_SECRET',headers:[]},response:{status:101,content:{text:''}},_webSocketMessages:[]});
const rules=(host='help.bet365.es',text='If no gameplay takes place at the time at which the Daily Jackpot must be won, that jackpot will be triggered by the first bet placed the following day.')=>({startedDateTime:'2026-08-27T01:00:04.000Z',request:{method:'GET',url:`https://${host}/game-rules/frank?token=RULE_SECRET`,headers:[]},response:{status:200,content:{mimeType:'text/html',text}}});

let r=detect({log:{entries:[play(),launch(),config(),ticker(),rules()]}},{gameCode:'gpas_slfbruno_pop',sourceName:'frank-current.har'});
assert.equal(r.valid,true);
assert.equal(r.operatorOwnedRuleTextCandidateObserved,true);
assert.equal(r.bet365FollowingDayRuleAdoptionVerified,false);
assert.equal(r.independentRuleReviewRequired,true);
assert.equal(r.ruleCandidate.evidence.dailyJackpotContext,true);
assert.equal(r.ruleCandidate.evidence.firstBetPhrase,true);
assert.equal(r.ruleCandidate.evidence.followingDayPhrase,true);
assert.equal(r.usableForExecution,false);
assert.equal(r.execution.decision,'NO_PLAY');
for(const secret of ['SECRET','HIDDEN','QUERY_SECRET','RULE_SECRET'])assert.equal(JSON.stringify(r).includes(secret),false);

r=detect({log:{entries:[play(),launch(),config(),ticker(),rules('rules.example')]}},{gameCode:'gpas_slfbruno_pop'});
assert.equal(r.valid,false);
assert.equal(r.reason,'OPERATOR_RULE_TEXT_CANDIDATE_NOT_FOUND');
assert.equal(r.bet365FollowingDayRuleAdoptionVerified,false);

r=detect({log:{entries:[play(),launch(),config(),ticker(),rules('help.bet365.es','The Daily Jackpot is available every day. Any bet may win.')]}},{gameCode:'gpas_slfbruno_pop'});
assert.equal(r.valid,false);
assert.equal(r.reason,'OPERATOR_RULE_TEXT_CANDIDATE_NOT_FOUND');

r=detect({log:{entries:[launch(),config(),ticker(),rules()]}},{gameCode:'gpas_slfbruno_pop'});
assert.equal(r.valid,false);
assert.equal(r.reason,'EXACT_SERVED_SLJP1_BINDING_REQUIRED');

console.log('bet365-sporting-served-following-day-rule-candidate-v1.test.mjs: PASS');

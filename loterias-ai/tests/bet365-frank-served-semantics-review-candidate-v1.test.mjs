import assert from 'node:assert/strict';
import {buildBet365FrankServedSemanticsReviewCandidate as build} from '../edge-backend/src/bet365-frank-served-semantics-review-candidate-v1.mjs';

const GAME='gpas_slfbruno_pop';
const xml='<request currency="eur" startTimestamp="1787790000" execInterval="10" game="sljp-1" casino="bet365_es" info="1"><gamedata timestamp="1787790005" local="0" winc="7" gamegroup="sljp" game="sljp-1"><amount-list><amount pos="0" sign="€" step="0" wins="0.00" instancecode="es1" currency="eur" guaranteedHitTime="1787790100">1500.01</amount></amount-list></gamedata></request>';
const entry=(url,time,body,mime='application/json')=>({startedDateTime:time,request:{method:'GET',url,headers:[]},response:{status:200,content:{mimeType:mime,text:body}},_webSocketMessages:[]});
const rule='Frank Bruno Sporting Legends jackpot rules. If no gameplay takes place when the Daily Jackpot must be won, the jackpot will be triggered by the first bet placed the following day. Any bet of any size can win the Daily Jackpot, but a larger bet has a greater chance.';
function har({stake=true,ruleHost='help.bet365.es',ruleText=rule}={}){return {log:{entries:[
  entry('https://casino.bet365.es/play/FrankBrunoSL','2026-08-27T05:40:00Z','login','text/html'),
  entry(`https://casino.bet365.es/launch?game=${GAME}&token=SECRET`,'2026-08-27T05:40:01Z',JSON.stringify({title:'Frank Bruno: Sporting Legends',gameCode:GAME})),
  entry('https://casino.bet365.es/initialResources/es_ES_desktop?token=HIDDEN','2026-08-27T05:40:02Z',JSON.stringify({jackpotsCasino:'bet365_es',jackpotsCasinoUrl:'https://ticker.example/new_jackpotxml.php?token=HIDDEN',liveEndpointUrl:'https://ticker.example/new_jackpotxml.php?session=HIDDEN',useServicesCasinoJackpots:true,...(stake?{currency:'EUR',availableTotalBets:[0.10,0.20,0.50]}:{})})),
  entry('https://ticker.example/new_jackpotxml.php?info=1&game=sljp-1&casino=bet365_es&currency=EUR&local=0&instanceCode=es1&token=QUERY_SECRET','2026-08-27T05:40:06Z',xml,'application/xml'),
  entry(`https://${ruleHost}/game-rules/frank?session=RULE_SECRET`,'2026-08-27T05:40:07Z',ruleText,'text/plain'),
]}};}

let r=build(har(),{sourceName:'frank-current.har'});
assert.equal(r.valid,true);
assert.equal(r.reason,'BOTH_OPERATOR_RULE_AND_TEN_CENT_ELIGIBILITY_REVIEW_CANDIDATES_ASSEMBLED');
assert.equal(r.binding.exactBet365SpainFrontendToConfiguredSljp1TransportBindingVerified,true);
assert.equal(r.servedStake.servedTenCentTotalStakeVerified,true);
assert.equal(r.followingDayOperatorRuleReviewCandidate,true);
assert.equal(r.tenCentJackpotEligibilityReviewCandidate,true);
assert.equal(r.bothExecutionSemanticsReviewCandidatesPresent,true);
assert.equal(r.bet365FollowingDayRuleAdoptionVerified,false);
assert.equal(r.servedTenCentJackpotEligibilityVerified,false);
assert.equal(r.independentReviewRequired,true);
assert.equal(r.usableForExecution,false);
assert.equal(r.execution.decision,'NO_PLAY');
assert.equal(r.ruleEvidence.followingDayBodySha256.length,1);
assert.equal(r.ruleEvidence.anySizeEligibilityBodySha256.length,1);
for(const forbidden of ['SECRET','HIDDEN','QUERY_SECRET','RULE_SECRET',rule])assert.equal(JSON.stringify(r).includes(forbidden),false);

r=build(har({stake:false}));
assert.equal(r.valid,false);assert.equal(r.reason,'EXPLICIT_SERVED_TEN_CENT_TOTAL_STAKE_REQUIRED');assert.equal(r.execution.realMoneyAllowed,false);

r=build(har({ruleHost:'rules.example'}));
assert.equal(r.valid,true);assert.equal(r.reason,'NO_EXECUTION_SEMANTICS_REVIEW_CANDIDATE_FOUND');assert.equal(r.followingDayOperatorRuleReviewCandidate,false);assert.equal(r.tenCentJackpotEligibilityReviewCandidate,false);

r=build(har({ruleText:'Frank Bruno Sporting Legends Daily Jackpot. Any bet of any size can win the Daily Jackpot, and a larger bet has a greater chance.'}));
assert.equal(r.valid,true);assert.equal(r.reason,'TEN_CENT_ELIGIBILITY_REVIEW_CANDIDATE_ONLY');assert.equal(r.followingDayOperatorRuleReviewCandidate,false);assert.equal(r.tenCentJackpotEligibilityReviewCandidate,true);

console.log('bet365-frank-served-semantics-review-candidate-v1.test.mjs: PASS');

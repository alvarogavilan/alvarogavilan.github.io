import assert from 'node:assert/strict';
import {discoverBet365FrankServedRulesCandidate as discover} from '../edge-backend/src/bet365-frank-served-rules-candidate-v1.mjs';

const GAME='gpas_slfbruno_pop';
const xml='<request currency="eur" startTimestamp="1787790000" execInterval="10" game="sljp-1" casino="bet365_es" info="1"><gamedata timestamp="1787790005" local="0" winc="7" gamegroup="sljp" game="sljp-1"><amount-list><amount pos="0" sign="€" step="0" wins="0.00" instancecode="es1" currency="eur" guaranteedHitTime="1787790100">1500.01</amount></amount-list></gamedata></request>';
const entry=(url,time,body,mime='application/json')=>({startedDateTime:time,request:{method:'GET',url,headers:[]},response:{status:200,content:{mimeType:mime,text:body}},_webSocketMessages:[]});
function base(extra=[]){return {log:{entries:[
  entry('https://casino.bet365.es/play/FrankBrunoSL','2026-08-27T05:40:00Z','login','text/html'),
  entry(`https://casino.bet365.es/launch?game=${GAME}&token=SECRET`,'2026-08-27T05:40:01Z',JSON.stringify({title:'Frank Bruno: Sporting Legends',gameCode:GAME})),
  entry('https://casino.bet365.es/initialResources/es_ES_desktop?token=HIDDEN','2026-08-27T05:40:02Z',JSON.stringify({jackpotsCasino:'bet365_es',jackpotsCasinoUrl:'https://ticker.example/new_jackpotxml.php?token=HIDDEN',liveEndpointUrl:'https://ticker.example/new_jackpotxml.php?session=HIDDEN',useServicesCasinoJackpots:true})),
  entry('https://ticker.example/new_jackpotxml.php?info=1&game=sljp-1&casino=bet365_es&currency=EUR&local=0&instanceCode=es1&token=QUERY_SECRET','2026-08-27T05:40:06Z',xml,'application/xml'),
  ...extra,
]}};}

const allText='Frank Bruno Sporting Legends jackpot rules. The Daily Jackpot is guaranteed to be won within the remaining time. If it is not awarded, the first bet on the following day wins it. Any bet of any size can win the Daily Jackpot; a larger bet has a greater chance. The jackpots are funded by the operator and do not affect the RTP of the game.';
let r=discover(base([entry('https://casino.bet365.es/game-help/FrankBrunoSL?session=PRIVATE','2026-08-27T05:40:07Z',allText,'text/plain')]));
assert.equal(r.valid,true);
assert.equal(r.exactBet365SpainFrontendToConfiguredSljp1TransportBindingVerified,true);
assert.equal(r.candidateCount,1);
assert.equal(r.followingDayFirstBetRuleCandidateObserved,true);
assert.equal(r.anySizeJackpotEligibilityCandidateObserved,true);
assert.equal(r.operatorFundedJackpotRtpSeparationCandidateObserved,true);
assert.equal(r.operatorFundedJackpotRtpSeparationCandidateCount,1);
assert.equal(r.operatorRuleAdoptionVerified,false);
assert.equal(r.servedTenCentJackpotEligibilityVerified,false);
assert.equal(r.bet365JackpotDoesNotAffectGameRtpVerified,false);
assert.equal(r.independentSemanticReviewRequired,true);
assert.equal(r.usableForExecution,false);
assert.equal(r.execution.decision,'NO_PLAY');
assert.equal(r.candidates[0].responseHost,'casino.bet365.es');
assert.equal(r.candidates[0].responsePath,'/game-help/FrankBrunoSL');
assert.equal(r.candidates[0].concepts.operatorFunded,true);
assert.equal(r.candidates[0].concepts.jackpotDoesNotAffectRtp,true);
assert.match(r.candidates[0].bodySha256,/^[0-9a-f]{64}$/);
const serialized=JSON.stringify(r);
for(const forbidden of ['PRIVATE','SECRET','HIDDEN','QUERY_SECRET',allText])assert.equal(serialized.includes(forbidden),false);

r=discover(base([entry('https://provider.example/game-help','2026-08-27T05:40:07Z',allText,'text/plain')]));
assert.equal(r.valid,true);assert.equal(r.candidateCount,0);assert.equal(r.followingDayFirstBetRuleCandidateObserved,false);assert.equal(r.anySizeJackpotEligibilityCandidateObserved,false);assert.equal(r.operatorFundedJackpotRtpSeparationCandidateObserved,false);

r=discover(base([entry('https://casino.bet365.es/game-help/generic','2026-08-27T05:40:07Z','The first bet on the following day wins the Daily Jackpot. Any bet of any size can win. The jackpots are funded by the operator and do not affect the RTP of the game.','text/plain')]));
assert.equal(r.valid,true);assert.equal(r.candidateCount,0);

const rtpOnly='Frank Bruno Sporting Legends jackpot rules. The jackpots are funded by the operator and do not affect the RTP of the game.';
r=discover(base([entry('https://help.bet365.es/game-rules/frank','2026-08-27T05:40:07Z',rtpOnly,'text/plain')]));
assert.equal(r.valid,true);assert.equal(r.followingDayFirstBetRuleCandidateObserved,false);assert.equal(r.anySizeJackpotEligibilityCandidateObserved,false);assert.equal(r.operatorFundedJackpotRtpSeparationCandidateObserved,true);

r=discover({log:{entries:[entry('https://casino.bet365.es/game-help/FrankBrunoSL','2026-08-27T05:40:07Z',allText,'text/plain')]}});
assert.equal(r.valid,false);assert.equal(r.reason,'EXACT_FRANK_SERVED_SLJP1_BINDING_REQUIRED');assert.equal(r.execution.realMoneyAllowed,false);

console.log('bet365-frank-served-rules-candidate-v1.test.mjs: PASS');

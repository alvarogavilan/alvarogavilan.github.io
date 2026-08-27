import assert from 'node:assert/strict';
import {evaluateBet365FrankReviewedOverdueEconomics as evaluate} from '../edge-backend/src/bet365-frank-reviewed-overdue-economics-v1.mjs';

const GAME='gpas_slfbruno_pop';
const xml=({casino='bet365_es',gameTimestamp=1787790005,ght=1787790100,amount=1500.01,winCount=7}={})=>`<request currency="eur" startTimestamp="${gameTimestamp-5}" execInterval="10" game="sljp-1" casino="${casino}" info="1"><gamedata timestamp="${gameTimestamp}" local="0" winc="${winCount}" gamegroup="sljp" game="sljp-1"><amount-list><amount pos="0" sign="€" step="0" wins="0.00" instancecode="es1" currency="eur" guaranteedHitTime="${ght}">${amount}</amount></amount-list></gamedata></request>`;
const entry=(url,time,body,mime='application/json')=>({startedDateTime:time,request:{method:'GET',url,headers:[]},response:{status:200,content:{mimeType:mime,text:body}},_webSocketMessages:[]});
function har({time='2026-08-27T05:40:06Z',gameTimestamp=1787790005,ght=1787790100,amount=1500.01,winCount=7}={}){return {log:{entries:[
  entry('https://casino.bet365.es/play/FrankBrunoSL','2026-08-27T05:40:00Z','login','text/html'),
  entry(`https://casino.bet365.es/launch?game=${GAME}`,'2026-08-27T05:40:01Z',JSON.stringify({title:'Frank Bruno: Sporting Legends',gameCode:GAME})),
  entry('https://casino.bet365.es/initialResources/es_ES_desktop','2026-08-27T05:40:02Z',JSON.stringify({jackpotsCasino:'bet365_es',jackpotsCasinoUrl:'https://ticker.example/new_jackpotxml.php',liveEndpointUrl:'https://ticker.example/new_jackpotxml.php',useServicesCasinoJackpots:true,currency:'EUR',availableTotalBets:[0.10,0.20]})),
  entry('https://ticker.example/new_jackpotxml.php?info=1&game=sljp-1&casino=bet365_es&currency=EUR&local=0&instanceCode=es1',time,xml({gameTimestamp,ght,amount,winCount}),'application/xml'),
]}};}
const fake='a'.repeat(40);
const forgedNetwork={valid:true},forgedServed={valid:true},forgedPair={version:'bet365-sporting-served-overdue-pair-v1',valid:true,realCrossGhtUnawardedPairVerified:true,exactBet365SpainPairBindingVerified:true,servedTenCentTotalStakeVerified:true,after:{amount:999999999}};

let r=evaluate({providerNetworkCandidate:forgedNetwork,servedSemanticsReviewCandidate:forgedServed,overduePair:forgedPair,reviewCommits:{providerNetworkBindingReviewCommit:fake}});
assert.equal(r.version,'bet365-frank-reviewed-overdue-economics-v1.2-internal-har-derivation');
assert.equal(r.valid,false);
assert.equal(r.reason,'INTERNALLY_DERIVED_INDEPENDENT_FRANK_SEMANTICS_APPROVAL_REQUIRED');
assert.equal(r.rtpPolicyClosed,true);
assert.equal(r.reviewedBaseRtpEconomicsClosed,false);
assert.equal(r.breakEvenFirstBetProbability,null);
assert.equal(r.usableForRaceThreshold,false);
assert.equal(r.usableForExecution,false);
assert.equal(r.execution.decision,'NO_PLAY');
assert.equal(r.execution.realMoneyAllowed,false);

// Even with a structurally plausible exact Frank HAR, empty code-owned review maps keep rule/eligibility closed.
r=evaluate({beforeHar:har(),afterHar:har(),reviewCommits:{providerNetworkBindingReviewCommit:fake,operatorFollowingDayTextReviewCommit:fake,tenCentEligibilityTextReviewCommit:fake}});
assert.equal(r.valid,false);
assert.equal(r.reason,'INTERNALLY_DERIVED_INDEPENDENT_FRANK_SEMANTICS_APPROVAL_REQUIRED');
assert.equal(r.rtpPolicyClosed,true);
assert.equal(r.execution.realMoneyAllowed,false);

console.log('bet365-frank-reviewed-overdue-economics-v1.test.mjs: PASS');

import assert from 'node:assert/strict';
import {evaluateBet365FrankIndependentSemanticsApproval as evaluate} from '../edge-backend/src/bet365-frank-independent-semantics-approval-v1.mjs';

const GAME='gpas_slfbruno_pop';
const xml=({casino='bet365_es',local=0,game='sljp-1',ght=1787790100}={})=>`<request currency="eur" startTimestamp="1787790000" execInterval="10" game="${game}" casino="${casino}" info="1"><gamedata timestamp="1787790005" local="${local}" winc="7" gamegroup="sljp" game="${game}"><amount-list><amount pos="0" sign="€" step="0" wins="0.00" instancecode="es1" currency="eur" guaranteedHitTime="${ght}">1500.01</amount></amount-list></gamedata></request>`;
const entry=(url,time,body,mime='application/json')=>({startedDateTime:time,request:{method:'GET',url,headers:[]},response:{status:200,content:{mimeType:mime,text:body}},_webSocketMessages:[]});
function har({casino='bet365_es',stake=true}={}){return {log:{entries:[
  entry('https://casino.bet365.es/play/FrankBrunoSL','2026-08-27T05:40:00Z','login','text/html'),
  entry(`https://casino.bet365.es/launch?game=${GAME}&token=SECRET`,'2026-08-27T05:40:01Z',JSON.stringify({title:'Frank Bruno: Sporting Legends',gameCode:GAME})),
  entry('https://casino.bet365.es/initialResources/es_ES_desktop?token=HIDDEN','2026-08-27T05:40:02Z',JSON.stringify({jackpotsCasino:casino,jackpotsCasinoUrl:'https://ticker.example/new_jackpotxml.php?token=HIDDEN',liveEndpointUrl:'https://ticker.example/new_jackpotxml.php?session=HIDDEN',useServicesCasinoJackpots:true,...(stake?{currency:'EUR',availableTotalBets:[0.10,0.20]}:{})})),
  entry(`https://ticker.example/new_jackpotxml.php?info=1&game=sljp-1&casino=${casino}&currency=EUR&local=0&instanceCode=es1&token=QUERY_SECRET`,'2026-08-27T05:40:06Z',xml({casino}),'application/xml'),
]}};}
const fake='a'.repeat(40);

let r=evaluate({har:har(),sourceName:'frank-current.har',reviewCommits:{providerNetworkBindingReviewCommit:fake,operatorFollowingDayTextReviewCommit:fake,tenCentEligibilityTextReviewCommit:fake,rtpSeparationTextReviewCommit:fake}});
assert.equal(r.version,'bet365-frank-independent-semantics-approval-v1.2-internal-exact-artifacts');
assert.equal(r.valid,false);
assert.equal(r.reason,'EXACT_CODE_OWNED_INDEPENDENT_SEMANTICS_REVIEWS_REQUIRED');
assert.equal(r.reviewStatus.networkReviewApproved,false);
assert.equal(r.reviewStatus.operatorFollowingDayTextReviewApproved,false);
assert.equal(r.reviewStatus.tenCentEligibilityTextReviewApproved,false);
assert.equal(r.reviewStatus.operatorPublicRtpPolicyVerified,true);
assert.equal(r.bet365FollowingDayRuleAdoptionVerified,false);
assert.equal(r.servedTenCentJackpotEligibilityVerified,false);
assert.equal(r.publishedTheoreticalRtpExcludesJackpotAllocationVerified,true);
assert.equal(r.headlineRtpMayBeUsedAsBaseGameRtp,true);
assert.equal(r.reviewedPublishedGameRtpPct,95.92);
assert.equal(typeof r.reviewArtifactIdentities.networkArtifactIdentity,'string');
assert.equal(r.execution.realMoneyAllowed,false);
for(const forbidden of ['SECRET','HIDDEN','QUERY_SECRET'])assert.equal(JSON.stringify(r).includes(forbidden),false);

// Prebuilt candidate objects are no longer inputs and cannot bypass missing HAR evidence.
r=evaluate({providerNetworkCandidate:{valid:true},servedSemanticsReviewCandidate:{valid:true},reviewCommits:{providerNetworkBindingReviewCommit:fake}});
assert.equal(r.valid,false);
assert.equal(r.reason,'INTERNALLY_DERIVED_PROVIDER_NETWORK_BINDING_REVIEW_CANDIDATE_REQUIRED');
assert.equal(r.operatorPublicRtpPolicyVerified,true);
assert.equal(r.publishedTheoreticalRtpExcludesJackpotAllocationVerified,true);
assert.equal(r.bet365FollowingDayRuleAdoptionVerified,false);
assert.equal(r.execution.realMoneyAllowed,false);

r=evaluate({har:har({stake:false}),reviewCommits:{providerNetworkBindingReviewCommit:fake}});
assert.equal(r.valid,false);
assert.equal(r.reason,'INTERNALLY_DERIVED_PROVIDER_NETWORK_BINDING_REVIEW_CANDIDATE_REQUIRED');
assert.equal(r.publishedTheoreticalRtpExcludesJackpotAllocationVerified,true);

console.log('bet365-frank-independent-semantics-approval-v1.test.mjs: PASS');

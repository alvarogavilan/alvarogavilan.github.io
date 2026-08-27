import assert from 'node:assert/strict';
import {evaluateBet365FrankReviewedOverdueEconomics as evaluate} from '../edge-backend/src/bet365-frank-reviewed-overdue-economics-v1.mjs';

const network={
  version:'bet365-frank-provider-network-semantics-candidate-v1',valid:true,providerNetworkSemanticsBindingReviewCandidate:true,followingDayMechanicReviewCandidate:true,tenCentEligibilityReviewCandidate:true,
  runtime:{exactBet365SpainFrontendToConfiguredSljp1TransportBindingVerified:true,code:'sljp-1',network:'SPORTING_LEGENDS',providerScope:'GLOBAL',tier:'DAILY',currency:'EUR',local:0,servedTenCentTotalStakeVerified:true,bet365ConfiguredJackpotsCasino:'bet365_es',configuredTickerEndpoint:'https://ticker.example/new_jackpotxml.php',instanceCode:'es1'},
};
const served={version:'bet365-frank-served-semantics-review-candidate-v1.2-rtp-separation',valid:true,binding:{exactBet365SpainFrontendToConfiguredSljp1TransportBindingVerified:true},servedStake:{servedTenCentTotalStakeVerified:true},followingDayOperatorRuleReviewCandidate:true,tenCentJackpotEligibilityReviewCandidate:true,jackpotRtpSeparationReviewCandidate:true};
const pair={version:'bet365-sporting-served-overdue-pair-v1',valid:true,realCrossGhtUnawardedPairVerified:true,exactBet365SpainPairBindingVerified:true,servedTenCentTotalStakeVerified:true,requiredStakeEUR:0.10,configuredBinding:{jackpotsCasino:'bet365_es',tickerEndpoint:'https://ticker.example/new_jackpotxml.php'},after:{gameCode:'gpas_slfbruno_pop',instanceCode:'es1',amount:1500}};
const fake='a'.repeat(40);
let r=evaluate({providerNetworkCandidate:network,servedSemanticsReviewCandidate:served,reviewCommits:{providerNetworkBindingReviewCommit:fake,operatorFollowingDayTextReviewCommit:fake,tenCentEligibilityTextReviewCommit:fake,rtpSeparationTextReviewCommit:fake},overduePair:pair});
assert.equal(r.version,'bet365-frank-reviewed-overdue-economics-v1.1-operator-rtp-policy');
assert.equal(r.valid,false);
assert.equal(r.reason,'INDEPENDENT_FRANK_SEMANTICS_APPROVAL_REQUIRED');
assert.equal(r.rtpPolicyClosed,true);
assert.equal(r.reviewedBaseRtpEconomicsClosed,false);
assert.equal(r.breakEvenFirstBetProbability,null);
assert.equal(r.usableForRaceThreshold,false);
assert.equal(r.usableForExecution,false);
assert.equal(r.execution.decision,'NO_PLAY');
assert.equal(r.execution.realMoneyAllowed,false);

r=evaluate({providerNetworkCandidate:{...network,runtime:{...network.runtime,providerScope:'LOCAL'}},servedSemanticsReviewCandidate:served,reviewCommits:{},overduePair:pair});
assert.equal(r.valid,false);
assert.equal(r.reason,'INDEPENDENT_FRANK_SEMANTICS_APPROVAL_REQUIRED');
assert.equal(r.rtpPolicyClosed,true);
assert.equal(r.execution.realMoneyAllowed,false);

console.log('bet365-frank-reviewed-overdue-economics-v1.test.mjs: PASS');

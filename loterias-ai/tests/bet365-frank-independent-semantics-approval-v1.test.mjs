import assert from 'node:assert/strict';
import {evaluateBet365FrankIndependentSemanticsApproval as evaluate} from '../edge-backend/src/bet365-frank-independent-semantics-approval-v1.mjs';

const network={
  version:'bet365-frank-provider-network-semantics-candidate-v1',valid:true,
  providerNetworkSemanticsBindingReviewCandidate:true,followingDayMechanicReviewCandidate:true,tenCentEligibilityReviewCandidate:true,
  runtime:{exactBet365SpainFrontendToConfiguredSljp1TransportBindingVerified:true,code:'sljp-1',network:'SPORTING_LEGENDS',providerScope:'GLOBAL',tier:'DAILY',currency:'EUR',local:0,servedTenCentTotalStakeVerified:true},
};
const served={
  version:'bet365-frank-served-semantics-review-candidate-v1.2-rtp-separation',valid:true,
  binding:{exactBet365SpainFrontendToConfiguredSljp1TransportBindingVerified:true},
  servedStake:{servedTenCentTotalStakeVerified:true},
  followingDayOperatorRuleReviewCandidate:true,tenCentJackpotEligibilityReviewCandidate:true,jackpotRtpSeparationReviewCandidate:true,
};
const fake='a'.repeat(40);
let r=evaluate({providerNetworkCandidate:network,servedSemanticsReviewCandidate:served,reviewCommits:{providerNetworkBindingReviewCommit:fake,operatorFollowingDayTextReviewCommit:fake,tenCentEligibilityTextReviewCommit:fake,rtpSeparationTextReviewCommit:fake}});
assert.equal(r.version,'bet365-frank-independent-semantics-approval-v1.1-operator-rtp-policy');
assert.equal(r.valid,false);
assert.equal(r.reason,'CODE_OWNED_INDEPENDENT_SEMANTICS_REVIEWS_REQUIRED');
assert.equal(r.reviewStatus.networkReviewApproved,false);
assert.equal(r.reviewStatus.operatorFollowingDayTextReviewApproved,false);
assert.equal(r.reviewStatus.tenCentEligibilityTextReviewApproved,false);
assert.equal(r.reviewStatus.operatorPublicRtpPolicyVerified,true);
assert.equal(r.reviewStatus.rtpSeparationTextReviewApproved,false);
assert.equal(r.bet365FollowingDayRuleAdoptionVerified,false);
assert.equal(r.servedTenCentJackpotEligibilityVerified,false);
assert.equal(r.publishedTheoreticalRtpExcludesJackpotAllocationVerified,true);
assert.equal(r.bet365JackpotDoesNotAffectGameRtpVerified,true);
assert.equal(r.headlineRtpMayBeUsedAsBaseGameRtp,true);
assert.equal(r.reviewedPublishedGameRtpPct,95.92);
assert.equal(r.independentSemanticsReviewClosed,false);
assert.equal(r.usableForExecution,false);
assert.equal(r.execution.decision,'NO_PLAY');
assert.equal(r.execution.realMoneyAllowed,false);

// RTP decomposition remains independently closed even when the current served
// runtime is not yet available; runtime/rule gates remain false and NO_PLAY.
r=evaluate({});
assert.equal(r.valid,false);
assert.equal(r.reason,'VALID_PROVIDER_NETWORK_BINDING_REVIEW_CANDIDATE_REQUIRED');
assert.equal(r.operatorPublicRtpPolicyVerified,true);
assert.equal(r.publishedTheoreticalRtpExcludesJackpotAllocationVerified,true);
assert.equal(r.headlineRtpMayBeUsedAsBaseGameRtp,true);
assert.equal(r.bet365FollowingDayRuleAdoptionVerified,false);
assert.equal(r.servedTenCentJackpotEligibilityVerified,false);
assert.equal(r.execution.realMoneyAllowed,false);

r=evaluate({providerNetworkCandidate:{...network,runtime:{...network.runtime,providerScope:'LOCAL'}},servedSemanticsReviewCandidate:served});
assert.equal(r.reason,'EXACT_RUNTIME_NETWORK_SCOPE_NOT_CLOSED');
assert.equal(r.publishedTheoreticalRtpExcludesJackpotAllocationVerified,true);
r=evaluate({providerNetworkCandidate:network,servedSemanticsReviewCandidate:{...served,servedStake:{servedTenCentTotalStakeVerified:false}}});
assert.equal(r.reason,'SERVED_REVIEW_PACKAGE_BINDING_OR_STAKE_NOT_CLOSED');
assert.equal(r.headlineRtpMayBeUsedAsBaseGameRtp,true);
r=evaluate({providerNetworkCandidate:{...network,followingDayMechanicReviewCandidate:false},servedSemanticsReviewCandidate:served});
assert.equal(r.reason,'PROVIDER_NETWORK_RULE_AND_ELIGIBILITY_CANDIDATES_REQUIRED');
assert.equal(r.bet365FollowingDayRuleAdoptionVerified,false);
assert.equal(r.publishedTheoreticalRtpExcludesJackpotAllocationVerified,true);

console.log('bet365-frank-independent-semantics-approval-v1.test.mjs: PASS');

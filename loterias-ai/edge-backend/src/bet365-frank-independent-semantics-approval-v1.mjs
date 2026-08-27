const VERSION='bet365-frank-independent-semantics-approval-v1';
const NETWORK_VERSION='bet365-frank-provider-network-semantics-candidate-v1';
const SERVED_VERSION='bet365-frank-served-semantics-review-candidate-v1.2-rtp-separation';
const SHA=/^[0-9a-f]{40}$/;

// Each allowlist is deliberately empty until a real exact-session artifact exists, is
// independently reviewed in a dedicated commit, and a later code change pins that review.
const APPROVED_PROVIDER_NETWORK_BINDING_REVIEWS=new Set();
const APPROVED_OPERATOR_FOLLOWING_DAY_TEXT_REVIEWS=new Set();
const APPROVED_TEN_CENT_ELIGIBILITY_TEXT_REVIEWS=new Set();
const APPROVED_RTP_SEPARATION_TEXT_REVIEWS=new Set();
const text=v=>typeof v==='string'&&v.trim()?v.trim():null;
function execution(){return {decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0};}
function approved(set,v){const s=text(v)?.toLowerCase();return !!s&&SHA.test(s)&&set.has(s);}
function fail(reason,extra={}){return {version:VERSION,valid:false,reason,bet365FollowingDayRuleAdoptionVerified:false,servedTenCentJackpotEligibilityVerified:false,bet365JackpotDoesNotAffectGameRtpVerified:false,headlineRtpMayBeUsedAsBaseGameRtp:false,independentSemanticsReviewClosed:false,usableForExecution:false,execution:execution(),...extra};}

export function evaluateBet365FrankIndependentSemanticsApproval({providerNetworkCandidate,servedSemanticsReviewCandidate,reviewCommits}={}){
  const network=providerNetworkCandidate,served=servedSemanticsReviewCandidate,review=reviewCommits||{};
  if(!network||network.version!==NETWORK_VERSION||network.valid!==true||network.providerNetworkSemanticsBindingReviewCandidate!==true)return fail('VALID_PROVIDER_NETWORK_BINDING_REVIEW_CANDIDATE_REQUIRED');
  if(network.followingDayMechanicReviewCandidate!==true||network.tenCentEligibilityReviewCandidate!==true)return fail('PROVIDER_NETWORK_RULE_AND_ELIGIBILITY_CANDIDATES_REQUIRED');
  if(network.runtime?.exactBet365SpainFrontendToConfiguredSljp1TransportBindingVerified!==true||network.runtime?.code!=='sljp-1'||network.runtime?.network!=='SPORTING_LEGENDS'||network.runtime?.providerScope!=='GLOBAL'||network.runtime?.tier!=='DAILY'||String(network.runtime?.currency||'').toUpperCase()!=='EUR'||network.runtime?.local!==0||network.runtime?.servedTenCentTotalStakeVerified!==true)return fail('EXACT_RUNTIME_NETWORK_SCOPE_NOT_CLOSED');
  if(!served||served.version!==SERVED_VERSION||served.valid!==true)return fail('VALID_SERVED_SEMANTICS_REVIEW_PACKAGE_REQUIRED');
  if(served.binding?.exactBet365SpainFrontendToConfiguredSljp1TransportBindingVerified!==true||served.servedStake?.servedTenCentTotalStakeVerified!==true)return fail('SERVED_REVIEW_PACKAGE_BINDING_OR_STAKE_NOT_CLOSED');
  const networkReviewApproved=approved(APPROVED_PROVIDER_NETWORK_BINDING_REVIEWS,review.providerNetworkBindingReviewCommit);
  const operatorFollowingDayTextReviewApproved=served.followingDayOperatorRuleReviewCandidate===true&&approved(APPROVED_OPERATOR_FOLLOWING_DAY_TEXT_REVIEWS,review.operatorFollowingDayTextReviewCommit);
  const tenCentEligibilityTextReviewApproved=served.tenCentJackpotEligibilityReviewCandidate===true&&approved(APPROVED_TEN_CENT_ELIGIBILITY_TEXT_REVIEWS,review.tenCentEligibilityTextReviewCommit);
  const rtpSeparationTextReviewApproved=served.jackpotRtpSeparationReviewCandidate===true&&approved(APPROVED_RTP_SEPARATION_TEXT_REVIEWS,review.rtpSeparationTextReviewCommit);
  const bet365FollowingDayRuleAdoptionVerified=networkReviewApproved||operatorFollowingDayTextReviewApproved;
  const servedTenCentJackpotEligibilityVerified=networkReviewApproved||tenCentEligibilityTextReviewApproved;
  const bet365JackpotDoesNotAffectGameRtpVerified=rtpSeparationTextReviewApproved;
  const reviewStatus={networkReviewApproved,operatorFollowingDayTextReviewApproved,tenCentEligibilityTextReviewApproved,rtpSeparationTextReviewApproved};
  const independentSemanticsReviewClosed=bet365FollowingDayRuleAdoptionVerified&&servedTenCentJackpotEligibilityVerified&&bet365JackpotDoesNotAffectGameRtpVerified;
  if(!independentSemanticsReviewClosed)return fail('CODE_OWNED_INDEPENDENT_SEMANTICS_REVIEWS_REQUIRED',{reviewStatus,bet365FollowingDayRuleAdoptionVerified,servedTenCentJackpotEligibilityVerified,bet365JackpotDoesNotAffectGameRtpVerified,headlineRtpMayBeUsedAsBaseGameRtp:false,independentSemanticsReviewClosed:false});
  return {
    version:VERSION,valid:true,reason:'INDEPENDENT_FRANK_RULE_ELIGIBILITY_AND_RTP_SEPARATION_REVIEWS_CLOSED',
    reviewStatus,independentSemanticsReviewClosed:true,
    bet365FollowingDayRuleAdoptionVerified:true,servedTenCentJackpotEligibilityVerified:true,bet365JackpotDoesNotAffectGameRtpVerified:true,
    headlineRtpMayBeUsedAsBaseGameRtp:true,reviewedPublishedGameRtpPct:95.92,reviewedStakeEUR:0.10,
    usableForExecution:false,
    scientificUse:'Fail-closed promotion gate for Frank Bruno bet365 Spain semantics. Exact GLOBAL sljp-1 runtime binding plus served €0.10 is mandatory before review can even be considered. The shared Playtech Sporting Legends network interpretation may close first-bet-following-day and any-size eligibility only after a code-allowlisted independent runtime/network semantic review; exact bet365-owned text can independently close either semantic. Treating the current official 95.92% as game RTP unaffected by jackpots is stricter: it requires a separate code-allowlisted bet365-owned served-text review explicitly stating operator funding and no RTP effect. Caller booleans or arbitrary SHA strings cannot self-promote any fact.',
    execution:execution(),
    hardGuards:{onlineOnly:true,nonPromoOnly:true,codeOwnedReviewAllowlists:true,allReviewAllowlistsCurrentlyEmpty:APPROVED_PROVIDER_NETWORK_BINDING_REVIEWS.size+APPROVED_OPERATOR_FOLLOWING_DAY_TEXT_REVIEWS.size+APPROVED_TEN_CENT_ELIGIBILITY_TEXT_REVIEWS.size+APPROVED_RTP_SEPARATION_TEXT_REVIEWS.size===0,exactGlobalSljp1RuntimeRequired:true,servedTenCentTotalStakeRequired:true,networkReviewCannotProveRtpSeparation:true,rtpSeparationRequiresBet365OwnedTextReview:true,headlineRtpCannotSelfPromote:true,crossOperatorRtpTransferForbidden:true,noWagerProbe:true,noAutomaticBetting:true,realMoneyAllowed:false},
  };
}

import {getBet365SpainCurrentSportingRtpPolicy} from './bet365-spain-current-sporting-rtp-policy-v1.mjs';

const VERSION='bet365-frank-independent-semantics-approval-v1.1-operator-rtp-policy';
const NETWORK_VERSION='bet365-frank-provider-network-semantics-candidate-v1';
const SERVED_VERSION='bet365-frank-served-semantics-review-candidate-v1.2-rtp-separation';
const FRANK_GAME_CODE='gpas_slfbruno_pop';
const SHA=/^[0-9a-f]{40}$/;

// Runtime/rule allowlists remain deliberately empty until a real exact-session
// artifact exists, is independently reviewed in a dedicated commit, and a later
// code change pins that review. RTP decomposition is now independently anchored
// by current bet365 Spain operator-owned policy + exact title RTP table row.
const APPROVED_PROVIDER_NETWORK_BINDING_REVIEWS=new Set();
const APPROVED_OPERATOR_FOLLOWING_DAY_TEXT_REVIEWS=new Set();
const APPROVED_TEN_CENT_ELIGIBILITY_TEXT_REVIEWS=new Set();
const APPROVED_RTP_SEPARATION_TEXT_REVIEWS=new Set();
const text=v=>typeof v==='string'&&v.trim()?v.trim():null;
function execution(){return {decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0};}
function approved(set,v){const s=text(v)?.toLowerCase();return !!s&&SHA.test(s)&&set.has(s);}
function fail(reason,extra={}){return {version:VERSION,valid:false,reason,bet365FollowingDayRuleAdoptionVerified:false,servedTenCentJackpotEligibilityVerified:false,bet365JackpotDoesNotAffectGameRtpVerified:false,publishedTheoreticalRtpExcludesJackpotAllocationVerified:false,headlineRtpMayBeUsedAsBaseGameRtp:false,independentSemanticsReviewClosed:false,usableForExecution:false,execution:execution(),...extra};}
function rtpPolicyStatus(){
  const p=getBet365SpainCurrentSportingRtpPolicy({gameCode:FRANK_GAME_CODE});
  const closed=p?.valid===true&&p.exactCurrentOperatorTitleRtpRowVerified===true&&p.publishedTheoreticalRtpExcludesJackpotAllocationVerified===true&&p.headlineRtpMayBeUsedAsBaseGameRtp===true&&Number(p.publishedTheoreticalRtpPct)===95.92;
  return {policy:p,closed};
}

export function evaluateBet365FrankIndependentSemanticsApproval({providerNetworkCandidate,servedSemanticsReviewCandidate,reviewCommits}={}){
  const {policy:rtpPolicy,closed:operatorPublicRtpPolicyVerified}=rtpPolicyStatus();
  const rtpExtra={rtpPolicy,operatorPublicRtpPolicyVerified,publishedTheoreticalRtpExcludesJackpotAllocationVerified:operatorPublicRtpPolicyVerified,bet365JackpotDoesNotAffectGameRtpVerified:operatorPublicRtpPolicyVerified,headlineRtpMayBeUsedAsBaseGameRtp:operatorPublicRtpPolicyVerified,reviewedPublishedGameRtpPct:operatorPublicRtpPolicyVerified?95.92:null};
  const network=providerNetworkCandidate,served=servedSemanticsReviewCandidate,review=reviewCommits||{};
  if(!network||network.version!==NETWORK_VERSION||network.valid!==true||network.providerNetworkSemanticsBindingReviewCandidate!==true)return fail('VALID_PROVIDER_NETWORK_BINDING_REVIEW_CANDIDATE_REQUIRED',rtpExtra);
  if(network.followingDayMechanicReviewCandidate!==true||network.tenCentEligibilityReviewCandidate!==true)return fail('PROVIDER_NETWORK_RULE_AND_ELIGIBILITY_CANDIDATES_REQUIRED',rtpExtra);
  if(network.runtime?.exactBet365SpainFrontendToConfiguredSljp1TransportBindingVerified!==true||network.runtime?.code!=='sljp-1'||network.runtime?.network!=='SPORTING_LEGENDS'||network.runtime?.providerScope!=='GLOBAL'||network.runtime?.tier!=='DAILY'||String(network.runtime?.currency||'').toUpperCase()!=='EUR'||network.runtime?.local!==0||network.runtime?.servedTenCentTotalStakeVerified!==true)return fail('EXACT_RUNTIME_NETWORK_SCOPE_NOT_CLOSED',rtpExtra);
  if(!served||served.version!==SERVED_VERSION||served.valid!==true)return fail('VALID_SERVED_SEMANTICS_REVIEW_PACKAGE_REQUIRED',rtpExtra);
  if(served.binding?.exactBet365SpainFrontendToConfiguredSljp1TransportBindingVerified!==true||served.servedStake?.servedTenCentTotalStakeVerified!==true)return fail('SERVED_REVIEW_PACKAGE_BINDING_OR_STAKE_NOT_CLOSED',rtpExtra);
  const networkReviewApproved=approved(APPROVED_PROVIDER_NETWORK_BINDING_REVIEWS,review.providerNetworkBindingReviewCommit);
  const operatorFollowingDayTextReviewApproved=served.followingDayOperatorRuleReviewCandidate===true&&approved(APPROVED_OPERATOR_FOLLOWING_DAY_TEXT_REVIEWS,review.operatorFollowingDayTextReviewCommit);
  const tenCentEligibilityTextReviewApproved=served.tenCentJackpotEligibilityReviewCandidate===true&&approved(APPROVED_TEN_CENT_ELIGIBILITY_TEXT_REVIEWS,review.tenCentEligibilityTextReviewCommit);
  const rtpSeparationTextReviewApproved=served.jackpotRtpSeparationReviewCandidate===true&&approved(APPROVED_RTP_SEPARATION_TEXT_REVIEWS,review.rtpSeparationTextReviewCommit);
  const bet365FollowingDayRuleAdoptionVerified=networkReviewApproved||operatorFollowingDayTextReviewApproved;
  const servedTenCentJackpotEligibilityVerified=networkReviewApproved||tenCentEligibilityTextReviewApproved;
  const publishedTheoreticalRtpExcludesJackpotAllocationVerified=operatorPublicRtpPolicyVerified||rtpSeparationTextReviewApproved;
  const bet365JackpotDoesNotAffectGameRtpVerified=publishedTheoreticalRtpExcludesJackpotAllocationVerified;
  const headlineRtpMayBeUsedAsBaseGameRtp=publishedTheoreticalRtpExcludesJackpotAllocationVerified;
  const reviewStatus={networkReviewApproved,operatorFollowingDayTextReviewApproved,tenCentEligibilityTextReviewApproved,operatorPublicRtpPolicyVerified,rtpSeparationTextReviewApproved};
  const independentSemanticsReviewClosed=bet365FollowingDayRuleAdoptionVerified&&servedTenCentJackpotEligibilityVerified&&publishedTheoreticalRtpExcludesJackpotAllocationVerified;
  if(!independentSemanticsReviewClosed)return fail('CODE_OWNED_INDEPENDENT_SEMANTICS_REVIEWS_REQUIRED',{reviewStatus,rtpPolicy,operatorPublicRtpPolicyVerified,bet365FollowingDayRuleAdoptionVerified,servedTenCentJackpotEligibilityVerified,bet365JackpotDoesNotAffectGameRtpVerified,publishedTheoreticalRtpExcludesJackpotAllocationVerified,headlineRtpMayBeUsedAsBaseGameRtp,reviewedPublishedGameRtpPct:headlineRtpMayBeUsedAsBaseGameRtp?95.92:null,independentSemanticsReviewClosed:false});
  return {
    version:VERSION,valid:true,reason:'INDEPENDENT_FRANK_RULE_ELIGIBILITY_AND_OPERATOR_RTP_POLICY_CLOSED',
    reviewStatus,rtpPolicy,independentSemanticsReviewClosed:true,
    bet365FollowingDayRuleAdoptionVerified:true,servedTenCentJackpotEligibilityVerified:true,
    bet365JackpotDoesNotAffectGameRtpVerified:true,publishedTheoreticalRtpExcludesJackpotAllocationVerified:true,
    headlineRtpMayBeUsedAsBaseGameRtp:true,reviewedPublishedGameRtpPct:95.92,reviewedStakeEUR:0.10,
    rtpSeparationBasis:'CURRENT_BET365_SPAIN_OPERATOR_RTP_POLICY_EXCLUDES_JACKPOT_ALLOCATION_FROM_RTP_CALCULATIONS',
    usableForExecution:false,
    scientificUse:'Fail-closed promotion gate for Frank Bruno bet365 Spain semantics. Exact GLOBAL sljp-1 runtime binding plus served €0.10 remains mandatory before first-bet-following-day or €0.10 jackpot eligibility can be approved. Those two semantics require either a code-allowlisted provider-network binding review or exact bet365-owned served-text review. RTP decomposition no longer depends on another operator or on a future served-text capture: the current bet365 Spain Fair Payout policy states that jackpot allocation is excluded from RTP calculations, and the exact current Frank Bruno row publishes 95.92%. That operator-owned public policy closes only the base-game RTP decomposition; it does not prove jackpot eligibility, served stake, following-day behavior or current runtime state. Caller booleans and arbitrary SHA strings cannot self-promote the remaining facts.',
    execution:execution(),
    hardGuards:{onlineOnly:true,nonPromoOnly:true,codeOwnedReviewAllowlists:true,runtimeRuleReviewAllowlistsCurrentlyEmpty:APPROVED_PROVIDER_NETWORK_BINDING_REVIEWS.size+APPROVED_OPERATOR_FOLLOWING_DAY_TEXT_REVIEWS.size+APPROVED_TEN_CENT_ELIGIBILITY_TEXT_REVIEWS.size===0,exactGlobalSljp1RuntimeRequired:true,servedTenCentTotalStakeRequired:true,operatorPublicRtpPolicyMayCloseOnlyRtpDecomposition:true,publishedMinimumBetCannotProveJackpotEligibility:true,publishedMinimumBetCannotProveServedStakeAtDecision:true,networkReviewNotRequiredForRtpDecomposition:true,servedRtpTextReviewOptionalCorroborationOnly:true,headlineRtpCannotSelfPromoteWithoutCodeOwnedOperatorPolicy:true,crossOperatorRtpTransferForbidden:true,noWagerProbe:true,noAutomaticBetting:true,realMoneyAllowed:false},
  };
}

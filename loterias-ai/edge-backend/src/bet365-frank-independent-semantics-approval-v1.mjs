import {getBet365SpainCurrentSportingRtpPolicy} from './bet365-spain-current-sporting-rtp-policy-v1.mjs';
import {buildBet365FrankProviderNetworkSemanticsCandidate} from './bet365-frank-provider-network-semantics-candidate-v1.mjs';
import {buildBet365FrankServedSemanticsReviewCandidate} from './bet365-frank-served-semantics-review-candidate-v1.mjs';

const VERSION='bet365-frank-independent-semantics-approval-v1.2-internal-exact-artifacts';
const NETWORK_VERSION='bet365-frank-provider-network-semantics-candidate-v1';
const SERVED_VERSION='bet365-frank-served-semantics-review-candidate-v1.2-rtp-separation';
const FRANK_GAME_CODE='gpas_slfbruno_pop';
const SHA40=/^[0-9a-f]{40}$/;

// Future review maps bind each review commit to the exact canonical artifact it
// reviewed. They remain empty until a real exact bet365 Spain Frank session is
// committed and independently inspected.
const APPROVED_PROVIDER_NETWORK_BINDING_REVIEWS=new Map();
const APPROVED_OPERATOR_FOLLOWING_DAY_TEXT_REVIEWS=new Map();
const APPROVED_TEN_CENT_ELIGIBILITY_TEXT_REVIEWS=new Map();
const APPROVED_RTP_SEPARATION_TEXT_REVIEWS=new Map();
const text=v=>typeof v==='string'&&v.trim()?v.trim():null;
const lower=v=>text(v)?.toLowerCase()??null;
function execution(){return {decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0};}
function fail(reason,extra={}){return {version:VERSION,valid:false,reason,bet365FollowingDayRuleAdoptionVerified:false,servedTenCentJackpotEligibilityVerified:false,bet365JackpotDoesNotAffectGameRtpVerified:false,publishedTheoreticalRtpExcludesJackpotAllocationVerified:false,headlineRtpMayBeUsedAsBaseGameRtp:false,independentSemanticsReviewClosed:false,usableForExecution:false,execution:execution(),...extra};}
function networkIdentity(n){const r=n?.runtime||{};return JSON.stringify([
  text(n?.sourceName),text(n?.target?.playRoute),lower(n?.target?.gameCode),
  lower(r.bet365ConfiguredJackpotsCasino),text(r.configuredTickerEndpoint),text(r.observedLegacyTickerEndpoint),lower(r.requestCasino),text(r.instanceCode),
  r.code,r.network,r.tier,r.providerScope,String(r.currency||'').toUpperCase(),r.local,r.servedTenCentTotalStakeVerified===true,
  n?.providerNetworkSemanticsBindingReviewCandidate===true,n?.followingDayMechanicReviewCandidate===true,n?.tenCentEligibilityReviewCandidate===true
]);}
function servedBaseIdentity(s){return [text(s?.sourceName),text(s?.target?.playRoute),lower(s?.target?.gameCode),lower(s?.binding?.jackpotsCasino),text(s?.binding?.tickerEndpoint),s?.servedStake?.servedTenCentTotalStakeVerified===true];}
function followingIdentity(s){return JSON.stringify([...servedBaseIdentity(s),s?.followingDayOperatorRuleReviewCandidate===true,[...(s?.ruleEvidence?.followingDayBodySha256||[])]].flat());}
function eligibilityIdentity(s){return JSON.stringify([...servedBaseIdentity(s),s?.tenCentJackpotEligibilityReviewCandidate===true,[...(s?.ruleEvidence?.anySizeEligibilityBodySha256||[])]].flat());}
function rtpTextIdentity(s){return JSON.stringify([...servedBaseIdentity(s),s?.jackpotRtpSeparationReviewCandidate===true,[...(s?.ruleEvidence?.operatorFundedRtpSeparationBodySha256||[])]].flat());}
function approvedExact(map,commitValue,identity){const commit=text(commitValue)?.toLowerCase();if(!commit||!SHA40.test(commit))return false;const expected=map.get(commit);return !!expected&&expected===identity;}
function rtpPolicyStatus(){
  const p=getBet365SpainCurrentSportingRtpPolicy({gameCode:FRANK_GAME_CODE});
  const closed=p?.valid===true&&p.exactCurrentOperatorTitleRtpRowVerified===true&&p.publishedTheoreticalRtpExcludesJackpotAllocationVerified===true&&p.headlineRtpMayBeUsedAsBaseGameRtp===true&&Number(p.publishedTheoreticalRtpPct)===95.92;
  return {policy:p,closed};
}

export function evaluateBet365FrankIndependentSemanticsApproval({har,sourceName='frank-current.har',reviewCommits}={}){
  const {policy:rtpPolicy,closed:operatorPublicRtpPolicyVerified}=rtpPolicyStatus();
  const rtpExtra={rtpPolicy,operatorPublicRtpPolicyVerified,publishedTheoreticalRtpExcludesJackpotAllocationVerified:operatorPublicRtpPolicyVerified,bet365JackpotDoesNotAffectGameRtpVerified:operatorPublicRtpPolicyVerified,headlineRtpMayBeUsedAsBaseGameRtp:operatorPublicRtpPolicyVerified,reviewedPublishedGameRtpPct:operatorPublicRtpPolicyVerified?95.92:null};
  const network=buildBet365FrankProviderNetworkSemanticsCandidate(har,{sourceName});
  if(!network||network.version!==NETWORK_VERSION||network.valid!==true||network.providerNetworkSemanticsBindingReviewCandidate!==true)return fail('INTERNALLY_DERIVED_PROVIDER_NETWORK_BINDING_REVIEW_CANDIDATE_REQUIRED',{...rtpExtra,networkReason:network?.reason||null});
  if(network.followingDayMechanicReviewCandidate!==true||network.tenCentEligibilityReviewCandidate!==true)return fail('PROVIDER_NETWORK_RULE_AND_ELIGIBILITY_CANDIDATES_REQUIRED',rtpExtra);
  if(network.runtime?.exactBet365SpainFrontendToConfiguredSljp1TransportBindingVerified!==true||network.runtime?.code!=='sljp-1'||network.runtime?.network!=='SPORTING_LEGENDS'||network.runtime?.providerScope!=='GLOBAL'||network.runtime?.tier!=='DAILY'||String(network.runtime?.currency||'').toUpperCase()!=='EUR'||network.runtime?.local!==0||network.runtime?.servedTenCentTotalStakeVerified!==true)return fail('EXACT_RUNTIME_NETWORK_SCOPE_NOT_CLOSED',rtpExtra);

  const served=buildBet365FrankServedSemanticsReviewCandidate(har,{sourceName});
  if(!served||served.version!==SERVED_VERSION||served.valid!==true)return fail('INTERNALLY_DERIVED_SERVED_SEMANTICS_REVIEW_PACKAGE_REQUIRED',{...rtpExtra,servedReason:served?.reason||null});
  if(served.binding?.exactBet365SpainFrontendToConfiguredSljp1TransportBindingVerified!==true||served.servedStake?.servedTenCentTotalStakeVerified!==true)return fail('SERVED_REVIEW_PACKAGE_BINDING_OR_STAKE_NOT_CLOSED',rtpExtra);
  if(lower(network.runtime.bet365ConfiguredJackpotsCasino)!==lower(served.binding.jackpotsCasino)||network.runtime.configuredTickerEndpoint!==served.binding.tickerEndpoint)return fail('INTERNALLY_DERIVED_SEMANTIC_ARTIFACT_BINDING_MISMATCH',rtpExtra);

  const review=reviewCommits||{};
  const networkArtifactIdentity=networkIdentity(network),followingArtifactIdentity=followingIdentity(served),tenCentEligibilityArtifactIdentity=eligibilityIdentity(served),rtpSeparationTextArtifactIdentity=rtpTextIdentity(served);
  const networkReviewApproved=approvedExact(APPROVED_PROVIDER_NETWORK_BINDING_REVIEWS,review.providerNetworkBindingReviewCommit,networkArtifactIdentity);
  const operatorFollowingDayTextReviewApproved=served.followingDayOperatorRuleReviewCandidate===true&&approvedExact(APPROVED_OPERATOR_FOLLOWING_DAY_TEXT_REVIEWS,review.operatorFollowingDayTextReviewCommit,followingArtifactIdentity);
  const tenCentEligibilityTextReviewApproved=served.tenCentJackpotEligibilityReviewCandidate===true&&approvedExact(APPROVED_TEN_CENT_ELIGIBILITY_TEXT_REVIEWS,review.tenCentEligibilityTextReviewCommit,tenCentEligibilityArtifactIdentity);
  const rtpSeparationTextReviewApproved=served.jackpotRtpSeparationReviewCandidate===true&&approvedExact(APPROVED_RTP_SEPARATION_TEXT_REVIEWS,review.rtpSeparationTextReviewCommit,rtpSeparationTextArtifactIdentity);
  const bet365FollowingDayRuleAdoptionVerified=networkReviewApproved||operatorFollowingDayTextReviewApproved;
  const servedTenCentJackpotEligibilityVerified=networkReviewApproved||tenCentEligibilityTextReviewApproved;
  const publishedTheoreticalRtpExcludesJackpotAllocationVerified=operatorPublicRtpPolicyVerified||rtpSeparationTextReviewApproved;
  const bet365JackpotDoesNotAffectGameRtpVerified=publishedTheoreticalRtpExcludesJackpotAllocationVerified;
  const headlineRtpMayBeUsedAsBaseGameRtp=publishedTheoreticalRtpExcludesJackpotAllocationVerified;
  const reviewStatus={networkReviewApproved,operatorFollowingDayTextReviewApproved,tenCentEligibilityTextReviewApproved,operatorPublicRtpPolicyVerified,rtpSeparationTextReviewApproved};
  const reviewArtifactIdentities={networkArtifactIdentity,followingArtifactIdentity,tenCentEligibilityArtifactIdentity,rtpSeparationTextArtifactIdentity};
  const independentSemanticsReviewClosed=bet365FollowingDayRuleAdoptionVerified&&servedTenCentJackpotEligibilityVerified&&publishedTheoreticalRtpExcludesJackpotAllocationVerified;
  if(!independentSemanticsReviewClosed)return fail('EXACT_CODE_OWNED_INDEPENDENT_SEMANTICS_REVIEWS_REQUIRED',{reviewStatus,reviewArtifactIdentities,rtpPolicy,operatorPublicRtpPolicyVerified,bet365FollowingDayRuleAdoptionVerified,servedTenCentJackpotEligibilityVerified,bet365JackpotDoesNotAffectGameRtpVerified,publishedTheoreticalRtpExcludesJackpotAllocationVerified,headlineRtpMayBeUsedAsBaseGameRtp,reviewedPublishedGameRtpPct:headlineRtpMayBeUsedAsBaseGameRtp?95.92:null,independentSemanticsReviewClosed:false});
  return {
    version:VERSION,valid:true,reason:'EXACT_FRANK_RULE_ELIGIBILITY_AND_OPERATOR_RTP_POLICY_CLOSED',sourceName,
    reviewStatus,reviewArtifactIdentities,rtpPolicy,independentSemanticsReviewClosed:true,
    runtimeBinding:{jackpotsCasino:network.runtime.bet365ConfiguredJackpotsCasino,configuredTickerEndpoint:network.runtime.configuredTickerEndpoint,observedTickerEndpoint:network.runtime.observedLegacyTickerEndpoint,requestCasino:network.runtime.requestCasino,instanceCode:network.runtime.instanceCode},
    bet365FollowingDayRuleAdoptionVerified:true,servedTenCentJackpotEligibilityVerified:true,
    bet365JackpotDoesNotAffectGameRtpVerified:true,publishedTheoreticalRtpExcludesJackpotAllocationVerified:true,
    headlineRtpMayBeUsedAsBaseGameRtp:true,reviewedPublishedGameRtpPct:95.92,reviewedStakeEUR:0.10,
    rtpSeparationBasis:'CURRENT_BET365_SPAIN_OPERATOR_RTP_POLICY_EXCLUDES_JACKPOT_ALLOCATION_FROM_RTP_CALCULATIONS',
    usableForExecution:false,
    scientificUse:'Fail-closed Frank Bruno bet365 Spain semantic gate. The provider-network and served-text candidates are derived internally from the supplied exact passive HAR; callers cannot submit prebuilt candidates. Future code-owned approvals bind each review SHA to the exact runtime or served body-digest artifact it reviewed, so a SHA cannot be reused with another casino, endpoint, instance or rule body. The current bet365 Spain operator RTP policy closes only the 95.92% base-game RTP decomposition. Following-day adoption and €0.10 jackpot eligibility remain closed until exact artifact reviews are pinned.',
    execution:execution(),
    hardGuards:{onlineOnly:true,nonPromoOnly:true,passiveHarOnly:true,callerSuppliedSemanticCandidateObjectsIgnored:true,semanticCandidatesDerivedInternallyFromHar:true,exactReviewArtifactIdentityRequired:true,approvedShaCannotAuthorizeAlteredSemanticArtifact:true,runtimeRuleReviewMapsCurrentlyEmpty:APPROVED_PROVIDER_NETWORK_BINDING_REVIEWS.size+APPROVED_OPERATOR_FOLLOWING_DAY_TEXT_REVIEWS.size+APPROVED_TEN_CENT_ELIGIBILITY_TEXT_REVIEWS.size===0,exactGlobalSljp1RuntimeRequired:true,servedTenCentTotalStakeRequired:true,operatorPublicRtpPolicyMayCloseOnlyRtpDecomposition:true,publishedMinimumBetCannotProveJackpotEligibility:true,publishedMinimumBetCannotProveServedStakeAtDecision:true,crossOperatorRtpTransferForbidden:true,noWagerProbe:true,noAutomaticBetting:true,realMoneyAllowed:false},
  };
}

import {verifyBet365SportingServedSljp1Binding} from './bet365-sporting-served-sljp1-binding-v1.mjs';
import {verifyBet365SportingServedTotalStake} from './bet365-sporting-served-total-stake-v1.mjs';
import {detectBet365SportingServedFollowingDayRuleCandidate} from './bet365-sporting-served-following-day-rule-candidate-v1.mjs';
import {discoverBet365FrankServedRulesCandidate} from './bet365-frank-served-rules-candidate-v1.mjs';

const VERSION='bet365-frank-served-semantics-review-candidate-v1';
const GAME_CODE='gpas_slfbruno_pop';
function execution(){return {decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0};}
function fail(reason,extra={}){return {version:VERSION,valid:false,reason,followingDayOperatorRuleReviewCandidate:false,tenCentJackpotEligibilityReviewCandidate:false,bet365FollowingDayRuleAdoptionVerified:false,servedTenCentJackpotEligibilityVerified:false,independentReviewRequired:true,usableForExecution:false,execution:execution(),...extra};}

export function buildBet365FrankServedSemanticsReviewCandidate(har,{sourceName='frank-current.har'}={}){
  const binding=verifyBet365SportingServedSljp1Binding(har,{gameCode:GAME_CODE,sourceName});
  if(binding?.valid!==true)return fail('EXACT_FRANK_SERVED_SLJP1_BINDING_REQUIRED',{sourceName,bindingReason:binding?.reason||null});
  const stake=verifyBet365SportingServedTotalStake(har,{gameCode:GAME_CODE,sourceName,requiredStakeEUR:0.10});
  if(stake?.valid!==true||stake?.servedTenCentTotalStakeVerified!==true)return fail('EXPLICIT_SERVED_TEN_CENT_TOTAL_STAKE_REQUIRED',{sourceName,stakeReason:stake?.reason||null});
  const following=detectBet365SportingServedFollowingDayRuleCandidate(har,{gameCode:GAME_CODE,sourceName});
  const rules=discoverBet365FrankServedRulesCandidate(har,{sourceName});
  const followingCandidate=following?.valid===true&&following?.operatorOwnedRuleTextCandidateObserved===true&&rules?.valid===true&&rules?.followingDayFirstBetRuleCandidateObserved===true;
  const eligibilityCandidate=rules?.valid===true&&rules?.anySizeJackpotEligibilityCandidateObserved===true;
  const followingDigests=rules?.valid===true?(rules.candidates||[]).filter(x=>x.followingDayFirstBetRuleCandidate).map(x=>x.bodySha256):[];
  const eligibilityDigests=rules?.valid===true?(rules.candidates||[]).filter(x=>x.anySizeJackpotEligibilityCandidate).map(x=>x.bodySha256):[];
  return {
    version:VERSION,mode:'OFFLINE_PASSIVE_EXACT_FRANK_SERVED_EXECUTION_SEMANTICS_REVIEW_PACKAGE_NO_PLAY',valid:true,
    reason:followingCandidate&&eligibilityCandidate?'BOTH_OPERATOR_RULE_AND_TEN_CENT_ELIGIBILITY_REVIEW_CANDIDATES_ASSEMBLED':followingCandidate?'FOLLOWING_DAY_RULE_REVIEW_CANDIDATE_ONLY':eligibilityCandidate?'TEN_CENT_ELIGIBILITY_REVIEW_CANDIDATE_ONLY':'NO_EXECUTION_SEMANTICS_REVIEW_CANDIDATE_FOUND',
    sourceName,target:binding.target,
    binding:{exactBet365SpainFrontendToConfiguredSljp1TransportBindingVerified:true,jackpotsCasino:binding.configuredTransport.jackpotsCasino,tickerEndpoint:binding.configuredTransport.endpoint},
    servedStake:{servedTenCentTotalStakeVerified:true,requiredStakeEUR:0.10,evidence:stake.evidence},
    ruleEvidence:{
      conservativeFollowingDayDetectorValid:following?.valid===true,
      conservativeFollowingDayDetectorReason:following?.reason||null,
      combinedBet365OwnedRuleScannerValid:rules?.valid===true,
      followingDayCandidateCount:rules?.followingDayFirstBetRuleCandidateCount??0,
      anySizeEligibilityCandidateCount:rules?.anySizeJackpotEligibilityCandidateCount??0,
      followingDayBodySha256:[...new Set(followingDigests)],
      anySizeEligibilityBodySha256:[...new Set(eligibilityDigests)],
    },
    followingDayOperatorRuleReviewCandidate:followingCandidate,
    tenCentJackpotEligibilityReviewCandidate:eligibilityCandidate,
    bothExecutionSemanticsReviewCandidatesPresent:followingCandidate&&eligibilityCandidate,
    bet365FollowingDayRuleAdoptionVerified:false,
    servedTenCentJackpotEligibilityVerified:false,
    independentReviewRequired:true,
    independentReviewMustInspectExactCommittedHarOrRedactedRuleArtifact:true,
    independentReviewMustMatchBodyDigests:true,
    usableForExecution:false,
    scientificUse:'Assembles, but does not approve, the two missing semantic execution gates from one exact current Frank Bruno bet365 Spain served session. A following-day review candidate requires both the conservative dedicated detector and the broader bet365-owned scanner to independently identify first-bet/following-day semantics. A €0.10 eligibility review candidate requires an explicit served EUR total-stake menu containing 0.10 plus bet365-owned exact-session text stating any-bet/any-size jackpot eligibility. Only body digests and redacted structural evidence are emitted. Independent semantic review of the exact committed evidence remains mandatory; this package never self-promotes either gate.',
    execution:execution(),
    hardGuards:{onlineOnly:true,nonPromoOnly:true,offlineOnly:true,passiveHarOnly:true,exactFrankServedSljp1BindingRequired:true,explicitServedTenCentTotalStakeRequired:true,followingDayRequiresTwoIndependentDetectors:true,eligibilityRequiresBet365OwnedAnySizeText:true,providerFamilyVariableBetSizeAloneRejected:true,crossOperatorTextRejected:true,keywordCandidatesCannotSelfVerifySemantics:true,bodyDigestReviewRequired:true,noWagerProbe:true,noAutomaticBetting:true,realMoneyAllowed:false},
  };
}

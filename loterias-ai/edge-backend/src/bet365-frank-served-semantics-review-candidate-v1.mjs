import {verifyBet365SportingServedSljp1Binding} from './bet365-sporting-served-sljp1-binding-v1.mjs';
import {verifyBet365SportingServedTotalStake} from './bet365-sporting-served-total-stake-v1.mjs';
import {discoverBet365FrankServedRulesCandidate} from './bet365-frank-served-rules-candidate-v1.mjs';

const VERSION='bet365-frank-served-semantics-review-candidate-v1.1-consolidated';
const GAME_CODE='gpas_slfbruno_pop';
function execution(){return {decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0};}
function fail(reason,extra={}){return {version:VERSION,valid:false,reason,followingDayOperatorRuleReviewCandidate:false,tenCentJackpotEligibilityReviewCandidate:false,bet365FollowingDayRuleAdoptionVerified:false,servedTenCentJackpotEligibilityVerified:false,independentReviewRequired:true,usableForExecution:false,execution:execution(),...extra};}
function unique(values){return [...new Set(values.filter(Boolean))];}

export function buildBet365FrankServedSemanticsReviewCandidate(har,{sourceName='frank-current.har'}={}){
  const binding=verifyBet365SportingServedSljp1Binding(har,{gameCode:GAME_CODE,sourceName});
  if(binding?.valid!==true)return fail('EXACT_FRANK_SERVED_SLJP1_BINDING_REQUIRED',{sourceName,bindingReason:binding?.reason||null});
  const stake=verifyBet365SportingServedTotalStake(har,{gameCode:GAME_CODE,sourceName,requiredStakeEUR:0.10});
  if(stake?.valid!==true||stake?.servedTenCentTotalStakeVerified!==true)return fail('EXPLICIT_SERVED_TEN_CENT_TOTAL_STAKE_REQUIRED',{sourceName,stakeReason:stake?.reason||null});
  const rules=discoverBet365FrankServedRulesCandidate(har,{sourceName});
  if(rules?.valid!==true)return fail('BET365_OWNED_RULE_SCANNER_REQUIRED',{sourceName,ruleScannerReason:rules?.reason||null});
  const followingRows=(rules.candidates||[]).filter(x=>x.followingDayFirstBetRuleCandidate===true);
  const eligibilityRows=(rules.candidates||[]).filter(x=>x.anySizeJackpotEligibilityCandidate===true);
  const followingCandidate=followingRows.length>0&&followingRows.every(x=>x?.concepts?.sporting===true&&x?.concepts?.jackpot===true&&x?.concepts?.firstBet===true&&x?.concepts?.followingDay===true&&(x?.concepts?.daily===true||x?.concepts?.guaranteedTime===true));
  const eligibilityCandidate=eligibilityRows.length>0&&eligibilityRows.every(x=>x?.concepts?.sporting===true&&x?.concepts?.jackpot===true&&x?.concepts?.anySize===true&&(x?.concepts?.daily===true||x?.concepts?.largerBet===true));
  const followingDigests=unique(followingRows.map(x=>x.bodySha256));
  const eligibilityDigests=unique(eligibilityRows.map(x=>x.bodySha256));
  return {
    version:VERSION,mode:'OFFLINE_PASSIVE_EXACT_FRANK_SERVED_EXECUTION_SEMANTICS_REVIEW_PACKAGE_NO_PLAY',valid:true,
    reason:followingCandidate&&eligibilityCandidate?'BOTH_OPERATOR_RULE_AND_TEN_CENT_ELIGIBILITY_REVIEW_CANDIDATES_ASSEMBLED':followingCandidate?'FOLLOWING_DAY_RULE_REVIEW_CANDIDATE_ONLY':eligibilityCandidate?'TEN_CENT_ELIGIBILITY_REVIEW_CANDIDATE_ONLY':'NO_EXECUTION_SEMANTICS_REVIEW_CANDIDATE_FOUND',
    sourceName,target:binding.target,
    binding:{exactBet365SpainFrontendToConfiguredSljp1TransportBindingVerified:true,jackpotsCasino:binding.configuredTransport.jackpotsCasino,tickerEndpoint:binding.configuredTransport.endpoint},
    servedStake:{servedTenCentTotalStakeVerified:true,requiredStakeEUR:0.10,evidence:stake.evidence},
    ruleEvidence:{
      combinedBet365OwnedRuleScannerValid:true,
      followingDayCandidateCount:followingRows.length,
      anySizeEligibilityCandidateCount:eligibilityRows.length,
      followingDayBodySha256:followingDigests,
      anySizeEligibilityBodySha256:eligibilityDigests,
      exactFollowingConceptClosureRequired:true,
      exactEligibilityConceptClosureRequired:true,
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
    scientificUse:'Assembles, but never approves, the two missing semantic execution gates from one exact current Frank Bruno bet365 Spain served session. Following-day review candidacy requires a bet365-owned response in the exact bound session whose redacted concept map jointly closes Sporting/Frank context, jackpot context, first-bet wording, following-day wording and Daily/GHT context. €0.10 eligibility candidacy additionally requires an explicit served EUR total-stake menu containing 0.10 and bet365-owned exact-session any-bet/any-size jackpot wording. Body digests and structural flags are emitted without raw rule text. Independent semantic review of the exact committed evidence remains mandatory before either fact can be promoted.',
    execution:execution(),
    hardGuards:{onlineOnly:true,nonPromoOnly:true,offlineOnly:true,passiveHarOnly:true,exactFrankServedSljp1BindingRequired:true,explicitServedTenCentTotalStakeRequired:true,followingDayRequiresExactConceptClosure:true,eligibilityRequiresBet365OwnedAnySizeText:true,providerFamilyVariableBetSizeAloneRejected:true,crossOperatorTextRejected:true,keywordCandidatesCannotSelfVerifySemantics:true,bodyDigestReviewRequired:true,noWagerProbe:true,noAutomaticBetting:true,realMoneyAllowed:false},
  };
}

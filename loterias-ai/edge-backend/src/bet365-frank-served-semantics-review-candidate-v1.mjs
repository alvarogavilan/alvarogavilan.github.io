import {verifyBet365SportingServedSljp1Binding} from './bet365-sporting-served-sljp1-binding-v1.mjs';
import {verifyBet365SportingServedTotalStake} from './bet365-sporting-served-total-stake-v1.mjs';
import {discoverBet365FrankServedRulesCandidate} from './bet365-frank-served-rules-candidate-v1.mjs';

const VERSION='bet365-frank-served-semantics-review-candidate-v1.2-rtp-separation';
const GAME_CODE='gpas_slfbruno_pop';
function execution(){return {decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0};}
function fail(reason,extra={}){return {version:VERSION,valid:false,reason,followingDayOperatorRuleReviewCandidate:false,tenCentJackpotEligibilityReviewCandidate:false,jackpotRtpSeparationReviewCandidate:false,bet365FollowingDayRuleAdoptionVerified:false,servedTenCentJackpotEligibilityVerified:false,bet365JackpotDoesNotAffectGameRtpVerified:false,independentReviewRequired:true,usableForExecution:false,execution:execution(),...extra};}
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
  const rtpRows=(rules.candidates||[]).filter(x=>x.operatorFundedJackpotRtpSeparationCandidate===true);
  const followingCandidate=followingRows.length>0&&followingRows.every(x=>x?.concepts?.sporting===true&&x?.concepts?.jackpot===true&&x?.concepts?.firstBet===true&&x?.concepts?.followingDay===true&&(x?.concepts?.daily===true||x?.concepts?.guaranteedTime===true));
  const eligibilityCandidate=eligibilityRows.length>0&&eligibilityRows.every(x=>x?.concepts?.sporting===true&&x?.concepts?.jackpot===true&&x?.concepts?.anySize===true&&(x?.concepts?.daily===true||x?.concepts?.largerBet===true));
  const rtpCandidate=rtpRows.length>0&&rtpRows.every(x=>x?.concepts?.sporting===true&&x?.concepts?.jackpot===true&&x?.concepts?.operatorFunded===true&&x?.concepts?.jackpotDoesNotAffectRtp===true);
  const followingDigests=unique(followingRows.map(x=>x.bodySha256));
  const eligibilityDigests=unique(eligibilityRows.map(x=>x.bodySha256));
  const rtpDigests=unique(rtpRows.map(x=>x.bodySha256));
  const candidateCount=[followingCandidate,eligibilityCandidate,rtpCandidate].filter(Boolean).length;
  return {
    version:VERSION,mode:'OFFLINE_PASSIVE_EXACT_FRANK_SERVED_EXECUTION_AND_ECONOMIC_SEMANTICS_REVIEW_PACKAGE_NO_PLAY',valid:true,
    reason:candidateCount===3?'RULE_ELIGIBILITY_AND_RTP_SEPARATION_REVIEW_CANDIDATES_ASSEMBLED':candidateCount===0?'NO_EXECUTION_OR_ECONOMIC_SEMANTICS_REVIEW_CANDIDATE_FOUND':'PARTIAL_EXECUTION_OR_ECONOMIC_SEMANTICS_REVIEW_CANDIDATES_ASSEMBLED',
    sourceName,target:binding.target,
    binding:{exactBet365SpainFrontendToConfiguredSljp1TransportBindingVerified:true,jackpotsCasino:binding.configuredTransport.jackpotsCasino,tickerEndpoint:binding.configuredTransport.endpoint},
    servedStake:{servedTenCentTotalStakeVerified:true,requiredStakeEUR:0.10,evidence:stake.evidence},
    ruleEvidence:{
      combinedBet365OwnedRuleScannerValid:true,
      followingDayCandidateCount:followingRows.length,
      anySizeEligibilityCandidateCount:eligibilityRows.length,
      operatorFundedRtpSeparationCandidateCount:rtpRows.length,
      followingDayBodySha256:followingDigests,
      anySizeEligibilityBodySha256:eligibilityDigests,
      operatorFundedRtpSeparationBodySha256:rtpDigests,
      exactFollowingConceptClosureRequired:true,
      exactEligibilityConceptClosureRequired:true,
      exactRtpSeparationConceptClosureRequired:true,
    },
    followingDayOperatorRuleReviewCandidate:followingCandidate,
    tenCentJackpotEligibilityReviewCandidate:eligibilityCandidate,
    jackpotRtpSeparationReviewCandidate:rtpCandidate,
    allThreeSemanticsReviewCandidatesPresent:candidateCount===3,
    bet365FollowingDayRuleAdoptionVerified:false,
    servedTenCentJackpotEligibilityVerified:false,
    bet365JackpotDoesNotAffectGameRtpVerified:false,
    headlineRtpMayBeUsedAsBaseGameRtp:false,
    independentReviewRequired:true,
    independentReviewMustInspectExactCommittedHarOrRedactedRuleArtifact:true,
    independentReviewMustMatchBodyDigests:true,
    usableForExecution:false,
    scientificUse:'Assembles, but never approves, three distinct semantic gates from one exact current Frank Bruno bet365 Spain served session: first-bet-following-day operator adoption, €0.10 jackpot eligibility, and whether operator-funded Sporting Legends jackpots are explicitly excluded from game RTP. The third gate matters economically because only equivalent bet365-owned text could justify treating the operator-published 95.92% as game RTP unaffected by the jackpot; Betfred evidence cannot be transferred. Body digests and structural concept flags are emitted without raw rule text. Independent semantic review of the exact committed evidence remains mandatory before any gate or RTP decomposition can be promoted.',
    execution:execution(),
    hardGuards:{onlineOnly:true,nonPromoOnly:true,offlineOnly:true,passiveHarOnly:true,exactFrankServedSljp1BindingRequired:true,explicitServedTenCentTotalStakeRequired:true,followingDayRequiresExactConceptClosure:true,eligibilityRequiresBet365OwnedAnySizeText:true,rtpSeparationRequiresBet365OwnedOperatorFundedAndNoRtpEffectText:true,headlineRtpCannotSelfVerifyBaseRtp:true,betfredRtpSeparationCannotTransferToBet365:true,providerFamilyVariableBetSizeAloneRejected:true,crossOperatorTextRejected:true,keywordCandidatesCannotSelfVerifySemantics:true,bodyDigestReviewRequired:true,noWagerProbe:true,noAutomaticBetting:true,realMoneyAllowed:false},
  };
}

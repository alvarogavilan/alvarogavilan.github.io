import {evaluateBet365FrankIndependentSemanticsApproval} from './bet365-frank-independent-semantics-approval-v1.mjs';
import {verifyBet365SportingServedOverduePair} from './bet365-sporting-served-overdue-pair-v1.mjs';

const VERSION='bet365-frank-reviewed-overdue-economics-v1.2-internal-har-derivation';
const PAIR_VERSION='bet365-sporting-served-overdue-pair-v1';
const GAME_CODE='gpas_slfbruno_pop';
const OFFICIAL_CURRENT_RTP_PCT=95.92;
const REQUIRED_STAKE_EUR=0.10;
const finite=v=>{if(v===null||v===undefined||v===''||typeof v==='boolean')return null;const n=Number(v);return Number.isFinite(n)?n:null;};
const lower=v=>typeof v==='string'&&v.trim()?v.trim().toLowerCase():null;
function execution(){return {decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0};}
function fail(reason,extra={}){return {version:VERSION,valid:false,reason,reviewedBaseRtpEconomicsClosed:false,breakEvenFirstBetProbability:null,usableForRaceThreshold:false,usableForExecution:false,execution:execution(),...extra};}

export function evaluateBet365FrankReviewedOverdueEconomics({
  beforeHar,afterHar,beforeSourceName='frank-before.har',afterSourceName='frank-after.har',reviewCommits,
  maxFeedAgeIntervals=2,maxBoundaryDistanceIntervals=2,maxRouteToProviderMarkerSeconds=120,
}={}){
  const semantics=evaluateBet365FrankIndependentSemanticsApproval({har:afterHar,sourceName:afterSourceName,reviewCommits});
  if(semantics?.valid!==true)return fail('INTERNALLY_DERIVED_INDEPENDENT_FRANK_SEMANTICS_APPROVAL_REQUIRED',{semanticsReason:semantics?.reason||null,rtpPolicyClosed:semantics?.publishedTheoreticalRtpExcludesJackpotAllocationVerified===true});
  if(semantics.bet365FollowingDayRuleAdoptionVerified!==true||semantics.servedTenCentJackpotEligibilityVerified!==true||semantics.publishedTheoreticalRtpExcludesJackpotAllocationVerified!==true||semantics.headlineRtpMayBeUsedAsBaseGameRtp!==true)return fail('REVIEWED_RULE_ELIGIBILITY_AND_OPERATOR_RTP_POLICY_REQUIRED');
  if(finite(semantics.reviewedPublishedGameRtpPct)!==OFFICIAL_CURRENT_RTP_PCT||finite(semantics.reviewedStakeEUR)!==REQUIRED_STAKE_EUR)return fail('REVIEWED_RTP_OR_STAKE_MISMATCH');

  const pair=verifyBet365SportingServedOverduePair({
    gameCode:GAME_CODE,beforeHar,afterHar,beforeSourceName,afterSourceName,requiredStakeEUR:REQUIRED_STAKE_EUR,
    maxFeedAgeIntervals,maxBoundaryDistanceIntervals,maxRouteToProviderMarkerSeconds,
  });
  if(!pair||pair.version!==PAIR_VERSION||pair.valid!==true||pair.realCrossGhtUnawardedPairVerified!==true||pair.exactBet365SpainPairBindingVerified!==true||pair.servedTenCentTotalStakeVerified!==true)return fail('INTERNALLY_DERIVED_VALID_EXACT_FRANK_CROSS_GHT_PAIR_REQUIRED',{pairReason:pair?.reason||null});
  if(lower(pair?.after?.gameCode)!==GAME_CODE||finite(pair.requiredStakeEUR)!==REQUIRED_STAKE_EUR)return fail('FRANK_TEN_CENT_PAIR_SCOPE_REQUIRED');

  const runtime=semantics.runtimeBinding||{};
  if(lower(pair?.configuredBinding?.jackpotsCasino)!==lower(runtime.jackpotsCasino)||pair?.configuredBinding?.tickerEndpoint!==runtime.configuredTickerEndpoint||pair?.after?.tickerEndpoint!==runtime.observedTickerEndpoint||lower(pair?.after?.requestCasino)!==lower(runtime.requestCasino)||String(pair?.after?.instanceCode||'')!==String(runtime.instanceCode||''))return fail('ECONOMICS_ARTIFACT_BINDING_SCOPE_MISMATCH');
  const jackpotEUR=finite(pair?.after?.amount);if(!(jackpotEUR>0))return fail('CURRENT_DAILY_JACKPOT_REQUIRED');
  const baseRtp=OFFICIAL_CURRENT_RTP_PCT/100;
  const expectedBaseReturnEUR=REQUIRED_STAKE_EUR*baseRtp;
  const expectedBaseLossEUR=REQUIRED_STAKE_EUR-expectedBaseReturnEUR;
  const breakEvenFirstBetProbability=expectedBaseLossEUR/jackpotEUR;
  if(!(breakEvenFirstBetProbability>0&&breakEvenFirstBetProbability<1))return fail('INVALID_BREAK_EVEN_PROBABILITY',{currentDailyJackpotEUR:jackpotEUR});
  return {
    version:VERSION,mode:'OFFLINE_REVIEWED_FRANK_OVERDUE_ECONOMICS_NO_PLAY',valid:true,
    reason:'REVIEWED_FRANK_OPERATOR_RTP_POLICY_AND_CURRENT_CROSS_GHT_JACKPOT_BREAK_EVEN_THRESHOLD_AVAILABLE',
    operator:'bet365 Spain',market:'ES',target:{title:'Frank Bruno: Sporting Legends',gameCode:GAME_CODE},
    sourceEvidence:{beforeSourceName,afterSourceName},semanticReviewArtifactIdentities:semantics.reviewArtifactIdentities,runtimeBinding:runtime,
    stakeEUR:REQUIRED_STAKE_EUR,reviewedGameRtpPct:OFFICIAL_CURRENT_RTP_PCT,
    rtpInterpretation:'CURRENT_BET365_SPAIN_OPERATOR_POLICY_EXCLUDES_JACKPOT_ALLOCATION_FROM_RTP_CALCULATIONS',
    expectedBaseReturnEUR,expectedBaseLossEUR,currentDailyJackpotEUR:jackpotEUR,
    crossGht:{deadlineEpochSeconds:pair.deadlineEpochSeconds,beforeLeadSeconds:pair.beforeLeadSeconds,afterLagSeconds:pair.afterLagSeconds,requestExecIntervalSeconds:pair.requestExecIntervalSeconds,winCount:pair.after.winCount,instanceCode:pair.after.instanceCode},
    breakEvenFirstBetProbability,reviewedBaseRtpEconomicsClosed:true,usableForRaceThreshold:true,usableForExecution:false,
    scientificUse:'Computes Frank break-even only by deriving both semantic approval and current cross-GHT state from the original passive HAR evidence. The exact after HAR supplies the reviewed sljp-1/runtime/stake semantic artifact and also participates in the cross-GHT pair; callers cannot supply prebuilt semantic candidates, a fabricated pair, jackpot amount or binding. The 95.92% base-game RTP remains anchored to current bet365 Spain operator policy. A reviewed prospective race lower bound and fresh final state still remain mandatory.',
    execution:execution(),
    hardGuards:{onlineOnly:true,nonPromoOnly:true,passiveHarOnly:true,callerSuppliedSemanticCandidatesIgnored:true,callerSuppliedOverduePairIgnored:true,currentJackpotDerivedInternallyFromAfterHar:true,semanticAndPairBindingMustMatchExactly:true,codeOwnedRuleAndEligibilityArtifactReviewsRequired:true,operatorOwnedSpainRtpPolicyRequired:true,exactFrankCrossGhtPairRequired:true,publishedMinimumBetCannotProveJackpotEligibility:true,currentObservedJackpotRequired:true,breakEvenThresholdIsNotRaceProbability:true,raceLowerBoundStillRequired:true,freshFinalStateStillRequired:true,noWagerProbe:true,noAutomaticBetting:true,realMoneyAllowed:false},
  };
}

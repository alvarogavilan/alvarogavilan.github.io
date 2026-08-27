import {evaluateBet365FrankIndependentSemanticsApproval} from './bet365-frank-independent-semantics-approval-v1.mjs';

const VERSION='bet365-frank-reviewed-overdue-economics-v1.1-operator-rtp-policy';
const PAIR_VERSION='bet365-sporting-served-overdue-pair-v1';
const GAME_CODE='gpas_slfbruno_pop';
const OFFICIAL_CURRENT_RTP_PCT=95.92;
const REQUIRED_STAKE_EUR=0.10;
const finite=v=>{if(v===null||v===undefined||v===''||typeof v==='boolean')return null;const n=Number(v);return Number.isFinite(n)?n:null;};
const lower=v=>typeof v==='string'&&v.trim()?v.trim().toLowerCase():null;
function execution(){return {decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0};}
function fail(reason,extra={}){return {version:VERSION,valid:false,reason,reviewedBaseRtpEconomicsClosed:false,breakEvenFirstBetProbability:null,usableForRaceThreshold:false,usableForExecution:false,execution:execution(),...extra};}

export function evaluateBet365FrankReviewedOverdueEconomics({providerNetworkCandidate,servedSemanticsReviewCandidate,reviewCommits,overduePair}={}){
  const semantics=evaluateBet365FrankIndependentSemanticsApproval({providerNetworkCandidate,servedSemanticsReviewCandidate,reviewCommits});
  if(semantics?.valid!==true)return fail('INDEPENDENT_FRANK_SEMANTICS_APPROVAL_REQUIRED',{semanticsReason:semantics?.reason||null,rtpPolicyClosed:semantics?.publishedTheoreticalRtpExcludesJackpotAllocationVerified===true});
  if(semantics.bet365FollowingDayRuleAdoptionVerified!==true||semantics.servedTenCentJackpotEligibilityVerified!==true||semantics.publishedTheoreticalRtpExcludesJackpotAllocationVerified!==true||semantics.headlineRtpMayBeUsedAsBaseGameRtp!==true)return fail('REVIEWED_RULE_ELIGIBILITY_AND_OPERATOR_RTP_POLICY_REQUIRED');
  if(finite(semantics.reviewedPublishedGameRtpPct)!==OFFICIAL_CURRENT_RTP_PCT||finite(semantics.reviewedStakeEUR)!==REQUIRED_STAKE_EUR)return fail('REVIEWED_RTP_OR_STAKE_MISMATCH');
  const pair=overduePair;
  if(!pair||pair.version!==PAIR_VERSION||pair.valid!==true||pair.realCrossGhtUnawardedPairVerified!==true||pair.exactBet365SpainPairBindingVerified!==true||pair.servedTenCentTotalStakeVerified!==true)return fail('VALID_EXACT_FRANK_CROSS_GHT_PAIR_REQUIRED');
  if(lower(pair?.after?.gameCode)!==GAME_CODE||finite(pair.requiredStakeEUR)!==REQUIRED_STAKE_EUR)return fail('FRANK_TEN_CENT_PAIR_SCOPE_REQUIRED');
  const networkRuntime=providerNetworkCandidate?.runtime||{};
  if(lower(pair?.configuredBinding?.jackpotsCasino)!==lower(networkRuntime.bet365ConfiguredJackpotsCasino)||pair?.configuredBinding?.tickerEndpoint!==networkRuntime.configuredTickerEndpoint||String(pair?.after?.instanceCode||'')!==String(networkRuntime.instanceCode||''))return fail('ECONOMICS_ARTIFACT_BINDING_SCOPE_MISMATCH');
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
    stakeEUR:REQUIRED_STAKE_EUR,reviewedGameRtpPct:OFFICIAL_CURRENT_RTP_PCT,
    rtpInterpretation:'CURRENT_BET365_SPAIN_OPERATOR_POLICY_EXCLUDES_JACKPOT_ALLOCATION_FROM_RTP_CALCULATIONS',
    expectedBaseReturnEUR,expectedBaseLossEUR,currentDailyJackpotEUR:jackpotEUR,
    breakEvenFirstBetProbability,reviewedBaseRtpEconomicsClosed:true,usableForRaceThreshold:true,usableForExecution:false,
    scientificUse:'Computes the Frank first-bet break-even race probability only after code-owned reviews close exact bet365 first-bet-following-day semantics and €0.10 jackpot eligibility. The base-game loss component uses the current official bet365 Spain Frank Bruno theoretical RTP of 95.92% because the operator current Fair Payout policy states that amounts allocated to jackpots are excluded from its RTP calculations. It then requires a real same-binding post-GHT unawarded pair and exact artifact-scope equality. The threshold is expected base loss divided by the exact observed Daily jackpot amount. The published €0.10 minimum alone cannot prove jackpot eligibility or served stake. A race lower confidence bound and fresh final state remain mandatory before any separate execution decision.',
    execution:execution(),
    hardGuards:{onlineOnly:true,nonPromoOnly:true,codeOwnedRuleAndEligibilityReviewsRequired:true,operatorOwnedSpainRtpPolicyRequired:true,exactFrankCrossGhtPairRequired:true,sameBindingAcrossSemanticAndPairArtifacts:true,publishedMinimumBetCannotProveJackpotEligibility:true,publishedMinimumBetCannotProveServedStake:true,currentObservedJackpotRequired:true,breakEvenThresholdIsNotRaceProbability:true,raceLowerBoundStillRequired:true,freshFinalStateStillRequired:true,noWagerProbe:true,noAutomaticBetting:true,realMoneyAllowed:false},
  };
}

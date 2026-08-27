import {evaluateBet365FrankIndependentSemanticsApproval} from './bet365-frank-independent-semantics-approval-v1.mjs';

const VERSION='bet365-frank-reviewed-overdue-economics-v1';
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
  if(semantics?.valid!==true)return fail('INDEPENDENT_FRANK_SEMANTICS_APPROVAL_REQUIRED',{semanticsReason:semantics?.reason||null});
  if(semantics.bet365FollowingDayRuleAdoptionVerified!==true||semantics.servedTenCentJackpotEligibilityVerified!==true||semantics.bet365JackpotDoesNotAffectGameRtpVerified!==true||semantics.headlineRtpMayBeUsedAsBaseGameRtp!==true)return fail('REVIEWED_RULE_ELIGIBILITY_AND_RTP_SEPARATION_REQUIRED');
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
    reason:'REVIEWED_FRANK_BASE_RTP_AND_CURRENT_CROSS_GHT_JACKPOT_BREAK_EVEN_THRESHOLD_AVAILABLE',
    operator:'bet365 Spain',market:'ES',target:{title:'Frank Bruno: Sporting Legends',gameCode:GAME_CODE},
    stakeEUR:REQUIRED_STAKE_EUR,reviewedGameRtpPct:OFFICIAL_CURRENT_RTP_PCT,
    rtpInterpretation:'BET365_OWNED_REVIEWED_TEXT_STATES_OPERATOR_FUNDED_JACKPOT_DOES_NOT_AFFECT_GAME_RTP',
    expectedBaseReturnEUR,expectedBaseLossEUR,currentDailyJackpotEUR:jackpotEUR,
    breakEvenFirstBetProbability,reviewedBaseRtpEconomicsClosed:true,usableForRaceThreshold:true,usableForExecution:false,
    scientificUse:'Computes the Frank first-bet break-even race probability only after code-owned independent reviews close exact bet365 following-day semantics, €0.10 jackpot eligibility, and bet365-owned operator-funded/no-RTP-effect text. It then requires a real same-binding post-GHT unawarded pair and exact artifact-scope equality before using the official current 95.92% game RTP. The threshold is expected base loss divided by the exact observed Daily jackpot amount. No headline RTP, cross-operator RTP decomposition, synthetic jackpot, stale state or caller self-attestation can enter this path. A race lower confidence bound and fresh final state are still mandatory before any separate execution decision.',
    execution:execution(),
    hardGuards:{onlineOnly:true,nonPromoOnly:true,codeOwnedSemanticReviewsRequired:true,exactFrankCrossGhtPairRequired:true,sameBindingAcrossSemanticAndPairArtifacts:true,reviewedBet365RtpSeparationRequired:true,headlineRtpAloneRejected:true,currentObservedJackpotRequired:true,breakEvenThresholdIsNotRaceProbability:true,raceLowerBoundStillRequired:true,freshFinalStateStillRequired:true,noWagerProbe:true,noAutomaticBetting:true,realMoneyAllowed:false},
  };
}

#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {verifyBet365SportingExactPlayRouteProvenance} from '../edge-backend/src/bet365-sporting-exact-play-route-provenance-v1.mjs';
import {verifyBet365SportingServedSljp1Binding} from '../edge-backend/src/bet365-sporting-served-sljp1-binding-v1.mjs';
import {verifyBet365SportingServedTotalStake} from '../edge-backend/src/bet365-sporting-served-total-stake-v1.mjs';
import {discoverBet365FrankServedRulesCandidate} from '../edge-backend/src/bet365-frank-served-rules-candidate-v1.mjs';
import {buildBet365FrankServedSemanticsReviewCandidate} from '../edge-backend/src/bet365-frank-served-semantics-review-candidate-v1.mjs';
import {buildBet365FrankProviderNetworkSemanticsCandidate} from '../edge-backend/src/bet365-frank-provider-network-semantics-candidate-v1.mjs';
import {getBet365SpainCurrentSportingRtpPolicy} from '../edge-backend/src/bet365-spain-current-sporting-rtp-policy-v1.mjs';
import {deriveBet365SportingPublishedBaseLoss} from '../edge-backend/src/bet365-sporting-published-base-loss-v1.mjs';
import {analyzeBet365SportingStructuredWebtickersRows} from '../edge-backend/src/bet365-sporting-webtickers-structured-row-v1.mjs';
import {analyzeBet365SportingDualFeedCalibrationSample} from '../edge-backend/src/bet365-sporting-dual-feed-calibration-v1.mjs';

const VERSION='analyze-bet365-frank-current-session-v1.8-reusable-offline-analyzer';
const GAME_CODE='gpas_slfbruno_pop';
function execution(){return {decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0};}
function summary(result){if(!result||typeof result!=='object')return {valid:false,reason:'NO_RESULT'};return result;}
function fail(reason,extra={}){return {version:VERSION,valid:false,reason,execution:execution(),...extra};}

export function analyzeBet365FrankCurrentSessionHarText(raw,{sourceName='frank-current.har'}={}){
  if(typeof raw!=='string'||!raw.trim())return fail('HAR_TEXT_REQUIRED',{sourceName});
  let provenance,servedBinding,servedStake,servedRulesCandidate,servedSemanticsReviewCandidate,providerNetworkSemanticsCandidate,modernStateCandidate,dualFeedCalibrationCandidate;
  try{
    provenance=verifyBet365SportingExactPlayRouteProvenance(raw,{gameCode:GAME_CODE,sourceName});
    servedBinding=verifyBet365SportingServedSljp1Binding(raw,{gameCode:GAME_CODE,sourceName});
    servedStake=verifyBet365SportingServedTotalStake(raw,{gameCode:GAME_CODE,sourceName,requiredStakeEUR:0.10});
    servedRulesCandidate=discoverBet365FrankServedRulesCandidate(raw,{sourceName});
    servedSemanticsReviewCandidate=buildBet365FrankServedSemanticsReviewCandidate(raw,{sourceName});
    providerNetworkSemanticsCandidate=buildBet365FrankProviderNetworkSemanticsCandidate(raw,{sourceName});
    modernStateCandidate=analyzeBet365SportingStructuredWebtickersRows(raw,{gameCode:GAME_CODE,sourceName});
    dualFeedCalibrationCandidate=analyzeBet365SportingDualFeedCalibrationSample(raw,{gameCode:GAME_CODE,sourceName});
  }catch(error){return fail('HAR_ANALYSIS_FAILED',{sourceName,message:String(error?.message||error)});}

  const operatorRtpPolicy=getBet365SpainCurrentSportingRtpPolicy({gameCode:GAME_CODE});
  const publishedBaseLoss=deriveBet365SportingPublishedBaseLoss({gameCode:GAME_CODE});
  const operatorRtpClosed=operatorRtpPolicy?.valid===true&&operatorRtpPolicy?.publishedTheoreticalRtpExcludesJackpotAllocationVerified===true&&operatorRtpPolicy?.headlineRtpMayBeUsedAsBaseGameRtp===true&&Number(operatorRtpPolicy?.publishedTheoreticalRtpPct)===95.92;
  const staticBaseLossClosed=publishedBaseLoss?.valid===true&&publishedBaseLoss?.publishedBaseLossAvailable===true&&Number(publishedBaseLoss?.expectedBaseLossAtPublishedMinimumEUR)===0.00408;

  return {
    version:VERSION,
    valid:true,
    mode:'LOCAL_OFFLINE_PASSIVE_FRANK_CURRENT_SESSION_DIAGNOSTIC_NO_PLAY',
    sourceName,
    target:{title:'Frank Bruno: Sporting Legends',gameCode:GAME_CODE,exactPublicPlayUrl:'https://casino.bet365.es/play/FrankBrunoSL'},
    staticPublishedEconomics:{
      valid:staticBaseLossClosed,
      publishedMinimumBetEUR:staticBaseLossClosed?publishedBaseLoss.publishedMinimumBetEUR:null,
      publishedTheoreticalRtpPct:staticBaseLossClosed?publishedBaseLoss.publishedTheoreticalRtpPct:null,
      expectedBaseLossAtPublishedMinimumEUR:staticBaseLossClosed?publishedBaseLoss.expectedBaseLossAtPublishedMinimumEUR:null,
      publishedTheoreticalRtpExcludesJackpotAllocationVerified:staticBaseLossClosed,
      jackpotEligibilityAtPublishedMinimumBetVerified:false,
      servedStakeAtDecisionVerified:false,
      usableForJackpotThreshold:false,
      note:'Static current bet365 Spain base-game economics only. No jackpot threshold is available until the exact served runtime, jackpot eligibility at €0.10 and current jackpot state are independently closed.'
    },
    gates:{
      currentBet365SpainOperatorRtpPolicy:summary(operatorRtpPolicy),
      publishedBaseGameLossAtOperatorMinimum:summary(publishedBaseLoss),
      exactPlayRouteProviderProvenance:summary(provenance),
      servedSljp1TransportBinding:summary(servedBinding),
      servedTenCentTotalStake:summary(servedStake),
      servedRuleEligibilityAndRtpCandidates:summary(servedRulesCandidate),
      servedSemanticsReviewPackage:summary(servedSemanticsReviewCandidate),
      providerNetworkSemanticsBindingCandidate:summary(providerNetworkSemanticsCandidate),
      configuredModernStateCandidate:summary(modernStateCandidate),
      legacyVsModernCalibrationCandidate:summary(dualFeedCalibrationCandidate),
    },
    closed:{
      exactCurrentBet365SpainPublishedFrankRtpRow:operatorRtpClosed,
      publishedTheoreticalRtpExcludesJackpotAllocation:operatorRtpClosed,
      headlineRtpMayBeUsedAsBaseGameRtp:operatorRtpClosed,
      publishedFrankTheoreticalRtpPct:operatorRtpClosed?95.92:null,
      publishedFrankMinimumBetEUR:operatorRtpClosed?0.10:null,
      publishedFrankExpectedBaseLossAtMinimumEUR:staticBaseLossClosed?0.00408:null,
      exactPlayRouteProviderProvenance:provenance?.valid===true&&provenance?.exactFrontendProviderIdentityCandidateVerified===true,
      exactFrontendToConfiguredSljp1Transport:servedBinding?.valid===true&&servedBinding?.exactBet365SpainFrontendToConfiguredSljp1TransportBindingVerified===true,
      servedTenCentTotalStake:servedStake?.valid===true&&servedStake?.servedTenCentTotalStakeVerified===true,
      servedFollowingDayRuleTextCandidate:servedRulesCandidate?.valid===true&&servedRulesCandidate?.followingDayFirstBetRuleCandidateObserved===true,
      servedAnySizeEligibilityRuleTextCandidate:servedRulesCandidate?.valid===true&&servedRulesCandidate?.anySizeJackpotEligibilityCandidateObserved===true,
      servedOperatorFundedJackpotRtpSeparationTextCandidate:servedRulesCandidate?.valid===true&&servedRulesCandidate?.operatorFundedJackpotRtpSeparationCandidateObserved===true,
      exactGlobalSljp1ProviderNetworkSemanticsBindingCandidate:providerNetworkSemanticsCandidate?.valid===true&&providerNetworkSemanticsCandidate?.providerNetworkSemanticsBindingReviewCandidate===true,
      uniqueStructuredModernSljp1Candidate:modernStateCandidate?.valid===true&&modernStateCandidate?.structuredSljp1RowCandidateCount===1,
      exactDualFeedStateVectorCalibrationSample:dualFeedCalibrationCandidate?.valid===true&&dualFeedCalibrationCandidate?.calibrationCandidate===true,
    },
    stillMandatory:{
      exactCurrentSljp1ServerStateVerified:false,
      prospectiveModernMappingSeriesVerified:false,
      realCrossGhtUnawardedPairVerified:false,
      servedTenCentJackpotEligibilityVerified:false,
      bet365FollowingDayRuleAdoptionVerified:false,
      independentOperatorRuleTextOrProviderNetworkReviewRequired:true,
      independentAnySizeEligibilityTextOrProviderNetworkReviewRequired:true,
      independentRtpSeparationTextReviewRequired:false,
      independentProviderNetworkSemanticBindingReviewRequired:true,
      prospectivePostGhtSurvivalLedgerReviewed:false,
      independentlyFrozenActionLatencyRequired:true,
      prospectiveRaceProbabilityReviewed:false,
      executionAuthorized:false,
    },
    execution:execution(),
    hardGuards:{onlineOnly:true,nonPromoOnly:true,localOnly:true,passiveHarOnly:true,operatorOwnedRtpPolicyClosesOnlyBaseGameRtpDecomposition:true,publishedBaseLossIsNotJackpotEv:true,publishedMinimumBetCannotProveJackpotEligibility:true,publishedMinimumBetCannotProveServedStakeAtDecision:true,operatorOwnedRuleCandidatesNeedIndependentSemanticReview:true,providerNetworkBindingCandidateNeedIndependentSemanticReview:true,headlineRtpMaySetBaseLossOnlyBecauseCurrentBet365SpainPolicyExcludesJackpotAllocation:true,ruleCandidateCannotSelfVerifyAdoption:true,eligibilityCandidateCannotSelfVerifyTenCentJackpotEligibility:true,noWagerProbe:true,noAutomaticBetting:true,realMoneyAllowed:false},
  };
}

export function main(argv=process.argv.slice(2)){
  const file=argv[0];
  if(!file||file==='--help'||file==='-h'){
    process.stderr.write('Usage: node loterias-ai/scripts/analyze-bet365-frank-current-session.mjs <frank-current.har>\n');
    return file?0:2;
  }
  try{
    const sourceName=path.basename(file)||'frank-current.har';
    const out=analyzeBet365FrankCurrentSessionHarText(fs.readFileSync(file,'utf8'),{sourceName});
    process.stdout.write(`${JSON.stringify(out,null,2)}\n`);
    return out.valid?0:1;
  }catch(error){
    process.stdout.write(`${JSON.stringify(fail('HAR_READ_FAILED',{message:String(error?.message||error)}),null,2)}\n`);
    return 1;
  }
}
if(import.meta.url===`file://${process.argv[1]}`)process.exitCode=main();
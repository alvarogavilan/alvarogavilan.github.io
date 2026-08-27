#!/usr/bin/env node
import fs from 'node:fs';
import {verifyBet365SportingExactPlayRouteProvenance} from '../edge-backend/src/bet365-sporting-exact-play-route-provenance-v1.mjs';
import {verifyBet365SportingServedSljp1Binding} from '../edge-backend/src/bet365-sporting-served-sljp1-binding-v1.mjs';
import {verifyBet365SportingServedTotalStake} from '../edge-backend/src/bet365-sporting-served-total-stake-v1.mjs';
import {discoverBet365FrankServedRulesCandidate} from '../edge-backend/src/bet365-frank-served-rules-candidate-v1.mjs';
import {buildBet365FrankProviderNetworkSemanticsCandidate} from '../edge-backend/src/bet365-frank-provider-network-semantics-candidate-v1.mjs';
import {analyzeBet365SportingStructuredWebtickersRows} from '../edge-backend/src/bet365-sporting-webtickers-structured-row-v1.mjs';
import {analyzeBet365SportingDualFeedCalibrationSample} from '../edge-backend/src/bet365-sporting-dual-feed-calibration-v1.mjs';

const VERSION='analyze-bet365-frank-current-session-v1.4-provider-network-semantics';
const GAME_CODE='gpas_slfbruno_pop';
const args=process.argv.slice(2);
function execution(){return {decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0};}
function summary(result){if(!result||typeof result!=='object')return {valid:false,reason:'NO_RESULT'};return result;}
function usage(){process.stderr.write('Usage: node loterias-ai/scripts/analyze-bet365-frank-current-session.mjs <frank-current.har>\n');process.exitCode=2;}

if(args.length!==1)usage();
else{
  try{
    const file=args[0],har=fs.readFileSync(file,'utf8'),sourceName=file.split(/[\\/]/).pop()||'frank-current.har';
    const provenance=verifyBet365SportingExactPlayRouteProvenance(har,{gameCode:GAME_CODE,sourceName});
    const servedBinding=verifyBet365SportingServedSljp1Binding(har,{gameCode:GAME_CODE,sourceName});
    const servedStake=verifyBet365SportingServedTotalStake(har,{gameCode:GAME_CODE,sourceName,requiredStakeEUR:0.10});
    const servedRulesCandidate=discoverBet365FrankServedRulesCandidate(har,{sourceName});
    const providerNetworkSemanticsCandidate=buildBet365FrankProviderNetworkSemanticsCandidate(har,{sourceName});
    const modernStateCandidate=analyzeBet365SportingStructuredWebtickersRows(har,{gameCode:GAME_CODE,sourceName});
    const dualFeedCalibrationCandidate=analyzeBet365SportingDualFeedCalibrationSample(har,{gameCode:GAME_CODE,sourceName});
    const result={
      version:VERSION,
      valid:true,
      mode:'LOCAL_OFFLINE_PASSIVE_FRANK_CURRENT_SESSION_DIAGNOSTIC_NO_PLAY',
      sourceName,
      target:{title:'Frank Bruno: Sporting Legends',gameCode:GAME_CODE,exactPublicPlayUrl:'https://casino.bet365.es/play/FrankBrunoSL'},
      gates:{
        exactPlayRouteProviderProvenance:summary(provenance),
        servedSljp1TransportBinding:summary(servedBinding),
        servedTenCentTotalStake:summary(servedStake),
        servedRuleAndAnySizeEligibilityCandidates:summary(servedRulesCandidate),
        providerNetworkSemanticsBindingCandidate:summary(providerNetworkSemanticsCandidate),
        configuredModernStateCandidate:summary(modernStateCandidate),
        legacyVsModernCalibrationCandidate:summary(dualFeedCalibrationCandidate),
      },
      closed:{
        exactPlayRouteProviderProvenance:provenance?.valid===true&&provenance?.exactFrontendProviderIdentityCandidateVerified===true,
        exactFrontendToConfiguredSljp1Transport:servedBinding?.valid===true&&servedBinding?.exactBet365SpainFrontendToConfiguredSljp1TransportBindingVerified===true,
        servedTenCentTotalStake:servedStake?.valid===true&&servedStake?.servedTenCentTotalStakeVerified===true,
        servedFollowingDayRuleTextCandidate:servedRulesCandidate?.valid===true&&servedRulesCandidate?.followingDayFirstBetRuleCandidateObserved===true,
        servedAnySizeEligibilityRuleTextCandidate:servedRulesCandidate?.valid===true&&servedRulesCandidate?.anySizeJackpotEligibilityCandidateObserved===true,
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
        independentOperatorRuleTextReviewRequired:true,
        independentProviderNetworkSemanticBindingReviewRequired:true,
        prospectivePostGhtSurvivalLedgerReviewed:false,
        independentlyFrozenActionLatencyRequired:true,
        prospectiveRaceProbabilityReviewed:false,
        executionAuthorized:false,
      },
      execution:execution(),
      hardGuards:{onlineOnly:true,nonPromoOnly:true,localOnly:true,passiveHarOnly:true,operatorOwnedRuleCandidatesNeedIndependentSemanticReview:true,providerNetworkBindingCandidateNeedIndependentSemanticReview:true,ruleCandidateCannotSelfVerifyAdoption:true,eligibilityCandidateCannotSelfVerifyTenCentJackpotEligibility:true,noWagerProbe:true,noAutomaticBetting:true,realMoneyAllowed:false},
    };
    process.stdout.write(`${JSON.stringify(result,null,2)}\n`);
  }catch(error){
    process.stdout.write(`${JSON.stringify({version:VERSION,valid:false,reason:'LOCAL_ANALYSIS_FAILED',message:String(error?.message||error),execution:execution()},null,2)}\n`);
    process.exitCode=1;
  }
}

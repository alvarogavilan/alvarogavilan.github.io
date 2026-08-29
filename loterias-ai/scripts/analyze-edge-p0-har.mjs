#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {analyzeBetfairApMcCoyCurrentSessionHar} from './analyze-betfair-apmccoy-current-session.mjs';
import {analyzeBet365FrankCurrentSessionHarText} from './analyze-bet365-frank-current-session.mjs';
import {analyzeBotemaniaUltimateVpHarText} from './analyze-botemania-ultimate-vp-har.mjs';
import {analyzeEnRachaIgtHarText} from './analyze-enracha-igt-har.mjs';
import {analyzeBetfairKingdomsRiseHarText} from './analyze-betfair-kingdoms-rise-har.mjs';
import {analyzeCasino777AotgnHarText} from './analyze-casino777-aotgn-har.mjs';
import {extractBetfairRegalRichesHarCandidate} from '../edge-live/betfair-regal-riches-har-candidate-v1.mjs';
import {extractBetfairMagicOfTheNileHarCandidate} from '../edge-live/betfair-magic-of-the-nile-har-candidate-v1.mjs';
import {extractBetfairScarabHarCandidate} from '../edge-live/betfair-scarab-har-candidate-v1.mjs';
import {extractBetfairHexbreak3rHarCandidate} from '../edge-live/betfair-hexbreak3r-har-candidate-v1.mjs';
import {extractBetfairGoldenEgyptHarCandidate} from '../edge-live/betfair-golden-egypt-har-candidate-v1.mjs';

const VERSION='analyze-edge-p0-har-v1.6-eleven-lane-passive';
const LANES=Object.freeze({
  apmccoy:{label:'Betfair España — AP McCoy Sporting Legends',mode:'json-object'},
  'casino777-aotgn':{label:'Casino777 España — Age of the Gods Norse · King of Asgard',mode:'raw-text'},
  frank:{label:'bet365 España — Frank Bruno Sporting Legends',mode:'raw-text'},
  'ultimate-vp':{label:'Botemania — Ultimate Video Poker · Jotas o Mejor Progresivo',mode:'raw-text'},
  'kingdoms-rise':{label:'Betfair España — Kingdoms Rise · Power Strike boundary research',mode:'raw-text'},
  'betfair-regal-riches':{label:'Betfair España — Regal Riches',mode:'json-object'},
  'magic-nile':{label:'Betfair España — Magic of the Nile',mode:'json-object'},
  scarab:{label:'Betfair España — Scarab',mode:'json-object'},
  hexbreak3r:{label:'Betfair España — Hexbreak3r',mode:'json-object'},
  'golden-egypt':{label:'Betfair España Arcade — Golden Egypt',mode:'json-object'},
  'ocean-magic':{label:'EnRacha — Ocean Magic',mode:'raw-text'},
});
function execution(){return {decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0};}
function fail(reason,extra={}){return {version:VERSION,ok:false,reason,execution:execution(),...extra};}
function usage(){return `Usage: node loterias-ai/scripts/analyze-edge-p0-har.mjs <apmccoy|casino777-aotgn|frank|ultimate-vp|kingdoms-rise|betfair-regal-riches|magic-nile|scarab|hexbreak3r|golden-egypt|ocean-magic> <capture.har>\n`;}
function safeClosed(lane,result){
  const src=result?.closed&&typeof result.closed==='object'?result.closed:null;
  if(src)return src;
  const a=result?.analysis&&typeof result.analysis==='object'?result.analysis:result;
  if(!a||typeof a!=='object')return {};
  if(lane==='casino777-aotgn')return {exactTargetPageObserved:a.exactTargetPageObserved===true,eurGlobalAognjpRowsObserved:Number(a.eurGlobalRowCount||0)>0,dailyTimedRowObserved:Array.isArray(a.timedRows)&&a.timedRows.length>0,amountMhbRowObserved:Array.isArray(a.amountRows)&&a.amountRows.length>0,exactTickerSessionCandidate:a.exactTickerSessionCandidate===true,dailySemanticBindingCandidate:a.dailySemanticBindingCandidate===true,amountMhbFamilyBindingCandidate:a.amountMhbFamilyBindingCandidate===true,exactExtraVsInstantIdentityVerified:a.exactExtraVsInstantIdentityVerified===true,executionAuthorized:false};
  if(lane==='ultimate-vp')return {targetSessionObserved:a.targetPageObserved===true,servedRuleReviewCandidatesFound:a.servedRuleCandidatesAvailable===true,exactJackpotTriggerVerified:a.exactJackpotTriggerVerified===true,exactJackpotQualifyingStakeVerified:a.exactJackpotQualifyingStakeVerified===true};
  if(lane==='kingdoms-rise')return {exactTargetLauncherObserved:a.exactLauncherObserved===true,eurGlobalKrjpRowsObserved:Number(a.eurGlobalRowCount||0)>0,guaranteedAmountRowObserved:Array.isArray(a.guaranteedAmountRows)&&a.guaranteedAmountRows.length>0,guaranteedTimeRowObserved:Array.isArray(a.guaranteedTimeRows)&&a.guaranteedTimeRows.length>0,exactBetfairTickerBindingCandidate:a.exactBetfairTickerBindingCandidate===true,powerStrikeSemanticBindingCandidate:a.powerStrikeSemanticBindingCandidate===true,amountBoundaryCaptureCandidate:a.amountBoundaryCaptureCandidate===true,amountBoundaryPromotionAllowed:a.amountBoundaryPromotionAllowed===true};
  if(lane==='betfair-regal-riches')return {exactTargetLauncherObserved:a.targetLauncherObserved===true,providerIgtReviewCandidateObserved:Number(a.providerIgtCandidateCount||0)>0,providerConflictObserved:Number(a.providerConflictCandidateCount||0)>0,configurationReviewCandidateObserved:Number(a.configurationCandidateCount||0)>0,persistentStateReviewCandidateObserved:Number(a.stateCandidateCount||0)>0,exactSpainServedIgtProviderFingerprintVerified:a.exactSpainServedIgtProviderFingerprintVerified===true,preWagerMeterStateVerified:a.preWagerMeterStateVerified===true,crossPlayerPersistenceVerified:a.crossPlayerPersistenceVerified===true,stateSpecificEvVerified:a.stateSpecificEvVerified===true};
  if(lane==='magic-nile')return {exactTargetLauncherObserved:a.targetLauncherObserved===true,providerIgtReviewCandidateObserved:Number(a.providerIgtCandidateCount||0)>0,configurationReviewCandidateObserved:Number(a.configurationCandidateCount||0)>0,gemStateReviewCandidateObserved:Number(a.gemStateCandidateCount||0)>0,exactSpainServedProviderBuildVerified:a.exactSpainServedProviderBuildVerified===true,exactCurrentGemVectorVerified:a.currentGemVectorVerified===true,stateSpecificEvVerified:a.stateSpecificEvVerified===true};
  if(lane==='scarab')return {exactTargetLauncherObserved:a.targetLauncherObserved===true,providerIgtReviewCandidateObserved:Number(a.providerIgtCandidateCount||0)>0,configurationReviewCandidateObserved:Number(a.candidateCount||0)>0&&Number(a.cycleCandidateCount||0)>0,cycleStateReviewCandidateObserved:Number(a.accountStateCandidateCount||0)>0||Number(a.goldBorderCandidateCount||0)>0,exactSpainServedProviderBuildVerified:a.exactSpainServedProviderBuildVerified===true,currentCycleStateVerified:a.currentCycleStateVerified===true,currentStatePositiveEvVerified:a.currentStatePositiveEvVerified===true};
  if(lane==='hexbreak3r')return {exactTargetLauncherObserved:a.targetLauncherObserved===true,exactSpainGameIdPubliclyVerified:a.exactSpainGameIdPubliclyVerified===true,providerIgtReviewCandidateObserved:Number(a.providerIgtCandidateCount||0)>0,configurationReviewCandidateObserved:Number(a.configurationCandidateCount||0)>0,reelStateReviewCandidateObserved:Number(a.reelStateCandidateCount||0)>0,exactSpainServedProviderBuildVerified:a.exactSpainServedProviderBuildVerified===true,exactCurrentReelHeightsVerified:a.exactCurrentReelHeightsVerified===true,stateSpecificEvVerified:a.stateSpecificEvVerified===true};
  if(lane==='golden-egypt')return {exactTargetLauncherObserved:a.targetLauncherObserved===true,providerIgtReviewCandidateObserved:Number(a.providerIgtCandidateCount||0)>0,providerMgaReviewCandidateObserved:Number(a.providerMgaCandidateCount||0)>0,igtWildStaysMechanicReviewCandidateObserved:Number(a.igtWildStaysMechanicCandidateCount||0)>0,persistentStateReviewCandidateObserved:Number(a.persistentStateCandidateCount||0)>0,exactSpainProviderVerified:a.exactSpainProviderVerified===true,exactSpainIgtWildStays2PlaysVerified:a.exactSpainIgtWildStays2PlaysVerified===true,stateSpecificEvVerified:a.stateSpecificEvVerified===true};
  if(lane==='ocean-magic')return {exactTargetSessionObserved:a.valid===true&&a.targetPageObserved===true,exactIgtProviderFingerprintVerified:a.exactEnRachaIgtWrapperFingerprintVerified===true||a.exactIgtProviderFingerprintVerified===true,configurationCandidateObserved:Number(a.configurationCandidateCount||0)>0,persistentStateCandidateObserved:Number(a.stateCandidateCount||0)>0||a.persistentStateCandidateObserved===true,providerConflictObserved:Number(a.providerConflictCandidateCount||0)>0,crossPlayerPersistenceVerified:false};
  return {};
}
export function analyzeEdgeP0HarText(raw,{lane,sourceName='capture.har'}={}){
  if(!LANES[lane])return fail('SUPPORTED_LANE_REQUIRED',{lane,supportedLanes:Object.keys(LANES)});
  if(typeof raw!=='string'||!raw.trim())return fail('HAR_TEXT_REQUIRED',{lane,sourceName});
  let result;
  try{
    if(lane==='apmccoy')result=analyzeBetfairApMcCoyCurrentSessionHar(JSON.parse(raw),{sourceName});
    else if(lane==='casino777-aotgn')result=analyzeCasino777AotgnHarText(raw,{sourceName});
    else if(lane==='frank')result=analyzeBet365FrankCurrentSessionHarText(raw,{sourceName});
    else if(lane==='ultimate-vp')result=analyzeBotemaniaUltimateVpHarText(raw,{sourceName});
    else if(lane==='kingdoms-rise')result=analyzeBetfairKingdomsRiseHarText(raw,{expectedGameId:'kingdom-rise-sands-of-fury-cptn'});
    else if(lane==='betfair-regal-riches')result=extractBetfairRegalRichesHarCandidate(JSON.parse(raw),{sourceName});
    else if(lane==='magic-nile')result=extractBetfairMagicOfTheNileHarCandidate(JSON.parse(raw),{sourceName});
    else if(lane==='scarab')result=extractBetfairScarabHarCandidate(JSON.parse(raw),{sourceName});
    else if(lane==='hexbreak3r')result=extractBetfairHexbreak3rHarCandidate(JSON.parse(raw),{sourceName});
    else if(lane==='golden-egypt')result=extractBetfairGoldenEgyptHarCandidate(JSON.parse(raw),{sourceName});
    else result=analyzeEnRachaIgtHarText(raw,{gameId:'ocean-magic',sourceName});
  }catch(error){return fail('LANE_ANALYSIS_FAILED',{lane,sourceName,message:String(error?.message||error)});}
  return {version:VERSION,ok:true,lane,laneLabel:LANES[lane].label,sourceName,analysisVersion:result?.version||result?.analysis?.version||null,closed:safeClosed(lane,result),result,execution:execution(),scientificUse:'Unified local dispatcher for eleven passive research lanes. It does not fetch network data, place wagers, approve review candidates or authorize execution. Each lane has a distinct fail-closed summary shape.',hardGuards:{onlineOnly:true,nonPromoOnly:true,offlineOnly:true,passiveHarOnly:true,noNetwork:true,noWagerProbe:true,noAutomaticBetting:true,rawHarNeverEmitted:true,rawResponseBodiesNeverEmitted:true,reviewCandidatesCannotSelfApprove:true,laneSpecificSummaryRequired:true,crossLaneGateTransferForbidden:true,enrachaRegalRichesTitleCollisionCannotEnterBetfairRegalLane:true,goldenEgyptTitleCannotSelfProveIgt:true,kingdomsRiseTierCodesCannotSelfBind:true,kingdomsRiseGuaranteedAmountCannotSelfAuthorize:true,casino777AotgnCrossOperatorImsCannotSelfBind:true,casino777AotgnAmountBoundaryCannotDistinguishExtraInstant:true,casino777AotgnDailyGhtCannotSelfAuthorize:true,realMoneyAllowed:false}};
}
export function main(argv=process.argv.slice(2)){
  const lane=argv[0],file=argv[1];
  if(!lane||!file||lane==='--help'||lane==='-h'){process.stdout.write(usage());return lane?0:2;}
  try{const out=analyzeEdgeP0HarText(fs.readFileSync(file,'utf8'),{lane,sourceName:path.basename(file)});process.stdout.write(`${JSON.stringify(out,null,2)}\n`);return out.ok?0:1;}catch(error){process.stdout.write(`${JSON.stringify(fail('HAR_READ_FAILED',{lane,file:path.basename(file),message:String(error?.message||error)}),null,2)}\n`);return 1;}
}
if(import.meta.url===`file://${process.argv[1]}`)process.exitCode=main();

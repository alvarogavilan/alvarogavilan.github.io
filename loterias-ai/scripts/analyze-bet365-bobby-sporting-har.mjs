#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {analyzeBet365BobbySportingHar} from '../edge-backend/src/bet365-bobby-sporting-har-discovery-v1.mjs';
import {recoverBet365BobbyLegacySljp1Candidate} from '../edge-backend/src/bet365-bobby-legacy-ticker-candidate-v1.mjs';

function usage(){return 'Usage: node loterias-ai/scripts/analyze-bet365-bobby-sporting-har.mjs <capture.har>';}
function fail(reason,extra={}){return {version:'bet365-bobby-safe-har-cli-v1.2-legacy-daily-vector',ok:false,reason,...extra,execution:{decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0}};}
function safeLegacy(v){
  if(v?.valid!==true)return {valid:false,reason:v?.reason||'LEGACY_SLJP1_VECTOR_NOT_RECOVERED',exactLegacySljp1ProtocolFieldsRecovered:false,bet365LicenseeBindingVerified:false,usableForOverduePair:false};
  return {
    valid:true,reason:v.reason||null,captureEpochSeconds:v.captureEpochSeconds??null,tickerEntryIndex:v.tickerEntryIndex??null,tickerEndpoint:v.tickerEndpoint||null,
    expectedRequestCasino:v.expectedRequestCasino||null,expectedInstanceCode:v.expectedInstanceCode||null,snapshot:v.snapshot||null,feedAgeSeconds:v.feedAgeSeconds??null,maxFeedAgeSeconds:v.maxFeedAgeSeconds??null,
    exactBobbyProviderGameMarkerVerified:v.exactBobbyProviderGameMarkerVerified===true,exactLegacySljp1ProtocolFieldsRecovered:v.exactLegacySljp1ProtocolFieldsRecovered===true,
    currentDailyAmountCandidateRecovered:v.currentDailyAmountCandidateRecovered===true,currentGuaranteedHitTimeCandidateRecovered:v.currentGuaranteedHitTimeCandidateRecovered===true,currentWinCountCandidateRecovered:v.currentWinCountCandidateRecovered===true,currentGameTimestampCandidateRecovered:v.currentGameTimestampCandidateRecovered===true,currentRequestExecIntervalCandidateRecovered:v.currentRequestExecIntervalCandidateRecovered===true,
    bet365LicenseeBindingVerified:false,exactBet365LauncherSemanticsVerified:false,exactBet365TickerEndpointOwnershipVerified:false,currentSljp1ExecutionStateVerified:false,usableForOverduePair:false,
  };
}

export function analyzeSafeBet365BobbyHarText(raw,{sourceName='capture.har'}={}){
  let har;
  try{har=JSON.parse(raw);}catch(error){return fail('HAR_PARSE_FAILED',{error:String(error?.message||error)});}
  let analysis;
  try{analysis=analyzeBet365BobbySportingHar(har,{sourceName});}catch(error){return fail('HAR_ANALYSIS_FAILED',{error:String(error?.message||error)});}
  let legacy;
  try{legacy=recoverBet365BobbyLegacySljp1Candidate(har,{sourceName});}catch(error){legacy={valid:false,reason:'LEGACY_RECOVERY_FAILED',error:String(error?.message||error)};}
  return {
    version:'bet365-bobby-safe-har-cli-v1.2-legacy-daily-vector',ok:analysis?.valid===true,sourceName,
    target:analysis?.target||null,
    exactTargetMarkerObserved:analysis?.exactTargetMarkerObserved===true,
    exactTargetDailyTickerCandidateObserved:analysis?.exactTargetDailyTickerCandidateObserved===true,
    targetMarkerEntryIndexes:analysis?.targetMarkerEntryIndexes||[],
    dailyTickerCandidateCount:analysis?.dailyTickerCandidateCount??0,
    exactTargetDailyTickerCandidateCount:analysis?.exactTargetDailyTickerCandidateCount??0,
    candidates:analysis?.candidates||[],
    stakeMenuCandidateObserved:analysis?.stakeMenuCandidateObserved===true,
    stakeMenuCandidateCount:analysis?.stakeMenuCandidateCount??0,
    observedStakeKeys:analysis?.observedStakeKeys||[],
    stakeMenuCandidates:analysis?.stakeMenuCandidates||[],
    servedStakeMenuSemanticsVerified:false,
    servedTenCentTotalStakeVerified:false,
    tenCentJackpotEligibilityVerified:false,
    legacySljp1Candidate:safeLegacy(legacy),
    servedBet365SessionBindingVerified:false,
    exactBet365LauncherSemanticsVerified:false,
    exactBet365JackpotsCasinoImsVerified:false,
    exactBet365TickerEndpointOwnershipVerified:false,
    exactModernResponseSemanticsVerified:false,
    usableForOverduePair:false,
    scientificReason:analysis?.scientificUse||analysis?.reason||null,
    nextRequiredEvidence:analysis?.nextRequiredEvidence||[],
    execution:{decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0},
    hardGuards:{offlineOnly:true,noNetwork:true,rawHarNeverEmitted:true,rawXmlNeverEmitted:true,requestHeadersNeverEmitted:true,credentialsAndCookiesNeverEmitted:true,endpointQueriesAndFragmentsNeverEmitted:true,stakeCandidatesAreStructuralOnly:true,numericStakeCandidateCannotBecomeServedTotalStake:true,tenCentCandidateCannotProveJackpotEligibility:true,legacyDailyVectorCannotProveBet365EndpointOwnership:true,legacyDailyVectorCannotAuthorizeGreen:true,analysisCannotAuthorizeGreen:true,noWagerProbe:true,noAutomaticBetting:true},
  };
}

export function main(argv=process.argv.slice(2)){
  const file=argv[0];
  if(!file||file==='--help'||file==='-h'){
    process.stdout.write(`${usage()}\n`);return file?0:2;
  }
  if(argv.length!==1){process.stdout.write(`${JSON.stringify(fail('EXACTLY_ONE_HAR_FILE_REQUIRED',{usage:usage()}),null,2)}\n`);return 2;}
  try{
    const raw=fs.readFileSync(file,'utf8');
    const result=analyzeSafeBet365BobbyHarText(raw,{sourceName:path.basename(file)});
    process.stdout.write(`${JSON.stringify(result,null,2)}\n`);
    return result.ok?0:1;
  }catch(error){
    process.stdout.write(`${JSON.stringify(fail('HAR_READ_FAILED',{error:String(error?.message||error)}),null,2)}\n`);return 1;
  }
}

if(import.meta.url===`file://${process.argv[1]}`)process.exitCode=main();

#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {evaluateBet365BobbyLegacyOverduePairCandidate} from '../edge-backend/src/bet365-bobby-legacy-overdue-pair-candidate-v1.mjs';

function usage(){return 'Usage: node loterias-ai/scripts/analyze-bet365-bobby-sporting-har-pair.mjs <before.har> <after.har>';}
function fail(reason,extra={}){return {version:'bet365-bobby-safe-har-pair-cli-v1',ok:false,reason,...extra,execution:{decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0}};}
function safeSide(v){return v?.valid===true?{valid:true,sourceName:v.sourceName||null,captureEpochSeconds:v.captureEpochSeconds??null,tickerEndpoint:v.tickerEndpoint||null,expectedRequestCasino:v.expectedRequestCasino||null,expectedInstanceCode:v.expectedInstanceCode||null,snapshot:v.snapshot||null,feedAgeSeconds:v.feedAgeSeconds??null,maxFeedAgeSeconds:v.maxFeedAgeSeconds??null}:{valid:false,reason:v?.reason||null};}

export function analyzeSafeBet365BobbyHarPairText(beforeRaw,afterRaw,{beforeSourceName='before.har',afterSourceName='after.har'}={}){
  let beforeHar,afterHar;
  try{beforeHar=JSON.parse(beforeRaw);}catch(error){return fail('BEFORE_HAR_PARSE_FAILED',{error:String(error?.message||error)});}
  try{afterHar=JSON.parse(afterRaw);}catch(error){return fail('AFTER_HAR_PARSE_FAILED',{error:String(error?.message||error)});}
  let pair;
  try{pair=evaluateBet365BobbyLegacyOverduePairCandidate({beforeHar,afterHar,beforeSourceName,afterSourceName});}catch(error){return fail('PAIR_ANALYSIS_FAILED',{error:String(error?.message||error)});}
  return {
    version:'bet365-bobby-safe-har-pair-cli-v1',ok:true,
    pairValid:pair?.valid===true,pairReason:pair?.reason||null,
    before:safeSide(pair?.before),after:safeSide(pair?.after),
    deadlineEpochSeconds:pair?.deadlineEpochSeconds??null,
    beforeLeadSeconds:pair?.beforeLeadSeconds??null,afterLagSeconds:pair?.afterLagSeconds??null,
    maxBoundaryDistanceSeconds:pair?.maxBoundaryDistanceSeconds??null,requestExecIntervalSeconds:pair?.requestExecIntervalSeconds??null,
    sameTickerEndpoint:pair?.sameTickerEndpoint===true,sameRequestCasino:pair?.sameRequestCasino===true,sameInstanceCode:pair?.sameInstanceCode===true,sameGuaranteedHitTime:pair?.sameGuaranteedHitTime===true,
    winCountUnchanged:pair?.winCountUnchanged===true,jackpotNondecreasing:pair?.jackpotNondecreasing===true,
    providerFirstBetFollowingDayRuleDocumented:pair?.providerFirstBetFollowingDayRuleDocumented===true,
    providerAnyBetAnySizeJackpotEligibilityDocumented:pair?.providerAnyBetAnySizeJackpotEligibilityDocumented===true,
    candidateFollowingDayUnawardedStateObserved:pair?.candidateFollowingDayUnawardedStateObserved===true,
    bet365LicenseeBindingVerified:false,exactBet365LauncherSemanticsVerified:false,exactBet365TickerEndpointOwnershipVerified:false,operatorRuleAdoptionVerified:false,
    servedTenCentTotalStakeVerified:false,tenCentJackpotEligibilityVerified:false,usableForExecution:false,
    scientificReason:pair?.scientificUse||pair?.reason||null,
    execution:{decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0},
    hardGuards:{offlineOnly:true,noNetwork:true,rawHarNeverEmitted:true,rawXmlNeverEmitted:true,requestHeadersNeverEmitted:true,credentialsAndCookiesNeverEmitted:true,endpointQueriesAndFragmentsNeverEmitted:true,candidateCrossGhtStateCannotAuthorizeGreen:true,bet365LicenseeBindingStillRequired:true,servedTenCentEligibilityStillRequired:true,noWagerProbe:true,noAutomaticBetting:true},
  };
}

export function main(argv=process.argv.slice(2)){
  if(argv.includes('--help')||argv.includes('-h')){process.stdout.write(`${usage()}\n`);return 0;}
  if(argv.length!==2){process.stdout.write(`${JSON.stringify(fail('EXACTLY_TWO_HAR_FILES_REQUIRED',{usage:usage()}),null,2)}\n`);return 2;}
  const [beforeFile,afterFile]=argv;
  try{
    const result=analyzeSafeBet365BobbyHarPairText(fs.readFileSync(beforeFile,'utf8'),fs.readFileSync(afterFile,'utf8'),{beforeSourceName:path.basename(beforeFile),afterSourceName:path.basename(afterFile)});
    process.stdout.write(`${JSON.stringify(result,null,2)}\n`);return result.ok?0:1;
  }catch(error){process.stdout.write(`${JSON.stringify(fail('HAR_READ_FAILED',{error:String(error?.message||error)}),null,2)}\n`);return 1;}
}

if(import.meta.url===`file://${process.argv[1]}`)process.exitCode=main();

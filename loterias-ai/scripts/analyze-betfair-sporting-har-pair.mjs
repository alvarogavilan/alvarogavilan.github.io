#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {evaluateBetfairSportingHarOverduePair} from '../casino/jackpots/betfair-sporting-har-overdue-bridge-v1.mjs';

function usage(){
  return 'Usage: node loterias-ai/scripts/analyze-betfair-sporting-har-pair.mjs <before.har> <after.har> --decision-now-epoch <seconds> [--stake-eur <amount>]';
}
function finite(v){
  if(v===null||v===undefined||v===''||typeof v==='boolean')return null;
  const n=Number(v);return Number.isFinite(n)?n:null;
}
function safeEndpoint(v){
  try{const u=new URL(String(v||''));return u.protocol==='https:'?`${u.origin}${u.pathname}`:null;}catch{return null;}
}
function fail(reason,extra={}){
  return {
    version:'betfair-sporting-safe-har-pair-cli-v1.1-endpoint-redaction',
    ok:false,
    reason,
    execution:{decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0},
    ...extra,
  };
}
function safeSnapshot(side){
  const s=side?.snapshot||{};
  return {
    valid:side?.valid===true,
    captureStartedDateTime:side?.captureStartedDateTime||null,
    captureEpochSeconds:side?.captureEpochSeconds??null,
    freshnessClockSource:side?.freshnessClockSource||null,
    expectedBetfairImsCasino:side?.expectedBetfairImsCasino||null,
    tickerEndpoint:safeEndpoint(side?.tickerEndpoint),
    configSourceUrl:safeEndpoint(side?.configSourceUrl),
    snapshot:side?.valid===true?{
      code:s.code||null,
      currency:s.currency||null,
      local:s.local??null,
      providerScope:s.providerScope||null,
      amount:s.amount??null,
      guaranteedHitTime:s.guaranteedHitTime??null,
      gameTimestamp:s.gameTimestamp??null,
      winCount:s.winCount??null,
      requestExecInterval:s.requestExecInterval??null,
      requestCasino:s.requestCasino||null,
      instanceCode:s.instanceCode||null,
    }:null,
  };
}
function safeEvaluation(r,stakeEUR){
  const f=r?.finalEvaluation||{};
  const pairVerified=r?.before?.valid===true&&r?.after?.valid===true;
  return {
    pairVerified,
    bridgeValid:r?.valid===true,
    bridgeReason:r?.reason||null,
    before:safeSnapshot(r?.before),
    after:safeSnapshot(r?.after),
    overdue:{
      followingDayUnawardedVerified:f.followingDayUnawardedVerified===true,
      nextEligibleNetworkBetGuaranteedJackpot:f.nextEligibleNetworkBetGuaranteedJackpot===true,
      exactBetfairSpainTickerImsBindingVerified:f.exactBetfairSpainTickerImsBindingVerified===true,
      deadlineEpochSeconds:f.deadlineEpochSeconds??null,
      beforeLeadSeconds:f.beforeLeadSeconds??null,
      afterLagSeconds:f.afterLagSeconds??null,
      zeroEligibleArrivalWindowSeconds:f.zeroEligibleArrivalWindowSeconds??null,
      feedAgeSeconds:f.feedAgeSeconds??null,
      maxFeedAgeSeconds:f.maxFeedAgeSeconds??null,
      winCount:f.winCount??null,
      currentDailyJackpotEUR:f.currentDailyJackpotEUR??null,
    },
    raceGate:{
      stakeEUR:stakeEUR??null,
      conservativeBaseRtpPct:f.conservativeBaseRtpPct??null,
      breakEvenFirstBetProbability:f.breakEvenFirstBetProbability??null,
      structuredProspectiveRaceEvidenceVerified:f.executionGates?.structuredProspectiveRaceEvidenceVerified===true,
      raceExecutionAssumptionsVerified:f.executionGates?.raceExecutionAssumptionsVerified===true,
      raceConfidenceVerified:f.executionGates?.raceConfidenceVerified===true,
      raceLedgerIdentityVerified:f.executionGates?.raceLedgerIdentityVerified===true,
      raceWindowBudgetVerified:f.executionGates?.raceWindowBudgetVerified===true,
      measuredActionLatencyVerified:f.executionGates?.measuredActionLatencyVerified===true,
      prospectiveDryRunCycleVerified:f.executionGates?.prospectiveDryRunCycleVerified===true,
      conditionalPositiveEvScreenPassed:f.conditionalPositiveEvScreenPassed===true,
      executionGateClosed:f.executionGateClosed===true,
    },
    underlyingScientificReason:f.reason||r?.reason||null,
  };
}

export function analyzeSafeHarPairText(beforeRaw,afterRaw,{
  beforeSourceName='before.har',
  afterSourceName='after.har',
  decisionNowEpochSeconds,
  stakeEUR=null,
}={}){
  let beforeHar,afterHar;
  try{beforeHar=JSON.parse(beforeRaw);}catch(error){return fail('BEFORE_HAR_PARSE_FAILED',{error:String(error?.message||error)});}
  try{afterHar=JSON.parse(afterRaw);}catch(error){return fail('AFTER_HAR_PARSE_FAILED',{error:String(error?.message||error)});}
  const decisionNow=finite(decisionNowEpochSeconds);
  if(decisionNow===null)return fail('EXPLICIT_DECISION_TIME_REQUIRED');
  const stake=finite(stakeEUR);
  if(stakeEUR!==null&&stake===null)return fail('INVALID_STAKE_EUR');

  let result;
  try{
    result=evaluateBetfairSportingHarOverduePair({
      beforeHar,afterHar,
      beforeSourceName,afterSourceName,
      decisionNowEpochSeconds:decisionNow,
      betfairFirstBetFollowingDayRuleVerified:true,
      providerGuaranteedHitTimeDefinesFollowingDayBoundaryVerified:true,
      stakeEUR:stake,
      currentDailyAmountExactVerified:true,
      stakeAtDecisionExactVerified:false,
      measuredActionLatencyVerified:false,
      prospectiveDryRunCycleVerified:false,
    });
  }catch(error){return fail('PAIR_ANALYSIS_FAILED',{error:String(error?.message||error)});}

  return {
    version:'betfair-sporting-safe-har-pair-cli-v1.1-endpoint-redaction',
    ok:true,
    beforeSourceName,
    afterSourceName,
    decisionNowEpochSeconds:decisionNow,
    analysis:safeEvaluation(result,stake),
    nextRequiredEvidence:[
      'structured prospective passive-cycle race evidence',
      'verified race-window budget at decision time',
      'measured action latency',
      'prospective dry-run cycle validation',
      'exact stake-at-decision attestation',
    ],
    execution:{decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0},
    hardGuards:{
      offlineOnly:true,
      noNetwork:true,
      rawHarNeverEmitted:true,
      authorizationAndCookieValuesNeverEmitted:true,
      endpointQueriesAndFragmentsNeverEmitted:true,
      pairAnalyzerIsDiagnosticOnly:true,
      harPairCannotAuthorizeGreen:true,
      noWagerProbe:true,
      noAutomaticBetting:true,
    },
  };
}

export function main(argv=process.argv.slice(2)){
  const beforeFile=argv[0],afterFile=argv[1];
  if(!beforeFile||!afterFile||beforeFile==='--help'||beforeFile==='-h'){
    process.stdout.write(`${usage()}\n`);return beforeFile?0:2;
  }
  const decisionIndex=argv.indexOf('--decision-now-epoch');
  const decisionNowEpochSeconds=decisionIndex>=0?finite(argv[decisionIndex+1]):null;
  if(decisionNowEpochSeconds===null){
    process.stdout.write(`${JSON.stringify(fail('EXPLICIT_DECISION_TIME_REQUIRED',{usage:usage()}),null,2)}\n`);return 2;
  }
  const stakeIndex=argv.indexOf('--stake-eur');
  const stakeEUR=stakeIndex>=0?finite(argv[stakeIndex+1]):null;
  if(stakeIndex>=0&&stakeEUR===null){
    process.stdout.write(`${JSON.stringify(fail('INVALID_STAKE_EUR'),null,2)}\n`);return 2;
  }
  try{
    const beforeRaw=fs.readFileSync(beforeFile,'utf8');
    const afterRaw=fs.readFileSync(afterFile,'utf8');
    const result=analyzeSafeHarPairText(beforeRaw,afterRaw,{
      beforeSourceName:path.basename(beforeFile),
      afterSourceName:path.basename(afterFile),
      decisionNowEpochSeconds,
      stakeEUR,
    });
    process.stdout.write(`${JSON.stringify(result,null,2)}\n`);
    return result.ok?0:1;
  }catch(error){
    process.stdout.write(`${JSON.stringify(fail('HAR_READ_FAILED',{error:String(error?.message||error)}),null,2)}\n`);return 1;
  }
}

if(import.meta.url===`file://${process.argv[1]}`)process.exitCode=main();

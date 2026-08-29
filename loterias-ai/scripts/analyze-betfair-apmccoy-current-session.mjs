#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {validateBetfairSportingHarSnapshot} from '../casino/jackpots/betfair-sporting-har-overdue-bridge-v1.mjs';
import {validateBetfairApMcCoyWeeklyHarSnapshot} from '../casino/jackpots/betfair-apmccoy-weekly-har-snapshot-v1.mjs';
import {getBetfairApMcCoyCurrentOperatorSemantics} from '../casino/jackpots/betfair-apmccoy-current-operator-semantics-v1.mjs';
import {discoverBetfairSportingStakeMenuCandidates} from '../edge-backend/src/betfair-sporting-stake-menu-har-discovery-v1.mjs';

const VERSION='analyze-betfair-apmccoy-current-session-v1.1-daily-weekly-research';
const GAME_ID='ap-mccoy-sporting-legends-cptn';
const FREEZE_COMMIT_SHA='8eb28f5d7a3c708104f3e2356b6cc86764dba68c';
const FREEZE_COMMIT_UTC='2026-08-27T06:11:34Z';
const FREEZE_EPOCH_SECONDS=Date.parse(FREEZE_COMMIT_UTC)/1000;
const args=process.argv.slice(2);
function execution(){return {decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0};}
function safeEndpoint(v){try{const u=new URL(String(v||''));return `${u.origin}${u.pathname}`;}catch{return null;}}
function safeStakeDiscovery(v){return {valid:v?.valid===true,reason:v?.reason||null,strongTotalStakeMenuCandidateObserved:v?.strongTotalStakeMenuCandidateObserved===true,strongTotalStakeMenuCandidateCount:v?.strongTotalStakeMenuCandidateCount??0,servedStakeMenuSemanticsVerified:false,stakeAtDecisionExactVerified:false,candidates:Array.isArray(v?.strongTotalStakeMenuCandidates)?v.strongTotalStakeMenuCandidates.map(x=>({endpoint:safeEndpoint(x.endpoint),normalizedKey:x.normalizedKey||null,objectPath:x.objectPath||null,numericValues:Array.isArray(x.numericValues)?x.numericValues:[]})):[]};}
function safeSnapshot(v){const s=v?.snapshot||{};return {valid:v?.valid===true,reason:v?.reason||null,captureStartedDateTime:v?.captureStartedDateTime||null,captureEpochSeconds:v?.captureEpochSeconds??null,expectedBetfairImsCasino:v?.expectedBetfairImsCasino||null,tickerEndpoint:safeEndpoint(v?.tickerEndpoint),configSourceUrl:safeEndpoint(v?.configSourceUrl),code:s.code||null,tier:s.tier||null,currency:s.currency||null,local:s.local??null,providerScope:s.providerScope||null,instanceCode:s.instanceCode||null,amount:s.amount??null,guaranteedHitTime:s.guaranteedHitTime??null,gameTimestamp:s.gameTimestamp??null,winCount:s.winCount??null,requestExecInterval:s.requestExecInterval??null};}
export function analyzeBetfairApMcCoyCurrentSessionHar(har,{sourceName='apmccoy-current.har'}={}){
  const semantics=getBetfairApMcCoyCurrentOperatorSemantics();
  const snapshot=validateBetfairSportingHarSnapshot(har,{sourceName});
  const weeklySnapshot=validateBetfairApMcCoyWeeklyHarSnapshot(har,{sourceName});
  const stakeDiscovery=discoverBetfairSportingStakeMenuCandidates(har,{gameId:GAME_ID,sourceName});
  const captureEpochSeconds=Number(snapshot?.captureEpochSeconds);
  const postFreeze=Number.isFinite(captureEpochSeconds)&&captureEpochSeconds>FREEZE_EPOCH_SECONDS;
  const safe=safeSnapshot(snapshot),weekly=safeSnapshot(weeklySnapshot),stake=safeStakeDiscovery(stakeDiscovery);
  return {
    version:VERSION,valid:true,mode:'LOCAL_OFFLINE_PASSIVE_SINGLE_AP_MCCOY_SESSION_DAILY_WEEKLY_DIAGNOSTIC_NO_PLAY',sourceName,
    target:{operator:'Betfair Spain',market:'ES',title:'AP McCoy Sporting Legends™',gameId:GAME_ID,exactCurrentOperatorUrl:'https://casino.betfair.es/juego/ap-mccoy-sporting-legends-cptn'},
    semantics:{valid:semantics?.valid===true,operatorFirstBetFollowingDayRuleVerified:semantics?.betfairFirstBetFollowingDayRuleVerified===true,operatorAnyBetAnySizeEligibilityVerified:semantics?.betfairAnyBetAnySizeEligibilityVerified===true,operatorFundedJackpotRtpSeparationVerified:semantics?.betfairOperatorFundedJackpotRtpSeparationVerified===true,providerGuaranteedHitTimeBoundarySemanticsVerified:semantics?.providerGuaranteedHitTimeDefinesFollowingDayBoundaryVerified===true,conservativeMainGameRtpPct:semantics?.conservativeMainGameRtpPct??null},
    servedSnapshot:safe,
    servedWeeklySnapshot:weekly,
    stakeDiscovery:stake,
    prospectiveFreeze:{commitSha:FREEZE_COMMIT_SHA,commitUtc:FREEZE_COMMIT_UTC,captureStrictlyPostFreeze:postFreeze,dailyOnly:true,weeklyDoesNotInheritDailyFreeze:true},
    closed:{
      exactApMcCoyRealLauncherAndLatestConfigTickerBinding:snapshot?.valid===true,
      exactPrivateBetfairImsObserved:snapshot?.valid===true&&!!snapshot?.expectedBetfairImsCasino,
      freshGlobalEurDailySljp1State:snapshot?.valid===true&&safe.code==='sljp-1'&&String(safe.currency||'').toUpperCase()==='EUR'&&safe.local===0,
      exactCurrentDailyAmountFromServer:snapshot?.valid===true&&Number.isFinite(Number(safe.amount))&&Number(safe.amount)>0,
      exactCurrentDailyGuaranteedHitTimeFromServer:snapshot?.valid===true&&Number.isFinite(Number(safe.guaranteedHitTime)),
      freshGlobalEurWeeklySljp2ResearchState:weeklySnapshot?.valid===true&&weekly.code==='sljp-2'&&String(weekly.currency||'').toUpperCase()==='EUR'&&weekly.local===0,
      exactCurrentWeeklyAmountFromServerResearchOnly:weeklySnapshot?.valid===true&&Number.isFinite(Number(weekly.amount))&&Number(weekly.amount)>0,
      exactCurrentWeeklyGuaranteedHitTimeFromServerResearchOnly:weeklySnapshot?.valid===true&&Number.isFinite(Number(weekly.guaranteedHitTime)),
      strongServedTotalStakeMenuReviewCandidate:stake.strongTotalStakeMenuCandidateObserved,
      captureEligibleForProspectivePostGhtLedger:postFreeze&&snapshot?.valid===true,
    },
    stillMandatory:{servedTotalStakeIndependentReviewApproved:false,realSameBindingCrossGhtUnawardedPair:false,completeProspectivePostGhtSurvivalCycle:false,survivalCycleIndependentReviewApproved:false,manualActionLatencyIndependentReviewApproved:false,raceAssumptionsIndependentReviewApproved:false,reviewedRaceLowerBoundAvailable:false,reviewedPositiveEvScreenPassed:false,freshFinalRevalidationPassed:false,executionAuthorized:false,weeklyIndependentProspectiveProtocolApproved:false,weeklyCrossGhtSurvivalVerified:false},
    scientificUse:'Single-file diagnostic for a real passive AP McCoy Betfair Spain HAR. It exposes only redacted server-derived structure. The Daily chain remains the frozen execution-research lane. The same HAR is now also inspected independently for exact GLOBAL EUR Weekly sljp-2 amount/GHT/win-count under the same launcher/latest-config/ticker binding and freshness rules, but Weekly is research-only and cannot inherit Daily race or prospective evidence. Stake-menu candidates remain review-only.',
    execution:execution(),
    hardGuards:{onlineOnly:true,nonPromoOnly:true,offlineOnly:true,passiveHarOnly:true,noNetwork:true,rawHarNeverEmitted:true,credentialsNeverEmitted:true,endpointQueriesNeverEmitted:true,stakeCandidateCannotSelfApprove:true,singleSnapshotCannotProveCrossGht:true,singleSnapshotCannotProveRaceProbability:true,weeklySnapshotCannotAuthorizeExecution:true,dailyProspectiveEvidenceCannotTransferToWeekly:true,noWagerProbe:true,noAutomaticBetting:true,realMoneyAllowed:false}
  };
}
function usage(){process.stderr.write('Usage: node loterias-ai/scripts/analyze-betfair-apmccoy-current-session.mjs <apmccoy-current.har>\n');process.exitCode=2;}
if(args.length!==1)usage();
else{
  try{const file=args[0],sourceName=path.basename(file),har=JSON.parse(fs.readFileSync(file,'utf8'));process.stdout.write(`${JSON.stringify(analyzeBetfairApMcCoyCurrentSessionHar(har,{sourceName}),null,2)}\n`);}catch(error){process.stdout.write(`${JSON.stringify({version:VERSION,valid:false,reason:'LOCAL_ANALYSIS_FAILED',message:String(error?.message||error),execution:execution()},null,2)}\n`);process.exitCode=1;}
}

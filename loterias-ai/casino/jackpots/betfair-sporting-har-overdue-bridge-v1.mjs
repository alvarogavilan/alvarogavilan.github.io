import {analyzeBetfairSportingHar} from '../../edge-backend/src/betfair-sporting-har-discovery-v1.mjs';
import {reviewBetfairApMcCoyServedStake} from '../../edge-backend/src/betfair-apmccoy-served-stake-review-v1.mjs';
import {reviewBetfairApMcCoyActionLatency} from './betfair-apmccoy-action-latency-review-v1.mjs';
import {validateBetfairSportingServerSnapshot} from './betfair-sporting-server-binding-validator-v1.mjs';
import {getBetfairApMcCoyCurrentOperatorSemantics} from './betfair-apmccoy-current-operator-semantics-v1.mjs';
import {evaluateSportingLegendsOverdueFirstBet} from './sporting-legends-overdue-first-bet-v1.mjs';

const EXACT_GAME_ID='ap-mccoy-sporting-legends-cptn';
const VERSION='betfair-sporting-har-overdue-bridge-v1.10-code-owned-latency-dryrun';
const finite=v=>{if(v===null||v===undefined||v===''||typeof v==='boolean')return null;const n=Number(v);return Number.isFinite(n)?n:null;};
const text=v=>typeof v==='string'&&v.trim()?v.trim():null;
function sameHttpsEndpoint(a,b){try{const x=new URL(a),y=new URL(b);return x.protocol==='https:'&&y.protocol==='https:'&&x.origin===y.origin&&x.pathname===y.pathname;}catch{return false;}}
function isoEpochSeconds(v){const s=text(v);if(!s)return null;const ms=Date.parse(s);return Number.isFinite(ms)?ms/1000:null;}
function betfairInitialResourcesUrl(url){try{const u=new URL(String(url||'')),h=u.hostname.toLowerCase();return u.protocol==='https:'&&(h==='betfair.es'||h.endsWith('.betfair.es'))&&/\/initialresources(?:\/|$)/i.test(u.pathname);}catch{return false;}}
function latestPrecedingRealCasinoLauncher(discovery,tickerEntryIndex){if(!Number.isInteger(tickerEntryIndex))return null;const all=discovery?.discovery?.betfairRealCasinoLauncherBindings||[];return all.filter(x=>Number.isInteger(x?.index)&&x.index<tickerEntryIndex).sort((a,b)=>b.index-a.index)[0]||null;}
function latestPostLaunchInitialResources(discovery,launcherEntryIndex,tickerEntryIndex){if(!Number.isInteger(launcherEntryIndex)||!Number.isInteger(tickerEntryIndex))return null;const relevant=discovery?.discovery?.relevantEntries||[];return relevant.filter(r=>Number.isInteger(r?.index)&&r.index>launcherEntryIndex&&r.index<tickerEntryIndex&&betfairInitialResourcesUrl(r?.request?.url)).sort((a,b)=>b.index-a.index)[0]||null;}
function prospectiveDryRunPresentInRaceEvidence(raceEvidence){const n=Number(raceEvidence?.totalDryRunCycles);return Number.isInteger(n)&&n>=1&&Array.isArray(raceEvidence?.cycleIds)&&raceEvidence.cycleIds.length===n;}

function fail(reason,extra={}){
  return {version:VERSION,valid:false,decision:'NO_PLAY',reason,realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0,
    hardGuards:{onlineOnly:true,nonPromoOnly:true,passiveHarOnly:true,noNetwork:true,noCredentials:true,noWagerProbe:true,noAutomaticBetting:true,harAloneCannotAuthorizeGreen:true,exactApMcCoyRealLauncherRequiredInSameHar:true,latestPrecedingRealCasinoLauncherMustBeExactApMcCoy:true,staleApMcCoyLauncherCannotAuthorizeLaterDifferentGameTicker:true,configBindingMustPrecedeTickerEntry:true,configBindingMustFollowExactLauncher:true,latestPostLaunchInitialResourcesMustOwnTickerBinding:true,stalePreLaunchOrSupersededConfigCannotAuthorizeTicker:true,latestPairedTickerPollMustOwnSnapshot:true,olderValidPollCannotOverrideLaterInvalidOrDifferentGamePoll:true,bothSnapshotsMustPassExactServerBindingValidator:true,harCaptureTimeMustAttestFreshness:true,callerCannotBackdateHarFreshness:true,pairCaptureTimeMustAdvanceStrictly:true,operatorSemanticsCodeOwned:true,stakeSemanticsCodeOwnedAndReviewAllowlisted:true,currentDailyAmountDerivedFromValidatedServerSnapshot:true,actionLatencyCodeOwnedAndReviewAllowlisted:true,prospectiveDryRunDerivedFromStructuredRaceLedger:true,callerRuleBooleanIgnored:true,callerStakeVerifiedBooleanIgnored:true,callerCurrentAmountVerifiedBooleanIgnored:true,callerLatencyVerifiedBooleanIgnored:true,callerProspectiveDryRunBooleanIgnored:true,stakeReviewMayRemainOpenWithoutDiscardingValidCrossGhtResearch:true,latencyReviewMayRemainOpenWithoutDiscardingValidCrossGhtResearch:true,finalGreenDelegatedOnlyToExistingOverdueEvaluator:true},...extra};
}

function assessPair(discovery,p,{nowEpochSeconds,maxFeedAgeIntervals,maxCaptureTimeArgumentSkewSeconds}){
  const tickerEntryIndex=Number.isInteger(p?.tickerEntryIndex)?p.tickerEntryIndex:null;
  const configEntryIndex=Number.isInteger(p?.configBinding?.sourceEntryIndex)?p.configBinding.sourceEntryIndex:null;
  if(tickerEntryIndex===null||configEntryIndex===null||configEntryIndex>=tickerEntryIndex)return {ok:false,reason:'CONFIG_BINDING_DOES_NOT_PRECEDE_TICKER_ENTRY',extra:{tickerEntryIndex,configEntryIndex}};
  const latestLauncher=latestPrecedingRealCasinoLauncher(discovery,tickerEntryIndex);
  if(!latestLauncher)return {ok:false,reason:'REAL_CASINO_LAUNCHER_DOES_NOT_PRECEDE_TICKER_ENTRY',extra:{tickerEntryIndex}};
  if(latestLauncher.gameId!==EXACT_GAME_ID)return {ok:false,reason:'LATEST_REAL_CASINO_LAUNCHER_NOT_AP_MCCOY',extra:{tickerEntryIndex,latestPrecedingRealCasinoLauncher:latestLauncher}};
  if(configEntryIndex<=latestLauncher.index)return {ok:false,reason:'CONFIG_BINDING_NOT_POST_AP_MCCOY_LAUNCH',extra:{tickerEntryIndex,configEntryIndex,launcherEntryIndex:latestLauncher.index}};
  const latestSessionConfig=latestPostLaunchInitialResources(discovery,latestLauncher.index,tickerEntryIndex);
  if(!latestSessionConfig)return {ok:false,reason:'POST_LAUNCH_BETFAIR_INITIAL_RESOURCES_NOT_FOUND',extra:{tickerEntryIndex,launcherEntryIndex:latestLauncher.index}};
  if(latestSessionConfig.index!==configEntryIndex)return {ok:false,reason:'PAIRED_CONFIG_IS_NOT_LATEST_POST_LAUNCH_INITIAL_RESOURCES',extra:{tickerEntryIndex,configEntryIndex,latestPostLaunchInitialResourcesEntryIndex:latestSessionConfig.index}};
  const captureEpochSeconds=isoEpochSeconds(p.startedDateTime);
  if(captureEpochSeconds===null)return {ok:false,reason:'TICKER_HAR_CAPTURE_TIME_MISSING_OR_INVALID',extra:{tickerEntryIndex}};
  const suppliedNow=finite(nowEpochSeconds),maxSkew=finite(maxCaptureTimeArgumentSkewSeconds);
  if(!(maxSkew>=0))return {ok:false,reason:'INVALID_CAPTURE_TIME_SKEW_POLICY',extra:{captureEpochSeconds}};
  if(suppliedNow!==null&&Math.abs(suppliedNow-captureEpochSeconds)>maxSkew)return {ok:false,reason:'CAPTURE_TIME_ARGUMENT_MISMATCH',extra:{captureEpochSeconds,suppliedNow,maxCaptureTimeArgumentSkewSeconds:maxSkew}};
  const validation=validateBetfairSportingServerSnapshot({configBinding:p.configBinding,tickerXml:p.tickerXml,responseUrl:p.responseUrl,nowEpochSeconds:captureEpochSeconds,maxFeedAgeIntervals});
  if(validation.valid!==true)return {ok:false,reason:'SERVER_SNAPSHOT_VALIDATION_FAILED',extra:{validation,captureEpochSeconds}};
  return {ok:true,p,tickerEntryIndex,configEntryIndex,latestLauncher,captureEpochSeconds,validation};
}
function assessedIdentity(x){const s=x?.validation?.snapshot||{};return JSON.stringify([x?.configEntryIndex,x?.validation?.expectedBetfairImsCasino,x?.validation?.tickerEndpoint,s.code,s.currency,s.local,s.amount,s.guaranteedHitTime,s.gameTimestamp,s.winCount,s.requestExecInterval,s.requestCasino,s.instanceCode]);}

export function validateBetfairSportingHarSnapshot(har,{sourceName='capture.har',nowEpochSeconds=null,maxFeedAgeIntervals=2,maxCaptureTimeArgumentSkewSeconds=2}={}){
  let discovery;try{discovery=analyzeBetfairSportingHar(har,{sourceName});}catch(error){return fail('HAR_PARSE_FAILED',{error:String(error?.message||error)});}
  if(discovery?.discovery?.exactApMcCoyRealLauncherBindingObserved!==true)return fail('EXACT_AP_MCCOY_REAL_LAUNCHER_BINDING_NOT_FOUND',{discovery});
  const pairs=discovery?.discovery?.pairedServerEvidence||[];if(!pairs.length)return fail('PAIRED_SERVER_EVIDENCE_NOT_FOUND',{discovery});
  const indexed=pairs.filter(p=>Number.isInteger(p?.tickerEntryIndex));if(!indexed.length)return fail('PAIRED_SERVER_EVIDENCE_MISSING_TICKER_INDEX',{discovery});
  const latestTickerEntryIndex=Math.max(...indexed.map(p=>p.tickerEntryIndex));
  const latestPairs=indexed.filter(p=>p.tickerEntryIndex===latestTickerEntryIndex);
  const assessed=latestPairs.map(p=>assessPair(discovery,p,{nowEpochSeconds,maxFeedAgeIntervals,maxCaptureTimeArgumentSkewSeconds}));
  const valid=assessed.filter(x=>x.ok===true);
  if(!valid.length){if(assessed.length===1)return fail(assessed[0].reason,{discovery,...assessed[0].extra,pairedServerEvidenceCount:pairs.length,latestPairedTickerEntryIndex:latestTickerEntryIndex});return fail('LATEST_PAIRED_SERVER_EVIDENCE_NOT_SESSION_VALID',{pairedServerEvidenceCount:pairs.length,latestPairedTickerEntryIndex:latestTickerEntryIndex,pairRejections:assessed.map(x=>({reason:x.reason,tickerEntryIndex:x.extra?.tickerEntryIndex??latestTickerEntryIndex,configEntryIndex:x.extra?.configEntryIndex??null}))});}
  const identities=new Set(valid.map(assessedIdentity));if(identities.size!==1)return fail('AMBIGUOUS_LATEST_PAIRED_SERVER_EVIDENCE',{pairedServerEvidenceCount:pairs.length,latestPairedTickerEntryIndex:latestTickerEntryIndex,latestValidPairCount:valid.length});
  const chosen=valid[0],p=chosen.p,validation=chosen.validation;
  return {version:VERSION,valid:true,usableForOverduePair:true,sourceName,exactApMcCoyRealLauncherBindingVerified:true,latestPrecedingRealCasinoLauncherIsExactApMcCoy:true,latestPostLaunchInitialResourcesBindingVerified:true,latestPairedTickerPollSelected:true,pairedServerEvidenceCount:pairs.length,launcherEntryIndex:chosen.latestLauncher.index,configEntryIndex:chosen.configEntryIndex,tickerEntryIndex:chosen.tickerEntryIndex,captureStartedDateTime:p.startedDateTime,captureEpochSeconds:chosen.captureEpochSeconds,freshnessClockSource:'HAR_TICKER_ENTRY_STARTED_DATE_TIME',discovery,validation,snapshot:validation.snapshot,expectedBetfairImsCasino:validation.expectedBetfairImsCasino,tickerEndpoint:validation.tickerEndpoint,configSourceUrl:validation.configSourceUrl,decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0,hardGuards:{harAloneCannotAuthorizeGreen:true,noWagerProbe:true,noAutomaticBetting:true,exactApMcCoyRealLauncherRequiredInSameHar:true,latestPrecedingRealCasinoLauncherMustBeExactApMcCoy:true,staleApMcCoyLauncherCannotAuthorizeLaterDifferentGameTicker:true,configBindingMustPrecedeTickerEntry:true,configBindingMustFollowExactLauncher:true,latestPostLaunchInitialResourcesMustOwnTickerBinding:true,stalePreLaunchOrSupersededConfigCannotAuthorizeTicker:true,latestPairedTickerPollMustOwnSnapshot:true,olderValidPollCannotOverrideLaterInvalidOrDifferentGamePoll:true,multipleNormalTickerPollsSupported:true,harCaptureTimeMustAttestFreshness:true,callerCannotBackdateHarFreshness:true}};
}

export function evaluateBetfairSportingHarOverduePair({
  beforeHar,afterHar,beforeSourceName='before.har',afterSourceName='after.har',beforeNowEpochSeconds=null,afterNowEpochSeconds=null,
  maxFeedAgeIntervals=2,maxCaptureTimeArgumentSkewSeconds=2,decisionNowEpochSeconds,
  stakeEUR,stakeReviewCommit,raceEvidence,actionLatencyMeasurement,actionLatencyReviewCommit,
}={}){
  const decisionNow=finite(decisionNowEpochSeconds);if(decisionNow===null)return fail('EXPLICIT_DECISION_TIME_REQUIRED');
  const semantics=getBetfairApMcCoyCurrentOperatorSemantics();
  if(semantics?.valid!==true||semantics.betfairFirstBetFollowingDayRuleVerified!==true||semantics.providerGuaranteedHitTimeDefinesFollowingDayBoundaryVerified!==true)return fail('CODE_OWNED_AP_MCCOY_OPERATOR_SEMANTICS_NOT_CLOSED',{semantics});
  const before=validateBetfairSportingHarSnapshot(beforeHar,{sourceName:beforeSourceName,nowEpochSeconds:beforeNowEpochSeconds,maxFeedAgeIntervals,maxCaptureTimeArgumentSkewSeconds});
  if(before.valid!==true)return fail('BEFORE_HAR_SNAPSHOT_INVALID',{before,semantics});
  const after=validateBetfairSportingHarSnapshot(afterHar,{sourceName:afterSourceName,nowEpochSeconds:afterNowEpochSeconds,maxFeedAgeIntervals,maxCaptureTimeArgumentSkewSeconds});
  if(after.valid!==true)return fail('AFTER_HAR_SNAPSHOT_INVALID',{before,after,semantics});
  if(!(after.captureEpochSeconds>before.captureEpochSeconds))return fail('HAR_CAPTURE_ORDER_NOT_FORWARD',{before,after,semantics});
  if(decisionNow<after.captureEpochSeconds)return fail('DECISION_TIME_PRECEDES_AFTER_CAPTURE',{before,after,decisionNowEpochSeconds:decisionNow,semantics});
  if(text(before.expectedBetfairImsCasino)?.toLowerCase()!==text(after.expectedBetfairImsCasino)?.toLowerCase())return fail('IMS_CHANGED_BETWEEN_CAPTURES',{before,after,semantics});
  if(!sameHttpsEndpoint(before.tickerEndpoint,after.tickerEndpoint))return fail('TICKER_ENDPOINT_CHANGED_BETWEEN_CAPTURES',{before,after,semantics});
  if(!sameHttpsEndpoint(before.configSourceUrl,after.configSourceUrl))return fail('CONFIG_SOURCE_ENDPOINT_CHANGED_BETWEEN_CAPTURES',{before,after,semantics});

  const stakeReview=reviewBetfairApMcCoyServedStake(afterHar,{sourceName:afterSourceName,reviewCommit:stakeReviewCommit,requiredStakeEUR:stakeEUR});
  const stakeReviewClosed=stakeReview?.valid===true&&stakeReview.stakeAtDecisionExactVerified===true;
  const actionLatencyReview=reviewBetfairApMcCoyActionLatency({measurement:actionLatencyMeasurement,reviewCommit:actionLatencyReviewCommit});
  const actionLatencyReviewClosed=actionLatencyReview?.valid===true&&actionLatencyReview.measuredActionLatencyVerified===true;
  const prospectiveDryRunCycleDerived=prospectiveDryRunPresentInRaceEvidence(raceEvidence);
  const currentDailyAmount=finite(after?.snapshot?.amount);
  if(!(currentDailyAmount>0))return fail('VALIDATED_AFTER_SNAPSHOT_DAILY_AMOUNT_REQUIRED',{before,after,semantics,stakeReview,actionLatencyReview});

  const finalEvaluation=evaluateSportingLegendsOverdueFirstBet({
    before:before.snapshot,after:after.snapshot,nowEpochSeconds:decisionNow,
    exactBetfairSpainTickerImsBindingVerified:true,expectedBetfairImsCasino:before.expectedBetfairImsCasino,
    betfairFirstBetFollowingDayRuleVerified:semantics.betfairFirstBetFollowingDayRuleVerified,
    providerGuaranteedHitTimeDefinesFollowingDayBoundaryVerified:semantics.providerGuaranteedHitTimeDefinesFollowingDayBoundaryVerified,
    conservativeBaseRtpPct:semantics.conservativeMainGameRtpPct,
    stakeEUR:stakeReviewClosed?stakeReview.selectedStakeEUR:null,raceEvidence,
    currentDailyAmountExactVerified:true,stakeAtDecisionExactVerified:stakeReviewClosed,
    measuredActionLatencyVerified:actionLatencyReviewClosed,
    measuredActionLatencySeconds:actionLatencyReviewClosed?actionLatencyReview.measuredActionLatencySeconds:null,
    prospectiveDryRunCycleVerified:prospectiveDryRunCycleDerived,
  });

  return {version:VERSION,valid:finalEvaluation.valid===true,before,after,semantics,stakeReview,actionLatencyReview,exactApMcCoyRealLauncherBindingVerifiedOnBothSnapshots:true,latestPrecedingRealCasinoLauncherIsExactApMcCoyOnBothSnapshots:true,latestPostLaunchInitialResourcesBindingVerifiedOnBothSnapshots:true,latestPairedTickerPollSelectedOnBothSnapshots:true,captureTimeAdvanced:true,currentDailyAmountExactVerifiedFromValidatedServerSnapshot:true,stakeAtDecisionExactVerifiedFromCodeOwnedReview:stakeReviewClosed,measuredActionLatencyVerifiedFromCodeOwnedReview:actionLatencyReviewClosed,prospectiveDryRunCycleDerivedFromStructuredRaceEvidence:prospectiveDryRunCycleDerived,operatorFollowingDayRuleVerifiedFromCodeOwnedCurrentEvidence:true,providerGhtBoundarySemanticsVerifiedFromCodeOwnedEvidence:true,finalEvaluation,decision:finalEvaluation.decision,reason:finalEvaluation.reason,realMoneyAllowed:finalEvaluation.realMoneyAllowed===true,realStakeEUR:finalEvaluation.realStakeEUR||0,maxSpins:finalEvaluation.maxSpins||0,maxTotalStakeEUR:finalEvaluation.maxTotalStakeEUR||0,
    hardGuards:{onlineOnly:true,nonPromoOnly:true,passiveHarOnly:true,noWagerProbe:true,noAutomaticBetting:true,harAloneCannotAuthorizeGreen:true,exactApMcCoyRealLauncherVerifiedOnBothSnapshots:true,latestPrecedingRealCasinoLauncherVerifiedOnBothSnapshots:true,latestPostLaunchInitialResourcesVerifiedOnBothSnapshots:true,latestPairedTickerPollVerifiedOnBothSnapshots:true,configBindingPrecedesTickerOnBothSnapshots:true,strictForwardCaptureOrderVerified:true,bothSnapshotsPassedExactServerBindingValidator:true,harCaptureTimeAttestedOnBothSnapshots:true,sameImsTickerAndConfigEndpointsAcrossCaptures:true,benignCacheBusterQueryChangesIgnored:true,operatorSemanticsCodeOwned:true,stakeReviewCodeOwned:true,actionLatencyReviewCodeOwned:true,currentDailyAmountDerivedFromValidatedServerState:true,prospectiveDryRunDerivedFromRaceLedgerStructure:true,callerSemanticStakeAmountLatencyAndDryRunBooleansCannotCloseGates:true,stakeReviewMayRemainOpenWithoutDiscardingValidCrossGhtResearch:true,latencyReviewMayRemainOpenWithoutDiscardingValidCrossGhtResearch:true,finalGreenDelegatedOnlyToExistingOverdueEvaluator:true}}
}

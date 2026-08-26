import {analyzeBetfairSportingHar} from '../../edge-backend/src/betfair-sporting-har-discovery-v1.mjs';
import {validateBetfairSportingServerSnapshot} from './betfair-sporting-server-binding-validator-v1.mjs';
import {evaluateSportingLegendsOverdueFirstBet} from './sporting-legends-overdue-first-bet-v1.mjs';

const EXACT_GAME_ID='ap-mccoy-sporting-legends-cptn';
const finite=v=>{if(v===null||v===undefined||v===''||typeof v==='boolean')return null;const n=Number(v);return Number.isFinite(n)?n:null;};
const text=v=>typeof v==='string'&&v.trim()?v.trim():null;
function sameHttpsEndpoint(a,b){
  try{const x=new URL(a),y=new URL(b);return x.protocol==='https:'&&y.protocol==='https:'&&x.origin===y.origin&&x.pathname===y.pathname;}catch{return false;}
}
function isoEpochSeconds(v){
  const s=text(v);if(!s)return null;
  const ms=Date.parse(s);return Number.isFinite(ms)?ms/1000:null;
}
function latestPrecedingRealCasinoLauncher(discovery,tickerEntryIndex){
  if(!Number.isInteger(tickerEntryIndex))return null;
  const all=discovery?.discovery?.betfairRealCasinoLauncherBindings||[];
  return all.filter(x=>Number.isInteger(x?.index)&&x.index<tickerEntryIndex).sort((a,b)=>b.index-a.index)[0]||null;
}

function fail(reason,extra={}){
  return {
    version:'betfair-sporting-har-overdue-bridge-v1.4-latest-launcher-attested',
    valid:false,
    decision:'NO_PLAY',
    reason,
    realMoneyAllowed:false,
    realStakeEUR:0,
    maxSpins:0,
    maxTotalStakeEUR:0,
    hardGuards:{
      onlineOnly:true,
      nonPromoOnly:true,
      passiveHarOnly:true,
      noNetwork:true,
      noCredentials:true,
      noWagerProbe:true,
      noAutomaticBetting:true,
      harAloneCannotAuthorizeGreen:true,
      exactApMcCoyRealLauncherRequiredInSameHar:true,
      latestPrecedingRealCasinoLauncherMustBeExactApMcCoy:true,
      staleApMcCoyLauncherCannotAuthorizeLaterDifferentGameTicker:true,
      configBindingMustPrecedeTickerEntry:true,
      bothSnapshotsMustPassExactServerBindingValidator:true,
      harCaptureTimeMustAttestFreshness:true,
      callerCannotBackdateHarFreshness:true,
      finalGreenDelegatedOnlyToExistingOverdueEvaluator:true,
    },
    ...extra,
  };
}

export function validateBetfairSportingHarSnapshot(har,{
  sourceName='capture.har',
  nowEpochSeconds=null,
  maxFeedAgeIntervals=2,
  maxCaptureTimeArgumentSkewSeconds=2,
}={}){
  let discovery;
  try{discovery=analyzeBetfairSportingHar(har,{sourceName});}catch(error){return fail('HAR_PARSE_FAILED',{error:String(error?.message||error)});}
  if(discovery?.discovery?.exactApMcCoyRealLauncherBindingObserved!==true){
    return fail('EXACT_AP_MCCOY_REAL_LAUNCHER_BINDING_NOT_FOUND',{discovery});
  }
  const pairs=discovery?.discovery?.pairedServerEvidence||[];
  if(pairs.length!==1)return fail(pairs.length?'AMBIGUOUS_PAIRED_SERVER_EVIDENCE':'PAIRED_SERVER_EVIDENCE_NOT_FOUND',{discovery});
  const p=pairs[0];
  const tickerEntryIndex=Number.isInteger(p?.tickerEntryIndex)?p.tickerEntryIndex:null;
  const configEntryIndex=Number.isInteger(p?.configBinding?.sourceEntryIndex)?p.configBinding.sourceEntryIndex:null;
  if(tickerEntryIndex===null||configEntryIndex===null||configEntryIndex>=tickerEntryIndex){
    return fail('CONFIG_BINDING_DOES_NOT_PRECEDE_TICKER_ENTRY',{discovery,tickerEntryIndex,configEntryIndex});
  }
  const latestLauncher=latestPrecedingRealCasinoLauncher(discovery,tickerEntryIndex);
  if(!latestLauncher){
    return fail('REAL_CASINO_LAUNCHER_DOES_NOT_PRECEDE_TICKER_ENTRY',{discovery,tickerEntryIndex});
  }
  if(latestLauncher.gameId!==EXACT_GAME_ID){
    return fail('LATEST_REAL_CASINO_LAUNCHER_NOT_AP_MCCOY',{discovery,tickerEntryIndex,latestPrecedingRealCasinoLauncher:latestLauncher});
  }
  const captureEpochSeconds=isoEpochSeconds(p.startedDateTime);
  if(captureEpochSeconds===null)return fail('TICKER_HAR_CAPTURE_TIME_MISSING_OR_INVALID',{discovery});
  const suppliedNow=finite(nowEpochSeconds),maxSkew=finite(maxCaptureTimeArgumentSkewSeconds);
  if(!(maxSkew>=0))return fail('INVALID_CAPTURE_TIME_SKEW_POLICY',{discovery,captureEpochSeconds});
  if(suppliedNow!==null&&Math.abs(suppliedNow-captureEpochSeconds)>maxSkew)return fail('CAPTURE_TIME_ARGUMENT_MISMATCH',{discovery,captureEpochSeconds,suppliedNow,maxCaptureTimeArgumentSkewSeconds:maxSkew});

  const validation=validateBetfairSportingServerSnapshot({
    configBinding:p.configBinding,
    tickerXml:p.tickerXml,
    responseUrl:p.responseUrl,
    nowEpochSeconds:captureEpochSeconds,
    maxFeedAgeIntervals,
  });
  if(validation.valid!==true)return fail('SERVER_SNAPSHOT_VALIDATION_FAILED',{discovery,validation,captureEpochSeconds});
  return {
    version:'betfair-sporting-har-overdue-bridge-v1.4-latest-launcher-attested',
    valid:true,
    usableForOverduePair:true,
    sourceName,
    exactApMcCoyRealLauncherBindingVerified:true,
    latestPrecedingRealCasinoLauncherIsExactApMcCoy:true,
    launcherEntryIndex:latestLauncher.index,
    configEntryIndex,
    tickerEntryIndex,
    captureStartedDateTime:p.startedDateTime,
    captureEpochSeconds,
    freshnessClockSource:'HAR_TICKER_ENTRY_STARTED_DATE_TIME',
    discovery,
    validation,
    snapshot:validation.snapshot,
    expectedBetfairImsCasino:validation.expectedBetfairImsCasino,
    tickerEndpoint:validation.tickerEndpoint,
    configSourceUrl:validation.configSourceUrl,
    decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0,
    hardGuards:{harAloneCannotAuthorizeGreen:true,noWagerProbe:true,noAutomaticBetting:true,exactApMcCoyRealLauncherRequiredInSameHar:true,latestPrecedingRealCasinoLauncherMustBeExactApMcCoy:true,staleApMcCoyLauncherCannotAuthorizeLaterDifferentGameTicker:true,configBindingMustPrecedeTickerEntry:true,harCaptureTimeMustAttestFreshness:true,callerCannotBackdateHarFreshness:true},
  };
}

export function evaluateBetfairSportingHarOverduePair({
  beforeHar,afterHar,
  beforeSourceName='before.har',afterSourceName='after.har',
  beforeNowEpochSeconds=null,afterNowEpochSeconds=null,
  maxFeedAgeIntervals=2,
  maxCaptureTimeArgumentSkewSeconds=2,
  decisionNowEpochSeconds,
  betfairFirstBetFollowingDayRuleVerified=false,
  providerGuaranteedHitTimeDefinesFollowingDayBoundaryVerified=false,
  stakeEUR,
  raceEvidence,
  currentDailyAmountExactVerified=false,
  stakeAtDecisionExactVerified=false,
  measuredActionLatencyVerified=false,
  measuredActionLatencySeconds,
  prospectiveDryRunCycleVerified=false,
}={}){
  const decisionNow=finite(decisionNowEpochSeconds);
  if(decisionNow===null)return fail('EXPLICIT_DECISION_TIME_REQUIRED');
  const before=validateBetfairSportingHarSnapshot(beforeHar,{sourceName:beforeSourceName,nowEpochSeconds:beforeNowEpochSeconds,maxFeedAgeIntervals,maxCaptureTimeArgumentSkewSeconds});
  if(before.valid!==true)return fail('BEFORE_HAR_SNAPSHOT_INVALID',{before});
  const after=validateBetfairSportingHarSnapshot(afterHar,{sourceName:afterSourceName,nowEpochSeconds:afterNowEpochSeconds,maxFeedAgeIntervals,maxCaptureTimeArgumentSkewSeconds});
  if(after.valid!==true)return fail('AFTER_HAR_SNAPSHOT_INVALID',{before,after});

  if(before.captureEpochSeconds>after.captureEpochSeconds)return fail('HAR_CAPTURE_ORDER_INVALID',{before,after});
  if(decisionNow<after.captureEpochSeconds)return fail('DECISION_TIME_PRECEDES_AFTER_CAPTURE',{before,after,decisionNowEpochSeconds:decisionNow});
  if(text(before.expectedBetfairImsCasino)?.toLowerCase()!==text(after.expectedBetfairImsCasino)?.toLowerCase())return fail('IMS_CHANGED_BETWEEN_CAPTURES',{before,after});
  if(!sameHttpsEndpoint(before.tickerEndpoint,after.tickerEndpoint))return fail('TICKER_ENDPOINT_CHANGED_BETWEEN_CAPTURES',{before,after});
  if(!sameHttpsEndpoint(before.configSourceUrl,after.configSourceUrl))return fail('CONFIG_SOURCE_ENDPOINT_CHANGED_BETWEEN_CAPTURES',{before,after});

  const finalEvaluation=evaluateSportingLegendsOverdueFirstBet({
    before:before.snapshot,
    after:after.snapshot,
    nowEpochSeconds:decisionNow,
    exactBetfairSpainTickerImsBindingVerified:true,
    expectedBetfairImsCasino:before.expectedBetfairImsCasino,
    betfairFirstBetFollowingDayRuleVerified,
    providerGuaranteedHitTimeDefinesFollowingDayBoundaryVerified,
    stakeEUR,
    raceEvidence,
    currentDailyAmountExactVerified,
    stakeAtDecisionExactVerified,
    measuredActionLatencyVerified,
    measuredActionLatencySeconds,
    prospectiveDryRunCycleVerified,
  });

  return {
    version:'betfair-sporting-har-overdue-bridge-v1.4-latest-launcher-attested',
    valid:finalEvaluation.valid===true,
    before,after,
    exactApMcCoyRealLauncherBindingVerifiedOnBothSnapshots:true,
    latestPrecedingRealCasinoLauncherIsExactApMcCoyOnBothSnapshots:true,
    finalEvaluation,
    decision:finalEvaluation.decision,
    reason:finalEvaluation.reason,
    realMoneyAllowed:finalEvaluation.realMoneyAllowed===true,
    realStakeEUR:finalEvaluation.realStakeEUR||0,
    maxSpins:finalEvaluation.maxSpins||0,
    maxTotalStakeEUR:finalEvaluation.maxTotalStakeEUR||0,
    hardGuards:{
      onlineOnly:true,nonPromoOnly:true,passiveHarOnly:true,noWagerProbe:true,noAutomaticBetting:true,
      harAloneCannotAuthorizeGreen:true,
      exactApMcCoyRealLauncherVerifiedOnBothSnapshots:true,
      latestPrecedingRealCasinoLauncherVerifiedOnBothSnapshots:true,
      configBindingPrecedesTickerOnBothSnapshots:true,
      bothSnapshotsPassedExactServerBindingValidator:true,
      harCaptureTimeAttestedOnBothSnapshots:true,
      sameImsTickerAndConfigEndpointsAcrossCaptures:true,
      benignCacheBusterQueryChangesIgnored:true,
      finalGreenDelegatedOnlyToExistingOverdueEvaluator:true,
    },
  };
}

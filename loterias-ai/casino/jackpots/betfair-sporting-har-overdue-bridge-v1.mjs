import {analyzeBetfairSportingHar} from '../../edge-backend/src/betfair-sporting-har-discovery-v1.mjs';
import {validateBetfairSportingServerSnapshot} from './betfair-sporting-server-binding-validator-v1.mjs';
import {evaluateSportingLegendsOverdueFirstBet} from './sporting-legends-overdue-first-bet-v1.mjs';

const finite=v=>{if(v===null||v===undefined||v===''||typeof v==='boolean')return null;const n=Number(v);return Number.isFinite(n)?n:null;};
const text=v=>typeof v==='string'&&v.trim()?v.trim():null;

function fail(reason,extra={}){
  return {
    version:'betfair-sporting-har-overdue-bridge-v1',
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
      bothSnapshotsMustPassExactServerBindingValidator:true,
      finalGreenDelegatedOnlyToExistingOverdueEvaluator:true,
    },
    ...extra,
  };
}

export function validateBetfairSportingHarSnapshot(har,{sourceName='capture.har',nowEpochSeconds=Math.floor(Date.now()/1000),maxFeedAgeIntervals=2}={}){
  let discovery;
  try{discovery=analyzeBetfairSportingHar(har,{sourceName});}catch(error){return fail('HAR_PARSE_FAILED',{error:String(error?.message||error)});}
  const pairs=discovery?.discovery?.pairedServerEvidence||[];
  if(pairs.length!==1)return fail(pairs.length?'AMBIGUOUS_PAIRED_SERVER_EVIDENCE':'PAIRED_SERVER_EVIDENCE_NOT_FOUND',{discovery});
  const p=pairs[0];
  const validation=validateBetfairSportingServerSnapshot({
    configBinding:p.configBinding,
    tickerXml:p.tickerXml,
    responseUrl:p.responseUrl,
    nowEpochSeconds,
    maxFeedAgeIntervals,
  });
  if(validation.valid!==true)return fail('SERVER_SNAPSHOT_VALIDATION_FAILED',{discovery,validation});
  return {
    version:'betfair-sporting-har-overdue-bridge-v1',
    valid:true,
    usableForOverduePair:true,
    sourceName,
    discovery,
    validation,
    snapshot:validation.snapshot,
    expectedBetfairImsCasino:validation.expectedBetfairImsCasino,
    tickerEndpoint:validation.tickerEndpoint,
    configSourceUrl:validation.configSourceUrl,
    decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0,
    hardGuards:{harAloneCannotAuthorizeGreen:true,noWagerProbe:true,noAutomaticBetting:true},
  };
}

export function evaluateBetfairSportingHarOverduePair({
  beforeHar,afterHar,
  beforeSourceName='before.har',afterSourceName='after.har',
  beforeNowEpochSeconds,afterNowEpochSeconds,
  maxFeedAgeIntervals=2,
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
  const beforeNow=finite(beforeNowEpochSeconds),afterNow=finite(afterNowEpochSeconds),decisionNow=finite(decisionNowEpochSeconds);
  if(beforeNow===null||afterNow===null||decisionNow===null)return fail('EXPLICIT_CAPTURE_AND_DECISION_TIMES_REQUIRED');
  const before=validateBetfairSportingHarSnapshot(beforeHar,{sourceName:beforeSourceName,nowEpochSeconds:beforeNow,maxFeedAgeIntervals});
  if(before.valid!==true)return fail('BEFORE_HAR_SNAPSHOT_INVALID',{before});
  const after=validateBetfairSportingHarSnapshot(afterHar,{sourceName:afterSourceName,nowEpochSeconds:afterNow,maxFeedAgeIntervals});
  if(after.valid!==true)return fail('AFTER_HAR_SNAPSHOT_INVALID',{before,after});

  if(text(before.expectedBetfairImsCasino)?.toLowerCase()!==text(after.expectedBetfairImsCasino)?.toLowerCase())return fail('IMS_CHANGED_BETWEEN_CAPTURES',{before,after});
  if(text(before.tickerEndpoint)!==text(after.tickerEndpoint))return fail('TICKER_ENDPOINT_CHANGED_BETWEEN_CAPTURES',{before,after});
  if(text(before.configSourceUrl)!==text(after.configSourceUrl))return fail('CONFIG_SOURCE_CHANGED_BETWEEN_CAPTURES',{before,after});

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
    version:'betfair-sporting-har-overdue-bridge-v1',
    valid:finalEvaluation.valid===true,
    before,after,
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
      bothSnapshotsPassedExactServerBindingValidator:true,
      sameImsTickerAndConfigAcrossCaptures:true,
      finalGreenDelegatedOnlyToExistingOverdueEvaluator:true,
    },
  };
}

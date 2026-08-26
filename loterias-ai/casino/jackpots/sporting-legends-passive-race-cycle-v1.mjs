const finite=(v)=>{if(v===null||v===undefined||v===''||typeof v==='boolean')return null;const n=Number(v);return Number.isFinite(n)?n:null;};
const text=(v)=>typeof v==='string'&&v.trim()?v.trim():null;
const upper=(v)=>text(v)?.toUpperCase()??null;
const lower=(v)=>text(v)?.toLowerCase()??null;

function sameBinding(rows){
  const first=rows[0];
  if(!first)return false;
  return rows.every(r=>r&&text(r.code)===text(first.code)&&text(r.requestCasino)===text(first.requestCasino)&&text(r.instanceCode)===text(first.instanceCode)&&r.local===first.local&&upper(r.currency)===upper(first.currency));
}

export function validateSportingLegendsPassiveRaceCycle({
  cycleId,
  protocolId,
  protocolFrozenAtEpochSeconds,
  recordedAtEpochSeconds,
  beforeBoundary,
  detection,
  confirmation,
  expectedBetfairImsCasino,
  exactBetfairSpainTickerImsBindingVerified=false,
  betfairFirstBetFollowingDayRuleVerified=false,
  providerGuaranteedHitTimeDefinesFollowingDayBoundaryVerified=false,
  actionLatencySeconds,
  maxBoundaryDistanceIntervals=2,
  maxConfirmationDistanceIntervals=2,
}={}){
  const guards={passiveDryRunOnly:true,noWagerRequired:true,noAutomaticWagering:true,exactBetfairSpainBindingRequired:true,protocolMustBeFrozenBeforeCycle:true,cadenceBoundedSnapshotsRequired:true,realMoneyAllowed:false};
  const fail=(reason,extra={})=>({version:'sporting-legends-passive-race-cycle-v1',valid:false,usableForRaceEvidence:false,reason,guards,...extra});
  const id=text(cycleId),pid=text(protocolId),expectedCasino=lower(expectedBetfairImsCasino);
  if(!id)return fail('MISSING_CYCLE_ID');
  if(!pid)return fail('MISSING_PROTOCOL_ID');
  if(!expectedCasino)return fail('MISSING_EXPECTED_BETFAIR_IMS');
  if(!beforeBoundary||!detection||!confirmation)return fail('MISSING_CYCLE_SNAPSHOTS');
  const rows=[beforeBoundary,detection,confirmation];
  if(!sameBinding(rows))return fail('BINDING_CHANGED_DURING_CYCLE');
  if(rows.some(r=>r.code!=='sljp-1'||upper(r.currency)!=='EUR'||r.local!==0))return fail('NOT_SPORTING_GLOBAL_EUR_DAILY');
  if(rows.some(r=>lower(r.requestCasino)!==expectedCasino))return fail('REQUEST_CASINO_DOES_NOT_MATCH_VERIFIED_BETFAIR_IMS');
  if(!exactBetfairSpainTickerImsBindingVerified)return fail('BETFAIR_SPAIN_TICKER_IMS_NOT_VERIFIED');
  if(!betfairFirstBetFollowingDayRuleVerified)return fail('BETFAIR_FOLLOWING_DAY_FIRST_BET_RULE_NOT_VERIFIED');
  if(!providerGuaranteedHitTimeDefinesFollowingDayBoundaryVerified)return fail('GUARANTEED_HIT_TIME_BOUNDARY_SEMANTICS_NOT_VERIFIED');

  const freeze=finite(protocolFrozenAtEpochSeconds),recorded=finite(recordedAtEpochSeconds),latency=finite(actionLatencySeconds);
  const boundaryIntervals=finite(maxBoundaryDistanceIntervals),confirmationIntervals=finite(maxConfirmationDistanceIntervals);
  const beforeTs=finite(beforeBoundary.gameTimestamp),detectTs=finite(detection.gameTimestamp),confirmTs=finite(confirmation.gameTimestamp);
  const deadline=finite(detection.guaranteedHitTime);
  const deadlines=rows.map(r=>finite(r.guaranteedHitTime));
  const execs=rows.map(r=>finite(r.requestExecInterval));
  const wins=rows.map(r=>finite(r.winCount));
  const amounts=rows.map(r=>finite(r.amount));
  if([freeze,recorded,latency,boundaryIntervals,confirmationIntervals,beforeTs,detectTs,confirmTs,deadline,...deadlines,...execs,...wins,...amounts].some(v=>v===null))return fail('INCOMPLETE_PROTOCOL_FIELDS');
  if(!(latency>0))return fail('INVALID_ACTION_LATENCY');
  if(!(boundaryIntervals>=1&&confirmationIntervals>=1))return fail('INVALID_CADENCE_POLICY');
  if(execs.some(x=>!(x>0))||!execs.every(x=>x===execs[0]))return fail('EXEC_INTERVAL_INVALID_OR_CHANGED');
  if(!deadlines.every(x=>x===deadline))return fail('DEADLINE_CHANGED_OR_RESET');
  if(!(freeze<=beforeTs))return fail('PROTOCOL_NOT_FROZEN_BEFORE_CYCLE');
  if(!(recorded>=confirmTs))return fail('CYCLE_RECORDED_BEFORE_CONFIRMATION');
  if(!(beforeTs<=deadline&&detectTs>deadline&&confirmTs>=detectTs))return fail('INVALID_CYCLE_TIMESTAMP_ORDER');
  const exec=execs[0];
  if(deadline-beforeTs>exec*boundaryIntervals)return fail('BEFORE_SNAPSHOT_TOO_FAR_FROM_BOUNDARY');
  if(detectTs-deadline>exec*boundaryIntervals)return fail('DETECTION_TOO_FAR_FROM_BOUNDARY');
  if(confirmTs-detectTs>exec*confirmationIntervals)return fail('CONFIRMATION_TOO_FAR_FROM_DETECTION');
  if(confirmTs<detectTs+latency)return fail('CONFIRMATION_BEFORE_HYPOTHETICAL_ACTION_COMPLETION');
  if(wins[1]!==wins[0]||amounts[1]<amounts[0])return fail('DAILY_NOT_PROVEN_UNAWARDED_AT_DETECTION');

  const success=wins[2]===wins[1]&&amounts[2]>=amounts[1];
  return {
    version:'sporting-legends-passive-race-cycle-v1',valid:true,usableForRaceEvidence:true,
    cycleId:id,protocolId:pid,validatorVersion:'sporting-legends-passive-race-cycle-v1',
    prospectivelyObserved:true,comparableCycleDefinitionVerified:true,passiveDryRun:true,
    actionLatencySeconds:latency,outcome:success?'SUCCESS':'FAILURE',
    deadlineEpochSeconds:deadline,detectionTimestamp:detectTs,confirmationTimestamp:confirmTs,
    requestExecIntervalSeconds:exec,zeroArrivalWindowAtDetectionSeconds:detectTs-deadline,
    survivedHypotheticalActionWindow:success,guards,
  };
}

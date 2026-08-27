const finite=v=>{if(v===null||v===undefined||v===''||typeof v==='boolean')return null;const n=Number(v);return Number.isFinite(n)?n:null;};
const text=v=>typeof v==='string'&&v.trim()?v.trim():null;
const upper=v=>text(v)?.toUpperCase()??null;
const lower=v=>text(v)?.toLowerCase()??null;

function sameBinding(rows){
  const first=rows[0];if(!first)return false;
  return rows.every(r=>r&&text(r.code)===text(first.code)&&lower(r.requestCasino)===lower(first.requestCasino)&&text(r.instanceCode)===text(first.instanceCode)&&text(r.tickerEndpoint)===text(first.tickerEndpoint)&&r.local===first.local&&upper(r.currency)===upper(first.currency));
}
function execution(){return {decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0};}
function fail(reason,extra={}){return {version:'bet365-sporting-passive-race-cycle-v1',valid:false,usableForRaceEvidence:false,reason,execution:execution(),guards:{onlineOnly:true,nonPromoOnly:true,passiveDryRunOnly:true,noWagerRequired:true,noAutomaticWagering:true,exactBet365SpainBindingRequired:true,servedTenCentEligibilityRequired:true,bet365FollowingDayRuleRequired:true,protocolMustBeFrozenBeforeCycle:true,cadenceBoundedSnapshotsRequired:true,realMoneyAllowed:false},...extra};}

export function validateBet365SportingPassiveRaceCycle({
  cycleId,protocolId,protocolFrozenAtEpochSeconds,recordedAtEpochSeconds,
  beforeBoundary,detection,confirmation,
  expectedBet365JackpotsCasino,expectedTickerEndpoint,
  exactBet365SpainServedBindingVerified=false,
  servedTenCentJackpotEligibilityVerified=false,
  bet365FirstBetFollowingDayRuleVerified=false,
  providerGuaranteedHitTimeDefinesFollowingDayBoundaryVerified=false,
  actionLatencySeconds,maxBoundaryDistanceIntervals=2,maxConfirmationDistanceIntervals=2,
}={}){
  const id=text(cycleId),pid=text(protocolId),expectedCasino=lower(expectedBet365JackpotsCasino),expectedEndpoint=text(expectedTickerEndpoint);
  if(!id)return fail('MISSING_CYCLE_ID');
  if(!pid)return fail('MISSING_PROTOCOL_ID');
  if(!expectedCasino)return fail('MISSING_EXPECTED_BET365_JACKPOTS_CASINO');
  if(!expectedEndpoint)return fail('MISSING_EXPECTED_TICKER_ENDPOINT');
  if(!beforeBoundary||!detection||!confirmation)return fail('MISSING_CYCLE_SNAPSHOTS');
  const rows=[beforeBoundary,detection,confirmation];
  if(!sameBinding(rows))return fail('BINDING_CHANGED_DURING_CYCLE');
  if(rows.some(r=>r.code!=='sljp-1'||upper(r.currency)!=='EUR'||r.local!==0))return fail('NOT_SPORTING_GLOBAL_EUR_DAILY');
  if(rows.some(r=>lower(r.requestCasino)!==expectedCasino))return fail('REQUEST_CASINO_DOES_NOT_MATCH_VERIFIED_BET365_CONFIG');
  if(rows.some(r=>text(r.tickerEndpoint)!==expectedEndpoint))return fail('TICKER_ENDPOINT_DOES_NOT_MATCH_VERIFIED_BET365_CONFIG');
  if(exactBet365SpainServedBindingVerified!==true)return fail('BET365_SPAIN_SERVED_BINDING_NOT_VERIFIED');
  if(servedTenCentJackpotEligibilityVerified!==true)return fail('SERVED_TEN_CENT_JACKPOT_ELIGIBILITY_NOT_VERIFIED');
  if(bet365FirstBetFollowingDayRuleVerified!==true)return fail('BET365_FOLLOWING_DAY_FIRST_BET_RULE_NOT_VERIFIED');
  if(providerGuaranteedHitTimeDefinesFollowingDayBoundaryVerified!==true)return fail('GUARANTEED_HIT_TIME_BOUNDARY_SEMANTICS_NOT_VERIFIED');

  const freeze=finite(protocolFrozenAtEpochSeconds),recorded=finite(recordedAtEpochSeconds),latency=finite(actionLatencySeconds);
  const boundaryIntervals=finite(maxBoundaryDistanceIntervals),confirmationIntervals=finite(maxConfirmationDistanceIntervals);
  const beforeTs=finite(beforeBoundary.gameTimestamp),detectTs=finite(detection.gameTimestamp),confirmTs=finite(confirmation.gameTimestamp),deadline=finite(detection.guaranteedHitTime);
  const deadlines=rows.map(r=>finite(r.guaranteedHitTime)),execs=rows.map(r=>finite(r.requestExecInterval)),wins=rows.map(r=>finite(r.winCount)),amounts=rows.map(r=>finite(r.amount));
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
    version:'bet365-sporting-passive-race-cycle-v1',validatorVersion:'bet365-sporting-passive-race-cycle-v1',valid:true,usableForRaceEvidence:true,
    cycleId:id,protocolId:pid,prospectivelyObserved:true,comparableCycleDefinitionVerified:true,passiveDryRun:true,
    operator:'bet365 Spain',market:'ES',jackpotsCasino:expectedCasino,tickerEndpoint:expectedEndpoint,
    servedTenCentJackpotEligibilityVerified:true,bet365FirstBetFollowingDayRuleVerified:true,
    actionLatencySeconds:latency,outcome:success?'SUCCESS':'FAILURE',deadlineEpochSeconds:deadline,detectionTimestamp:detectTs,confirmationTimestamp:confirmTs,
    requestExecIntervalSeconds:exec,zeroArrivalWindowAtDetectionSeconds:detectTs-deadline,survivedHypotheticalActionWindow:success,
    scientificUse:'Prospective passive dry-run cycle for the exact bet365 Spain Sporting Legends served binding. A SUCCESS means the same unawarded Daily sljp-1 state survived from first post-GHT detection through at least the frozen hypothetical manual action-latency window. It does not place a wager and does not by itself estimate execution probability; multiple complete prospective cycles are required for an empirical lower bound.',
    execution:execution(),
    guards:{onlineOnly:true,nonPromoOnly:true,passiveDryRunOnly:true,noWagerRequired:true,noAutomaticWagering:true,exactBet365SpainBindingRequired:true,servedTenCentEligibilityRequired:true,bet365FollowingDayRuleRequired:true,protocolMustBeFrozenBeforeCycle:true,cadenceBoundedSnapshotsRequired:true,realMoneyAllowed:false},
  };
}

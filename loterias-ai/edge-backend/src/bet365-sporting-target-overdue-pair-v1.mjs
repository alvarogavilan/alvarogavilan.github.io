import {recoverBet365SportingTargetSljp1Candidate} from './bet365-sporting-target-sljp1-candidate-v1.mjs';

const finite=v=>{if(v===null||v===undefined||v===''||typeof v==='boolean')return null;const n=Number(v);return Number.isFinite(n)?n:null;};
const text=v=>typeof v==='string'&&v.trim()?v.trim():null;
const lower=v=>text(v)?.toLowerCase()??null;
function execution(){return {decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0};}
function safeSide(v){return v?.valid===true?{valid:true,gameCode:v.gameCode,title:v.title,sourceName:v.sourceName||null,captureEpochSeconds:v.captureEpochSeconds??null,tickerEndpoint:v.tickerEndpoint||null,expectedRequestCasino:v.expectedRequestCasino||null,expectedInstanceCode:v.expectedInstanceCode||null,snapshot:v.snapshot||null,feedAgeSeconds:v.feedAgeSeconds??null,maxFeedAgeSeconds:v.maxFeedAgeSeconds??null}:{valid:false,reason:v?.reason||null,gameCode:v?.gameCode||null,sourceName:v?.sourceName||null};}
function fail(reason,extra={}){return {version:'bet365-sporting-target-overdue-pair-v1',valid:false,reason,candidateFollowingDayUnawardedStateObserved:false,exactTargetSameBindingCrossGhtVerified:false,bet365LicenseeBindingVerified:false,servedTenCentTotalStakeVerified:false,operatorFollowingDayRuleAdoptionVerified:false,usableForExecution:false,execution:execution(),...extra};}

export function evaluateBet365SportingTargetOverduePair({
  gameCode,beforeHar,afterHar,beforeSourceName='before.har',afterSourceName='after.har',
  maxFeedAgeIntervals=2,maxBoundaryDistanceIntervals=2,
}={}){
  const target=lower(gameCode);if(!target)return fail('MISSING_GAME_CODE');
  const boundaryIntervals=finite(maxBoundaryDistanceIntervals);if(boundaryIntervals===null||boundaryIntervals<1||boundaryIntervals>10)return fail('INVALID_BOUNDARY_DISTANCE_POLICY',{gameCode:target,maxBoundaryDistanceIntervals});
  const before=recoverBet365SportingTargetSljp1Candidate(beforeHar,{gameCode:target,sourceName:beforeSourceName,maxFeedAgeIntervals});
  if(before?.valid!==true)return fail('BEFORE_TARGET_SLJP1_CANDIDATE_INVALID',{gameCode:target,before:safeSide(before)});
  const after=recoverBet365SportingTargetSljp1Candidate(afterHar,{gameCode:target,sourceName:afterSourceName,maxFeedAgeIntervals});
  if(after?.valid!==true)return fail('AFTER_TARGET_SLJP1_CANDIDATE_INVALID',{gameCode:target,before:safeSide(before),after:safeSide(after)});
  if(lower(before.gameCode)!==target||lower(after.gameCode)!==target)return fail('TARGET_GAME_CODE_CHANGED',{gameCode:target,before:safeSide(before),after:safeSide(after)});
  if(!(after.captureEpochSeconds>before.captureEpochSeconds))return fail('CAPTURE_ORDER_NOT_FORWARD',{gameCode:target,before:safeSide(before),after:safeSide(after)});
  if(before.tickerEndpoint!==after.tickerEndpoint)return fail('TICKER_ENDPOINT_CHANGED',{gameCode:target,before:safeSide(before),after:safeSide(after)});
  if(lower(before.expectedRequestCasino)!==lower(after.expectedRequestCasino))return fail('REQUEST_CASINO_CHANGED',{gameCode:target,before:safeSide(before),after:safeSide(after)});
  if(text(before.expectedInstanceCode)!==text(after.expectedInstanceCode))return fail('INSTANCE_CODE_CHANGED',{gameCode:target,before:safeSide(before),after:safeSide(after)});
  const a=before.snapshot||{},b=after.snapshot||{};
  if(a.code!=='sljp-1'||b.code!=='sljp-1'||a.network!=='SPORTING_LEGENDS'||b.network!=='SPORTING_LEGENDS'||a.tier!=='DAILY'||b.tier!=='DAILY')return fail('NOT_SPORTING_DAILY_SLJP1',{gameCode:target,before:safeSide(before),after:safeSide(after)});
  const beforeGht=finite(a.guaranteedHitTime),afterGht=finite(b.guaranteedHitTime),beforeTs=finite(a.gameTimestamp),afterTs=finite(b.gameTimestamp),beforeWin=finite(a.winCount),afterWin=finite(b.winCount),beforeAmount=finite(a.amount),afterAmount=finite(b.amount),beforeExec=finite(a.requestExecInterval),afterExec=finite(b.requestExecInterval);
  if([beforeGht,afterGht,beforeTs,afterTs,beforeWin,afterWin,beforeAmount,afterAmount,beforeExec,afterExec].some(v=>v===null))return fail('INCOMPLETE_PAIR_PROTOCOL_FIELDS',{gameCode:target,before:safeSide(before),after:safeSide(after)});
  if(!(beforeExec>0&&afterExec>0)||beforeExec!==afterExec)return fail('EXEC_INTERVAL_CHANGED_OR_INVALID',{gameCode:target,before:safeSide(before),after:safeSide(after)});
  if(beforeGht!==afterGht)return fail('GUARANTEED_HIT_TIME_CHANGED_OR_RESET',{gameCode:target,before:safeSide(before),after:safeSide(after)});
  if(!(beforeTs<=beforeGht&&afterTs>afterGht))return fail('PAIR_DOES_NOT_BRACKET_GUARANTEED_HIT_TIME',{gameCode:target,before:safeSide(before),after:safeSide(after)});
  const beforeLeadSeconds=beforeGht-beforeTs,afterLagSeconds=afterTs-afterGht,maxBoundaryDistanceSeconds=beforeExec*boundaryIntervals;
  if(beforeLeadSeconds>maxBoundaryDistanceSeconds)return fail('BEFORE_SNAPSHOT_TOO_FAR_FROM_BOUNDARY',{gameCode:target,beforeLeadSeconds,maxBoundaryDistanceSeconds,before:safeSide(before),after:safeSide(after)});
  if(afterLagSeconds>maxBoundaryDistanceSeconds)return fail('AFTER_SNAPSHOT_TOO_FAR_FROM_BOUNDARY',{gameCode:target,afterLagSeconds,maxBoundaryDistanceSeconds,before:safeSide(before),after:safeSide(after)});
  if(afterWin!==beforeWin)return fail('JACKPOT_WIN_COUNT_CHANGED',{gameCode:target,before:safeSide(before),after:safeSide(after)});
  if(afterAmount<beforeAmount)return fail('JACKPOT_AMOUNT_RESET_OR_DECREASED',{gameCode:target,before:safeSide(before),after:safeSide(after)});
  return {
    version:'bet365-sporting-target-overdue-pair-v1',valid:true,
    reason:'EXACT_TARGET_FRESH_SAME_BINDING_SLJP1_CROSSED_GHT_WITHOUT_WINCOUNT_OR_RESET_OPERATOR_AND_STAKE_GATES_PENDING',
    gameCode:target,title:before.title||after.title||null,before:safeSide(before),after:safeSide(after),deadlineEpochSeconds:beforeGht,beforeLeadSeconds,afterLagSeconds,maxBoundaryDistanceSeconds,requestExecIntervalSeconds:beforeExec,
    sameExactTarget:true,sameTickerEndpoint:true,sameRequestCasino:true,sameInstanceCode:true,sameGuaranteedHitTime:true,winCountUnchanged:true,jackpotNondecreasing:true,
    candidateFollowingDayUnawardedStateObserved:true,exactTargetSameBindingCrossGhtVerified:true,
    bet365LicenseeBindingVerified:false,servedTenCentTotalStakeVerified:false,servedTenCentJackpotEligibilityVerified:false,operatorFollowingDayRuleAdoptionVerified:false,
    usableForExecution:false,
    scientificUse:'Generalized passive cross-GHT detector for the current low-cost bet365 Sporting Legends targets. It requires the exact same provider game code on both fresh captures and the same ticker endpoint, request casino, instance, guaranteed-hit time and cadence, with the server timestamp crossing GHT while win count stays unchanged and amount does not reset. This proves only a candidate unawarded timed state on the supplied target binding; bet365 ownership, served 0.10 EUR eligibility and operator adoption of the following-day rule remain separate mandatory gates.',
    execution:execution(),
    hardGuards:{onlineOnly:true,nonPromoOnly:true,offlineOnly:true,passiveHarOnly:true,exactSameTargetRequired:true,bothSnapshotsFresh:true,sameEndpointCasinoInstanceRequired:true,sameGuaranteedHitTimeRequired:true,cadenceBoundedCrossingRequired:true,unchangedWinCountRequired:true,noJackpotResetRequired:true,providerRuleCannotProveOperatorAdoption:true,candidateOverdueStateCannotAuthorizeGreen:true,servedTenCentEligibilityStillRequired:true,bet365LicenseeBindingStillRequired:true,noWagerProbe:true,noAutomaticBetting:true,realMoneyAllowed:false},
  };
}

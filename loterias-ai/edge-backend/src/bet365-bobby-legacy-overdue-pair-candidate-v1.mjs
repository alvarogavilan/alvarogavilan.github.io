import {recoverBet365BobbyLegacySljp1Candidate} from './bet365-bobby-legacy-ticker-candidate-v1.mjs';

const finite=v=>{if(v===null||v===undefined||v===''||typeof v==='boolean')return null;const n=Number(v);return Number.isFinite(n)?n:null;};
const text=v=>typeof v==='string'&&v.trim()?v.trim():null;
const lower=v=>text(v)?.toLowerCase()??null;
function fail(reason,extra={}){return {version:'bet365-bobby-legacy-overdue-pair-candidate-v1',valid:false,reason,candidateFollowingDayUnawardedStateObserved:false,bet365LicenseeBindingVerified:false,operatorRuleAdoptionVerified:false,usableForExecution:false,execution:{decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0},...extra};}
function safeSide(v){return v?.valid===true?{valid:true,sourceName:v.sourceName||null,captureEpochSeconds:v.captureEpochSeconds??null,tickerEndpoint:v.tickerEndpoint||null,expectedRequestCasino:v.expectedRequestCasino||null,expectedInstanceCode:v.expectedInstanceCode||null,snapshot:v.snapshot||null,feedAgeSeconds:v.feedAgeSeconds??null,maxFeedAgeSeconds:v.maxFeedAgeSeconds??null}:{valid:false,reason:v?.reason||null};}

export function evaluateBet365BobbyLegacyOverduePairCandidate({
  beforeHar,afterHar,beforeSourceName='before.har',afterSourceName='after.har',
  maxFeedAgeIntervals=2,maxBoundaryDistanceIntervals=2,
}={}){
  const boundaryIntervals=finite(maxBoundaryDistanceIntervals);
  if(boundaryIntervals===null||boundaryIntervals<1||boundaryIntervals>10)return fail('INVALID_BOUNDARY_DISTANCE_POLICY',{maxBoundaryDistanceIntervals});
  const before=recoverBet365BobbyLegacySljp1Candidate(beforeHar,{sourceName:beforeSourceName,maxFeedAgeIntervals});
  if(before?.valid!==true)return fail('BEFORE_SLJP1_CANDIDATE_INVALID',{before:safeSide(before)});
  const after=recoverBet365BobbyLegacySljp1Candidate(afterHar,{sourceName:afterSourceName,maxFeedAgeIntervals});
  if(after?.valid!==true)return fail('AFTER_SLJP1_CANDIDATE_INVALID',{before:safeSide(before),after:safeSide(after)});
  if(!(after.captureEpochSeconds>before.captureEpochSeconds))return fail('CAPTURE_ORDER_NOT_FORWARD',{before:safeSide(before),after:safeSide(after)});
  if(before.tickerEndpoint!==after.tickerEndpoint)return fail('TICKER_ENDPOINT_CHANGED',{before:safeSide(before),after:safeSide(after)});
  if(lower(before.expectedRequestCasino)!==lower(after.expectedRequestCasino))return fail('REQUEST_CASINO_CHANGED',{before:safeSide(before),after:safeSide(after)});
  if(text(before.expectedInstanceCode)!==text(after.expectedInstanceCode))return fail('INSTANCE_CODE_CHANGED',{before:safeSide(before),after:safeSide(after)});
  const a=before.snapshot||{},b=after.snapshot||{};
  if(a.code!=='sljp-1'||b.code!=='sljp-1')return fail('NOT_DAILY_SLJP1');
  const beforeGht=finite(a.guaranteedHitTime),afterGht=finite(b.guaranteedHitTime),beforeTs=finite(a.gameTimestamp),afterTs=finite(b.gameTimestamp),beforeWin=finite(a.winCount),afterWin=finite(b.winCount),beforeAmount=finite(a.amount),afterAmount=finite(b.amount),beforeExec=finite(a.requestExecInterval),afterExec=finite(b.requestExecInterval);
  if([beforeGht,afterGht,beforeTs,afterTs,beforeWin,afterWin,beforeAmount,afterAmount,beforeExec,afterExec].some(v=>v===null))return fail('INCOMPLETE_PAIR_PROTOCOL_FIELDS',{before:safeSide(before),after:safeSide(after)});
  if(!(beforeExec>0&&afterExec>0)||beforeExec!==afterExec)return fail('EXEC_INTERVAL_CHANGED_OR_INVALID',{before:safeSide(before),after:safeSide(after)});
  if(beforeGht!==afterGht)return fail('GUARANTEED_HIT_TIME_CHANGED_OR_RESET',{before:safeSide(before),after:safeSide(after)});
  if(!(beforeTs<=beforeGht&&afterTs>afterGht))return fail('PAIR_DOES_NOT_BRACKET_GUARANTEED_HIT_TIME',{before:safeSide(before),after:safeSide(after)});
  const beforeLeadSeconds=beforeGht-beforeTs,afterLagSeconds=afterTs-afterGht,maxBoundaryDistanceSeconds=beforeExec*boundaryIntervals;
  if(beforeLeadSeconds>maxBoundaryDistanceSeconds)return fail('BEFORE_SNAPSHOT_TOO_FAR_FROM_BOUNDARY',{beforeLeadSeconds,maxBoundaryDistanceSeconds,before:safeSide(before),after:safeSide(after)});
  if(afterLagSeconds>maxBoundaryDistanceSeconds)return fail('AFTER_SNAPSHOT_TOO_FAR_FROM_BOUNDARY',{afterLagSeconds,maxBoundaryDistanceSeconds,before:safeSide(before),after:safeSide(after)});
  if(afterWin!==beforeWin)return fail('JACKPOT_WIN_COUNT_CHANGED',{before:safeSide(before),after:safeSide(after)});
  if(afterAmount<beforeAmount)return fail('JACKPOT_AMOUNT_RESET_OR_DECREASED',{before:safeSide(before),after:safeSide(after)});
  return {
    version:'bet365-bobby-legacy-overdue-pair-candidate-v1',valid:true,
    reason:'FRESH_SAME_BINDING_SLJP1_CROSSED_GHT_WITHOUT_WINCOUNT_OR_RESET_OPERATOR_BINDING_PENDING',
    before:safeSide(before),after:safeSide(after),
    deadlineEpochSeconds:beforeGht,beforeLeadSeconds,afterLagSeconds,maxBoundaryDistanceSeconds,requestExecIntervalSeconds:beforeExec,
    sameTickerEndpoint:true,sameRequestCasino:true,sameInstanceCode:true,sameGuaranteedHitTime:true,winCountUnchanged:true,jackpotNondecreasing:true,
    providerFirstBetFollowingDayRuleDocumented:true,providerAnyBetAnySizeJackpotEligibilityDocumented:true,
    candidateFollowingDayUnawardedStateObserved:true,
    bet365LicenseeBindingVerified:false,exactBet365LauncherSemanticsVerified:false,exactBet365TickerEndpointOwnershipVerified:false,operatorRuleAdoptionVerified:false,servedTenCentTotalStakeVerified:false,tenCentJackpotEligibilityVerified:false,
    usableForExecution:false,
    scientificUse:'The supplied passive pair shows a fresh same-endpoint, same-request-casino, same-instance Sporting Legends Daily sljp-1 vector bracketing one unchanged guaranteedHitTime with unchanged win count and no amount reset. This is strong candidate evidence of an unawarded timed state, but it is deliberately not execution evidence until the request casino/ticker endpoint are independently bound to the current bet365 Spain Bobby session and the served 0.10 EUR stake is attested as eligible.',
    execution:{decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0},
    hardGuards:{onlineOnly:true,nonPromoOnly:true,offlineOnly:true,passiveHarOnly:true,bothSnapshotsFresh:true,strictForwardCaptureOrder:true,sameEndpointCasinoInstanceRequired:true,sameGuaranteedHitTimeRequired:true,cadenceBoundedCrossingRequired:true,unchangedWinCountRequired:true,noJackpotResetRequired:true,providerRuleCannotProveOperatorAdoption:true,candidateOverdueStateCannotAuthorizeGreen:true,servedTenCentEligibilityStillRequired:true,bet365LicenseeBindingStillRequired:true,noWagerProbe:true,noAutomaticBetting:true},
  };
}

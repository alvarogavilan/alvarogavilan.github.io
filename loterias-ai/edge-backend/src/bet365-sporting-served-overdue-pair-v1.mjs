import {verifyBet365SportingServedSljp1Binding} from './bet365-sporting-served-sljp1-binding-v1.mjs';
import {verifyBet365SportingServedTotalStake} from './bet365-sporting-served-total-stake-v1.mjs';
import {recoverBet365SportingTargetSljp1Candidate} from './bet365-sporting-target-sljp1-candidate-v1.mjs';

const finite=v=>{if(v===null||v===undefined||v===''||typeof v==='boolean')return null;const n=Number(v);return Number.isFinite(n)?n:null;};
const text=v=>typeof v==='string'&&v.trim()?v.trim():null;
const lower=v=>text(v)?.toLowerCase()??null;
function execution(){return {decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0};}
function safeState(v){return v?.valid===true?{sourceName:v.sourceName,gameCode:v.gameCode,captureEpochSeconds:v.captureEpochSeconds,tickerEndpoint:v.tickerEndpoint,requestCasino:v.expectedRequestCasino,instanceCode:v?.snapshot?.instanceCode??null,amount:v?.snapshot?.amount??null,guaranteedHitTime:v?.snapshot?.guaranteedHitTime??null,gameTimestamp:v?.snapshot?.gameTimestamp??null,winCount:v?.snapshot?.winCount??null,requestExecInterval:v?.snapshot?.requestExecInterval??null}:{valid:false,reason:v?.reason||null};}
function fail(reason,extra={}){return {version:'bet365-sporting-served-overdue-pair-v1',valid:false,reason,exactBet365SpainPairBindingVerified:false,realCrossGhtUnawardedPairVerified:false,servedTenCentTotalStakeVerified:false,servedTenCentJackpotEligibilityVerified:false,operatorFollowingDayRuleAdoptionVerified:false,usableForRaceEvidence:false,usableForExecution:false,execution:execution(),...extra};}

export function verifyBet365SportingServedOverduePair({
  gameCode,beforeHar,afterHar,beforeSourceName='before.har',afterSourceName='after.har',
  requiredStakeEUR=0.10,maxFeedAgeIntervals=2,maxBoundaryDistanceIntervals=2,maxRouteToProviderMarkerSeconds=120,
}={}){
  const code=lower(gameCode);if(!code)return fail('GAME_CODE_REQUIRED');
  const stake=finite(requiredStakeEUR),boundaryIntervals=finite(maxBoundaryDistanceIntervals);
  if(stake===null||stake<=0)return fail('INVALID_REQUIRED_STAKE',{requiredStakeEUR});
  if(boundaryIntervals===null||boundaryIntervals<1||boundaryIntervals>10)return fail('INVALID_BOUNDARY_DISTANCE_POLICY',{maxBoundaryDistanceIntervals});
  const beforeBinding=verifyBet365SportingServedSljp1Binding(beforeHar,{gameCode:code,sourceName:beforeSourceName,maxRouteToProviderMarkerSeconds});
  if(beforeBinding?.valid!==true)return fail('BEFORE_SERVED_SLJP1_BINDING_REQUIRED',{beforeBindingReason:beforeBinding?.reason||null});
  const afterBinding=verifyBet365SportingServedSljp1Binding(afterHar,{gameCode:code,sourceName:afterSourceName,maxRouteToProviderMarkerSeconds});
  if(afterBinding?.valid!==true)return fail('AFTER_SERVED_SLJP1_BINDING_REQUIRED',{afterBindingReason:afterBinding?.reason||null});
  const before=recoverBet365SportingTargetSljp1Candidate(beforeHar,{gameCode:code,sourceName:beforeSourceName,maxFeedAgeIntervals});
  if(before?.valid!==true)return fail('BEFORE_CURRENT_SLJP1_STATE_REQUIRED',{before:safeState(before)});
  const after=recoverBet365SportingTargetSljp1Candidate(afterHar,{gameCode:code,sourceName:afterSourceName,maxFeedAgeIntervals});
  if(after?.valid!==true)return fail('AFTER_CURRENT_SLJP1_STATE_REQUIRED',{before:safeState(before),after:safeState(after)});
  const afterStake=verifyBet365SportingServedTotalStake(afterHar,{gameCode:code,sourceName:afterSourceName,requiredStakeEUR:stake,maxRouteToProviderMarkerSeconds});
  if(afterStake?.valid!==true||afterStake?.servedTenCentTotalStakeVerified!==true)return fail('SERVED_TEN_CENT_TOTAL_STAKE_REQUIRED',{stakeReason:afterStake?.reason||null,before:safeState(before),after:safeState(after)});
  if(!(after.captureEpochSeconds>before.captureEpochSeconds))return fail('CAPTURE_ORDER_NOT_FORWARD',{before:safeState(before),after:safeState(after)});
  const beforeEndpoint=beforeBinding?.configuredTransport?.endpoint,afterEndpoint=afterBinding?.configuredTransport?.endpoint;
  const beforeCasino=beforeBinding?.configuredTransport?.jackpotsCasino,afterCasino=afterBinding?.configuredTransport?.jackpotsCasino;
  if(!beforeEndpoint||beforeEndpoint!==afterEndpoint)return fail('CONFIGURED_TICKER_ENDPOINT_CHANGED',{beforeEndpoint:beforeEndpoint||null,afterEndpoint:afterEndpoint||null});
  if(!beforeCasino||lower(beforeCasino)!==lower(afterCasino))return fail('CONFIGURED_JACKPOTS_CASINO_CHANGED',{beforeCasino:beforeCasino||null,afterCasino:afterCasino||null});
  if(before.tickerEndpoint!==after.tickerEndpoint)return fail('OBSERVED_TICKER_ENDPOINT_CHANGED',{before:safeState(before),after:safeState(after)});
  if(lower(before.expectedRequestCasino)!==lower(after.expectedRequestCasino))return fail('REQUEST_CASINO_CHANGED',{before:safeState(before),after:safeState(after)});
  if(text(before?.snapshot?.instanceCode)!==text(after?.snapshot?.instanceCode))return fail('INSTANCE_CODE_CHANGED',{before:safeState(before),after:safeState(after)});
  const a=before.snapshot||{},b=after.snapshot||{};
  const beforeGht=finite(a.guaranteedHitTime),afterGht=finite(b.guaranteedHitTime),beforeTs=finite(a.gameTimestamp),afterTs=finite(b.gameTimestamp),beforeWin=finite(a.winCount),afterWin=finite(b.winCount),beforeAmount=finite(a.amount),afterAmount=finite(b.amount),beforeExec=finite(a.requestExecInterval),afterExec=finite(b.requestExecInterval);
  if([beforeGht,afterGht,beforeTs,afterTs,beforeWin,afterWin,beforeAmount,afterAmount,beforeExec,afterExec].some(v=>v===null))return fail('INCOMPLETE_SLJP1_PAIR_STATE',{before:safeState(before),after:safeState(after)});
  if(!(beforeExec>0&&afterExec>0)||beforeExec!==afterExec)return fail('EXEC_INTERVAL_CHANGED_OR_INVALID',{before:safeState(before),after:safeState(after)});
  if(beforeGht!==afterGht)return fail('GUARANTEED_HIT_TIME_CHANGED_OR_RESET',{before:safeState(before),after:safeState(after)});
  if(!(beforeTs<=beforeGht&&afterTs>afterGht))return fail('PAIR_DOES_NOT_BRACKET_GHT',{before:safeState(before),after:safeState(after)});
  const beforeLeadSeconds=beforeGht-beforeTs,afterLagSeconds=afterTs-afterGht,maxBoundaryDistanceSeconds=beforeExec*boundaryIntervals;
  if(beforeLeadSeconds>maxBoundaryDistanceSeconds||afterLagSeconds>maxBoundaryDistanceSeconds)return fail('GHT_CROSSING_TOO_FAR_FROM_BOUNDARY',{beforeLeadSeconds,afterLagSeconds,maxBoundaryDistanceSeconds,before:safeState(before),after:safeState(after)});
  if(afterWin!==beforeWin)return fail('WIN_COUNT_CHANGED_ACROSS_GHT',{before:safeState(before),after:safeState(after)});
  if(afterAmount<beforeAmount)return fail('JACKPOT_AMOUNT_RESET_OR_DECREASED',{before:safeState(before),after:safeState(after)});
  return {
    version:'bet365-sporting-served-overdue-pair-v1',mode:'OFFLINE_PASSIVE_BET365_SPAIN_SERVED_SLJP1_CROSS_GHT_NO_PLAY',valid:true,
    reason:'EXACT_BET365_SPAIN_SERVED_BINDING_AND_TEN_CENT_STAKE_CROSS_GHT_WITHOUT_WIN_OR_RESET_OPERATOR_RULE_STILL_PENDING',
    target:afterBinding.target,before:safeState(before),after:safeState(after),requiredStakeEUR:stake,
    configuredBinding:{tickerEndpoint:afterEndpoint,jackpotsCasino:afterCasino},
    deadlineEpochSeconds:beforeGht,beforeLeadSeconds,afterLagSeconds,maxBoundaryDistanceSeconds,requestExecIntervalSeconds:beforeExec,
    exactBet365SpainPairBindingVerified:true,exactProviderGameCodeVerified:true,exactConfiguredSljp1TransportVerified:true,
    realCrossGhtUnawardedPairVerified:true,servedTenCentTotalStakeVerified:true,servedTenCentJackpotEligibilityVerified:false,
    providerFirstBetFollowingDayRuleDocumented:false,operatorFollowingDayRuleAdoptionVerified:false,
    usableForRaceEvidence:false,usableForExecution:false,
    scientificUse:'Requires two passive captures of the exact same bet365 Spain Sporting Legends frontend, each independently bound from the frozen public play route and exact provider game code to the same bet365-owned configured EUR global sljp-1 transport. The pair must bracket one unchanged guaranteedHitTime with unchanged win count and no amount reset, and the post-boundary capture must independently expose an explicit served EUR total-stake menu containing 0.10. This closes served binding + cross-GHT state + selectable total stake for the supplied pair only. It deliberately does not transfer the provider first-bet-following-day rule to bet365, does not prove jackpot eligibility of 0.10 by itself, and cannot authorize execution.',
    execution:execution(),
    hardGuards:{onlineOnly:true,nonPromoOnly:true,offlineOnly:true,passiveHarOnly:true,bothCapturesRequireExactBet365SpainFrontendBinding:true,sameConfiguredEndpointRequired:true,sameConfiguredCasinoRequired:true,sameObservedEndpointCasinoInstanceRequired:true,unchangedGhtRequired:true,cadenceBoundedCrossingRequired:true,unchangedWinCountRequired:true,noResetRequired:true,explicitServedTotalStakeRequired:true,providerRuleTransferForbidden:true,stakeMenuDoesNotSelfProveJackpotEligibility:true,noWagerProbe:true,noAutomaticBetting:true,realMoneyAllowed:false},
  };
}

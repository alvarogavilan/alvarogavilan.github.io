import {verifyBet365SportingServedSljp1Binding} from '../../edge-backend/src/bet365-sporting-served-sljp1-binding-v1.mjs';
import {recoverBet365SportingTargetSljp1Candidate} from '../../edge-backend/src/bet365-sporting-target-sljp1-candidate-v1.mjs';

const VERSION='bet365-frank-post-ght-survival-cycle-v1';
const GAME_CODE='gpas_slfbruno_pop';
const FREEZE_COMMIT_SHA='c3df680c2f51dffffe16706e9820248b21e555d4';
const FREEZE_COMMIT_UTC='2026-08-27T01:23:41Z';
const FREEZE_EPOCH_SECONDS=Date.parse(FREEZE_COMMIT_UTC)/1000;
const MAX_GAP_INTERVALS=2;
const HORIZON_INTERVALS=12;
const finite=v=>{if(v===null||v===undefined||v===''||typeof v==='boolean')return null;const n=Number(v);return Number.isFinite(n)?n:null;};
const text=v=>typeof v==='string'&&v.trim()?v.trim():null;
const lower=v=>text(v)?.toLowerCase()??null;
function execution(){return {decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0};}
function fail(reason,extra={}){return {version:VERSION,valid:false,reason,prospectiveSurvivalCandidate:false,completeObservationHorizon:false,completeAttemptLedgerVerified:false,usableForLatencyClassification:false,usableForRaceEvidence:false,usableForExecution:false,freezeCommitSha:FREEZE_COMMIT_SHA,freezeCommitUtc:FREEZE_COMMIT_UTC,execution:execution(),...extra};}
function safe(v){return v?.valid===true?{sourceName:v.sourceName||null,captureEpochSeconds:v.captureEpochSeconds??null,tickerEndpoint:v.tickerEndpoint||null,requestCasino:v.expectedRequestCasino||null,instanceCode:v?.snapshot?.instanceCode??null,code:v?.snapshot?.code??null,currency:v?.snapshot?.currency??null,local:v?.snapshot?.local??null,amount:v?.snapshot?.amount??null,guaranteedHitTime:v?.snapshot?.guaranteedHitTime??null,gameTimestamp:v?.snapshot?.gameTimestamp??null,winCount:v?.snapshot?.winCount??null,requestExecInterval:v?.snapshot?.requestExecInterval??null}:{valid:false,reason:v?.reason||null,sourceName:v?.sourceName||null};}
function item(x,i,prefix){return {har:x?.har,sourceName:text(x?.sourceName)||`${prefix}-${i}.har`};}
function bindingKey(binding,state){return [lower(binding?.configuredTransport?.jackpotsCasino),text(binding?.configuredTransport?.endpoint),text(state?.snapshot?.instanceCode),text(state?.tickerEndpoint),lower(state?.expectedRequestCasino)].join('|');}
function scopeOk(state){const s=state?.snapshot||{};return state?.gameCode===GAME_CODE&&s.code==='sljp-1'&&String(s.currency||'').toUpperCase()==='EUR'&&s.local===0&&s.network==='SPORTING_LEGENDS'&&s.tier==='DAILY';}
function recoverBound(x){
  const binding=verifyBet365SportingServedSljp1Binding(x.har,{gameCode:GAME_CODE,sourceName:x.sourceName});
  if(binding?.valid!==true)return {valid:false,reason:'SERVED_BINDING_REQUIRED',bindingReason:binding?.reason||null,sourceName:x.sourceName};
  const state=recoverBet365SportingTargetSljp1Candidate(x.har,{gameCode:GAME_CODE,sourceName:x.sourceName});
  if(state?.valid!==true)return {valid:false,reason:'SLJP1_STATE_REQUIRED',stateReason:state?.reason||null,sourceName:x.sourceName};
  if(!scopeOk(state))return {valid:false,reason:'STATE_SCOPE_MISMATCH',sourceName:x.sourceName};
  if(!(finite(state.captureEpochSeconds)>FREEZE_EPOCH_SECONDS))return {valid:false,reason:'CAPTURE_NOT_STRICTLY_POST_FREEZE',sourceName:x.sourceName,captureEpochSeconds:state.captureEpochSeconds};
  return {valid:true,binding,state,key:bindingKey(binding,state)};
}

export function validateBet365FrankPostGhtSurvivalCycle({cycleId,before,postGht}={}){
  const id=text(cycleId);if(!id)return fail('MISSING_CYCLE_ID');
  if(!before?.har)return fail('BEFORE_HAR_REQUIRED',{cycleId:id});
  if(!Array.isArray(postGht)||postGht.length<2||postGht.length>50)return fail('TWO_TO_FIFTY_POST_GHT_HARS_REQUIRED',{cycleId:id,postGhtCount:Array.isArray(postGht)?postGht.length:0});
  const beforeItem=item(before,0,'before'),postItems=postGht.map((x,i)=>item(x,i,'post'));
  const names=[beforeItem.sourceName,...postItems.map(x=>x.sourceName)];if(new Set(names).size!==names.length)return fail('SOURCE_NAMES_MUST_BE_UNIQUE',{cycleId:id});
  const b=recoverBound(beforeItem);if(!b.valid)return fail('BEFORE_CAPTURE_REJECTED',{cycleId:id,captureReason:b.reason,bindingReason:b.bindingReason||null,stateReason:b.stateReason||null});
  const posts=[];for(let i=0;i<postItems.length;i++){const r=recoverBound(postItems[i]);if(!r.valid)return fail('POST_CAPTURE_REJECTED',{cycleId:id,rejectedPostIndex:i,captureReason:r.reason,bindingReason:r.bindingReason||null,stateReason:r.stateReason||null});posts.push(r);}
  const all=[b,...posts];if(new Set(all.map(x=>x.key)).size!==1)return fail('EXACT_SERVED_BINDING_CHANGED_DURING_CYCLE',{cycleId:id});
  const bs=b.state.snapshot,oldGht=finite(bs.guaranteedHitTime),baseWin=finite(bs.winCount),exec=finite(bs.requestExecInterval),beforeTs=finite(bs.gameTimestamp),beforeAmount=finite(bs.amount);
  if([oldGht,baseWin,exec,beforeTs,beforeAmount].some(v=>v===null)||!(exec>0))return fail('INCOMPLETE_BEFORE_STATE',{cycleId:id,before:safe(b.state)});
  if(!(beforeTs<=oldGht))return fail('BEFORE_STATE_ALREADY_POST_GHT',{cycleId:id,before:safe(b.state)});
  if(oldGht-beforeTs>exec*MAX_GAP_INTERVALS)return fail('BEFORE_STATE_TOO_FAR_FROM_GHT',{cycleId:id,beforeLeadSeconds:oldGht-beforeTs,maxLeadSeconds:exec*MAX_GAP_INTERVALS});
  const states=posts.map(x=>x.state.snapshot),captures=posts.map(x=>finite(x.state.captureEpochSeconds));
  for(let i=1;i<captures.length;i++)if(!(captures[i]>captures[i-1]))return fail('CAPTURE_ORDER_NOT_STRICTLY_FORWARD',{cycleId:id,rejectedPostIndex:i});
  const first=states[0],detectTs=finite(first.gameTimestamp),detectGht=finite(first.guaranteedHitTime),detectWin=finite(first.winCount),detectAmount=finite(first.amount),detectExec=finite(first.requestExecInterval);
  if([detectTs,detectGht,detectWin,detectAmount,detectExec].some(v=>v===null))return fail('INCOMPLETE_FIRST_POST_GHT_STATE',{cycleId:id});
  if(!(detectTs>oldGht))return fail('FIRST_POST_STATE_NOT_AFTER_GHT',{cycleId:id,detectionTimestamp:detectTs,guaranteedHitTime:oldGht});
  if(detectTs-oldGht>exec*MAX_GAP_INTERVALS)return fail('FIRST_POST_STATE_TOO_FAR_FROM_GHT',{cycleId:id,detectionLagSeconds:detectTs-oldGht,maxDetectionLagSeconds:exec*MAX_GAP_INTERVALS});
  if(detectGht!==oldGht||detectWin!==baseWin||detectAmount<beforeAmount||detectExec!==exec)return fail('DAILY_NOT_UNAWARDED_AT_FIRST_POST_GHT_DETECTION',{cycleId:id});
  let lastUnawardedIndex=0,terminalIndex=null,previousTs=detectTs,previousAmount=detectAmount;
  for(let i=1;i<states.length;i++){
    const s=states[i],ts=finite(s.gameTimestamp),ght=finite(s.guaranteedHitTime),win=finite(s.winCount),amount=finite(s.amount),e=finite(s.requestExecInterval);
    if([ts,ght,win,amount,e].some(v=>v===null))return fail('INCOMPLETE_POST_GHT_STATE',{cycleId:id,rejectedPostIndex:i});
    if(!(ts>previousTs))return fail('SERVER_TIMESTAMPS_NOT_STRICTLY_FORWARD',{cycleId:id,rejectedPostIndex:i});
    if(ts-previousTs>exec*MAX_GAP_INTERVALS)return fail('POST_GHT_SERVER_GAP_TOO_LARGE',{cycleId:id,rejectedPostIndex:i,gapSeconds:ts-previousTs,maxGapSeconds:exec*MAX_GAP_INTERVALS});
    if(e!==exec)return fail('EXEC_INTERVAL_CHANGED_DURING_CYCLE',{cycleId:id,rejectedPostIndex:i});
    const terminal=win!==baseWin||amount<previousAmount||ght!==oldGht;
    if(terminal){terminalIndex=i;if(i!==states.length-1)return fail('POST_TERMINAL_SNAPSHOTS_FORBIDDEN',{cycleId:id,terminalPostIndex:i,postGhtCount:states.length});break;}
    if(amount<previousAmount)return fail('UNREACHABLE_AMOUNT_DECREASE_WITHOUT_TERMINAL',{cycleId:id,rejectedPostIndex:i});
    lastUnawardedIndex=i;previousTs=ts;previousAmount=amount;
  }
  const lastUnawardedTs=finite(states[lastUnawardedIndex].gameTimestamp),horizonSeconds=exec*HORIZON_INTERVALS,horizonEndTs=detectTs+horizonSeconds;
  let firstTerminalTs=null,rightCensored=false,completeObservationHorizon=false;
  if(terminalIndex!==null){firstTerminalTs=finite(states[terminalIndex].gameTimestamp);completeObservationHorizon=true;}
  else{
    const lastTs=finite(states[states.length-1].gameTimestamp);
    if(lastTs<horizonEndTs)return fail('OBSERVATION_STOPPED_BEFORE_FROZEN_HORIZON',{cycleId:id,lastObservedTimestamp:lastTs,requiredHorizonEndTimestamp:horizonEndTs,missingSeconds:horizonEndTs-lastTs});
    if(lastTs>horizonEndTs+exec*MAX_GAP_INTERVALS)return fail('HORIZON_TERMINAL_CAPTURE_TOO_LATE',{cycleId:id,lastObservedTimestamp:lastTs,maximumAcceptedTimestamp:horizonEndTs+exec*MAX_GAP_INTERVALS});
    rightCensored=true;completeObservationHorizon=true;
  }
  const firstTerminalLagSeconds=firstTerminalTs===null?null:firstTerminalTs-oldGht;
  const lastConfirmedUnawardedLagSeconds=lastUnawardedTs-oldGht;
  const survivalLowerBoundSeconds=lastUnawardedTs-detectTs;
  return {
    version:VERSION,valid:true,mode:'OFFLINE_PASSIVE_PROSPECTIVE_LATENCY_AGNOSTIC_POST_GHT_SURVIVAL_NO_PLAY',
    reason:terminalIndex===null?'COMPLETE_RIGHT_CENSORED_POST_GHT_SURVIVAL_CANDIDATE':'COMPLETE_INTERVAL_CENSORED_POST_GHT_AWARD_RESET_CANDIDATE',
    cycleId:id,target:{title:'Frank Bruno: Sporting Legends',gameCode:GAME_CODE},freezeCommitSha:FREEZE_COMMIT_SHA,freezeCommitUtc:FREEZE_COMMIT_UTC,freezeEpochSeconds:FREEZE_EPOCH_SECONDS,
    bindingScope:{jackpotsCasino:b.binding.configuredTransport.jackpotsCasino,tickerEndpoint:b.binding.configuredTransport.endpoint,instanceCode:bs.instanceCode},
    sourceNames:names,postGhtObservationCount:states.length,requestExecIntervalSeconds:exec,maxGapIntervals:MAX_GAP_INTERVALS,horizonIntervals:HORIZON_INTERVALS,horizonSeconds,
    guaranteedHitTime:oldGht,detectionTimestamp:detectTs,detectionLagSeconds:detectTs-oldGht,lastConfirmedUnawardedTimestamp:lastUnawardedTs,lastConfirmedUnawardedLagSeconds,survivalLowerBoundSeconds,
    firstObservedAwardOrResetTimestamp:firstTerminalTs,firstObservedAwardOrResetLagSeconds:firstTerminalLagSeconds,
    awardResetInterval:terminalIndex===null?null:{lowerExclusiveTimestamp:lastUnawardedTs,upperInclusiveTimestamp:firstTerminalTs},
    rightCensored,completeObservationHorizon,prospectivelyObserved:true,prospectiveSurvivalCandidate:true,
    latencyThresholdSelectedAtCollectionTime:false,bet365FollowingDayRuleRequiredForExecution:true,servedTenCentJackpotEligibilityRequiredForExecution:true,
    completeAttemptLedgerVerified:false,independentCycleReviewRequired:true,usableForLatencyClassification:false,usableForRaceEvidence:false,usableForExecution:false,
    scientificUse:'Prospectively records the complete bounded survival path of one exact Frank Bruno bet365 Spain Daily sljp-1 state after GHT without choosing an action-latency threshold. Every supplied capture must independently bind the exact Frank public route/provider identity to the same bet365-owned configured sljp-1 transport, be strictly post-freeze, preserve cadence, and stop only at the first award/reset or the frozen 12-interval horizon. This candidate still requires independent review that the capture attempt ledger is complete before any later latency classification or race estimate.',
    execution:execution(),
    hardGuards:{onlineOnly:true,nonPromoOnly:true,offlineOnly:true,passiveOnly:true,exactFrankServedBindingEveryCapture:true,allCapturesStrictlyPostFreeze:true,uniqueSourceNamesRequired:true,strictForwardCaptureAndServerTime:true,maxGapIntervalsFrozen:true,horizonIntervalsFrozen:true,firstTerminalStopsCycle:true,latencySelectionForbiddenAtCollection:true,operatorRuleNotRequiredForRawSurvivalCollection:true,operatorRuleStillRequiredForExecution:true,tenCentEligibilityStillRequiredForExecution:true,completeAttemptLedgerIndependentReviewRequired:true,noWagerProbe:true,noAutomaticBetting:true,realMoneyAllowed:false},
  };
}

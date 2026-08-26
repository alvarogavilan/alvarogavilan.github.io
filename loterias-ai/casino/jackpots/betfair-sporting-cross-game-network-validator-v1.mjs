import {analyzeBetfairSportingHar} from '../../edge-backend/src/betfair-sporting-har-discovery-v1.mjs';
import {validateBetfairSportingServerSnapshot} from './betfair-sporting-server-binding-validator-v1.mjs';

const SUPPORTED_GAME_IDS=new Set([
  'ap-mccoy-sporting-legends-cptn',
  'ronnie-osullivan-sporting-legends-cptn',
  'frankie-dettori-sporting-legends-cptn',
  'roberto-carlos-sl-cptn',
]);
const VERSION='betfair-sporting-cross-game-network-validator-v1.1-latest-session-poll';
const SINGLE_VERSION='betfair-sporting-cross-game-single-session-v1.1-latest-session-poll';
const finite=v=>{if(v===null||v===undefined||v===''||typeof v==='boolean')return null;const n=Number(v);return Number.isFinite(n)?n:null;};
const text=v=>typeof v==='string'&&v.trim()?v.trim():null;
const lower=v=>text(v)?.toLowerCase()??null;
const upper=v=>text(v)?.toUpperCase()??null;
const endpointShape=v=>{try{const u=new URL(String(v||''));return u.protocol==='https:'?`${u.origin}${u.pathname}`:null;}catch{return null;}};
const isoEpoch=v=>{const ms=Date.parse(String(v||''));return Number.isFinite(ms)?ms/1000:null;};
function betfairInitialResources(url){try{const u=new URL(String(url||'')),h=u.hostname.toLowerCase();return u.protocol==='https:'&&(h==='betfair.es'||h.endsWith('.betfair.es'))&&/\/initialresources(?:\/|$)/i.test(u.pathname);}catch{return false;}}
function latestPrecedingLauncher(discovery,index){return (discovery?.discovery?.betfairRealCasinoLauncherBindings||[]).filter(x=>Number.isInteger(x?.index)&&x.index<index).sort((a,b)=>b.index-a.index)[0]||null;}
function latestSessionConfig(discovery,launcherIndex,tickerIndex){return (discovery?.discovery?.relevantEntries||[]).filter(x=>Number.isInteger(x?.index)&&x.index>launcherIndex&&x.index<tickerIndex&&betfairInitialResources(x?.request?.url)).sort((a,b)=>b.index-a.index)[0]||null;}
function noPlay(reason,extra={}){return {version:VERSION,valid:false,reason,exactSharedSljp1NetworkBindingVerified:false,crossGameExecutionEquivalentVerified:false,execution:{decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0},...extra};}
function safeSnapshot(v){const s=v?.snapshot||{};return {gameId:v?.gameId||null,captureEpochSeconds:v?.captureEpochSeconds??null,expectedBetfairImsCasino:v?.expectedBetfairImsCasino||null,tickerEndpoint:endpointShape(v?.tickerEndpoint),configSourceEndpoint:endpointShape(v?.configSourceUrl),pairedServerEvidenceCount:v?.pairedServerEvidenceCount??null,latestPairedTickerPollSelected:v?.latestPairedTickerPollSelected===true,launcherEntryIndex:v?.launcherEntryIndex??null,configEntryIndex:v?.configEntryIndex??null,tickerEntryIndex:v?.tickerEntryIndex??null,snapshot:{code:s.code||null,currency:s.currency||null,local:s.local??null,providerScope:s.providerScope||null,amount:s.amount??null,guaranteedHitTime:s.guaranteedHitTime??null,gameTimestamp:s.gameTimestamp??null,winCount:s.winCount??null,requestExecInterval:s.requestExecInterval??null,requestCasino:s.requestCasino||null,instanceCode:s.instanceCode||null}};}
function assessPair(discovery,p,target,maxFeedAgeIntervals){
  const tickerIndex=Number.isInteger(p?.tickerEntryIndex)?p.tickerEntryIndex:null,configIndex=Number.isInteger(p?.configBinding?.sourceEntryIndex)?p.configBinding.sourceEntryIndex:null;
  if(tickerIndex===null||configIndex===null||configIndex>=tickerIndex)return {ok:false,reason:'INVALID_CONFIG_TICKER_ORDER',tickerIndex,configIndex};
  const launcher=latestPrecedingLauncher(discovery,tickerIndex);
  if(!launcher||launcher.gameId!==target)return {ok:false,reason:'LATEST_PRECEDING_REAL_LAUNCHER_NOT_TARGET_GAME',tickerIndex,configIndex,observedGameId:launcher?.gameId||null};
  if(configIndex<=launcher.index)return {ok:false,reason:'CONFIG_NOT_POST_TARGET_LAUNCH',tickerIndex,configIndex};
  const sessionConfig=latestSessionConfig(discovery,launcher.index,tickerIndex);
  if(!sessionConfig||sessionConfig.index!==configIndex)return {ok:false,reason:'PAIRED_CONFIG_NOT_LATEST_POST_LAUNCH_INITIAL_RESOURCES',tickerIndex,configIndex};
  const captureEpochSeconds=isoEpoch(p.startedDateTime);
  if(captureEpochSeconds===null)return {ok:false,reason:'TICKER_CAPTURE_TIME_MISSING',tickerIndex,configIndex};
  const validation=validateBetfairSportingServerSnapshot({configBinding:p.configBinding,tickerXml:p.tickerXml,responseUrl:p.responseUrl,nowEpochSeconds:captureEpochSeconds,maxFeedAgeIntervals});
  if(validation?.valid!==true)return {ok:false,reason:'SERVER_SNAPSHOT_NOT_EXACTLY_VALIDATED',tickerIndex,configIndex,serverReason:validation?.reason||null};
  return {ok:true,p,tickerIndex,configIndex,launcher,captureEpochSeconds,validation};
}
function identity(x){const s=x?.validation?.snapshot||{};return JSON.stringify([x?.configIndex,x?.validation?.expectedBetfairImsCasino,endpointShape(x?.validation?.tickerEndpoint),s.code,s.currency,s.local,s.amount,s.guaranteedHitTime,s.gameTimestamp,s.winCount,s.requestExecInterval,s.requestCasino,s.instanceCode]);}

export function validateBetfairSportingHarForExactGame(har,{gameId,sourceName='capture.har',maxFeedAgeIntervals=2}={}){
  const target=text(gameId);
  if(!target||!SUPPORTED_GAME_IDS.has(target))return noPlay('UNSUPPORTED_OR_MISSING_SPORTING_GAME_ID',{sourceName,gameId:target});
  let discovery;
  try{discovery=analyzeBetfairSportingHar(har,{sourceName});}catch{return noPlay('HAR_PARSE_OR_DISCOVERY_FAILED',{sourceName,gameId:target});}
  const pairs=discovery?.discovery?.pairedServerEvidence||[];
  if(!pairs.length)return noPlay('SLJP1_SERVER_EVIDENCE_NOT_FOUND',{sourceName,gameId:target,pairCount:0});
  const indexed=pairs.filter(p=>Number.isInteger(p?.tickerEntryIndex));
  if(!indexed.length)return noPlay('SLJP1_SERVER_EVIDENCE_MISSING_TICKER_INDEX',{sourceName,gameId:target,pairCount:pairs.length});
  const latestTickerIndex=Math.max(...indexed.map(p=>p.tickerEntryIndex));
  const assessed=indexed.filter(p=>p.tickerEntryIndex===latestTickerIndex).map(p=>assessPair(discovery,p,target,maxFeedAgeIntervals));
  const valid=assessed.filter(x=>x.ok===true);
  if(!valid.length){
    if(assessed.length===1){const x=assessed[0];return noPlay(x.reason,{sourceName,gameId:target,pairCount:pairs.length,latestPairedTickerEntryIndex:latestTickerIndex,observedGameId:x.observedGameId||null,serverReason:x.serverReason||null});}
    return noPlay('LATEST_SLJP1_SERVER_EVIDENCE_NOT_SESSION_VALID',{sourceName,gameId:target,pairCount:pairs.length,latestPairedTickerEntryIndex:latestTickerIndex,pairRejections:assessed.map(x=>({reason:x.reason,configEntryIndex:x.configIndex??null}))});
  }
  if(new Set(valid.map(identity)).size!==1)return noPlay('AMBIGUOUS_LATEST_SLJP1_SERVER_EVIDENCE',{sourceName,gameId:target,pairCount:pairs.length,latestPairedTickerEntryIndex:latestTickerIndex,latestValidPairCount:valid.length});
  const chosen=valid[0],validation=chosen.validation;
  return {version:SINGLE_VERSION,valid:true,reason:'EXACT_GAME_SESSION_AND_SLJP1_SERVER_BINDING_VERIFIED',gameId:target,sourceName,captureEpochSeconds:chosen.captureEpochSeconds,pairedServerEvidenceCount:pairs.length,latestPairedTickerPollSelected:true,launcherEntryIndex:chosen.launcher.index,configEntryIndex:chosen.configIndex,tickerEntryIndex:chosen.tickerIndex,expectedBetfairImsCasino:validation.expectedBetfairImsCasino,tickerEndpoint:endpointShape(validation.tickerEndpoint),configSourceUrl:endpointShape(validation.configSourceUrl),snapshot:validation.snapshot,execution:{decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0},hardGuards:{onlineOnly:true,nonPromoOnly:true,passiveHarOnly:true,rawHarNeverEmitted:true,exactTargetLauncherRequired:true,latestPostLaunchBetfairInitialResourcesRequired:true,latestPairedTickerPollMustOwnSnapshot:true,olderValidPollCannotOverrideLaterInvalidOrDifferentGamePoll:true,multipleNormalTickerPollsSupported:true,exactServerValidatorRequired:true,singleSessionCannotProveCrossGameNetwork:true,noWagerProbe:true,noAutomaticBetting:true}};
}

export function evaluateBetfairSportingCrossGameNetworkBinding({leftHar,rightHar,leftGameId,rightGameId,leftSourceName='left.har',rightSourceName='right.har',maxCaptureSkewSeconds=30,maxFeedAgeIntervals=2}={}){
  const leftId=text(leftGameId),rightId=text(rightGameId),maxSkew=finite(maxCaptureSkewSeconds);
  if(!leftId||!rightId||leftId===rightId)return noPlay('TWO_DISTINCT_SPORTING_GAME_IDS_REQUIRED');
  if(maxSkew===null||maxSkew<0||maxSkew>60)return noPlay('INVALID_CAPTURE_SKEW_POLICY',{maxAllowedCaptureSkewSeconds:60});
  const left=validateBetfairSportingHarForExactGame(leftHar,{gameId:leftId,sourceName:leftSourceName,maxFeedAgeIntervals});
  if(left.valid!==true)return noPlay('LEFT_GAME_SESSION_INVALID',{left:safeSnapshot(left),leftReason:left.reason||null});
  const right=validateBetfairSportingHarForExactGame(rightHar,{gameId:rightId,sourceName:rightSourceName,maxFeedAgeIntervals});
  if(right.valid!==true)return noPlay('RIGHT_GAME_SESSION_INVALID',{left:safeSnapshot(left),right:safeSnapshot(right),rightReason:right.reason||null});
  const a=left.captureEpochSeconds<=right.captureEpochSeconds?left:right,b=a===left?right:left;
  const captureSkewSeconds=Math.abs(right.captureEpochSeconds-left.captureEpochSeconds);
  const sameIms=!!lower(left.expectedBetfairImsCasino)&&lower(left.expectedBetfairImsCasino)===lower(right.expectedBetfairImsCasino);
  const sameTicker=!!left.tickerEndpoint&&left.tickerEndpoint===right.tickerEndpoint;
  const sameDailyScope=left.snapshot?.code==='sljp-1'&&right.snapshot?.code==='sljp-1'&&upper(left.snapshot?.currency)==='EUR'&&upper(right.snapshot?.currency)==='EUR'&&left.snapshot?.local===0&&right.snapshot?.local===0;
  const sameDeadline=finite(left.snapshot?.guaranteedHitTime)!==null&&finite(left.snapshot?.guaranteedHitTime)===finite(right.snapshot?.guaranteedHitTime);
  const sameWinCount=finite(left.snapshot?.winCount)!==null&&finite(left.snapshot?.winCount)===finite(right.snapshot?.winCount);
  const sameExecInterval=finite(left.snapshot?.requestExecInterval)!==null&&finite(left.snapshot?.requestExecInterval)===finite(right.snapshot?.requestExecInterval);
  const forwardServerTime=finite(a.snapshot?.gameTimestamp)!==null&&finite(b.snapshot?.gameTimestamp)!==null&&finite(b.snapshot.gameTimestamp)>=finite(a.snapshot.gameTimestamp);
  const nondecreasingAmount=finite(a.snapshot?.amount)!==null&&finite(b.snapshot?.amount)!==null&&finite(b.snapshot.amount)>=finite(a.snapshot.amount);
  const captureSkewWithinPolicy=captureSkewSeconds<=maxSkew;
  const exactSharedSljp1NetworkBindingVerified=sameIms&&sameTicker&&sameDailyScope&&sameDeadline&&sameWinCount&&sameExecInterval&&forwardServerTime&&nondecreasingAmount&&captureSkewWithinPolicy;
  return {version:VERSION,valid:true,reason:exactSharedSljp1NetworkBindingVerified?'EXACT_SHARED_BETFAIR_SLJP1_NETWORK_BINDING_VERIFIED':'CROSS_GAME_NETWORK_EQUIVALENCE_NOT_PROVEN',left:safeSnapshot(left),right:safeSnapshot(right),captureSkewSeconds,maxCaptureSkewSeconds:maxSkew,sameImsCasino:sameIms,sameTickerEndpoint:sameTicker,sameDailyScope,sameGuaranteedHitTime:sameDeadline,sameWinCount,sameRequestExecInterval:sameExecInterval,forwardServerTime,nondecreasingAmount,captureSkewWithinPolicy,exactSharedSljp1NetworkBindingVerified,crossGameExecutionEquivalentVerified:false,scientificUse:'A true result proves that two distinct current Betfair Spain Sporting Legends real-money game sessions are observing the same exact fresh global EUR sljp-1 server binding within a bounded capture window. It does not prove equal base RTP, equal stake menu, equal per-euro jackpot hazard, or authorize a wager. Those execution properties remain game-specific.',execution:{decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0},hardGuards:{onlineOnly:true,nonPromoOnly:true,passiveHarOnly:true,rawHarNeverEmitted:true,distinctExactGameLaunchersRequired:true,latestPairedTickerPollSelectedOnBothGames:true,sameBetfairImsRequired:true,sameTickerEndpointRequired:true,sameSljp1EurGlobalScopeRequired:true,sameDeadlineAndWinCountRequired:true,nondecreasingServerStateRequired:true,boundedCaptureSkewRequired:true,sharedNetworkDoesNotImplyEqualRtp:true,sharedNetworkDoesNotImplyEqualStake:true,sharedNetworkDoesNotImplyEqualHazard:true,crossGameBindingCannotAuthorizeGreen:true,noWagerProbe:true,noAutomaticBetting:true}};
}

export const BETFAIR_SPORTING_CROSS_GAME_CANDIDATE_IDS=[...SUPPORTED_GAME_IDS];

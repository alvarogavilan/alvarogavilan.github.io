import {analyzeBetfairSportingHar} from '../../edge-backend/src/betfair-sporting-har-discovery-v1.mjs';
import {validateBetfairSportingServerSnapshot} from './betfair-sporting-server-binding-validator-v1.mjs';

const SUPPORTED_GAME_IDS=new Set([
  'ap-mccoy-sporting-legends-cptn',
  'ronnie-osullivan-sporting-legends-cptn',
  'frankie-dettori-sporting-legends-cptn',
  'roberto-carlos-sl-cptn',
]);
const finite=v=>{if(v===null||v===undefined||v===''||typeof v==='boolean')return null;const n=Number(v);return Number.isFinite(n)?n:null;};
const text=v=>typeof v==='string'&&v.trim()?v.trim():null;
const lower=v=>text(v)?.toLowerCase()??null;
const upper=v=>text(v)?.toUpperCase()??null;
const endpointShape=v=>{try{const u=new URL(String(v||''));return u.protocol==='https:'?`${u.origin}${u.pathname}`:null;}catch{return null;}};
const isoEpoch=v=>{const ms=Date.parse(String(v||''));return Number.isFinite(ms)?ms/1000:null;};
function betfairInitialResources(url){try{const u=new URL(String(url||'')),h=u.hostname.toLowerCase();return u.protocol==='https:'&&(h==='betfair.es'||h.endsWith('.betfair.es'))&&/\/initialresources(?:\/|$)/i.test(u.pathname);}catch{return false;}}
function latestPrecedingLauncher(discovery,index){return (discovery?.discovery?.betfairRealCasinoLauncherBindings||[]).filter(x=>Number.isInteger(x?.index)&&x.index<index).sort((a,b)=>b.index-a.index)[0]||null;}
function latestSessionConfig(discovery,launcherIndex,tickerIndex){return (discovery?.discovery?.relevantEntries||[]).filter(x=>Number.isInteger(x?.index)&&x.index>launcherIndex&&x.index<tickerIndex&&betfairInitialResources(x?.request?.url)).sort((a,b)=>b.index-a.index)[0]||null;}
function noPlay(reason,extra={}){return {version:'betfair-sporting-cross-game-network-validator-v1',valid:false,reason,exactSharedSljp1NetworkBindingVerified:false,crossGameExecutionEquivalentVerified:false,execution:{decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0},...extra};}
function safeSnapshot(v){const s=v?.snapshot||{};return {gameId:v?.gameId||null,captureEpochSeconds:v?.captureEpochSeconds??null,expectedBetfairImsCasino:v?.expectedBetfairImsCasino||null,tickerEndpoint:endpointShape(v?.tickerEndpoint),configSourceEndpoint:endpointShape(v?.configSourceUrl),launcherEntryIndex:v?.launcherEntryIndex??null,configEntryIndex:v?.configEntryIndex??null,tickerEntryIndex:v?.tickerEntryIndex??null,snapshot:{code:s.code||null,currency:s.currency||null,local:s.local??null,providerScope:s.providerScope||null,amount:s.amount??null,guaranteedHitTime:s.guaranteedHitTime??null,gameTimestamp:s.gameTimestamp??null,winCount:s.winCount??null,requestExecInterval:s.requestExecInterval??null,requestCasino:s.requestCasino||null,instanceCode:s.instanceCode||null}};}

export function validateBetfairSportingHarForExactGame(har,{gameId,sourceName='capture.har',maxFeedAgeIntervals=2}={}){
  const target=text(gameId);
  if(!target||!SUPPORTED_GAME_IDS.has(target))return noPlay('UNSUPPORTED_OR_MISSING_SPORTING_GAME_ID',{sourceName,gameId:target});
  let discovery;
  try{discovery=analyzeBetfairSportingHar(har,{sourceName});}catch{return noPlay('HAR_PARSE_OR_DISCOVERY_FAILED',{sourceName,gameId:target});}
  const pairs=discovery?.discovery?.pairedServerEvidence||[];
  if(pairs.length!==1)return noPlay(pairs.length?'AMBIGUOUS_SLJP1_SERVER_EVIDENCE':'SLJP1_SERVER_EVIDENCE_NOT_FOUND',{sourceName,gameId:target,pairCount:pairs.length});
  const p=pairs[0],tickerIndex=Number.isInteger(p?.tickerEntryIndex)?p.tickerEntryIndex:null,configIndex=Number.isInteger(p?.configBinding?.sourceEntryIndex)?p.configBinding.sourceEntryIndex:null;
  if(tickerIndex===null||configIndex===null||configIndex>=tickerIndex)return noPlay('INVALID_CONFIG_TICKER_ORDER',{sourceName,gameId:target});
  const launcher=latestPrecedingLauncher(discovery,tickerIndex);
  if(!launcher||launcher.gameId!==target)return noPlay('LATEST_PRECEDING_REAL_LAUNCHER_NOT_TARGET_GAME',{sourceName,gameId:target,observedGameId:launcher?.gameId||null});
  if(configIndex<=launcher.index)return noPlay('CONFIG_NOT_POST_TARGET_LAUNCH',{sourceName,gameId:target});
  const sessionConfig=latestSessionConfig(discovery,launcher.index,tickerIndex);
  if(!sessionConfig||sessionConfig.index!==configIndex)return noPlay('PAIRED_CONFIG_NOT_LATEST_POST_LAUNCH_INITIAL_RESOURCES',{sourceName,gameId:target});
  const captureEpochSeconds=isoEpoch(p.startedDateTime);
  if(captureEpochSeconds===null)return noPlay('TICKER_CAPTURE_TIME_MISSING',{sourceName,gameId:target});
  const validation=validateBetfairSportingServerSnapshot({configBinding:p.configBinding,tickerXml:p.tickerXml,responseUrl:p.responseUrl,nowEpochSeconds:captureEpochSeconds,maxFeedAgeIntervals});
  if(validation?.valid!==true)return noPlay('SERVER_SNAPSHOT_NOT_EXACTLY_VALIDATED',{sourceName,gameId:target,serverReason:validation?.reason||null});
  return {version:'betfair-sporting-cross-game-single-session-v1',valid:true,reason:'EXACT_GAME_SESSION_AND_SLJP1_SERVER_BINDING_VERIFIED',gameId:target,sourceName,captureEpochSeconds,launcherEntryIndex:launcher.index,configEntryIndex:configIndex,tickerEntryIndex:tickerIndex,expectedBetfairImsCasino:validation.expectedBetfairImsCasino,tickerEndpoint:endpointShape(validation.tickerEndpoint),configSourceUrl:endpointShape(validation.configSourceUrl),snapshot:validation.snapshot,execution:{decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0},hardGuards:{onlineOnly:true,nonPromoOnly:true,passiveHarOnly:true,rawHarNeverEmitted:true,exactTargetLauncherRequired:true,latestPostLaunchBetfairInitialResourcesRequired:true,exactServerValidatorRequired:true,singleSessionCannotProveCrossGameNetwork:true,noWagerProbe:true,noAutomaticBetting:true}};
}

export function evaluateBetfairSportingCrossGameNetworkBinding({leftHar,rightHar,leftGameId,rightGameId,leftSourceName='left.har',rightSourceName='right.har',maxCaptureSkewSeconds=30,maxFeedAgeIntervals=2}={}){
  const leftId=text(leftGameId),rightId=text(rightGameId),maxSkew=finite(maxCaptureSkewSeconds);
  if(!leftId||!rightId||leftId===rightId)return noPlay('TWO_DISTINCT_SPORTING_GAME_IDS_REQUIRED');
  if(maxSkew===null||maxSkew<0||maxSkew>60)return noPlay('INVALID_CAPTURE_SKEW_POLICY',{maxAllowedCaptureSkewSeconds:60});
  const left=validateBetfairSportingHarForExactGame(leftHar,{gameId:leftId,sourceName:leftSourceName,maxFeedAgeIntervals});
  if(left.valid!==true)return noPlay('LEFT_GAME_SESSION_INVALID',{left:safeSnapshot(left)});
  const right=validateBetfairSportingHarForExactGame(rightHar,{gameId:rightId,sourceName:rightSourceName,maxFeedAgeIntervals});
  if(right.valid!==true)return noPlay('RIGHT_GAME_SESSION_INVALID',{left:safeSnapshot(left),right:safeSnapshot(right)});
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
  return {version:'betfair-sporting-cross-game-network-validator-v1',valid:true,reason:exactSharedSljp1NetworkBindingVerified?'EXACT_SHARED_BETFAIR_SLJP1_NETWORK_BINDING_VERIFIED':'CROSS_GAME_NETWORK_EQUIVALENCE_NOT_PROVEN',left:safeSnapshot(left),right:safeSnapshot(right),captureSkewSeconds,maxCaptureSkewSeconds:maxSkew,sameImsCasino:sameIms,sameTickerEndpoint:sameTicker,sameDailyScope,sameGuaranteedHitTime:sameDeadline,sameWinCount,sameRequestExecInterval:sameExecInterval,forwardServerTime,nondecreasingAmount,captureSkewWithinPolicy,exactSharedSljp1NetworkBindingVerified,crossGameExecutionEquivalentVerified:false,scientificUse:'A true result proves that two distinct current Betfair Spain Sporting Legends real-money game sessions are observing the same exact fresh global EUR sljp-1 server binding within a bounded capture window. It does not prove equal base RTP, equal stake menu, equal per-euro jackpot hazard, or authorize a wager. Those execution properties remain game-specific.',execution:{decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0},hardGuards:{onlineOnly:true,nonPromoOnly:true,passiveHarOnly:true,rawHarNeverEmitted:true,distinctExactGameLaunchersRequired:true,sameBetfairImsRequired:true,sameTickerEndpointRequired:true,sameSljp1EurGlobalScopeRequired:true,sameDeadlineAndWinCountRequired:true,nondecreasingServerStateRequired:true,boundedCaptureSkewRequired:true,sharedNetworkDoesNotImplyEqualRtp:true,sharedNetworkDoesNotImplyEqualStake:true,sharedNetworkDoesNotImplyEqualHazard:true,crossGameBindingCannotAuthorizeGreen:true,noWagerProbe:true,noAutomaticBetting:true}};
}

export const BETFAIR_SPORTING_CROSS_GAME_CANDIDATE_IDS=[...SUPPORTED_GAME_IDS];

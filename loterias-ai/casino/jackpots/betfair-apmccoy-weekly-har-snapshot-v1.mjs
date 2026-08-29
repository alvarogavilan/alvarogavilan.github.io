import {analyzeBetfairSportingHar} from '../../edge-backend/src/betfair-sporting-har-discovery-v1.mjs';
import {validateBetfairSportingServerSnapshot} from './betfair-sporting-server-binding-validator-v1.mjs';

const VERSION='betfair-apmccoy-weekly-har-snapshot-v1';
const EXACT_GAME_ID='ap-mccoy-sporting-legends-cptn';
const REQUIRED_CODE='sljp-2';
const text=v=>typeof v==='string'&&v.trim()?v.trim():null;
const finite=v=>{if(v===null||v===undefined||v===''||typeof v==='boolean')return null;const n=Number(v);return Number.isFinite(n)?n:null;};
const endpointShape=v=>{try{const u=new URL(String(v||''));return `${u.origin}${u.pathname}`;}catch{return null;}};
const isoEpochSeconds=v=>{const s=text(v);if(!s)return null;const ms=Date.parse(s);return Number.isFinite(ms)?ms/1000:null;};
function betfairInitialResourcesUrl(url){try{const u=new URL(String(url||'')),h=u.hostname.toLowerCase();return u.protocol==='https:'&&(h==='betfair.es'||h.endsWith('.betfair.es'))&&/\/initialresources(?:\/|$)/i.test(u.pathname);}catch{return false;}}
function execution(){return {decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0};}
function fail(reason,extra={}){return {version:VERSION,valid:false,reason,requiredCode:REQUIRED_CODE,usableForWeeklyResearch:false,usableForExecution:false,execution:execution(),...extra};}
function latestPrecedingRealCasinoLauncher(discovery,tickerEntryIndex){
  const all=discovery?.discovery?.betfairRealCasinoLauncherBindings||[];
  return all.filter(x=>Number.isInteger(x?.index)&&x.index<tickerEntryIndex).sort((a,b)=>b.index-a.index)[0]||null;
}
function latestPostLaunchInitialResources(discovery,launcherEntryIndex,tickerEntryIndex){
  const relevant=discovery?.discovery?.relevantEntries||[];
  return relevant.filter(r=>Number.isInteger(r?.index)&&r.index>launcherEntryIndex&&r.index<tickerEntryIndex&&betfairInitialResourcesUrl(r?.request?.url)).sort((a,b)=>b.index-a.index)[0]||null;
}
function identity(x){const s=x?.validation?.snapshot||{};return JSON.stringify([x?.configEntryIndex,x?.validation?.expectedBetfairImsCasino,endpointShape(x?.validation?.tickerEndpoint),s.code,s.currency,s.local,s.amount,s.guaranteedHitTime,s.gameTimestamp,s.winCount,s.requestExecInterval,s.requestCasino,s.instanceCode]);}
function assess(discovery,p,{maxFeedAgeIntervals,maxCaptureTimeArgumentSkewSeconds,nowEpochSeconds}){
  const tickerEntryIndex=Number.isInteger(p?.tickerEntryIndex)?p.tickerEntryIndex:null;
  const configEntryIndex=Number.isInteger(p?.configBinding?.sourceEntryIndex)?p.configBinding.sourceEntryIndex:null;
  if(tickerEntryIndex===null||configEntryIndex===null||configEntryIndex>=tickerEntryIndex)return {ok:false,reason:'CONFIG_BINDING_DOES_NOT_PRECEDE_WEEKLY_TICKER'};
  const launcher=latestPrecedingRealCasinoLauncher(discovery,tickerEntryIndex);
  if(!launcher)return {ok:false,reason:'REAL_CASINO_LAUNCHER_DOES_NOT_PRECEDE_WEEKLY_TICKER'};
  if(launcher.gameId!==EXACT_GAME_ID)return {ok:false,reason:'LATEST_REAL_CASINO_LAUNCHER_NOT_AP_MCCOY'};
  if(configEntryIndex<=launcher.index)return {ok:false,reason:'CONFIG_BINDING_NOT_POST_AP_MCCOY_LAUNCH'};
  const latestConfig=latestPostLaunchInitialResources(discovery,launcher.index,tickerEntryIndex);
  if(!latestConfig)return {ok:false,reason:'POST_LAUNCH_BETFAIR_INITIAL_RESOURCES_NOT_FOUND'};
  if(latestConfig.index!==configEntryIndex)return {ok:false,reason:'PAIRED_CONFIG_IS_NOT_LATEST_POST_LAUNCH_INITIAL_RESOURCES'};
  const captureEpochSeconds=isoEpochSeconds(p.startedDateTime);
  if(captureEpochSeconds===null)return {ok:false,reason:'WEEKLY_TICKER_HAR_CAPTURE_TIME_MISSING_OR_INVALID'};
  const suppliedNow=finite(nowEpochSeconds),maxSkew=finite(maxCaptureTimeArgumentSkewSeconds);
  if(!(maxSkew>=0))return {ok:false,reason:'INVALID_CAPTURE_TIME_SKEW_POLICY'};
  if(suppliedNow!==null&&Math.abs(suppliedNow-captureEpochSeconds)>maxSkew)return {ok:false,reason:'CAPTURE_TIME_ARGUMENT_MISMATCH'};
  const validation=validateBetfairSportingServerSnapshot({configBinding:p.configBinding,tickerXml:p.tickerXml,responseUrl:p.responseUrl,nowEpochSeconds:captureEpochSeconds,maxFeedAgeIntervals,requiredCode:REQUIRED_CODE});
  if(validation.valid!==true)return {ok:false,reason:'WEEKLY_SERVER_SNAPSHOT_VALIDATION_FAILED',validation};
  return {ok:true,p,tickerEntryIndex,configEntryIndex,launcher,captureEpochSeconds,validation};
}

export function validateBetfairApMcCoyWeeklyHarSnapshot(har,{sourceName='apmccoy-weekly.har',nowEpochSeconds=null,maxFeedAgeIntervals=2,maxCaptureTimeArgumentSkewSeconds=2}={}){
  let discovery;try{discovery=analyzeBetfairSportingHar(har,{sourceName});}catch(error){return fail('HAR_PARSE_FAILED',{message:String(error?.message||error)});}
  if(discovery?.discovery?.exactApMcCoyRealLauncherBindingObserved!==true)return fail('EXACT_AP_MCCOY_REAL_LAUNCHER_BINDING_NOT_FOUND',{discovery});
  const pairs=discovery?.discovery?.pairedWeeklyServerEvidence||[];
  if(!pairs.length)return fail('PAIRED_WEEKLY_SERVER_EVIDENCE_NOT_FOUND',{discovery});
  const indexed=pairs.filter(p=>Number.isInteger(p?.tickerEntryIndex));
  if(!indexed.length)return fail('PAIRED_WEEKLY_SERVER_EVIDENCE_MISSING_TICKER_INDEX',{discovery});
  const latestTickerEntryIndex=Math.max(...indexed.map(p=>p.tickerEntryIndex));
  const latestPairs=indexed.filter(p=>p.tickerEntryIndex===latestTickerEntryIndex);
  const assessed=latestPairs.map(p=>assess(discovery,p,{nowEpochSeconds,maxFeedAgeIntervals,maxCaptureTimeArgumentSkewSeconds}));
  const valid=assessed.filter(x=>x.ok===true);
  if(!valid.length)return fail('LATEST_WEEKLY_PAIRED_SERVER_EVIDENCE_NOT_SESSION_VALID',{discovery,latestPairedTickerEntryIndex:latestTickerEntryIndex,pairRejections:assessed.map(x=>({reason:x.reason}))});
  const ids=new Set(valid.map(identity));
  if(ids.size!==1)return fail('AMBIGUOUS_LATEST_WEEKLY_PAIRED_SERVER_EVIDENCE',{latestValidPairCount:valid.length});
  const chosen=valid[0],v=chosen.validation,s=v.snapshot||{};
  return {
    version:VERSION,valid:true,reason:'EXACT_AP_MCCOY_WEEKLY_SLJP2_SERVER_SNAPSHOT_VERIFIED_RESEARCH_ONLY',requiredCode:REQUIRED_CODE,
    target:{operator:'Betfair Spain',title:'AP McCoy Sporting Legends™',gameId:EXACT_GAME_ID,tier:'WEEKLY'},
    sourceName,captureStartedDateTime:chosen.p.startedDateTime,captureEpochSeconds:chosen.captureEpochSeconds,
    exactApMcCoyRealLauncherBindingVerified:true,latestPrecedingRealCasinoLauncherIsExactApMcCoy:true,latestPostLaunchInitialResourcesBindingVerified:true,
    expectedBetfairImsCasino:v.expectedBetfairImsCasino,tickerEndpoint:endpointShape(v.tickerEndpoint),configSourceUrl:endpointShape(v.configSourceUrl),
    snapshot:{code:s.code??null,tier:s.tier??null,currency:s.currency??null,local:s.local??null,providerScope:s.providerScope??null,instanceCode:s.instanceCode??null,amount:s.amount??null,guaranteedHitTime:s.guaranteedHitTime??null,gameTimestamp:s.gameTimestamp??null,winCount:s.winCount??null,requestExecInterval:s.requestExecInterval??null},
    freshWeeklyAmountExactVerified:v.currentWeeklyAmountExactVerified===true,currentGuaranteedHitTimeExactVerified:v.currentGuaranteedHitTimeExactVerified===true,
    currentSnapshotCannotProveOverdueByItself:true,weeklyProspectiveProtocolApproved:false,usableForWeeklyResearch:true,usableForExecution:false,
    scientificUse:'Recovers one exact current Betfair Spain AP McCoy Weekly sljp-2 server snapshot from a passive HAR using the same launcher, latest post-launch initialResources, configured ticker endpoint, request-casino echo, EUR GLOBAL local=0 and freshness requirements used by the Daily chain. It intentionally does not inherit the frozen Daily prospective ledger, race bound or execution authority.',
    execution:execution(),
    hardGuards:{onlineOnly:true,nonPromoOnly:true,offlineOnly:true,passiveHarOnly:true,exactApMcCoyLauncherRequired:true,latestPostLaunchConfigRequired:true,exactWeeklySljp2Required:true,eurGlobalLocal0Required:true,freshServerTimestampRequired:true,singleSnapshotCannotProveOverdue:true,dailyProspectiveEvidenceCannotTransferToWeekly:true,weeklyCannotAuthorizeExecution:true,noWagerProbe:true,noAutomaticBetting:true,realMoneyAllowed:false}
  };
}

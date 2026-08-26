import {analyzeBetfairSportingHar} from './betfair-sporting-har-discovery-v1.mjs';
import {analyzeBetfairSportingWebtickersRequestSemantics} from './betfair-sporting-webtickers-request-semantics-v1.mjs';

const SUPPORTED_GAME_IDS=new Set([
  'ap-mccoy-sporting-legends-cptn',
  'ronnie-osullivan-sporting-legends-cptn',
  'frankie-dettori-sporting-legends-cptn',
  'roberto-carlos-sl-cptn',
]);
const clean=v=>String(v??'').trim();
const lower=v=>clean(v).toLowerCase();
function endpointShape(url){try{const u=new URL(clean(url));return `${u.origin}${u.pathname}`;}catch{return null;}}
function normalizedPort(u){return u.port||((u.protocol==='https:'||u.protocol==='wss:')?'443':u.protocol==='http:'||u.protocol==='ws:'?'80':'');}
function compatibleConfiguredEndpoint(configured,observed){
  try{
    const a=new URL(clean(configured)),b=new URL(clean(observed));
    if(a.protocol!=='https:')return false;
    const sameHost=a.hostname.toLowerCase()===b.hostname.toLowerCase(),samePort=normalizedPort(a)===normalizedPort(b),samePath=a.pathname===b.pathname;
    if(!(sameHost&&samePort&&samePath))return false;
    return b.protocol==='https:'||b.protocol==='wss:';
  }catch{return false;}
}
function betfairInitialResources(url){try{const u=new URL(clean(url)),h=u.hostname.toLowerCase();return u.protocol==='https:'&&(h==='betfair.es'||h.endsWith('.betfair.es'))&&/\/initialresources(?:\/|$)/i.test(u.pathname);}catch{return false;}}
function latestPrecedingLauncher(discovery,index){return (discovery?.discovery?.betfairRealCasinoLauncherBindings||[]).filter(x=>Number.isInteger(x?.index)&&x.index<index).sort((a,b)=>b.index-a.index)[0]||null;}
function latestInitialResources(discovery,launcherIndex,entryIndex){return (discovery?.discovery?.relevantEntries||[]).filter(x=>Number.isInteger(x?.index)&&x.index>launcherIndex&&x.index<entryIndex&&betfairInitialResources(x?.request?.url)).sort((a,b)=>b.index-a.index)[0]||null;}
function safeObservation(x){return {entryIndex:x?.entryIndex??null,startedDateTime:x?.startedDateTime||null,source:x?.source||null,method:x?.method||null,endpoint:endpointShape(x?.endpoint),configuredWebSocketTransportUpgradeObserved:x?.configuredWebSocketTransportUpgradeObserved===true,expectedBetfairImsCasino:x?.expectedBetfairImsCasino||null,infoGameBased:x?.infoGameBased===true,casinoMatches:x?.casinoMatches===true,gameMatches:x?.gameMatches===true,currencyEur:x?.currencyEur===true,localGlobal:x?.localGlobal===true,instanceCodeConsistent:x?.instanceCodeConsistent===true,requestContractSemanticsSupportedByProviderSpec:x?.requestContractSemanticsSupportedByProviderSpec===true};}
function fail(reason,extra={}){return {version:'betfair-sporting-webtickers-target-session-v1',valid:false,reason,exactTargetSessionConfiguredSljp1TransportVerified:false,modernResponseSemanticsVerified:false,usableForOverduePair:false,execution:{decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0},...extra};}

export function analyzeBetfairSportingWebtickersTargetSession(har,{gameId,sourceName='capture.har'}={}){
  const target=clean(gameId);
  if(!target||!SUPPORTED_GAME_IDS.has(target))return fail('UNSUPPORTED_OR_MISSING_SPORTING_GAME_ID',{sourceName,gameId:target||null});
  let discovery,semantics;
  try{discovery=analyzeBetfairSportingHar(har,{sourceName});}catch{return fail('HAR_DISCOVERY_FAILED',{sourceName,gameId:target});}
  try{semantics=analyzeBetfairSportingWebtickersRequestSemantics(har,{sourceName});}catch{return fail('REQUEST_SEMANTICS_FAILED',{sourceName,gameId:target});}
  if(semantics?.valid===false)return fail(semantics.reason||'REQUEST_SEMANTICS_FAILED',{sourceName,gameId:target});
  const matches=[];
  for(const obs of semantics?.requestSemanticObservations||[]){
    if(obs?.requestContractSemanticsSupportedByProviderSpec!==true||obs?.ambiguityDetected===true)continue;
    if(!Number.isInteger(obs?.entryIndex))continue;
    const launcher=latestPrecedingLauncher(discovery,obs.entryIndex);
    if(!launcher||launcher.gameId!==target)continue;
    const initial=latestInitialResources(discovery,launcher.index,obs.entryIndex);
    if(!initial)continue;
    const candidates=(discovery?.discovery?.configBindingCandidates||[]).filter(b=>b?.sourceEntryIndex===initial.index);
    const normalized=[];
    for(const b of candidates){
      const casino=clean(b?.jackpotsCasino),configuredEndpoint=endpointShape(b?.tickerUrl);
      if(!casino||!configuredEndpoint)continue;
      const k=`${lower(casino)}|${configuredEndpoint}`;
      if(!normalized.some(x=>x.key===k))normalized.push({key:k,casino,configuredEndpoint,instanceCode:clean(b?.instanceCode)||null});
    }
    const expectedCasino=lower(obs?.expectedBetfairImsCasino),observedEndpoint=endpointShape(obs?.endpoint);
    const targetBindings=normalized.filter(b=>lower(b.casino)===expectedCasino&&compatibleConfiguredEndpoint(b.configuredEndpoint,observedEndpoint));
    if(targetBindings.length!==1)continue;
    const binding=targetBindings[0];
    matches.push({gameId:target,launcherEntryIndex:launcher.index,initialResourcesEntryIndex:initial.index,trafficEntryIndex:obs.entryIndex,configuredBindingCount:normalized.length,targetBindingMatchCount:1,alternateConfiguredBindingCount:Math.max(0,normalized.length-1),expectedBetfairImsCasino:binding.casino,configuredTickerEndpoint:binding.configuredEndpoint,observedTransportEndpoint:observedEndpoint,observedTransport:obs.configuredWebSocketTransportUpgradeObserved===true?'WSS_UPGRADE':'HTTPS',request:safeObservation(obs)});
  }
  const identities=new Map();
  for(const m of matches){const k=[m.launcherEntryIndex,m.initialResourcesEntryIndex,lower(m.expectedBetfairImsCasino),m.configuredTickerEndpoint].join('|');if(!identities.has(k))identities.set(k,m);}
  const distinct=[...identities.values()];
  if(distinct.length!==1)return fail(distinct.length?'AMBIGUOUS_TARGET_WEBTICKERS_SESSION':'EXACT_TARGET_WEBTICKERS_SESSION_NOT_RECOVERED',{sourceName,gameId:target,semanticMatchCount:matches.length,distinctSessionIdentityCount:distinct.length});
  const x=distinct[0];
  return {version:'betfair-sporting-webtickers-target-session-v1',valid:true,reason:'EXACT_TARGET_SESSION_CONFIGURED_SLJP1_TRANSPORT_VERIFIED',sourceName,gameId:target,semanticMatchCount:matches.length,distinctSessionIdentityCount:1,...x,exactTargetSessionConfiguredSljp1TransportVerified:true,modernResponseSemanticsVerified:false,usableForOverduePair:false,scientificUse:'Proves that the latest exact Betfair real-money launcher for the named Sporting Legends title is followed by a Betfair initialResources document containing one exact casino+webtickers binding and provider-documented outbound sljp-1 EUR local=0 request semantics on that configured HTTPS/WSS transport. It proves configuration/request routing only, not response-field semantics, current jackpot state, overdue status, RTP, stake eligibility or hazard.',execution:{decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0},hardGuards:{onlineOnly:true,nonPromoOnly:true,offlineOnly:true,noNetwork:true,exactTargetRealMoneyLauncherRequired:true,latestPostLaunchBetfairInitialResourcesRequired:true,uniqueTargetCasinoEndpointBindingRequired:true,providerDocumentedSljp1EurLocal0RequestRequired:true,httpsToWssUpgradeMustMatchHostPortPath:true,modernResponseSemanticsRemainUnverified:true,configurationProofCannotAuthorizeGreen:true,noWagerProbe:true,noAutomaticBetting:true}};
}

export const BETFAIR_SPORTING_WEBTICKERS_TARGET_GAME_IDS=[...SUPPORTED_GAME_IDS];

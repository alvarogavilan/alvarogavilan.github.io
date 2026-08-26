import {analyzeBetfairSportingHar} from './betfair-sporting-har-discovery-v1.mjs';
import {analyzeBetfairSportingWebtickersRequestSemantics} from './betfair-sporting-webtickers-request-semantics-v1.mjs';
import {analyzeBetfairSportingStructuredWebtickersRows} from './betfair-sporting-webtickers-structured-row-v1.mjs';

const EXACT_GAME_ID='ap-mccoy-sporting-legends-cptn';
const clean=v=>String(v??'').trim();
const lower=v=>clean(v).toLowerCase();

function endpointShape(url){
  try{const u=new URL(clean(url));return `${u.origin}${u.pathname}`;}catch{return null;}
}
function betfairInitialResources(url){
  try{
    const u=new URL(clean(url)),h=u.hostname.toLowerCase();
    return u.protocol==='https:'&&(h==='betfair.es'||h.endsWith('.betfair.es'))&&/\/initialresources(?:\/|$)/i.test(u.pathname);
  }catch{return false;}
}
function compatibleTransport(request,row){
  if(row?.payloadKind==='websocket-receive')return String(request?.source||'').startsWith('websocket-send:');
  return request?.source==='http-request';
}
function latestPrecedingLauncher(bindings,entryIndex){
  if(!Number.isInteger(entryIndex))return null;
  const preceding=(bindings||[]).filter(l=>Number.isInteger(l?.index)&&l.index<entryIndex).sort((a,b)=>b.index-a.index);
  return preceding[0]||null;
}
function latestSessionConfig(discovery,launcherIndex,entryIndex){
  const relevant=discovery?.discovery?.relevantEntries||[];
  const configEntries=relevant.filter(r=>
    Number.isInteger(r?.index)&&r.index>launcherIndex&&r.index<entryIndex&&betfairInitialResources(r?.request?.url)
  ).sort((a,b)=>b.index-a.index);
  const latest=configEntries[0];
  if(!latest)return {valid:false,reason:'NO_POST_LAUNCH_BETFAIR_INITIAL_RESOURCES'};
  const candidates=(discovery?.discovery?.configBindingCandidates||[]).filter(b=>b?.sourceEntryIndex===latest.index);
  const normalized=[];
  for(const b of candidates){
    const casino=clean(b?.jackpotsCasino),tickerEndpoint=endpointShape(b?.tickerUrl);
    if(!casino||!tickerEndpoint)continue;
    const key=`${lower(casino)}|${tickerEndpoint}`;
    if(!normalized.some(x=>x.key===key))normalized.push({key,casino,tickerEndpoint,sourceEntryIndex:latest.index});
  }
  if(normalized.length!==1)return {valid:false,reason:normalized.length?'AMBIGUOUS_LATEST_SESSION_CONFIG':'LATEST_SESSION_CONFIG_BINDING_NOT_RECOVERED',sourceEntryIndex:latest.index,candidates:normalized};
  return {valid:true,...normalized[0]};
}
function safeRequest(r){
  return {
    entryIndex:r.entryIndex,
    startedDateTime:r.startedDateTime||null,
    source:r.source||null,
    method:r.method||null,
    endpoint:r.endpoint||null,
    expectedBetfairImsCasino:r.expectedBetfairImsCasino||null,
    expectedInstanceCode:r.expectedInstanceCode||null,
    infoGameBased:r.infoGameBased===true,
    casinoMatches:r.casinoMatches===true,
    gameMatches:r.gameMatches===true,
    currencyEur:r.currencyEur===true,
    localGlobal:r.localGlobal===true,
    instanceCodeConsistent:r.instanceCodeConsistent===true,
    ambiguityDetected:r.ambiguityDetected===true,
    requestContractSemanticsSupportedByProviderSpec:r.requestContractSemanticsSupportedByProviderSpec===true,
    exactApMcCoySessionProvenanceVerified:r.exactApMcCoySessionProvenanceVerified===true,
    latestPrecedingRealCasinoLauncherIsExactApMcCoy:r.latestPrecedingRealCasinoLauncherIsExactApMcCoy===true,
    latestPostLaunchInitialResourcesBindingVerified:r.latestPostLaunchInitialResourcesBindingVerified===true,
    launcherEntryIndex:Number.isInteger(r.launcherEntryIndex)?r.launcherEntryIndex:null,
    initialResourcesEntryIndex:Number.isInteger(r.initialResourcesEntryIndex)?r.initialResourcesEntryIndex:null,
  };
}
function safeRow(c){
  return {
    entryIndex:c.entryIndex,
    startedDateTime:c.startedDateTime||null,
    payloadKind:c.payloadKind||null,
    payloadIndex:c.payloadIndex??null,
    objectPath:c.objectPath||null,
    configuredEndpoint:c.configuredEndpoint||null,
    expectedBetfairImsCasino:c.expectedBetfairImsCasino||null,
    exactConfiguredEndpointMatch:c.exactConfiguredEndpointMatch===true,
    configuredWebSocketTransportUpgradeObserved:c.configuredWebSocketTransportUpgradeObserved===true,
    requestCasinoMatchesConfiguredBinding:c.requestCasinoMatchesConfiguredBinding===true,
    responseCasinoMatchesConfiguredBinding:c.responseCasinoMatchesConfiguredBinding,
    row:c.row||null,
  };
}
function fail(reason,extra={}){
  return {
    version:'betfair-sporting-webtickers-correlated-session-v1.4-independent-request-provenance',
    mode:'OFFLINE_PASSIVE_EXACT_GAME_REQUEST_RESPONSE_CORRELATION_NO_PLAY',
    valid:false,reason,
    exactApMcCoyRealLauncherBindingObserved:false,
    correlatedExactDailyCandidateCount:0,
    correlatedExactDailyCandidates:[],
    ambiguousCorrelationCount:0,
    exactModernResponseSemanticsVerified:false,
    usableForOverduePair:false,
    execution:{decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0},
    ...extra,
  };
}

export function analyzeBetfairSportingCorrelatedWebtickersSession(har,{sourceName='capture.har'}={}){
  let obj;
  try{obj=typeof har==='string'?JSON.parse(har):har;}catch{return fail('HAR_PARSE_FAILED',{sourceName});}
  let discovery,requests,rows;
  try{discovery=analyzeBetfairSportingHar(obj,{sourceName});}catch{return fail('HAR_DISCOVERY_FAILED',{sourceName});}
  try{requests=analyzeBetfairSportingWebtickersRequestSemantics(obj,{sourceName});}catch{return fail('REQUEST_SEMANTICS_FAILED',{sourceName});}
  try{rows=analyzeBetfairSportingStructuredWebtickersRows(obj,{sourceName});}catch{return fail('STRUCTURED_ROW_DISCOVERY_FAILED',{sourceName});}

  const allLauncherBindings=discovery?.discovery?.betfairRealCasinoLauncherBindings||[];
  const exactLauncherBindings=discovery?.discovery?.exactApMcCoyRealLauncherBindings||[];
  const exactGame=exactLauncherBindings.length>0;
  const requestMatches=(requests?.requestSemanticObservations||[]).filter(r=>
    r?.requestContractSemanticsSupportedByProviderSpec===true&&
    r?.ambiguityDetected!==true&&
    r?.exactApMcCoySessionProvenanceVerified===true
  );
  const rowCandidates=rows?.structuredSljp1RowCandidates||[];
  const correlated=[];
  let ambiguousCorrelationCount=0,launcherOrderRejectedCount=0,staleExactLauncherRejectedCount=0,sessionConfigRejectedCount=0;

  for(const row of rowCandidates){
    const latestLauncher=latestPrecedingLauncher(allLauncherBindings,row?.entryIndex);
    if(!latestLauncher){launcherOrderRejectedCount++;continue;}
    if(latestLauncher.gameId!==EXACT_GAME_ID){staleExactLauncherRejectedCount++;continue;}

    const sessionConfig=latestSessionConfig(discovery,latestLauncher.index,row.entryIndex);
    const rowEndpoint=endpointShape(row.configuredEndpoint);
    if(!sessionConfig.valid||lower(sessionConfig.casino)!==lower(row.expectedBetfairImsCasino)||sessionConfig.tickerEndpoint!==rowEndpoint){sessionConfigRejectedCount++;continue;}

    const matches=requestMatches.filter(req=>
      req.entryIndex===row.entryIndex&&
      compatibleTransport(req,row)&&
      lower(req.expectedBetfairImsCasino)===lower(row.expectedBetfairImsCasino)&&
      req.launcherEntryIndex===latestLauncher.index&&
      req.initialResourcesEntryIndex===sessionConfig.sourceEntryIndex&&
      row.requestCasinoMatchesConfiguredBinding===true
    );
    if(matches.length!==1){if(matches.length>1)ambiguousCorrelationCount++;continue;}
    correlated.push({
      entryIndex:row.entryIndex,
      exactApMcCoyRealLauncherBindingObserved:true,
      exactApMcCoyRealLauncherPrecedesCorrelatedEntry:true,
      latestPrecedingRealCasinoLauncherIsExactApMcCoy:true,
      launcherEntryIndex:latestLauncher.index,
      latestPostLaunchBetfairInitialResourcesBindingVerified:true,
      initialResourcesEntryIndex:sessionConfig.sourceEntryIndex,
      independentRequestSessionProvenanceVerified:true,
      sameEntryRequestResponseCorrelation:true,
      compatibleTransportCorrelation:true,
      expectedBetfairImsCasino:row.expectedBetfairImsCasino||null,
      configuredEndpoint:rowEndpoint,
      request:safeRequest(matches[0]),
      responseRow:safeRow(row),
      providerDocumentedRequestSemanticsVerified:true,
      coLocatedStructuredSljp1ResponseObserved:true,
      exactModernResponseSemanticsVerified:false,
      usableForOverduePair:false,
    });
  }

  return {
    version:'betfair-sporting-webtickers-correlated-session-v1.4-independent-request-provenance',
    mode:'OFFLINE_PASSIVE_EXACT_GAME_REQUEST_RESPONSE_CORRELATION_NO_PLAY',
    sourceName,
    valid:true,
    exactApMcCoyRealLauncherBindingObserved:exactGame,
    exactApMcCoyRealLauncherBindingCount:exactLauncherBindings.length,
    betfairRealCasinoLauncherBindingCount:allLauncherBindings.length,
    exactSessionRequestSemanticMatchCount:requestMatches.length,
    structuredSljp1RowCandidateCount:rowCandidates.length,
    correlatedExactDailyCandidateCount:correlated.length,
    correlatedExactDailyCandidates:correlated,
    ambiguousCorrelationCount,
    launcherOrderRejectedCount,
    staleExactLauncherRejectedCount,
    sessionConfigRejectedCount,
    exactModernResponseSemanticsVerified:false,
    usableForOverduePair:false,
    scientificUse:'Requires independent agreement between the request-semantics analyzer and the correlation layer on the exact AP McCoy launcher and latest post-launch Betfair initialResources entry, then correlates that documented sljp-1 EUR local=0 request to a co-located structured response on the same compatible HTTP/WebSocket entry. Stale launcher/config provenance or disagreement between analyzers fails closed. Modern response schema semantics remain unverified and cannot authorize execution.',
    execution:{decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0},
    hardGuards:{onlineOnly:true,nonPromoOnly:true,offlineOnly:true,noNetwork:true,exactApMcCoyRealLauncherRequired:true,latestPrecedingRealCasinoLauncherMustBeExactApMcCoy:true,staleExactLauncherCannotAuthorizeLaterDifferentGameTraffic:true,latestPostLaunchBetfairInitialResourcesMustMatchTickerBinding:true,stalePreLaunchConfigCannotAuthorizeTicker:true,ambiguousLatestSessionConfigRejected:true,independentRequestSessionProvenanceMustAgree:true,sameLauncherAndInitialResourcesIndicesRequiredAcrossAnalyzers:true,sameEntryCorrelationRequired:true,compatibleTransportDirectionRequired:true,exactConfiguredBetfairCasinoRequired:true,ambiguousMultipleRequestMatchesRejected:true,modernResponseSemanticsCannotBeGuessed:true,correlationCannotAuthorizeGreen:true,noWagerProbe:true,noAutomaticBetting:true},
  };
}

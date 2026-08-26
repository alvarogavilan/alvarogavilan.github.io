import {analyzeBetfairSportingHar} from './betfair-sporting-har-discovery-v1.mjs';
import {analyzeBetfairSportingWebtickersRequestSemantics} from './betfair-sporting-webtickers-request-semantics-v1.mjs';
import {analyzeBetfairSportingStructuredWebtickersRows} from './betfair-sporting-webtickers-structured-row-v1.mjs';

const clean=v=>String(v??'').trim();
const lower=v=>clean(v).toLowerCase();

function compatibleTransport(request,row){
  if(row?.payloadKind==='websocket-receive')return String(request?.source||'').startsWith('websocket-send:');
  return request?.source==='http-request';
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
    version:'betfair-sporting-webtickers-correlated-session-v1',
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

  const exactGame=discovery?.discovery?.exactApMcCoyRealLauncherBindingObserved===true;
  const requestMatches=(requests?.requestSemanticObservations||[]).filter(r=>r?.requestContractSemanticsSupportedByProviderSpec===true&&r?.ambiguityDetected!==true);
  const rowCandidates=rows?.structuredSljp1RowCandidates||[];
  const correlated=[];
  let ambiguousCorrelationCount=0;

  for(const row of rowCandidates){
    const matches=requestMatches.filter(req=>
      req.entryIndex===row.entryIndex&&
      compatibleTransport(req,row)&&
      lower(req.expectedBetfairImsCasino)===lower(row.expectedBetfairImsCasino)&&
      row.requestCasinoMatchesConfiguredBinding===true
    );
    if(matches.length!==1){if(matches.length>1)ambiguousCorrelationCount++;continue;}
    correlated.push({
      entryIndex:row.entryIndex,
      exactApMcCoyRealLauncherBindingObserved:exactGame,
      sameEntryRequestResponseCorrelation:true,
      compatibleTransportCorrelation:true,
      expectedBetfairImsCasino:row.expectedBetfairImsCasino||null,
      request:safeRequest(matches[0]),
      responseRow:safeRow(row),
      providerDocumentedRequestSemanticsVerified:true,
      coLocatedStructuredSljp1ResponseObserved:true,
      exactModernResponseSemanticsVerified:false,
      usableForOverduePair:false,
    });
  }

  const usableCandidates=exactGame?correlated:[];
  return {
    version:'betfair-sporting-webtickers-correlated-session-v1',
    mode:'OFFLINE_PASSIVE_EXACT_GAME_REQUEST_RESPONSE_CORRELATION_NO_PLAY',
    sourceName,
    valid:true,
    exactApMcCoyRealLauncherBindingObserved:exactGame,
    requestSemanticMatchCount:requestMatches.length,
    structuredSljp1RowCandidateCount:rowCandidates.length,
    correlatedExactDailyCandidateCount:usableCandidates.length,
    correlatedExactDailyCandidates:usableCandidates,
    ambiguousCorrelationCount,
    exactModernResponseSemanticsVerified:false,
    usableForOverduePair:false,
    scientificUse:'Requires the exact AP McCoy real-money launcher in the same HAR, a provider-documented sljp-1 EUR local=0 request semantic match, and a co-located structured sljp-1 response row on the same network entry with compatible HTTP or WebSocket direction. This closes cross-entry and cross-transport correlation ambiguity but deliberately does not promote the modern response schema to server truth or overdue execution evidence.',
    execution:{decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0},
    hardGuards:{onlineOnly:true,nonPromoOnly:true,offlineOnly:true,noNetwork:true,exactApMcCoyRealLauncherRequired:true,sameEntryCorrelationRequired:true,compatibleTransportDirectionRequired:true,exactConfiguredBetfairCasinoRequired:true,ambiguousMultipleRequestMatchesRejected:true,modernResponseSemanticsCannotBeGuessed:true,correlationCannotAuthorizeGreen:true,noWagerProbe:true,noAutomaticBetting:true},
  };
}

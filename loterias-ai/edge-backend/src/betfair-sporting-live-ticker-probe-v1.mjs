import {runBetfairSportingPublicConfigProbe} from './betfair-sporting-public-config-probe-v1.mjs';
import {validateBetfairSportingServerSnapshot} from '../../casino/jackpots/betfair-sporting-server-binding-validator-v1.mjs';

const finite=v=>{if(v===null||v===undefined||v===''||typeof v==='boolean')return null;const n=Number(v);return Number.isFinite(n)?n:null;};
const text=v=>typeof v==='string'&&v.trim()?v.trim():null;

function safeEndpoint(url){
  try{
    const u=new URL(String(url||''));
    if(!['https:','wss:'].includes(u.protocol)||u.username||u.password)return null;
    return `${u.origin}${u.pathname}`;
  }catch{return null;}
}
function safeBinding(binding){
  if(!binding||typeof binding!=='object')return null;
  return {
    sourceUrl:safeEndpoint(binding.sourceUrl),
    jackpotsCasino:text(binding.jackpotsCasino),
    tickerUrl:safeEndpoint(binding.tickerUrl),
    instanceCode:text(binding.instanceCode),
    sameDocument:binding.sameDocument===true,
    sourceBetfairOwned:binding.sourceBetfairOwned===true,
    sourceInitialResources:binding.sourceInitialResources===true,
  };
}
function safeConfigProbeSummary(probe){
  const discovery=probe?.discovery||{};
  const bindings=Array.isArray(discovery.coLocatedBetfairConfigBindings)?discovery.coLocatedBetfairConfigBindings:[];
  return {
    version:probe?.version||null,
    observedAt:probe?.observedAt||null,
    bindingCandidateObserved:discovery.bindingCandidateObserved===true,
    coLocatedBetfairConfigBindingCount:bindings.length,
    coLocatedBetfairConfigBindings:bindings.map(safeBinding).filter(Boolean),
    exactBetfairSpainTickerImsBindingVerified:discovery.exactBetfairSpainTickerImsBindingVerified===true,
    currentSljp1RowRecovered:discovery.currentSljp1RowRecovered===true,
  };
}
function safeTickerFetch(fetchResult){
  if(!fetchResult||typeof fetchResult!=='object')return null;
  return {
    ok:fetchResult.ok===true,
    status:Number.isFinite(fetchResult.status)?fetchResult.status:null,
    requestedEndpoint:safeEndpoint(fetchResult.requestedUrl),
    finalEndpoint:safeEndpoint(fetchResult.finalUrl),
    contentType:fetchResult.contentType||null,
    truncated:fetchResult.truncated===true,
    error:fetchResult.error||null,
  };
}
function safeValidation(validation){
  if(!validation||typeof validation!=='object')return null;
  return {
    version:validation.version||null,
    valid:validation.valid===true,
    usableForOverduePair:validation.usableForOverduePair===true,
    reason:validation.reason||null,
    exactBetfairSpainTickerImsBindingVerified:validation.exactBetfairSpainTickerImsBindingVerified===true,
    currentSljp1RowRecovered:validation.currentSljp1RowRecovered===true,
    currentDailyAmountExactVerified:validation.currentDailyAmountExactVerified===true,
    currentGuaranteedHitTimeExactVerified:validation.currentGuaranteedHitTimeExactVerified===true,
    configSourceUrl:safeEndpoint(validation.configSourceUrl),
    tickerEndpoint:safeEndpoint(validation.tickerEndpoint),
    responseEndpoint:safeEndpoint(validation.responseUrl),
    expectedBetfairImsCasino:validation.expectedBetfairImsCasino||null,
    snapshot:validation.valid===true?validation.snapshot||null:null,
    feedAgeSeconds:validation.feedAgeSeconds??null,
    maxFeedAgeSeconds:validation.maxFeedAgeSeconds??null,
    decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0,
  };
}

function betfairInitialResourcesSource(url){
  try{
    const u=new URL(url),h=u.hostname.toLowerCase();
    return u.protocol==='https:'&&!u.username&&!u.password&&(h==='betfair.es'||h.endsWith('.betfair.es'))&&/\/initialresources(?:\/|$)/i.test(u.pathname);
  }catch{return false;}
}

function isModernWebtickersBinding(binding){
  if(!binding||binding.sameDocument!==true||binding.sourceBetfairOwned!==true||binding.sourceInitialResources!==true)return false;
  if(!betfairInitialResourcesSource(binding.sourceUrl)||!text(binding.jackpotsCasino)||!text(binding.tickerUrl))return false;
  try{
    const u=new URL(binding.tickerUrl);
    return u.protocol==='https:'&&!u.username&&!u.password&&/\/webtickers\/?$/i.test(u.pathname);
  }catch{return false;}
}

function fail(reason,extra={}){
  return {
    version:'betfair-sporting-live-ticker-probe-v1.4-public-output-redaction',
    observedAt:new Date().toISOString(),
    mode:'PUBLIC_PASSIVE_LIVE_TICKER_NO_PLAY',
    valid:false,
    reason,
    exactBetfairSpainTickerImsBindingVerified:false,
    currentSljp1RowRecovered:false,
    currentDailyAmountExactVerified:false,
    currentGuaranteedHitTimeExactVerified:false,
    decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0,
    hardGuards:{onlineOnly:true,nonPromoOnly:true,publicGetOnly:true,noLoginProbe:true,noCookies:true,noCredentials:true,noPost:true,noWagerProbe:true,noAutomaticBetting:true,singleSnapshotCannotAuthorizeGreen:true,configuredNewJackpotXmlEndpointOnly:true,arbitraryUrlInputDisabled:true,betfairInitialResourcesSourceReverified:true,configuredRoutingQueryPreservedInternally:true,publicOutputEndpointQueriesAndFragmentsRedacted:true,equivalentBindingCollapseRequiresIdenticalExactRequestUrl:true,modernWebtickersProtocolCannotBeGuessed:true},
    ...extra,
  };
}

export function buildExactSportingTickerUrl(configBinding){
  const b=configBinding;
  if(!b||b.sameDocument!==true||b.sourceBetfairOwned!==true||b.sourceInitialResources!==true)return null;
  if(!betfairInitialResourcesSource(b.sourceUrl))return null;
  const casino=text(b.jackpotsCasino),raw=text(b.tickerUrl);
  if(!casino||!raw)return null;
  try{
    const u=new URL(raw);
    if(u.protocol!=='https:'||u.username||u.password||!/\/new_jackpotxml\.php$/i.test(u.pathname))return null;
    u.hash='';
    // Preserve any operator-configured routing/query parameters internally. Only the documented
    // jackpot protocol fields are overwritten with the exact Sporting Daily request. Public
    // probe output strips every query/fragment before serialization.
    u.searchParams.set('info','1');
    u.searchParams.set('casino',casino);
    u.searchParams.set('game','sljp-1');
    u.searchParams.set('currency','eur');
    u.searchParams.set('local','0');
    if(text(b.instanceCode))u.searchParams.set('instanceCode',text(b.instanceCode));
    else u.searchParams.delete('instanceCode');
    return u.href;
  }catch{return null;}
}

function groupEquivalentExactBindings(bindings){
  const groups=new Map();
  for(const binding of Array.isArray(bindings)?bindings:[]){
    const exactUrl=buildExactSportingTickerUrl(binding);
    if(!exactUrl)continue;
    const key=exactUrl;
    if(!groups.has(key))groups.set(key,{exactUrl,bindings:[]});
    groups.get(key).bindings.push(binding);
  }
  return [...groups.values()];
}

async function fetchText(fetchImpl,url){
  try{
    const r=await fetchImpl(url,{method:'GET',redirect:'follow',headers:{accept:'application/xml,text/xml;q=0.9,*/*;q=0.2','accept-language':'es-ES,es;q=0.9,en;q=0.5'}});
    const body=await r.text();
    return {ok:r.ok===true,status:Number.isFinite(r.status)?r.status:null,requestedUrl:url,finalUrl:r.url||url,contentType:r.headers?.get?.('content-type')||null,text:String(body||'').slice(0,2_000_000),truncated:String(body||'').length>2_000_000};
  }catch(error){return {ok:false,status:null,requestedUrl:url,finalUrl:null,contentType:null,text:'',truncated:false,error:String(error?.message||error)};}
}

export async function runBetfairSportingLiveTickerProbe({
  configProbeRunner=runBetfairSportingPublicConfigProbe,
  fetchImpl=fetch,
  nowEpochSeconds=Math.floor(Date.now()/1000),
  maxFeedAgeIntervals=2,
}={}){
  const now=finite(nowEpochSeconds),maxIntervals=finite(maxFeedAgeIntervals);
  if(now===null||!(maxIntervals>=1))return fail('INVALID_FRESHNESS_POLICY');

  let configProbe;
  try{configProbe=await configProbeRunner();}catch(error){return fail('PUBLIC_CONFIG_PROBE_FAILED',{error:String(error?.message||error)});}
  const allBindings=Array.isArray(configProbe?.discovery?.coLocatedBetfairConfigBindings)?configProbe.discovery.coLocatedBetfairConfigBindings:[];
  const bindingGroups=groupEquivalentExactBindings(allBindings);
  const modernWebtickersBindings=allBindings.filter(isModernWebtickersBinding);
  if(bindingGroups.length!==1){
    const configProbeSummary=safeConfigProbeSummary(configProbe);
    if(bindingGroups.length===0&&modernWebtickersBindings.length>0)return fail('MODERN_WEBTICKERS_BINDING_OBSERVED_PROTOCOL_NOT_VERIFIED',{configProbe:configProbeSummary,bindingCount:modernWebtickersBindings.length,modernWebtickersBindings:modernWebtickersBindings.map(safeBinding).filter(Boolean),modernProtocolResearchRequired:true});
    return fail(bindingGroups.length?'AMBIGUOUS_EXACT_XML_BINDING':'EXACT_XML_BINDING_NOT_FOUND',{configProbe:configProbeSummary,bindingCount:bindingGroups.reduce((n,g)=>n+g.bindings.length,0),distinctExactRequestCount:bindingGroups.length,modernWebtickersBindingCount:modernWebtickersBindings.length});
  }

  const bindingGroup=bindingGroups[0];
  const configBinding=bindingGroup.bindings[0];
  const tickerRequestUrl=bindingGroup.exactUrl;
  const equivalentConfigSources=[...new Set(bindingGroup.bindings.map(b=>b.sourceUrl).filter(Boolean))];
  const tickerFetch=await fetchText(fetchImpl,tickerRequestUrl);
  if(!tickerFetch.ok||!tickerFetch.text)return fail('TICKER_FETCH_FAILED',{configProbe:safeConfigProbeSummary(configProbe),configBinding:safeBinding(configBinding),equivalentConfigSources:equivalentConfigSources.map(safeEndpoint).filter(Boolean),tickerFetch:safeTickerFetch(tickerFetch)});

  const validation=validateBetfairSportingServerSnapshot({
    configBinding,
    tickerXml:tickerFetch.text,
    responseUrl:tickerFetch.finalUrl||tickerRequestUrl,
    nowEpochSeconds:now,
    maxFeedAgeIntervals:maxIntervals,
  });
  if(validation.valid!==true)return fail('SERVER_SNAPSHOT_VALIDATION_FAILED',{configProbe:safeConfigProbeSummary(configProbe),configBinding:safeBinding(configBinding),equivalentConfigSources:equivalentConfigSources.map(safeEndpoint).filter(Boolean),tickerFetch:safeTickerFetch(tickerFetch),validation:safeValidation(validation)});

  return {
    version:'betfair-sporting-live-ticker-probe-v1.4-public-output-redaction',
    observedAt:new Date(now*1000).toISOString(),
    mode:'PUBLIC_PASSIVE_LIVE_TICKER_NO_PLAY',
    valid:true,
    reason:'EXACT_BETFAIR_SPORTING_SERVER_BINDING_AND_FRESH_SLJP1_SNAPSHOT_VERIFIED',
    configProbeSummary:safeConfigProbeSummary(configProbe),
    configBinding:safeBinding(configBinding),
    bindingProvenance:{equivalentConfigSourceCount:equivalentConfigSources.length,equivalentConfigSources:equivalentConfigSources.map(safeEndpoint).filter(Boolean),distinctExactRequestCount:1,modernWebtickersBindingCount:modernWebtickersBindings.length},
    tickerFetch:safeTickerFetch(tickerFetch),
    validation:safeValidation(validation),
    snapshot:validation.snapshot,
    exactBetfairSpainTickerImsBindingVerified:true,
    currentSljp1RowRecovered:true,
    currentDailyAmountExactVerified:true,
    currentGuaranteedHitTimeExactVerified:true,
    currentSnapshotCannotProveOverdueByItself:true,
    decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0,
    hardGuards:{onlineOnly:true,nonPromoOnly:true,publicGetOnly:true,noLoginProbe:true,noCookies:true,noCredentials:true,noPost:true,noWagerProbe:true,noAutomaticBetting:true,singleSnapshotCannotAuthorizeGreen:true,configuredNewJackpotXmlEndpointOnly:true,arbitraryUrlInputDisabled:true,exactSljp1EurLocal0Query:true,betfairInitialResourcesSourceReverified:true,configuredRoutingQueryPreservedInternally:true,publicOutputEndpointQueriesAndFragmentsRedacted:true,configuredProtocolFieldsOverriddenExactly:true,equivalentBindingCollapseRequiresIdenticalExactRequestUrl:true,distinctExactRequestsRemainAmbiguous:true,modernWebtickersProtocolCannotBeGuessed:true},
  };
}

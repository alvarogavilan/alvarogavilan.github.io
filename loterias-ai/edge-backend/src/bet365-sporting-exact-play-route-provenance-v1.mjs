const TARGETS=new Map([
  ['gpas_bgeorge_pop',{title:'Bobby George: Sporting Legends',playPath:null}],
  ['gpas_slblara_pop',{title:'Brian Lara: Sporting Legends',playPath:null}],
  ['gpas_slfbruno_pop',{title:'Frank Bruno: Sporting Legends',playPath:'/play/FrankBrunoSL'}],
]);
const clean=v=>String(v??'').replace(/\u0000/g,'').trim();
const lower=v=>clean(v).toLowerCase();
const finite=v=>{if(v===null||v===undefined||v===''||typeof v==='boolean')return null;const n=Number(v);return Number.isFinite(n)?n:null;};
const epoch=v=>{const ms=Date.parse(clean(v));return Number.isFinite(ms)?ms/1000:null;};
function decode(c){const raw=String(c?.text||'');if(!raw)return '';if(String(c?.encoding||'').toLowerCase()!=='base64')return raw;try{if(typeof Buffer!=='undefined')return Buffer.from(raw,'base64').toString('utf8');}catch{}return '';}
function urlParts(v){try{const u=new URL(clean(v));return {protocol:u.protocol,host:u.hostname.toLowerCase(),path:u.pathname.replace(/\/+$/,'')||'/'};}catch{return null;}}
function exactPublicRoute(v,path){const u=urlParts(v);return !!u&&u.protocol==='https:'&&u.host==='casino.bet365.es'&&u.path===path;}
function referrerUrls(entry){const out=[];for(const h of entry?.request?.headers||[]){if(/^referer$/i.test(clean(h?.name))&&h?.value)out.push(String(h.value));}return out;}
function routeEvidence(entry,path){if(exactPublicRoute(entry?.request?.url,path))return 'REQUEST_URL';if(referrerUrls(entry).some(v=>exactPublicRoute(v,path)))return 'REQUEST_REFERRER';return null;}
function providerCodeEvidence(entry,code){const needle=lower(code),hits=[];const req=entry?.request||{};if(lower(req.url).includes(needle))hits.push('REQUEST_URL');if(lower(req?.postData?.text).includes(needle))hits.push('REQUEST_BODY');const body=lower(decode(entry?.response?.content));if(body.includes(needle))hits.push('RESPONSE_BODY');for(const m of entry?._webSocketMessages||[]){if(lower(m?.data).includes(needle))hits.push(m?.type==='receive'?'WEBSOCKET_RECEIVE':'WEBSOCKET_OTHER');}return [...new Set(hits)];}
function fail(reason,extra={}){return {version:'bet365-sporting-exact-play-route-provenance-v1',valid:false,reason,exactBet365SpainPlayRouteObserved:false,exactProviderGameCodeObserved:false,exactFrontendProviderIdentityCandidateVerified:false,bet365LicenseeJackpotBindingVerified:false,servedTenCentEligibilityVerified:false,usableForExecution:false,execution:{decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0},...extra};}

export function verifyBet365SportingExactPlayRouteProvenance(har,{gameCode,sourceName='capture.har',maxRouteToProviderMarkerSeconds=120}={}){
  const target=lower(gameCode),meta=TARGETS.get(target);if(!meta)return fail('UNSUPPORTED_OR_MISSING_TARGET',{gameCode:target||null,sourceName});
  if(!meta.playPath)return fail('EXACT_CURRENT_PUBLIC_PLAY_ROUTE_NOT_FROZEN_FOR_TARGET',{gameCode:target,title:meta.title,sourceName});
  const lagLimit=finite(maxRouteToProviderMarkerSeconds);if(lagLimit===null||lagLimit<0||lagLimit>900)return fail('INVALID_ROUTE_MARKER_LAG_POLICY',{gameCode:target,sourceName,maxRouteToProviderMarkerSeconds});
  let obj;try{obj=typeof har==='string'?JSON.parse(har):har;}catch{return fail('HAR_PARSE_FAILED',{gameCode:target,sourceName});}
  const entries=Array.isArray(obj?.log?.entries)?obj.log.entries:[];if(!entries.length)return fail('HAR_HAS_NO_ENTRIES',{gameCode:target,sourceName});
  const routes=[],markers=[];
  for(let i=0;i<entries.length;i++){
    const e=entries[i],t=epoch(e?.startedDateTime),routeKind=routeEvidence(e,meta.playPath),markerKinds=providerCodeEvidence(e,target);
    if(routeKind)routes.push({index:i,epochSeconds:t,kind:routeKind});
    if(markerKinds.length)markers.push({index:i,epochSeconds:t,kinds:markerKinds});
  }
  if(!routes.length)return fail('EXACT_BET365_SPAIN_PLAY_ROUTE_NOT_OBSERVED',{gameCode:target,title:meta.title,sourceName,expectedPlayPath:meta.playPath});
  if(!markers.length)return fail('EXACT_PROVIDER_GAME_CODE_NOT_OBSERVED',{gameCode:target,title:meta.title,sourceName,expectedPlayPath:meta.playPath,exactBet365SpainPlayRouteObserved:true});
  const pairs=[];
  for(const r of routes)for(const m of markers){
    if(m.index<r.index)continue;
    let lagSeconds=null;
    if(r.epochSeconds!==null&&m.epochSeconds!==null){lagSeconds=m.epochSeconds-r.epochSeconds;if(lagSeconds<0||lagSeconds>lagLimit)continue;}
    else if(m.index-r.index>40)continue;
    pairs.push({route:r,marker:m,lagSeconds,entryLag:m.index-r.index});
  }
  if(!pairs.length)return fail('PLAY_ROUTE_AND_PROVIDER_CODE_NOT_BOUNDED_TO_ONE_CAPTURE_WINDOW',{gameCode:target,title:meta.title,sourceName,expectedPlayPath:meta.playPath,routeEvidenceCount:routes.length,providerMarkerCount:markers.length,maxRouteToProviderMarkerSeconds:lagLimit,exactBet365SpainPlayRouteObserved:true,exactProviderGameCodeObserved:true});
  pairs.sort((a,b)=>(a.lagSeconds??Number.MAX_SAFE_INTEGER)-(b.lagSeconds??Number.MAX_SAFE_INTEGER)||a.entryLag-b.entryLag);
  const best=pairs[0];
  return {version:'bet365-sporting-exact-play-route-provenance-v1',mode:'OFFLINE_PASSIVE_EXACT_PUBLIC_ROUTE_PROVIDER_IDENTITY_PROVENANCE_NO_PLAY',valid:true,reason:'EXACT_CURRENT_BET365_SPAIN_PLAY_ROUTE_AND_EXACT_PROVIDER_CODE_OBSERVED_IN_BOUNDED_CAPTURE_WINDOW',sourceName,target:{gameCode:target,title:meta.title,exactPublicPlayPath:meta.playPath},routeEvidence:{entryIndex:best.route.index,kind:best.route.kind},providerCodeEvidence:{entryIndex:best.marker.index,kinds:best.marker.kinds},routeToProviderMarkerSeconds:best.lagSeconds,routeToProviderMarkerEntryLag:best.entryLag,maxRouteToProviderMarkerSeconds:lagLimit,exactBet365SpainPlayRouteObserved:true,exactProviderGameCodeObserved:true,exactFrontendProviderIdentityCandidateVerified:true,bet365LicenseeJackpotBindingVerified:false,exactCurrentSljp1ServerStateVerified:false,servedTenCentEligibilityVerified:false,operatorFollowingDayRuleAdoptionVerified:false,usableForExecution:false,scientificUse:'Uses the current exact bet365 Spain public /play route as a frozen provenance anchor and requires the exact Playtech provider game code to appear later in the same bounded passive HAR window. This materially strengthens exact frontend/provider identity for the served capture, but cannot by itself prove bet365-owned jackpot configuration, sljp-1 transport, response semantics, 0.10 EUR jackpot eligibility, following-day adoption or execution permission.',execution:{decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0},hardGuards:{onlineOnly:true,nonPromoOnly:true,offlineOnly:true,passiveHarOnly:true,exactBet365SpainHostRequired:true,exactFrozenPlayPathRequired:true,exactProviderCodeRequired:true,boundedRouteMarkerWindowRequired:true,rawUrlsNotEmitted:true,referrerValuesNotEmitted:true,rawBodiesNotEmitted:true,credentialsNeverEmitted:true,publicRouteDoesNotEqualAuthenticatedLaunch:true,frontendIdentityDoesNotEqualJackpotBinding:true,noWagerProbe:true,noAutomaticBetting:true}};
}

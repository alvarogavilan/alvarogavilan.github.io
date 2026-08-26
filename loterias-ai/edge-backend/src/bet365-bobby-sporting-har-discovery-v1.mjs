const TARGET_GAME_CODE='gpas_bgeorge_pop';
const TARGET_TITLE='bobby george';
const DAILY_CODE='sljp-1';
const SPORTING_GAME_CODES=new Set([
  'tonymc','tmccoy','fdtsl','roos','gpas_slblara_pop','gpas_bgeorge_pop','gpas_bgeorgelo_pop',
  'gpas_slchelt_pop','gpas_slcheltlo_pop','gpas_slfbruno_pop','gpas_slfbrunolo_pop',
  'gpas_rcarloslx_pop','gpas_rcarloslxlo_pop','gpas_rcarlos_pop','gpas_rcarloslo_pop',
  'gpas_gnsla1_pop','gpas_gnslb1_pop',
]);
const SAFE_ROUTING_KEYS=new Set(['casino','currency','local','game','instancecode','jackpotscasino']);
const clean=v=>String(v??'').replace(/\u0000/g,'').trim();
const normalizeKey=v=>clean(v).toLowerCase().replace(/[^a-z0-9]/g,'');
const uniq=a=>[...new Set(a.filter(v=>v!==null&&v!==undefined&&v!==''))];

function decodeContent(content){
  const raw=String(content?.text||'');
  if(!raw)return '';
  if(String(content?.encoding||'').toLowerCase()!=='base64')return raw;
  try{if(typeof Buffer!=='undefined')return Buffer.from(raw,'base64').toString('utf8');}catch{}
  return '';
}
function endpointShape(url){
  try{
    const u=new URL(String(url||''));
    if(!['https:','wss:'].includes(u.protocol))return null;
    return `${u.origin}${u.pathname}`;
  }catch{return null;}
}
function entryTextParts(entry){
  const out=[];
  const req=entry?.request||{},res=entry?.response||{};
  if(req.url)out.push(String(req.url));
  if(req.postData?.text)out.push(String(req.postData.text));
  const responseText=decodeContent(res.content);if(responseText)out.push(responseText);
  for(const msg of entry?._webSocketMessages||[])if(msg?.data)out.push(String(msg.data));
  return out;
}
function sportingCodesInText(text){
  const s=String(text||'').toLowerCase(),out=[];
  for(const code of SPORTING_GAME_CODES)if(s.includes(code))out.push(code);
  return uniq(out);
}
function exactTargetMarker(entry){
  const joined=entryTextParts(entry).join('\n').toLowerCase();
  return joined.includes(TARGET_GAME_CODE)||joined.includes(TARGET_TITLE)&&joined.includes('sporting legends');
}
function safeRoutingFromUrl(url,out={}){
  try{
    const u=new URL(String(url||''));
    for(const [k,v] of u.searchParams){const nk=normalizeKey(k);if(SAFE_ROUTING_KEYS.has(nk)){if(!out[nk])out[nk]=[];out[nk].push(clean(v));}}
  }catch{}
  return out;
}
function scanSafeRouting(value,out={},depth=0){
  if(depth>8)return out;
  if(Array.isArray(value)){for(const v of value.slice(0,100))scanSafeRouting(v,out,depth+1);return out;}
  if(!value||typeof value!=='object')return out;
  for(const [k,v] of Object.entries(value)){
    const nk=normalizeKey(k);
    if(SAFE_ROUTING_KEYS.has(nk)&&['string','number','boolean'].includes(typeof v)){
      const s=clean(v);if(s&&s.length<=200){if(!out[nk])out[nk]=[];out[nk].push(s);}
    }
    if(v&&typeof v==='object')scanSafeRouting(v,out,depth+1);
  }
  return out;
}
function safeRouting(entry){
  const out={};safeRoutingFromUrl(entry?.request?.url,out);
  for(const raw of [entry?.request?.postData?.text,decodeContent(entry?.response?.content)]){
    const s=String(raw||'').trim();if(!s)continue;
    try{scanSafeRouting(JSON.parse(s),out);}catch{}
  }
  for(const msg of entry?._webSocketMessages||[]){
    const s=String(msg?.data||'').trim();if(!s)continue;
    try{scanSafeRouting(JSON.parse(s),out);}catch{}
  }
  for(const k of Object.keys(out))out[k]=uniq(out[k]);
  return out;
}
function dailyMarker(entry){
  const joined=entryTextParts(entry).join('\n').toLowerCase();
  if(joined.includes(DAILY_CODE))return true;
  try{return new URL(String(entry?.request?.url||'')).searchParams.get('game')?.toLowerCase()===DAILY_CODE;}catch{return false;}
}
function tickerTransport(entry){
  const ep=endpointShape(entry?.request?.url)||'';
  return /(?:\/|^)(?:webtickers|new_jackpotxml\.php)(?:\/|$)/i.test(ep)||/webtickers|new_jackpotxml\.php/i.test(String(entry?.request?.url||''));
}
function latestSportingMarkerBefore(markers,index){return markers.filter(x=>x.index<index).sort((a,b)=>b.index-a.index)[0]||null;}
function fail(reason,extra={}){
  return {version:'bet365-bobby-sporting-har-discovery-v1',valid:false,reason,exactTargetMarkerObserved:false,exactTargetDailyTickerCandidateObserved:false,servedBet365SessionBindingVerified:false,usableForOverduePair:false,execution:{decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0},...extra};
}

export function analyzeBet365BobbySportingHar(har,{sourceName='capture.har'}={}){
  let obj;
  try{obj=typeof har==='string'?JSON.parse(har):har;}catch{return fail('HAR_PARSE_FAILED',{sourceName});}
  const entries=Array.isArray(obj?.log?.entries)?obj.log.entries:[];
  if(!entries.length)return fail('HAR_HAS_NO_ENTRIES',{sourceName});
  const sportingMarkers=[];
  for(let i=0;i<entries.length;i++){
    const codes=uniq(entryTextParts(entries[i]).flatMap(sportingCodesInText));
    const target=exactTargetMarker(entries[i]);
    if(codes.length||target)sportingMarkers.push({index:i,target,codes});
  }
  const targetMarkers=sportingMarkers.filter(x=>x.target||x.codes.includes(TARGET_GAME_CODE));
  const candidates=[];
  for(let i=0;i<entries.length;i++){
    const entry=entries[i];
    if(!tickerTransport(entry)||!dailyMarker(entry))continue;
    const latest=latestSportingMarkerBefore(sportingMarkers,i);
    const routing=safeRouting(entry);
    const targetPrecedes=!!latest&&(latest.target||latest.codes.includes(TARGET_GAME_CODE));
    const conflictingLatestSportingMarker=!!latest&&!targetPrecedes;
    candidates.push({
      tickerEntryIndex:i,
      startedDateTime:entry?.startedDateTime||null,
      endpoint:endpointShape(entry?.request?.url),
      exactDailyCodeObserved:true,
      latestSportingMarkerIndex:latest?.index??null,
      latestSportingMarkerCodes:latest?.codes||[],
      exactTargetMarkerPrecedesTicker:targetPrecedes,
      conflictingLatestSportingMarker,
      safeRouting:routing,
      requestCasinoCandidates:routing.casino||routing.jackpotscasino||[],
      currencyCandidates:routing.currency||[],
      localCandidates:routing.local||[],
      gameCandidates:routing.game||[],
      instanceCodeCandidates:routing.instancecode||[],
    });
  }
  const exactCandidates=candidates.filter(x=>x.exactTargetMarkerPrecedesTicker&&!x.conflictingLatestSportingMarker);
  const exactTargetMarkerObserved=targetMarkers.length>0;
  const exactTargetDailyTickerCandidateObserved=exactCandidates.length>0;
  return {
    version:'bet365-bobby-sporting-har-discovery-v1',
    mode:'OFFLINE_PASSIVE_BET365_BOBBY_SPORTING_DISCOVERY_NO_PLAY',
    valid:true,sourceName,entryCount:entries.length,
    target:{title:'Bobby George: Sporting Legends',provider:'Playtech',providerGameCode:TARGET_GAME_CODE,jackpotGroup:'sljp',dailyCode:DAILY_CODE},
    exactTargetMarkerObserved,targetMarkerEntryIndexes:targetMarkers.map(x=>x.index),
    dailyTickerCandidateCount:candidates.length,exactTargetDailyTickerCandidateCount:exactCandidates.length,
    exactTargetDailyTickerCandidateObserved,
    candidates,
    servedBet365SessionBindingVerified:false,
    exactBet365LauncherSemanticsVerified:false,
    exactBet365JackpotsCasinoImsVerified:false,
    exactBet365TickerEndpointOwnershipVerified:false,
    exactModernResponseSemanticsVerified:false,
    usableForOverduePair:false,
    scientificUse:'Offline discovery only. A candidate requires sljp-1 ticker traffic after the latest observed Sporting Legends game marker resolves to exact Bobby George gpas_bgeorge_pop. Output is redacted to endpoint origin/path plus allowlisted routing fields. Because the current bet365 launcher/session ownership contract is not yet independently documented, even an exact candidate is not promoted to served operator binding or overdue evidence.',
    nextRequiredEvidence:[
      'exact bet365 Spain real-money Bobby launcher/session provenance',
      'licensee-specific jackpotsCasino or IMS binding',
      'configured ticker endpoint ownership',
      'fresh sljp-1 response semantics with amount, guaranteedHitTime, winc, timestamp and execInterval',
      'served 0.10 EUR stake and jackpot eligibility attestation'
    ],
    execution:{decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0},
    hardGuards:{onlineOnly:true,nonPromoOnly:true,offlineOnly:true,noNetwork:true,passiveHarOnly:true,rawHarNeverEmitted:true,credentialsCookiesHeadersNeverEmitted:true,endpointQueriesFragmentsNeverEmitted:true,exactProviderGameCodeRequired:true,latestSportingMarkerMustBeTarget:true,sljp1Required:true,otherSportingMarkerInvalidatesStaleTargetProvenance:true,discoveryCandidateCannotProveBet365Ownership:true,discoveryCandidateCannotAuthorizeGreen:true,noWagerProbe:true,noAutomaticBetting:true},
  };
}

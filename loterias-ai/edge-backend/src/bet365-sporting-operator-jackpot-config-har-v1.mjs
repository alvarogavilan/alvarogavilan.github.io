const TARGETS=new Map([
  ['gpas_bgeorge_pop',{title:'Bobby George: Sporting Legends',name:'bobby george'}],
  ['gpas_slblara_pop',{title:'Brian Lara: Sporting Legends',name:'brian lara'}],
  ['gpas_slfbruno_pop',{title:'Frank Bruno: Sporting Legends',name:'frank bruno'}],
]);
const SPORTING_CODES=new Set(['tonymc','tmccoy','fdtsl','roos','gpas_slblara_pop','gpas_bgeorge_pop','gpas_bgeorgelo_pop','gpas_slchelt_pop','gpas_slcheltlo_pop','gpas_slfbruno_pop','gpas_slfbrunolo_pop','gpas_rcarloslx_pop','gpas_rcarloslxlo_pop','gpas_rcarlos_pop','gpas_rcarloslo_pop','gpas_gnsla1_pop','gpas_gnslb1_pop']);
const clean=v=>String(v??'').replace(/\u0000/g,'').trim();
const norm=v=>clean(v).toLowerCase().replace(/[^a-z0-9]/g,'');
const text=v=>typeof v==='string'&&v.trim()?v.trim():null;
const uniq=a=>[...new Set(a.filter(v=>v!==null&&v!==undefined&&v!==''))];
function decode(c){const raw=String(c?.text||'');if(!raw)return '';if(String(c?.encoding||'').toLowerCase()!=='base64')return raw;try{if(typeof Buffer!=='undefined')return Buffer.from(raw,'base64').toString('utf8');}catch{}return '';}
function hostOf(url){try{return new URL(clean(url)).hostname.toLowerCase();}catch{return null;}}
function bet365SpainOwnedHost(url){const h=hostOf(url);return !!h&&(h==='bet365.es'||h.endsWith('.bet365.es'));}
function endpointShape(v){try{const u=new URL(clean(v));if(!['https:','wss:'].includes(u.protocol))return null;return `${u.protocol}//${u.host}${u.pathname}`;}catch{return null;}}
function safeCasino(v){const s=text(v);if(!s||s.length>120||/token|secret|password|session|bearer/i.test(s))return null;return /^[a-z0-9_.:\-]+$/i.test(s)?s:null;}
function parts(e){const out=[];if(e?.request?.url)out.push(String(e.request.url));if(e?.request?.postData?.text)out.push(String(e.request.postData.text));const r=decode(e?.response?.content);if(r)out.push(r);for(const m of e?._webSocketMessages||[])if(m?.data)out.push(String(m.data));return out;}
function codesIn(e){const s=parts(e).join('\n').toLowerCase(),out=[];for(const c of SPORTING_CODES)if(s.includes(c))out.push(c);return uniq(out);}
function targetMarker(e,code){const meta=TARGETS.get(code),s=parts(e).join('\n').toLowerCase();return s.includes(code)||(s.includes(meta.name)&&s.includes('sporting legends'));}
function markerSet(entries,code){const out=[];for(let i=0;i<entries.length;i++){const codes=codesIn(entries[i]),target=targetMarker(entries[i],code);if(codes.length||target)out.push({index:i,codes,target});}return out;}
function latestMarker(markers,index){return markers.filter(m=>m.index<=index).sort((a,b)=>b.index-a.index)[0]||null;}
function exclusiveTarget(m,code){return !!m&&(m.target===true||m.codes.includes(code))&&m.codes.every(c=>c===code);}
function directKey(obj,names){for(const [k,v] of Object.entries(obj||{})){if(names.has(norm(k)))return {key:k,value:v};}return null;}
function scanConfig(value,meta,out=[],depth=0,path='$'){
  if(depth>12||out.length>=100)return out;
  if(Array.isArray(value)){value.slice(0,500).forEach((v,i)=>scanConfig(v,meta,out,depth+1,`${path}[${i}]`));return out;}
  if(!value||typeof value!=='object')return out;
  const casino=directKey(value,new Set(['jackpotscasino','externaljackpotscasino']));
  const jpUrl=directKey(value,new Set(['jackpotscasinourl','externaljackpotscasinourl']));
  const liveUrl=directKey(value,new Set(['liveendpointurl']));
  const use=directKey(value,new Set(['useservicescasinojackpots']));
  if(casino&&(jpUrl||liveUrl)){
    const casinoValue=safeCasino(casino.value),jpEndpoint=endpointShape(jpUrl?.value),liveEndpoint=endpointShape(liveUrl?.value);
    if(casinoValue&&(jpEndpoint||liveEndpoint))out.push({...meta,objectPath:path,jackpotsCasino:casinoValue,jackpotsCasinoEndpoint:jpEndpoint,liveEndpoint,usesServicesCasinoJackpots:use?.value===true});
  }
  for(const [k,v] of Object.entries(value))if(v&&typeof v==='object')scanConfig(v,meta,out,depth+1,`${path}.${k}`);
  return out;
}
function parseJsonResponse(entry,meta,out){const raw=decode(entry?.response?.content),s=String(raw||'').trim();if(!s)return;try{scanConfig(JSON.parse(s),meta,out);}catch{}}
function fail(reason,extra={}){return {version:'bet365-sporting-operator-jackpot-config-har-v1',valid:false,reason,bet365OwnedExactTargetSessionConfigCandidateObserved:false,bet365LicenseeBindingVerified:false,exactTickerOwnershipVerified:false,servedTenCentEligibilityVerified:false,usableForExecution:false,execution:{decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0},...extra};}

export function discoverBet365SportingOperatorJackpotConfig(har,{gameCode,sourceName='capture.har'}={}){
  const target=clean(gameCode).toLowerCase(),meta=TARGETS.get(target);if(!meta)return fail('UNSUPPORTED_OR_MISSING_TARGET',{gameCode:target||null,sourceName});
  let obj;try{obj=typeof har==='string'?JSON.parse(har):har;}catch{return fail('HAR_PARSE_FAILED',{gameCode:target,sourceName});}
  const entries=Array.isArray(obj?.log?.entries)?obj.log.entries:[];if(!entries.length)return fail('HAR_HAS_NO_ENTRIES',{gameCode:target,sourceName});
  const markers=markerSet(entries,target),targetMarkers=markers.filter(m=>m.target||m.codes.includes(target));if(!targetMarkers.length)return fail('EXACT_TARGET_MARKER_NOT_FOUND',{gameCode:target,sourceName});
  const candidates=[];
  for(let i=0;i<entries.length;i++){
    const latest=latestMarker(markers,i);if(!exclusiveTarget(latest,target))continue;
    const entry=entries[i];if(!bet365SpainOwnedHost(entry?.request?.url))continue;
    parseJsonResponse(entry,{entryIndex:i,responseEndpoint:endpointShape(entry?.request?.url),responseHost:hostOf(entry?.request?.url),latestTargetMarkerIndex:latest.index},candidates);
  }
  const dedup=[],seen=new Set();for(const c of candidates){const id=[c.entryIndex,c.objectPath,c.jackpotsCasino,c.jackpotsCasinoEndpoint,c.liveEndpoint,c.usesServicesCasinoJackpots].join('|');if(!seen.has(id)){seen.add(id);dedup.push(c);}}
  const coherentTuples=uniq(dedup.map(c=>JSON.stringify({jackpotsCasino:c.jackpotsCasino,jackpotsCasinoEndpoint:c.jackpotsCasinoEndpoint,liveEndpoint:c.liveEndpoint,usesServicesCasinoJackpots:c.usesServicesCasinoJackpots}))).map(s=>JSON.parse(s));
  const uniqueCoherentConfigCandidate=coherentTuples.length===1?coherentTuples[0]:null;
  return {version:'bet365-sporting-operator-jackpot-config-har-v1',mode:'OFFLINE_PASSIVE_OPERATOR_OWNED_CONFIG_DISCOVERY_NO_PLAY',valid:true,sourceName,target:{gameCode:target,title:meta.title},exactTargetMarkerObserved:true,targetMarkerEntryIndexes:targetMarkers.map(m=>m.index),operatorOwnedConfigCandidateCount:dedup.length,coherentConfigTupleCount:coherentTuples.length,bet365OwnedExactTargetSessionConfigCandidateObserved:dedup.length>0,uniqueCoherentConfigCandidateObserved:uniqueCoherentConfigCandidate!==null,uniqueCoherentConfigCandidate,candidates:dedup,bet365LicenseeBindingVerified:false,exactTickerOwnershipVerified:false,servedTenCentEligibilityVerified:false,usableForExecution:false,scientificUse:'Scans only JSON HTTP responses served from bet365.es or its subdomains while the latest Sporting Legends marker resolves exclusively to the requested exact provider game. It recovers only co-located jackpot configuration fields such as jackpotsCasino and jackpot/live endpoint shapes. Even one coherent operator-owned configuration object is a binding candidate, not execution proof: it must still be matched to the actual target ticker transport/echo and current jackpot state, and 0.10 EUR eligibility remains independently required.',execution:{decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0},hardGuards:{onlineOnly:true,nonPromoOnly:true,offlineOnly:true,passiveHarOnly:true,exactTargetMarkerRequired:true,latestSportingMarkerMustBeExclusiveTarget:true,operatorOwnedResponseHostRequired:true,jsonResponsesOnly:true,coLocatedConfigFieldsRequired:true,rawResponseNeverEmitted:true,rawRequestNeverEmitted:true,headersCookiesNeverEmitted:true,urlQueriesFragmentsNeverEmitted:true,configCandidateCannotSelfVerifyTickerOwnership:true,configCandidateCannotSelfVerifyTenCentEligibility:true,configCandidateCannotAuthorizeGreen:true,noWagerProbe:true,noAutomaticBetting:true}};
}

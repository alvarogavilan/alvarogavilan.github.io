import {analyzeBetfairSportingHar} from './betfair-sporting-har-discovery-v1.mjs';

const SAFE_VALUE_KEYS=new Set(['casino','game','gamecode','currency','local','info','instancecode','viplevel','jackpot','jackpotcode','gamegroup']);
const SENSITIVE_KEY_RE=/(token|secret|password|passwd|authorization|cookie|session|sid|jwt|bearer|credential|apikey|api_key|access[_-]?key|refresh)/i;
const uniq=a=>[...new Set(a.filter(v=>v!==null&&v!==undefined&&v!==''))];
const clean=s=>String(s??'').replace(/\u0000/g,'').trim();

function maybeDecode(s){
  let v=clean(s).replace(/\\u0026/gi,'&').replace(/\\\//g,'/');
  for(let i=0;i<2;i++){
    try{const d=decodeURIComponent(v.replace(/\+/g,' '));if(d===v)break;v=d;}catch{break;}
  }
  return v;
}

function decodeHarContent(content){
  const raw=String(content?.text||'');
  if(!raw)return '';
  if(String(content?.encoding||'').toLowerCase()!=='base64')return raw;
  try{
    if(typeof Buffer!=='undefined')return Buffer.from(raw,'base64').toString('utf8');
    if(typeof atob==='function'){
      const bin=atob(raw);let pct='';
      for(let i=0;i<bin.length;i++)pct+=`%${bin.charCodeAt(i).toString(16).padStart(2,'0')}`;
      return decodeURIComponent(pct);
    }
  }catch{}
  return '';
}

function endpointShape(url){
  try{const u=new URL(maybeDecode(url));return `${u.origin}${u.pathname}`;}catch{return null;}
}
function sameEndpoint(a,b){
  const x=endpointShape(a),y=endpointShape(b);return !!x&&x===y;
}
function isModernBinding(b){
  if(!b||b.sameDocument!==true||b.sourceBetfairOwned!==true||b.sourceInitialResources!==true)return false;
  try{
    const src=new URL(maybeDecode(b.sourceUrl)),ticker=new URL(maybeDecode(b.tickerUrl));
    const h=src.hostname.toLowerCase();
    return src.protocol==='https:'&&!src.username&&!src.password&&(h==='betfair.es'||h.endsWith('.betfair.es'))&&/\/initialresources(?:\/|$)/i.test(src.pathname)&&ticker.protocol==='https:'&&!ticker.username&&!ticker.password&&/\/webtickers\/?$/i.test(ticker.pathname)&&!!clean(b.jackpotsCasino);
  }catch{return false;}
}
function safeKey(k){return clean(k).toLowerCase().replace(/[^a-z0-9_]/g,'');}
function addSafeValue(dst,key,value){
  const k=safeKey(key);
  if(!SAFE_VALUE_KEYS.has(k)||SENSITIVE_KEY_RE.test(key))return;
  const v=clean(value);
  if(!v||v.length>200)return;
  if(!dst[k])dst[k]=[];
  dst[k]=uniq([...dst[k],v]);
}

function queryFingerprint(url){
  const names=[],safeValues={};
  try{
    const u=new URL(maybeDecode(url));
    for(const [k,v] of u.searchParams){names.push(k);addSafeValue(safeValues,k,v);}
  }catch{}
  return {parameterNames:uniq(names).sort(),safeProtocolValues:safeValues,valuesRedacted:true};
}

function flattenJson(value,path='',keys=[],safeValues={},depth=0){
  if(depth>6||keys.length>=120)return;
  if(Array.isArray(value)){
    value.slice(0,8).forEach((v,i)=>flattenJson(v,`${path}[${i}]`,keys,safeValues,depth+1));return;
  }
  if(value&&typeof value==='object'){
    for(const [k,v] of Object.entries(value)){
      if(keys.length>=120)break;
      const p=path?`${path}.${k}`:k;keys.push(p);
      if(v===null||['string','number','boolean'].includes(typeof v))addSafeValue(safeValues,k,v);
      else flattenJson(v,p,keys,safeValues,depth+1);
    }
  }
}

function postDataFingerprint(postData){
  const text=String(postData?.text||''),mimeType=clean(postData?.mimeType)||null;
  const out={present:!!text,mimeType,bodyLength:text.length,fieldNames:[],safeProtocolValues:{},valuesRedacted:true};
  if(!text)return out;
  let parsed=null;
  try{parsed=JSON.parse(text);}catch{}
  if(parsed&&typeof parsed==='object'){
    flattenJson(parsed,'',out.fieldNames,out.safeProtocolValues);out.format='json';return out;
  }
  if(/application\/x-www-form-urlencoded/i.test(mimeType||'')||/^[^=&\s]+=[^&]*(&[^=&\s]+=[^&]*)*$/.test(text.trim())){
    try{
      const q=new URLSearchParams(text);const names=[];
      for(const [k,v] of q){names.push(k);addSafeValue(out.safeProtocolValues,k,v);}
      out.fieldNames=uniq(names).sort();out.format='form';return out;
    }catch{}
  }
  const keys=[];
  for(const m of text.matchAll(/["']?([A-Za-z_][A-Za-z0-9_.-]{1,60})["']?\s*[:=]/g))keys.push(m[1]);
  out.fieldNames=uniq(keys).slice(0,120);out.format='opaque';return out;
}

function headerFingerprint(headers){
  const out={};
  for(const h of Array.isArray(headers)?headers:[]){
    const name=clean(h?.name).toLowerCase();
    if(name==='content-type'||name==='accept')out[name]=clean(h?.value).slice(0,300);
  }
  return out;
}

function responseFingerprint(response){
  const body=decodeHarContent(response?.content),jsonKeys=[],xmlTags=[];
  let parsed=null;
  try{parsed=JSON.parse(body);}catch{}
  if(parsed&&typeof parsed==='object')flattenJson(parsed,'',jsonKeys,{});
  for(const m of body.matchAll(/<\/?([A-Za-z_][A-Za-z0-9_.:-]*)\b/g)){xmlTags.push(m[1]);if(xmlTags.length>=120)break;}
  return {
    status:Number.isFinite(response?.status)?response.status:null,
    mimeType:response?.content?.mimeType||null,
    bodyLength:body.length,
    markers:{sljp1:/\bsljp-1\b/i.test(body),guaranteedHitTime:/\bguaranteedHitTime\b/i.test(body),jackpot:/\bjackpot/i.test(body)},
    jsonKeyPaths:uniq(jsonKeys).slice(0,120),
    xmlTags:uniq(xmlTags).slice(0,120),
    bodyValuesRedacted:true,
  };
}

export function analyzeBetfairSportingWebtickersProtocolHar(har,{sourceName='capture.har'}={}){
  let obj;
  try{obj=typeof har==='string'?JSON.parse(har):har;}catch(error){return fail('HAR_PARSE_FAILED',{sourceName,error:String(error?.message||error)});}
  const base=analyzeBetfairSportingHar(obj,{sourceName});
  const entries=Array.isArray(obj?.log?.entries)?obj.log.entries:[];
  const bindings=(base?.discovery?.configBindingCandidates||[]).filter(isModernBinding);
  const traffic=[];
  for(const b of bindings){
    entries.forEach((entry,index)=>{
      const requestUrl=String(entry?.request?.url||'');
      if(!sameEndpoint(b.tickerUrl,requestUrl))return;
      traffic.push({
        configBinding:{sourceUrl:b.sourceUrl,jackpotsCasino:b.jackpotsCasino,tickerEndpoint:endpointShape(b.tickerUrl),instanceCode:b.instanceCode||null},
        entryIndex:index,
        startedDateTime:entry?.startedDateTime||null,
        exactConfiguredEndpointMatch:true,
        request:{method:entry?.request?.method||null,endpoint:endpointShape(requestUrl),query:queryFingerprint(requestUrl),headers:headerFingerprint(entry?.request?.headers),postData:postDataFingerprint(entry?.request?.postData)},
        response:responseFingerprint(entry?.response),
      });
    });
  }
  return {
    version:'betfair-sporting-webtickers-har-protocol-v1',
    mode:'OFFLINE_PASSIVE_MODERN_WEBTICKERS_PROTOCOL_DISCOVERY_NO_PLAY',
    sourceName,
    modernBetfairConfigBindingCount:bindings.length,
    exactConfiguredWebtickersTrafficCount:traffic.length,
    exactModernWebtickersTrafficObserved:traffic.length>0,
    protocolFingerprints:traffic,
    exactModernRequestContractVerified:false,
    directPublicModernProbeAllowed:false,
    scientificUse:'A matching HAR entry proves only that the exact browser session contacted the endpoint configured by Betfair initialResources. Query/body/header values that can carry credentials or session state are never emitted. Safe casino/game/currency/scope fields and structural key names are retained to recover the client protocol without guessing. A direct modern probe remains blocked until the exact request contract is independently closed.',
    execution:{decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0},
    hardGuards:{onlineOnly:true,nonPromoOnly:true,offlineOnly:true,noNetwork:true,noCredentialsEmitted:true,noCookiesEmitted:true,noAuthorizationEmitted:true,sensitiveValuesRedacted:true,exactBetfairInitialResourcesBindingRequired:true,configuredEndpointMatchRequired:true,modernProtocolCannotBeGuessed:true,harEvidenceCannotAuthorizeGreen:true,noWagerProbe:true,noAutomaticBetting:true},
  };
}

function fail(reason,extra={}){
  return {version:'betfair-sporting-webtickers-har-protocol-v1',mode:'OFFLINE_PASSIVE_MODERN_WEBTICKERS_PROTOCOL_DISCOVERY_NO_PLAY',valid:false,reason,exactModernWebtickersTrafficObserved:false,exactModernRequestContractVerified:false,directPublicModernProbeAllowed:false,execution:{decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0},hardGuards:{noCredentialsEmitted:true,noCookiesEmitted:true,sensitiveValuesRedacted:true,harEvidenceCannotAuthorizeGreen:true},...extra};
}

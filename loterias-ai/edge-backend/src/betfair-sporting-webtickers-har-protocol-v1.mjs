import {analyzeBetfairSportingHar} from './betfair-sporting-har-discovery-v1.mjs';

const SAFE_VALUE_KEYS=new Set([
  'casino','game','gamecode','currency','local','info','instancecode','viplevel','jackpot','jackpotcode','gamegroup',
  'guaranteedhittime','amount','timestamp','gametimestamp','winc','wins','execinterval','requestexecinterval','starttimestamp','step',
]);
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
function normalizedPort(u){
  if(u.port)return u.port;
  return ['https:','wss:'].includes(u.protocol)?'443':'';
}
function configuredTransportMatch(configured,requestUrl,entry){
  try{
    const a=new URL(maybeDecode(configured)),b=new URL(maybeDecode(requestUrl));
    if(a.origin===b.origin&&a.pathname===b.pathname)return {matched:true,webSocketTransportUpgrade:false};
    const hasWsFrames=Array.isArray(entry?._webSocketMessages)&&entry._webSocketMessages.length>0;
    const httpsToWss=a.protocol==='https:'&&b.protocol==='wss:'&&
      a.hostname.toLowerCase()===b.hostname.toLowerCase()&&normalizedPort(a)===normalizedPort(b)&&a.pathname===b.pathname;
    if(httpsToWss&&hasWsFrames)return {matched:true,webSocketTransportUpgrade:true};
  }catch{}
  return {matched:false,webSocketTransportUpgrade:false};
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

function mergeSafeValues(dst,src){
  for(const [k,vals] of Object.entries(src||{}))dst[k]=uniq([...(dst[k]||[]),...(vals||[])]);
}
function webSocketFingerprint(entry){
  const messages=Array.isArray(entry?._webSocketMessages)?entry._webSocketMessages:[];
  const fieldNames=[],safeProtocolValues={},directions=[],opcodes=[];
  for(const msg of messages){
    directions.push(msg?.type==='send'?'send':'receive');
    if(msg?.opcode!==undefined&&msg?.opcode!==null)opcodes.push(String(msg.opcode));
    if(!msg?.data)continue;
    const fp=postDataFingerprint({text:String(msg.data),mimeType:'application/json'});
    fieldNames.push(...(fp.fieldNames||[]));
    mergeSafeValues(safeProtocolValues,fp.safeProtocolValues);
  }
  return {
    present:messages.length>0,
    messageCount:messages.length,
    directions:uniq(directions).sort(),
    opcodes:uniq(opcodes).sort(),
    fieldNames:uniq(fieldNames).slice(0,120),
    safeProtocolValues,
    valuesRedacted:true,
  };
}
function sseDataPayloads(body){
  const out=[];
  for(const line of String(body||'').split(/\r?\n/)){
    const m=line.match(/^\s*data\s*:\s*(.*)$/i);
    if(m&&m[1]&&m[1]!=='[DONE]')out.push(m[1]);
  }
  return out;
}
function responseFingerprint(response,entry){
  const body=decodeHarContent(response?.content),jsonKeys=[],xmlTags=[],safeProtocolValues={};
  const received=(Array.isArray(entry?._webSocketMessages)?entry._webSocketMessages:[])
    .filter(m=>m?.type!=='send'&&m?.data).map(m=>String(m.data));
  const ssePayloads=sseDataPayloads(body);
  const candidates=uniq([body,...ssePayloads,...received]);
  const combined=[body,...received].filter(Boolean).join('\n');
  for(const candidate of candidates){
    let parsed=null;
    try{parsed=JSON.parse(candidate);}catch{}
    if(parsed&&typeof parsed==='object')flattenJson(parsed,'',jsonKeys,safeProtocolValues);
  }
  for(const m of combined.matchAll(/<\/?([A-Za-z_][A-Za-z0-9_.:-]*)\b/g)){xmlTags.push(m[1]);if(xmlTags.length>=120)break;}
  return {
    status:Number.isFinite(response?.status)?response.status:null,
    mimeType:response?.content?.mimeType||null,
    bodyLength:body.length,
    markers:{sljp1:/\bsljp-1\b/i.test(combined),guaranteedHitTime:/\bguaranteedHitTime\b/i.test(combined),jackpot:/\bjackpot/i.test(combined)},
    jsonKeyPaths:uniq(jsonKeys).slice(0,120),
    safeProtocolValues,
    sseDataFrameCount:ssePayloads.length,
    xmlTags:uniq(xmlTags).slice(0,120),
    webSocketReceiveFrameCount:received.length,
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
      const transportMatch=configuredTransportMatch(b.tickerUrl,requestUrl,entry);
      if(!transportMatch.matched)return;
      traffic.push({
        configBinding:{sourceUrl:endpointShape(b.sourceUrl),jackpotsCasino:b.jackpotsCasino,tickerEndpoint:endpointShape(b.tickerUrl),instanceCode:b.instanceCode||null},
        entryIndex:index,
        startedDateTime:entry?.startedDateTime||null,
        exactConfiguredEndpointMatch:transportMatch.webSocketTransportUpgrade!==true,
        configuredWebSocketTransportUpgradeObserved:transportMatch.webSocketTransportUpgrade===true,
        request:{method:entry?.request?.method||null,endpoint:endpointShape(requestUrl),query:queryFingerprint(requestUrl),headers:headerFingerprint(entry?.request?.headers),postData:postDataFingerprint(entry?.request?.postData),webSocket:webSocketFingerprint(entry)},
        response:responseFingerprint(entry?.response,entry),
      });
    });
  }
  return {
    version:'betfair-sporting-webtickers-har-protocol-v1.3-response-state-fingerprint',
    mode:'OFFLINE_PASSIVE_MODERN_WEBTICKERS_PROTOCOL_DISCOVERY_NO_PLAY',
    sourceName,
    modernBetfairConfigBindingCount:bindings.length,
    exactConfiguredWebtickersTrafficCount:traffic.length,
    exactModernWebtickersTrafficObserved:traffic.length>0,
    protocolFingerprints:traffic,
    exactModernRequestContractVerified:false,
    directPublicModernProbeAllowed:false,
    scientificUse:'A matching HAR entry proves only that the exact browser session contacted the endpoint configured by Betfair initialResources. An HTTPS-configured endpoint may also match an observed WSS connection only when host, effective port and path are identical and the HAR actually contains WebSocket frames; this is recorded explicitly as a transport upgrade, never silently treated as an exact HTTPS request. Betfair config-source, configured ticker and observed request endpoints are emitted without query or fragment components. Query/body/header/frame values that can carry credentials or session state are never emitted. Non-sensitive Sporting protocol state fields such as game, currency, local, amount, timestamps, winc and guaranteedHitTime are retained as discovery candidates from JSON, SSE data frames and WebSocket receive frames, but they do not establish row identity or authorize execution by themselves. A direct modern probe remains blocked until the exact request contract and response semantics are independently closed.',
    execution:{decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0},
    hardGuards:{onlineOnly:true,nonPromoOnly:true,offlineOnly:true,noNetwork:true,noCredentialsEmitted:true,noCookiesEmitted:true,noAuthorizationEmitted:true,sensitiveValuesRedacted:true,endpointQueriesAndFragmentsNeverEmitted:true,exactBetfairInitialResourcesBindingRequired:true,configuredEndpointMatchRequired:true,webSocketUpgradeRequiresSameHostPortPathAndObservedFrames:true,modernProtocolCannotBeGuessed:true,responseStateCandidatesCannotProveRowIdentity:true,harEvidenceCannotAuthorizeGreen:true,noWagerProbe:true,noAutomaticBetting:true},
  };
}

function fail(reason,extra={}){
  return {version:'betfair-sporting-webtickers-har-protocol-v1.3-response-state-fingerprint',mode:'OFFLINE_PASSIVE_MODERN_WEBTICKERS_PROTOCOL_DISCOVERY_NO_PLAY',valid:false,reason,exactModernWebtickersTrafficObserved:false,exactModernRequestContractVerified:false,directPublicModernProbeAllowed:false,execution:{decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0},hardGuards:{noCredentialsEmitted:true,noCookiesEmitted:true,sensitiveValuesRedacted:true,endpointQueriesAndFragmentsNeverEmitted:true,responseStateCandidatesCannotProveRowIdentity:true,harEvidenceCannotAuthorizeGreen:true},...extra};
}

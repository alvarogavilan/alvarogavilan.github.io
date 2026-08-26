import {analyzeBetfairSportingWebtickersProtocolHar} from './betfair-sporting-webtickers-har-protocol-v1.mjs';

const finite=v=>{if(v===null||v===undefined||v===''||typeof v==='boolean')return null;const n=Number(v);return Number.isFinite(n)?n:null;};
const clean=v=>typeof v==='string'?v.trim():v;
const key=k=>String(k||'').toLowerCase().replace(/[^a-z0-9]/g,'');
const uniq=a=>[...new Set(a.filter(v=>v!==null&&v!==undefined&&v!==''))];

function decodeHarContent(content){
  const raw=String(content?.text||'');
  if(!raw)return '';
  if(String(content?.encoding||'').toLowerCase()!=='base64')return raw;
  try{
    if(typeof Buffer!=='undefined')return Buffer.from(raw,'base64').toString('utf8');
    if(typeof atob==='function')return atob(raw);
  }catch{}
  return '';
}
function ssePayloads(body){
  const out=[];
  for(const line of String(body||'').split(/\r?\n/)){
    const m=line.match(/^\s*data\s*:\s*(.*)$/i);
    if(m&&m[1]&&m[1]!=='[DONE]')out.push(m[1]);
  }
  return out;
}
function jsonPayloads(entry){
  const out=[];
  const body=decodeHarContent(entry?.response?.content);
  if(body)out.push({kind:'response-body',text:body});
  ssePayloads(body).forEach((text,i)=>out.push({kind:'sse-data',index:i,text}));
  const frames=Array.isArray(entry?._webSocketMessages)?entry._webSocketMessages:[];
  frames.forEach((m,i)=>{if(m?.type!=='send'&&m?.data)out.push({kind:'websocket-receive',index:i,text:String(m.data)});});
  return out;
}
function parseJson(text){try{return JSON.parse(text);}catch{return null;}}
function directMap(obj){
  const out=new Map();
  if(!obj||typeof obj!=='object'||Array.isArray(obj))return out;
  for(const [k,v] of Object.entries(obj))out.set(key(k),v);
  return out;
}
function scalar(map,...names){
  for(const n of names){
    const v=map.get(key(n));
    if(v===null||['string','number','boolean'].includes(typeof v))return v;
  }
  return null;
}
function scalars(map,...names){
  const out=[];
  for(const n of names){
    const v=map.get(key(n));
    if(v===null||['string','number','boolean'].includes(typeof v))out.push(v);
  }
  return out;
}
function nestedObject(map,...names){
  for(const n of names){const v=map.get(key(n));if(v&&typeof v==='object'&&!Array.isArray(v))return v;}
  return null;
}
function normalizedLocal(v){return v===0||v==='0'||v===false?0:v===1||v==='1'||v===true?1:null;}
function epoch(v){const n=finite(v);return n!==null&&n>0?Math.trunc(n):null;}
function exactUnique(values,normalize=x=>x){
  const n=uniq(values.map(normalize).filter(v=>v!==null&&v!==undefined&&v!==''));
  return n.length===1?n[0]:null;
}
function nonEmptyTextValues(values){return values.map(v=>String(clean(v)??'')).filter(Boolean);}
function candidateFromObject(obj){
  const m=directMap(obj);
  const game=exactUnique(scalars(m,'game','gameCode'),v=>String(clean(v)??'').toLowerCase());
  const currency=exactUnique(scalars(m,'currency'),v=>String(clean(v)??'').toLowerCase());
  const local=exactUnique(scalars(m,'local'),normalizedLocal);
  if(game!=='sljp-1'||currency!=='eur'||local!==0)return null;

  const jackpot=nestedObject(m,'jackpot','amountData','amount');
  const jm=directMap(jackpot);
  const amount=exactUnique([...scalars(m,'amount'),...scalars(jm,'amount','value')],finite);
  const guaranteedHitTime=exactUnique([...scalars(m,'guaranteedHitTime'),...scalars(jm,'guaranteedHitTime')],epoch);
  const gameTimestamp=exactUnique(scalars(m,'timestamp','gameTimestamp'),epoch);
  const winCount=exactUnique(scalars(m,'winc','winCount'),finite);
  if(amount===null||amount<0||guaranteedHitTime===null||gameTimestamp===null||winCount===null||winCount<0)return null;

  const casinoValues=nonEmptyTextValues(scalars(m,'casino'));
  const casino=casinoValues.length?exactUnique(casinoValues,v=>v.toLowerCase()):null;
  if(casinoValues.length&&casino===null)return null;
  const instanceValues=nonEmptyTextValues([...scalars(m,'instanceCode'),...scalars(jm,'instanceCode')]);
  const instanceCode=instanceValues.length?exactUnique(instanceValues,v=>v.toLowerCase()):null;
  if(instanceValues.length&&instanceCode===null)return null;
  const groupValues=nonEmptyTextValues(scalars(m,'gameGroup','group'));
  const gameGroup=groupValues.length?exactUnique(groupValues,v=>v.toLowerCase()):null;
  if(groupValues.length&&gameGroup===null)return null;
  return {game:'sljp-1',currency:'EUR',local:0,amount,guaranteedHitTime,gameTimestamp,winCount,casino,instanceCode,gameGroup};
}
function walkObjects(value,path='$',out=[],depth=0){
  if(depth>8||out.length>=200)return out;
  if(Array.isArray(value)){
    value.slice(0,100).forEach((v,i)=>walkObjects(v,`${path}[${i}]`,out,depth+1));return out;
  }
  if(!value||typeof value!=='object')return out;
  out.push({path,value});
  for(const [k,v] of Object.entries(value))if(v&&typeof v==='object')walkObjects(v,`${path}.${String(k).replace(/[^A-Za-z0-9_-]/g,'_')}`,out,depth+1);
  return out;
}
function collectCasinoValues(value,out=[],depth=0){
  if(depth>6||out.length>=50||value===null||value===undefined)return out;
  if(Array.isArray(value)){
    for(const v of value.slice(0,50))collectCasinoValues(v,out,depth+1);
    return out;
  }
  if(typeof value!=='object')return out;
  for(const [k,v] of Object.entries(value)){
    if(key(k)==='casino'&&(typeof v==='string'||typeof v==='number'))out.push(String(v).toLowerCase());
    else if(v&&typeof v==='object')collectCasinoValues(v,out,depth+1);
  }
  return out;
}
function requestCasinoMatches(fingerprint,bindingCasino,entry){
  const expected=String(bindingCasino||'').trim().toLowerCase();
  if(!expected)return false;
  const observed=[];
  const requestSources=[fingerprint?.request?.query?.safeProtocolValues,fingerprint?.request?.postData?.safeProtocolValues];
  for(const src of requestSources)for(const v of src?.casino||[])observed.push(String(v).trim().toLowerCase());

  // WebSocket receive frames are server responses and must never be allowed to
  // back-fill request-side casino evidence. Only client "send" frames count.
  const frames=Array.isArray(entry?._webSocketMessages)?entry._webSocketMessages:[];
  for(const frame of frames){
    if(frame?.type!=='send'||!frame?.data)continue;
    const parsed=parseJson(String(frame.data));
    if(parsed!==null)collectCasinoValues(parsed,observed);
  }
  const exact=uniq(observed.filter(Boolean));
  return exact.length===1&&exact[0]===expected;
}

export function analyzeBetfairSportingStructuredWebtickersRows(har,{sourceName='capture.har'}={}){
  let obj;
  try{obj=typeof har==='string'?JSON.parse(har):har;}catch{return fail('HAR_PARSE_FAILED',{sourceName});}
  const protocol=analyzeBetfairSportingWebtickersProtocolHar(obj,{sourceName});
  if(protocol?.valid===false)return fail(protocol.reason||'PROTOCOL_ANALYSIS_FAILED',{sourceName});
  const entries=Array.isArray(obj?.log?.entries)?obj.log.entries:[];
  const candidates=[];
  for(const fp of protocol?.protocolFingerprints||[]){
    const entry=entries[fp.entryIndex];
    if(!entry)continue;
    const expectedCasino=fp?.configBinding?.jackpotsCasino||null;
    const requestCasinoBound=requestCasinoMatches(fp,expectedCasino,entry);
    for(const payload of jsonPayloads(entry)){
      const parsed=parseJson(payload.text);if(parsed===null)continue;
      for(const node of walkObjects(parsed)){
        const row=candidateFromObject(node.value);if(!row)continue;
        const responseCasinoMatches=row.casino===null?null:String(row.casino).toLowerCase()===String(expectedCasino||'').toLowerCase();
        if(responseCasinoMatches===false)continue;
        candidates.push({
          entryIndex:fp.entryIndex,
          startedDateTime:fp.startedDateTime||null,
          payloadKind:payload.kind,
          payloadIndex:payload.index??null,
          objectPath:node.path,
          configuredEndpoint:fp?.configBinding?.tickerEndpoint||null,
          expectedBetfairImsCasino:expectedCasino,
          exactConfiguredEndpointMatch:fp.exactConfiguredEndpointMatch===true,
          configuredWebSocketTransportUpgradeObserved:fp.configuredWebSocketTransportUpgradeObserved===true,
          requestCasinoMatchesConfiguredBinding:requestCasinoBound,
          responseCasinoMatchesConfiguredBinding:responseCasinoMatches,
          row,
          coLocatedRequiredStateFields:true,
          exactModernResponseSemanticsVerified:false,
          usableForOverduePair:false,
        });
      }
    }
  }
  return {
    version:'betfair-sporting-webtickers-structured-row-v1.1-ws-direction-binding',
    mode:'OFFLINE_PASSIVE_MODERN_WEBTICKERS_STRUCTURED_ROW_DISCOVERY_NO_PLAY',
    sourceName,
    exactConfiguredWebtickersTrafficObserved:protocol?.exactModernWebtickersTrafficObserved===true,
    structuredSljp1RowCandidateCount:candidates.length,
    structuredSljp1RowCandidates:candidates,
    exactModernResponseSemanticsVerified:false,
    usableForOverduePair:false,
    scientificUse:'Candidates require game=sljp-1, EUR, local=0, amount, guaranteedHitTime, timestamp and winc to be co-located in one parsed JSON object (amount/GHT may be in that row own jackpot child). Conflicting aliases or duplicate co-located state values are rejected instead of selecting whichever value appears first. Empty optional instance codes remain equivalent to absence rather than ambiguity. Values are never assembled across sibling rows or unrelated frames. Request-side casino evidence is direction-safe and must resolve uniquely to the configured Betfair casino: URL/query, POST body and WebSocket client-send frames can support it; WebSocket receive frames cannot. This closes flattening, ambiguity and request/response contamination gaps only; unknown modern response semantics still prevent promotion to server truth or overdue execution evidence.',
    execution:{decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0},
    hardGuards:{onlineOnly:true,nonPromoOnly:true,offlineOnly:true,noNetwork:true,exactConfiguredBetfairWebtickersTrafficRequired:true,noCrossObjectFieldAssembly:true,conflictingCoLocatedStateValuesRejected:true,conflictingRequestCasinoEvidenceRejected:true,emptyOptionalInstanceCodeAllowed:true,webSocketReceiveCannotSatisfyRequestCasinoBinding:true,sljp1EurLocal0Required:true,amountGhtTimestampWincRequired:true,responseCasinoMismatchRejected:true,modernResponseSemanticsCannotBeGuessed:true,structuredCandidateCannotAuthorizeGreen:true,noWagerProbe:true,noAutomaticBetting:true},
  };
}
function fail(reason,extra={}){return {version:'betfair-sporting-webtickers-structured-row-v1.1-ws-direction-binding',mode:'OFFLINE_PASSIVE_MODERN_WEBTICKERS_STRUCTURED_ROW_DISCOVERY_NO_PLAY',valid:false,reason,structuredSljp1RowCandidateCount:0,structuredSljp1RowCandidates:[],exactModernResponseSemanticsVerified:false,usableForOverduePair:false,execution:{decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0},...extra};}

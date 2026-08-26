import {analyzeBetfairSportingWebtickersProtocolHar} from './betfair-sporting-webtickers-har-protocol-v1.mjs';

const finite=v=>{if(v===null||v===undefined||v===''||typeof v==='boolean')return null;const n=Number(v);return Number.isFinite(n)?n:null;};
const clean=v=>typeof v==='string'?v.trim():v;
const key=k=>String(k||'').toLowerCase().replace(/[^a-z0-9]/g,'');

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
function nestedObject(map,...names){
  for(const n of names){const v=map.get(key(n));if(v&&typeof v==='object'&&!Array.isArray(v))return v;}
  return null;
}
function normalizedLocal(v){return v===0||v==='0'||v===false?0:v===1||v==='1'||v===true?1:null;}
function epoch(v){const n=finite(v);return n!==null&&n>0?Math.trunc(n):null;}
function candidateFromObject(obj){
  const m=directMap(obj);
  const game=clean(scalar(m,'game','gameCode'));
  const currency=clean(scalar(m,'currency'));
  const local=normalizedLocal(scalar(m,'local'));
  if(String(game||'').toLowerCase()!=='sljp-1'||String(currency||'').toLowerCase()!=='eur'||local!==0)return null;

  const jackpot=nestedObject(m,'jackpot','amountData','amount');
  const jm=directMap(jackpot);
  const amount=finite(scalar(m,'amount') ?? scalar(jm,'amount','value'));
  const guaranteedHitTime=epoch(scalar(m,'guaranteedHitTime') ?? scalar(jm,'guaranteedHitTime'));
  const gameTimestamp=epoch(scalar(m,'timestamp','gameTimestamp'));
  const winCount=finite(scalar(m,'winc','winCount'));
  if(amount===null||amount<0||guaranteedHitTime===null||gameTimestamp===null||winCount===null||winCount<0)return null;

  const casino=clean(scalar(m,'casino'))||null;
  const instanceCode=clean(scalar(m,'instanceCode'))||clean(scalar(jm,'instanceCode'))||null;
  const gameGroup=clean(scalar(m,'gameGroup'))||null;
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
function requestCasinoMatches(fingerprint,bindingCasino){
  const expected=String(bindingCasino||'').toLowerCase();
  if(!expected)return false;
  const sources=[fingerprint?.request?.query?.safeProtocolValues,fingerprint?.request?.postData?.safeProtocolValues,fingerprint?.request?.webSocket?.safeProtocolValues];
  const observed=[];
  for(const src of sources)for(const v of src?.casino||[])observed.push(String(v).toLowerCase());
  return observed.includes(expected);
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
    const requestCasinoBound=requestCasinoMatches(fp,expectedCasino);
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
    version:'betfair-sporting-webtickers-structured-row-v1',
    mode:'OFFLINE_PASSIVE_MODERN_WEBTICKERS_STRUCTURED_ROW_DISCOVERY_NO_PLAY',
    sourceName,
    exactConfiguredWebtickersTrafficObserved:protocol?.exactModernWebtickersTrafficObserved===true,
    structuredSljp1RowCandidateCount:candidates.length,
    structuredSljp1RowCandidates:candidates,
    exactModernResponseSemanticsVerified:false,
    usableForOverduePair:false,
    scientificUse:'Candidates require game=sljp-1, EUR, local=0, amount, guaranteedHitTime, timestamp and winc to be co-located in one parsed JSON object (amount/GHT may be in that row own jackpot child). Values are never assembled across sibling rows or unrelated frames. This closes a flattening ambiguity only; unknown modern response semantics still prevent promotion to server truth or overdue execution evidence.',
    execution:{decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0},
    hardGuards:{onlineOnly:true,nonPromoOnly:true,offlineOnly:true,noNetwork:true,exactConfiguredBetfairWebtickersTrafficRequired:true,noCrossObjectFieldAssembly:true,sljp1EurLocal0Required:true,amountGhtTimestampWincRequired:true,responseCasinoMismatchRejected:true,modernResponseSemanticsCannotBeGuessed:true,structuredCandidateCannotAuthorizeGreen:true,noWagerProbe:true,noAutomaticBetting:true},
  };
}
function fail(reason,extra={}){return {version:'betfair-sporting-webtickers-structured-row-v1',mode:'OFFLINE_PASSIVE_MODERN_WEBTICKERS_STRUCTURED_ROW_DISCOVERY_NO_PLAY',valid:false,reason,structuredSljp1RowCandidateCount:0,structuredSljp1RowCandidates:[],exactModernResponseSemanticsVerified:false,usableForOverduePair:false,execution:{decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0},...extra};}

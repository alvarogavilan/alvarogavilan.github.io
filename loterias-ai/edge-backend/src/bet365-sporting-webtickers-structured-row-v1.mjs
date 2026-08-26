import {verifyBet365SportingConfiguredSljp1Transport} from './bet365-sporting-configured-sljp1-transport-v1.mjs';

const finite=v=>{if(v===null||v===undefined||v===''||typeof v==='boolean')return null;const n=Number(v);return Number.isFinite(n)?n:null;};
const clean=v=>typeof v==='string'?v.trim():v;
const key=k=>String(k||'').toLowerCase().replace(/[^a-z0-9]/g,'');
const uniq=a=>[...new Set(a.filter(v=>v!==null&&v!==undefined&&v!==''))];
function decode(content){const raw=String(content?.text||'');if(!raw)return '';if(String(content?.encoding||'').toLowerCase()!=='base64')return raw;try{if(typeof Buffer!=='undefined')return Buffer.from(raw,'base64').toString('utf8');}catch{}return '';}
function parseJson(s){try{return JSON.parse(s);}catch{return null;}}
function sse(body){const out=[];for(const line of String(body||'').split(/\r?\n/)){const m=line.match(/^\s*data\s*:\s*(.*)$/i);if(m&&m[1]&&m[1]!=='[DONE]')out.push(m[1]);}return out;}
function payloads(entry){const out=[];const body=decode(entry?.response?.content);if(body){out.push({kind:'response-body',text:body});sse(body).forEach((text,i)=>out.push({kind:'sse-data',index:i,text}));}for(let i=0;i<(entry?._webSocketMessages||[]).length;i++){const m=entry._webSocketMessages[i];if(m?.type==='receive'&&m?.data)out.push({kind:'websocket-receive',index:i,text:String(m.data)});}return out;}
function map(obj){const m=new Map();if(!obj||typeof obj!=='object'||Array.isArray(obj))return m;for(const [k,v] of Object.entries(obj))m.set(key(k),v);return m;}
function scalars(m,...names){const out=[];for(const n of names){const v=m.get(key(n));if(v===null||['string','number','boolean'].includes(typeof v))out.push(v);}return out;}
function nested(m,...names){for(const n of names){const v=m.get(key(n));if(v&&typeof v==='object'&&!Array.isArray(v))return v;}return null;}
function exact(values,normalizer=x=>x){const v=uniq(values.map(normalizer).filter(x=>x!==null&&x!==undefined&&x!==''));return v.length===1?v[0]:null;}
function local(v){return v===0||v==='0'||v===false?0:v===1||v==='1'||v===true?1:null;}
function epoch(v){const n=finite(v);return n!==null&&n>0?Math.trunc(n):null;}
function texts(values){return values.map(v=>String(clean(v)??'')).filter(Boolean);}
function candidate(obj){
  const m=map(obj),game=exact(scalars(m,'game','gameCode'),v=>String(clean(v)??'').toLowerCase()),currency=exact(scalars(m,'currency'),v=>String(clean(v)??'').toLowerCase()),loc=exact(scalars(m,'local'),local);
  if(game!=='sljp-1'||currency!=='eur'||loc!==0)return null;
  const jp=nested(m,'jackpot','amountData','amount'),jm=map(jp);
  const amount=exact([...scalars(m,'amount'),...scalars(jm,'amount','value')],finite);
  const guaranteedHitTime=exact([...scalars(m,'guaranteedHitTime'),...scalars(jm,'guaranteedHitTime')],epoch);
  const gameTimestamp=exact(scalars(m,'timestamp','gameTimestamp'),epoch);
  const winCount=exact(scalars(m,'winc','winCount'),finite);
  if(amount===null||amount<0||guaranteedHitTime===null||gameTimestamp===null||winCount===null||winCount<0)return null;
  const casinoVals=texts(scalars(m,'casino')),casino=casinoVals.length?exact(casinoVals,v=>v.toLowerCase()):null;if(casinoVals.length&&casino===null)return null;
  const instanceVals=texts([...scalars(m,'instanceCode'),...scalars(jm,'instanceCode')]),instanceCode=instanceVals.length?exact(instanceVals,v=>v.toLowerCase()):null;if(instanceVals.length&&instanceCode===null)return null;
  const groupVals=texts(scalars(m,'gameGroup','group')),gameGroup=groupVals.length?exact(groupVals,v=>v.toLowerCase()):null;if(groupVals.length&&gameGroup===null)return null;
  return {game:'sljp-1',currency:'EUR',local:0,amount,guaranteedHitTime,gameTimestamp,winCount,casino,instanceCode,gameGroup};
}
function walk(v,path='$',out=[],depth=0){if(depth>8||out.length>=200)return out;if(Array.isArray(v)){v.slice(0,100).forEach((x,i)=>walk(x,`${path}[${i}]`,out,depth+1));return out;}if(!v||typeof v!=='object')return out;out.push({path,value:v});for(const [k,x] of Object.entries(v))if(x&&typeof x==='object')walk(x,`${path}.${String(k).replace(/[^A-Za-z0-9_-]/g,'_')}`,out,depth+1);return out;}
function fail(reason,extra={}){return {version:'bet365-sporting-webtickers-structured-row-v1',valid:false,reason,structuredSljp1RowCandidateCount:0,structuredSljp1RowCandidates:[],exactModernResponseSemanticsVerified:false,exactCurrentSljp1ServerStateVerified:false,usableForOverduePair:false,usableForExecution:false,execution:{decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0},...extra};}

export function analyzeBet365SportingStructuredWebtickersRows(har,{gameCode,sourceName='capture.har'}={}){
  let obj;try{obj=typeof har==='string'?JSON.parse(har):har;}catch{return fail('HAR_PARSE_FAILED',{gameCode,sourceName});}
  const binding=verifyBet365SportingConfiguredSljp1Transport(obj,{gameCode,sourceName});
  if(binding?.valid!==true)return fail('CONFIGURED_SLJP1_TRANSPORT_BINDING_REQUIRED',{gameCode,sourceName,bindingReason:binding?.reason||null});
  const entryIndex=binding?.matchedTransport?.tickerEntryIndex,entry=(obj?.log?.entries||[])[entryIndex];if(!entry)return fail('MATCHED_TRANSPORT_ENTRY_NOT_FOUND',{gameCode,sourceName});
  const expectedCasino=String(binding?.configured?.jackpotsCasino||'').trim().toLowerCase();
  const expectedInstances=uniq((binding?.matchedTransport?.instanceCodeCandidates||[]).map(v=>String(v).trim().toLowerCase()).filter(Boolean));
  const rows=[];
  for(const p of payloads(entry)){
    const parsed=parseJson(p.text);if(parsed===null)continue;
    for(const node of walk(parsed)){
      const row=candidate(node.value);if(!row)continue;
      if(row.casino!==null&&row.casino!==expectedCasino)continue;
      if(expectedInstances.length===1&&row.instanceCode!==null&&row.instanceCode!==expectedInstances[0])continue;
      if(expectedInstances.length>1)continue;
      rows.push({entryIndex,payloadKind:p.kind,payloadIndex:p.index??null,objectPath:node.path,configuredJackpotsCasino:binding.configured.jackpotsCasino,configuredEndpoint:binding.matchedTransport.endpoint,requestCasinoMatchesOperatorConfig:true,requestEndpointMatchesOperatorConfig:true,row,coLocatedRequiredStateFields:true,exactModernResponseSemanticsVerified:false,exactCurrentSljp1ServerStateVerified:false,usableForOverduePair:false});
    }
  }
  const dedup=[],seen=new Set();for(const r of rows){const id=[r.entryIndex,r.payloadKind,r.payloadIndex,r.objectPath,JSON.stringify(r.row)].join('|');if(!seen.has(id)){seen.add(id);dedup.push(r);}}
  return {version:'bet365-sporting-webtickers-structured-row-v1',mode:'OFFLINE_PASSIVE_CONFIGURED_MODERN_SLJP1_ROW_DISCOVERY_NO_PLAY',valid:true,sourceName,target:binding.target,bet365OwnedConfiguredSljp1TransportBindingVerified:true,structuredSljp1RowCandidateCount:dedup.length,structuredSljp1RowCandidates:dedup,exactModernResponseSemanticsVerified:false,exactCurrentSljp1ServerStateVerified:false,servedTenCentEligibilityVerified:false,operatorFollowingDayRuleAdoptionVerified:false,usableForOverduePair:false,usableForExecution:false,scientificUse:'Candidate rows are accepted only from the exact transport entry already bound to a bet365.es-owned target configuration and exact outbound sljp-1 EUR local=0 request. amount, guaranteedHitTime, timestamp and winc must be co-located in one JSON object (amount/GHT may be in that object own jackpot child); conflicting aliases are rejected. Response casino/instance fields, when present, must not contradict the configured/request binding. This discovers a structured modern response candidate only. The undocumented modern response contract is still not independently verified, so candidate fields cannot be promoted to current server truth, overdue state, stake eligibility or execution.',execution:{decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0},hardGuards:{onlineOnly:true,nonPromoOnly:true,offlineOnly:true,passiveHarOnly:true,bet365OwnedConfiguredTransportRequired:true,exactSljp1EurLocalZeroRequestRequired:true,noCrossObjectFieldAssembly:true,conflictingAliasesRejected:true,responseCasinoMismatchRejected:true,responseInstanceMismatchRejected:true,websocketSendFramesIgnored:true,rawHarNeverEmitted:true,rawResponseNeverEmitted:true,modernResponseSemanticsCannotBeGuessed:true,structuredCandidateCannotAuthorizeGreen:true,noWagerProbe:true,noAutomaticBetting:true}};
}

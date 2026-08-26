import {analyzeBetfairSportingWebtickersProtocolHar} from './betfair-sporting-webtickers-har-protocol-v1.mjs';

const SAFE_KEYS=new Set(['info','casino','game','gamecode','currency','local','instancecode']);
const uniq=a=>[...new Set(a.filter(v=>v!==null&&v!==undefined&&v!==''))];
const clean=v=>String(v??'').trim();
const key=k=>clean(k).toLowerCase().replace(/[^a-z0-9]/g,'');

function add(dst,k,v){
  const n=key(k);
  if(!SAFE_KEYS.has(n))return;
  const s=clean(v);
  if(!s||s.length>200)return;
  if(!dst[n])dst[n]=[];
  dst[n]=uniq([...dst[n],s]);
}
function merge(...sources){
  const out={};
  for(const src of sources)for(const [k,vals] of Object.entries(src||{}))for(const v of Array.isArray(vals)?vals:[vals])add(out,k,v);
  return out;
}
function flatten(value,out={},depth=0){
  if(depth>6)return out;
  if(Array.isArray(value)){value.slice(0,20).forEach(v=>flatten(v,out,depth+1));return out;}
  if(!value||typeof value!=='object')return out;
  for(const [k,v] of Object.entries(value)){
    if(v===null||['string','number','boolean'].includes(typeof v))add(out,k,v);
    else flatten(v,out,depth+1);
  }
  return out;
}
function parseSafeText(text){
  const raw=String(text||'').trim();
  if(!raw)return {};
  try{return flatten(JSON.parse(raw),{});}catch{}
  try{
    const q=new URLSearchParams(raw);const out={};let seen=false;
    for(const [k,v] of q){seen=true;add(out,k,v);}
    if(seen)return out;
  }catch{}
  return {};
}
function wsSendValueSets(entry,baseValues){
  const frames=Array.isArray(entry?._webSocketMessages)?entry._webSocketMessages:[];
  const out=[];
  for(let i=0;i<frames.length;i++){
    const frame=frames[i];
    if(frame?.type!=='send'||!frame?.data)continue;
    const values=merge(baseValues,parseSafeText(frame.data));
    out.push({source:`websocket-send:${i}`,values});
  }
  return out;
}
function vals(src,name){return (src?.[key(name)]||[]).map(v=>clean(v));}
function has(src,name,expected){
  const e=clean(expected).toLowerCase();
  return vals(src,name).some(v=>v.toLowerCase()===e);
}
function observed(src,name){return vals(src,name).length>0;}
function evaluate(values,{expectedCasino,expectedInstanceCode=null}={}){
  const infoGameBased=has(values,'info','1');
  const casinoMatches=has(values,'casino',expectedCasino);
  const gameMatches=has(values,'game','sljp-1')||has(values,'gameCode','sljp-1');
  const currencyEur=has(values,'currency','EUR');
  const localGlobal=has(values,'local','0')||has(values,'local','false');
  const instanceObserved=observed(values,'instanceCode');
  const instanceCodeConsistent=!expectedInstanceCode||!instanceObserved||has(values,'instanceCode',expectedInstanceCode);
  const providerDocumentedGameRequestComplete=infoGameBased&&casinoMatches&&gameMatches;
  const exactSportingDailyScopeObserved=providerDocumentedGameRequestComplete&&currencyEur&&localGlobal&&instanceCodeConsistent;
  return {
    values,
    infoGameBased,
    casinoMatches,
    gameMatches,
    currencyEur,
    localGlobal,
    instanceCodeObserved:instanceObserved,
    instanceCodeConsistent,
    providerDocumentedGameRequestComplete,
    exactSportingDailyScopeObserved,
    requestContractSemanticsSupportedByProviderSpec:exactSportingDailyScopeObserved,
  };
}

export function analyzeBetfairSportingWebtickersRequestSemantics(har,{sourceName='capture.har'}={}){
  let obj;
  try{obj=typeof har==='string'?JSON.parse(har):har;}catch{return fail('HAR_PARSE_FAILED',{sourceName});}
  const protocol=analyzeBetfairSportingWebtickersProtocolHar(obj,{sourceName});
  if(protocol?.valid===false)return fail(protocol.reason||'PROTOCOL_ANALYSIS_FAILED',{sourceName});
  const entries=Array.isArray(obj?.log?.entries)?obj.log.entries:[];
  const observations=[];
  for(const fp of protocol?.protocolFingerprints||[]){
    const entry=entries[fp.entryIndex];
    if(!entry)continue;
    const expectedCasino=fp?.configBinding?.jackpotsCasino||null;
    const expectedInstanceCode=fp?.configBinding?.instanceCode||null;
    const queryValues=fp?.request?.query?.safeProtocolValues||{};
    const postValues=fp?.request?.postData?.safeProtocolValues||{};
    const httpValues=merge(queryValues,postValues);
    if(Object.keys(httpValues).length){
      observations.push({
        entryIndex:fp.entryIndex,
        startedDateTime:fp.startedDateTime||null,
        source:'http-request',
        method:fp?.request?.method||null,
        endpoint:fp?.request?.endpoint||null,
        configuredWebSocketTransportUpgradeObserved:false,
        expectedBetfairImsCasino:expectedCasino,
        expectedInstanceCode,
        ...evaluate(httpValues,{expectedCasino,expectedInstanceCode}),
      });
    }
    const wsBase=merge(queryValues);
    for(const ws of wsSendValueSets(entry,wsBase)){
      observations.push({
        entryIndex:fp.entryIndex,
        startedDateTime:fp.startedDateTime||null,
        source:ws.source,
        method:fp?.request?.method||null,
        endpoint:fp?.request?.endpoint||null,
        configuredWebSocketTransportUpgradeObserved:fp.configuredWebSocketTransportUpgradeObserved===true,
        expectedBetfairImsCasino:expectedCasino,
        expectedInstanceCode,
        ...evaluate(ws.values,{expectedCasino,expectedInstanceCode}),
      });
    }
  }
  const matches=observations.filter(x=>x.requestContractSemanticsSupportedByProviderSpec===true);
  return {
    version:'betfair-sporting-webtickers-request-semantics-v1',
    mode:'OFFLINE_PASSIVE_PROVIDER_DOCUMENTED_REQUEST_SEMANTICS_NO_PLAY',
    sourceName,
    exactConfiguredWebtickersTrafficObserved:protocol?.exactModernWebtickersTrafficObserved===true,
    requestSemanticObservationCount:observations.length,
    providerDocumentedExactDailyRequestMatchCount:matches.length,
    providerDocumentedExactDailyRequestObserved:matches.length>0,
    requestSemanticObservations:observations,
    exactModernTransportContractVerified:false,
    exactModernResponseSemanticsVerified:false,
    directPublicModernProbeAllowed:false,
    usableForOverduePair:false,
    scientificUse:'Playtech ticker documentation independently defines game-based info=1 with casino and game, plus local, currency and optional instanceCode semantics; Sporting Legends documentation identifies Daily as sljp-1 and global local=0. This analyzer checks whether an exact Betfair-configured webtickers request observed in HAR carries those documented semantics without emitting credentials. A semantic match does not prove the modern transport contract, response schema, live row truth or overdue state.',
    execution:{decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0},
    hardGuards:{onlineOnly:true,nonPromoOnly:true,offlineOnly:true,noNetwork:true,exactBetfairConfiguredWebtickersTrafficRequired:true,providerDocumentedInfo1CasinoGameRequired:true,sljp1EurLocal0Required:true,otherOperatorValuesCannotTransfer:true,credentialsNeverEmitted:true,requestSemanticMatchCannotAuthorizeGreen:true,directModernProbeBlocked:true,noWagerProbe:true,noAutomaticBetting:true},
  };
}
function fail(reason,extra={}){
  return {version:'betfair-sporting-webtickers-request-semantics-v1',mode:'OFFLINE_PASSIVE_PROVIDER_DOCUMENTED_REQUEST_SEMANTICS_NO_PLAY',valid:false,reason,providerDocumentedExactDailyRequestObserved:false,providerDocumentedExactDailyRequestMatchCount:0,directPublicModernProbeAllowed:false,usableForOverduePair:false,execution:{decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0},...extra};
}

import {analyzeBetfairSportingHar} from './betfair-sporting-har-discovery-v1.mjs';

const VERSION='betfair-sporting-stake-menu-har-discovery-v1.1-total-stake-classes';
const SUPPORTED_GAME_IDS=new Set([
  'ap-mccoy-sporting-legends-cptn',
  'ronnie-osullivan-sporting-legends-cptn',
  'frankie-dettori-sporting-legends-cptn',
  'roberto-carlos-sl-cptn',
]);
const STRONG_TOTAL_MENU_KEYS=new Set([
  'availabletotalbets','availabletotalstakes','allowedtotalbets','allowedtotalstakes',
  'totalbetvalues','totalstakevalues','totalbetoptions','totalstakeoptions',
]);
const TOTAL_SCALAR_KEYS=new Set([
  'minimumtotalbet','mintotalbet','minimumtotalstake','mintotalstake','maximumtotalbet','maxtotalbet','maximumtotalstake','maxtotalstake','totalbet','totalstake',
]);
const GENERIC_STAKE_KEYS=new Set([
  'minbet','minimumbet','minstake','minimumstake','maxbet','maximumbet','maxstake','maximumstake',
  'betvalues','betamounts','stakevalues','betoptions','stakeoptions',
]);
const COMPONENT_KEYS=new Set([
  'denominations','coinvalues','mincoin','maxcoin','coinvalue','betperline','linebet','minlinebet','maxlinebet','minbetperline','maxbetperline','activepaylines','paylines',
]);
const KEY_SET=new Set([...STRONG_TOTAL_MENU_KEYS,...TOTAL_SCALAR_KEYS,...GENERIC_STAKE_KEYS,...COMPONENT_KEYS]);
const clean=v=>String(v??'').trim();
const normalizeKey=k=>clean(k).toLowerCase().replace(/[^a-z0-9]/g,'');
const finite=v=>{if(v===null||v===undefined||v===''||typeof v==='boolean')return null;const n=Number(v);return Number.isFinite(n)?n:null;};
const endpointShape=v=>{try{const u=new URL(clean(v));return `${u.origin}${u.pathname}`;}catch{return null;}};
function decodeContent(content){const raw=String(content?.text||'');if(!raw)return '';if(String(content?.encoding||'').toLowerCase()!=='base64')return raw;try{if(typeof Buffer!=='undefined')return Buffer.from(raw,'base64').toString('utf8');}catch{}return '';}
function numbersFromValue(v){
  const out=[];
  const add=x=>{const n=finite(x);if(n!==null&&n>=0&&n<=1_000_000)out.push(n);};
  if(Array.isArray(v)){for(const x of v.slice(0,500)){if(Array.isArray(x))for(const y of x.slice(0,100))add(y);else add(x);}}
  else add(v);
  return [...new Set(out)];
}
function semanticClass(nk){if(STRONG_TOTAL_MENU_KEYS.has(nk))return 'EXPLICIT_TOTAL_STAKE_MENU';if(TOTAL_SCALAR_KEYS.has(nk))return 'EXPLICIT_TOTAL_STAKE_SCALAR';if(GENERIC_STAKE_KEYS.has(nk))return 'GENERIC_STAKE_FIELD';if(COMPONENT_KEYS.has(nk))return 'BET_COMPONENT_OR_PAYLINE_FIELD';return 'OTHER';}
function scanJson(value,{entryIndex,source,endpoint,path='$'},out=[],depth=0){
  if(depth>12||out.length>500)return out;
  if(Array.isArray(value)){value.slice(0,500).forEach((v,i)=>scanJson(v,{entryIndex,source,endpoint,path:`${path}[${i}]`},out,depth+1));return out;}
  if(!value||typeof value!=='object')return out;
  for(const [k,v] of Object.entries(value)){
    const nk=normalizeKey(k),p=`${path}.${k}`;
    if(KEY_SET.has(nk)){
      const nums=numbersFromValue(v);
      if(nums.length)out.push({entryIndex,source,endpoint,key:k,normalizedKey:nk,semanticClass:semanticClass(nk),objectPath:p,numericValues:nums,valueWasArray:Array.isArray(v)});
    }
    if(v&&typeof v==='object')scanJson(v,{entryIndex,source,endpoint,path:p},out,depth+1);
  }
  return out;
}
function parseAndScan(raw,meta,out){const s=String(raw||'').trim();if(!s)return;try{scanJson(JSON.parse(s),meta,out);}catch{}}
function latestPrecedingLauncher(bindings,index){return (bindings||[]).filter(x=>Number.isInteger(x?.index)&&x.index<index).sort((a,b)=>b.index-a.index)[0]||null;}
function fail(reason,extra={}){return {version:VERSION,valid:false,reason,stakeMenuCandidateObserved:false,strongTotalStakeMenuCandidateObserved:false,servedStakeMenuSemanticsVerified:false,stakeAtDecisionExactVerified:false,execution:{decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0},...extra};}

export function discoverBetfairSportingStakeMenuCandidates(har,{gameId,sourceName='capture.har'}={}){
  const target=clean(gameId);
  if(!target||!SUPPORTED_GAME_IDS.has(target))return fail('UNSUPPORTED_OR_MISSING_SPORTING_GAME_ID',{sourceName,gameId:target||null});
  let obj,discovery;
  try{obj=typeof har==='string'?JSON.parse(har):har;}catch{return fail('HAR_PARSE_FAILED',{sourceName,gameId:target});}
  try{discovery=analyzeBetfairSportingHar(obj,{sourceName});}catch{return fail('HAR_DISCOVERY_FAILED',{sourceName,gameId:target});}
  const entries=Array.isArray(obj?.log?.entries)?obj.log.entries:[];
  const launchers=discovery?.discovery?.betfairRealCasinoLauncherBindings||[];
  const candidates=[];
  for(let i=0;i<entries.length;i++){
    const latest=latestPrecedingLauncher(launchers,i);
    if(!latest||latest.gameId!==target)continue;
    const entry=entries[i],endpoint=endpointShape(entry?.request?.url);
    parseAndScan(decodeContent(entry?.response?.content),{entryIndex:i,source:'http-response',endpoint},candidates);
    for(let j=0;j<(entry?._webSocketMessages||[]).length;j++){
      const msg=entry._webSocketMessages[j];if(msg?.type!=='receive'||!msg?.data)continue;
      parseAndScan(msg.data,{entryIndex:i,source:`websocket-receive:${j}`,endpoint},candidates);
    }
  }
  const dedup=[],seen=new Set();
  for(const c of candidates){const id=[c.entryIndex,c.source,c.endpoint,c.normalizedKey,c.objectPath,JSON.stringify(c.numericValues)].join('|');if(!seen.has(id)){seen.add(id);dedup.push(c);}}
  const keys=[...new Set(dedup.map(x=>x.normalizedKey))].sort();
  const strongTotalMenuCandidates=dedup.filter(x=>x.semanticClass==='EXPLICIT_TOTAL_STAKE_MENU'&&x.valueWasArray===true);
  const explicitTotalScalarCandidates=dedup.filter(x=>x.semanticClass==='EXPLICIT_TOTAL_STAKE_SCALAR');
  return {
    version:VERSION,mode:'OFFLINE_PASSIVE_EXACT_GAME_STAKE_MENU_CANDIDATE_DISCOVERY_NO_PLAY',valid:true,sourceName,gameId:target,
    stakeMenuCandidateObserved:dedup.length>0,candidateCount:dedup.length,observedNormalizedKeys:keys,candidates:dedup,
    strongTotalStakeMenuCandidateObserved:strongTotalMenuCandidates.length>0,strongTotalStakeMenuCandidateCount:strongTotalMenuCandidates.length,strongTotalStakeMenuCandidates,
    explicitTotalStakeScalarCandidateCount:explicitTotalScalarCandidates.length,explicitTotalStakeScalarCandidates,
    servedStakeMenuSemanticsVerified:false,stakeAtDecisionExactVerified:false,
    scientificUse:'Scans only server HTTP response bodies and WebSocket receive frames after the latest exact target real-money Betfair launcher. Candidates are now classified before review: explicit total-stake menu arrays are kept separate from total-stake scalars, generic stake fields and component/payline fields. This narrows the review surface but does not self-verify semantics. Coin values, line bets, paylines, generic betValues and even names containing total stake remain non-executable until an independent exact-title served-artifact review is code-allowlisted. No raw body, query, cookie or credential is emitted.',
    execution:{decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0},
    hardGuards:{onlineOnly:true,nonPromoOnly:true,offlineOnly:true,noNetwork:true,exactLatestTargetLauncherRequired:true,serverResponsesOnly:true,clientSelectedBetValuesIgnored:true,rawHarNeverEmitted:true,credentialsAndCookiesNeverEmitted:true,endpointQueriesAndFragmentsNeverEmitted:true,numericCandidateDoesNotEqualServedStakeMenu:true,strongMenuCandidateStillRequiresIndependentReview:true,totalScalarDoesNotProveMenu:true,genericStakeFieldDoesNotProveTotalStake:true,coinValueCannotBeAssumedTotalBet:true,lineBetCannotBeAssumedTotalBet:true,paylineCountCannotBeAssumedActiveAtDecision:true,stakeDiscoveryCannotAuthorizeGreen:true,noWagerProbe:true,noAutomaticBetting:true}
  };
}

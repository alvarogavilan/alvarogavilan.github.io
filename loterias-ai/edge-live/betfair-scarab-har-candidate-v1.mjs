import {createHash} from 'node:crypto';

const VERSION='betfair-scarab-har-candidate-v1';
const EXACT_GAME_ID='scarab-aig';
const MAX_BODY_BYTES=5_000_000;
const execution=()=>({decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0});
const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const sha256=v=>createHash('sha256').update(v).digest('hex');
function endpoint(v){try{const u=new URL(String(v||''));return `${u.origin}${u.pathname}`;}catch{return null;}}
function bodyText(e){const c=e?.response?.content||{},raw=typeof c.text==='string'?c.text:'';if(!raw)return '';try{const s=String(c.encoding||'').toLowerCase()==='base64'?Buffer.from(raw,'base64').toString('utf8'):raw;return Buffer.byteLength(s,'utf8')<=MAX_BODY_BYTES?s:'';}catch{return '';}}
function exactLauncher(url){try{const u=new URL(String(url||''));return /(^|\.)launcher\.betfair\.es$/i.test(u.hostname)&&u.searchParams.get('gameId')===EXACT_GAME_ID&&u.searchParams.get('mode')==='real'&&u.searchParams.get('RPBucket')==='casino'&&u.searchParams.get('dataChannel')==='casino';}catch{return false;}}
function concepts(body,url){const s=norm(`${url||''}\n${body||''}`);
  const title=s.includes('scarab')||s.includes(EXACT_GAME_ID);
  const providerIgt=/(^|[^a-z0-9])igt([^a-z0-9]|$)/i.test(s)||s.includes('international game technology');
  const cycle=/(game|spin|giro|tirada)[^0-9]{0,12}(?:[1-9]|10)[^0-9]{0,8}(?:of|de|\/)[^0-9]{0,8}10/i.test(s)||s.includes('10-spin')||s.includes('10 spin')||s.includes('10 giros');
  const goldBorder=['gold border','golden border','gold frame','golden frame','borde dorado','marco dorado'].some(x=>s.includes(x));
  const state=['state','saved','stored','retained','persist','session','account','player','denomination','bet level','betlevel','estado','guardado','cuenta','jugador','denominacion','nivel de apuesta'].filter(x=>s.includes(norm(x)));
  const rtp=/\brtp\b/i.test(s)||s.includes('return to player')||s.includes('retorno al jugador');
  const betLevel=['bet level','betlevel','denomination','denominacion','denominación','total bet','apuesta total'].some(x=>s.includes(norm(x)));
  const configCandidate=title&&(providerIgt||cycle||goldBorder)&&(rtp||betLevel||cycle);
  const stateCandidate=title&&(cycle||goldBorder)&&state.length>0;
  return {title,providerIgt,cycle,goldBorder,stateTerms:state,rtp,betLevel,configCandidate,stateCandidate};}
function fail(reason,extra={}){return {version:VERSION,valid:false,reason,targetLauncherObserved:false,usableForExecution:false,execution:execution(),...extra};}
export function extractBetfairScarabHarCandidate(har,{sourceName='betfair-scarab.har'}={}){
  const entries=Array.isArray(har?.log?.entries)?har.log.entries:null;if(!entries)return fail('VALID_HAR_ENTRIES_REQUIRED',{sourceName});
  const launchers=[];for(let i=0;i<entries.length;i++)if(exactLauncher(entries[i]?.request?.url))launchers.push(i);
  if(!launchers.length)return fail('EXACT_BETFAIR_SPAIN_SCARAB_REAL_LAUNCHER_REQUIRED',{sourceName,exactGameId:EXACT_GAME_ID});
  const first=launchers[0],candidates=[];
  for(let i=first+1;i<entries.length;i++){
    const e=entries[i]||{},status=Number(e?.response?.status),body=bodyText(e),url=e?.request?.url||'';if(!body||!(status>=200&&status<400))continue;
    const c=concepts(body,url);if(!(c.title||c.providerIgt||c.configCandidate||c.stateCandidate))continue;
    candidates.push({entryIndex:i,endpoint:endpoint(url),mimeType:String(e?.response?.content?.mimeType||'')||null,bodySha256:sha256(body),bodyBytes:Buffer.byteLength(body,'utf8'),concepts:c,reviewUse:c.configCandidate&&c.stateCandidate?'CONFIG_AND_ACCOUNT_STATE_REVIEW_CANDIDATE':c.stateCandidate?'ACCOUNT_STATE_REVIEW_CANDIDATE':c.configCandidate?'CONFIG_REVIEW_CANDIDATE':'IDENTITY_REVIEW_CANDIDATE'});
  }
  return {version:VERSION,valid:true,reason:candidates.length?'BETFAIR_SCARAB_REVIEW_CANDIDATES_FOUND':'TARGET_LAUNCHER_FOUND_NO_REVIEW_BODY_RECOVERED',sourceName,target:{operator:'Betfair Spain',title:'Scarab',gameId:EXACT_GAME_ID,family:'TEN_SPIN_ACCOUNT_STATE_CANDIDATE'},targetLauncherObserved:true,launcherCount:launchers.length,firstLauncherEntryIndex:first,candidateCount:candidates.length,providerIgtCandidateCount:candidates.filter(x=>x.concepts.providerIgt).length,cycleCandidateCount:candidates.filter(x=>x.concepts.cycle).length,goldBorderCandidateCount:candidates.filter(x=>x.concepts.goldBorder).length,accountStateCandidateCount:candidates.filter(x=>x.concepts.stateCandidate).length,candidates,
    exactSpainServedProviderBuildVerified:false,exactSpainTheoreticalRtpVerified:false,exactSpainBetMenuVerified:false,currentCycleStateVerified:false,perDenominationStateScopeVerified:false,accountPrivateStateVerified:false,crossPlayerInheritanceVerified:false,initialStatePositiveEvVerified:false,currentStatePositiveEvVerified:false,independentReviewRequired:true,usableForExecution:false,execution:execution(),
    reviewRequirements:{config:'Bind exact IGT/build/RTP/bet menu to the current Betfair Spain scarab-aig session.',state:'Recover current spin-in-cycle and gold-border positions for each selectable denomination without wagering.',scope:'Determine whether state is per-account/per-denomination, shared, or reset; do not transfer physical cross-player behavior.',economics:'Recalculate conditional EV for the exact online state/configuration before any promotion.'},
    hardGuards:{onlineOnly:true,nonPromoOnly:true,offlineOnly:true,passiveHarOnly:true,exactRealLauncherRequired:true,rawResponseBodiesNeverEmitted:true,requestQueriesNeverEmitted:true,credentialsNeverEmitted:true,physicalStrategyCannotSetSpainThreshold:true,oneAccountCannotProveCrossPlayerScope:true,initialStateCannotBeAssumedPositiveEv:true,noMultiAccountStrategy:true,noWagerProbe:true,noAutomaticBetting:true,realMoneyAllowed:false}}
}

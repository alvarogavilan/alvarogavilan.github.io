import {createHash} from 'node:crypto';

const VERSION='betfair-magic-of-the-nile-har-candidate-v1';
const EXACT_GAME_ID='magic-of-nile-aig';
const MAX_BODY_BYTES=5_000_000;
const execution=()=>({decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0});
const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const sha256=v=>createHash('sha256').update(v).digest('hex');
function endpoint(v){try{const u=new URL(String(v||''));return `${u.origin}${u.pathname}`;}catch{return null;}}
function bodyText(e){const c=e?.response?.content||{},raw=typeof c.text==='string'?c.text:'';if(!raw)return '';try{const s=String(c.encoding||'').toLowerCase()==='base64'?Buffer.from(raw,'base64').toString('utf8'):raw;return Buffer.byteLength(s,'utf8')<=MAX_BODY_BYTES?s:'';}catch{return '';}}
function exactLauncher(url){try{const u=new URL(String(url||''));return /(^|\.)launcher\.betfair\.es$/i.test(u.hostname)&&u.searchParams.get('gameId')===EXACT_GAME_ID&&u.searchParams.get('mode')==='real'&&u.searchParams.get('RPBucket')==='casino'&&u.searchParams.get('dataChannel')==='casino';}catch{return false;}}
function concepts(body,url){
  const s=norm(`${url||''}\n${body||''}`);
  const title=s.includes('magic of the nile')||s.includes(EXACT_GAME_ID);
  const providerIgt=/(^|[^a-z0-9])igt([^a-z0-9]|$)/i.test(s)||s.includes('international game technology');
  const obelisk=['obelisk','obelisks','obelisco','obeliscos'].some(x=>s.includes(x));
  const gems=['gem','gems','gema','gemas'].some(x=>s.includes(x));
  const colors={red:['red gem','red gems','red obelisk','gema roja','gemas rojas','obelisco rojo'].some(x=>s.includes(x)),blue:['blue gem','blue gems','blue obelisk','gema azul','gemas azules','obelisco azul'].some(x=>s.includes(x)),green:['green gem','green gems','green obelisk','gema verde','gemas verdes','obelisco verde'].some(x=>s.includes(x))};
  const persistence=['saved separately','remain between','remains between','persistent','persistente','guardado','guardados','saved','stored','retained','between sessions','entre sesiones','cash out'].some(x=>s.includes(norm(x)));
  const betLevel=['bet level','betlevel','denomination','denominacion','denominación','total bet','apuesta total','nivel de apuesta'].some(x=>s.includes(norm(x)));
  const accountScope=['account','player id','playerid','user','session','cuenta','jugador','usuario'].some(x=>s.includes(x));
  const rtp=/\brtp\b/i.test(s)||s.includes('return to player')||s.includes('retorno al jugador');
  const modifier=['random wild','expanded reels','multiplier wild','free respin','respin modifier','wild aleatorio','carretes expandidos','wild multiplicador'].some(x=>s.includes(x));
  const configCandidate=title&&(providerIgt||obelisk||gems)&&(rtp||betLevel||modifier);
  const stateCandidate=title&&obelisk&&gems&&(persistence||betLevel||colors.red||colors.blue||colors.green);
  return {title,providerIgt,obelisk,gems,colors,persistence,betLevel,accountScope,rtp,modifier,configCandidate,stateCandidate};
}
function fail(reason,extra={}){return {version:VERSION,valid:false,reason,targetLauncherObserved:false,usableForExecution:false,execution:execution(),...extra};}
export function extractBetfairMagicOfTheNileHarCandidate(har,{sourceName='betfair-magic-of-the-nile.har'}={}){
  const entries=Array.isArray(har?.log?.entries)?har.log.entries:null;if(!entries)return fail('VALID_HAR_ENTRIES_REQUIRED',{sourceName});
  const launchers=[];for(let i=0;i<entries.length;i++)if(exactLauncher(entries[i]?.request?.url))launchers.push(i);
  if(!launchers.length)return fail('EXACT_BETFAIR_SPAIN_MAGIC_OF_THE_NILE_REAL_LAUNCHER_REQUIRED',{sourceName,exactGameId:EXACT_GAME_ID});
  const first=launchers[0],candidates=[];
  for(let i=first+1;i<entries.length;i++){
    const e=entries[i]||{},status=Number(e?.response?.status),body=bodyText(e),url=e?.request?.url||'';if(!body||!(status>=200&&status<400))continue;
    const c=concepts(body,url);if(!(c.title||c.providerIgt||c.configCandidate||c.stateCandidate))continue;
    candidates.push({entryIndex:i,endpoint:endpoint(url),mimeType:String(e?.response?.content?.mimeType||'')||null,bodySha256:sha256(body),bodyBytes:Buffer.byteLength(body,'utf8'),concepts:c,reviewUse:c.configCandidate&&c.stateCandidate?'CONFIG_AND_GEM_STATE_REVIEW_CANDIDATE':c.stateCandidate?'GEM_STATE_REVIEW_CANDIDATE':c.configCandidate?'CONFIG_REVIEW_CANDIDATE':'IDENTITY_REVIEW_CANDIDATE'});
  }
  return {version:VERSION,valid:true,reason:candidates.length?'BETFAIR_MAGIC_OF_THE_NILE_REVIEW_CANDIDATES_FOUND':'TARGET_LAUNCHER_FOUND_NO_REVIEW_BODY_RECOVERED',sourceName,target:{operator:'Betfair Spain',title:'Magic of the Nile',gameId:EXACT_GAME_ID,family:'THREE_OBELISK_PERSISTENT_GEM_STATE_CANDIDATE'},targetLauncherObserved:true,launcherCount:launchers.length,firstLauncherEntryIndex:first,candidateCount:candidates.length,providerIgtCandidateCount:candidates.filter(x=>x.concepts.providerIgt).length,configurationCandidateCount:candidates.filter(x=>x.concepts.configCandidate).length,gemStateCandidateCount:candidates.filter(x=>x.concepts.stateCandidate).length,candidates,
    exactSpainServedProviderBuildVerified:false,exactSpainTheoreticalRtpVerified:false,exactSpainBetMenuVerified:false,persistencePerBetLevelVerified:false,currentGemVectorVerified:false,accountPrivateStateVerified:false,crossPlayerInheritanceVerified:false,stateSpecificEvVerified:false,positiveEvEntryStateVerified:false,independentReviewRequired:true,usableForExecution:false,execution:execution(),
    reviewRequirements:{config:'Bind exact IGT/build/RTP/bet menu to current Betfair Spain magic-of-nile-aig.',state:'Recover exact visible [red,blue,green] gem vector per selectable bet level before wagering.',scope:'Determine account-private versus shared persistence; other operators only establish the mechanic, not Betfair state scope.',economics:'Compute exact conditional EV for each reviewed gem vector using the same Spain build/paytable/transition model.'},
    hardGuards:{onlineOnly:true,nonPromoOnly:true,offlineOnly:true,passiveHarOnly:true,exactRealLauncherRequired:true,rawResponseBodiesNeverEmitted:true,requestQueriesNeverEmitted:true,credentialsNeverEmitted:true,otherOperatorPersistenceCannotSetSpainGate:true,historicalStartingStateCannotTransfer:true,oneAccountCannotProveCrossPlayerScope:true,noMultiAccountStrategy:true,noWagerProbe:true,noAutomaticBetting:true,realMoneyAllowed:false}}
}

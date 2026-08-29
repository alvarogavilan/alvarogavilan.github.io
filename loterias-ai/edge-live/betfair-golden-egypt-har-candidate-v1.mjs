import {createHash} from 'node:crypto';

const VERSION='betfair-golden-egypt-har-candidate-v1';
const EXACT_GAME_ID='golden-egypt-aem';
const MAX_BODY_BYTES=5_000_000;
const execution=()=>({decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0});
const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const sha256=v=>createHash('sha256').update(v).digest('hex');
function endpoint(v){try{const u=new URL(String(v||''));return `${u.origin}${u.pathname}`;}catch{return null;}}
function bodyText(e){const c=e?.response?.content||{},raw=typeof c.text==='string'?c.text:'';if(!raw)return '';try{const s=String(c.encoding||'').toLowerCase()==='base64'?Buffer.from(raw,'base64').toString('utf8'):raw;return Buffer.byteLength(s,'utf8')<=MAX_BODY_BYTES?s:'';}catch{return '';}}
function exactLauncher(url){try{const u=new URL(String(url||''));return /(^|\.)launcher\.betfair\.es$/i.test(u.hostname)&&u.searchParams.get('gameId')===EXACT_GAME_ID&&u.searchParams.get('mode')==='real'&&u.searchParams.get('RPBucket')==='arcade'&&u.searchParams.get('dataChannel')==='arcade'&&u.searchParams.get('launchProduct')==='arcade';}catch{return false;}}
function concepts(body,url){
  const s=norm(`${url||''}\n${body||''}`);
  const title=s.includes('golden egypt')||s.includes(EXACT_GAME_ID);
  const providerIgt=/(^|[^a-z0-9])igt([^a-z0-9]|$)/i.test(s)||s.includes('international game technology');
  const providerMga=s.includes('mga games')||s.includes('mgagames')||s.includes('mga game');
  const providerOther=/(provider|proveedor)[^\n]{0,40}/i.test(s)&&!providerIgt&&!providerMga;
  const coin=['coin','coins','moneda','monedas'].some(x=>s.includes(x));
  const reel=['reel','reels','rodillo','rodillos'].some(x=>s.includes(x));
  const wild=['wild','comodin','comodín'].some(x=>s.includes(norm(x)));
  const twoCoinRule=/(2|two|dos)[^\n]{0,35}(coin|coins|moneda|monedas)/i.test(s);
  const twoWildSpins=/(2|two|dos)[^\n]{0,35}(spin|spins|giro|giros|tirada|tiradas)/i.test(s)&&wild;
  const wildStays2=s.includes('wild stays 2 plays')||s.includes('wild stays two plays');
  const persistence=['persistent','persistente','saved','stored','retained','remain','remains','carry over','between sessions','guardado','conserva','permanece'].some(x=>s.includes(norm(x)));
  const paylines25=(s.includes('25 paylines')||s.includes('25 lineas')||s.includes('25 líneas'));
  const bet=['total bet','bet menu','apuesta total','menu de apuesta','menú de apuesta','bet level','denomination'].some(x=>s.includes(norm(x)));
  const rtp=/\brtp\b/i.test(s)||s.includes('return to player')||s.includes('retorno al jugador');
  const exactIgtMechanicCandidate=title&&coin&&reel&&wild&&(wildStays2||(twoCoinRule&&twoWildSpins));
  const configCandidate=title&&(providerIgt||providerMga||rtp||bet||paylines25);
  const stateCandidate=title&&coin&&reel&&(persistence||exactIgtMechanicCandidate);
  return {title,providerIgt,providerMga,providerOther,coin,reel,wild,twoCoinRule,twoWildSpins,wildStays2,persistence,paylines25,bet,rtp,exactIgtMechanicCandidate,configCandidate,stateCandidate};
}
function fail(reason,extra={}){return {version:VERSION,valid:false,reason,target:{operator:'Betfair Spain',product:'Arcade',title:'Golden Egypt',gameId:EXACT_GAME_ID},usableForExecution:false,execution:execution(),...extra};}

export function extractBetfairGoldenEgyptHarCandidate(har,{sourceName='betfair-golden-egypt.har'}={}){
  const entries=Array.isArray(har?.log?.entries)?har.log.entries:null;if(!entries)return fail('VALID_HAR_ENTRIES_REQUIRED',{sourceName});
  const launchers=[];for(let i=0;i<entries.length;i++)if(exactLauncher(entries[i]?.request?.url))launchers.push(i);
  if(!launchers.length)return fail('EXACT_BETFAIR_SPAIN_GOLDEN_EGYPT_ARCADE_LAUNCHER_REQUIRED',{sourceName,exactGameId:EXACT_GAME_ID});
  const first=launchers[0],candidates=[];
  for(let i=first+1;i<entries.length;i++){
    const e=entries[i]||{},status=Number(e?.response?.status),body=bodyText(e),url=e?.request?.url||'';if(!body||!(status>=200&&status<400))continue;
    const c=concepts(body,url);if(!(c.title||c.providerIgt||c.providerMga||c.configCandidate||c.stateCandidate||c.exactIgtMechanicCandidate))continue;
    candidates.push({entryIndex:i,endpoint:endpoint(url),mimeType:String(e?.response?.content?.mimeType||'')||null,bodySha256:sha256(body),bodyBytes:Buffer.byteLength(body,'utf8'),concepts:c,reviewUse:c.providerMga&&!c.providerIgt?'MGA_OR_ALTERNATE_PROVIDER_REVIEW_CANDIDATE':c.providerIgt&&c.exactIgtMechanicCandidate?'IGT_MECHANIC_AND_CONFIG_REVIEW_CANDIDATE':c.exactIgtMechanicCandidate?'IGT_MECHANIC_IDENTITY_REVIEW_CANDIDATE':c.stateCandidate?'STATE_REVIEW_CANDIDATE':c.configCandidate?'CONFIG_REVIEW_CANDIDATE':'IDENTITY_REVIEW_CANDIDATE'});
  }
  const igt=candidates.filter(x=>x.concepts.providerIgt),mga=candidates.filter(x=>x.concepts.providerMga&&!x.concepts.providerIgt),mechanic=candidates.filter(x=>x.concepts.exactIgtMechanicCandidate),state=candidates.filter(x=>x.concepts.stateCandidate);
  return {
    version:VERSION,valid:true,reason:mga.length&&!igt.length?'ALTERNATE_PROVIDER_CANDIDATE_REQUIRES_REVIEW':igt.length&&mechanic.length?'IGT_GOLDEN_EGYPT_MECHANIC_REVIEW_CANDIDATE_FOUND':candidates.length?'GOLDEN_EGYPT_IDENTITY_CONFIG_REVIEW_CANDIDATES_FOUND':'EXACT_TARGET_LAUNCHER_FOUND_NO_REVIEW_BODY_RECOVERED',sourceName,
    target:{operator:'Betfair Spain',product:'Arcade',title:'Golden Egypt',gameId:EXACT_GAME_ID,exactCurrentSpanishInfoRoute:'https://arcade.betfair.es/juego/golden-egypt-aem'},
    targetLauncherObserved:true,launcherCount:launchers.length,firstLauncherEntryIndex:first,candidateCount:candidates.length,providerIgtCandidateCount:igt.length,providerMgaCandidateCount:mga.length,igtWildStaysMechanicCandidateCount:mechanic.length,persistentStateCandidateCount:state.length,candidates,
    exactSpainProviderVerified:false,exactSpainIgtWildStays2PlaysVerified:false,exactSpainTheoreticalRtpVerified:false,exactSpainBetMenuVerified:false,preWagerCoinStateVerified:false,persistenceScopeVerified:false,stateSpecificEvVerified:false,positiveEvEntryStateVerified:false,independentReviewRequired:true,usableForExecution:false,execution:execution(),
    reviewRequirements:{provider:'Bind exact served provider/build to golden-egypt-aem. -aem suffix and title alone are not provider evidence.',mechanic:'Require served Help/Rules matching the IGT two-coins-per-reel -> two Wild spins mechanic before importing any IGT state model.',state:'Recover current pre-wager coin/wild-reel state and selected bet level.',economics:'Recover exact Spanish theoretical RTP/bet menu and compute state-specific EV for the same served build.'},
    hardGuards:{onlineOnly:true,nonPromoOnly:true,offlineOnly:true,passiveHarOnly:true,exactArcadeLauncherRequired:true,sameTitleCannotProveIgt:true,aemSuffixCannotProveProvider:true,externalIgtRulesCannotSetSpainMechanic:true,rawResponseBodiesNeverEmitted:true,requestQueriesNeverEmitted:true,credentialsNeverEmitted:true,noWagerProbe:true,noAutomaticBetting:true,realMoneyAllowed:false}
  };
}

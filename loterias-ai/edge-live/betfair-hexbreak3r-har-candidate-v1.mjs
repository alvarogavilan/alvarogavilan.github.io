import {createHash} from 'node:crypto';

const VERSION='betfair-hexbreak3r-har-candidate-v1';
const MAX_BODY_BYTES=5_000_000;
const execution=()=>({decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0});
const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const sha256=v=>createHash('sha256').update(v).digest('hex');
function endpoint(v){try{const u=new URL(String(v||''));return `${u.origin}${u.pathname}`;}catch{return null;}}
function bodyText(e){const c=e?.response?.content||{},raw=typeof c.text==='string'?c.text:'';if(!raw)return '';try{const s=String(c.encoding||'').toLowerCase()==='base64'?Buffer.from(raw,'base64').toString('utf8'):raw;return Buffer.byteLength(s,'utf8')<=MAX_BODY_BYTES?s:'';}catch{return '';}}
function launcherCandidate(url){try{const u=new URL(String(url||''));const gameId=u.searchParams.get('gameId');return /(^|\.)launcher\.betfair\.es$/i.test(u.hostname)&&!!gameId&&u.searchParams.get('mode')==='real'&&u.searchParams.get('RPBucket')==='casino'&&u.searchParams.get('dataChannel')==='casino'?{gameId}:null;}catch{return null;}}
function concepts(body,url){
  const s=norm(`${url||''}\n${body||''}`);
  const title=s.includes('hexbreak3r')||s.includes('hexbreaker 3')||s.includes('hexbreaker3');
  const providerIgt=/(^|[^a-z0-9])igt([^a-z0-9]|$)/i.test(s)||s.includes('international game technology');
  const horseshoe=['horseshoe','herradura'].some(x=>s.includes(x));
  const luckZone=['luck zone','luckzone','zona de suerte'].some(x=>s.includes(x));
  const reelExpansion=['expand','expanding reel','expanded reel','reel height','altura de rodillo','rodillo expand'].some(x=>s.includes(x));
  const ways=['ways to win','ways','formas de ganar','maneras de ganar'].some(x=>s.includes(x));
  const betLevel=['bet level','betlevel','denomination','denominacion','denominación','total bet','apuesta total','nivel de apuesta'].some(x=>s.includes(norm(x)));
  const progressive=['progressive','jackpot','progresivo'].some(x=>s.includes(x));
  const reel3Progressive=(s.includes('reel 3')||s.includes('reel3')||s.includes('rodillo 3'))&&progressive;
  const persistence=['persistent','persistente','saved','stored','retained','remain between','between sessions','per bet level','por nivel de apuesta'].some(x=>s.includes(norm(x)));
  const rtp=/\brtp\b/i.test(s)||s.includes('return to player')||s.includes('retorno al jugador');
  const configCandidate=title&&(providerIgt||reelExpansion||horseshoe)&&(rtp||betLevel||progressive||ways);
  const stateCandidate=title&&(reelExpansion||horseshoe)&&(betLevel||luckZone||progressive||persistence||ways);
  return {title,providerIgt,horseshoe,luckZone,reelExpansion,ways,betLevel,progressive,reel3Progressive,persistence,rtp,configCandidate,stateCandidate};
}
function fail(reason,extra={}){return {version:VERSION,valid:false,reason,usableForExecution:false,execution:execution(),...extra};}

export function extractBetfairHexbreak3rHarCandidate(har,{sourceName='betfair-hexbreak3r.har'}={}){
  const entries=Array.isArray(har?.log?.entries)?har.log.entries:null;if(!entries)return fail('VALID_HAR_ENTRIES_REQUIRED',{sourceName});
  const launchers=[];for(let i=0;i<entries.length;i++){const c=launcherCandidate(entries[i]?.request?.url);if(c)launchers.push({entryIndex:i,gameId:c.gameId});}
  if(!launchers.length)return fail('BETFAIR_SPAIN_REAL_CASINO_LAUNCHER_REQUIRED',{sourceName});
  const candidates=[];
  for(const launcher of launchers){
    for(let i=launcher.entryIndex+1;i<entries.length;i++){
      if(launchers.some(x=>x.entryIndex>launcher.entryIndex&&x.entryIndex<=i))break;
      const e=entries[i]||{},status=Number(e?.response?.status),body=bodyText(e),url=e?.request?.url||'';if(!body||!(status>=200&&status<400))continue;
      const c=concepts(body,url);if(!(c.title||c.providerIgt||c.configCandidate||c.stateCandidate))continue;
      candidates.push({launcherEntryIndex:launcher.entryIndex,observedGameId:launcher.gameId,entryIndex:i,endpoint:endpoint(url),mimeType:String(e?.response?.content?.mimeType||'')||null,bodySha256:sha256(body),bodyBytes:Buffer.byteLength(body,'utf8'),concepts:c,reviewUse:c.configCandidate&&c.stateCandidate?'CONFIG_AND_REEL_STATE_REVIEW_CANDIDATE':c.stateCandidate?'REEL_STATE_REVIEW_CANDIDATE':c.configCandidate?'CONFIG_REVIEW_CANDIDATE':'IDENTITY_REVIEW_CANDIDATE'});
    }
  }
  const titleBound=candidates.filter(x=>x.concepts.title);
  const observedIds=[...new Set(titleBound.map(x=>x.observedGameId).filter(Boolean))];
  const identityCandidateVerified=observedIds.length===1&&titleBound.some(x=>x.concepts.providerIgt||x.concepts.configCandidate);
  return {
    version:VERSION,valid:true,reason:candidates.length?'BETFAIR_HEXBREAK3R_REVIEW_CANDIDATES_FOUND':'REAL_LAUNCHER_FOUND_NO_HEXBREAK3R_REVIEW_BODY_RECOVERED',sourceName,
    target:{operator:'Betfair Spain',title:'Hexbreak3r',family:'IGT_EXPANDING_REEL_PERSISTENT_STATE_CANDIDATE'},
    launcherCount:launchers.length,observedTitleBoundGameIds:observedIds,identityCandidateVerified,candidateCount:candidates.length,
    providerIgtCandidateCount:candidates.filter(x=>x.concepts.providerIgt).length,configurationCandidateCount:candidates.filter(x=>x.concepts.configCandidate).length,reelStateCandidateCount:candidates.filter(x=>x.concepts.stateCandidate).length,candidates,
    exactSpainGameIdIndependentlyReviewed:false,exactSpainServedProviderBuildVerified:false,exactSpainTheoreticalRtpVerified:false,exactSpainBetMenuVerified:false,exactCurrentReelHeightsVerified:false,persistencePerBetLevelVerified:false,currentLuckZoneStateVerified:false,reel3ProgressiveStateVerified:false,stateSpecificEvVerified:false,positiveEvEntryStateVerified:false,independentReviewRequired:true,usableForExecution:false,execution:execution(),
    reviewRequirements:{identity:'Bind the single observed launcher gameId to current served Hexbreak3r title/provider evidence; do not guess a slug.',config:'Recover exact IGT/build/RTP/bet menu for the current Betfair Spain deployment.',state:'Recover exact visible reel-height vector [r1,r2,r3,r4,r5], selected bet level and Luck Zone/progressive state before wagering.',scope:'Verify whether reel-height state persists across reload/session and whether states are separate by bet level for this exact Spain deployment.',economics:'Compute exact conditional EV only from the reviewed Spain build and state-transition model.'},
    hardGuards:{onlineOnly:true,nonPromoOnly:true,offlineOnly:true,passiveHarOnly:true,realLauncherRequired:true,titleBoundGameIdMustBeObservedNotGuessed:true,rawResponseBodiesNeverEmitted:true,requestQueriesNeverEmitted:true,credentialsNeverEmitted:true,foreignOrPhysicalPersistenceCannotSetSpainGate:true,creatorThresholdCannotSetExecutionThreshold:true,noWagerProbe:true,noAutomaticBetting:true,realMoneyAllowed:false}
  };
}

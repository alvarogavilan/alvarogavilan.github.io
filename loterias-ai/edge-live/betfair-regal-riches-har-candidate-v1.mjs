import {createHash} from 'node:crypto';

const VERSION='betfair-regal-riches-har-candidate-v1';
const EXACT_GAME_ID='regal-riches-aig';
const MAX_BODY_BYTES=5_000_000;
const execution=()=>({decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0});
const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const sha256=v=>createHash('sha256').update(v).digest('hex');
function safeEndpoint(v){try{const u=new URL(String(v||''));return `${u.origin}${u.pathname}`;}catch{return null;}}
function bodyText(entry){const c=entry?.response?.content||{},raw=typeof c.text==='string'?c.text:'';if(!raw)return '';try{const out=String(c.encoding||'').toLowerCase()==='base64'?Buffer.from(raw,'base64').toString('utf8'):raw;return Buffer.byteLength(out,'utf8')<=MAX_BODY_BYTES?out:'';}catch{return '';}}
function launcher(url){try{const u=new URL(String(url||''));return /(^|\.)launcher\.betfair\.es$/i.test(u.hostname)&&u.searchParams.get('gameId')===EXACT_GAME_ID&&u.searchParams.get('mode')==='real'&&u.searchParams.get('RPBucket')==='casino'&&u.searchParams.get('dataChannel')==='casino';}catch{return false;}}
function concepts(body,url){
  const s=norm(`${url||''}\n${body||''}`);
  const title=s.includes('regal riches')||s.includes(EXACT_GAME_ID);
  const providerIgt=/(^|[^a-z0-9])igt([^a-z0-9]|$)/i.test(s)||s.includes('international game technology');
  const providerRtg=s.includes('realtime gaming')||s.includes('real time gaming')||s.includes('provider=rtg')||s.includes('provider":"rtg');
  const progressiveWild=s.includes('progressive wild')||s.includes('progressivewild');
  const guaranteedWild=s.includes('guaranteed wild')||s.includes('guaranteedwild');
  const meter=s.includes('meter')||s.includes('medidor')||s.includes('contador');
  const coloredMeters=['blue meter','purple meter','green meter','yellow meter','medidor azul','medidor morado','medidor verde','medidor amarillo'].filter(x=>s.includes(x));
  const gems=['blue gem','purple gem','green gem','yellow gem','gema azul','gema morada','gema verde','gema amarilla'].filter(x=>s.includes(x));
  const persistence=['persistent','persistence','persistente','persiste','stored','retained','remains','banked','guardado','acumulado'].some(x=>s.includes(x));
  const stateTerms=['state','meterstate','wildcount','wild count','progressivewildcount','progressive wild count','currentmeter','current meter'].filter(x=>s.includes(x));
  const betLevel=['bet level','betlevel','denomination','denominacion','denominación','nivel de apuesta'].some(x=>s.includes(norm(x)));
  const rtp=/\brtp\b/i.test(s)||s.includes('return to player')||s.includes('retorno al jugador');
  const configCandidate=title&&(providerIgt||progressiveWild||guaranteedWild)&&(rtp||betLevel||meter);
  const stateCandidate=title&&(progressiveWild||meter)&&(persistence||coloredMeters.length>0||gems.length>0||stateTerms.length>0);
  return {title,providerIgt,providerRtg,progressiveWild,guaranteedWild,meter,coloredMeters,gems,persistence,stateTerms,betLevel,rtp,configCandidate,stateCandidate};
}
function fail(reason,extra={}){return {version:VERSION,valid:false,reason,targetLauncherObserved:false,usableForExecution:false,execution:execution(),...extra};}

export function extractBetfairRegalRichesHarCandidate(har,{sourceName='betfair-regal-riches.har'}={}){
  const entries=Array.isArray(har?.log?.entries)?har.log.entries:null;if(!entries)return fail('VALID_HAR_ENTRIES_REQUIRED',{sourceName});
  const launcherIndexes=[];
  for(let i=0;i<entries.length;i++)if(launcher(entries[i]?.request?.url))launcherIndexes.push(i);
  if(!launcherIndexes.length)return fail('EXACT_BETFAIR_SPAIN_REGAL_RICHES_REAL_LAUNCHER_REQUIRED',{sourceName,exactGameId:EXACT_GAME_ID});
  const firstLauncherIndex=launcherIndexes[0],candidates=[];
  for(let i=firstLauncherIndex+1;i<entries.length;i++){
    const e=entries[i]||{},status=Number(e?.response?.status),body=bodyText(e),url=e?.request?.url||'';
    if(!body||!(status>=200&&status<400))continue;
    const c=concepts(body,url);if(!(c.title||c.providerIgt||c.providerRtg||c.configCandidate||c.stateCandidate))continue;
    candidates.push({entryIndex:i,endpoint:safeEndpoint(url),mimeType:String(e?.response?.content?.mimeType||'')||null,bodySha256:sha256(body),bodyBytes:Buffer.byteLength(body,'utf8'),concepts:c,reviewUse:c.providerRtg&&!c.providerIgt?'PROVIDER_CONFLICT_CANDIDATE':c.configCandidate&&c.stateCandidate?'CONFIG_AND_STATE_REVIEW_CANDIDATE':c.stateCandidate?'STATE_REVIEW_CANDIDATE':c.configCandidate?'CONFIG_REVIEW_CANDIDATE':'IDENTITY_REVIEW_CANDIDATE'});
  }
  const providerIgtCandidates=candidates.filter(x=>x.concepts.providerIgt),providerRtgCandidates=candidates.filter(x=>x.concepts.providerRtg&&!x.concepts.providerIgt),stateCandidates=candidates.filter(x=>x.concepts.stateCandidate),configCandidates=candidates.filter(x=>x.concepts.configCandidate);
  return {
    version:VERSION,valid:true,reason:providerRtgCandidates.length?'SERVED_PROVIDER_CONFLICT_REQUIRES_REVIEW':candidates.length?'BETFAIR_REGAL_RICHES_REVIEW_CANDIDATES_FOUND':'TARGET_LAUNCHER_FOUND_NO_REVIEW_BODY_RECOVERED',
    sourceName,target:{operator:'Betfair Spain',title:'Regal Riches',gameId:EXACT_GAME_ID,family:'IGT_PERSISTENT_STATE_PROGRESSIVE_WILDS_CANDIDATE'},
    targetLauncherObserved:true,launcherCount:launcherIndexes.length,firstLauncherEntryIndex:firstLauncherIndex,
    candidateCount:candidates.length,providerIgtCandidateCount:providerIgtCandidates.length,providerConflictCandidateCount:providerRtgCandidates.length,configurationCandidateCount:configCandidates.length,stateCandidateCount:stateCandidates.length,candidates,
    exactSpainServedIgtProviderFingerprintVerified:false,exactSpainTheoreticalRtpVerified:false,exactSpainStakeConfigurationVerified:false,persistentStateSemanticsVerified:false,preWagerMeterStateVerified:false,reloadPersistenceVerified:false,crossPlayerPersistenceVerified:false,stateSpecificEvVerified:false,
    independentReviewRequired:true,usableForExecution:false,execution:execution(),
    reviewRequirements:{provider:'Independent review must bind IGT/provider/build to the exact post-launch Betfair Spain Regal Riches session.',state:'Progressive Wild/meter state candidates must be tied to the exact served build and pre-wager observation.',crossPlayer:'Cross-player inheritance requires distinct-player evidence or exact operator/provider documentation; one account, HAR or reload cannot prove it.',economics:'Theoretical RTP, stake and state-specific EV must come from the exact Spain served configuration; monthly realized Betfair RTP cannot substitute.'},
    hardGuards:{onlineOnly:true,nonPromoOnly:true,offlineOnly:true,passiveHarOnly:true,exactRealLauncherRequired:true,rawResponseBodiesNeverEmitted:true,requestQueriesNeverEmitted:true,cookiesAndAuthorizationNeverEmitted:true,providerCandidateCannotSelfApprove:true,oneAccountCannotProveCrossPlayerPersistence:true,reloadCannotProveCrossPlayerPersistence:true,otherBetfairMarketRtpCannotTransfer:true,monthlyObservedRtpCannotSetTheoreticalRtp:true,noWagerProbe:true,noAutomaticBetting:true,realMoneyAllowed:false}
  };
}

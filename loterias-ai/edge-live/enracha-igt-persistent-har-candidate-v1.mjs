import {createHash} from 'node:crypto';

const VERSION='enracha-igt-persistent-har-candidate-v1';
const MAX_BODY_BYTES=5_000_000;
const TARGETS=Object.freeze({
  'ocean-magic':{title:'Ocean Magic',path:'/juegos/ocean-magic',rtpPct:92.18,minBetEUR:0.50,maxBetEUR:250.00,stateTerms:['bubble','bubbles','burbuja','burbujas','wild bubble','bubble boost'],family:'OCEAN_MAGIC_VARIABLE_STATE'},
  'regal-riches':{title:'Regal Riches',path:'/juegos/regal-riches',rtpPct:94.00,minBetEUR:0.10,maxBetEUR:10.00,stateTerms:['guaranteed wild','guaranteed wilds','progressive wild','banked wild','wild meter','gem','gems','blue meter','purple meter','green meter','yellow meter'],family:'REGAL_RICHES_PERSISTENT_STATE'}
});
const text=v=>typeof v==='string'&&v.trim()?v.trim():null;
function execution(){return {decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0};}
function fail(reason,extra={}){return {version:VERSION,valid:false,reason,targetPageObserved:false,exactEnRachaIgtWrapperFingerprintVerified:false,persistentStateSemanticsVerified:false,crossPlayerPersistenceVerified:false,abandonedStateVisibleBeforeWagerVerified:false,usableForExecution:false,execution:execution(),...extra};}
function endpointShape(value){try{const u=new URL(String(value||''));return `${u.origin}${u.pathname}`;}catch{return null;}}
function bodyText(entry){const c=entry?.response?.content||{},raw=typeof c.text==='string'?c.text:'';if(!raw)return '';try{const out=String(c.encoding||'').toLowerCase()==='base64'?Buffer.from(raw,'base64').toString('utf8'):raw;return Buffer.byteLength(out,'utf8')<=MAX_BODY_BYTES?out:'';}catch{return '';}}
function sha256(value){return createHash('sha256').update(value).digest('hex');}
function norm(value){return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();}
function hasAny(s,terms){return terms.some(t=>s.includes(norm(t)));}
function exactTargetRequest(url,target){try{const u=new URL(String(url||''));return /(^|\.)enracha\.es$/i.test(u.hostname)&&u.pathname.replace(/\/$/,'')===target.path;}catch{return false;}}
function rtpSignals(s,target){
  const r=String(target.rtpPct.toFixed(2));
  return s.includes(r)||s.includes(r.replace('.',','))||s.includes(String(target.rtpPct));
}
function numericBetSignals(s,target){
  const minForms=[target.minBetEUR.toFixed(2),String(target.minBetEUR),target.minBetEUR.toFixed(2).replace('.',',')];
  const maxForms=[target.maxBetEUR.toFixed(2),String(target.maxBetEUR),target.maxBetEUR.toFixed(2).replace('.',',')];
  return {minimumBet:hasAny(s,minForms),maximumBet:hasAny(s,maxForms)};
}
function concepts(body,url,target){
  const s=norm(`${url||''}\n${body||''}`),bets=numericBetSignals(s,target);
  const title=s.includes(norm(target.title));
  const providerIgt=/(^|[^a-z0-9])igt([^a-z0-9]|$)/i.test(s)||s.includes('international game technology');
  const rtp=rtpSignals(s,target);
  const stateMechanic=hasAny(s,target.stateTerms);
  const persistence=hasAny(s,['persistent','persistence','persistente','persiste','stored','banked','guardado','acumulado','retained','retains','remains','remain']);
  const betLevel=hasAny(s,['bet level','betlevel','nivel de apuesta','apuesta nivel','denomination','denominacion','denominación']);
  const reset=hasAny(s,['reset','resets','reinicia','reinicio','restablece','start value','starting value']);
  const meter=hasAny(s,['meter','meters','medidor','contador','bank','banked','banco']);
  const preWager=hasAny(s,['before spin','before wager','antes de girar','antes de apostar','visible before','visible antes']);
  const accountScope=hasAny(s,['account','player id','playerid','session','cuenta','jugador','usuario']);
  const configCandidate=title&&providerIgt&&(rtp||bets.minimumBet||bets.maximumBet);
  const stateCandidate=title&&stateMechanic&&(persistence||betLevel||meter||reset);
  return {title,providerIgt,rtp,bets,stateMechanic,persistence,betLevel,reset,meter,preWager,accountScope,configCandidate,stateCandidate};
}

export function extractEnRachaIgtPersistentHarCandidate(har,{gameId,sourceName='enracha-igt.har'}={}){
  const target=TARGETS[gameId];if(!target)return fail('SUPPORTED_TARGET_GAME_REQUIRED',{sourceName,supportedGameIds:Object.keys(TARGETS)});
  const entries=Array.isArray(har?.log?.entries)?har.log.entries:null;if(!entries)return fail('VALID_HAR_ENTRIES_REQUIRED',{sourceName,gameId});
  let firstTargetIndex=null;const targetMarkers=[];
  for(let i=0;i<entries.length;i++){
    const e=entries[i]||{},url=e?.request?.url||'',body=bodyText(e),c=concepts(body,url,target),exactPage=exactTargetRequest(url,target);
    if(exactPage||c.title){if(firstTargetIndex===null)firstTargetIndex=i;targetMarkers.push({entryIndex:i,endpoint:endpointShape(url),marker:exactPage?'EXACT_ENRACHA_TARGET_PAGE':'SERVED_EXACT_TITLE_MARKER'});}
  }
  if(firstTargetIndex===null)return fail('EXACT_ENRACHA_TARGET_SESSION_MARKER_REQUIRED',{sourceName,gameId,entryCount:entries.length});
  const candidates=[];
  for(let i=firstTargetIndex;i<entries.length;i++){
    const e=entries[i]||{},status=Number(e?.response?.status),body=bodyText(e),url=e?.request?.url||'';
    if(!body||!(status>=200&&status<400))continue;
    const c=concepts(body,url,target);if(!(c.configCandidate||c.stateCandidate||c.title&&c.providerIgt))continue;
    candidates.push({entryIndex:i,endpoint:endpointShape(url),responseMimeType:text(e?.response?.content?.mimeType),bodySha256:sha256(body),bodyBytes:Buffer.byteLength(body,'utf8'),concepts:c,reviewUse:c.configCandidate&&c.stateCandidate?'CONFIG_AND_STATE_REVIEW_CANDIDATE':c.configCandidate?'CONFIG_REVIEW_CANDIDATE':c.stateCandidate?'STATE_REVIEW_CANDIDATE':'PROVIDER_TITLE_LINEAGE_CANDIDATE'});
  }
  const providerCandidates=candidates.filter(x=>x.concepts.providerIgt&&x.concepts.title);
  const configCandidates=candidates.filter(x=>x.concepts.configCandidate);
  const stateCandidates=candidates.filter(x=>x.concepts.stateCandidate);
  return {
    version:VERSION,mode:'OFFLINE_PASSIVE_ENRACHA_IGT_CONFIGURATION_AND_STATE_REVIEW_CANDIDATE_NO_PLAY',valid:true,
    reason:candidates.length?'SERVED_ENRACHA_IGT_REVIEW_CANDIDATES_FOUND':'TARGET_SESSION_FOUND_BUT_NO_IGT_CONFIG_OR_STATE_CANDIDATE_RECOVERED',
    sourceName,target:{gameId,title:target.title,path:target.path,expectedPublicRtpPct:target.rtpPct,expectedPublicMinimumBetEUR:target.minBetEUR,expectedPublicMaximumBetEUR:target.maxBetEUR,mechanismFamily:target.family},
    targetPageObserved:true,firstTargetEntryIndex:firstTargetIndex,targetMarkers,
    candidateCount:candidates.length,providerTitleCandidateCount:providerCandidates.length,configurationCandidateCount:configCandidates.length,stateCandidateCount:stateCandidates.length,candidates,
    exactEnRachaIgtWrapperFingerprintVerified:false,persistentStateSemanticsVerified:false,persistentAcrossSessionReloadVerified:false,crossPlayerPersistenceVerified:false,abandonedStateVisibleBeforeWagerVerified:false,
    independentReviewRequired:true,
    reviewRequirements:{
      configuration:'Independent review must bind the exact EnRacha served title to IGT and the current EnRacha RTP/bet configuration. Same-title IGT evidence from another operator cannot close this gate.',
      state:'Independent review must inspect the exact served state/help/config evidence and determine whether the known persistent-state mechanic exists in this EnRacha build and at what bet-level/account scope.',
      crossPlayer:'Cross-player inheritance requires separate prospective passive observations from distinct players/accounts or equivalent exact provider/operator documentation. One account or one reload can never close this gate.'
    },
    usableForExecution:false,execution:execution(),
    hardGuards:{onlineOnly:true,nonPromoOnly:true,offlineOnly:true,passiveHarOnly:true,noNetwork:true,noWagerProbe:true,rawResponseBodiesNeverEmitted:true,requestQueriesNeverEmitted:true,authorizationAndCookieValuesNeverEmitted:true,sameTitleCannotSelfProveIgtWrapper:true,otherOperatorConfigCannotTransfer:true,oneAccountCannotProveCrossPlayerPersistence:true,reloadPersistenceCannotProveCrossPlayerPersistence:true,publicRtpCannotBecomeStateSpecificRtp:true,candidatesRequireIndependentReview:true,noAutomaticBetting:true,realMoneyAllowed:false}
  };
}

export function supportedEnRachaIgtTargets(){return Object.fromEntries(Object.entries(TARGETS).map(([id,t])=>[id,{title:t.title,path:t.path,rtpPct:t.rtpPct,minBetEUR:t.minBetEUR,maxBetEUR:t.maxBetEUR}]));}

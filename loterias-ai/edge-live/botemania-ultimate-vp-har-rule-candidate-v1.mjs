import {createHash} from 'node:crypto';

const VERSION='botemania-ultimate-vp-har-rule-candidate-v1';
const TARGET_PATH='/juegos/casino-online/ultimate-video-poker';
const MAX_BODY_BYTES=5_000_000;
const text=v=>typeof v==='string'&&v.trim()?v.trim():null;
function execution(){return {decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0};}
function fail(reason,extra={}){return {version:VERSION,valid:false,reason,targetPageObserved:false,servedRuleCandidatesAvailable:false,exactJackpotTriggerVerified:false,exactJackpotQualifyingStakeVerified:false,usableForExecution:false,execution:execution(),...extra};}
function endpointShape(value){try{const u=new URL(String(value||''));return `${u.origin}${u.pathname}`;}catch{return null;}}
function bodyText(entry){
  const c=entry?.response?.content||{};
  const raw=typeof c.text==='string'?c.text:'';
  if(!raw)return '';
  try{
    const out=String(c.encoding||'').toLowerCase()==='base64'?Buffer.from(raw,'base64').toString('utf8'):raw;
    return Buffer.byteLength(out,'utf8')<=MAX_BODY_BYTES?out:'';
  }catch{return '';}
}
function sha256(value){return createHash('sha256').update(value).digest('hex');}
function norm(value){return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();}
function hasAny(s,terms){return terms.some(t=>s.includes(t));}
function concepts(body,url){
  const s=norm(`${url||''}\n${body||''}`);
  const jackpot=hasAny(s,['jackpot','bote','progressive','progresivo']);
  const royalFlush=hasAny(s,['royal flush','escalera real','royalflush']);
  const spades=hasAny(s,['spades','picas','spade','pica']);
  const exactFiveCoins=hasAny(s,['5 coins','five coins','5 credit','five credit','5 fichas','cinco fichas','5 monedas','cinco monedas']);
  const maxBet=hasAny(s,['max bet','maximum bet','max wager','apuesta maxima','apuesta máxima','apuesta max.','bet max']);
  const qualifies=hasAny(s,['qualif','eligible','eligibility','habilita','requisito','required to win','para optar','optar al']);
  const coinValue=hasAny(s,['coin value','valor de moneda','valor moneda','denomination','denominacion','denominación']);
  const handCount=hasAny(s,['hand count','number of hands','hands played','numero de manos','número de manos','1 hand','5 hands','10 hands','25 hands']);
  const ordinaryRoyal800=royalFlush&&hasAny(s,['800','x800','800x','800:1','800 to 1']);
  const exactTargetTitle=hasAny(s,['ultimate video poker','jotas o mejor progresivo']);
  const providerLineage=hasAny(s,['roxor','gamesys','west pier','westpier']);
  const triggerCandidate=jackpot&&royalFlush&&(spades||hasAny(s,['suit','palo','specific royal','royal especific']));
  const qualifyingStakeCandidate=jackpot&&(exactFiveCoins||maxBet||qualifies||coinValue||handCount);
  return {jackpot,royalFlush,spades,exactFiveCoins,maxBet,qualifies,coinValue,handCount,ordinaryRoyal800,exactTargetTitle,providerLineage,triggerCandidate,qualifyingStakeCandidate};
}
function exactTargetRequest(url){try{const u=new URL(String(url||''));return /(^|\.)botemania\.es$/i.test(u.hostname)&&u.pathname.replace(/\/$/,'')===TARGET_PATH;}catch{return false;}}

export function extractBotemaniaUltimateVpHarRuleCandidates(har,{sourceName='ultimate-video-poker.har'}={}){
  const entries=Array.isArray(har?.log?.entries)?har.log.entries:null;
  if(!entries)return fail('VALID_HAR_ENTRIES_REQUIRED',{sourceName});
  let firstTargetIndex=null;
  const targetMarkers=[];
  for(let i=0;i<entries.length;i++){
    const e=entries[i]||{},url=e?.request?.url||'',body=bodyText(e),c=concepts(body,url);
    const exactPage=exactTargetRequest(url);
    const exactTitleInServedBody=c.exactTargetTitle&&c.providerLineage;
    if(exactPage||exactTitleInServedBody){if(firstTargetIndex===null)firstTargetIndex=i;targetMarkers.push({entryIndex:i,endpoint:endpointShape(url),marker:exactPage?'EXACT_BOTEMANIA_TARGET_PAGE':'SERVED_TARGET_TITLE_PROVIDER_MARKER'});}
  }
  if(firstTargetIndex===null)return fail('EXACT_ULTIMATE_VIDEO_POKER_SESSION_MARKER_REQUIRED',{sourceName,entryCount:entries.length});

  const candidates=[];
  for(let i=firstTargetIndex;i<entries.length;i++){
    const e=entries[i]||{},status=Number(e?.response?.status),body=bodyText(e),url=e?.request?.url||'';
    if(!body||!(status>=200&&status<400))continue;
    const c=concepts(body,url);
    if(!(c.triggerCandidate||c.qualifyingStakeCandidate||c.exactTargetTitle&&c.jackpot))continue;
    candidates.push({
      entryIndex:i,endpoint:endpointShape(url),responseMimeType:text(e?.response?.content?.mimeType),bodySha256:sha256(body),bodyBytes:Buffer.byteLength(body,'utf8'),concepts:c,
      reviewUse:c.triggerCandidate&&c.qualifyingStakeCandidate?'TRIGGER_AND_QUALIFYING_STAKE_REVIEW_CANDIDATE':c.triggerCandidate?'TRIGGER_REVIEW_CANDIDATE':c.qualifyingStakeCandidate?'QUALIFYING_STAKE_REVIEW_CANDIDATE':'TARGET_PROGRESSIVE_CONTEXT_ONLY'
    });
  }
  const triggerCandidates=candidates.filter(x=>x.concepts.triggerCandidate);
  const stakeCandidates=candidates.filter(x=>x.concepts.qualifyingStakeCandidate);
  return {
    version:VERSION,mode:'OFFLINE_PASSIVE_CURRENT_BOTEMANIA_ULTIMATE_VP_HAR_RULE_CANDIDATE_NO_PLAY',valid:true,
    reason:candidates.length?'SERVED_ULTIMATE_VP_RULE_REVIEW_CANDIDATES_FOUND_IN_PASSIVE_HAR':'TARGET_SESSION_FOUND_BUT_NO_DECISIVE_RULE_CANDIDATE_RECOVERED',
    sourceName,target:{operator:'Botemania Spain',title:'Ultimate Video Poker',variant:'Jotas o Mejor Progresivo',pagePath:TARGET_PATH},
    targetPageObserved:true,firstTargetEntryIndex:firstTargetIndex,targetMarkers,
    candidateCount:candidates.length,triggerCandidateCount:triggerCandidates.length,qualifyingStakeCandidateCount:stakeCandidates.length,candidates,
    servedRuleCandidatesAvailable:candidates.length>0,
    exactJackpotTriggerVerified:false,exactJackpotQualifyingStakeVerified:false,independentReviewRequired:true,
    reviewRequirements:{
      trigger:'Independent review must inspect the exact committed HAR/redacted body artifact and prove the current Botemania Jotas o Mejor Progresivo jackpot-trigger hand. Royal Flush of Spades may not be imported from historical Gamesys material.',
      qualifyingStake:'Independent review must prove the exact current coin value/coin count/hand count or total wager that qualifies for the progressive jackpot. A visible EUR 2.50 minimum hand wager is not sufficient.'
    },
    usableForExecution:false,execution:execution(),
    hardGuards:{onlineOnly:true,nonPromoOnly:true,offlineOnly:true,passiveHarOnly:true,noNetwork:true,noWagerProbe:true,rawResponseBodiesNeverEmitted:true,requestQueriesNeverEmitted:true,authorizationAndCookieValuesNeverEmitted:true,currentBotemaniaTargetMarkerRequired:true,historicalGamesysTriggerCannotSelfPromote:true,visibleMinimumStakeCannotSelfQualify:true,candidatesRequireIndependentReview:true,noAutomaticBetting:true,realMoneyAllowed:false}
  };
}

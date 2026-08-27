import {createHash} from 'node:crypto';
import {verifyBet365SportingServedSljp1Binding} from './bet365-sporting-served-sljp1-binding-v1.mjs';

const VERSION='bet365-frank-served-rules-candidate-v1';
const GAME_CODE='gpas_slfbruno_pop';
const clean=v=>String(v??'').replace(/\u0000/g,' ').trim();
const fold=v=>clean(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ');
function decode(content){const raw=String(content?.text||'');if(!raw)return '';if(String(content?.encoding||'').toLowerCase()!=='base64')return raw;try{if(typeof Buffer!=='undefined')return Buffer.from(raw,'base64').toString('utf8');}catch{}return '';}
function endpoint(url){try{const u=new URL(clean(url));return {host:u.hostname.toLowerCase(),path:u.pathname||'/'};}catch{return null;}}
function bet365Owned(url){const e=endpoint(url);return !!e&&(e.host==='bet365.es'||e.host.endsWith('.bet365.es'));}
function sha256(s){return createHash('sha256').update(String(s),'utf8').digest('hex');}
const hasAny=(s,phrases)=>phrases.some(x=>s.includes(x));
function concepts(raw){
  const s=fold(raw);
  const firstBet=hasAny(s,['first bet','first wager','first eligible bet','primera apuesta','primer apuesta','primera jugada','primer giro']);
  const followingDay=hasAny(s,['following day','next day','day after','dia siguiente','al dia siguiente','dia posterior']);
  const guaranteedTime=hasAny(s,['guaranteedhittime','guaranteed hit time','guaranteed to be won within','garantizado que se gane dentro','garantizado en el tiempo']);
  const anySize=hasAny(s,['any bet of any size','any wager of any size','cualquier apuesta de cualquier importe','cualquier apuesta de cualquier tamano','cualquier apuesta, independientemente del importe','cualquier apuesta puede ganar']);
  const largerBet=hasAny(s,['larger bet','higher bet','bigger bet','apuesta mayor','apuesta mas alta','mayor sea la apuesta']);
  const daily=hasAny(s,['sljp-1','daily jackpot','jackpot diario','daily sporting legends','sporting legends daily']);
  const sporting=hasAny(s,['sporting legends','gpas_slfbruno_pop','frank bruno']);
  const jackpot=s.includes('jackpot');
  return {firstBet,followingDay,guaranteedTime,anySize,largerBet,daily,sporting,jackpot};
}
function fail(reason,extra={}){return {version:VERSION,valid:false,reason,bet365OwnedExactSessionRuleCandidateObserved:false,followingDayFirstBetRuleCandidateObserved:false,anySizeJackpotEligibilityCandidateObserved:false,operatorRuleAdoptionVerified:false,servedTenCentJackpotEligibilityVerified:false,usableForExecution:false,execution:{decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0},...extra};}

export function discoverBet365FrankServedRulesCandidate(har,{sourceName='frank-current.har'}={}){
  let obj;try{obj=typeof har==='string'?JSON.parse(har):har;}catch{return fail('HAR_PARSE_FAILED',{sourceName});}
  const binding=verifyBet365SportingServedSljp1Binding(obj,{gameCode:GAME_CODE,sourceName});
  if(binding?.valid!==true)return fail('EXACT_FRANK_SERVED_SLJP1_BINDING_REQUIRED',{sourceName,bindingReason:binding?.reason||null});
  const entries=Array.isArray(obj?.log?.entries)?obj.log.entries:[];
  const candidates=[];
  for(let i=0;i<entries.length;i++){
    const e=entries[i];if(!bet365Owned(e?.request?.url))continue;
    const body=decode(e?.response?.content);if(!body)continue;
    const c=concepts(body);
    const following=c.sporting&&c.jackpot&&c.firstBet&&c.followingDay&&(c.daily||c.guaranteedTime);
    const eligibility=c.sporting&&c.jackpot&&c.anySize&&(c.daily||c.largerBet);
    if(!following&&!eligibility)continue;
    const ep=endpoint(e.request.url);
    candidates.push({entryIndex:i,responseHost:ep?.host||null,responsePath:ep?.path||null,responseMimeType:String(e?.response?.content?.mimeType||'').slice(0,80)||null,bodySha256:sha256(fold(body)),concepts:c,followingDayFirstBetRuleCandidate:following,anySizeJackpotEligibilityCandidate:eligibility});
  }
  const following=candidates.filter(x=>x.followingDayFirstBetRuleCandidate),eligibility=candidates.filter(x=>x.anySizeJackpotEligibilityCandidate);
  return {
    version:VERSION,mode:'OFFLINE_PASSIVE_BET365_OWNED_EXACT_FRANK_SERVED_RULE_TEXT_DISCOVERY_NO_PLAY',valid:true,sourceName,target:binding.target,
    exactBet365SpainFrontendToConfiguredSljp1TransportBindingVerified:true,
    candidateCount:candidates.length,candidates,
    followingDayFirstBetRuleCandidateCount:following.length,anySizeJackpotEligibilityCandidateCount:eligibility.length,
    bet365OwnedExactSessionRuleCandidateObserved:candidates.length>0,
    followingDayFirstBetRuleCandidateObserved:following.length>0,
    anySizeJackpotEligibilityCandidateObserved:eligibility.length>0,
    operatorRuleAdoptionVerified:false,servedTenCentJackpotEligibilityVerified:false,independentSemanticReviewRequired:true,usableForExecution:false,
    scientificUse:'Scans only response bodies served from bet365.es or its subdomains inside an exact Frank Bruno session already bound to the bet365-owned configured EUR global Daily sljp-1 transport. It emits no body text, cookies, headers, query strings or credentials; only endpoint host/path, a normalized-body SHA-256 and conservative concept flags. A candidate requires exact Sporting Legends/Frank context plus jackpot semantics. Following-day evidence additionally requires first-bet + following-day language and Daily/GHT context; eligibility evidence requires explicit any-bet-any-size language and Daily/larger-bet context. Automated matching is discovery only: an independent human semantic review of the exact committed evidence is mandatory before either operator rule or €0.10 jackpot eligibility can be marked verified.',
    execution:{decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0},
    hardGuards:{onlineOnly:true,nonPromoOnly:true,offlineOnly:true,passiveHarOnly:true,exactFrankServedBindingRequired:true,bet365OwnedResponseHostRequired:true,responseBodiesOnly:true,exactSportingContextRequired:true,noRawRuleTextEmitted:true,noHeadersCookiesOrQueriesEmitted:true,bodyDigestForIndependentReview:true,keywordCandidateCannotSelfVerifySemantics:true,providerOrCrossOperatorTextCannotEnterThisGate:true,noWagerProbe:true,noAutomaticBetting:true,realMoneyAllowed:false},
  };
}

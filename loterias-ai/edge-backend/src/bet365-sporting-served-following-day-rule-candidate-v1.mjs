import {verifyBet365SportingServedSljp1Binding} from './bet365-sporting-served-sljp1-binding-v1.mjs';

const clean=v=>String(v??'').replace(/\u0000/g,' ').replace(/\s+/g,' ').trim();
const lower=v=>clean(v).toLowerCase();
function decode(content){const raw=String(content?.text||'');if(!raw)return '';if(String(content?.encoding||'').toLowerCase()!=='base64')return raw;try{if(typeof Buffer!=='undefined')return Buffer.from(raw,'base64').toString('utf8');}catch{}return '';}
function host(url){try{return new URL(clean(url)).hostname.toLowerCase();}catch{return null;}}
function endpoint(url){try{const u=new URL(clean(url));return ['https:','wss:'].includes(u.protocol)?`${u.origin}${u.pathname}`:null;}catch{return null;}}
function bet365Owned(url){const h=host(url);return !!h&&(h==='bet365.es'||h.endsWith('.bet365.es'));}
function textBody(entry){const parts=[];const body=decode(entry?.response?.content);if(body)parts.push(body);for(const m of entry?._webSocketMessages||[])if(m?.type==='receive'&&m?.data)parts.push(String(m.data));return lower(parts.join('\n').replace(/<[^>]+>/g,' '));}
function phraseEvidence(s){
  const daily=/\bdaily\s+jackpot\b|\bjackpot\s+diario\b|\bbote\s+diario\b/.test(s);
  const firstBet=/\bfirst\s+(?:eligible\s+)?bet\b|\bfirst\s+(?:eligible\s+)?wager\b|\bprimera\s+apuesta\b/.test(s);
  const followingDay=/\bfollowing\s+day\b|\bnext\s+day\b|\bd[ií]a\s+siguiente\b/.test(s);
  const noGameplay=/\bno\s+gameplay\b|\bno\s+(?:game|play)\s+takes?\s+place\b|\bsi\s+no\s+(?:hay|se\s+produce)\s+(?:juego|actividad|apuestas?)\b/.test(s);
  const trigger=/\btriggered\b|\bawarded\b|\bse\s+activar[aá]\b|\bse\s+adjudicar[aá]\b|\bganar[aá]\b/.test(s);
  return {dailyJackpotContext:daily,firstBetPhrase:firstBet,followingDayPhrase:followingDay,noGameplayCondition:noGameplay,triggerOrAwardPhrase:trigger,exactRuleSentenceCandidate:daily&&firstBet&&followingDay&&(noGameplay||trigger)};
}
function execution(){return {decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0};}
function fail(reason,extra={}){return {version:'bet365-sporting-served-following-day-rule-candidate-v1',valid:false,reason,operatorOwnedRuleTextCandidateObserved:false,bet365FollowingDayRuleAdoptionVerified:false,usableForExecution:false,execution:execution(),...extra};}

export function detectBet365SportingServedFollowingDayRuleCandidate(har,{gameCode='gpas_slfbruno_pop',sourceName='capture.har',maxRouteToProviderMarkerSeconds=120}={}){
  const binding=verifyBet365SportingServedSljp1Binding(har,{gameCode,sourceName,maxRouteToProviderMarkerSeconds});
  if(binding?.valid!==true)return fail('EXACT_SERVED_SLJP1_BINDING_REQUIRED',{gameCode,sourceName,bindingReason:binding?.reason||null});
  let obj;try{obj=typeof har==='string'?JSON.parse(har):har;}catch{return fail('HAR_PARSE_FAILED_AFTER_BINDING',{gameCode,sourceName});}
  const entries=Array.isArray(obj?.log?.entries)?obj.log.entries:[];
  const routeIndex=binding?.provenance?.routeEvidence?.entryIndex;
  if(!Number.isInteger(routeIndex)||routeIndex<0||routeIndex>=entries.length)return fail('BOUND_ROUTE_INDEX_MISSING',{gameCode,sourceName});
  const candidates=[];
  for(let i=routeIndex;i<entries.length;i++){
    const e=entries[i];if(!bet365Owned(e?.request?.url))continue;
    const body=textBody(e);if(!body)continue;
    const evidence=phraseEvidence(body);if(!evidence.exactRuleSentenceCandidate)continue;
    candidates.push({entryIndex:i,endpoint:endpoint(e?.request?.url),responseStatus:e?.response?.status??null,evidence});
  }
  const dedup=[],seen=new Set();for(const c of candidates){const id=[c.entryIndex,c.endpoint,JSON.stringify(c.evidence)].join('|');if(!seen.has(id)){seen.add(id);dedup.push(c);}}
  if(dedup.length!==1)return fail(dedup.length?'AMBIGUOUS_OPERATOR_RULE_TEXT_CANDIDATES':'OPERATOR_RULE_TEXT_CANDIDATE_NOT_FOUND',{gameCode,sourceName,candidateCount:dedup.length,candidates:dedup});
  return {
    version:'bet365-sporting-served-following-day-rule-candidate-v1',mode:'OFFLINE_PASSIVE_EXACT_BET365_OWNED_RULE_TEXT_DISCOVERY_NO_PLAY',valid:true,
    reason:'EXACT_BET365_OWNED_RESPONSE_IN_BOUND_SERVED_SLJP1_SESSION_CONTAINS_FOLLOWING_DAY_FIRST_BET_RULE_CANDIDATE_INDEPENDENT_REVIEW_REQUIRED',
    sourceName,target:binding.target,ruleCandidate:dedup[0],exactBet365SpainFrontendToConfiguredSljp1TransportBindingVerified:true,
    operatorOwnedRuleTextCandidateObserved:true,bet365FollowingDayRuleAdoptionVerified:false,independentRuleReviewRequired:true,usableForExecution:false,
    scientificUse:'Searches only bet365.es-owned response/received-WebSocket text after the exact current target play-route anchor in a capture that already passes the exact frontend-to-configured-sl.jp-1 served binding. A candidate requires co-occurrence of Daily Jackpot context, first-bet wording and following-day wording plus a no-gameplay or trigger/award condition. Raw response text, headers, cookies and query strings are never emitted. Even a unique candidate remains review-only: an independent review must confirm the text is game/operator rules rather than generic editorial content before bet365 rule adoption can be promoted.',
    execution:execution(),hardGuards:{onlineOnly:true,nonPromoOnly:true,offlineOnly:true,passiveHarOnly:true,servedSljp1BindingRequired:true,bet365OwnedResponseHostRequired:true,dailyContextRequired:true,firstBetPhraseRequired:true,followingDayPhraseRequired:true,noRawRuleBodyEmitted:true,independentReviewRequired:true,candidateCannotSelfVerifyOperatorRule:true,noWagerProbe:true,noAutomaticBetting:true,realMoneyAllowed:false}
  };
}

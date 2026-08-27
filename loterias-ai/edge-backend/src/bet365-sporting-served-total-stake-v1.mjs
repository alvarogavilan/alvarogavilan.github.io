import {verifyBet365SportingServedSljp1Binding} from './bet365-sporting-served-sljp1-binding-v1.mjs';

const EXPLICIT_TOTAL_STAKE_LIST_KEYS=new Set(['totalbetvalues','totalstakevalues','availabletotalbets','availabletotalstakes','allowedtotalbets','allowedtotalstakes']);
const CURRENCY_KEYS=new Set(['currency','currencycode','betcurrency','stakecurrency']);
const finite=v=>{if(v===null||v===undefined||v===''||typeof v==='boolean')return null;const n=Number(v);return Number.isFinite(n)?n:null;};
const norm=v=>String(v??'').trim().toLowerCase().replace(/[^a-z0-9]/g,'');
function decode(content){const raw=String(content?.text||'');if(!raw)return '';if(String(content?.encoding||'').toLowerCase()!=='base64')return raw;try{if(typeof Buffer!=='undefined')return Buffer.from(raw,'base64').toString('utf8');}catch{}return '';}
function json(raw){try{return JSON.parse(String(raw||''));}catch{return null;}}
function currencyOf(obj){const vals=[];for(const [k,v] of Object.entries(obj||{})){if(CURRENCY_KEYS.has(norm(k))&&['string','number'].includes(typeof v))vals.push(String(v).trim().toUpperCase());}const uniq=[...new Set(vals.filter(Boolean))];return uniq.length===1?uniq[0]:null;}
function numericList(v){if(!Array.isArray(v))return null;const out=[];for(const x of v){if(typeof x==='object'&&x!==null)return null;const n=finite(x);if(n===null||n<0||n>1_000_000)return null;out.push(n);}return out.length?[...new Set(out)]:null;}
function candidates(value,path='$',out=[],depth=0){
  if(depth>10||out.length>=200)return out;
  if(Array.isArray(value)){value.slice(0,200).forEach((x,i)=>candidates(x,`${path}[${i}]`,out,depth+1));return out;}
  if(!value||typeof value!=='object')return out;
  const currency=currencyOf(value);
  for(const [k,v] of Object.entries(value)){
    const nk=norm(k);
    if(EXPLICIT_TOTAL_STAKE_LIST_KEYS.has(nk)){
      const values=numericList(v);
      if(values&&currency==='EUR')out.push({objectPath:path,semanticKey:nk,currency:'EUR',values});
    }
  }
  for(const [k,v] of Object.entries(value))if(v&&typeof v==='object')candidates(v,`${path}.${String(k).replace(/[^A-Za-z0-9_-]/g,'_')}`,out,depth+1);
  return out;
}
function payloads(entry){const out=[];const body=decode(entry?.response?.content);if(body)out.push({source:'http-response',raw:body});for(let i=0;i<(entry?._webSocketMessages||[]).length;i++){const m=entry._webSocketMessages[i];if(m?.type==='receive'&&m?.data)out.push({source:`websocket-receive:${i}`,raw:String(m.data)});}return out;}
function fail(reason,extra={}){return {version:'bet365-sporting-served-total-stake-v1',valid:false,reason,servedTenCentTotalStakeVerified:false,servedTenCentJackpotEligibilityVerified:false,usableForExecution:false,execution:{decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0},...extra};}

export function verifyBet365SportingServedTotalStake(har,{gameCode,sourceName='capture.har',requiredStakeEUR=0.10,maxRouteToProviderMarkerSeconds=120}={}){
  const required=finite(requiredStakeEUR);if(required===null||required<=0)return fail('INVALID_REQUIRED_STAKE',{requiredStakeEUR});
  const binding=verifyBet365SportingServedSljp1Binding(har,{gameCode,sourceName,maxRouteToProviderMarkerSeconds});
  if(binding?.valid!==true)return fail('SERVED_SLJP1_TRANSPORT_BINDING_REQUIRED',{gameCode:gameCode||null,sourceName,bindingReason:binding?.reason||null});
  let obj;try{obj=typeof har==='string'?JSON.parse(har):har;}catch{return fail('HAR_PARSE_FAILED_AFTER_BINDING',{gameCode,sourceName});}
  const entries=Array.isArray(obj?.log?.entries)?obj.log.entries:[];
  const start=binding?.provenance?.providerCodeEvidence?.entryIndex,end=binding?.configuredTransport?.tickerEntryIndex;
  if(!Number.isInteger(start)||!Number.isInteger(end)||start<0||end<start||end>=entries.length)return fail('INVALID_BOUND_SESSION_WINDOW',{gameCode,sourceName,startEntryIndex:start??null,endEntryIndex:end??null});
  const found=[];
  for(let i=start;i<=end;i++)for(const p of payloads(entries[i])){const parsed=json(p.raw);if(parsed===null)continue;for(const c of candidates(parsed))found.push({entryIndex:i,source:p.source,...c});}
  const dedup=[],seen=new Set();for(const c of found){const id=[c.entryIndex,c.source,c.objectPath,c.semanticKey,c.currency,JSON.stringify(c.values)].join('|');if(!seen.has(id)){seen.add(id);dedup.push(c);}}
  const matches=dedup.filter(c=>c.values.some(v=>Math.abs(v-required)<1e-12));
  if(matches.length!==1)return fail(matches.length?'AMBIGUOUS_EXPLICIT_TOTAL_STAKE_MENUS':'EXACT_EXPLICIT_TOTAL_STAKE_MENU_NOT_FOUND',{gameCode,sourceName,requiredStakeEUR:required,explicitTotalStakeMenuCandidateCount:dedup.length,matchingMenuCount:matches.length,candidates:dedup});
  const match=matches[0];
  return {version:'bet365-sporting-served-total-stake-v1',mode:'OFFLINE_PASSIVE_EXPLICIT_TOTAL_STAKE_MENU_ATTESTATION_NO_PLAY',valid:true,reason:'EXACT_EUR_EXPLICIT_TOTAL_STAKE_MENU_IN_BOUND_CURRENT_SLJP1_SESSION_CONTAINS_REQUIRED_STAKE',sourceName,target:binding.target,requiredStakeEUR:required,boundSessionWindow:{startEntryIndex:start,endEntryIndex:end},evidence:match,exactBet365SpainFrontendToConfiguredSljp1TransportBindingVerified:true,servedExplicitTotalStakeMenuSemanticsVerified:true,servedTenCentTotalStakeVerified:Math.abs(required-0.10)<1e-12,servedTenCentJackpotEligibilityVerified:false,operatorFollowingDayRuleAdoptionVerified:false,exactCurrentSljp1ServerStateVerified:false,usableForExecution:false,scientificUse:'Requires the already verified exact Frank frontend-to-bet365-configured sljp-1 transport chain, then accepts 0.10 EUR only when a response or received WebSocket JSON object inside that bounded session window exposes an explicitly named TOTAL-stake menu and EUR in the same object. Generic minBet, betValues, coinValue, denomination, lineBet and request parameters are deliberately rejected because their total-stake semantics are ambiguous. This verifies a served selectable total stake only; jackpot eligibility, current jackpot state and operator following-day behavior remain separate gates.',execution:{decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0},hardGuards:{onlineOnly:true,nonPromoOnly:true,offlineOnly:true,passiveHarOnly:true,currentServedSljp1BindingRequired:true,responseOrWsReceiveOnly:true,explicitTotalStakeSemanticKeyRequired:true,eurCoLocatedRequired:true,genericMinBetRejected:true,genericBetValuesRejected:true,coinAndLineBetRejected:true,requestStakeParametersIgnored:true,stakeMenuDoesNotProveJackpotEligibility:true,noWagerProbe:true,noAutomaticBetting:true,realMoneyAllowed:false}};
}

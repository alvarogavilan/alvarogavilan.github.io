import {discoverBet365SportingOperatorJackpotConfig} from './bet365-sporting-operator-jackpot-config-har-v1.mjs';
import {analyzeBet365SportingLowCostHar} from './bet365-sporting-low-cost-har-discovery-v1.mjs';

const clean=v=>String(v??'').trim();
const lower=v=>clean(v).toLowerCase();
function endpointTuple(v){try{const u=new URL(clean(v));return {host:u.hostname.toLowerCase(),port:u.port||((u.protocol==='https:'||u.protocol==='wss:')?'443':''),path:u.pathname.replace(/\/+$/,'')||'/',protocol:u.protocol};}catch{return null;}}
function sameConfiguredTransport(a,b){const x=endpointTuple(a),y=endpointTuple(b);if(!x||!y)return false;return x.host===y.host&&x.port===y.port&&x.path===y.path&&new Set(['https:','wss:']).has(x.protocol)&&new Set(['https:','wss:']).has(y.protocol);}
function includesCi(arr,value){const t=lower(value);return Array.isArray(arr)&&arr.some(v=>lower(v)===t);}
function hasEur(arr){return Array.isArray(arr)&&arr.some(v=>lower(v)==='eur');}
function hasLocalZero(arr){return Array.isArray(arr)&&arr.some(v=>String(v).trim()==='0');}
function hasDaily(arr){return Array.isArray(arr)&&arr.some(v=>lower(v)==='sljp-1');}
function fail(reason,extra={}){return {version:'bet365-sporting-configured-sljp1-transport-v1',valid:false,reason,bet365OwnedConfiguredSljp1TransportBindingVerified:false,modernResponseSemanticsVerified:false,exactCurrentSljp1ServerStateVerified:false,servedTenCentEligibilityVerified:false,usableForExecution:false,execution:{decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0},...extra};}

export function verifyBet365SportingConfiguredSljp1Transport(har,{gameCode,sourceName='capture.har'}={}){
  const config=discoverBet365SportingOperatorJackpotConfig(har,{gameCode,sourceName});
  if(config?.valid!==true)return fail('OPERATOR_CONFIG_DISCOVERY_FAILED',{configReason:config?.reason||null});
  if(config.uniqueCoherentConfigCandidateObserved!==true)return fail(config.coherentConfigTupleCount>1?'OPERATOR_CONFIG_AMBIGUOUS':'OPERATOR_CONFIG_NOT_FOUND',{configCandidateCount:config.operatorOwnedConfigCandidateCount,coherentConfigTupleCount:config.coherentConfigTupleCount});
  const discovery=analyzeBet365SportingLowCostHar(har,{gameCode,sourceName});
  if(discovery?.valid!==true)return fail('TARGET_TRANSPORT_DISCOVERY_FAILED',{discoveryReason:discovery?.reason||null});
  const cfg=config.uniqueCoherentConfigCandidate;
  const configuredEndpoints=[cfg.jackpotsCasinoEndpoint,cfg.liveEndpoint].filter(Boolean);
  const matches=(discovery.exactDailyCandidates||[]).filter(c=>{
    const endpointMatched=configuredEndpoints.some(ep=>sameConfiguredTransport(ep,c.endpoint));
    const casinoMatched=includesCi(c.requestCasinoCandidates,cfg.jackpotsCasino);
    return endpointMatched&&casinoMatched&&hasEur(c.currencyCandidates)&&hasLocalZero(c.localCandidates)&&hasDaily(c.gameCandidates);
  });
  if(matches.length!==1)return fail(matches.length?'AMBIGUOUS_CONFIGURED_SLJP1_TRANSPORT_MATCH':'CONFIGURED_SLJP1_TRANSPORT_MATCH_NOT_FOUND',{exactDailyCandidateCount:discovery.exactTargetDailyTickerCandidateCount,configuredEndpointCount:configuredEndpoints.length,matchedCount:matches.length});
  const m=matches[0];
  return {version:'bet365-sporting-configured-sljp1-transport-v1',valid:true,reason:'BET365_OWNED_EXACT_TARGET_CONFIG_MATCHES_EXACT_SLJP1_TRANSPORT_ROUTING_RESPONSE_SEMANTICS_PENDING',target:discovery.target,sourceName,configured:{jackpotsCasino:cfg.jackpotsCasino,jackpotsCasinoEndpoint:cfg.jackpotsCasinoEndpoint,liveEndpoint:cfg.liveEndpoint,usesServicesCasinoJackpots:cfg.usesServicesCasinoJackpots},matchedTransport:{tickerEntryIndex:m.tickerEntryIndex,endpoint:m.endpoint,requestCasinoCandidates:m.requestCasinoCandidates,currencyCandidates:m.currencyCandidates,localCandidates:m.localCandidates,gameCandidates:m.gameCandidates,instanceCodeCandidates:m.instanceCodeCandidates},bet365OwnedConfiguredSljp1TransportBindingVerified:true,exactTargetProviderGameRoutingVerified:true,bet365OperatorConfigResponseVerified:true,requestCasinoMatchesOperatorConfig:true,requestEndpointMatchesOperatorConfig:true,requestDailyEurLocalZeroVerified:true,modernResponseSemanticsVerified:false,exactCurrentSljp1ServerStateVerified:false,servedTenCentEligibilityVerified:false,operatorFollowingDayRuleAdoptionVerified:false,usableForExecution:false,scientificUse:'This gate binds the exact requested low-cost Sporting Legends target to a bet365.es-owned jackpot configuration object and to one exact outbound Daily sljp-1 EUR local=0 transport using the same configured casino and endpoint authority/path. HTTPS/WSS upgrades are accepted only on the identical host, port and path. This proves configuration/request routing only; it does not decode modern response semantics, current amount/GHT/winc state, 0.10 EUR jackpot eligibility, overdue state or execution permission.',execution:{decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0},hardGuards:{onlineOnly:true,nonPromoOnly:true,operatorOwnedConfigRequired:true,exactTargetMarkerRequired:true,exactConfiguredEndpointMatchRequired:true,exactConfiguredCasinoMatchRequired:true,dailyEurLocalZeroRequestRequired:true,httpsWssUpgradeOnlySameAuthorityAndPath:true,configuredTransportDoesNotEqualServerState:true,configuredTransportCannotVerifyTenCentEligibility:true,configuredTransportCannotAuthorizeGreen:true,noWagerProbe:true,noAutomaticBetting:true}};
}

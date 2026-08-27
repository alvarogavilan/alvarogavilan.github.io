import {verifyBet365SportingServedSljp1Binding} from './bet365-sporting-served-sljp1-binding-v1.mjs';
import {recoverBet365SportingTargetSljp1Candidate} from './bet365-sporting-target-sljp1-candidate-v1.mjs';
import {verifyBet365SportingServedTotalStake} from './bet365-sporting-served-total-stake-v1.mjs';

const VERSION='bet365-frank-provider-network-semantics-candidate-v1';
const GAME_CODE='gpas_slfbruno_pop';
const NETWORK_EVIDENCE_VERSION='playtech-sporting-legends-network-semantics-binding-2026-08-27-v1';
const lower=v=>typeof v==='string'&&v.trim()?v.trim().toLowerCase():null;
function execution(){return {decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0};}
function fail(reason,extra={}){return {version:VERSION,valid:false,reason,providerNetworkSemanticsBindingReviewCandidate:false,followingDayMechanicReviewCandidate:false,tenCentEligibilityReviewCandidate:false,bet365FollowingDayRuleAdoptionVerified:false,servedTenCentJackpotEligibilityVerified:false,usableForExecution:false,execution:execution(),...extra};}

export function buildBet365FrankProviderNetworkSemanticsCandidate(har,{sourceName='frank-current.har'}={}){
  const binding=verifyBet365SportingServedSljp1Binding(har,{gameCode:GAME_CODE,sourceName});
  if(binding?.valid!==true)return fail('EXACT_FRANK_SERVED_SLJP1_TRANSPORT_BINDING_REQUIRED',{sourceName,bindingReason:binding?.reason||null});
  const state=recoverBet365SportingTargetSljp1Candidate(har,{gameCode:GAME_CODE,sourceName});
  if(state?.valid!==true)return fail('FRESH_EXACT_FRANK_SLJP1_SERVER_STATE_REQUIRED',{sourceName,stateReason:state?.reason||null});
  const s=state.snapshot||{};
  if(s.code!=='sljp-1'||s.network!=='SPORTING_LEGENDS'||s.tier!=='DAILY'||s.providerScope!=='GLOBAL'||String(s.currency||'').toUpperCase()!=='EUR'||s.local!==0||s.guaranteeObserved!=='TIME')return fail('EXACT_GLOBAL_TIMED_SPORTING_DAILY_SCOPE_REQUIRED',{sourceName});
  if(lower(state.expectedRequestCasino)!==lower(binding?.configuredTransport?.jackpotsCasino))return fail('SERVER_STATE_CASINO_DOES_NOT_MATCH_BET365_CONFIG',{sourceName,serverStateCasino:state.expectedRequestCasino||null,configuredCasino:binding?.configuredTransport?.jackpotsCasino||null});
  const stake=verifyBet365SportingServedTotalStake(har,{gameCode:GAME_CODE,sourceName,requiredStakeEUR:0.10});
  if(stake?.valid!==true||stake?.servedTenCentTotalStakeVerified!==true)return fail('EXPLICIT_SERVED_TEN_CENT_TOTAL_STAKE_REQUIRED',{sourceName,stakeReason:stake?.reason||null});
  return {
    version:VERSION,mode:'OFFLINE_PASSIVE_EXACT_FRANK_PROVIDER_NETWORK_SEMANTICS_BINDING_REVIEW_CANDIDATE_NO_PLAY',valid:true,
    reason:'EXACT_CURRENT_FRANK_BET365_SESSION_BOUND_TO_FRESH_GLOBAL_TIMED_SLJP1_AND_SERVED_TEN_CENT_PROVIDER_NETWORK_SEMANTIC_REVIEW_REQUIRED',
    sourceName,target:binding.target,
    staticProviderNetworkEvidence:{version:NETWORK_EVIDENCE_VERSION,provider:'Playtech',network:'SPORTING_LEGENDS',dailyCode:'sljp-1',providerNetworkFirstBetFollowingDayRuleDocumented:true,providerNetworkAnyBetAnySizeRuleDocumented:true,providerNetworkVariableBetSizeDocumented:true,frankLinkedGameCode:GAME_CODE},
    runtime:{
      exactBet365SpainFrontendToConfiguredSljp1TransportBindingVerified:true,
      exactFrankProviderGameCodeVerified:true,
      bet365ConfiguredJackpotsCasino:binding.configuredTransport.jackpotsCasino,
      configuredTickerEndpoint:binding.configuredTransport.endpoint,
      observedLegacyTickerEndpoint:state.tickerEndpoint,
      requestCasino:state.expectedRequestCasino,
      instanceCode:s.instanceCode,
      code:s.code,network:s.network,tier:s.tier,providerScope:s.providerScope,currency:s.currency,local:s.local,
      guaranteedHitTime:s.guaranteedHitTime,gameTimestamp:s.gameTimestamp,winCount:s.winCount,amount:s.amount,requestExecInterval:s.requestExecInterval,
      servedTenCentTotalStakeVerified:true,
    },
    providerNetworkSemanticsBindingReviewCandidate:true,
    followingDayMechanicReviewCandidate:true,
    tenCentEligibilityReviewCandidate:true,
    independentNetworkSemanticReviewRequired:true,
    independentRuntimeBindingReviewRequired:true,
    bet365FollowingDayRuleAdoptionVerified:false,
    servedTenCentJackpotEligibilityVerified:false,
    usableForExecution:false,
    scientificUse:'This candidate joins three evidence classes that were previously kept separate: Playtech documents the shared Sporting Legends jackpot as linked across games/casinos with any-size eligibility and first-bet-following-day behavior; the provider game-code guide links Frank Bruno gpas_slfbruno_pop to sljp; and this supplied exact bet365 Spain session must independently expose a fresh EUR GLOBAL local=0 Sporting Legends Daily sljp-1 server row under the same bet365-configured casino plus an explicit served 0.10 EUR total-stake menu. Passing therefore upgrades the hypothesis from same-family/cross-operator inference to an exact provider-network semantic binding candidate. Because the economic consequence is decisive, independent review is still mandatory before marking operator following-day behavior or 0.10 jackpot eligibility verified.',
    execution:execution(),
    hardGuards:{onlineOnly:true,nonPromoOnly:true,offlineOnly:true,passiveHarOnly:true,exactFrankPlayRouteAndProviderCodeRequired:true,bet365OwnedConfiguredTransportRequired:true,freshLegacyXmlServerStateRequired:true,globalProviderScopeRequired:true,exactSportingDailySljp1Required:true,timeGuaranteeRequired:true,serverCasinoMustMatchBet365Config:true,explicitServedTenCentTotalStakeRequired:true,crossOperatorRuleTransferForbidden:true,differentJackpotGenerationTransferForbidden:true,providerNetworkBindingCandidateCannotSelfVerifySemantics:true,independentReviewRequired:true,noWagerProbe:true,noAutomaticBetting:true,realMoneyAllowed:false},
  };
}

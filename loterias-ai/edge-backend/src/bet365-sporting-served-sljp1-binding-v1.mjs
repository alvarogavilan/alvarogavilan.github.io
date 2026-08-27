import {verifyBet365SportingExactPlayRouteProvenance} from './bet365-sporting-exact-play-route-provenance-v1.mjs';
import {verifyBet365SportingConfiguredSljp1Transport} from './bet365-sporting-configured-sljp1-transport-v1.mjs';

function execution(){return {decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0};}
function fail(reason,extra={}){return {version:'bet365-sporting-served-sljp1-binding-v1',valid:false,reason,exactBet365SpainFrontendToConfiguredSljp1TransportBindingVerified:false,exactCurrentSljp1ServerStateVerified:false,servedTenCentEligibilityVerified:false,operatorFollowingDayRuleAdoptionVerified:false,usableForOverduePair:false,usableForExecution:false,execution:execution(),...extra};}

export function verifyBet365SportingServedSljp1Binding(har,{gameCode,sourceName='capture.har',maxRouteToProviderMarkerSeconds=120}={}){
  const provenance=verifyBet365SportingExactPlayRouteProvenance(har,{gameCode,sourceName,maxRouteToProviderMarkerSeconds});
  if(provenance?.valid!==true)return fail('EXACT_PLAY_ROUTE_PROVIDER_PROVENANCE_REQUIRED',{gameCode:gameCode||null,sourceName,provenanceReason:provenance?.reason||null});
  const transport=verifyBet365SportingConfiguredSljp1Transport(har,{gameCode,sourceName});
  if(transport?.valid!==true)return fail('BET365_CONFIGURED_SLJP1_TRANSPORT_REQUIRED',{gameCode:gameCode||null,sourceName,transportReason:transport?.reason||null,exactPlayRouteProviderProvenanceVerified:true});
  const pCode=String(provenance?.target?.gameCode||'').trim().toLowerCase();
  const tCode=String(transport?.target?.gameCode||'').trim().toLowerCase();
  if(!pCode||pCode!==tCode)return fail('PROVENANCE_TRANSPORT_TARGET_MISMATCH',{sourceName,provenanceGameCode:pCode||null,transportGameCode:tCode||null});
  return {
    version:'bet365-sporting-served-sljp1-binding-v1',
    mode:'OFFLINE_PASSIVE_CURRENT_FRONTEND_TO_OPERATOR_CONFIGURED_SLJP1_TRANSPORT_BINDING_NO_PLAY',
    valid:true,
    reason:'EXACT_BET365_SPAIN_PLAY_ROUTE_PROVIDER_IDENTITY_AND_OPERATOR_CONFIGURED_SLJP1_TRANSPORT_BOUND_IN_ONE_PASSIVE_CAPTURE_SERVER_STATE_AND_STAKE_PENDING',
    sourceName,
    target:transport.target,
    provenance:{
      exactPublicPlayPath:provenance.target.exactPublicPlayPath,
      routeEvidence:provenance.routeEvidence,
      providerCodeEvidence:provenance.providerCodeEvidence,
      routeToProviderMarkerSeconds:provenance.routeToProviderMarkerSeconds,
      routeToProviderMarkerEntryLag:provenance.routeToProviderMarkerEntryLag,
    },
    configuredTransport:{
      jackpotsCasino:transport.configured.jackpotsCasino,
      jackpotsCasinoEndpoint:transport.configured.jackpotsCasinoEndpoint,
      liveEndpoint:transport.configured.liveEndpoint,
      usesServicesCasinoJackpots:transport.configured.usesServicesCasinoJackpots,
      tickerEntryIndex:transport.matchedTransport.tickerEntryIndex,
      endpoint:transport.matchedTransport.endpoint,
      requestDailyEurLocalZeroVerified:transport.requestDailyEurLocalZeroVerified,
    },
    exactBet365SpainPlayRouteObserved:true,
    exactProviderGameCodeObserved:true,
    exactFrontendProviderIdentityCandidateVerified:true,
    bet365OperatorOwnedJackpotConfigVerified:true,
    bet365OwnedConfiguredSljp1TransportBindingVerified:true,
    exactBet365SpainFrontendToConfiguredSljp1TransportBindingVerified:true,
    exactCurrentSljp1ServerStateVerified:false,
    modernResponseSemanticsVerified:false,
    servedTenCentEligibilityVerified:false,
    operatorFollowingDayRuleAdoptionVerified:false,
    usableForOverduePair:false,
    usableForExecution:false,
    scientificUse:'Closes the passive provenance chain from the exact current bet365 Spain public Frank Bruno play route, through the exact Playtech provider game identifier, into a bet365.es-owned jackpot configuration and one matching outbound EUR global Daily sljp-1 transport in the same supplied capture. This is materially stronger than catalog or provider-family inference, but remains a transport binding: the response schema/current server amount-GHT-winc state, served 0.10 EUR jackpot eligibility and operator adoption of the following-day rule remain independent mandatory gates.',
    execution:execution(),
    hardGuards:{onlineOnly:true,nonPromoOnly:true,offlineOnly:true,passiveHarOnly:true,exactCurrentPublicPlayRouteRequired:true,exactProviderGameCodeRequired:true,bet365OwnedJackpotConfigRequired:true,exactConfiguredSljp1TransportRequired:true,eurGlobalDailyRequestRequired:true,transportBindingDoesNotEqualServerState:true,transportBindingDoesNotVerifyStake:true,transportBindingDoesNotTransferProviderRuleToOperator:true,noWagerProbe:true,noAutomaticBetting:true,realMoneyAllowed:false},
  };
}

import {evaluateBetfairSportingHarOverduePair} from './betfair-sporting-har-overdue-bridge-v1.mjs';

const VERSION='betfair-apmccoy-research-har-bridge-v1';
function execution(){return {decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0};}

export function evaluateBetfairApMcCoyResearchHarPair(input={}){
  const underlying=evaluateBetfairSportingHarOverduePair(input);
  if(!underlying||underlying.valid!==true){
    return {
      version:VERSION,valid:false,reason:underlying?.reason||'UNDERLYING_BETFAIR_HAR_BRIDGE_INVALID',
      underlyingBridge:underlying||null,researchStateAvailable:false,usableForEvResearch:false,usableForExecution:false,
      ...execution(),
      hardGuards:{onlineOnly:true,nonPromoOnly:true,researchOnly:true,underlyingLegacyGreenCannotPropagate:true,noAutomaticBetting:true,realMoneyAllowed:false},
    };
  }
  return {
    ...underlying,
    version:VERSION,
    underlyingBridgeVersion:underlying.version,
    underlyingDecision:underlying.decision,
    underlyingRealMoneyAllowed:underlying.realMoneyAllowed===true,
    decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0,
    researchStateAvailable:true,usableForEvResearch:true,usableForExecution:false,
    reason:underlying.finalEvaluation?.followingDayUnawardedVerified===true?'AP_MCCOY_RESEARCH_STATE_AVAILABLE_EXECUTION_DELIBERATELY_DISABLED':underlying.reason,
    scientificUse:'Research-only wrapper around the legacy Betfair Sporting HAR bridge. It preserves validated passive AP McCoy launcher/config/IMS/ticker/cross-GHT/stake/latency diagnostics but never propagates a legacy GREEN or any real-money authority. Any future execution path must be a separate reviewed adapter after the exact-artifact EV pipeline and fresh final revalidation.',
    hardGuards:{...(underlying.hardGuards||{}),onlineOnly:true,nonPromoOnly:true,researchOnly:true,underlyingLegacyGreenCannotPropagate:true,separateFinalExecutionAdapterRequired:true,noAutomaticBetting:true,realMoneyAllowed:false},
  };
}

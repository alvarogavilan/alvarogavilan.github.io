const VERSION='betfair-apmccoy-current-operator-semantics-v1';
const EXACT_GAME_ID='ap-mccoy-sporting-legends-cptn';
const OPERATOR_EVIDENCE_COMMIT_SHA='7ae808f0cd72ff04ee016d9aaee3b0e2a456cb4c';
const PROVIDER_NETWORK_EVIDENCE_COMMIT_SHA='573a901b3022fd380c1d7181bd04e8291af43c4d';
const OPERATOR_EVIDENCE_FILE='loterias-ai/edge-live/evidence/betfair-spain-apmccoy-current-exact-operator-rules-2026-08-27-v1.json';
const PROVIDER_NETWORK_EVIDENCE_FILE='loterias-ai/edge-live/evidence/playtech-sporting-legends-network-semantics-binding-2026-08-27-v1.json';
const CURRENT_EXACT_OPERATOR_URL='https://casino.betfair.es/juego/ap-mccoy-sporting-legends-cptn';
const CONSERVATIVE_MAIN_GAME_RTP_PCT=93.03;
function execution(){return {decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0};}

export function getBetfairApMcCoyCurrentOperatorSemantics(){
  return {
    version:VERSION,
    valid:true,
    gameId:EXACT_GAME_ID,
    operator:'Betfair Spain',
    market:'ES',
    exactCurrentOperatorUrl:CURRENT_EXACT_OPERATOR_URL,
    evidence:{
      operatorRules:{commitSha:OPERATOR_EVIDENCE_COMMIT_SHA,file:OPERATOR_EVIDENCE_FILE},
      providerNetwork:{commitSha:PROVIDER_NETWORK_EVIDENCE_COMMIT_SHA,file:PROVIDER_NETWORK_EVIDENCE_FILE},
    },
    betfairFirstBetFollowingDayRuleVerified:true,
    betfairAnyBetAnySizeEligibilityVerified:true,
    betfairOperatorFundedJackpotRtpSeparationVerified:true,
    providerGuaranteedHitTimeDefinesFollowingDayBoundaryVerified:true,
    conservativeMainGameRtpPct:CONSERVATIVE_MAIN_GAME_RTP_PCT,
    higherServedRtpVariantMayNotBeAssumed:true,
    currentPrivateServedPoolBindingVerified:false,
    stakeAtDecisionExactVerified:false,
    currentDailyAmountExactVerified:false,
    usableForExecution:false,
    scientificUse:'Code-owned semantic anchor for the exact current Betfair Spain AP McCoy page plus the Playtech Sporting Legends provider-network technical evidence already committed to main. The operator page directly closes first-bet-following-day, any-size eligibility, operator funding, jackpot/RTP separation and the 93.03%-95.03% main-game RTP range. The provider technical evidence maps the shared Sporting Legends timed Daily level to sljp-1/guaranteedHitTime semantics. The conservative execution RTP remains pinned to 93.03% unless a separate reviewed served-variant proof exists. This module proves no private IMS/ticker binding, stake, current jackpot state, race probability or execution authority.',
    execution:execution(),
    hardGuards:{onlineOnly:true,nonPromoOnly:true,exactGameIdPinned:true,exactCurrentOperatorUrlPinned:true,operatorEvidenceCommitPinned:true,providerNetworkEvidenceCommitPinned:true,conservativeRtpFloorPinned:true,publicSemanticsCannotProvePrivatePoolBinding:true,publicSemanticsCannotProveStake:true,publicSemanticsCannotProveCurrentJackpot:true,noWagerProbe:true,noAutomaticBetting:true,realMoneyAllowed:false},
  };
}

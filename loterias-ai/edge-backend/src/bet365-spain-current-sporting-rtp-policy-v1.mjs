const VERSION='bet365-spain-current-sporting-rtp-policy-v1';
const FAIR_PAYOUT_URL='https://help.bet365.es/es/fair-payout';
const RTP_TABLE_URL='https://content001.bet365.es/help/docs/es/rtptables/currentpdf/Spanishv2.pdf';
const GAMES=Object.freeze({
  gpas_slfbruno_pop:Object.freeze({title:'Frank Bruno: Sporting Legends',minimumBetEUR:0.10,maximumBetEUR:100.00,theoreticalRtpPct:95.92}),
  gpas_bgeorge_pop:Object.freeze({title:'Bobby George: Sporting Legends',minimumBetEUR:0.10,maximumBetEUR:25.00,theoreticalRtpPct:96.49}),
  gpas_slblara_pop:Object.freeze({title:'Brian Lara: Sporting Legends',minimumBetEUR:0.10,maximumBetEUR:100.00,theoreticalRtpPct:96.07}),
});
const text=v=>typeof v==='string'&&v.trim()?v.trim():null;
function execution(){return {decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0};}
function fail(reason,extra={}){return {version:VERSION,valid:false,reason,publishedTheoreticalRtpExcludesJackpotAllocationVerified:false,headlineRtpMayBeUsedAsBaseGameRtp:false,servedStakeAtDecisionVerified:false,jackpotEligibilityAtPublishedMinimumBetVerified:false,followingDayRuleVerified:false,servedSljp1RuntimeBindingVerified:false,usableForExecution:false,execution:execution(),...extra};}

export function getBet365SpainCurrentSportingRtpPolicy({gameCode}={}){
  const code=text(gameCode);if(!code)return fail('GAME_CODE_REQUIRED');
  const game=GAMES[code];if(!game)return fail('UNSUPPORTED_SPORTING_GAME_CODE',{gameCode:code});
  return {
    version:VERSION,valid:true,reason:'CURRENT_BET365_SPAIN_OPERATOR_RTP_POLICY_AND_EXACT_TITLE_ROW_PINNED',
    operator:'bet365 Spain',market:'ES',gameCode:code,title:game.title,
    fairPayoutUrl:FAIR_PAYOUT_URL,currentRtpTableUrl:RTP_TABLE_URL,
    publishedMinimumBetEUR:game.minimumBetEUR,publishedMaximumBetEUR:game.maximumBetEUR,publishedTheoreticalRtpPct:game.theoreticalRtpPct,
    exactCurrentOperatorTitleRtpRowVerified:true,
    operatorPolicyStatesJackpotAllocationExcludedFromRtpCalculations:true,
    publishedTheoreticalRtpExcludesJackpotAllocationVerified:true,
    headlineRtpMayBeUsedAsBaseGameRtp:true,
    servedStakeAtDecisionVerified:false,
    jackpotEligibilityAtPublishedMinimumBetVerified:false,
    followingDayRuleVerified:false,
    servedSljp1RuntimeBindingVerified:false,
    usableForExecution:false,
    scientificUse:'Code-owned current bet365 Spain RTP decomposition anchor. The exact title row supplies its published minimum/maximum bet and theoretical RTP, and the current operator Fair Payout policy states that jackpot allocation is excluded from these RTP calculations. The published RTP may therefore be used as base-game RTP in later economics, but the published minimum bet is not proof of jackpot eligibility or a served stake at decision, and this module does not prove following-day semantics or current sljp-1 runtime binding.',
    execution:execution(),
    hardGuards:{onlineOnly:true,nonPromoOnly:true,operatorOwnedSpainPolicy:true,exactTitleRowRequired:true,publishedMinimumBetCannotProveJackpotEligibility:true,publishedMinimumBetCannotProveServedStake:true,rtpPolicyCannotProveFollowingDayRule:true,rtpPolicyCannotProveCurrentSljp1Binding:true,noCrossOperatorTransfer:true,noWagerProbe:true,noAutomaticBetting:true,realMoneyAllowed:false},
  };
}

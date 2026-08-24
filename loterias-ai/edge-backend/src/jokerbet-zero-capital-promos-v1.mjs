export const JOKERBET_ZERO_CAPITAL_PROMOS_V1={
  version:'jokerbet-zero-capital-promos-v1',
  evidenceAsOf:'2026-08-24',
  jurisdiction:'ES',
  operator:'JOKERBET.es',
  noDepositRegistration:{
    sourceUrl:'https://www.jokerbet.es/promociones/bono-sin-deposito.html',
    promotionStart:'2026-03-26',promotionEnd:'2026-12-31',
    audience:'NEW_PROMOTABLE_SUBSCRIBED_USERS_VERIFIED_WITHIN_3_DAYS',
    oneUseScope:'ONE_USE_PER_PLAYER_IP_DEVICE_AND_HOUSEHOLD',
    depositRequiredEUR:0,ownCapitalRequiredToClaimEUR:0,
    nominalComboEUR:30,bonusEUR:20,freePlayEUR:10,
    slotsFreeSpins:100,slotsFreeSpinsGame:'Big Bass Bonanza 1000',
    casinoSlotsRolloverX:80,sportsRolloverX:20,
    casinoSlotsRequiredTurnoverOnBonusEUR:1600,
    slotsRolloverContributionFraction:1,
    rouletteBlackjackCrashRolloverContributionFraction:0.10,
    maxRealConversionBonusEUR:20,maxRealConversionFreePlayEUR:10,maxRealConversionTotalEUR:30,
    activationUseWindowHours:24,freePlayWinningsRolloverWindowHours:24,
    ownMoneyLossPossibleIfNoDepositAndNoRealBalanceWager:false,
    guaranteedCashProfit:false,exactCashExpectedValueKnown:false,positiveCashExpectedValueProven:false,
    repeatablePerUser:false,
    status:'ZERO_OWN_CAPITAL_PROMOTIONAL_OPTION_CASHOUT_EV_UNRESOLVED'
  },
  clubWelcome:{
    sourceUrl:'https://www.jokerbet.es/programa-puntos-fidelidad.html',
    promotionEnd:'2027-12-31',
    audience:'PROMOTABLE_SUBSCRIBED_ELIGIBLE_CLUB_MEMBERS',
    joinJokercoins:700,dailyFirstLoginJokercoins:20,
    cheapestObservedSlotsReward:{jokercoins:650,bonusEUR:5},
    jokercoinsAfterImmediateCheapestReward:50,
    ownCapitalRequiredToReceiveJoinCoinsEUR:0,wagerRequiredToReceiveJoinCoinsEUR:0,
    rewardSpecificRolloverVerified:false,rewardCashEquivalentVerified:false,
    guaranteedCashProfit:false,exactCashExpectedValueKnown:false,positiveCashExpectedValueProven:false,
    status:'FREE_NOMINAL_REWARD_REDEEMABLE_CASHOUT_TERMS_UNRESOLVED'
  },
  guards:{
    zeroDepositDoesNotMeanGuaranteedWithdrawal:true,
    nominalBonusValueCannotMasqueradeAsCashEquivalent:true,
    clubFaceValueCannotBeAddedToRtpUntilConversionTermsVerified:true,
    bonusRolloverRequiresGameEligibilityAndExactTerms:true,
    ownRealBalanceMustNotBeWageredByZeroCapitalLane:true,
    oneUsePromoCannotMasqueradeAsRepeatableEdge:true,
    noMultiAccountingPromoStack:true,
    realMoneyAllowed:false
  }
};

export function buildJokerbetZeroCapitalPromoResearch(){
  const p=JOKERBET_ZERO_CAPITAL_PROMOS_V1;
  const reward=p.clubWelcome.cheapestObservedSlotsReward;
  const clubCanNominallyRedeemWelcomeReward=p.clubWelcome.joinJokercoins>=reward.jokercoins;
  return {
    ...p,
    derived:{
      noDepositOwnCapitalAtRiskEUR:0,
      noDepositPublishedBonusTurnoverEUR:p.noDepositRegistration.casinoSlotsRequiredTurnoverOnBonusEUR,
      noDepositMaximumPublishedConversionEUR:p.noDepositRegistration.maxRealConversionTotalEUR,
      clubCanNominallyRedeemWelcomeReward,
      clubWelcomeNominalRewardEUR:clubCanNominallyRedeemWelcomeReward?reward.bonusEUR:0,
      clubJokercoinsLeftAfterCheapestReward:clubCanNominallyRedeemWelcomeReward?p.clubWelcome.jokercoinsAfterImmediateCheapestReward:null,
      executableCashProfitSignal:false,
      scientificNextTargets:[
        'RESOLVE_CLUB_REWARD_SPECIFIC_ROLLOVER_AND_MAX_CONVERSION',
        'IDENTIFY_HIGHEST_RTP_BONUS_ELIGIBLE_LOW_VOLATILITY_SLOT',
        'MODEL_BONUS_BANKROLL_SURVIVAL_UNDER_EXACT_GAME_DISTRIBUTION'
      ]
    },
    decision:{
      ownCapitalDepositNeededForResearchLane:false,
      claimOnlyIfIndependentlyEligible:true,
      cashProfitProven:false,
      wagerRealMoney:false,
      realMoneyAllowed:false
    }
  };
}

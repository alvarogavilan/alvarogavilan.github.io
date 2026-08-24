const finite=v=>v!==null&&v!==undefined&&Number.isFinite(Number(v));
const validRtp=v=>finite(v)&&Number(v)>=0&&Number(v)<=1;

export const CGM_ZERO_DEPOSIT_CURRENT={
  version:'cgm-zero-deposit-screen-v1',evidenceAsOf:'2026-08-24',jurisdiction:'ES',operator:'Gran Madrid | Casino Online',
  promotion:{
    sourceUrl:'https://www.casinogranmadridonline.es/promociones/sin-deposito',
    promotionStart:'2026-07-20T00:00:00+02:00',promotionEnd:'2026-09-30T23:59:00+02:00',
    depositRequiredEUR:0,
    registrationBonusEUR:30,verifiedAccountBonusEUR:30,totalNominalBonusEUR:60,
    turnoverMultiple:40,turnoverPerTrancheEUR:1200,
    maximumGainPerTrancheEUR:30,expiryDaysPerTranche:14,
    allowedScope:'CASINO_AND_SLOTS_NOT_EXCLUDED_BY_GENERAL_BONUS_TERMS',
    identityVerificationRequiredForSecondTranche:true,
    cashoutAfterRequirements:true
  },
  generalBonusTerms:{
    sourceUrl:'https://www.casinogranmadridonline.es/promociones/bonos-casino',
    defaultContributionFraction:1,
    blackjackContributionFraction:0.15,
    baccaratContributionFraction:0.05,
    rouletteNonLowRiskContributionFraction:0.25,
    rouletteLowRiskCoverageInvalid:true,
    blackjackSurrenderInvalid:true,pontoonInvalid:true,
    videoPokerExplicitlyListedAsReducedContribution:false,
    interpretation:'General public bonus page states bets count 100% except listed reduced/invalid cases. Video poker is not listed among those exceptions, but exact account/game eligibility remains a pre-execution gate.'
  },
  candidate:{
    game:'Jacks or Better - RedRake',provider:'Red Rake Gaming',
    catalogSourceUrl:'https://www.casinogranmadridonline.es/promociones/bonos-slots',
    providerSourceUrl:'https://www.redrakegaming.com/videopoker/jacks-or-better/',
    presentInCurrentBonusCatalog:true,providerCertifiedSpain:true,
    exactCgmPaytableResolved:false,exactCgmTheoreticalRtp:null,exactMinimumStakeEUR:null,
    exactOptimalStrategyResolved:false,exactBonusContributionVerifiedInAccount:false,
    externalCommonTheoreticalRtp:0.9955,externalRtpCanPromote:false
  }
};

export function screenCgmZeroDeposit({
  trancheBonusEUR=30,turnoverMultiple=40,
  gameRtp=CGM_ZERO_DEPOSIT_CURRENT.candidate.exactCgmTheoreticalRtp,
  contributionFraction=CGM_ZERO_DEPOSIT_CURRENT.generalBonusTerms.defaultContributionFraction,
  positiveCashoutProbability=null,
  accountEligible=false,promotionVisibleInAccount=false,
  exactGameIdentityVerified=false,exactPaytableVerified=false,exactStrategyVerified=false,
  exactBonusContributionVerified=false,minimumStakeVerified=false
}={}){
  const bonus=finite(trancheBonusEUR)&&Number(trancheBonusEUR)>0?Number(trancheBonusEUR):null;
  const mult=finite(turnoverMultiple)&&Number(turnoverMultiple)>0?Number(turnoverMultiple):null;
  const contribution=finite(contributionFraction)&&Number(contributionFraction)>0&&Number(contributionFraction)<=1?Number(contributionFraction):null;
  const rtp=validRtp(gameRtp)?Number(gameRtp):null;
  const requiredCreditedTurnoverEUR=bonus!==null&&mult!==null?bonus*mult:null;
  const rawTurnoverEUR=requiredCreditedTurnoverEUR!==null&&contribution!==null?requiredCreditedTurnoverEUR/contribution:null;
  const expectedGameLossIgnoringRuinEUR=rawTurnoverEUR!==null&&rtp!==null?rawTurnoverEUR*(1-rtp):null;
  const meanBalanceAfterRequiredTurnoverIgnoringRuinEUR=bonus!==null&&expectedGameLossIgnoringRuinEUR!==null?bonus-expectedGameLossIgnoringRuinEUR:null;
  const meanSurvivalBreakEvenRtp=mult!==null&&contribution!==null?1-contribution/mult:null;
  const p=finite(positiveCashoutProbability)&&Number(positiveCashoutProbability)>=0&&Number(positiveCashoutProbability)<=1?Number(positiveCashoutProbability):null;
  const maxCashout=CGM_ZERO_DEPOSIT_CURRENT.promotion.maximumGainPerTrancheEUR;
  const strictPositiveMonetaryEvSignFromPositiveCashoutProbability=p!==null&&p>0;
  const monetaryDownsideOwnCapitalEUR=0;
  return {
    version:'cgm-zero-deposit-screen-v1',trancheBonusEUR:bonus,turnoverMultiple:mult,contributionFraction:contribution,
    requiredCreditedTurnoverEUR,rawTurnoverEUR,gameRtp:rtp,expectedGameLossIgnoringRuinEUR,meanBalanceAfterRequiredTurnoverIgnoringRuinEUR,
    meanSurvivalBreakEvenRtp,
    positiveCashoutProbability:p,
    positiveCashoutProbabilityDefinition:'P(withdrawable cash after all promotion requirements > 0)',
    maximumCashoutPerTrancheEUR:maxCashout,
    monetaryDownsideOwnCapitalEUR,
    nonNegativeClaimValueByConstruction:true,
    strictPositiveMonetaryEvSignFromPositiveCashoutProbability,
    expectedCashProfitEUR:null,
    expectedCashProfitMagnitudeRequiresTerminalCashoutDistribution:true,
    positiveEvMagnitudeQuantified:false,
    executable:false,realMoneyAllowed:false,
    blockers:[
      ...(accountEligible?[]:['ACCOUNT_ELIGIBILITY_UNVERIFIED']),
      ...(promotionVisibleInAccount?[]:['PROMOTION_NOT_CAPTURED_IN_ACCOUNT']),
      ...(exactGameIdentityVerified?[]:['EXACT_ELIGIBLE_GAME_IDENTITY_UNVERIFIED']),
      ...(exactPaytableVerified?[]:['EXACT_PAYTABLE_AND_CGM_RTP_UNVERIFIED']),
      ...(exactStrategyVerified?[]:['OPTIMAL_STRATEGY_UNVERIFIED']),
      ...(exactBonusContributionVerified?[]:['BONUS_CONTRIBUTION_NOT_ACCOUNT_VERIFIED']),
      ...(minimumStakeVerified?[]:['MINIMUM_STAKE_UNVERIFIED']),
      ...(p!==null?[]:['BONUS_SURVIVAL_AND_POSITIVE_CASHOUT_PROBABILITY_UNQUANTIFIED']),
      'PROSPECTIVE_VALIDATION_MISSING','EXECUTION_CONTRACT_FAIL_CLOSED'
    ],
    guards:{
      zeroDepositDoesNotMeanGuaranteedProfit:true,
      bonusBalanceIsNotCashBeforeRollover:true,
      meanRtpCannotReplaceRuinSimulation:true,
      externalVideoPokerRtpCannotMasqueradeAsCgmPaytable:true,
      rouletteCoverageAndOtherForbiddenLowRiskPatternsNotUsed:true,
      noMultipleAccountsOrPromoAbuse:true,
      realMoneyAllowed:false
    }
  };
}

export function cgmExternalVideoPokerScenario(){
  const rtp=CGM_ZERO_DEPOSIT_CURRENT.candidate.externalCommonTheoreticalRtp;
  const s=screenCgmZeroDeposit({gameRtp:rtp,contributionFraction:1});
  return {
    scenarioOnly:true,externalRtp:rtp,sameCgmConfigurationProven:false,
    rawTurnoverEUR:s.rawTurnoverEUR,expectedGameLossIgnoringRuinEUR:s.expectedGameLossIgnoringRuinEUR,
    meanBalanceAfterRequiredTurnoverIgnoringRuinEUR:s.meanBalanceAfterRequiredTurnoverIgnoringRuinEUR,
    meanSurvivalBreakEvenRtp:s.meanSurvivalBreakEvenRtp,
    positiveCashEvProven:false,executable:false
  };
}

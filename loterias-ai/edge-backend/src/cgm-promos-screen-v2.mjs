import { CGM_ZERO_DEPOSIT_CURRENT as V1,screenCgmZeroDeposit as screenV1 } from './cgm-zero-deposit-screen-v1.mjs';

const finite=v=>v!==null&&v!==undefined&&Number.isFinite(Number(v));
const validRtp=v=>finite(v)&&Number(v)>=0&&Number(v)<=1;

export const CGM_CURRENT_PROMOS_V2={
  version:'cgm-current-promos-v2-20260824',evidenceAsOf:'2026-08-24',jurisdiction:'ES',operator:'Gran Madrid | Casino Online',
  zeroDeposit:{
    ...V1.promotion,
    sourceUrl:'https://www.casinogranmadridonline.es/promociones/sin-deposito',
    codeSourceUrl:'https://www.casinogranmadridonline.es/promociones/codigo-promocional',
    code:'CGM26',
    depositRequiredEUR:0,
    registrationBonusEUR:30,verifiedAccountBonusEUR:30,totalNominalBonusEUR:60,
    turnoverMultiple:40,turnoverPerTrancheEUR:1200,maximumGainPerTrancheEUR:30,expiryDaysPerTranche:14
  },
  currentBonusRules:{
    sourceUrl:'https://www.casinogranmadridonline.es/promociones/bonos-casino',
    slotRulesSourceUrl:'https://www.casinogranmadridonline.es/promociones/bonos-slots',
    generalTermsSourceUrl:'https://granmadrid.zendesk.com/hc/es/articles/39498621875729-Terminos-y-condiciones-de-los-bonos',
    currentRewardBonusTurnoverMultiple:40,
    slotsDefaultContributionFraction:1,
    realBalanceConsumedBeforeBonusBalance:true,
    excludedSlotListPublished:true,
    oldGeneralTermsUpdated:'2025-10-23',
    oldVideoPokerContributionFraction:0.15,
    oldJacksOrBetterAllBetsInvalid:true,
    currentNoBonusListIncludesJacksOrBetterRedRake:true,
    currentNoBonusListIncludesBookOf99:true,
    previousV1CandidateInvalidated:true,
    interpretation:'The current slots bonus page states valid slot wagers count 100% but also publishes a large explicit list of titles that do not accept bonus balance. Jacks or Better - RedRake and Book of 99 are not eligible candidates. Older general terms independently list video poker at reduced contribution and Jacks or Better as invalid, so the v1 video-poker candidate is quarantined.'
  },
  fullOfLuckCandidate:{
    game:'Full Of Luck',
    sourceUrl:'https://www.casinogranmadridonline.es/slots/full-of-luck',
    publishedRtp:0.9572,
    publishedMinimumStakeEUR:0.15,
    publishedMaximumStakeEUR:45,
    publishedMaximumPrizeMultiplier:1000,
    exactTitleNotFoundInCurrentPublishedNoBonusList:true,
    exactTitleNotFoundIn2025GeneralNoBonusList:true,
    publicRulesImplyDefaultSlotContributionFraction:1,
    exactTargetAccountBonusAcceptanceCaptured:false,
    exactInGameRulesFingerprintCaptured:false,
    canPromoteExecution:false
  },
  birthday:{
    sourceUrl:'https://www.casinogranmadridonline.es/promociones/bonos-casino/bono-cumple',
    promotionStart:'2026-07-20',promotionEnd:'2026-09-30',
    verifiedAccountRequired:true,noPendingWithdrawalRequired:true,noLimitIncreasePast30DaysRequired:true,
    firstDepositOfBirthdayRequired:true,minimumDepositEUR:10,
    bonusRate:1.5,minimumDepositBonusEUR:15,bonusMaximumEUR:500,
    turnoverMultipleOnBonus:20,minimumDepositRequiredTurnoverEUR:300,
    maximumGainMultipleOfDeposit:5,maximumGainAbsoluteEUR:1000,
    freeSpins:10,freeSpinFamily:'Pirots',
    freeSpinWinningsBecomeCasinoBonus:true,freeSpinWinningsTurnoverMultiple:20,freeSpinConversionMaximumEUR:50,
    expiryDays:14,
    priorityOverWelcomeLoyaltyAndWeeklyExtra:true
  },
  guards:{
    noBonusListIsExclusionListNotEligibilityList:true,
    jacksOrBetterCandidateRevoked:true,
    bookOf99CandidateRevoked:true,
    absenceFromPublishedExclusionListStillRequiresTargetAccountCapture:true,
    meanEnvelopeCannotReplaceRuinModel:true,
    birthdayDepositIsOwnCapitalExposure:true,
    realMoneyAllowed:false
  }
};

export function screenCgmZeroDepositV2({
  accountEligible=false,promotionVisibleInAccount=false,
  exactCandidateVisibleInAccount=false,exactBonusAcceptanceVerified=false,
  exactRulesFingerprintVerified=false,
  positiveCashoutProbability=null
}={}){
  const p=CGM_CURRENT_PROMOS_V2;
  const c=p.fullOfLuckCandidate;
  const base=screenV1({
    trancheBonusEUR:p.zeroDeposit.registrationBonusEUR,
    turnoverMultiple:p.zeroDeposit.turnoverMultiple,
    gameRtp:c.publishedRtp,
    contributionFraction:p.currentBonusRules.slotsDefaultContributionFraction,
    positiveCashoutProbability,
    accountEligible,promotionVisibleInAccount,
    exactGameIdentityVerified:exactCandidateVisibleInAccount,
    exactPaytableVerified:exactRulesFingerprintVerified,
    exactStrategyVerified:true,
    exactBonusContributionVerified:exactBonusAcceptanceVerified,
    minimumStakeVerified:exactRulesFingerprintVerified
  });
  const turnover=base.rawTurnoverEUR;
  const minStake=c.publishedMinimumStakeEUR;
  const spinsAtMinimum=turnover!==null?turnover/minStake:null;
  const maxPrizeEUR=minStake*c.publishedMaximumPrizeMultiplier;
  const publicPositiveOutcomeExists=c.publishedMaximumPrizeMultiplier>0;
  const publicFinitePositiveCashoutPathExists=
    p.zeroDeposit.depositRequiredEUR===0 &&
    c.exactTitleNotFoundInCurrentPublishedNoBonusList===true &&
    c.publicRulesImplyDefaultSlotContributionFraction===1 &&
    minStake>0 && minStake<=p.zeroDeposit.registrationBonusEUR &&
    Number.isFinite(spinsAtMinimum) && spinsAtMinimum>0 &&
    publicPositiveOutcomeExists;
  const conditionalStrictPositiveOwnCapitalEvSignFromPublishedRules=publicFinitePositiveCashoutPathExists;
  return {
    ...base,
    version:'cgm-zero-deposit-screen-v2-corrected-eligibility',
    candidate:c,
    previousJacksOrBetterCandidateRevoked:true,
    spinsAtPublishedMinimumStake:spinsAtMinimum,
    publishedMaxPrizeAtMinimumStakeEUR:maxPrizeEUR,
    publicFinitePositiveCashoutPathExists,
    publicPositiveCashoutPathReason:publicFinitePositiveCashoutPathExists?'A no-deposit 30 EUR promotional balance can place the published 0.15 EUR minimum stake in a slot not found by exact title in the current no-bonus list; the same operator page publishes positive prizes up to 1000x. Therefore at least one finite winning outcome sequence can both avoid ruin and complete finite turnover with positive terminal cash under the published rules. The probability magnitude is not known.':null,
    conditionalStrictPositiveOwnCapitalEvSignFromPublishedRules,
    conditionalSignScope:'CONDITIONAL_ON_ACCOUNT_ELIGIBILITY_PROMO_VISIBILITY_AND_CURRENT_PUBLISHED_RULES_APPLYING_TO_TARGET_ACCOUNT',
    targetAccountPositiveEvProven:false,
    positiveEvMagnitudeQuantified:false,
    executable:false,realMoneyAllowed:false,
    blockers:[
      ...(accountEligible?[]:['ACCOUNT_ELIGIBILITY_UNVERIFIED']),
      ...(promotionVisibleInAccount?[]:['PROMOTION_NOT_CAPTURED_IN_ACCOUNT']),
      ...(exactCandidateVisibleInAccount?[]:['FULL_OF_LUCK_NOT_CAPTURED_IN_TARGET_ACCOUNT']),
      ...(exactBonusAcceptanceVerified?[]:['FULL_OF_LUCK_BONUS_ACCEPTANCE_NOT_TARGET_ACCOUNT_VERIFIED']),
      ...(exactRulesFingerprintVerified?[]:['FULL_OF_LUCK_IN_GAME_RULES_FINGERPRINT_NOT_CAPTURED']),
      'POSITIVE_CASHOUT_PROBABILITY_MAGNITUDE_UNQUANTIFIED','PROSPECTIVE_VALIDATION_MISSING','EXECUTION_CONTRACT_FAIL_CLOSED'
    ],
    guards:{...base.guards,publicExistenceProofCannotPromoteExecution:true,accountSpecificOverrideMayExist:true,realMoneyAllowed:false}
  };
}

export function screenCgmBirthday({
  depositEUR=CGM_CURRENT_PROMOS_V2.birthday.minimumDepositEUR,
  qualifyingGameRtp=CGM_CURRENT_PROMOS_V2.fullOfLuckCandidate.publishedRtp,
  accountEligible=false,promotionVisibleInAccount=false,
  exactGameBonusAcceptanceVerified=false,exactRulesFingerprintVerified=false,
  ruinAndCashoutDistributionResolved=false,freeSpinValueResolved=false
}={}){
  const p=CGM_CURRENT_PROMOS_V2,terms=p.birthday;
  const deposit=finite(depositEUR)&&Number(depositEUR)>=terms.minimumDepositEUR?Number(depositEUR):null;
  const bonus=deposit!==null?Math.min(deposit*terms.bonusRate,terms.bonusMaximumEUR):null;
  const turnover=bonus!==null?bonus*terms.turnoverMultipleOnBonus:null;
  const rtp=validRtp(qualifyingGameRtp)?Number(qualifyingGameRtp):null;
  const expectedGameLossIgnoringRuinEUR=turnover!==null&&rtp!==null?turnover*(1-rtp):null;
  const meanPromoUpliftBeforeFreeSpinsEUR=bonus!==null&&expectedGameLossIgnoringRuinEUR!==null?bonus-expectedGameLossIgnoringRuinEUR:null;
  const meanBreakEvenRtpBeforeFreeSpins=terms.turnoverMultipleOnBonus>0?1-1/terms.turnoverMultipleOnBonus:null;
  const conditionalMeanEnvelopePositive=meanPromoUpliftBeforeFreeSpinsEUR!==null&&meanPromoUpliftBeforeFreeSpinsEUR>0;
  const maxGainEUR=deposit!==null?Math.min(deposit*terms.maximumGainMultipleOfDeposit,terms.maximumGainAbsoluteEUR):null;
  return {
    version:'cgm-birthday-screen-v1',dateScope:'BIRTHDAY_ONLY',depositEUR:deposit,bonusEUR:bonus,
    turnoverMultiple:terms.turnoverMultipleOnBonus,requiredTurnoverEUR:turnover,
    qualifyingGame:'Full Of Luck',qualifyingGamePublishedRtp:rtp,
    expectedGameLossIgnoringRuinEUR,meanPromoUpliftBeforeFreeSpinsEUR,
    meanBreakEvenRtpBeforeFreeSpins,conditionalMeanEnvelopePositive,
    freeSpins:terms.freeSpins,freeSpinFamily:terms.freeSpinFamily,freeSpinValueResolved,
    maximumGainEUR:maxGainEUR,ownCapitalExposureUpToEUR:deposit,
    actualPositiveEvProven:false,positiveEvMagnitudeQuantified:false,
    executable:false,realMoneyAllowed:false,
    blockers:[
      ...(accountEligible?[]:['BIRTHDAY_ACCOUNT_ELIGIBILITY_UNVERIFIED']),
      ...(promotionVisibleInAccount?[]:['BIRTHDAY_PROMOTION_NOT_CAPTURED_IN_ACCOUNT']),
      ...(exactGameBonusAcceptanceVerified?[]:['FULL_OF_LUCK_BONUS_ACCEPTANCE_NOT_TARGET_ACCOUNT_VERIFIED']),
      ...(exactRulesFingerprintVerified?[]:['FULL_OF_LUCK_IN_GAME_RULES_FINGERPRINT_NOT_CAPTURED']),
      ...(ruinAndCashoutDistributionResolved?[]:['BIRTHDAY_RUIN_AND_CASHOUT_DISTRIBUTION_UNRESOLVED']),
      ...(freeSpinValueResolved?[]:['PIROTS_FREE_SPIN_VALUE_UNRESOLVED']),
      'PROSPECTIVE_VALIDATION_MISSING','EXECUTION_CONTRACT_FAIL_CLOSED'
    ],
    interpretation:'At the 10 EUR minimum deposit, the birthday bonus is 15 EUR and requires 300 EUR turnover. Before free-spin value, ruin and the conversion cap, the mean-loss break-even is 95% RTP. The operator-published Full Of Luck RTP is 95.72%, giving a +2.16 EUR mean envelope. This is not the actual cash EV because bankroll ruin, target-account eligibility, bonus acceptance, cap mechanics and free-spin value still matter.',
    guards:{meanEnvelopeIsNotActualEv:true,depositIsOwnCapitalAtRisk:true,freeSpinsCannotBeAddedAtFaceValue:true,realMoneyAllowed:false}
  };
}

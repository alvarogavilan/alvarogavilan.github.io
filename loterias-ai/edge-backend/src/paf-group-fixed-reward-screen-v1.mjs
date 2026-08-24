const finite=v=>v!==null&&v!==undefined&&Number.isFinite(Number(v));
const validRtp=v=>finite(v)&&Number(v)>=0&&Number(v)<=1;

export const GOLDEN_BULL_FIXED_REAL_MONEY_CURRENT={
  id:'goldenbull:play-50-get-5-real-money',
  operator:'GoldenBull.es',jurisdiction:'ES',operatorGroup:'Paf International P.L.C.',
  publicOfferSourceUrl:'https://www.goldenbull.es/bonus',
  rewardSemanticsSourceUrl:'https://support.goldenbull.es/hc/es/articles/15449094441244--Qu%C3%A9-tipo-de-promos-y-recompensas-hay',
  eligibilitySourceUrl:'https://support.goldenbull.es/hc/es/articles/15449148464924--Qu%C3%A9-requisitos-debo-cumplir-para-obtener-promociones',
  saferGamingSourceUrl:'https://www.goldenbull.es/safer-gaming/set-your-limits',
  qualifyingTurnoverEUR:50,fixedRewardEUR:5,rewardLabel:'5 EUR Dinero Real',
  currentPublicOfferSeen:true,rewardClass:'REAL_MONEY',rewardClassSemanticsVerified:true,
  rewardWithdrawable:true,rewardReleaseTurnoverRequired:false,
  exactQualifyingGameResolved:false,exactQualifyingGameRtpResolved:false,
  exactAccountOfferTermsResolved:false,exactPromotionWindowResolved:false,
  accountEligibilityVerified:false,repeatabilityResolved:false,
  genericPromotionEligibilityRules:{noRiskBehaviourLast90Days:true},
  personalizedPromotionAdditionalEligibilityRules:{noDepositLimitIncreaseLast33Days:true,lossesLast90DaysMustNotExceedEUR:2000},
  groupSafetyFacts:{depositAndLossLimitsSharedAcrossBrands:true,brands:['Paf.es','PinataCasino.es','GoldenBull.es','SpeedyBet.es'],promotionIndependenceAcrossBrandsVerified:false},
  notes:[
    'Current Golden Bull Spain bonus page publishes a 5 EUR Real Money reward after playing 50 EUR.',
    'Current Golden Bull support defines Real Money as money with no release requirement, compatible with any game category and withdrawable.',
    'Current Golden Bull support says some offers require playing a specified amount in a specified game; the public index does not expose the exact qualifying title for this 5 EUR offer.',
    'Current Golden Bull promotion eligibility requires no risky-gambling behaviour in the prior 90 days; personalized promotions add deposit-limit and 90-day loss constraints.',
    'Paf-group shared deposit/loss limits do not prove that promotions are independent or stackable across brands; no cross-brand stacking is assumed.'
  ]
};

export function screenFixedRealMoneyReward({
  qualifyingTurnoverEUR=GOLDEN_BULL_FIXED_REAL_MONEY_CURRENT.qualifyingTurnoverEUR,
  fixedRewardEUR=GOLDEN_BULL_FIXED_REAL_MONEY_CURRENT.fixedRewardEUR,
  qualifyingGameRtp=null,exactOfferTermsResolved=false,accountEligible=false,
  qualifyingGameResolved=false,qualifyingGameRtpResolved=false,
  rewardSemanticsVerified=GOLDEN_BULL_FIXED_REAL_MONEY_CURRENT.rewardClassSemanticsVerified,
  repeatabilityResolved=false,prospectiveValidationPassed=false
}={}){
  const q=Number(qualifyingTurnoverEUR),reward=Number(fixedRewardEUR);
  const breakEvenQualifyingRtp=q>0&&finite(reward)?1-reward/q:null;
  const rtpKnown=validRtp(qualifyingGameRtp)&&qualifyingGameRtpResolved===true;
  const expectedQualifyingLossEUR=rtpKnown?q*(1-Number(qualifyingGameRtp)):null;
  const conditionalExpectedPromoNetEUR=rtpKnown?reward-expectedQualifyingLossEUR:null;
  const identityReady=exactOfferTermsResolved===true&&accountEligible===true&&qualifyingGameResolved===true&&rtpKnown&&rewardSemanticsVerified===true;
  const positiveEvProven=identityReady&&conditionalExpectedPromoNetEUR>0;
  const reproduciblePositiveEvProven=positiveEvProven&&repeatabilityResolved===true&&prospectiveValidationPassed===true;
  return {
    version:'paf-group-fixed-real-money-reward-screen-v1',qualifyingTurnoverEUR:q,fixedRewardEUR:reward,
    qualifyingGameRtp:validRtp(qualifyingGameRtp)?Number(qualifyingGameRtp):null,
    breakEvenQualifyingRtp,expectedQualifyingLossEUR,conditionalExpectedPromoNetEUR,
    rewardSemanticsVerified:rewardSemanticsVerified===true,exactOfferTermsResolved:exactOfferTermsResolved===true,
    accountEligible:accountEligible===true,qualifyingGameResolved:qualifyingGameResolved===true,
    qualifyingGameRtpResolved:qualifyingGameRtpResolved===true,repeatabilityResolved:repeatabilityResolved===true,
    prospectiveValidationPassed:prospectiveValidationPassed===true,positiveEvProven,reproduciblePositiveEvProven,executable:false,
    blockers:[
      ...(exactOfferTermsResolved?[]:['EXACT_ACCOUNT_OFFER_TERMS_NOT_CAPTURED']),
      ...(accountEligible?[]:['ACCOUNT_ELIGIBILITY_NOT_VERIFIED']),
      ...(qualifyingGameResolved?[]:['QUALIFYING_GAME_NOT_RESOLVED']),
      ...(rtpKnown?[]:['QUALIFYING_GAME_RTP_NOT_VERIFIED']),
      ...(rewardSemanticsVerified?[]:['REAL_MONEY_REWARD_SEMANTICS_NOT_VERIFIED']),
      ...(repeatabilityResolved?[]:['REPEATABILITY_NOT_RESOLVED']),
      ...(prospectiveValidationPassed?[]:['PROSPECTIVE_VALIDATION_MISSING'])
    ],
    guards:{publicOfferHeadlineCannotResolveHiddenQualifyingGame:true,fixedRewardBreakEvenCannotPromoteWithoutExactGameRtp:true,groupBrandsCannotBeAssumedIndependentPromotions:true,responsibleGamingEligibilityCannotBeBypassed:true,positiveEvDoesNotGuaranteeRealizedProfit:true,realMoneyAllowed:false}
  };
}

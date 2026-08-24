import { PLAYUZU_WELCOME_CURRENT as V1,screenPlayuzuWelcome as screenV1 } from './playuzu-welcome-screen-v1.mjs';

export const PLAYUZU_WELCOME_CURRENT_V2={
  ...V1,
  version:'playuzu-welcome-screen-v2-current-operator-evidence',
  evidenceAsOf:'2026-08-24',
  promotion:{
    ...V1.promotion,
    sourceUrl:'https://www.playuzu.es/promociones/tiradas-gratis/',
    specificTermsStateOnlyIndispensableWithdrawalCondition:true,
    indispensableWithdrawalCondition:'AT_LEAST_ONE_WAGER_IN_ANOTHER_GAME',
    specificTermsNoRollover:true,
    specificTermsNoWinningCap:true
  },
  rewardPolicy:{
    ...V1.rewardPolicy,
    sourceUrl:'https://www.playuzu.es/politica-de-bonos/',
    termsSourceUrl:'https://www.playuzu.es/terminos-y-condiciones/',
    generalAccountAgeMinimumDays:30,
    promotionSpecificTermsOverrideConflictingGeneralRewardPolicy:true,
    welcomeSpecificTermsResolveThirtyDayConflict:true,
    currentConflict:null,
    resolution:'Current official welcome terms explicitly describe the first-deposit welcome promotion and state that the only indispensable withdrawal condition is at least one wager in another game. Current official Reward Policy clause 12 says individual promotion terms apply when they conflict with the general reward policy; general Terms section 9 likewise gives promotion/bonus/special-offer provisions precedence. The 30-day rule therefore remains relevant to later/general offers, not as a blocker invented for this specific welcome flow.',
    stillRequiresAccountSpecificEligibility:true,
    stillRequiresOwnMoneyRisk:true,
    stillForbidsIrregularLowRiskPatterns:true
  },
  currentSameOperatorAccountObservation:{
    sourceUrl:'https://www.mundodeportivo.com/guias-de-juego/playuzu/',
    sourceType:'THIRD_PARTY_EDITORIAL_REAL_MONEY_ACCOUNT_TEST',
    crawledAsCurrentAugust2026:true,
    testDurationDays:10,
    operator:'PlayUZU.es',
    game:'Queen of the Pyramids Mega Cash Collect',
    provider:'Playtech',
    reportedRtp:0.9572,
    welcomeFreeSpinsActivated:50,
    reportedFreeSpinWinningsEUR:3.42,
    freeSpinWinningsCreditedToRealBalance:true,
    realMoneyWithdrawalObserved:true,
    reportedWithdrawalEUR:35,
    reportedWithdrawalMethod:'Bizum',
    reportedWithdrawalUnderMinutes:5,
    exactFutureUserConfigurationProven:false,
    officialOperatorRtpFingerprint:false,
    canPromoteExecution:false,
    interpretation:'This is strong same-operator current-account corroboration that the advertised welcome flow can credit free-spin winnings to real balance and be followed by a real withdrawal. It is not an official game rules fingerprint and cannot substitute for the target account capture.'
  },
  currentIndependentOfferCorroboration:{
    sourceUrl:'https://www.webapuestas.com/playuzu/bonos/casinos/bono-bienvenida',
    sourceType:'THIRD_PARTY_CURRENT_OFFER_CAPTURE',
    updated:'2026-07-14',
    screenshotsReported:'2026-07-18',
    minimumDepositEUR:10,
    freeSpins:50,
    game:'Queen of the Pyramids Mega Cash Collect',
    noRollover:true,
    realBalanceWinnings:true,
    noWithdrawalRestrictionReported:true,
    exactRtpReported:null,
    canPromoteExecution:false
  }
};

export function screenPlayuzuWelcomeV2({
  ownWagerStakeEUR=PLAYUZU_WELCOME_CURRENT_V2.ownMoneyWagerCandidate.publishedMinimumStakeEUR,
  ownWagerRtp=PLAYUZU_WELCOME_CURRENT_V2.ownMoneyWagerCandidate.publishedTheoreticalRtp,
  freeSpinGameRtp=PLAYUZU_WELCOME_CURRENT_V2.freeSpinConfiguration.exactPlayuzuRtp,
  accountEligible=false,promotionVisibleInAccount=false,
  ownWagerQualifiesVerified=false,freeSpinRulesFingerprintVerified=false
}={}){
  const base=screenV1({
    ownWagerStakeEUR,ownWagerRtp,freeSpinGameRtp,
    accountEligible,promotionVisibleInAccount,
    accountAgePolicyResolved:true,
    ownWagerQualifiesVerified,freeSpinRulesFingerprintVerified
  });
  return {
    ...base,
    version:'playuzu-welcome-screen-v2-current-operator-evidence',
    accountAgePolicyResolvedBySpecificTerms:true,
    currentSameOperatorAccountEvidenceAvailable:true,
    blockers:(base.blockers||[]).filter(x=>x!=='WELCOME_VS_30_DAY_POLICY_CONFLICT_UNRESOLVED'),
    guards:{
      ...base.guards,
      generalThirtyDayRuleCannotRecreateResolvedWelcomeConflict:true,
      sameOperatorEditorialRtpCannotMasqueradeAsOfficialFingerprint:true,
      targetAccountEligibilityStillRequired:true,
      targetAccountPromoCaptureStillRequired:true,
      realMoneyAllowed:false
    }
  };
}

export function playuzuCurrentAccountObservedScenario(){
  const o=PLAYUZU_WELCOME_CURRENT_V2.currentSameOperatorAccountObservation;
  const s=screenPlayuzuWelcomeV2({freeSpinGameRtp:o.reportedRtp,freeSpinRulesFingerprintVerified:false});
  const expectedBreakEven=s.breakEvenFreeSpinRtpUsingOwnPublishedRtp;
  const worstCaseBreakEven=s.breakEvenFreeSpinRtpWorstCaseOwnWager;
  return {
    scenarioOnly:true,
    sourceType:o.sourceType,
    sameOperator:true,
    samePromotedGame:true,
    reportedRtp:o.reportedRtp,
    illustrativeExpectedPromoNetEUR:s.expectedPromoNetEUR,
    reportedRtpVsExpectedLossBreakEvenMultiple:expectedBreakEven?o.reportedRtp/expectedBreakEven:null,
    reportedRtpVsWorstCaseBreakEvenMultiple:worstCaseBreakEven?o.reportedRtp/worstCaseBreakEven:null,
    observedFreeSpinWinningsEUR:o.reportedFreeSpinWinningsEUR,
    realMoneyWithdrawalObserved:o.realMoneyWithdrawalObserved,
    exactTargetAccountFingerprintProven:false,
    positiveEvForTargetAccountProven:false,
    executable:false,
    realMoneyAllowed:false
  };
}

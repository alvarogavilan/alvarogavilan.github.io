const finite=v=>v!==null&&v!==undefined&&Number.isFinite(Number(v));
const validRtp=v=>finite(v)&&Number(v)>=0&&Number(v)<=1;

export const PLAYUZU_WELCOME_CURRENT={
  version:'playuzu-welcome-screen-v1',
  evidenceAsOf:'2026-08-24',
  jurisdiction:'ES',operator:'PlayUZU.es',legalOperator:'Skill On Net S.A.',
  promotion:{
    sourceUrl:'https://www.playuzu.es/promociones/tiradas-gratis/',
    firstDepositOnly:true,minimumDepositEUR:10,
    freeSpins:50,freeSpinStakeEUR:0.10,freeSpinNominalTurnoverEUR:5,
    freeSpinGame:'Queen of the Pyramids Mega Cash Collect',
    freeSpinWinningsPaidRealMoney:true,freeSpinWinningsRolloverX:0,
    maximumFreeSpinWinningsEUR:null,minimumWithdrawalEUR:0,
    requiresAtLeastOneWagerInDifferentGame:true,
    advertisedRewardWindowApproxDays:30,
    irregularPlayCanVoidReward:true
  },
  rewardPolicy:{
    sourceUrl:'https://www.playuzu.es/politica-de-bonos/',
    policyVersion:'1.1',policyLastUpdated:'2024-07-31',
    generalAccountAgeMinimumDays:30,identityVerificationRequiredForOffers:true,
    ownMoneyMustHaveBeenRiskedBeforeRewardWithdrawal:true,
    depositingOnlyToClaimRewardWithoutRiskingFundsIsIrregular:true,
    lowRiskHedgedOrCoveragePatternsForbidden:true,
    singleNormalSpinExplicitlyForbidden:false,
    promotionSpecificTermsMayOverrideGeneralPolicy:true,
    currentConflict:'WELCOME_PAGE_FRAMES_PROMO_AS_FIRST_DEPOSIT_AND_REQUIRES_AT_LEAST_ONE_OTHER_GAME_WAGER; GENERAL_REWARD_POLICY_STATES_OFFERS_REQUIRE_ACCOUNT_OPEN_AT_LEAST_30_DAYS. ACCOUNT-SPECIFIC ELIGIBILITY MUST BE VERIFIED.'
  },
  ownMoneyWagerCandidate:{
    game:'Big Bass Splash',provider:'Pragmatic Play',sourceUrl:'https://www.playuzu.es/slots/big-bass-splash/',
    publishedMinimumStakeEUR:0.10,publishedTheoreticalRtp:0.9671,
    differentFromFreeSpinGame:true,normalSlotSpin:true,
    expectedLossAtMinimumStakeEUR:0.10*(1-0.9671),
    candidateSatisfiesPlainLanguageOneOtherGameWager:true,
    accountPolicyAcceptanceStillRequired:true
  },
  freeSpinConfiguration:{
    exactPlayuzuRtp:null,rulesFingerprintVerified:false,
    operatorMustPublishExpectedRtp:true,
    regulatorySourceUrl:'https://www.boe.es/buscar/act.php?id=BOE-A-2014-8135',
    externalSameTitleConfigurationEvidence:[
      {operator:'Genting Casino Spain',rtp:0.9097,sourceUrl:'https://www.gentingcasino.es/slots/queen-of-the-pyramids-mega-cash-collect/',samePlayuzuConfigurationProven:false},
      {operator:'Betfair Casino Spain',rtp:0.9541,sourceUrl:'https://casino.betfair.es/juego/queen-mega-ccollect-cptn',samePlayuzuConfigurationProven:false}
    ],
    externalValuesCannotBePromotedToPlayuzuRtp:true
  }
};

export function screenPlayuzuWelcome({
  ownWagerStakeEUR=PLAYUZU_WELCOME_CURRENT.ownMoneyWagerCandidate.publishedMinimumStakeEUR,
  ownWagerRtp=PLAYUZU_WELCOME_CURRENT.ownMoneyWagerCandidate.publishedTheoreticalRtp,
  freeSpinGameRtp=PLAYUZU_WELCOME_CURRENT.freeSpinConfiguration.exactPlayuzuRtp,
  accountEligible=false,promotionVisibleInAccount=false,accountAgePolicyResolved=false,
  ownWagerQualifiesVerified=false,freeSpinRulesFingerprintVerified=false
}={}){
  const stake=finite(ownWagerStakeEUR)?Number(ownWagerStakeEUR):null;
  const ownRtp=validRtp(ownWagerRtp)?Number(ownWagerRtp):null;
  const fsRtp=validRtp(freeSpinGameRtp)?Number(freeSpinGameRtp):null;
  const nominal=PLAYUZU_WELCOME_CURRENT.promotion.freeSpinNominalTurnoverEUR;
  const ownExpectedLossEUR=stake!==null&&ownRtp!==null?stake*(1-ownRtp):null;
  const worstCaseOwnWagerLossEUR=stake!==null?stake:null;
  const breakEvenFreeSpinRtpUsingOwnPublishedRtp=ownExpectedLossEUR!==null?ownExpectedLossEUR/nominal:null;
  const breakEvenFreeSpinRtpWorstCaseOwnWager=worstCaseOwnWagerLossEUR!==null?worstCaseOwnWagerLossEUR/nominal:null;
  const expectedFreeSpinReturnEUR=fsRtp!==null?nominal*fsRtp:null;
  const expectedPromoNetEUR=expectedFreeSpinReturnEUR!==null&&ownExpectedLossEUR!==null?expectedFreeSpinReturnEUR-ownExpectedLossEUR:null;
  const mathInputsExact=fsRtp!==null&&freeSpinRulesFingerprintVerified===true&&ownRtp!==null&&stake!==null;
  const positiveEvMathematicallyProven=mathInputsExact&&expectedPromoNetEUR>0;
  const executionIdentityReady=accountEligible===true&&promotionVisibleInAccount===true&&accountAgePolicyResolved===true&&ownWagerQualifiesVerified===true&&freeSpinRulesFingerprintVerified===true;
  return {
    version:'playuzu-welcome-screen-v1',
    ownWagerStakeEUR:stake,ownWagerRtp:ownRtp,ownExpectedLossEUR,
    freeSpinNominalTurnoverEUR:nominal,freeSpinGameRtp:fsRtp,expectedFreeSpinReturnEUR,expectedPromoNetEUR,
    breakEvenFreeSpinRtpUsingOwnPublishedRtp,breakEvenFreeSpinRtpWorstCaseOwnWager,
    mathInputsExact,positiveEvMathematicallyProven,executionIdentityReady,
    executable:false,realMoneyAllowed:false,
    blockers:[
      ...(accountEligible?[]:['ACCOUNT_ELIGIBILITY_UNVERIFIED']),
      ...(promotionVisibleInAccount?[]:['PROMOTION_NOT_CAPTURED_IN_ACCOUNT']),
      ...(accountAgePolicyResolved?[]:['WELCOME_VS_30_DAY_POLICY_CONFLICT_UNRESOLVED']),
      ...(ownWagerQualifiesVerified?[]:['MINIMUM_0_10_OTHER_GAME_WAGER_NOT_ACCOUNT_VERIFIED']),
      ...(fsRtp!==null?[]:['EXACT_PLAYUZU_QUEEN_RTP_UNRESOLVED']),
      ...(freeSpinRulesFingerprintVerified?[]:['FREE_SPIN_GAME_RULES_FINGERPRINT_UNRESOLVED']),
      'PROSPECTIVE_VALIDATION_MISSING','EXECUTION_CONTRACT_FAIL_CLOSED'
    ],
    guards:{
      externalRtpCannotMasqueradeAsPlayuzuConfiguration:true,
      depositIsNotTreatedAsLoss:true,
      onlyExpectedLossOfRequiredOwnMoneyWagerEntersEv:true,
      uzUplusExcludedUntilTitleSpecificReturnResolved:true,
      noHedgingOrLowRiskCoveragePatternProposed:true,
      realMoneyAllowed:false
    }
  };
}

export function playuzuExternalScenarioScreens(){
  return PLAYUZU_WELCOME_CURRENT.freeSpinConfiguration.externalSameTitleConfigurationEvidence.map(x=>{
    const s=screenPlayuzuWelcome({freeSpinGameRtp:x.rtp,freeSpinRulesFingerprintVerified:false});
    return {operator:x.operator,externalRtp:x.rtp,illustrativeExpectedPromoNetEUR:s.expectedPromoNetEUR,samePlayuzuConfigurationProven:false,executable:false};
  });
}

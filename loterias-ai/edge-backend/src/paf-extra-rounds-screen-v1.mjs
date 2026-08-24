const finite=v=>v!==null&&v!==undefined&&Number.isFinite(Number(v));
const validRtp=v=>finite(v)&&Number(v)>=0&&Number(v)<=1;

export const PAF_EXTRA_ROUNDS_CURRENT={
  operator:'Paf.es',jurisdiction:'ES',
  sourceUrl:'https://www.paf.es/bonus',
  supportSourceUrl:'https://support.paf.es/hc/es/articles/13474903788060-Informaci%C3%B3n-General',
  qualifyingTurnoverEUR:20,
  freeSpins:20,
  freeSpinStakeEUR:0.20,
  nominalFreeSpinWagerEUR:4,
  freeSpinWinningsPaidAsRealMoney:true,
  currentPublicOfferSeen:true,
  personalizedEligibility:true,
  specificQualifyingGameResolved:false,
  specificFreeSpinGameResolved:false,
  repeatabilityResolved:false,
  exactPromotionWindowResolved:false,
  exactAccountOfferTermsResolved:false,
  notes:[
    'The current Paf Spain public bonus page shows 20 Extra Rounds after playing 20 EUR, at 0.20 EUR per spin.',
    'Paf Spain support states that winnings from extra rounds/spins are paid as real money.',
    'Paf states promotions can be personalized; public indexing does not expose the exact game, account eligibility, repetition cadence or account-specific terms for this offer.',
    'No execution may be enabled until the exact offer visible to the account, qualifying game, free-spin game and validity window are captured.'
  ]
};

export function screenPafExtraRounds({
  qualifyingTurnoverEUR=PAF_EXTRA_ROUNDS_CURRENT.qualifyingTurnoverEUR,
  freeSpins=PAF_EXTRA_ROUNDS_CURRENT.freeSpins,
  freeSpinStakeEUR=PAF_EXTRA_ROUNDS_CURRENT.freeSpinStakeEUR,
  qualifyingGameRtp=null,
  freeSpinGameRtp=null,
  exactOfferTermsResolved=false,
  accountEligible=false,
  qualifyingGameResolved=false,
  freeSpinGameResolved=false,
  repeatabilityResolved=false
}={}){
  const q=Number(qualifyingTurnoverEUR),n=Number(freeSpins),s=Number(freeSpinStakeEUR);
  const freeSpinTurnoverEUR=n*s;
  const bothRtpsKnown=validRtp(qualifyingGameRtp)&&validRtp(freeSpinGameRtp);
  const expectedQualifyingLossEUR=bothRtpsKnown?q*(1-Number(qualifyingGameRtp)):null;
  const expectedFreeSpinWinningsEUR=bothRtpsKnown?freeSpinTurnoverEUR*Number(freeSpinGameRtp):null;
  const expectedPromoNetEUR=bothRtpsKnown?expectedFreeSpinWinningsEUR-expectedQualifyingLossEUR:null;
  const breakEvenQualifyingRtpGivenFreeSpinRtp=validRtp(freeSpinGameRtp)&&q>0?1-(freeSpinTurnoverEUR*Number(freeSpinGameRtp))/q:null;
  const breakEvenFreeSpinRtpGivenQualifyingRtp=validRtp(qualifyingGameRtp)&&freeSpinTurnoverEUR>0?(q*(1-Number(qualifyingGameRtp)))/freeSpinTurnoverEUR:null;
  const identityReady=exactOfferTermsResolved===true&&accountEligible===true&&qualifyingGameResolved===true&&freeSpinGameResolved===true;
  const positiveEvProven=identityReady&&bothRtpsKnown&&expectedPromoNetEUR>0;
  return {
    version:'paf-extra-rounds-screen-v1',
    qualifyingTurnoverEUR:q,freeSpins:n,freeSpinStakeEUR:s,freeSpinTurnoverEUR,
    qualifyingGameRtp:validRtp(qualifyingGameRtp)?Number(qualifyingGameRtp):null,
    freeSpinGameRtp:validRtp(freeSpinGameRtp)?Number(freeSpinGameRtp):null,
    expectedQualifyingLossEUR,expectedFreeSpinWinningsEUR,expectedPromoNetEUR,
    breakEvenQualifyingRtpGivenFreeSpinRtp,breakEvenFreeSpinRtpGivenQualifyingRtp,
    accountEligible:accountEligible===true,exactOfferTermsResolved:exactOfferTermsResolved===true,
    qualifyingGameResolved:qualifyingGameResolved===true,freeSpinGameResolved:freeSpinGameResolved===true,
    repeatabilityResolved:repeatabilityResolved===true,
    positiveEvProven,
    executable:false,
    blockers:[
      ...(accountEligible?[]:['ACCOUNT_ELIGIBILITY_NOT_VERIFIED']),
      ...(exactOfferTermsResolved?[]:['EXACT_ACCOUNT_OFFER_TERMS_NOT_CAPTURED']),
      ...(qualifyingGameResolved?[]:['QUALIFYING_GAME_NOT_RESOLVED']),
      ...(freeSpinGameResolved?[]:['FREE_SPIN_GAME_NOT_RESOLVED']),
      ...(validRtp(qualifyingGameRtp)?[]:['QUALIFYING_GAME_RTP_NOT_VERIFIED']),
      ...(validRtp(freeSpinGameRtp)?[]:['FREE_SPIN_GAME_RTP_NOT_VERIFIED']),
      ...(repeatabilityResolved?[]:['REPEATABILITY_NOT_RESOLVED']),
      'PROSPECTIVE_EXECUTION_VALIDATION_MISSING'
    ],
    guards:{
      nominalFreeSpinValueIsNotCashValue:true,
      realMoneyWinningsStillRequireGameRtp:true,
      publicGenericPromoCannotStandInForAccountSpecificTerms:true,
      positiveIllustrativeScenarioCannotPromoteExecution:true,
      realMoneyAllowed:false
    }
  };
}

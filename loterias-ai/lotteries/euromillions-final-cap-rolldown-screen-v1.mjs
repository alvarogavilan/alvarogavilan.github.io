const VERSION='euromillions-final-cap-rolldown-screen-v1';
const OFFICIAL=Object.freeze({
  capEUR:250_000_000,
  euroMillionsBasePriceEUR:2.20,
  spanishTotalEntryCostEUR:2.50,
  conservativeFullPotTaxHaircut:0.20,
});

const finite=v=>typeof v==='number'&&Number.isFinite(v)?v:null;
const execution=()=>({decision:'NO_PLAY',realMoneyAllowed:false,ticketCount:0,maxTotalStakeEUR:0});

/**
 * Research-only screen for the EuroMillions fifth-draw cap roll-down.
 *
 * IMPORTANT: this module deliberately never authorizes execution.  The
 * aggregate pot/N benchmark is not an individual-ticket lower bound because
 * selected-number crowding can change prize sharing.  A caller must supply an
 * independently reviewed lower-bound share factor before even the research
 * screen can become positive.
 */
export function screenEuroMillionsFinalCapRolldown({
  exactFifthCapDrawVerified=false,
  exact250mCapVerified=false,
  prospectiveEuropeanBaseRevenueUpperBoundVerified=false,
  europeanBaseRevenueUpperBoundEUR=null,
  individualTicketShareFactorLowerBoundVerified=false,
  individualTicketShareFactorLowerBound=null,
  taxModelReviewed=false,
}={}){
  const revenue=finite(europeanBaseRevenueUpperBoundEUR);
  const share=finite(individualTicketShareFactorLowerBound);
  const gates={
    exactFifthCapDrawVerified:exactFifthCapDrawVerified===true,
    exact250mCapVerified:exact250mCapVerified===true,
    prospectiveEuropeanBaseRevenueUpperBoundVerified:prospectiveEuropeanBaseRevenueUpperBoundVerified===true&&revenue!==null&&revenue>0,
    individualTicketShareFactorLowerBoundVerified:individualTicketShareFactorLowerBoundVerified===true&&share!==null&&share>0&&share<=1,
    taxModelReviewed:taxModelReviewed===true,
  };
  const aggregateBreakEvenEuropeanBaseRevenueEUR=(1-OFFICIAL.conservativeFullPotTaxHaircut)*OFFICIAL.capEUR/OFFICIAL.spanishTotalEntryCostEUR*OFFICIAL.euroMillionsBasePriceEUR;
  const validatedEntriesUpperBound=gates.prospectiveEuropeanBaseRevenueUpperBoundVerified?revenue/OFFICIAL.euroMillionsBasePriceEUR:null;
  const aggregateAverageNetCapPotReturnPerEntryEUR=validatedEntriesUpperBound?((1-OFFICIAL.conservativeFullPotTaxHaircut)*OFFICIAL.capEUR)/validatedEntriesUpperBound:null;
  const individualNetCapPotReturnLowerBoundEUR=(aggregateAverageNetCapPotReturnPerEntryEUR!==null&&gates.individualTicketShareFactorLowerBoundVerified)?aggregateAverageNetCapPotReturnPerEntryEUR*share:null;
  const individualPotOnlyEdgeLowerBoundEUR=individualNetCapPotReturnLowerBoundEUR===null?null:individualNetCapPotReturnLowerBoundEUR-OFFICIAL.spanishTotalEntryCostEUR;
  const allResearchGates=Object.values(gates).every(Boolean);
  const researchPositive=allResearchGates&&individualPotOnlyEdgeLowerBoundEUR!==null&&individualPotOnlyEdgeLowerBoundEUR>0;
  const blockers=[];
  if(!gates.exactFifthCapDrawVerified)blockers.push('EXACT_FIFTH_CAP_DRAW_NOT_VERIFIED');
  if(!gates.exact250mCapVerified)blockers.push('EXACT_250M_CAP_NOT_VERIFIED');
  if(!gates.prospectiveEuropeanBaseRevenueUpperBoundVerified)blockers.push('PROSPECTIVE_EUROPEAN_BASE_REVENUE_UPPER_BOUND_NOT_VERIFIED');
  if(!gates.individualTicketShareFactorLowerBoundVerified)blockers.push('INDIVIDUAL_TICKET_SHARE_DILUTION_LOWER_BOUND_NOT_VERIFIED');
  if(!gates.taxModelReviewed)blockers.push('TAX_MODEL_NOT_REVIEWED');
  if(allResearchGates&&!researchPositive)blockers.push('POT_ONLY_INDIVIDUAL_EV_LOWER_BOUND_NOT_POSITIVE');
  blockers.push('SEPARATE_FINAL_EXECUTION_REVIEW_REQUIRED');
  return {
    version:VERSION,
    mode:'RESEARCH_ONLY_FAIL_CLOSED',
    officialConstants:OFFICIAL,
    gates,
    inputs:{
      europeanBaseRevenueUpperBoundEUR:revenue,
      individualTicketShareFactorLowerBound:share,
    },
    economics:{
      aggregateBreakEvenEuropeanBaseRevenueEUR,
      validatedEntriesUpperBound,
      aggregateAverageNetCapPotReturnPerEntryEUR,
      individualNetCapPotReturnLowerBoundEUR,
      individualPotOnlyEdgeLowerBoundEUR,
      ordinaryEuroMillionsPrizeEvIncluded:false,
      elMillonEvIncluded:false,
      taxExemptTranchesCredited:false,
    },
    researchPositive,
    usableForExecution:false,
    blockers,
    execution:execution(),
    hardGuards:{
      fifthCapDrawRequired:true,
      cap250mRequired:true,
      aggregateAverageCannotBecomeIndividualLowerBound:true,
      shareDilutionBoundRequired:true,
      prospectiveRevenueUpperBoundRequired:true,
      historicalSalesCannotAuthorizeFuturePlay:true,
      ordinaryPrizeEvCannotBeInvented:true,
      numberPatternsCannotIncreaseDrawProbability:true,
      noFutureInformation:true,
      realMoneyAllowed:false,
    },
  };
}

export function getEuroMillionsFinalCapOfficialConstants(){return OFFICIAL;}

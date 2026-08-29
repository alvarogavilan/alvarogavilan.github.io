const VERSION='ap-media-operational-bridge-v1';
const MASTER_INDEX='loterias-ai/knowledge/edge-ap-knowledge-index-2026-08-29-v1.json';
const VIDEO_KB='loterias-ai/knowledge/ap-video-knowledge-base-2026-08-29-v1.json';
const MEDIA_KB='loterias-ai/edge-live/evidence/media-knowledge-base-2026-08-29-v1.json';
const MINOTAUR_EVIDENCE='loterias-ai/edge-live/evidence/spain-ancient-fortunes-minotaur-rising-mhb-2026-08-29-v1.json';
const EUROMILLIONS_EVIDENCE='loterias-ai/edge-live/evidence/euromillions-final-cap-rolldown-2026-08-29-v1.json';
const EUROMILLIONS_SCREEN='loterias-ai/lotteries/euromillions-final-cap-rolldown-screen-v1.mjs';
const b=v=>v===true;
const execution=()=>({decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0});

export function getAbsorbedMediaOperationalIndex(){
  return Object.freeze({
    version:VERSION,
    masterIndex:MASTER_INDEX,
    sources:Object.freeze({videoKnowledge:VIDEO_KB,gradedMediaKnowledge:MEDIA_KB}),
    targets:Object.freeze({
      ENRACHA_OCEAN_MAGIC:Object.freeze({mechanic:'VISIBLE_PERSISTENT_WILD_BUBBLE_STATE',mediaCanSetSpanishState:false,requiredExactDeploymentEvidence:true}),
      SPAIN_MINOTAUR_RISING_MHB:Object.freeze({mechanic:'FIVE_RISING_REWARDS_MUST_HIT_BY_METERS',evidence:MINOTAUR_EVIDENCE,mediaCanSetSpanishBoundaries:false,requiredExactOperatorBuildEvidence:true}),
      EUROMILLIONS_FINAL_CAP_ROLLDOWN:Object.freeze({mechanic:'FIFTH_CAP_FORCED_PRIZE_REDISTRIBUTION',evidence:EUROMILLIONS_EVIDENCE,screen:EUROMILLIONS_SCREEN,currentOpportunity:false,numberPredictionRelevant:false})
    }),
    hardGuards:Object.freeze({mediaIsDiscoveryAndMechanicEvidenceOnly:true,creatorThresholdCannotAuthorizeExecution:true,crossOperatorTransferForbidden:true,currentSpanishServedStateOverridesForeignOrHistoricalEvidence:true,conditionalFutureLotteryOverlayIsNotCurrentSignal:true,noAutomaticBetting:true,realMoneyAllowed:false}),
    execution:execution()
  });
}

export function evaluateMinotaurRisingResearch(input={}){
  const triggerCostModelVerified=b(input.exactTriggerDistributionVerified)||b(input.conservativeWorstCaseCostBoundVerified);
  const gates={
    exactSpanishOperatorBuildVerified:b(input.exactSpanishOperatorBuildVerified),
    exactFiveMhbBoundariesVerified:b(input.exactFiveMhbBoundariesVerified),
    currentFiveMetersPreWagerVerified:b(input.currentFiveMetersPreWagerVerified),
    qualifyingStakeVerified:b(input.qualifyingStakeVerified),
    baseRtpJackpotAccountingVerified:b(input.baseRtpJackpotAccountingVerified),
    triggerCostModelVerified
  };
  const missing=Object.entries(gates).filter(([,v])=>!v).map(([k])=>k);
  return {
    version:VERSION,
    family:'SPAIN_MINOTAUR_RISING_MHB',
    admittedForExactEvResearch:missing.length===0,
    gates,
    missing,
    warnings:[
      ...(input.otherMarketBoundariesUsed===true?['OTHER_MARKET_MHB_BOUNDARIES_CANNOT_POPULATE_SPAIN']:[]),
      ...(input.meterClosenessUsedAsPositiveEvProof===true?['METER_CLOSENESS_ALONE_IS_NOT_POSITIVE_EV']:[]),
      ...(input.uniformTriggerAssumed===true&&!b(input.exactTriggerDistributionVerified)?['UNIFORM_TRIGGER_CANNOT_BE_ASSUMED']:[])
    ],
    execution:execution(),
    hardGuards:{mediaCannotSetGateTrue:true,exactSpanishOperatorBuildRequired:true,exactTriggerDistributionOrConservativeWorstCaseCostBoundRequired:true,realMoneyAllowed:false}
  };
}

export function evaluateEuroMillionsFinalCapResearch(input={}){
  const gates={
    exactFifthConsecutiveCapDrawVerified:b(input.exactFifthConsecutiveCapDrawVerified),
    capExactly250mVerified:b(input.capExactly250mVerified),
    prospectiveEuropeanBaseRevenueUpperBoundVerified:b(input.prospectiveEuropeanBaseRevenueUpperBoundVerified),
    individualTicketShareDilutionLowerBoundVerified:b(input.individualTicketShareDilutionLowerBoundVerified),
    numberSelectionPolicyFrozenPrePurchase:b(input.numberSelectionPolicyFrozenPrePurchase),
    taxModelReviewed:b(input.taxModelReviewed),
    finalPerEntryNetEvLowerBoundPositive:b(input.finalPerEntryNetEvLowerBoundPositive)
  };
  const missing=Object.entries(gates).filter(([,v])=>!v).map(([k])=>k);
  return {
    version:VERSION,
    family:'EUROMILLIONS_FINAL_CAP_ROLLDOWN',
    currentOpportunity:b(input.currentOpportunity)&&gates.exactFifthConsecutiveCapDrawVerified&&gates.capExactly250mVerified,
    researchReviewComplete:missing.length===0,
    missing,
    numberPatternPredictionRelevant:false,
    historicalSalesCanAuthorizeFutureTicket:false,
    execution:execution(),
    hardGuards:{fifthCapStateRequired:true,prospectiveSalesBoundRequired:true,shareDilutionBoundRequired:true,noFutureInformation:true,noHotColdNumbers:true,realMoneyAllowed:false}
  };
}

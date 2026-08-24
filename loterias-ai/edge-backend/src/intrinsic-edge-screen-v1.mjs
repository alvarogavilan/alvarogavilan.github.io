const finite=v=>v!==null&&v!==undefined&&Number.isFinite(Number(v));

export const INTRINSIC_EDGE_CURRENT={
  version:'intrinsic-edge-current-v1',
  evidenceAsOf:'2026-08-24',
  jurisdiction:'ES',
  policy:{promotionsExcluded:true,bonusesFromOperatorMarketingExcluded:true,onlyIntrinsicGameOrMachineState:true,realMoneyAllowed:false},
  goldenWheels:{
    id:'rfranco-golden-wheels',
    manufacturer:'R. Franco',
    machineClass:'B',
    currentProduct:true,
    nationwideHomologationReported:true,
    sourceProductUrl:'https://www.rfranco.com/maquinas-hosteleria/golden-wheels/',
    sourceManualUrl:'https://www.rfranco.com/wp-content/uploads/Manual_GoldenWheels.pdf',
    sourceNationwideUrl:'https://sectordeljuego.com/2024/03/12/golden-wheels-salon-de-r-franco-homologada-en-todas-las-comunidades-autonomas/',
    visibleBonusCounterVerified:true,
    bonusCounterSeparateFromReserveAwardsCredits:true,
    manualExampleBonusCounts:[7,8,12,21,33],
    maximumBonusCounter:200,
    upperGameRequiresPositiveBonusCountAndCredits:true,
    upperGameConsumesCreditsAndBonuses:true,
    upperGameHasEightPaylines:true,
    cashButtonExplicitlyRetrievesBankThenReserve:true,
    cashButtonExplicitlyClearsBonusCounter:false,
    bonusPersistenceAcrossCashoutVerified:false,
    bonusPersistenceAcrossPlayerChangeVerified:false,
    exactBonusCostPerUpperPlayResolved:false,
    exactConditionalUpperGameEvResolved:false,
    exactEntryThresholdBonuses:null,
    positiveEvProven:false,
    executable:false,
    realMoneyAllowed:false
  },
  spanishCompensationArchitectureControl:{
    id:'ready2b-awp-spain-control',
    exactGoldenWheelsArchitectureProven:false,
    spanishAwpCentralCompensationArchitecturePubliclyDocumented:true,
    finiteCycleCompensationMechanicsExistInSpain:true,
    canTransferMechanicsToGoldenWheels:false,
    role:'CONTROL_ONLY_NOT_GAME_IDENTITY'
  },
  ultimateXControl:{
    id:'igt-ultimate-x',
    jurisdictionOfKnownMechanic:'GLOBAL_CONTROL',
    persistentNextHandMultipliersVerified:true,
    abandonedMultiplierAdvantagePlayKnown:true,
    spainIgtVideoPokerHardwarePresenceKnown:true,
    exactUltimateXRealMoneySpainFloorResolved:false,
    operationalSpainCandidate:false,
    realMoneyAllowed:false
  },
  jackpotKingSpain:{
    id:'botemania-jackpot-king',
    exactRoyalMbwbEUR:4078.97,
    exactRegalMbwbEUR:40789.77,
    monotonePotHazardDirectionVerified:true,
    exactHazardFunctionVerified:false,
    cleanResetHazardFitReady:false,
    positiveEvProven:false,
    realMoneyAllowed:false
  }
};

export function screenGoldenWheelsState({bonusCount=null,persistenceVerified=false,conditionalUpperGameEvPerCashEUR=null}={}){
  const b=finite(bonusCount)&&Number(bonusCount)>=0?Number(bonusCount):null;
  const ev=finite(conditionalUpperGameEvPerCashEUR)?Number(conditionalUpperGameEvPerCashEUR):null;
  const stateObserved=b!==null;
  const exactStateValueReady=persistenceVerified===true&&ev!==null;
  return {
    version:'golden-wheels-state-screen-v1',
    bonusCount:b,
    stateObserved,
    persistenceVerified:persistenceVerified===true,
    conditionalUpperGameEvPerCashEUR:ev,
    exactStateValueReady,
    positiveEvProven:exactStateValueReady&&ev>1,
    entryThresholdResolved:false,
    executable:false,
    realMoneyAllowed:false,
    blockers:[
      ...(stateObserved?[]:['VISIBLE_BONUS_COUNT_NOT_CAPTURED']),
      ...(persistenceVerified?[]:['BONUS_PERSISTENCE_ACROSS_CASHOUT_AND_PLAYER_CHANGE_UNVERIFIED']),
      ...(ev!==null?[]:['EXACT_CONDITIONAL_UPPER_GAME_EV_UNRESOLVED']),
      'CURRENT_MACHINE_RULES_FINGERPRINT_REQUIRED',
      'PROSPECTIVE_FIELD_VALIDATION_REQUIRED',
      'EXECUTION_CONTRACT_FAIL_CLOSED'
    ],
    guards:{
      visibleBonusCounterDoesNotByItselfProvePositiveEv:true,
      absenceOfDocumentedCashoutResetDoesNotProvePersistence:true,
      compensationArchitectureControlCannotTransferToGoldenWheels:true,
      noPromotionValueIncluded:true,
      realMoneyAllowed:false
    }
  };
}

export function intrinsicEdgeRanking(){
  const g=INTRINSIC_EDGE_CURRENT.goldenWheels;
  return [
    {rank:1,id:g.id,status:'TWO_GATES_FROM_EXECUTABLE_STATE_THRESHOLD',why:'Current Spain-wide machine with verified visible consumable bonus state; persistence and conditional state EV are the remaining decisive gates.',positiveEvProven:false},
    {rank:2,id:'botemania-jackpot-king',status:'HAZARD_FIT_REQUIRED',why:'Exact Spanish MBWB and live shared meters exist, but no shape-free positive EV proof is possible below cap without hazard magnitude.',positiveEvProven:false},
    {rank:3,id:'igt-ultimate-x',status:'EXACT_SPAIN_FLOOR_GAME_IDENTITY_REQUIRED',why:'Worldwide persistent-state advantage is mathematically established; exact real-money Spanish installation remains unresolved.',positiveEvProven:false}
  ].map(x=>({...x,realMoneyAllowed:false}));
}

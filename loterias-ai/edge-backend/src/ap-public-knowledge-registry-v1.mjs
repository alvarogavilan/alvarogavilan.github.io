const VERSION='ap-public-knowledge-registry-v1.2-initial-state';
const KNOWLEDGE_BASE='loterias-ai/knowledge/ap-video-knowledge-base-2026-08-29-v1.json';
const INITIAL_STATE_KNOWLEDGE='loterias-ai/knowledge/online-persistent-initial-state-advantage-2026-08-29-v1.json';
const execution=()=>({decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0});
const b=v=>v===true;

export function getApPublicKnowledgeRegistry(){
  return Object.freeze({
    version:VERSION,
    knowledgeBase:KNOWLEDGE_BASE,
    initialStateKnowledge:INITIAL_STATE_KNOWLEDGE,
    categories:Object.freeze({
      OCEAN_MAGIC_VARIABLE_STATE:Object.freeze({requiredObservedFields:Object.freeze(['exactIgtProviderFingerprintVerified','persistentRuleVerified','preWagerStateVisible','crossPlayerPersistenceVerified','stateSpecificEvVerified']),videoOrForeignEvidenceCanSetSpanishExecutionState:false}),
      ONLINE_PERSISTENT_INITIAL_STATE:Object.freeze({requiredObservedFields:Object.freeze(['exactServedConfigurationVerified','preWagerInitialStateVerified','initialStateScopeVerified','exactTheoreticalRtpVerified','stateSpecificEvVerified','repeatabilityVerified']),crossPlayerInheritanceRequired:false,multiAccountCyclingAllowed:false,identityBorrowingAllowed:false}),
      REGAL_RICHES_PERSISTENT_MHB:Object.freeze({exactSpanishTarget:Object.freeze({operator:'Betfair Spain',gameId:'regal-riches-aig'}),familyRuleCandidates:Object.freeze({purpleMinorMustHitBy:75,greenMajorMustHitBy:100,yellowMegaMustHitBy:125}),familyRuleCandidatesRequireExactServedConfirmation:true,creatorEntryThresholdsAreExecutionAuthority:false,requiredObservedFields:Object.freeze(['exactIgtProviderFingerprintVerified','exactServedRulesFingerprintVerified','persistentMeterRuleVerified','preWagerMeterStateVisible','reloadPersistenceVerified','crossPlayerPersistenceVerified','exactTheoreticalRtpVerified','exactStakeConfigurationVerified','stateSpecificEvVerified'])}),
      TRUE_MUST_HIT_BY:Object.freeze({requiredObservedFields:Object.freeze(['explicitMustHitByRuleVerified','exactBoundaryVerified','currentMeterVerified','qualifyingStakeVerified','exactServedConfigurationVerified','baseCostModelVerified']),ordinaryProgressiveClosenessIsSufficient:false,maxBetAssumedRequired:false}),
      LOTTERY_RULE_OVERLAY:Object.freeze({searchTargets:Object.freeze(['ROLLDOWN_OR_FORCED_REDISTRIBUTION','GUARANTEED_POOL_OVERLAY','CARRYDOWN_RULE','TICKET_VOLUME_PAYOUT_DISCONTINUITY','RULE_CHANGE_ALTERING_EXPECTED_PRIZE_PER_TICKET']),numberPatternPredictionIsTarget:false})
    }),
    hardGuards:Object.freeze({youtubeIsDiscoveryNotExecutionAuthority:true,physicalOrForeignStateCannotPopulateSpanishOnlineState:true,crossOperatorTransferForbidden:true,creatorThresholdCannotSelfAuthorize:true,multiAccountCyclingForbidden:true,identityBorrowingForbidden:true,noAutomaticBetting:true,realMoneyAllowed:false}),
    execution:execution()
  });
}

export function evaluateMustHitByCandidate(input={}){
  const gates={explicitMustHitByRuleVerified:b(input.explicitMustHitByRuleVerified),exactBoundaryVerified:b(input.exactBoundaryVerified),currentMeterVerified:b(input.currentMeterVerified),qualifyingStakeVerified:b(input.qualifyingStakeVerified),exactServedConfigurationVerified:b(input.exactServedConfigurationVerified),baseCostModelVerified:b(input.baseCostModelVerified)};
  const missing=Object.entries(gates).filter(([,v])=>!v).map(([k])=>k);
  return {version:VERSION,family:'TRUE_MUST_HIT_BY',admittedForExactEvResearch:missing.length===0,missing,warnings:[...(input.progressiveNearAdvertisedMaximum===true&&!gates.explicitMustHitByRuleVerified?['NEAR_MAXIMUM_IS_NOT_MHB_EVIDENCE']:[]),...(input.maxBetAssumedRequired===true&&!b(input.qualifyingStakeVerified)?['MAX_BET_CANNOT_BE_ASSUMED_TO_QUALIFY']:[])],execution:execution(),hardGuards:{candidateAdmissionCannotAuthorizeExecution:true,realMoneyAllowed:false}};
}

export function evaluateOceanMagicDeployment(input={}){
  const gates={exactIgtProviderFingerprintVerified:b(input.exactIgtProviderFingerprintVerified),persistentRuleVerified:b(input.persistentRuleVerified),preWagerStateVisible:b(input.preWagerStateVisible),crossPlayerPersistenceVerified:b(input.crossPlayerPersistenceVerified),stateSpecificEvVerified:b(input.stateSpecificEvVerified)};
  const firstMissing=Object.entries(gates).find(([,v])=>!v)?.[0]||null;
  const researchStage=firstMissing===null?'STATE_SPECIFIC_EV_RESEARCH_COMPLETE_REVIEW_REQUIRED':firstMissing==='exactIgtProviderFingerprintVerified'?'PROVIDER_IDENTITY_REQUIRED':firstMissing==='persistentRuleVerified'?'EXACT_PERSISTENCE_RULE_REQUIRED':firstMissing==='preWagerStateVisible'?'PRE_WAGER_STATE_VISIBILITY_REQUIRED':firstMissing==='crossPlayerPersistenceVerified'?'EXACT_DEPLOYMENT_INHERITANCE_REQUIRED':'STATE_SPECIFIC_EV_REQUIRED';
  return {version:VERSION,family:'OCEAN_MAGIC_VARIABLE_STATE',researchStage,gates,allMechanicAndEvGatesObserved:firstMissing===null,currentObservationCanUsePhysicalOrForeignVideoAsSpanishState:false,execution:execution(),hardGuards:{exactSpanishDeploymentRequired:true,videoCannotSetGateTrue:true,realMoneyAllowed:false}};
}

export function evaluateOnlineInitialStateCandidate(input={}){
  const gates={exactServedConfigurationVerified:b(input.exactServedConfigurationVerified),preWagerInitialStateVerified:b(input.preWagerInitialStateVerified),initialStateScopeVerified:b(input.initialStateScopeVerified),exactTheoreticalRtpVerified:b(input.exactTheoreticalRtpVerified),stateSpecificEvVerified:b(input.stateSpecificEvVerified),repeatabilityVerified:b(input.repeatabilityVerified)};
  const missing=Object.entries(gates).filter(([,v])=>!v).map(([k])=>k);
  return {version:VERSION,family:'ONLINE_PERSISTENT_INITIAL_STATE',gates,missing,admittedForExactEvResearch:missing.length===0,doesNotRequireCrossPlayerInheritance:true,warnings:[...(input.multiAccountCyclingProposed===true?['MULTI_ACCOUNT_CYCLING_FORBIDDEN']:[]),...(input.identityBorrowingProposed===true?['IDENTITY_BORROWING_FORBIDDEN']:[]),...(input.historicalOceanMagicEdgeTransferred===true?['HISTORICAL_OCEAN_MAGIC_EDGE_CANNOT_TRANSFER']:[])],execution:execution(),hardGuards:{singleLegitimateAccountResearchOnly:true,nonPromoOnly:true,noWagerProbeUntilStateEvReviewed:true,realMoneyAllowed:false}};
}

export function evaluateRegalRichesDeployment(input={}){
  const gates={exactBetfairSpainGameIdVerified:input.gameId==='regal-riches-aig',exactIgtProviderFingerprintVerified:b(input.exactIgtProviderFingerprintVerified),exactServedRulesFingerprintVerified:b(input.exactServedRulesFingerprintVerified),persistentMeterRuleVerified:b(input.persistentMeterRuleVerified),preWagerMeterStateVisible:b(input.preWagerMeterStateVisible),reloadPersistenceVerified:b(input.reloadPersistenceVerified),crossPlayerPersistenceVerified:b(input.crossPlayerPersistenceVerified),exactTheoreticalRtpVerified:b(input.exactTheoreticalRtpVerified),exactStakeConfigurationVerified:b(input.exactStakeConfigurationVerified),stateSpecificEvVerified:b(input.stateSpecificEvVerified)};
  const missing=Object.entries(gates).filter(([,v])=>!v).map(([k])=>k);
  const familyRuleCandidates={purpleMinorMustHitBy:75,greenMajorMustHitBy:100,yellowMegaMustHitBy:125};
  const servedBoundaries=input.servedBoundaries&&typeof input.servedBoundaries==='object'?input.servedBoundaries:{};
  const exactBoundariesVerified=b(input.exactServedRulesFingerprintVerified)&&Number(servedBoundaries.purpleMinorMustHitBy)===75&&Number(servedBoundaries.greenMajorMustHitBy)===100&&Number(servedBoundaries.yellowMegaMustHitBy)===125;
  return {version:VERSION,family:'REGAL_RICHES_PERSISTENT_MHB',target:{operator:'Betfair Spain',gameId:'regal-riches-aig'},gates,missing,familyRuleCandidates,exactBoundariesVerified,admittedForStateSpecificEvResearch:missing.length===0&&exactBoundariesVerified,creatorEntryThresholdsAcceptedForExecution:false,warnings:[...(input.creatorSuggestedEntryThresholdUsed===true?['CREATOR_ENTRY_THRESHOLD_IS_DISCOVERY_ONLY']:[]),...(input.otherMarketRtpUsed===true?['OTHER_MARKET_RTP_CANNOT_POPULATE_BETFAIR_SPAIN_RTP']:[]),...(input.reloadPersistenceVerified===true&&!input.crossPlayerPersistenceVerified?['RELOAD_DOES_NOT_PROVE_CROSS_PLAYER_INHERITANCE']:[])],execution:execution(),hardGuards:{familyBoundaryCannotSelfApprove:true,videoCannotSetSpanishState:true,crossPlayerInheritanceRequiredForAbandonedStateModel:true,positiveInitialStateModelMustBeEvaluatedSeparately:true,stateSpecificEvRequired:true,realMoneyAllowed:false}};
}

export function getLotteryRuleOverlaySearchTargets(){
  return {version:VERSION,family:'LOTTERY_RULE_OVERLAY',targets:['ROLLDOWN_OR_FORCED_REDISTRIBUTION','GUARANTEED_POOL_OVERLAY','CARRYDOWN_RULE','TICKET_VOLUME_PAYOUT_DISCONTINUITY','RULE_CHANGE_ALTERING_EXPECTED_PRIZE_PER_TICKET'],forbiddenTargets:['PAST_DRAW_NUMBER_PATTERN','HOT_NUMBER','COLD_NUMBER','FUTURE_INFORMATION'],execution:execution()};
}

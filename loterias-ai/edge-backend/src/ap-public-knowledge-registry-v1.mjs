const VERSION='ap-public-knowledge-registry-v1';
const KNOWLEDGE_BASE='loterias-ai/knowledge/ap-video-knowledge-base-2026-08-29-v1.json';
const execution=()=>({decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0});
const b=v=>v===true;

export function getApPublicKnowledgeRegistry(){
  return Object.freeze({
    version:VERSION,
    knowledgeBase:KNOWLEDGE_BASE,
    categories:Object.freeze({
      OCEAN_MAGIC_VARIABLE_STATE:Object.freeze({
        requiredObservedFields:Object.freeze([
          'exactIgtProviderFingerprintVerified',
          'persistentRuleVerified',
          'preWagerStateVisible',
          'crossPlayerPersistenceVerified',
          'stateSpecificEvVerified'
        ]),
        videoOrForeignEvidenceCanSetSpanishExecutionState:false
      }),
      TRUE_MUST_HIT_BY:Object.freeze({
        requiredObservedFields:Object.freeze([
          'explicitMustHitByRuleVerified',
          'exactBoundaryVerified',
          'currentMeterVerified',
          'qualifyingStakeVerified',
          'exactServedConfigurationVerified',
          'baseCostModelVerified'
        ]),
        ordinaryProgressiveClosenessIsSufficient:false,
        maxBetAssumedRequired:false
      }),
      LOTTERY_RULE_OVERLAY:Object.freeze({
        searchTargets:Object.freeze([
          'ROLLDOWN_OR_FORCED_REDISTRIBUTION',
          'GUARANTEED_POOL_OVERLAY',
          'CARRYDOWN_RULE',
          'TICKET_VOLUME_PAYOUT_DISCONTINUITY',
          'RULE_CHANGE_ALTERING_EXPECTED_PRIZE_PER_TICKET'
        ]),
        numberPatternPredictionIsTarget:false
      })
    }),
    hardGuards:Object.freeze({
      youtubeIsDiscoveryNotExecutionAuthority:true,
      physicalOrForeignStateCannotPopulateSpanishOnlineState:true,
      crossOperatorTransferForbidden:true,
      creatorThresholdCannotSelfAuthorize:true,
      noAutomaticBetting:true,
      realMoneyAllowed:false
    }),
    execution:execution()
  });
}

export function evaluateMustHitByCandidate(input={}){
  const gates={
    explicitMustHitByRuleVerified:b(input.explicitMustHitByRuleVerified),
    exactBoundaryVerified:b(input.exactBoundaryVerified),
    currentMeterVerified:b(input.currentMeterVerified),
    qualifyingStakeVerified:b(input.qualifyingStakeVerified),
    exactServedConfigurationVerified:b(input.exactServedConfigurationVerified),
    baseCostModelVerified:b(input.baseCostModelVerified)
  };
  const missing=Object.entries(gates).filter(([,v])=>!v).map(([k])=>k);
  return {
    version:VERSION,
    family:'TRUE_MUST_HIT_BY',
    admittedForExactEvResearch:missing.length===0,
    missing,
    warnings:[
      ...(input.progressiveNearAdvertisedMaximum===true&&!gates.explicitMustHitByRuleVerified?['NEAR_MAXIMUM_IS_NOT_MHB_EVIDENCE']:[]),
      ...(input.maxBetAssumedRequired===true&&!b(input.qualifyingStakeVerified)?['MAX_BET_CANNOT_BE_ASSUMED_TO_QUALIFY']:[])
    ],
    execution:execution(),
    hardGuards:{candidateAdmissionCannotAuthorizeExecution:true,realMoneyAllowed:false}
  };
}

export function evaluateOceanMagicDeployment(input={}){
  const gates={
    exactIgtProviderFingerprintVerified:b(input.exactIgtProviderFingerprintVerified),
    persistentRuleVerified:b(input.persistentRuleVerified),
    preWagerStateVisible:b(input.preWagerStateVisible),
    crossPlayerPersistenceVerified:b(input.crossPlayerPersistenceVerified),
    stateSpecificEvVerified:b(input.stateSpecificEvVerified)
  };
  const ordered=Object.entries(gates);
  const firstMissing=ordered.find(([,v])=>!v)?.[0]||null;
  const researchStage= firstMissing===null?'STATE_SPECIFIC_EV_RESEARCH_COMPLETE_REVIEW_REQUIRED':
    firstMissing==='exactIgtProviderFingerprintVerified'?'PROVIDER_IDENTITY_REQUIRED':
    firstMissing==='persistentRuleVerified'?'EXACT_PERSISTENCE_RULE_REQUIRED':
    firstMissing==='preWagerStateVisible'?'PRE_WAGER_STATE_VISIBILITY_REQUIRED':
    firstMissing==='crossPlayerPersistenceVerified'?'EXACT_DEPLOYMENT_INHERITANCE_REQUIRED':
    'STATE_SPECIFIC_EV_REQUIRED';
  return {
    version:VERSION,
    family:'OCEAN_MAGIC_VARIABLE_STATE',
    researchStage,
    gates,
    allMechanicAndEvGatesObserved:firstMissing===null,
    currentObservationCanUsePhysicalOrForeignVideoAsSpanishState:false,
    execution:execution(),
    hardGuards:{exactSpanishDeploymentRequired:true,videoCannotSetGateTrue:true,realMoneyAllowed:false}
  };
}

export function getLotteryRuleOverlaySearchTargets(){
  return {
    version:VERSION,
    family:'LOTTERY_RULE_OVERLAY',
    targets:[
      'ROLLDOWN_OR_FORCED_REDISTRIBUTION',
      'GUARANTEED_POOL_OVERLAY',
      'CARRYDOWN_RULE',
      'TICKET_VOLUME_PAYOUT_DISCONTINUITY',
      'RULE_CHANGE_ALTERING_EXPECTED_PRIZE_PER_TICKET'
    ],
    forbiddenTargets:['PAST_DRAW_NUMBER_PATTERN','HOT_NUMBER','COLD_NUMBER','FUTURE_INFORMATION'],
    execution:execution()
  };
}

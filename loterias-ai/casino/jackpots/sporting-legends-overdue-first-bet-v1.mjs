const finite=(v)=>{if(v===null||v===undefined||v===''||typeof v==='boolean')return null;const n=Number(v);return Number.isFinite(n)?n:null;};
const text=(v)=>typeof v==='string'&&v.trim()?v.trim():null;
const upper=(v)=>text(v)?.toUpperCase()??null;
const lower=(v)=>text(v)?.toLowerCase()??null;
const MIN_EXECUTION_RACE_CONFIDENCE=0.95;
const MAX_UNVERIFIED_EXECUTION_BASE_RTP_PCT=93.03;
const RACE_EVIDENCE_VERSION='sporting-legends-empirical-race-bound-v1.2-explicit-binomial-assumptions';
const RACE_EVIDENCE_METHOD='ONE_SIDED_CLOPPER_PEARSON_BINOMIAL';
const RACE_EVIDENCE_SOURCE='VALIDATED_PASSIVE_CYCLE_LEDGER';
const SHA40=/^[a-f0-9]{40}$/i;
// Deliberately empty until a real prospective race-ledger artifact has been
// independently reviewed in a later commit. Caller-supplied objects cannot add
// themselves to this allowlist, so synthetic test data cannot authorize money.
const APPROVED_PROSPECTIVE_RACE_LEDGER_REVIEW_COMMITS=new Set();

function sameBinding(a,b){
  if(!a||!b)return false;
  const fields=['code','requestCasino','instanceCode'];
  for(const f of fields){
    if(text(a[f])!==text(b[f]))return false;
  }
  return a.local===b.local&&upper(a.currency)===upper(b.currency);
}
function exactOrderedTextList(a,b){
  if(!Array.isArray(a)||!Array.isArray(b)||a.length!==b.length)return false;
  for(let i=0;i<a.length;i++)if(text(a[i])!==text(b[i]))return false;
  return true;
}

export function evaluateSportingLegendsOverdueFirstBet({
  before,
  after,
  nowEpochSeconds=Math.floor(Date.now()/1000),
  exactBetfairSpainTickerImsBindingVerified=false,
  expectedBetfairImsCasino=null,
  betfairFirstBetFollowingDayRuleVerified=false,
  providerGuaranteedHitTimeDefinesFollowingDayBoundaryVerified=false,
  conservativeBaseRtpPct=93.03,
  stakeEUR=null,
  firstBetProbabilityLowerBound=null,
  raceModelProspectivelyValidated=false,
  raceProbabilityProspectivelyValidated=false,
  raceEvidence=null,
  currentDailyAmountExactVerified=false,
  stakeAtDecisionExactVerified=false,
  measuredActionLatencyVerified=false,
  measuredActionLatencySeconds=null,
  prospectiveDryRunCycleVerified=false,
  maxBoundaryDistanceIntervals=2,
  maxFeedAgeIntervals=2,
}={}){
  const guards={
    researchOnly:true,
    noAutomaticWagering:true,
    noWagerProbe:true,
    exactBetfairSpainBindingRequired:true,
    publishedRuleMeansFollowingDayNotArbitraryPostDeadline:true,
    followingDayBoundaryMustComeFromVerifiedGuaranteedHitTimeSemantics:true,
    feedMustCrossGuaranteedHitTimeWithSameBinding:true,
    crossBoundaryPairMustBeCadenceBounded:true,
    requestExecIntervalMustMatchAndBePositive:true,
    winCountMustRemainUnchanged:true,
    jackpotMustNotReset:true,
    raceProbabilityMustBeProspectivelyValidated:true,
    greenRequiresStructuredProspectiveRaceEvidence:true,
    raceEvidenceExactVersionRequired:RACE_EVIDENCE_VERSION,
    raceEvidenceProtocolIdRequired:true,
    raceEvidenceMustCarryClosedBinomialExecutionAssumptions:true,
    raceEvidenceMustCarryCompleteUniqueCycleLedgerIdentity:true,
    independentProspectiveRaceLedgerReviewRequiredForGreen:true,
    callerSuppliedRaceEvidenceCannotSelfAuthorizeIndependentReview:true,
    approvedProspectiveRaceLedgerReviewCommitCount:APPROVED_PROSPECTIVE_RACE_LEDGER_REVIEW_COMMITS.size,
    minimumExecutionRaceConfidence:MIN_EXECUTION_RACE_CONFIDENCE,
    exactStakeAndDailyAmountRequiredForGreen:true,
    measuredLatencyAndProspectiveDryRunRequiredForGreen:true,
    feedAgeConsumesValidatedRaceWindow:true,
    greenRequiresTotalExposureWithinValidatedRaceWindow:true,
    executionRtpPinnedToPublishedMainGameFloorUnlessSeparatelyReviewed:true,
    maxUnverifiedExecutionBaseRtpPct:MAX_UNVERIFIED_EXECUTION_BASE_RTP_PCT,
    callerSuppliedHigherRtpCannotEaseGreenThreshold:true,
    historicalRealizedPayoutCannotSetExecutionRtp:true,
  };
  const fail=(reason,extra={})=>({version:'sporting-legends-overdue-first-bet-v1.9-reviewed-race-contract',decision:'NO_PLAY',valid:false,reason,realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0,guards,...extra});
  if(!before||!after)return fail('MISSING_CROSS_BOUNDARY_SNAPSHOTS');
  if(before.code!=='sljp-1'||after.code!=='sljp-1')return fail('NOT_SPORTING_DAILY');
  if(upper(before.currency)!=='EUR'||upper(after.currency)!=='EUR'||before.local!==0||after.local!==0)return fail('NOT_GLOBAL_EUR_DAILY');
  if(!sameBinding(before,after))return fail('BINDING_CHANGED');
  const expectedCasino=lower(expectedBetfairImsCasino);
  if(!expectedCasino)return fail('EXPECTED_BETFAIR_IMS_NOT_SUPPLIED');
  if(lower(before.requestCasino)!==expectedCasino||lower(after.requestCasino)!==expectedCasino)return fail('REQUEST_CASINO_DOES_NOT_MATCH_VERIFIED_BETFAIR_IMS');
  if(!exactBetfairSpainTickerImsBindingVerified)return fail('BETFAIR_SPAIN_TICKER_IMS_NOT_VERIFIED');
  if(!betfairFirstBetFollowingDayRuleVerified)return fail('BETFAIR_FOLLOWING_DAY_FIRST_BET_RULE_NOT_VERIFIED');
  if(!providerGuaranteedHitTimeDefinesFollowingDayBoundaryVerified)return fail('GUARANTEED_HIT_TIME_BOUNDARY_SEMANTICS_NOT_VERIFIED');

  const deadline=finite(after.guaranteedHitTime),beforeDeadline=finite(before.guaranteedHitTime);
  const beforeTs=finite(before.gameTimestamp),afterTs=finite(after.gameTimestamp),now=finite(nowEpochSeconds);
  const beforeWin=finite(before.winCount),afterWin=finite(after.winCount);
  const beforeAmount=finite(before.amount),afterAmount=finite(after.amount);
  const beforeExec=finite(before.requestExecInterval),afterExec=finite(after.requestExecInterval);
  const boundaryIntervals=finite(maxBoundaryDistanceIntervals),feedAgeIntervals=finite(maxFeedAgeIntervals);
  if([deadline,beforeDeadline,beforeTs,afterTs,now,beforeWin,afterWin,beforeAmount,afterAmount,beforeExec,afterExec,boundaryIntervals,feedAgeIntervals].some(v=>v===null))return fail('INCOMPLETE_PROTOCOL_FIELDS');
  if(!(beforeExec>0&&afterExec>0))return fail('INVALID_EXEC_INTERVAL');
  if(beforeExec!==afterExec)return fail('EXEC_INTERVAL_CHANGED');
  if(!(boundaryIntervals>=1&&feedAgeIntervals>=1))return fail('INVALID_CADENCE_POLICY');
  if(deadline!==beforeDeadline)return fail('DEADLINE_CHANGED_OR_RESET');
  if(!(beforeTs<=deadline&&afterTs>deadline))return fail('SNAPSHOTS_DO_NOT_BRACKET_GUARANTEED_HIT_TIME');
  const beforeLeadSeconds=deadline-beforeTs;
  const afterLagSeconds=afterTs-deadline;
  const maxBoundaryDistanceSeconds=beforeExec*boundaryIntervals;
  if(beforeLeadSeconds>maxBoundaryDistanceSeconds)return fail('BEFORE_SNAPSHOT_TOO_FAR_FROM_BOUNDARY',{beforeLeadSeconds,maxBoundaryDistanceSeconds});
  if(afterLagSeconds>maxBoundaryDistanceSeconds)return fail('AFTER_SNAPSHOT_TOO_FAR_FROM_BOUNDARY',{afterLagSeconds,maxBoundaryDistanceSeconds});
  if(afterWin!==beforeWin)return fail('JACKPOT_WIN_COUNT_CHANGED');
  if(afterAmount<beforeAmount)return fail('JACKPOT_RESET_OR_AWARD_DETECTED');

  const feedAgeSeconds=now-afterTs;
  const maxFeedAgeSeconds=afterExec*feedAgeIntervals;
  if(feedAgeSeconds<0)return fail('FUTURE_FEED_TIMESTAMP');
  if(feedAgeSeconds>maxFeedAgeSeconds)return fail('FEED_TOO_STALE',{feedAgeSeconds,maxFeedAgeSeconds});

  const zeroEligibleArrivalWindowSeconds=afterLagSeconds;
  const followingDayUnawardedVerified=true;
  const nextEligibleNetworkBetGuaranteedJackpot=true;
  const requestedRtp=finite(conservativeBaseRtpPct);
  const requestedRtpValid=requestedRtp!==null&&requestedRtp>=0&&requestedRtp<=100;
  const rtp=requestedRtpValid?Math.min(requestedRtp,MAX_UNVERIFIED_EXECUTION_BASE_RTP_PCT):null;
  const callerRtpCappedForExecution=requestedRtpValid&&requestedRtp>MAX_UNVERIFIED_EXECUTION_BASE_RTP_PCT;
  const stake=finite(stakeEUR);
  const jackpot=afterAmount;
  let breakEvenFirstBetProbability=null;
  if(rtp!==null&&stake!==null&&stake>0&&jackpot>0){
    breakEvenFirstBetProbability=((100-rtp)/100*stake)/jackpot;
  }

  const legacyPLower=finite(firstBetProbabilityLowerBound);
  const legacyRaceValidated=raceProbabilityProspectivelyValidated===true||raceModelProspectivelyValidated===true;
  const measuredLatency=finite(measuredActionLatencySeconds);
  const validatedRaceWindowSeconds=finite(raceEvidence?.actionLatencySeconds);
  const totalExposureSinceServerDetectionSeconds=measuredLatency!==null?feedAgeSeconds+measuredLatency:null;
  const raceConfidence=finite(raceEvidence?.confidence);
  const raceConfidenceVerified=raceConfidence!==null&&raceConfidence>=MIN_EXECUTION_RACE_CONFIDENCE&&raceConfidence<1;
  const raceProtocolId=text(raceEvidence?.protocolId);
  const raceAssumptions=raceEvidence?.assumptions;
  const raceAssumptionEvidenceId=text(raceAssumptions?.assumptionEvidenceId);
  const raceExecutionAssumptionsVerified=!!raceEvidence&&
    raceEvidence.executionAssumptionsClosed===true&&
    raceAssumptions?.binomialIidAssumptionJustified===true&&
    raceAssumptions?.completeProspectiveCycleLedgerVerified===true&&
    raceAssumptions?.currentCycleExchangeabilityVerified===true&&
    !!raceAssumptionEvidenceId;
  const declaredTotalCycles=Number(raceEvidence?.totalDryRunCycles);
  const raceCycleIds=Array.isArray(raceEvidence?.cycleIds)?raceEvidence.cycleIds.map(text):[];
  const raceLedgerIdentityVerified=Number.isInteger(declaredTotalCycles)&&declaredTotalCycles>=1&&
    raceCycleIds.length===declaredTotalCycles&&raceCycleIds.every(Boolean)&&new Set(raceCycleIds).size===raceCycleIds.length;

  const review=raceEvidence?.independentReview;
  const raceLedgerReviewCommitSha=lower(review?.reviewCommitSha);
  const raceLedgerIndependentReviewMetadataVerified=!!raceEvidence&&!!review&&!!raceProtocolId&&
    review.type==='GITHUB_REVIEWED_PROSPECTIVE_RACE_LEDGER'&&
    text(review.protocolId)===raceProtocolId&&
    exactOrderedTextList(review.cycleIds,raceCycleIds)&&
    !!raceLedgerReviewCommitSha&&SHA40.test(raceLedgerReviewCommitSha);
  const raceLedgerReviewCommitApproved=raceLedgerIndependentReviewMetadataVerified&&
    APPROVED_PROSPECTIVE_RACE_LEDGER_REVIEW_COMMITS.has(raceLedgerReviewCommitSha);
  const raceLedgerIndependentlyReviewed=raceLedgerIndependentReviewMetadataVerified&&raceLedgerReviewCommitApproved;

  const preReviewStructuredRaceEvidenceValid=!!raceEvidence&&
    raceEvidence.version===RACE_EVIDENCE_VERSION&&
    !!raceProtocolId&&
    raceEvidence.valid===true&&raceEvidence.usableForExecution===true&&
    raceEvidence.method===RACE_EVIDENCE_METHOD&&
    raceEvidence.source===RACE_EVIDENCE_SOURCE&&
    raceEvidence.prospectiveProtocolFrozen===true&&
    raceEvidence.comparableCycleDefinitionVerified===true&&
    raceExecutionAssumptionsVerified&&raceConfidenceVerified&&raceLedgerIdentityVerified&&
    Number.isInteger(declaredTotalCycles)&&declaredTotalCycles>=1&&
    Number.isInteger(Number(raceEvidence.successfulDryRunCycles))&&Number(raceEvidence.successfulDryRunCycles)>=0&&
    Number(raceEvidence.successfulDryRunCycles)<=declaredTotalCycles&&
    measuredLatency!==null&&measuredLatency>0&&validatedRaceWindowSeconds!==null&&validatedRaceWindowSeconds>0;
  const preReviewRaceWindowBudgetVerified=preReviewStructuredRaceEvidenceValid&&
    totalExposureSinceServerDetectionSeconds!==null&&
    totalExposureSinceServerDetectionSeconds<=validatedRaceWindowSeconds;
  const baseStructuredRaceEvidenceValid=preReviewStructuredRaceEvidenceValid&&raceLedgerIndependentlyReviewed;
  const raceWindowBudgetVerified=baseStructuredRaceEvidenceValid&&preReviewRaceWindowBudgetVerified;
  const structuredRaceEvidenceValid=baseStructuredRaceEvidenceValid&&raceWindowBudgetVerified;
  const researchStructuredPLower=preReviewRaceWindowBudgetVerified?finite(raceEvidence?.firstBetRaceProbabilityLowerBound):null;
  const structuredPLower=structuredRaceEvidenceValid?finite(raceEvidence.firstBetRaceProbabilityLowerBound):null;
  const researchPLower=researchStructuredPLower??legacyPLower;
  const researchRaceValidated=preReviewRaceWindowBudgetVerified||legacyRaceValidated;
  const probabilityGate=breakEvenFirstBetProbability!==null&&researchPLower!==null&&researchPLower>=0&&researchPLower<=1&&researchRaceValidated&&researchPLower>breakEvenFirstBetProbability;
  const greenProbabilityGate=breakEvenFirstBetProbability!==null&&structuredPLower!==null&&structuredPLower>=0&&structuredPLower<=1&&structuredPLower>breakEvenFirstBetProbability;
  const executionGates={
    structuredProspectiveRaceEvidenceVerified:structuredRaceEvidenceValid,
    raceExecutionAssumptionsVerified,
    raceConfidenceVerified,
    raceLedgerIdentityVerified,
    prospectiveRaceLedgerIndependentReviewVerified:raceLedgerIndependentlyReviewed,
    currentDailyAmountExactVerified:currentDailyAmountExactVerified===true,
    stakeAtDecisionExactVerified:stakeAtDecisionExactVerified===true,
    measuredActionLatencyVerified:measuredActionLatencyVerified===true&&measuredLatency!==null&&measuredLatency>0,
    raceWindowBudgetVerified,
    prospectiveDryRunCycleVerified:prospectiveDryRunCycleVerified===true&&structuredRaceEvidenceValid&&declaredTotalCycles>=1,
  };
  const executionGateClosed=Object.values(executionGates).every(Boolean);
  const green=greenProbabilityGate&&executionGateClosed;
  const decision=green?'GREEN':'NO_PLAY';
  const reason=green?'GREEN_OVERDUE_FIRST_BET_ALL_GATES_CLOSED':
    raceEvidence&&!preReviewStructuredRaceEvidenceValid?'RACE_EVIDENCE_EXECUTION_CONTRACT_NOT_VERIFIED':
    preReviewStructuredRaceEvidenceValid&&!preReviewRaceWindowBudgetVerified?'VALIDATED_RACE_WINDOW_EXHAUSTED':
    preReviewRaceWindowBudgetVerified&&!raceLedgerIndependentlyReviewed?'PROSPECTIVE_RACE_LEDGER_INDEPENDENT_REVIEW_REQUIRED':
    probabilityGate?'CONDITIONAL_RACE_EV_SCREEN_PASSED_EXECUTION_GATES_PENDING':'FOLLOWING_DAY_UNAWARDED_VERIFIED_RACE_GATE_OPEN';
  return {
    version:'sporting-legends-overdue-first-bet-v1.9-reviewed-race-contract',
    decision,valid:true,reason,
    followingDayUnawardedVerified,nextEligibleNetworkBetGuaranteedJackpot,
    exactBetfairSpainTickerImsBindingVerified:true,
    providerGuaranteedHitTimeDefinesFollowingDayBoundaryVerified:true,
    deadlineEpochSeconds:deadline,followingDayStartEpochSeconds:deadline,
    requestExecIntervalSeconds:afterExec,beforeLeadSeconds,afterLagSeconds,
    zeroEligibleArrivalWindowSeconds,feedAgeSeconds,maxFeedAgeSeconds,
    beforeGameTimestamp:beforeTs,afterGameTimestamp:afterTs,winCount:afterWin,
    currentDailyJackpotEUR:jackpot,
    requestedConservativeBaseRtpPct:requestedRtp,
    conservativeBaseRtpPct:rtp,
    maxUnverifiedExecutionBaseRtpPct:MAX_UNVERIFIED_EXECUTION_BASE_RTP_PCT,
    callerRtpCappedForExecution,
    executionRtpSource:'BETFAIR_AP_MCCOY_PUBLISHED_MAIN_GAME_MINIMUM_CONSERVATIVE_CAP',
    stakeEUR:stake,
    breakEvenFirstBetProbability,
    firstBetProbabilityLowerBound:researchPLower,
    raceProtocolId,
    preReviewStructuredRaceEvidenceValid,preReviewRaceWindowBudgetVerified,
    baseStructuredRaceEvidenceValid,structuredRaceEvidenceValid,
    raceExecutionAssumptionsVerified,raceConfidence,raceConfidenceVerified,
    raceAssumptionEvidenceId,raceLedgerIdentityVerified,
    raceLedgerIndependentReviewMetadataVerified,
    raceLedgerReviewCommitSha,
    raceLedgerReviewCommitApproved,
    raceLedgerIndependentlyReviewed,
    approvedProspectiveRaceLedgerReviewCommitCount:APPROVED_PROSPECTIVE_RACE_LEDGER_REVIEW_COMMITS.size,
    validatedRaceWindowSeconds,totalExposureSinceServerDetectionSeconds,raceWindowBudgetVerified,
    raceProbabilityProspectivelyValidated:researchRaceValidated,
    conditionalPositiveEvScreenPassed:probabilityGate,
    executionGates,executionGateClosed,
    realMoneyAllowed:green,realStakeEUR:green?stake:0,maxSpins:green?1:0,maxTotalStakeEUR:green?stake:0,
    manualActionRequired:green,guards,
  };
}

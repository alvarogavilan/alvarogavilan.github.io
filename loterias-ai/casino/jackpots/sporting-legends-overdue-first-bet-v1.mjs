const finite=(v)=>{if(v===null||v===undefined||v===''||typeof v==='boolean')return null;const n=Number(v);return Number.isFinite(n)?n:null;};
const text=(v)=>typeof v==='string'&&v.trim()?v.trim():null;
const upper=(v)=>text(v)?.toUpperCase()??null;

function sameBinding(a,b){
  if(!a||!b)return false;
  const fields=['code','requestCasino','instanceCode'];
  for(const f of fields){
    if(text(a[f])!==text(b[f]))return false;
  }
  return a.local===b.local&&upper(a.currency)===upper(b.currency);
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
    exactStakeAndDailyAmountRequiredForGreen:true,
    measuredLatencyAndProspectiveDryRunRequiredForGreen:true,
  };
  const fail=(reason,extra={})=>({version:'sporting-legends-overdue-first-bet-v1.4-cadence-bound-green',decision:'NO_PLAY',valid:false,reason,realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0,guards,...extra});
  if(!before||!after)return fail('MISSING_CROSS_BOUNDARY_SNAPSHOTS');
  if(before.code!=='sljp-1'||after.code!=='sljp-1')return fail('NOT_SPORTING_DAILY');
  if(upper(before.currency)!=='EUR'||upper(after.currency)!=='EUR'||before.local!==0||after.local!==0)return fail('NOT_GLOBAL_EUR_DAILY');
  if(!sameBinding(before,after))return fail('BINDING_CHANGED');
  const expectedCasino=text(expectedBetfairImsCasino)?.toLowerCase()??null;
  if(!expectedCasino)return fail('EXPECTED_BETFAIR_IMS_NOT_SUPPLIED');
  if(text(before.requestCasino)?.toLowerCase()!==expectedCasino||text(after.requestCasino)?.toLowerCase()!==expectedCasino)return fail('REQUEST_CASINO_DOES_NOT_MATCH_VERIFIED_BETFAIR_IMS');
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
  const rtp=finite(conservativeBaseRtpPct);
  const stake=finite(stakeEUR);
  const jackpot=afterAmount;
  let breakEvenFirstBetProbability=null;
  if(rtp!==null&&stake!==null&&stake>0&&jackpot>0&&rtp>=0&&rtp<=100){
    breakEvenFirstBetProbability=((100-rtp)/100*stake)/jackpot;
  }

  const legacyPLower=finite(firstBetProbabilityLowerBound);
  const legacyRaceValidated=raceProbabilityProspectivelyValidated===true||raceModelProspectivelyValidated===true;
  const measuredLatency=finite(measuredActionLatencySeconds);
  const structuredRaceEvidenceValid=!!raceEvidence&&
    raceEvidence.valid===true&&raceEvidence.usableForExecution===true&&
    raceEvidence.method==='ONE_SIDED_CLOPPER_PEARSON_BINOMIAL'&&
    raceEvidence.source==='VALIDATED_PASSIVE_CYCLE_LEDGER'&&
    raceEvidence.prospectiveProtocolFrozen===true&&
    raceEvidence.comparableCycleDefinitionVerified===true&&
    Number.isInteger(Number(raceEvidence.totalDryRunCycles))&&Number(raceEvidence.totalDryRunCycles)>=1&&
    Number.isInteger(Number(raceEvidence.successfulDryRunCycles))&&Number(raceEvidence.successfulDryRunCycles)>=0&&
    Number(raceEvidence.successfulDryRunCycles)<=Number(raceEvidence.totalDryRunCycles)&&
    measuredLatency!==null&&measuredLatency>0&&finite(raceEvidence.actionLatencySeconds)!==null&&measuredLatency<=finite(raceEvidence.actionLatencySeconds);
  const structuredPLower=structuredRaceEvidenceValid?finite(raceEvidence.firstBetRaceProbabilityLowerBound):null;
  const researchPLower=structuredPLower??legacyPLower;
  const researchRaceValidated=structuredRaceEvidenceValid||legacyRaceValidated;
  const probabilityGate=breakEvenFirstBetProbability!==null&&researchPLower!==null&&researchPLower>=0&&researchPLower<=1&&researchRaceValidated&&researchPLower>breakEvenFirstBetProbability;
  const greenProbabilityGate=breakEvenFirstBetProbability!==null&&structuredPLower!==null&&structuredPLower>=0&&structuredPLower<=1&&structuredPLower>breakEvenFirstBetProbability;
  const executionGates={
    structuredProspectiveRaceEvidenceVerified:structuredRaceEvidenceValid,
    currentDailyAmountExactVerified:currentDailyAmountExactVerified===true,
    stakeAtDecisionExactVerified:stakeAtDecisionExactVerified===true,
    measuredActionLatencyVerified:measuredActionLatencyVerified===true&&measuredLatency!==null&&measuredLatency>0,
    prospectiveDryRunCycleVerified:prospectiveDryRunCycleVerified===true&&structuredRaceEvidenceValid&&Number(raceEvidence.totalDryRunCycles)>=1,
  };
  const executionGateClosed=Object.values(executionGates).every(Boolean);
  const green=greenProbabilityGate&&executionGateClosed;
  const decision=green?'GREEN':'NO_PLAY';
  const reason=green?'GREEN_OVERDUE_FIRST_BET_ALL_GATES_CLOSED':
    probabilityGate?'CONDITIONAL_RACE_EV_SCREEN_PASSED_EXECUTION_GATES_PENDING':'FOLLOWING_DAY_UNAWARDED_VERIFIED_RACE_GATE_OPEN';
  return {
    version:'sporting-legends-overdue-first-bet-v1.4-cadence-bound-green',
    decision,valid:true,reason,
    followingDayUnawardedVerified,nextEligibleNetworkBetGuaranteedJackpot,
    exactBetfairSpainTickerImsBindingVerified:true,
    providerGuaranteedHitTimeDefinesFollowingDayBoundaryVerified:true,
    deadlineEpochSeconds:deadline,followingDayStartEpochSeconds:deadline,
    requestExecIntervalSeconds:afterExec,beforeLeadSeconds,afterLagSeconds,
    zeroEligibleArrivalWindowSeconds,feedAgeSeconds,maxFeedAgeSeconds,
    beforeGameTimestamp:beforeTs,afterGameTimestamp:afterTs,winCount:afterWin,
    currentDailyJackpotEUR:jackpot,conservativeBaseRtpPct:rtp,stakeEUR:stake,
    breakEvenFirstBetProbability,
    firstBetProbabilityLowerBound:researchPLower,
    structuredRaceEvidenceValid,
    raceProbabilityProspectivelyValidated:researchRaceValidated,
    conditionalPositiveEvScreenPassed:probabilityGate,
    executionGates,executionGateClosed,
    realMoneyAllowed:green,realStakeEUR:green?stake:0,maxSpins:green?1:0,maxTotalStakeEUR:green?stake:0,
    manualActionRequired:green,guards,
  };
}

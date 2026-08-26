const finite=v=>{if(v===null||v===undefined||v===''||typeof v==='boolean')return null;const n=Number(v);return Number.isFinite(n)?n:null;};
const MAX_CONSERVATIVE_BASE_RTP_PCT=94.5;
const REQUIRED_STAKE_EUR=0.10;

function fail(reason,extra={}){
  return {version:'bet365-bobby-overdue-economics-screen-v1',valid:false,decision:'NO_PLAY',reason,realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0,...extra};
}

export function evaluateBet365BobbyOverdueEconomicsScreen({
  overduePairCandidate,
  servedBet365SessionBindingVerified=false,
  servedTenCentTotalStakeVerified=false,
  tenCentJackpotEligibilityVerified=false,
  operatorFollowingDayRuleAdoptionVerified=false,
  conservativeBaseRtpPct=MAX_CONSERVATIVE_BASE_RTP_PCT,
  firstBetProbabilityLowerBound=null,
}={}){
  const pair=overduePairCandidate;
  if(!pair||pair.valid!==true||pair.candidateFollowingDayUnawardedStateObserved!==true)return fail('VERIFIED_CROSS_GHT_CANDIDATE_REQUIRED');
  const jackpot=finite(pair?.after?.snapshot?.amount);
  if(!(jackpot>0))return fail('CURRENT_DAILY_AMOUNT_REQUIRED');
  const requestedRtp=finite(conservativeBaseRtpPct);
  if(requestedRtp===null||requestedRtp<0||requestedRtp>100)return fail('INVALID_CONSERVATIVE_BASE_RTP');
  const effectiveRtp=Math.min(requestedRtp,MAX_CONSERVATIVE_BASE_RTP_PCT);
  const expectedBaseLossEUR=((100-effectiveRtp)/100)*REQUIRED_STAKE_EUR;
  const breakEvenFirstBetProbability=expectedBaseLossEUR/jackpot;
  const pLower=finite(firstBetProbabilityLowerBound);
  const probabilityScreenPassed=pLower!==null&&pLower>=0&&pLower<=1&&pLower>breakEvenFirstBetProbability;
  const executionPrerequisites={
    servedBet365SessionBindingVerified:servedBet365SessionBindingVerified===true,
    servedTenCentTotalStakeVerified:servedTenCentTotalStakeVerified===true,
    tenCentJackpotEligibilityVerified:tenCentJackpotEligibilityVerified===true,
    operatorFollowingDayRuleAdoptionVerified:operatorFollowingDayRuleAdoptionVerified===true,
  };
  const executionPrerequisitesClosed=Object.values(executionPrerequisites).every(Boolean);
  return {
    version:'bet365-bobby-overdue-economics-screen-v1',valid:true,decision:'NO_PLAY',
    reason:probabilityScreenPassed&&executionPrerequisitesClosed?'ECONOMIC_SCREEN_PASSED_EXECUTION_RACE_REVIEW_STILL_REQUIRED':probabilityScreenPassed?'ECONOMIC_SCREEN_PASSED_OPERATOR_BINDING_GATES_PENDING':'BREAK_EVEN_RACE_THRESHOLD_NOT_CLEARED',
    stakeEUR:REQUIRED_STAKE_EUR,currentDailyJackpotEUR:jackpot,
    requestedConservativeBaseRtpPct:requestedRtp,conservativeBaseRtpPct:effectiveRtp,maxConservativeBaseRtpPct:MAX_CONSERVATIVE_BASE_RTP_PCT,
    callerRtpCappedForScreen:requestedRtp>MAX_CONSERVATIVE_BASE_RTP_PCT,
    expectedBaseLossEUR,breakEvenFirstBetProbability,firstBetProbabilityLowerBound:pLower,probabilityScreenPassed,
    executionPrerequisites,executionPrerequisitesClosed,
    realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0,
    scientificUse:'Research-only economics screen for the exact current bet365 Spain Bobby George low-cost overdue lane. It uses the provider-documented 94.5% base component as a hard maximum, a 0.10 EUR stake only as an operator-published candidate, and the exact Daily amount from a validated cross-GHT candidate pair. Passing the probability inequality cannot authorize a wager: current bet365 session binding, served ten-cent total stake semantics, ten-cent jackpot eligibility, operator adoption of the following-day rule, independently reviewed prospective race evidence and a final fresh live-state recheck remain mandatory.',
    hardGuards:{onlineOnly:true,nonPromoOnly:true,noWagerProbe:true,noAutomaticBetting:true,headlineRtpCannotSetBaseRtp:true,providerBaseRtpHardCap:true,operatorPublishedTenCentMinimumCannotSelfVerifyEligibility:true,crossGhtCandidateCannotSelfVerifyBet365Ownership:true,economicScreenCannotAuthorizeGreen:true,realMoneyAllowed:false},
  };
}

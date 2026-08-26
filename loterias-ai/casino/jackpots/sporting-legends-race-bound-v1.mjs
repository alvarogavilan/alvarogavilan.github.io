const finite=(v)=>Number.isFinite(Number(v))?Number(v):null;

export function deriveZeroArrivalPoissonRaceLowerBound({
  zeroArrivalWindowSeconds,
  actionLatencySeconds,
  confidence=0.95,
  poissonArrivalModelProspectivelyValidated=false,
}={}){
  const T=finite(zeroArrivalWindowSeconds);
  const L=finite(actionLatencySeconds);
  const c=finite(confidence);
  const guards={
    researchOnly:true,
    zeroObservedWinsOnlySupportsZeroEligibleArrivalsIfFollowingDayRuleAndBindingAreVerified:true,
    stationarityCannotBeAssumed:true,
    poissonModelRequiresProspectiveValidation:true,
    latencyMustBeMeasuredNotGuessed:true,
    noAutomaticWagering:true,
    realMoneyAllowed:false,
  };
  const fail=(reason,extra={})=>({version:'sporting-legends-race-bound-v1',valid:false,usableForExecution:false,reason,guards,...extra});
  if(!(T>0))return fail('INVALID_ZERO_ARRIVAL_WINDOW');
  if(!(L>=0))return fail('INVALID_ACTION_LATENCY');
  if(!(c>0&&c<1))return fail('INVALID_CONFIDENCE');

  const competitorRateUpperPerSecond=-Math.log(1-c)/T;
  const firstBetRaceProbabilityLowerBound=Math.exp(-competitorRateUpperPerSecond*L);
  const prospectivelyValidated=poissonArrivalModelProspectivelyValidated===true;
  return {
    version:'sporting-legends-race-bound-v1',
    valid:true,
    reason:prospectivelyValidated?'PROSPECTIVE_MODEL_BOUND_AVAILABLE':'RESEARCH_BOUND_ONLY_MODEL_NOT_VALIDATED',
    zeroArrivalWindowSeconds:T,
    actionLatencySeconds:L,
    confidence:c,
    competitorRateUpperPerSecond,
    competitorRateUpperPerMinute:competitorRateUpperPerSecond*60,
    firstBetRaceProbabilityLowerBound,
    poissonArrivalModelProspectivelyValidated:prospectivelyValidated,
    usableForExecution:prospectivelyValidated,
    guards,
  };
}

export function requiredZeroArrivalWindowForRaceGate({
  breakEvenFirstBetProbability,
  actionLatencySeconds,
  confidence=0.95,
}={}){
  const p=finite(breakEvenFirstBetProbability);
  const L=finite(actionLatencySeconds);
  const c=finite(confidence);
  const guards={researchOnly:true,modelRequirement:'STATIONARY_POISSON_PROSPECTIVELY_VALIDATED',realMoneyAllowed:false};
  if(!(p>0&&p<1))return {valid:false,reason:'INVALID_BREAK_EVEN_PROBABILITY',guards};
  if(!(L>0))return {valid:false,reason:'INVALID_ACTION_LATENCY',guards};
  if(!(c>0&&c<1))return {valid:false,reason:'INVALID_CONFIDENCE',guards};
  const requiredZeroArrivalWindowSeconds=L*Math.log(1-c)/Math.log(p);
  return {
    valid:true,
    reason:'RESEARCH_THRESHOLD_ONLY',
    breakEvenFirstBetProbability:p,
    actionLatencySeconds:L,
    confidence:c,
    requiredZeroArrivalWindowSeconds,
    guards,
  };
}

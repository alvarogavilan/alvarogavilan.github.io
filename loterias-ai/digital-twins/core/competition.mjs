export function netWinProbability({ownTriggerProbabilityPerSpin,acceptedRaceShare=1}){
  if(!(ownTriggerProbabilityPerSpin>=0&&ownTriggerProbabilityPerSpin<=1)) throw new Error('OWN_TRIGGER_PROBABILITY_0_1_REQUIRED');
  if(!(acceptedRaceShare>=0&&acceptedRaceShare<=1)) throw new Error('ACCEPTED_RACE_SHARE_0_1_REQUIRED');
  return ownTriggerProbabilityPerSpin*acceptedRaceShare;
}
export function poissonLatencySurvival({competitorAcceptedSpinRatePerSecond,latencySeconds}){
  if(!(competitorAcceptedSpinRatePerSecond>=0)||!(latencySeconds>=0)) throw new Error('NONNEGATIVE_RATE_AND_LATENCY_REQUIRED');
  return Math.exp(-competitorAcceptedSpinRatePerSecond*latencySeconds);
}

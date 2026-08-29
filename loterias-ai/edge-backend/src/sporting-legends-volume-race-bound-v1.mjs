const finite=(v)=>{const n=Number(v);return Number.isFinite(n)?n:null;};

/**
 * Research-only bound for the Sporting Legends first-bet race.
 *
 * No contribution rate is assumed. Playtech product documentation and current
 * operator help can differ (e.g. generic 2.00% vs operator-published 1.99%).
 * The exact rate used for execution must therefore be bound to the same live
 * operator/network/configuration as the observed pools.
 *
 * A deterministic zero-competitor conclusion is possible only when an exact,
 * same-network, high-frequency observation bounds TOTAL eligible wagering in
 * the full exposure window below the minimum possible competing bet. Any
 * non-zero competitor count still requires an independently validated arrival/
 * ordering model or prospective race ledger; exchangeability is never assumed.
 */
export function sportingLegendsVolumeRaceBound({
  combinedCurrentPoolIncreaseEUR,
  exposureSeconds,
  minimumEligibleNetworkStakeEUR,
  operatorContributionFractionOfStake,
  fractionOfContributionFundingCurrentPools,
  exactOperatorContributionRateVerified=false,
  exactCurrentPoolFundingShareVerified=false,
  exactSameNetworkCombinedPoolVerified=false,
  noAwardOrResetInsideWindowVerified=false,
  noManualFundMovementInsideWindowVerified=false,
  minStakeAcrossAllParticipatingGamesVerified=false,
  observationCoversFullExposureWindow=false,
}={}){
  const growth=finite(combinedCurrentPoolIncreaseEUR);
  const seconds=finite(exposureSeconds);
  const minStake=finite(minimumEligibleNetworkStakeEUR);
  const contribution=finite(operatorContributionFractionOfStake);
  const currentShare=finite(fractionOfContributionFundingCurrentPools);
  const f=contribution!==null&&currentShare!==null?contribution*currentShare:null;
  const hardEvidence=[
    exactOperatorContributionRateVerified,
    exactCurrentPoolFundingShareVerified,
    exactSameNetworkCombinedPoolVerified,
    noAwardOrResetInsideWindowVerified,
    noManualFundMovementInsideWindowVerified,
    minStakeAcrossAllParticipatingGamesVerified,
    observationCoversFullExposureWindow,
  ].every(v=>v===true);
  if(growth===null||growth<0||seconds===null||seconds<=0||minStake===null||minStake<=0||contribution===null||contribution<=0||contribution>=1||currentShare===null||currentShare<=0||currentShare>1||f===null||f<=0||f>=1){
    return {valid:false,decision:'NO_PLAY',realMoneyAllowed:false,reason:'INVALID_OR_UNBOUND_FUNDING_INPUT'};
  }
  const impliedEligibleWagerVolumeEUR=growth/f;
  const maxCompetingBetsByVolume=Math.floor((impliedEligibleWagerVolumeEUR+1e-12)/minStake);
  const deterministicZeroCompetitorBound=hardEvidence&&impliedEligibleWagerVolumeEUR<minStake;
  return {
    version:'sporting-legends-volume-race-bound-v1.1-operator-bound-rate',
    valid:true,
    decision:'NO_PLAY',
    realMoneyAllowed:false,
    combinedCurrentPoolIncreaseEUR:growth,
    exposureSeconds:seconds,
    operatorContributionFractionOfStake:contribution,
    fractionOfContributionFundingCurrentPools:currentShare,
    currentPoolFundingFractionOfStake:f,
    impliedEligibleWagerVolumeEUR,
    impliedEligibleWagerVolumePerSecondEUR:impliedEligibleWagerVolumeEUR/seconds,
    minimumEligibleNetworkStakeEUR:minStake,
    maxCompetingBetsByVolume,
    deterministicZeroCompetitorBound,
    hardEvidenceClosed:hardEvidence,
    probabilityLowerBound:deterministicZeroCompetitorBound?1:null,
    reason:deterministicZeroCompetitorBound?'ZERO_COMPETITOR_VOLUME_BOUND_RESEARCH_ONLY':'RACE_ORDER_NOT_CLOSED',
    guards:{
      noGenericContributionRateTransfer:true,
      operatorRateMustMatchObservedNetwork:true,
      sumOfDailyWeeklyMegaRequired:true,
      sameNetworkBindingRequired:true,
      noAwardResetOrManualFundMovementRequired:true,
      exactMinimumStakeAcrossAllNetworkGamesRequired:true,
      fullDetectionPlusActionExposureWindowRequired:true,
      publicFiveMinuteOrSixHourTrackersAreTooCoarseForExecution:true,
      nonzeroCompetitorBoundDoesNotImplyRandomOrdering:true,
      exchangeabilityCannotBeInvented:true,
      noAutomaticWagering:true,
      noWagerProbe:true,
      realMoneyAllowed:false,
    }
  };
}

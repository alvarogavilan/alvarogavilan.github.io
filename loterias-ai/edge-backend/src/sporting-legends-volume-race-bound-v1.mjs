const finite=(v)=>{const n=Number(v);return Number.isFinite(n)?n:null;};

/**
 * Research-only bound for the Sporting Legends first-bet race.
 *
 * Playtech rule facts used externally:
 * - each bet contributes 2% to the jackpot fund;
 * - 84.5% of that contribution funds CURRENT jackpots;
 * therefore, absent awards/manual fund movements/config changes, the increase
 * in the SUM of current Sporting Legends jackpot pools equals 0.0169 times
 * eligible network wagering volume.
 *
 * This module does NOT convert that volume into a GREEN probability by itself.
 * A deterministic zero-competitor conclusion is possible only when an exact,
 * same-network, high-frequency observation bounds the TOTAL wager volume in the
 * full exposure window below the minimum possible competing bet. Otherwise an
 * arrival/order model or prospective race ledger remains necessary.
 */
export function sportingLegendsVolumeRaceBound({
  combinedCurrentPoolIncreaseEUR,
  exposureSeconds,
  minimumEligibleNetworkStakeEUR,
  currentPoolFundingFractionOfStake=0.02*0.845,
  exactSameNetworkCombinedPoolVerified=false,
  noAwardOrResetInsideWindowVerified=false,
  noManualFundMovementInsideWindowVerified=false,
  minStakeAcrossAllParticipatingGamesVerified=false,
  observationCoversFullExposureWindow=false,
}={}){
  const growth=finite(combinedCurrentPoolIncreaseEUR);
  const seconds=finite(exposureSeconds);
  const minStake=finite(minimumEligibleNetworkStakeEUR);
  const f=finite(currentPoolFundingFractionOfStake);
  const hardEvidence=[
    exactSameNetworkCombinedPoolVerified,
    noAwardOrResetInsideWindowVerified,
    noManualFundMovementInsideWindowVerified,
    minStakeAcrossAllParticipatingGamesVerified,
    observationCoversFullExposureWindow,
  ].every(v=>v===true);
  if(growth===null||growth<0||seconds===null||seconds<=0||minStake===null||minStake<=0||f===null||f<=0||f>=1){
    return {valid:false,decision:'NO_PLAY',realMoneyAllowed:false,reason:'INVALID_INPUT'};
  }
  const impliedEligibleWagerVolumeEUR=growth/f;
  // Every competing bet is >= verified network minimum, hence count <= floor(V/minStake).
  const maxCompetingBetsByVolume=Math.floor((impliedEligibleWagerVolumeEUR+1e-12)/minStake);
  const deterministicZeroCompetitorBound=hardEvidence&&impliedEligibleWagerVolumeEUR<minStake;
  return {
    version:'sporting-legends-volume-race-bound-v1',
    valid:true,
    decision:'NO_PLAY',
    realMoneyAllowed:false,
    combinedCurrentPoolIncreaseEUR:growth,
    exposureSeconds:seconds,
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

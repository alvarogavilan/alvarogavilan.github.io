export function buildDiamondBonanzaCrossMarketScreen({
  historicalSeed=500,
  historicalMeanWin=7309,
  historicalContribution=0.0566,
  currentSpainTotalRtp=0.9544,
  observedSpainMeter=8032.90,
}={}){
  const vals=[historicalSeed,historicalMeanWin,historicalContribution,currentSpainTotalRtp,observedSpainMeter];
  if(!vals.every(Number.isFinite)) throw new Error('INVALID_NUMERIC_INPUT');
  if(historicalSeed<0||historicalMeanWin<=historicalSeed||historicalContribution<=0||historicalContribution>=1||currentSpainTotalRtp<=0||currentSpainTotalRtp>=1||observedSpainMeter<0) throw new Error('INVALID_INPUT_RANGE');
  const meanGrowth=historicalMeanWin-historicalSeed;
  const impliedTurnoverPerWin=meanGrowth/historicalContribution;
  const impliedHazardPerCurrencyUnit=historicalContribution/meanGrowth;
  const impliedMeanProgressiveReturn=impliedHazardPerCurrencyUnit*historicalMeanWin;
  const inferredSpainBaseRtpIfTransferHeld=currentSpainTotalRtp-impliedMeanProgressiveReturn;
  const breakEvenMeterIfTransferHeld=(1-inferredSpainBaseRtpIfTransferHeld)/impliedHazardPerCurrencyUnit;
  const impliedCurrentTotalRtpIfTransferHeld=inferredSpainBaseRtpIfTransferHeld+impliedHazardPerCurrencyUnit*observedSpainMeter;
  return {
    version:'diamond-bonanza-cross-market-economics-screen-v1',
    inputs:{historicalSeed,historicalMeanWin,historicalContribution,currentSpainTotalRtp,observedSpainMeter},
    comparator:{
      meanGrowth,
      impliedTurnoverPerWin,
      impliedHazardPerCurrencyUnit,
      impliedMeanProgressiveReturn,
      inferredSpainBaseRtpIfTransferHeld,
      breakEvenMeterIfTransferHeld,
      impliedCurrentTotalRtpIfTransferHeld,
    },
    decision:{
      currentSpainPositiveEvProven:false,
      historicalHazardEquivalentToSpain:false,
      contributionEquivalentToSpain:false,
      observedMeterFresh:false,
      economicPromotionAllowed:false,
      realMoneyAllowed:false,
      stakeEUR:0,
    },
    guards:{
      crossMarketHazardIsComparatorOnly:true,
      foreignSeedNeverPromoted:true,
      foreignContributionNeverPromoted:true,
      publishedRtpSemanticsMustBeResolvedBeforeExecution:true,
      freshSpainMeterRequired:true,
      exactSpainTriggerProbabilityRequired:true,
      noBetting:true,
    },
  };
}

const finiteNumberOrNull=(value)=>{
  if(value===null||value===undefined||value==='') return null;
  const n=Number(value);
  return Number.isFinite(n)?n:null;
};

export function classifyDiamondTransition({
  priorAmountEUR,
  currentAmountEUR,
  priorPositiveGrowthObserved = false,
  resetScaleDropFraction = 0.20,
}) {
  const prior=finiteNumberOrNull(priorAmountEUR), current=finiteNumberOrNull(currentAmountEUR);
  if(current===null||current<0) return {classification:'INVALID_CURRENT',usableForSeedInference:false};
  if(prior===null||prior<0) return {classification:'BASELINE',usableForSeedInference:false,currentAmountEUR:current};
  const deltaEUR=Number((current-prior).toFixed(6));
  if(deltaEUR>0) return {classification:'POSITIVE_GROWTH',deltaEUR,positiveGrowthObserved:true,usableForSeedInference:false};
  if(deltaEUR===0) return {classification:'UNCHANGED',deltaEUR:0,usableForSeedInference:false};
  if(prior===0) return {classification:'DROP_FROM_ZERO_INVALID',deltaEUR,usableForSeedInference:false};
  const dropEUR=Number((prior-current).toFixed(6));
  const dropFraction=Number((dropEUR/prior).toFixed(9));
  const resetScale=dropFraction>=resetScaleDropFraction;
  const usableForSeedInference=resetScale&&priorPositiveGrowthObserved===true;
  return {
    classification: usableForSeedInference
      ? 'RESET_SCALE_DROP_CANDIDATE'
      : resetScale
        ? 'RESET_SCALE_DROP_WITHOUT_PRIOR_POSITIVE_GROWTH'
        : 'SMALL_DROP_CANDIDATE',
    deltaEUR,
    dropEUR,
    dropFraction,
    resetScaleDropFraction,
    priorPositiveGrowthObserved:priorPositiveGrowthObserved===true,
    usableForSeedInference,
    postDropAmountUpperBoundForSeedEUR:usableForSeedInference?current:null,
    seedPointEstimateEUR:null,
    jackpotWinVerified:false,
  };
}

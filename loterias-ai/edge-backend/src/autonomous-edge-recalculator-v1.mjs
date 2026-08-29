const VERSION='autonomous-edge-recalculator-v1';
const EXEC=Object.freeze({decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0});
const n=v=>Number.isFinite(Number(v))?Number(v):null;
const round=(v,d=8)=>Number.isFinite(v)?Number(v.toFixed(d)):null;
const exec=()=>({...EXEC});

export function sharedStateCycleFrontier(input={}){
  const buildStake=n(input.buildStakeEUR),exerciseStake=n(input.exerciseStakeEUR);
  if(!(buildStake>0)||!(exerciseStake>0))return{version:VERSION,ok:false,reason:'POSITIVE_BUILD_AND_EXERCISE_STAKES_REQUIRED',execution:exec()};
  const leverage=exerciseStake/buildStake;
  const buildCostUnits=Array.isArray(input.buildNetCostInBuildStakeUnits)&&input.buildNetCostInBuildStakeUnits.length?input.buildNetCostInBuildStakeUnits:[0,5,10,20,50,100,200];
  const featureGrossMultiples=Array.isArray(input.featureGrossValueMultiplesOfExerciseStake)&&input.featureGrossValueMultiplesOfExerciseStake.length?input.featureGrossValueMultiplesOfExerciseStake:[2,3,5,10,20,50,100];
  const rows=[];
  for(const c0 of buildCostUnits){const c=n(c0);if(c===null||c<0)continue;for(const m0 of featureGrossMultiples){const m=n(m0);if(!(m>0))continue;const breakEvenP=(c+leverage)/(m*leverage);rows.push({buildNetCostInBuildStakeUnits:c,featureGrossValueMultipleOfExerciseStake:m,stakeLeverageRatio:round(leverage),breakEvenCompletionProbability:round(breakEvenP),breakEvenCompletionProbabilityPct:round(100*breakEvenP),mathematicallyPossible:breakEvenP<=1});}}
  rows.sort((a,b)=>a.breakEvenCompletionProbability-b.breakEvenCompletionProbability||a.buildNetCostInBuildStakeUnits-b.buildNetCostInBuildStakeUnits);
  return{version:VERSION,ok:true,buildStakeEUR:buildStake,exerciseStakeEUR:exerciseStake,stakeLeverageRatio:round(leverage),rows,execution:exec(),hardGuards:{syntheticFrontierOnly:true,featureValueMultipleIsNotOperatorFact:true,buildCostIsNotOperatorFact:true,completionProbabilityIsNotOperatorFact:true,ordinaryReturnsMustBeIncludedWhenEstimatingNetBuildCost:true,noAutomaticBetting:true,noWagerProbe:true}};
}

export function evaluateBoundedSharedStateCycle(input={}){
  const buildStake=n(input.buildStakeEUR),exerciseStake=n(input.exerciseStakeEUR),buildCostUpper=n(input.netBuildCostUpperBoundEUR),pLower=n(input.completionProbabilityLowerBound),featureFloor=n(input.featureGrossPayoutFloorEUR);
  if(!(buildStake>0)||!(exerciseStake>0))return{version:VERSION,ok:false,reason:'POSITIVE_STAKES_REQUIRED',execution:exec()};
  const base={version:VERSION,ok:true,inputs:{buildStakeEUR:buildStake,exerciseStakeEUR:exerciseStake,netBuildCostUpperBoundEUR:buildCostUpper,completionProbabilityLowerBound:pLower,featureGrossPayoutFloorEUR:featureFloor},execution:exec(),hardGuards:{allThreeEconomicBoundsRequired:true,boundsMustMatchExactCurrentOperatorBuild:true,lowerProbabilityMustBeProspectiveOrExact:true,featureFloorMustBeGuaranteedOrDefensible:true,buildCostMustIncludeResetsAndReturns:true,noAutomaticBetting:true,noWagerProbe:true}};
  if(buildCostUpper===null||pLower===null||featureFloor===null)return{...base,practiceVerdict:'WAIT_FOR_COMPLETE_CONSERVATIVE_BOUNDS'};
  if(buildCostUpper<0||pLower<0||pLower>1||featureFloor<0)return{version:VERSION,ok:false,reason:'INVALID_BOUND',execution:exec()};
  const evLower=-buildCostUpper-exerciseStake+pLower*featureFloor;
  return{...base,metrics:{cycleNetEvLowerBoundEUR:round(evLower),roiLowerBoundOnTotalCost:round(evLower/(buildCostUpper+exerciseStake))},practiceVerdict:evLower>0?'ROBUST_CONSERVATIVE_POSITIVE_SHARED_STATE_CYCLE':'NON_POSITIVE_CONSERVATIVE_SHARED_STATE_CYCLE'};
}

export function rankClosureLanes(lanes=[]){
  return (Array.isArray(lanes)?lanes:[]).map(l=>{
    const exact=!!l.exactCurrentOperatorRuleVerified,shared=!!l.stateSurvivesBetChange,triggerStake=!!l.featureUsesTriggeringOrCurrentStake;
    const leverage=(n(l.exerciseStakeEUR)>0&&n(l.buildStakeEUR)>0)?n(l.exerciseStakeEUR)/n(l.buildStakeEUR):null;
    const missing=Array.isArray(l.remainingGates)?l.remainingGates.length:99;
    let score=(exact?25:0)+(shared?25:0)+(triggerStake?20:0)+(leverage?Math.min(20,Math.log10(leverage)*10):0)+Math.max(0,10-missing);
    if(l.terminalVisibleState===true)score+=10;
    return{id:l.id||null,closureScore:round(score),stakeLeverageRatio:round(leverage),remainingGateCount:missing,execution:exec()};
  }).sort((a,b)=>b.closureScore-a.closureScore||a.remainingGateCount-b.remainingGateCount);
}

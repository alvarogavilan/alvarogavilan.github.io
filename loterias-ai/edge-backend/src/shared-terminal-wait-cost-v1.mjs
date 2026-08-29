const VERSION='shared-terminal-wait-cost-v1';
const EXEC=Object.freeze({decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0});
const n=v=>Number.isFinite(Number(v))?Number(v):null;
const r=(v,d=8)=>Number.isFinite(v)?Number(v.toFixed(d)):null;

export function evaluateTerminalWait(input={}){
  const stake=n(input.exerciseStakeEUR),p=n(input.completionProbabilityPerExerciseSpin),floorX=n(input.featureGrossFloorX),build=n(input.netBuildCostEUR)??0,lossRate=n(input.exerciseSpinNetLossRateLowerBound)??1;
  if(!(stake>0))return{version:VERSION,ok:false,reason:'POSITIVE_EXERCISE_STAKE_REQUIRED',execution:{...EXEC}};
  const base={version:VERSION,ok:true,inputs:{exerciseStakeEUR:stake,completionProbabilityPerExerciseSpin:p,featureGrossFloorX:floorX,netBuildCostEUR:build,exerciseSpinNetLossRateLowerBound:lossRate},execution:{...EXEC},hardGuards:{cannotKnowWinningSpinBeforeStake:true,lowStakeWaitingCanConsumeTerminalState:true,overallRtpCannotReplaceConditionalLossRate:true,completionProbabilityCannotBeInvented:true,featureFloorMustBeGuaranteed:true,noAutomaticBetting:true,noWagerProbe:true}};
  if(p===null||floorX===null)return{...base,practiceVerdict:'WAIT_FOR_PROBABILITY_AND_FEATURE_FLOOR'};
  if(!(p>0&&p<=1)||!(floorX>=0)||build<0||!(lossRate>=0&&lossRate<=1))return{version:VERSION,ok:false,reason:'INVALID_BOUND',execution:{...EXEC}};
  const expectedExerciseSpins=1/p;
  const conservativeWaitingCost=stake*lossRate*expectedExerciseSpins;
  const grossFeatureFloorEUR=stake*floorX;
  const evLower=grossFeatureFloorEUR-conservativeWaitingCost-build;
  return{...base,metrics:{expectedExerciseSpins:r(expectedExerciseSpins),conservativeWaitingCostEUR:r(conservativeWaitingCost),grossFeatureFloorEUR:r(grossFeatureFloorEUR),cycleEvLowerBoundEUR:r(evLower)},practiceVerdict:evLower>0?'ROBUST_POSITIVE_TERMINAL_WAIT_CYCLE':'NON_POSITIVE_TERMINAL_WAIT_CYCLE'};
}

export function breakEvenCompletionProbability({exerciseStakeEUR,featureGrossFloorX,netBuildCostEUR=0,exerciseSpinNetLossRateLowerBound=1}={}){
 const s=n(exerciseStakeEUR),f=n(featureGrossFloorX),b=n(netBuildCostEUR),l=n(exerciseSpinNetLossRateLowerBound);
 if(!(s>0)||!(f>0)||b===null||b<0||l===null||l<0)return null;
 const denom=f-b/s;
 if(!(denom>0))return{possible:false,breakEvenProbability:null,breakEvenProbabilityPct:null};
 return{possible:true,breakEvenProbability:r(l/denom),breakEvenProbabilityPct:r(100*l/denom)};
}

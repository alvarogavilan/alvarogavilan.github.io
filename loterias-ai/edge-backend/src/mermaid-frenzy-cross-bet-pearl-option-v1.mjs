const VERSION='mermaid-frenzy-cross-bet-pearl-option-v1';
const EXEC=Object.freeze({decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0});
const TIERS=Object.freeze({MINI:10,MINOR:20,MAJOR:50,MEGA:500});
const n=v=>Number.isFinite(Number(v))?Number(v):null;
const round=(v,d=8)=>Number.isFinite(v)?Number(v.toFixed(d)):null;
const exec=()=>({...EXEC});
function multiplier(v){const m=n(v);return Number.isInteger(m)&&m>=1&&m<=10?m:null;}
function tierX(name){return TIERS[String(name||'').toUpperCase()]??null;}
export function summarizeMermaidCrossBetLeverage(input={}){
  const m=multiplier(input.currentPearlMultiplier),build=n(input.buildStakeEUR),exercise=n(input.exerciseStakeEUR);
  if(m===null||!(build>0)||!(exercise>0))return{version:VERSION,ok:false,reason:'MULTIPLIER_1_TO_10_AND_POSITIVE_STAKES_REQUIRED',execution:exec()};
  const ratio=exercise/build;
  const jackpotValues={};for(const [tier,x] of Object.entries(TIERS))jackpotValues[tier]={buildStakeEUR:round(x*m*build),exerciseStakeEUR:round(x*m*exercise),upliftEUR:round(x*m*(exercise-build))};
  return{version:VERSION,ok:true,currentPearlMultiplier:m,buildStakeEUR:build,exerciseStakeEUR:exercise,stakeLeverageRatio:round(ratio),jackpotValues,structuralStateCrossBetLeverage:true,practiceVerdict:input.runtimeMultiplierSurvivalAcrossBetChangeVerified===true?'RUNTIME_CROSS_BET_STATE_CONFIRMED_RESEARCH':'WAIT_FOR_RUNTIME_CROSS_BET_STATE_CONFIRMATION',execution:exec(),hardGuards:{payoutScalingIsNotExpectedValue:true,runtimeSurvivalRequiredBeforeEconomicPromotion:true,transitionProbabilitiesNotInferred:true,noAutomaticBetting:true,noWagerProbe:true}};
}
export function screenMermaidPearlJackpotExercise(input={}){
  const m=multiplier(input.currentPearlMultiplier),stake=n(input.exerciseStakeEUR),x=tierX(input.minimumJackpotTier),p=n(input.probabilityWinningPearlCombinationContainsAtLeastTierNextSpin);
  if(m===null||!(stake>0)||x===null)return{version:VERSION,ok:false,reason:'MULTIPLIER_STAKE_AND_VALID_TIER_REQUIRED',execution:exec()};
  const awardFloor=x*m*stake,breakEven=1/(x*m);
  const base={version:VERSION,ok:true,mechanic:'ONE_SPIN_PEARL_JACKPOT_EVENT_LOWER_BOUND',inputs:{currentPearlMultiplier:m,exerciseStakeEUR:stake,minimumJackpotTier:String(input.minimumJackpotTier).toUpperCase(),tierBaseX:x,probabilityWinningPearlCombinationContainsAtLeastTierNextSpin:p},metrics:{jackpotAwardFloorEUR:round(awardFloor),breakEvenEventProbability:round(breakEven),breakEvenEventProbabilityPct:round(100*breakEven)},execution:exec(),hardGuards:{ordinarySpinReturnIgnored:true,cashPearlWinsIgnored:true,mermaidBonusValueIgnored:true,buildCostExcludedFromOneSpinOption:true,currentStateMustBeObserved:true,runtimeCrossBetSurvivalMustBeVerified:true,eventProbabilityCannotBeInvented:true,noAutomaticBetting:true,noWagerProbe:true}};
  if(input.exactCurrentMultiplierObserved!==true)return{...base,practiceVerdict:'WAIT_FOR_EXACT_CURRENT_MULTIPLIER_STATE'};
  if(input.runtimeMultiplierSurvivalAcrossBetChangeVerified!==true)return{...base,practiceVerdict:'WAIT_FOR_RUNTIME_CROSS_BET_STATE_CONFIRMATION'};
  if(p===null)return{...base,practiceVerdict:'WAIT_FOR_PROSPECTIVE_PEARL_JACKPOT_EVENT_PROBABILITY'};
  if(p<0||p>1)return{version:VERSION,ok:false,reason:'INVALID_EVENT_PROBABILITY',execution:exec()};
  const ev=-stake+p*awardFloor;
  return{...base,metrics:{...base.metrics,oneSpinNetEvLowerBoundEUR:round(ev)},practiceVerdict:ev>0?'CONSERVATIVE_POSITIVE_MERMAID_EXERCISE_CANDIDATE':'NON_POSITIVE_MERMAID_EXERCISE_LOWER_BOUND'};
}
export function screenMermaidBuildExerciseCycle(input={}){
  const exercise=screenMermaidPearlJackpotExercise({...input,exactCurrentMultiplierObserved:true,runtimeMultiplierSurvivalAcrossBetChangeVerified:true});
  const buildCost=n(input.expectedNetBuildCostEUR);
  if(!exercise.ok)return exercise;
  if(buildCost===null||buildCost<0)return{...exercise,practiceVerdict:'WAIT_FOR_EXACT_OR_PROSPECTIVE_BUILD_COST',cycleMetrics:null};
  if(input.buildTransitionKernelVerified!==true)return{...exercise,practiceVerdict:'WAIT_FOR_BUILD_TRANSITION_KERNEL',cycleMetrics:{expectedNetBuildCostEUR:round(buildCost)}};
  const p=n(input.probabilityWinningPearlCombinationContainsAtLeastTierNextSpin);
  if(p===null||p<0||p>1)return{...exercise,practiceVerdict:'WAIT_FOR_PROSPECTIVE_PEARL_JACKPOT_EVENT_PROBABILITY',cycleMetrics:{expectedNetBuildCostEUR:round(buildCost)}};
  const cycleEv=-buildCost-exercise.inputs.exerciseStakeEUR+p*exercise.metrics.jackpotAwardFloorEUR;
  return{...exercise,practiceVerdict:cycleEv>0?'CONSERVATIVE_POSITIVE_MERMAID_BUILD_EXERCISE_CYCLE_CANDIDATE':'NON_POSITIVE_MERMAID_CYCLE_LOWER_BOUND',cycleMetrics:{expectedNetBuildCostEUR:round(buildCost),cycleNetEvLowerBoundEUR:round(cycleEv)},hardGuards:{...exercise.hardGuards,buildCostMustIncludeResetsAndAllBuildReturns:true,buildProbabilityMustMatchCurrentServedConfig:true,cyclePositiveStillRequiresProspectiveValidation:true}};
}
export function mermaidStructuralThresholdTable({buildStakeEUR=0.20,exerciseStakeEUR=7.50}={}){
  const build=n(buildStakeEUR),exercise=n(exerciseStakeEUR);if(!(build>0&&exercise>0))return{version:VERSION,ok:false,reason:'POSITIVE_STAKES_REQUIRED',execution:exec()};
  const rows=[];for(let m=1;m<=10;m++)for(const [tier,x] of Object.entries(TIERS))rows.push({multiplier:m,tier,tierBaseX:x,buildStakeAwardEUR:round(x*m*build),exerciseStakeAwardEUR:round(x*m*exercise),breakEvenOneSpinEventProbabilityPct:round(100/(x*m))});
  return{version:VERSION,ok:true,buildStakeEUR:build,exerciseStakeEUR:exercise,stakeLeverageRatio:round(exercise/build),rows,execution:exec(),hardGuards:{thresholdsAreAlgebraNotProbabilities:true,noPositiveEvClaimWithoutTransitionEvidence:true}};
}
export const MERMAID_PEARL_JACKPOT_TIERS=TIERS;

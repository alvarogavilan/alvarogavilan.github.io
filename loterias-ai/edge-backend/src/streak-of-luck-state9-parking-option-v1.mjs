const VERSION='streak-of-luck-state9-parking-option-v1';
const EXEC=Object.freeze({decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0});
const n=v=>Number.isFinite(Number(v))?Number(v):null;
const round=(v,d=8)=>Number.isFinite(v)?Number(v.toFixed(d)):null;
const exec=()=>({...EXEC});
function exerciseEv({stake,jackpot,freeSpinFloor,pWin}){return -stake+pWin*jackpot+(1-pWin)*freeSpinFloor;}
export function evaluateState9ParkingOption(input={}){
  if(input.observedStreakState!==9)return{version:VERSION,ok:false,reason:'EXACT_OBSERVED_STATE_9_REQUIRED',execution:exec()};
  const stake=n(input.totalStakeEUR),jackpot=n(input.jackpotAwardFloorEUR),freeSpinFloor=n(input.sixtyFreeSpinsValueFloorEUR)??0,pWin=n(input.probabilityNextResultWinning),hazard=n(input.externalJackpotResetHazardPerPeriod),growth=n(input.jackpotGrowthEURPerPeriod),periods=Math.max(0,Math.floor(n(input.waitPeriods)??0)),resetValue=n(input.valueAfterExternalResetEUR)??0;
  if(!(stake>0)||!(jackpot>=0)||!(freeSpinFloor>=0)||pWin===null||hazard===null||growth===null||pWin<0||pWin>1||hazard<0||hazard>1||growth<0)return{version:VERSION,ok:false,reason:'EXACT_OR_HYPOTHESIS_ECONOMIC_INPUTS_REQUIRED',execution:exec()};
  const now=exerciseEv({stake,jackpot,freeSpinFloor,pWin}),survival=Math.pow(1-hazard,periods),futureJackpot=jackpot+growth*periods,exerciseFuture=exerciseEv({stake,jackpot:futureJackpot,freeSpinFloor,pWin}),wait=survival*exerciseFuture+(1-survival)*resetValue,best=Math.max(0,now,wait);
  const action=best===0?'ABANDON_OPTION':best===wait&&wait>now?'PARK_IN_PRACTICE':'EXERCISE_NOW_IN_PRACTICE';
  const onePeriodGrowthRequiredForWait=periods===1&&pWin>0&&1-hazard>0?Math.max(0,(now-(1-hazard)*now-hazard*resetValue)/((1-hazard)*pWin)):null;
  return{version:VERSION,ok:true,practiceVerdict:action,inputs:{totalStakeEUR:stake,jackpotAwardFloorEUR:jackpot,sixtyFreeSpinsValueFloorEUR:freeSpinFloor,probabilityNextResultWinning:pWin,externalJackpotResetHazardPerPeriod:hazard,jackpotGrowthEURPerPeriod:growth,waitPeriods:periods,valueAfterExternalResetEUR:resetValue},metrics:{exerciseNowNetEvEUR:round(now),survivalProbability:round(survival),futureJackpotFloorEUR:round(futureJackpot),exerciseAfterWaitNetEvIfSurvivesEUR:round(exerciseFuture),waitOptionExpectedValueEUR:round(wait),bestPracticeOptionValueEUR:round(best),onePeriodJackpotGrowthRequiredToPreferWaitEUR:round(onePeriodGrowthRequiredForWait)},execution:exec(),hardGuards:{state9MustBeObserved:true,externalResetHazardCannotBeAssumedZero:true,waitPeriodMustHaveDefinedTimeUnit:true,growthAndHazardMustUseSamePeriod:true,secondaryHitFrequencyCannotPopulatePWin:true,paylineCountConflictBlocksStakeDerivation:true,noAutomaticBetting:true,noWagerProbe:true,practiceDecisionDoesNotAuthorizeRealPlay:true}};
}
export function sweepState9ParkingSensitivity(input={}){
  const pWins=input.pWins||[0.05,0.10,0.20,0.30,0.40],hazards=input.hazards||[0,0.01,0.05,0.10,0.25],growths=input.growthsEUR||[0,1,5,10,25,50],rows=[];
  for(const p of pWins)for(const h of hazards)for(const g of growths){const r=evaluateState9ParkingOption({...input,observedStreakState:9,probabilityNextResultWinning:p,externalJackpotResetHazardPerPeriod:h,jackpotGrowthEURPerPeriod:g,waitPeriods:input.waitPeriods??1});rows.push({pWin:p,resetHazard:h,growthEUR:g,verdict:r.practiceVerdict,exerciseNowNetEvEUR:r.metrics?.exerciseNowNetEvEUR??null,waitOptionExpectedValueEUR:r.metrics?.waitOptionExpectedValueEUR??null,growthRequiredEUR:r.metrics?.onePeriodJackpotGrowthRequiredToPreferWaitEUR??null});}
  return{version:VERSION,ok:true,rows,execution:exec(),hardGuards:{sensitivityIsNotOperatorFact:true,noRealMoneyAuthorization:true}};
}

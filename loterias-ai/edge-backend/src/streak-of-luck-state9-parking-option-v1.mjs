const VERSION='streak-of-luck-state9-parking-option-v1.1-bonus-dice-guard';
const EXEC=Object.freeze({decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0});
const n=v=>Number.isFinite(Number(v))?Number(v):null;
const round=(v,d=8)=>Number.isFinite(v)?Number(v.toFixed(d)):null;
const exec=()=>({...EXEC});
function exerciseEv({stake,jackpot,freeSpinFloor,pJackpot}){return -stake+pJackpot*jackpot+(1-pJackpot)*freeSpinFloor;}
export function evaluateState9ParkingOption(input={}){
  if(input.observedStreakState!==9)return{version:VERSION,ok:false,reason:'EXACT_OBSERVED_STATE_9_REQUIRED',execution:exec()};
  const resolved=input.bonusDiceSequencingResolved===true;
  const stake=n(input.totalStakeEUR),jackpot=n(input.jackpotAwardFloorEUR),freeSpinFloor=n(input.sixtyFreeSpinsValueFloorEUR)??0,pJackpot=n(input.probabilityJackpotBeforeState9TerminalLoss??input.probabilityNextResultWinning),hazard=n(input.externalJackpotResetHazardPerPeriod),growth=n(input.jackpotGrowthEURPerPeriod),periods=Math.max(0,Math.floor(n(input.waitPeriods)??0)),resetValue=n(input.valueAfterExternalResetEUR)??0;
  const base={version:VERSION,ok:true,inputs:{observedStreakState:9,bonusDiceSequencingResolved:resolved},execution:exec(),hardGuards:{state9MustBeObserved:true,bonusDiceWinningResultsCountTowardStreak:true,bonusDiceSequencingMustBeResolvedBeforeParkingEconomics:true,externalResetHazardCannotBeAssumedZero:true,waitPeriodMustHaveDefinedTimeUnit:true,growthAndHazardMustUseSamePeriod:true,secondaryHitFrequencyCannotPopulateTerminalProbability:true,paylineCountConflictBlocksStakeDerivation:true,noAutomaticBetting:true,noWagerProbe:true,practiceDecisionDoesNotAuthorizeRealPlay:true}};
  if(!resolved)return{...base,practiceVerdict:'BLOCKED_BONUS_DICE_SEQUENCE_UNRESOLVED'};
  if(!(stake>0)||!(jackpot>=0)||!(freeSpinFloor>=0)||pJackpot===null||hazard===null||growth===null||pJackpot<0||pJackpot>1||hazard<0||hazard>1||growth<0)return{...base,ok:false,reason:'EXACT_OR_HYPOTHESIS_ECONOMIC_INPUTS_REQUIRED'};
  const now=exerciseEv({stake,jackpot,freeSpinFloor,pJackpot}),survival=Math.pow(1-hazard,periods),futureJackpot=jackpot+growth*periods,exerciseFuture=exerciseEv({stake,jackpot:futureJackpot,freeSpinFloor,pJackpot}),wait=survival*exerciseFuture+(1-survival)*resetValue,best=Math.max(0,now,wait);
  const action=best===0?'ABANDON_OPTION':best===wait&&wait>now?'PARK_IN_PRACTICE':'EXERCISE_NOW_IN_PRACTICE';
  const onePeriodGrowthRequiredForWait=periods===1&&pJackpot>0&&1-hazard>0?Math.max(0,(now-(1-hazard)*now-hazard*resetValue)/((1-hazard)*pJackpot)):null;
  return{...base,practiceVerdict:action,inputs:{...base.inputs,totalStakeEUR:stake,jackpotAwardFloorEUR:jackpot,sixtyFreeSpinsValueFloorEUR:freeSpinFloor,probabilityJackpotBeforeState9TerminalLoss:pJackpot,externalJackpotResetHazardPerPeriod:hazard,jackpotGrowthEURPerPeriod:growth,waitPeriods:periods,valueAfterExternalResetEUR:resetValue},metrics:{exerciseNowNetEvEUR:round(now),survivalProbability:round(survival),futureJackpotFloorEUR:round(futureJackpot),exerciseAfterWaitNetEvIfSurvivesEUR:round(exerciseFuture),waitOptionExpectedValueEUR:round(wait),bestPracticeOptionValueEUR:round(best),onePeriodJackpotGrowthRequiredToPreferWaitEUR:round(onePeriodGrowthRequiredForWait)}};
}
export function sweepState9ParkingSensitivity(input={}){
  if(input.bonusDiceSequencingResolved!==true)return{version:VERSION,ok:true,practiceVerdict:'BLOCKED_BONUS_DICE_SEQUENCE_UNRESOLVED',rows:[],execution:exec(),hardGuards:{sensitivityCannotBypassBonusDiceGuard:true}};
  const probabilities=input.terminalJackpotProbabilities||input.pWins||[0.05,0.10,0.20,0.30,0.40],hazards=input.hazards||[0,0.01,0.05,0.10,0.25],growths=input.growthsEUR||[0,1,5,10,25,50],rows=[];
  for(const p of probabilities)for(const h of hazards)for(const g of growths){const r=evaluateState9ParkingOption({...input,observedStreakState:9,probabilityJackpotBeforeState9TerminalLoss:p,externalJackpotResetHazardPerPeriod:h,jackpotGrowthEURPerPeriod:g,waitPeriods:input.waitPeriods??1});rows.push({terminalJackpotProbability:p,resetHazard:h,growthEUR:g,verdict:r.practiceVerdict,exerciseNowNetEvEUR:r.metrics?.exerciseNowNetEvEUR??null,waitOptionExpectedValueEUR:r.metrics?.waitOptionExpectedValueEUR??null,growthRequiredEUR:r.metrics?.onePeriodJackpotGrowthRequiredToPreferWaitEUR??null});}
  return{version:VERSION,ok:true,rows,execution:exec(),hardGuards:{sensitivityIsNotOperatorFact:true,noRealMoneyAuthorization:true,bonusDiceSequencingResolvedRequired:true}};
}

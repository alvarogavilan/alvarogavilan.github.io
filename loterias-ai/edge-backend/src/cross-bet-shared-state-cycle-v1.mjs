const VERSION='cross-bet-shared-state-cycle-v1';
const EXEC=Object.freeze({decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0});
const n=v=>Number.isFinite(Number(v))?Number(v):null;
const round=(v,d=8)=>Number.isFinite(v)?Number(v.toFixed(d)):null;
const exec=()=>({...EXEC});

export function screenSharedStateCycle(input={}){
  const build=n(input.buildStakeEUR),exercise=n(input.exerciseStakeEUR),buildCostUnits=n(input.expectedNetBuildCostInBuildStakeUnits),exerciseGainUnits=n(input.expectedNetExerciseGainInExerciseStakeUnits);
  if(input.exactCurrentOperatorRuleVerified!==true||input.stateSurvivesBetChange!==true||input.stateDependentAwardUsesCurrentOrTriggerStake!==true)return{version:VERSION,ok:false,classification:'STRUCTURAL_RULE_GATE_UNCLOSED',execution:exec()};
  if(!(build>0)||!(exercise>0))return{version:VERSION,ok:false,classification:'POSITIVE_BUILD_AND_EXERCISE_STAKES_REQUIRED',execution:exec()};
  const leverage=exercise/build;
  const base={version:VERSION,ok:true,classification:'STRUCTURAL_SHARED_STATE_LEVERAGE_UNCLOSED',metrics:{buildStakeEUR:round(build),exerciseStakeEUR:round(exercise),stakeLeverageRatio:round(leverage)},execution:exec(),hardGuards:{positiveEvNotProvenByLeverage:true,buildCostMustIncludeAllReturnsAndResets:true,exerciseGainMustBeNetOfExerciseStake:true,probabilitiesCannotBeInvented:true,prospectiveValidationRequired:true,noWagerProbe:true,noAutomaticBetting:true}};
  if(buildCostUnits===null||exerciseGainUnits===null)return base;
  if(buildCostUnits<0)return{...base,classification:'INVALID_BUILD_COST'};
  if(exerciseGainUnits<=0)return{...base,classification:'NON_POSITIVE_EXERCISE_VALUE',metrics:{...base.metrics,expectedNetBuildCostEUR:round(build*buildCostUnits),expectedNetExerciseGainEUR:round(exercise*exerciseGainUnits),cycleNetEvEUR:round(exercise*exerciseGainUnits-build*buildCostUnits)}};
  const breakEvenLeverage=buildCostUnits/exerciseGainUnits;
  const cycleEv=exercise*exerciseGainUnits-build*buildCostUnits;
  return{...base,classification:cycleEv>0?'POSITIVE_CYCLE_MATH_REQUIRES_PROSPECTIVE_VALIDATION':'NON_POSITIVE_CYCLE_MATH',metrics:{...base.metrics,expectedNetBuildCostEUR:round(build*buildCostUnits),expectedNetExerciseGainEUR:round(exercise*exerciseGainUnits),breakEvenStakeLeverageRatio:round(breakEvenLeverage),cycleNetEvEUR:round(cycleEv)},execution:exec()};
}

export function screenTerminalIndicatorLeverage(input={}){
  const filled=n(input.indicatorsFilled),total=n(input.totalIndicators)??5,build=n(input.buildStakeEUR),exercise=n(input.exerciseStakeEUR),p=n(input.probabilityTerminalCompletionNextSpin),featureFloorX=n(input.featurePayoutFloorX);
  if(input.exactCurrentOperatorRuleVerified!==true||input.stateSurvivesBetChange!==true||input.featureUsesTriggeringSpinStake!==true)return{version:VERSION,ok:false,classification:'TERMINAL_RULE_GATE_UNCLOSED',execution:exec()};
  if(!Number.isInteger(filled)||!Number.isInteger(total)||total<2||filled<0||filled>=total||!(build>0)||!(exercise>0))return{version:VERSION,ok:false,classification:'VALID_TERMINAL_STATE_AND_STAKES_REQUIRED',execution:exec()};
  const needed=total-filled,leverage=exercise/build;
  const base={version:VERSION,ok:true,classification:needed===1?'ONE_EVENT_FROM_SHARED_STATE_TERMINAL_TRIGGER':'MULTI_EVENT_FROM_TERMINAL_TRIGGER',metrics:{indicatorsFilled:filled,totalIndicators:total,indicatorsNeeded:needed,buildStakeEUR:round(build),exerciseStakeEUR:round(exercise),stakeLeverageRatio:round(leverage)},execution:exec(),hardGuards:{terminalProximityIsNotPositiveEv:true,featurePayoutFloorMustBeExactOrConservative:true,completionProbabilityMustBeExactOrProspectiveLowerBound:true,ordinarySpinReturnIgnoredInFloorScreen:true,buildCostExcludedFromOneSpinScreen:true,noWagerProbe:true,noAutomaticBetting:true}};
  if(p===null||featureFloorX===null)return base;
  if(p<0||p>1||featureFloorX<0)return{...base,classification:'INVALID_PROBABILITY_OR_FEATURE_FLOOR'};
  const oneSpinEvFloor=-exercise+p*featureFloorX*exercise;
  return{...base,classification:oneSpinEvFloor>0?'POSITIVE_TERMINAL_ONE_SPIN_FLOOR_REQUIRES_PROSPECTIVE_VALIDATION':'NON_POSITIVE_TERMINAL_ONE_SPIN_FLOOR',metrics:{...base.metrics,probabilityTerminalCompletionNextSpin:round(p),featurePayoutFloorX:round(featureFloorX),breakEvenCompletionProbability:featureFloorX>0?round(1/featureFloorX):null,oneSpinNetEvFloorEUR:round(oneSpinEvFloor)},execution:exec()};
}

export function rankSharedStateFrontier(rows=[]){
  return rows.map((r,index)=>{const result=r.terminal===true?screenTerminalIndicatorLeverage(r):screenSharedStateCycle(r);const exact=result.ok===true?1:0;const terminal=result.classification==='ONE_EVENT_FROM_SHARED_STATE_TERMINAL_TRIGGER'?1:0;const leverage=result.metrics?.stakeLeverageRatio??0;const score=exact*1000+terminal*500+Math.min(leverage,500);return{index,id:r.id||`lane-${index+1}`,score:round(score),result};}).sort((a,b)=>b.score-a.score||a.index-b.index);
}

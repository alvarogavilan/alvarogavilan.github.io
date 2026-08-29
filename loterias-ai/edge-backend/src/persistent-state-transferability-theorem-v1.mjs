const VERSION='persistent-state-transferability-theorem-v1';
const EXEC=Object.freeze({decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0});
const n=v=>Number.isFinite(Number(v))?Number(v):null;
const round=(v,d=8)=>Number.isFinite(v)?Number(v.toFixed(d)):null;
const exec=()=>({...EXEC});

export function classifyPersistentStateTransferability(input={}){
  if(input.exactCurrentOperatorRuleVerified!==true)return{version:VERSION,ok:false,classification:'UNVERIFIED_STATE_MECHANIC',reason:'EXACT_CURRENT_OPERATOR_RULE_REQUIRED',execution:exec()};
  const shared=input.stateSharedAcrossBetSizes===true;
  const separate=input.stateSavedSeparatelyPerBet===true;
  const scales=input.stateDependentPayoutScalesWithCurrentBet===true;
  const build=n(input.buildStakeEUR),exercise=n(input.exerciseStakeEUR);
  if(shared&&separate)return{version:VERSION,ok:false,classification:'CONTRADICTORY_STATE_SCOPE',reason:'STATE_CANNOT_BE_BOTH_SHARED_AND_SEPARATE_WITHOUT_EXPLICIT_SUBSTATE_DEFINITION',execution:exec()};
  if(shared&&scales){
    const ratio=build>0&&exercise>0?exercise/build:null;
    return{version:VERSION,ok:true,classification:ratio!==null&&ratio>1?'REAL_CROSS_BET_STATE_LEVERAGE':'CROSS_BET_STATE_WITHOUT_UPWARD_STAKE_LEVERAGE',stakeLeverageRatio:round(ratio),execution:exec(),hardGuards:{positiveEvNotProven:true,transitionKernelStillRequired:true,buildCostStillRequired:true,runtimeStateSurvivalStillRequired:true}};
  }
  if(separate)return{version:VERSION,ok:true,classification:'CONDITIONAL_STATE_ONLY_NO_CROSS_BET_LEVERAGE',stakeLeverageRatio:null,execution:exec(),hardGuards:{favorableStateCanHavePositiveConditionalEv:true,repeatableCycleEdgeNotEstablished:true,allBuildCostsMustBeCounted:true,externalOrPreexistingStateCannotBeAssumed:true}};
  return{version:VERSION,ok:true,classification:'PERSISTENCE_SCOPE_INCOMPLETE',execution:exec(),hardGuards:{positiveEvNotProven:true}};
}

export function rankPersistentStateMechanisms(rows=[]){
  const weight={REAL_CROSS_BET_STATE_LEVERAGE:100,CROSS_BET_STATE_WITHOUT_UPWARD_STAKE_LEVERAGE:75,CONDITIONAL_STATE_ONLY_NO_CROSS_BET_LEVERAGE:45,PERSISTENCE_SCOPE_INCOMPLETE:25,UNVERIFIED_STATE_MECHANIC:10,CONTRADICTORY_STATE_SCOPE:0};
  return rows.map((r,index)=>{const result=classifyPersistentStateTransferability(r);return{index,id:r.id||`state-${index+1}`,score:weight[result.classification]??0,result};}).sort((a,b)=>b.score-a.score||a.index-b.index);
}

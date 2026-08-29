const VERSION='streak-of-luck-state-ev-lab-v1';
const EXEC=Object.freeze({decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0});
const n=v=>Number.isFinite(Number(v))?Number(v):null;
const round=(v,d=8)=>Number.isFinite(v)?Number(v.toFixed(d)):null;
function fail(reason,extra={}){return{version:VERSION,ok:false,reason,...extra,execution:{...EXEC}};}
export function solveAcyclicStreakKernel(input={}){
  const states=input.states||{}; const maxState=Math.max(...Object.keys(states).map(Number).filter(Number.isInteger));
  if(!Number.isInteger(maxState)||maxState<0||maxState>9)return fail('STATES_0_TO_9_REQUIRED');
  const values={}; const rows=[];
  for(let s=maxState;s>=0;s--){
    const cfg=states[s]??states[String(s)]; if(!cfg)continue;
    const stake=n(cfg.paidStakeEUR); const branches=Array.isArray(cfg.branches)?cfg.branches:[];
    if(!(stake>0)||!branches.length)return fail('STAKE_AND_BRANCHES_REQUIRED',{state:s});
    let ps=0,ev=-stake;
    for(const b of branches){
      const p=n(b.probability),ret=n(b.immediateReturnEUR)??0,award=n(b.terminalAwardEUR)??0;
      if(p===null||p<0||p>1||ret<0||award<0)return fail('INVALID_BRANCH',{state:s});
      ps+=p; let future=0;
      if(b.terminal!==true&&b.nextState!==null&&b.nextState!==undefined){
        const ns=Number(b.nextState);
        if(!Number.isInteger(ns)||ns<=s||ns>9)return fail('KERNEL_MUST_ADVANCE_OR_TERMINATE',{state:s,nextState:b.nextState});
        if(values[ns]===undefined)return fail('NEXT_STATE_MISSING',{state:s,nextState:ns});
        future=values[ns];
      }
      ev+=p*(ret+award+future);
    }
    if(Math.abs(ps-1)>1e-9)return fail('BRANCH_PROBABILITIES_MUST_SUM_TO_1',{state:s,probabilitySum:ps});
    const value=Math.max(0,ev); values[s]=value; rows.push({state:s,continueEvEUR:round(ev),optimalIncrementalStateValueEUR:round(value),decision:value>0?'CONTINUE_IN_PRACTICE_MODEL':'STOP_IN_PRACTICE_MODEL'});
  }
  rows.sort((a,b)=>a.state-b.state);
  return{version:VERSION,ok:true,rows,stateValuesEUR:Object.fromEntries(Object.entries(values).map(([k,v])=>[k,round(v)])),bestState:rows.reduce((best,r)=>!best||r.optimalIncrementalStateValueEUR>best.optimalIncrementalStateValueEUR?r:best,null),execution:{...EXEC},hardGuards:{kernelMustComeFromExactCurrentMathOrProspectiveMeasurement:true,syntheticKernelNeverBecomesOperatorFact:true,modelValuesExistingPrivateStateOnly:true,crossPlayerInheritanceNotAssumed:true,bonusDiceMustBeRepresentedInsideBranches:true}};
}
export function rankBetLevelStates(levels=[]){
  const rows=[];
  for(const level of levels){
    const r=solveAcyclicStreakKernel(level.kernel||{});
    const observed=Number.isInteger(Number(level.observedStreakState))?Number(level.observedStreakState):null;
    rows.push({id:level.id??null,lineBetEUR:n(level.lineBetEUR),observedStreakState:observed,ok:r.ok,stateValueEUR:r.ok&&observed!==null?r.stateValuesEUR[observed]??null:null,result:r});
  }
  rows.sort((a,b)=>(b.stateValueEUR??-Infinity)-(a.stateValueEUR??-Infinity));
  return{version:VERSION,rows,execution:{...EXEC}};
}

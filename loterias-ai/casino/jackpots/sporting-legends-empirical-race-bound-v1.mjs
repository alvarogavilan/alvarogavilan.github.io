const finite=(v)=>Number.isFinite(Number(v))?Number(v):null;

function logChoose(n,k){
  const m=Math.min(k,n-k);
  let out=0;
  for(let i=1;i<=m;i++)out+=Math.log(n-m+i)-Math.log(i);
  return out;
}

function binomialUpperTail(n,k,p){
  if(k<=0)return 1;
  if(k>n)return 0;
  if(p<=0)return 0;
  if(p>=1)return 1;
  const lp=logChoose(n,k)+k*Math.log(p)+(n-k)*Math.log1p(-p);
  let term=Math.exp(lp),sum=term;
  for(let i=k;i<n;i++){
    term*=((n-i)/(i+1))*(p/(1-p));
    sum+=term;
    if(!Number.isFinite(sum))return 1;
  }
  return Math.min(1,Math.max(0,sum));
}

export function deriveProspectiveEmpiricalRaceLowerBound({
  successfulDryRunCycles,
  totalDryRunCycles,
  confidence=0.95,
  prospectiveProtocolFrozen=false,
  comparableCycleDefinitionVerified=false,
}={}){
  const k=finite(successfulDryRunCycles),n=finite(totalDryRunCycles),c=finite(confidence);
  const guards={
    researchOnly:true,
    noPoissonStationarityAssumption:true,
    prospectiveProtocolMustBeFrozenBeforeObservations:true,
    cyclesMustUseSameEligibilityAndLatencyDefinition:true,
    passiveDryRunsOnly:true,
    noAutomaticWagering:true,
    realMoneyAllowed:false,
  };
  const fail=(reason,extra={})=>({version:'sporting-legends-empirical-race-bound-v1',valid:false,usableForExecution:false,reason,guards,...extra});
  if(!Number.isInteger(n)||n<1)return fail('INVALID_TRIAL_COUNT');
  if(!Number.isInteger(k)||k<0||k>n)return fail('INVALID_SUCCESS_COUNT');
  if(!(c>0&&c<1))return fail('INVALID_CONFIDENCE');
  if(prospectiveProtocolFrozen!==true)return fail('PROSPECTIVE_PROTOCOL_NOT_FROZEN');
  if(comparableCycleDefinitionVerified!==true)return fail('CYCLE_COMPARABILITY_NOT_VERIFIED');

  const alpha=1-c;
  let lower=0;
  if(k>0){
    let lo=0,hi=1;
    for(let i=0;i<80;i++){
      const mid=(lo+hi)/2;
      const tail=binomialUpperTail(n,k,mid);
      if(tail>alpha)hi=mid; else lo=mid;
    }
    lower=(lo+hi)/2;
  }
  return {
    version:'sporting-legends-empirical-race-bound-v1',
    valid:true,
    reason:'PROSPECTIVE_CLOPPER_PEARSON_LOWER_BOUND_AVAILABLE',
    method:'ONE_SIDED_CLOPPER_PEARSON_BINOMIAL',
    successfulDryRunCycles:k,
    totalDryRunCycles:n,
    confidence:c,
    firstBetRaceProbabilityLowerBound:lower,
    prospectiveProtocolFrozen:true,
    comparableCycleDefinitionVerified:true,
    usableForExecution:true,
    guards,
  };
}

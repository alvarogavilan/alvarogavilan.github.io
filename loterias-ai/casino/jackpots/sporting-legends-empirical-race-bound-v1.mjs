const finite=(v)=>{if(v===null||v===undefined||v===''||typeof v==='boolean')return null;const n=Number(v);return Number.isFinite(n)?n:null;};
const text=(v)=>typeof v==='string'&&v.trim()?v.trim():null;
const VALIDATOR_VERSIONS=new Set(['sporting-legends-passive-race-cycle-v1','bet365-sporting-passive-race-cycle-v1']);
function logChoose(n,k){const m=Math.min(k,n-k);let out=0;for(let i=1;i<=m;i++)out+=Math.log(n-m+i)-Math.log(i);return out;}
function binomialUpperTail(n,k,p){if(k<=0)return 1;if(k>n)return 0;if(p<=0)return 0;if(p>=1)return 1;const lp=logChoose(n,k)+k*Math.log(p)+(n-k)*Math.log1p(-p);let term=Math.exp(lp),sum=term;for(let i=k;i<n;i++){term*=((n-i)/(i+1))*(p/(1-p));sum+=term;if(!Number.isFinite(sum))return 1;}return Math.min(1,Math.max(0,sum));}
function cpLower(n,k,c){const alpha=1-c;if(k<=0)return 0;let lo=0,hi=1;for(let i=0;i<80;i++){const mid=(lo+hi)/2;const tail=binomialUpperTail(n,k,mid);if(tail>alpha)hi=mid;else lo=mid;}return (lo+hi)/2;}

export function deriveProspectiveEmpiricalRaceLowerBound({successfulDryRunCycles,totalDryRunCycles,confidence=0.95,prospectiveProtocolFrozen=false,comparableCycleDefinitionVerified=false}={}){
  const k=finite(successfulDryRunCycles),n=finite(totalDryRunCycles),c=finite(confidence);
  const guards={researchOnly:true,aggregatedCountsCannotAuthorizeExecution:true,noPoissonStationarityAssumption:true,clopperPearsonRequiresBinomialSamplingAssumption:true,passiveDryRunsOnly:true,noAutomaticWagering:true,realMoneyAllowed:false};
  const fail=(reason,extra={})=>({version:'sporting-legends-empirical-race-bound-v1.2-explicit-binomial-assumptions',valid:false,usableForExecution:false,reason,guards,...extra});
  if(!Number.isInteger(n)||n<1)return fail('INVALID_TRIAL_COUNT');if(!Number.isInteger(k)||k<0||k>n)return fail('INVALID_SUCCESS_COUNT');if(!(c>0&&c<1))return fail('INVALID_CONFIDENCE');if(prospectiveProtocolFrozen!==true)return fail('PROSPECTIVE_PROTOCOL_NOT_FROZEN');if(comparableCycleDefinitionVerified!==true)return fail('CYCLE_COMPARABILITY_NOT_VERIFIED');
  return {version:'sporting-legends-empirical-race-bound-v1.2-explicit-binomial-assumptions',valid:true,usableForExecution:false,reason:'AGGREGATED_COUNTS_RESEARCH_ONLY',method:'ONE_SIDED_CLOPPER_PEARSON_BINOMIAL',source:'AGGREGATED_COUNTS_ONLY',successfulDryRunCycles:k,totalDryRunCycles:n,confidence:c,firstBetRaceProbabilityLowerBound:cpLower(n,k,c),prospectiveProtocolFrozen:true,comparableCycleDefinitionVerified:true,guards};
}

export function deriveProspectiveEmpiricalRaceLowerBoundFromValidatedCycles({
  cycles,confidence=0.95,protocolId,actionLatencySeconds,prospectiveProtocolFrozen=false,
  binomialIidAssumptionJustified=false,completeProspectiveCycleLedgerVerified=false,
  currentCycleExchangeabilityVerified=false,assumptionEvidenceId=null,
}={}){
  const list=Array.isArray(cycles)?cycles:[];const c=finite(confidence),pid=text(protocolId),latency=finite(actionLatencySeconds),assumptionEvidence=text(assumptionEvidenceId);
  const guards={validatedPassiveCycleLedgerRequired:true,uniqueCycleIdsRequired:true,singleValidatorVersionPerLedgerRequired:true,bet365CyclesRequireBet365RuleAndEligibilityClosure:true,noPoissonStationarityAssumption:true,clopperPearsonRequiresBinomialIidOrEquivalentSamplingModel:true,completeProspectiveLedgerRequiredForExecution:true,currentCycleExchangeabilityRequiredForExecution:true,assumptionEvidenceRequiredForExecution:true,noAutomaticWagering:true,realMoneyAllowed:false};
  const fail=(reason,extra={})=>({version:'sporting-legends-empirical-race-bound-v1.2-explicit-binomial-assumptions',valid:false,usableForExecution:false,reason,guards,...extra});
  if(!pid)return fail('MISSING_PROTOCOL_ID');if(!(latency>0))return fail('INVALID_ACTION_LATENCY');if(!(c>0&&c<1))return fail('INVALID_CONFIDENCE');if(prospectiveProtocolFrozen!==true)return fail('PROSPECTIVE_PROTOCOL_NOT_FROZEN');if(list.length<1)return fail('NO_VALIDATED_CYCLES');
  const ids=new Set(),validatorVersions=new Set();let k=0;
  for(const x of list){
    const validatorVersion=text(x?.validatorVersion);
    if(!x||x.valid!==true||x.usableForRaceEvidence!==true||!VALIDATOR_VERSIONS.has(validatorVersion)||x.passiveDryRun!==true||x.prospectivelyObserved!==true||x.comparableCycleDefinitionVerified!==true)return fail('INVALID_CYCLE_EVIDENCE');
    validatorVersions.add(validatorVersion);
    if(validatorVersion==='bet365-sporting-passive-race-cycle-v1'){
      if(x.operator!=='bet365 Spain'||x.servedTenCentJackpotEligibilityVerified!==true||x.bet365FirstBetFollowingDayRuleVerified!==true)return fail('BET365_CYCLE_OPERATOR_GATES_NOT_CLOSED');
    }
    const id=text(x.cycleId);if(!id||ids.has(id))return fail('MISSING_OR_DUPLICATE_CYCLE_ID');ids.add(id);
    if(text(x.protocolId)!==pid)return fail('PROTOCOL_ID_MISMATCH');if(finite(x.actionLatencySeconds)!==latency)return fail('ACTION_LATENCY_MISMATCH');
    if(x.outcome!=='SUCCESS'&&x.outcome!=='FAILURE')return fail('INVALID_CYCLE_OUTCOME');if(x.outcome==='SUCCESS')k++;
  }
  if(validatorVersions.size!==1)return fail('MIXED_CYCLE_VALIDATOR_VERSIONS_FORBIDDEN',{validatorVersions:[...validatorVersions]});
  const validatorVersion=[...validatorVersions][0],n=list.length,pLower=cpLower(n,k,c);
  const assumptions={
    binomialIidAssumptionJustified:binomialIidAssumptionJustified===true,
    completeProspectiveCycleLedgerVerified:completeProspectiveCycleLedgerVerified===true,
    currentCycleExchangeabilityVerified:currentCycleExchangeabilityVerified===true,
    assumptionEvidenceId:assumptionEvidence,
  };
  const executionAssumptionsClosed=assumptions.binomialIidAssumptionJustified&&assumptions.completeProspectiveCycleLedgerVerified&&assumptions.currentCycleExchangeabilityVerified&&!!assumptionEvidence;
  return {
    version:'sporting-legends-empirical-race-bound-v1.2-explicit-binomial-assumptions',valid:true,
    usableForExecution:executionAssumptionsClosed,
    reason:executionAssumptionsClosed?'VALIDATED_PASSIVE_CYCLE_CLOPPER_PEARSON_BOUND_AVAILABLE':'BINOMIAL_EXECUTION_ASSUMPTIONS_NOT_VERIFIED',
    method:'ONE_SIDED_CLOPPER_PEARSON_BINOMIAL',source:'VALIDATED_PASSIVE_CYCLE_LEDGER',validatorVersion,protocolId:pid,actionLatencySeconds:latency,cycleIds:[...ids],successfulDryRunCycles:k,totalDryRunCycles:n,confidence:c,firstBetRaceProbabilityLowerBound:pLower,prospectiveProtocolFrozen:true,comparableCycleDefinitionVerified:true,executionAssumptionsClosed,assumptions,guards,
  };
}

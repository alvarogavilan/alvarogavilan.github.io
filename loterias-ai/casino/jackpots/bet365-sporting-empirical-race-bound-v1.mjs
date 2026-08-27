const finite=v=>{if(v===null||v===undefined||v===''||typeof v==='boolean')return null;const n=Number(v);return Number.isFinite(n)?n:null;};
const text=v=>typeof v==='string'&&v.trim()?v.trim():null;
function logChoose(n,k){const m=Math.min(k,n-k);let out=0;for(let i=1;i<=m;i++)out+=Math.log(n-m+i)-Math.log(i);return out;}
function binomialUpperTail(n,k,p){if(k<=0)return 1;if(k>n)return 0;if(p<=0)return 0;if(p>=1)return 1;const lp=logChoose(n,k)+k*Math.log(p)+(n-k)*Math.log1p(-p);let term=Math.exp(lp),sum=term;for(let i=k;i<n;i++){term*=((n-i)/(i+1))*(p/(1-p));sum+=term;if(!Number.isFinite(sum))return 1;}return Math.min(1,Math.max(0,sum));}
function cpLower(n,k,c){const alpha=1-c;if(k<=0)return 0;let lo=0,hi=1;for(let i=0;i<80;i++){const mid=(lo+hi)/2;const tail=binomialUpperTail(n,k,mid);if(tail>alpha)hi=mid;else lo=mid;}return (lo+hi)/2;}
function execution(){return {decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0};}
function fail(reason,extra={}){return {version:'bet365-sporting-empirical-race-bound-v1',valid:false,usableForExecution:false,reason,execution:execution(),guards:{validatedBet365PassiveCycleLedgerRequired:true,uniqueCycleIdsRequired:true,exactSameProtocolAndLatencyRequired:true,completeProspectiveLedgerRequiredForExecution:true,binomialSamplingAssumptionRequired:true,currentCycleExchangeabilityRequired:true,independentAssumptionEvidenceRequired:true,noAutomaticWagering:true,realMoneyAllowed:false},...extra};}

export function deriveBet365SportingEmpiricalRaceLowerBound({
  cycles,confidence=0.95,protocolId,actionLatencySeconds,prospectiveProtocolFrozen=false,
  binomialIidAssumptionJustified=false,completeProspectiveCycleLedgerVerified=false,
  currentCycleExchangeabilityVerified=false,assumptionEvidenceId=null,
}={}){
  const list=Array.isArray(cycles)?cycles:[],c=finite(confidence),pid=text(protocolId),latency=finite(actionLatencySeconds),assumptionEvidence=text(assumptionEvidenceId);
  if(!pid)return fail('MISSING_PROTOCOL_ID');
  if(!(latency>0))return fail('INVALID_ACTION_LATENCY');
  if(!(c>0&&c<1))return fail('INVALID_CONFIDENCE');
  if(prospectiveProtocolFrozen!==true)return fail('PROSPECTIVE_PROTOCOL_NOT_FROZEN');
  if(list.length<1)return fail('NO_VALIDATED_CYCLES');
  const ids=new Set();let k=0;let bindingKey=null;
  for(const x of list){
    if(!x||x.valid!==true||x.usableForRaceEvidence!==true||x.validatorVersion!=='bet365-sporting-passive-race-cycle-v1'||x.passiveDryRun!==true||x.prospectivelyObserved!==true||x.comparableCycleDefinitionVerified!==true)return fail('INVALID_BET365_CYCLE_EVIDENCE');
    const id=text(x.cycleId);if(!id||ids.has(id))return fail('MISSING_OR_DUPLICATE_CYCLE_ID');ids.add(id);
    if(text(x.protocolId)!==pid)return fail('PROTOCOL_ID_MISMATCH');
    if(finite(x.actionLatencySeconds)!==latency)return fail('ACTION_LATENCY_MISMATCH');
    if(x.operator!=='bet365 Spain'||x.market!=='ES'||x.servedTenCentJackpotEligibilityVerified!==true||x.bet365FirstBetFollowingDayRuleVerified!==true)return fail('BET365_EXECUTION_SCOPE_NOT_CLOSED');
    const key=[String(x.jackpotsCasino||'').toLowerCase(),String(x.tickerEndpoint||'')].join('|');
    if(!bindingKey)bindingKey=key;else if(key!==bindingKey)return fail('BINDING_SCOPE_CHANGED_ACROSS_LEDGER');
    if(x.outcome!=='SUCCESS'&&x.outcome!=='FAILURE')return fail('INVALID_CYCLE_OUTCOME');
    if(x.outcome==='SUCCESS')k++;
  }
  const n=list.length,pLower=cpLower(n,k,c);
  const assumptions={binomialIidAssumptionJustified:binomialIidAssumptionJustified===true,completeProspectiveCycleLedgerVerified:completeProspectiveCycleLedgerVerified===true,currentCycleExchangeabilityVerified:currentCycleExchangeabilityVerified===true,assumptionEvidenceId:assumptionEvidence};
  const executionAssumptionsClosed=assumptions.binomialIidAssumptionJustified&&assumptions.completeProspectiveCycleLedgerVerified&&assumptions.currentCycleExchangeabilityVerified&&!!assumptionEvidence;
  return {
    version:'bet365-sporting-empirical-race-bound-v1',valid:true,usableForExecution:executionAssumptionsClosed,
    reason:executionAssumptionsClosed?'VALIDATED_BET365_PASSIVE_CYCLE_CLOPPER_PEARSON_BOUND_AVAILABLE':'BET365_BINOMIAL_EXECUTION_ASSUMPTIONS_NOT_VERIFIED',
    method:'ONE_SIDED_CLOPPER_PEARSON_BINOMIAL',source:'VALIDATED_BET365_PASSIVE_CYCLE_LEDGER',operator:'bet365 Spain',market:'ES',
    protocolId:pid,actionLatencySeconds:latency,bindingScopeKey:bindingKey,cycleIds:[...ids],successfulDryRunCycles:k,totalDryRunCycles:n,confidence:c,firstBetRaceProbabilityLowerBound:pLower,prospectiveProtocolFrozen:true,comparableCycleDefinitionVerified:true,executionAssumptionsClosed,assumptions,
    scientificUse:'Computes a one-sided Clopper-Pearson lower bound only from prospectively collected, validator-accepted bet365 Spain passive dry-run cycles sharing one frozen protocol, one exact served binding and one hypothetical action latency. The lower bound is research-only unless the complete ledger, binomial sampling model, current-cycle exchangeability and independent assumption evidence are all explicitly closed. No point estimate can authorize execution.',
    execution:execution(),
    guards:{validatedBet365PassiveCycleLedgerRequired:true,uniqueCycleIdsRequired:true,exactSameProtocolAndLatencyRequired:true,completeProspectiveLedgerRequiredForExecution:true,binomialSamplingAssumptionRequired:true,currentCycleExchangeabilityRequired:true,independentAssumptionEvidenceRequired:true,noAutomaticWagering:true,realMoneyAllowed:false},
  };
}

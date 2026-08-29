const VERSION='shadow-guarantee-certifier-v1';
const execution=()=>({decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0});
const n=x=>Number.isFinite(Number(x))?Number(x):NaN;

export function certifyFiniteOutcomeStrategy({id='candidate',outcomes=[],exactRulesVerified=false,exactOutcomeSetVerified=false,exactNetPerOutcomeVerified=false}={}){
  const missing=[];
  if(exactRulesVerified!==true)missing.push('exactRulesVerified');
  if(exactOutcomeSetVerified!==true)missing.push('exactOutcomeSetVerified');
  if(exactNetPerOutcomeVerified!==true)missing.push('exactNetPerOutcomeVerified');
  if(!Array.isArray(outcomes)||!outcomes.length)missing.push('outcomes');
  const rows=Array.isArray(outcomes)?outcomes.map((o,i)=>({id:o?.id??i,net:n(o?.net),probability:o?.probability==null?null:n(o.probability)})):[];
  if(rows.some(x=>!Number.isFinite(x.net)))missing.push('finiteNetForEveryOutcome');
  const valid=missing.length===0;
  const nets=valid?rows.map(x=>x.net):[];
  const minimumNet=valid?Math.min(...nets):null;
  const maximumNet=valid?Math.max(...nets):null;
  const guaranteedNonLoss=valid&&minimumNet>=0;
  const guaranteedProfit=valid&&minimumNet>0;
  let expectedNet=null,probabilitySum=null;
  if(valid&&rows.every(x=>Number.isFinite(x.probability))){probabilitySum=rows.reduce((s,x)=>s+x.probability,0);if(Math.abs(probabilitySum-1)<1e-9)expectedNet=rows.reduce((s,x)=>s+x.probability*x.net,0);}
  return {version:VERSION,valid,id,missing,outcomeCount:rows.length,minimumNet,maximumNet,guaranteedNonLoss,guaranteedProfit,expectedNet,probabilitySum,classification:!valid?'UNVERIFIED_MODEL':guaranteedProfit?'GUARANTEED_PROFIT_IN_VERIFIED_FINITE_MODEL':guaranteedNonLoss?'GUARANTEED_NON_LOSS_IN_VERIFIED_FINITE_MODEL':expectedNet>0?'POSITIVE_EV_BUT_LOSS_OUTCOMES_EXIST':'NO_GUARANTEED_EDGE',execution:execution(),hardGuards:{modelGuaranteeIsOnlyAsGoodAsExactOutcomeSet:true,realOperatorStateMustMatchModel:true,simulationCannotAuthorizeExecution:true,noAutomaticBetting:true,realMoneyAllowed:false}};
}

export function certifyWorstCaseBound({id='bounded-candidate',minimumPossibleReward,maximumPossibleCost,exactRewardLowerBoundVerified=false,exactCostUpperBoundVerified=false,allOperationalRisksBounded=false}={}){
  const reward=n(minimumPossibleReward),cost=n(maximumPossibleCost);const missing=[];
  if(!Number.isFinite(reward))missing.push('minimumPossibleReward');
  if(!Number.isFinite(cost))missing.push('maximumPossibleCost');
  if(exactRewardLowerBoundVerified!==true)missing.push('exactRewardLowerBoundVerified');
  if(exactCostUpperBoundVerified!==true)missing.push('exactCostUpperBoundVerified');
  if(allOperationalRisksBounded!==true)missing.push('allOperationalRisksBounded');
  const valid=missing.length===0,minimumGuaranteedNet=valid?reward-cost:null;
  return {version:VERSION,valid,id,missing,minimumPossibleReward:valid?reward:null,maximumPossibleCost:valid?cost:null,minimumGuaranteedNet,guaranteedProfit:valid&&minimumGuaranteedNet>0,classification:!valid?'UNVERIFIED_BOUND':'VERIFIED_BOUND',execution:execution(),hardGuards:{competitionLatencyAndEligibilityMustBeIncludedInOperationalRisks:true,unboundedOpponentRaceCannotBeCalledGuaranteed:true,realMoneyAllowed:false}};
}

export function getGuaranteeCertifierManifest(){return {version:VERSION,purpose:'Distinguish positive expected value from mathematically guaranteed profit. A guarantee requires exact exhaustive outcome coverage or independently verified worst-case bounds.',execution:execution(),hardGuards:{positiveEvIsNotGuaranteedProfit:true,monteCarloCannotProveNoMissingOutcome:true,operatorStateMustMatchExactModel:true,realMoneyAllowed:false}};}

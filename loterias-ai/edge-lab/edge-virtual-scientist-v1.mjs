import {searchParameterGrid,simulatePolicy,buildVirtualLabReport} from './edge-virtual-casino-lab-v1.mjs';

const VERSION='edge-virtual-scientist-v1';
const execution=()=>({decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0});
function fingerprint(v){return JSON.stringify(v,Object.keys(v||{}).sort());}

export function runDiscoveryTournament({grid,buildPolicy,modelFactory,episodesPerCandidate=20000,maxSteps=100,seedBase=1000,objective='mean',topK=10,maxCombinations=5000}={}){
  if(typeof buildPolicy!=='function'||typeof modelFactory!=='function')throw new Error('BUILD_POLICY_AND_MODEL_FACTORY_REQUIRED');
  let index=0;
  const discovered=searchParameterGrid({grid,maxCombinations,topK,objective:'score',evaluate:params=>{
    const model=modelFactory(params);const policy=buildPolicy(params,model);const sim=simulatePolicy({...model,policy,episodes:episodesPerCandidate,maxSteps,seed:seedBase+(index++)});
    const score=objective==='lower95'?sim.summary.normalApproxCi95[0]:objective==='winRate'?sim.summary.winRate:sim.summary.mean;
    return {score,params,simulation:sim};
  }});
  return {version:VERSION,mode:'DISCOVERY_POLICY_TOURNAMENT',objective,candidatesEvaluated:discovered.combinationsEvaluated,top:discovered.top.map(x=>({params:x.params,score:x.score,discoverySummary:x.result.simulation.summary})),best:discovered.best?{params:discovered.best.params,score:discovered.best.score,discoverySummary:discovered.best.result.simulation.summary}:null,freezeRequiredBeforeValidation:true,execution:execution(),hardGuards:{discoveryResultsCannotAuthorizeExecution:true,selectionBiasExpected:true,validationMustUseFreshSeedsOrData:true,holdoutMustRemainUntouched:true,realMoneyAllowed:false}};
}

export function validateFrozenPolicy({frozenParams,buildPolicy,modelFactory,validationSeeds=[91001,91002,91003,91004,91005],episodesPerSeed=100000,maxSteps=100}={}){
  if(!frozenParams||typeof buildPolicy!=='function'||typeof modelFactory!=='function')throw new Error('FROZEN_PARAMS_BUILD_POLICY_MODEL_REQUIRED');
  const model=modelFactory(frozenParams),policy=buildPolicy(frozenParams,model),runs=[];
  for(const seed of validationSeeds)runs.push(simulatePolicy({...model,policy,episodes:episodesPerSeed,maxSteps,seed}));
  const means=runs.map(r=>r.summary.mean),meanOfMeans=means.reduce((a,b)=>a+b,0)/means.length;
  const allPositive=runs.every(r=>r.summary.normalApproxCi95[0]>0);
  return {version:VERSION,mode:'FROZEN_POLICY_INDEPENDENT_SEED_VALIDATION',frozenParams,frozenFingerprint:fingerprint(frozenParams),validationSeeds:[...validationSeeds],episodesPerSeed,meanOfMeans,allRunLower95Positive:allPositive,runs:runs.map(r=>({seed:r.seed,summary:r.summary})),promotion:allPositive?'SIMULATION_VALIDATED_REQUIRES_REAL_PROSPECTIVE_HOLDOUT':'SIMULATION_VALIDATION_FAILED',execution:execution(),hardGuards:{paramsCannotChangeAfterSeeingValidation:true,freshRealProspectiveHoldoutRequired:true,simulationValidationIsNotOperatorValidation:true,realMoneyAllowed:false}};
}

export function prospectivelyScoreFrozenPolicy({frozenParams,observations,decide,score}={}){
  if(!frozenParams||!Array.isArray(observations)||typeof decide!=='function'||typeof score!=='function')throw new Error('FROZEN_PARAMS_OBSERVATIONS_DECIDE_SCORE_REQUIRED');
  let cumulative=0,eligible=0,wins=0,losses=0;const rows=[];
  for(let i=0;i<observations.length;i++){
    const obs=observations[i];const decision=decide({params:frozenParams,observation:obs.observation,index:i});
    const result=score({params:frozenParams,decision,observation:obs,index:i});const s=Number.isFinite(Number(result?.score))?Number(result.score):0;
    if(result?.eligible===true){eligible++;if(s>0)wins++;else if(s<0)losses++;}
    cumulative+=s;rows.push({index:i,decision,eligible:result?.eligible===true,score:s,reason:result?.reason??null});
  }
  return {version:VERSION,mode:'FROZEN_PROSPECTIVE_SHADOW_SCORE',frozenParams,frozenFingerprint:fingerprint(frozenParams),observations:observations.length,eligible,cumulativeScore,wins,losses,rows,execution:execution(),hardGuards:{noParameterChangeAfterFirstProspectiveObservation:true,missesAndFailuresMustRemain:true,noStopAfterSuccess:true,noFutureInformation:true,shadowOnly:true,realMoneyAllowed:false}};
}

export function buildScientistReport({discovery,validation,prospective,modelFingerprint}={}){
  return {version:VERSION,mode:'VIRTUAL_SCIENTIST_REPORT',modelFingerprint:modelFingerprint??null,discovery,validation,prospective,virtualLab:buildVirtualLabReport({modelFingerprint}),decision:'RESEARCH_CONTINUE_UNLESS_EXTERNAL_EXECUTION_CONTRACT_SEPARATELY_CLOSES',execution:execution(),hardGuards:{millionsOfTrialsDoNotGuaranteeProfit:true,multipleTestingMustBeControlled:true,simulationAndShadowMustStaySeparate:true,realMoneyAllowed:false}};
}

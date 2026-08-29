const VERSION='edge-virtual-casino-lab-v1';
const EPS=1e-10;
const execution=()=>({decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0});
const finite=n=>Number.isFinite(Number(n));
const num=n=>Number(n);

function stable(value){
  if(value===null||typeof value!=='object')return JSON.stringify(value);
  if(Array.isArray(value))return `[${value.map(stable).join(',')}]`;
  return `{${Object.keys(value).sort().map(k=>`${JSON.stringify(k)}:${stable(value[k])}`).join(',')}}`;
}
function stateKeyDefault(state){return stable(state);}
function validateOutcomes(outcomes){
  if(!Array.isArray(outcomes)||!outcomes.length)throw new Error('NON_EMPTY_OUTCOMES_REQUIRED');
  let p=0;
  for(const o of outcomes){
    if(!o||!finite(o.p)||num(o.p)<0||!finite(o.reward))throw new Error('INVALID_OUTCOME');
    p+=num(o.p);
  }
  if(Math.abs(p-1)>1e-8)throw new Error(`OUTCOME_PROBABILITY_SUM_INVALID:${p}`);
}
function chooseWeighted(outcomes,rng){
  let u=rng(),acc=0;
  for(const o of outcomes){acc+=num(o.p);if(u<=acc+EPS)return o;}
  return outcomes[outcomes.length-1];
}
function mulberry32(seed){
  let a=(Number(seed)>>>0)||0x6D2B79F5;
  return ()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;};
}
function quantile(sorted,q){if(!sorted.length)return null;const pos=(sorted.length-1)*q,lo=Math.floor(pos),hi=Math.ceil(pos);return lo===hi?sorted[lo]:sorted[lo]+(sorted[hi]-sorted[lo])*(pos-lo);}
function summarizeReturns(values){
  if(!values.length)return {episodes:0,mean:null,median:null,p05:null,p95:null,min:null,max:null,winRate:null,lossRate:null,breakEvenRate:null,sampleSd:null,standardError:null,normalApproxCi95:null};
  const n=values.length,mean=values.reduce((a,b)=>a+b,0)/n;
  let ss=0,w=0,l=0,z=0;for(const v of values){ss+=(v-mean)**2;if(v>0)w++;else if(v<0)l++;else z++;}
  const sd=n>1?Math.sqrt(ss/(n-1)):0,se=sd/Math.sqrt(n),s=[...values].sort((a,b)=>a-b);
  return {episodes:n,mean,median:quantile(s,.5),p05:quantile(s,.05),p95:quantile(s,.95),min:s[0],max:s[s.length-1],winRate:w/n,lossRate:l/n,breakEvenRate:z/n,sampleSd:sd,standardError:se,normalApproxCi95:[mean-1.96*se,mean+1.96*se]};
}

export function solveFiniteHorizonExact({initialState,horizon,actions,outcomes,stateKey=stateKeyDefault,discount=1,maxStates=2_000_000}={}){
  if(!Number.isInteger(horizon)||horizon<0)throw new Error('NON_NEGATIVE_INTEGER_HORIZON_REQUIRED');
  if(typeof actions!=='function'||typeof outcomes!=='function')throw new Error('ACTIONS_AND_OUTCOMES_FUNCTIONS_REQUIRED');
  if(!finite(discount)||discount<0||discount>1)throw new Error('DISCOUNT_0_TO_1_REQUIRED');
  const memo=new Map(),policy=new Map();let transitionsEvaluated=0;
  const value=(state,stepsLeft)=>{
    if(stepsLeft===0)return 0;
    const k=`${stepsLeft}|${stateKey(state)}`;if(memo.has(k))return memo.get(k);
    if(memo.size>=maxStates)throw new Error('MAX_EXACT_STATES_EXCEEDED');
    const aa=actions(state,horizon-stepsLeft);
    if(!Array.isArray(aa)||!aa.length){memo.set(k,0);return 0;}
    let best=-Infinity,bestAction=null;
    for(const action of aa){
      const oo=outcomes(state,action,horizon-stepsLeft);validateOutcomes(oo);let ev=0;
      for(const o of oo){transitionsEvaluated++;const continuation=o.terminal===true?0:value(o.nextState,stepsLeft-1);ev+=num(o.p)*(num(o.reward)+discount*continuation);}
      if(ev>best){best=ev;bestAction=action;}
    }
    memo.set(k,best);policy.set(k,bestAction);return best;
  };
  const expectedNet=value(initialState,horizon);
  return {version:VERSION,mode:'EXACT_FINITE_HORIZON_DYNAMIC_PROGRAMMING',horizon,expectedNet,bestInitialAction:horizon?policy.get(`${horizon}|${stateKey(initialState)}`)??null:null,statesEvaluated:memo.size,transitionsEvaluated,policy,proofScope:'EXACT_ONLY_FOR_THE_SUPPLIED_MODEL_AND_HORIZON',execution:execution(),hardGuards:{modelRulesMustMatchExactCurrentDeployment:true,noFutureInformation:true,simulationCannotAuthorizeExecution:true,realMoneyAllowed:false}};
}

export function simulatePolicy({initialStateFactory,policy,outcomes,episodes=100000,maxSteps=100,seed=1,discount=1,storeReturns=true}={}){
  if(typeof initialStateFactory!=='function'||typeof policy!=='function'||typeof outcomes!=='function')throw new Error('FACTORY_POLICY_OUTCOMES_REQUIRED');
  if(!Number.isInteger(episodes)||episodes<1)throw new Error('POSITIVE_INTEGER_EPISODES_REQUIRED');
  if(!Number.isInteger(maxSteps)||maxSteps<1)throw new Error('POSITIVE_INTEGER_MAX_STEPS_REQUIRED');
  const rng=mulberry32(seed),returns=storeReturns?[]:null;let sum=0,sumSq=0,w=0,l=0,z=0,min=Infinity,max=-Infinity,totalSteps=0;
  for(let ep=0;ep<episodes;ep++){
    let state=initialStateFactory(ep),ret=0,g=1;
    for(let step=0;step<maxSteps;step++){
      const action=policy(state,step,{episode:ep});if(action===null||action===undefined)break;
      const oo=outcomes(state,action,step);validateOutcomes(oo);const o=chooseWeighted(oo,rng);ret+=g*num(o.reward);totalSteps++;if(o.terminal===true)break;state=o.nextState;g*=discount;
    }
    sum+=ret;sumSq+=ret*ret;if(ret>0)w++;else if(ret<0)l++;else z++;if(ret<min)min=ret;if(ret>max)max=ret;if(returns)returns.push(ret);
  }
  const mean=sum/episodes,variance=episodes>1?Math.max(0,(sumSq-episodes*mean*mean)/(episodes-1)):0,sd=Math.sqrt(variance),se=sd/Math.sqrt(episodes);
  const summary=returns?summarizeReturns(returns):{episodes,mean,min,max,winRate:w/episodes,lossRate:l/episodes,breakEvenRate:z/episodes,sampleSd:sd,standardError:se,normalApproxCi95:[mean-1.96*se,mean+1.96*se]};
  return {version:VERSION,mode:'SEEDED_MONTE_CARLO_POLICY_SIMULATION',seed,episodes,maxSteps,totalSteps,summary,interpretation:'Monte Carlo estimates the supplied model; it does not prove the real operator RNG/configuration matches that model.',execution:execution(),hardGuards:{seededReproducibleResearch:true,noNetwork:true,noWager:true,noFutureInformation:true,simulationCannotAuthorizeExecution:true,realMoneyAllowed:false}};
}

export function searchParameterGrid({grid,evaluate,objective='score',maximize=true,maxCombinations=100000,topK=20}={}){
  if(!grid||typeof grid!=='object'||typeof evaluate!=='function')throw new Error('GRID_AND_EVALUATE_REQUIRED');
  const keys=Object.keys(grid),vals=keys.map(k=>Array.isArray(grid[k])?grid[k]:[]);if(vals.some(v=>!v.length))throw new Error('NON_EMPTY_GRID_VALUES_REQUIRED');
  const total=vals.reduce((a,v)=>a*v.length,1);if(total>maxCombinations)throw new Error(`GRID_TOO_LARGE:${total}`);
  const results=[];const walk=(i,p)=>{if(i===keys.length){const r=evaluate({...p});const score=typeof objective==='function'?objective(r,p):num(r?.[objective]);if(finite(score))results.push({params:{...p},score,result:r});return;}for(const v of vals[i]){p[keys[i]]=v;walk(i+1,p);}};walk(0,{});
  results.sort((a,b)=>maximize?b.score-a.score:a.score-b.score);
  return {version:VERSION,mode:'EXHAUSTIVE_PARAMETER_GRID_DISCOVERY',combinationsEvaluated:results.length,best:results[0]??null,top:results.slice(0,Math.max(1,topK)),warning:'Discovery optimization must be frozen before validation/holdout. Best in-sample result is not evidence of real edge.',execution:execution(),hardGuards:{discoveryIsNotValidation:true,holdoutRequired:true,noFutureInformation:true,simulationCannotAuthorizeExecution:true,realMoneyAllowed:false}};
}

export function walkForwardShadow({events,policy,scoreDecision}={}){
  if(!Array.isArray(events)||typeof policy!=='function'||typeof scoreDecision!=='function')throw new Error('EVENTS_POLICY_SCORE_REQUIRED');
  const decisions=[];const history=[];let cumulativeScore=0;
  for(let i=0;i<events.length;i++){
    const event=events[i];
    const safeHistory=history.map(x=>x.observation);
    const decision=policy(event.observation,{index:i,history:safeHistory});
    const scored=scoreDecision({decision,event,index:i});
    const score=finite(scored?.score)?num(scored.score):0;cumulativeScore+=score;
    decisions.push({index:i,decision,score,eligible:scored?.eligible===true,reason:scored?.reason??null});
    history.push({observation:event.observation});
  }
  return {version:VERSION,mode:'STRICT_WALK_FORWARD_SHADOW_REPLAY',events:events.length,cumulativeScore,decisions,rule:'Policy receives current observation plus prior observations only; future events/outcomes are never passed into the decision call.',execution:execution(),hardGuards:{futureLeakageForbidden:true,counterfactualRewardRequiresModel:true,historicalReplayIsNotProspectiveValidation:true,noWager:true,realMoneyAllowed:false}};
}

export function buildVirtualLabReport({exact=null,monteCarlo=null,grid=null,walkForward=null,modelFingerprint=null}={}){
  const simulatedPositive=[exact?.expectedNet,monteCarlo?.summary?.mean].some(v=>finite(v)&&num(v)>0);
  return {version:VERSION,mode:'VIRTUAL_CASINO_RESEARCH_REPORT',modelFingerprint:modelFingerprint??null,simulatedPositiveEdgeObserved:simulatedPositive,exact,monteCarlo,grid,walkForward,promotion:'RESEARCH_ONLY_MODEL_RESULT',execution:execution(),hardGuards:{positiveSimulationDoesNotProveRealWorldEdge:true,exactModelFingerprintRequired:true,independentValidationRequired:true,prospectiveHoldoutRequired:true,freshLiveStateRequiredForAnyFutureExecutionReview:true,noAutomaticBetting:true,realMoneyAllowed:false}};
}

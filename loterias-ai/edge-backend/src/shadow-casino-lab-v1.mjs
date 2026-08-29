const VERSION='shadow-casino-lab-v1';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const num=x=>Number.isFinite(Number(x))?Number(x):0;
const mean=a=>a.length?a.reduce((s,x)=>s+x,0)/a.length:0;
const variance=a=>a.length>1?a.reduce((s,x)=>s+(x-mean(a))**2,0)/(a.length-1):0;
const execution=()=>({decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0});
function seed32(input){let h=2166136261>>>0;for(const ch of String(input)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;}
function rngFrom(seed){let a=seed32(seed)||1;return ()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;};}
function percentile(sorted,p){if(!sorted.length)return 0;const i=(sorted.length-1)*clamp(p,0,1),lo=Math.floor(i),hi=Math.ceil(i);if(lo===hi)return sorted[lo];return sorted[lo]+(sorted[hi]-sorted[lo])*(i-lo);}
function maxDrawdown(curve){let peak=0,dd=0;for(const x of curve){peak=Math.max(peak,x);dd=Math.max(dd,peak-x);}return dd;}
function validateModel(model,{mode='HYPOTHESIS'}={}){
  const missing=[];
  if(!model||typeof model!=='object')missing.push('model');
  if(!model?.id)missing.push('id');
  if(typeof model?.initialState!=='function')missing.push('initialState');
  if(typeof model?.actions!=='function')missing.push('actions');
  if(typeof model?.transition!=='function')missing.push('transition');
  const verifiedRequired=String(mode).toUpperCase()==='VERIFIED';
  if(verifiedRequired){
    if(model?.evidence?.exactRulesVerified!==true)missing.push('evidence.exactRulesVerified');
    if(model?.evidence?.exactPayoutModelVerified!==true)missing.push('evidence.exactPayoutModelVerified');
    if(model?.evidence?.exactStateTransitionModelVerified!==true)missing.push('evidence.exactStateTransitionModelVerified');
    if(model?.evidence?.exactStakeSemanticsVerified!==true)missing.push('evidence.exactStakeSemanticsVerified');
  }
  return {valid:missing.length===0,missing,verifiedRequired};
}
function chooseAction(policy,state,actions,context){if(!actions.length)return null;if(typeof policy!=='function')return actions[0];const a=policy(structuredClone(state),structuredClone(actions),context);if(a==null)return null;const hit=actions.find(x=>JSON.stringify(x)===JSON.stringify(a));return hit??null;}
export function runShadowEpisode({model,policy,seed='episode',maxSteps=10000,mode='HYPOTHESIS',context={}}={}){
  const check=validateModel(model,{mode});
  if(!check.valid)return {version:VERSION,valid:false,reason:'MODEL_REQUIREMENTS_MISSING',missing:check.missing,execution:execution()};
  const rng=rngFrom(seed);let state=model.initialState({rng,context}),net=0,totalStake=0,steps=0,wins=0,losses=0,curve=[0],terminal=false;
  const trace=[];
  while(steps<maxSteps&&!terminal){
    const actions=model.actions(structuredClone(state),{context});
    if(!Array.isArray(actions)||!actions.length)break;
    const action=chooseAction(policy,state,actions,{step:steps,context});
    if(action==null)break;
    const out=model.transition(structuredClone(state),structuredClone(action),rng,{context,step:steps});
    if(!out||typeof out!=='object'||!('state' in out))return {version:VERSION,valid:false,reason:'INVALID_TRANSITION_OUTPUT',step:steps,execution:execution()};
    const reward=num(out.reward),stake=Math.max(0,num(out.stake));
    net+=reward;totalStake+=stake;wins+=reward>0?1:0;losses+=reward<0?1:0;steps++;state=out.state;terminal=out.terminal===true;curve.push(net);
    if(trace.length<500)trace.push({step:steps,action,reward,stake,stateSummary:typeof model.stateSummary==='function'?model.stateSummary(state):null});
  }
  return {version:VERSION,valid:true,modelId:model.id,mode:String(mode).toUpperCase(),evidence:model.evidence||{},seed:String(seed),steps,totalStake,net,roi:totalStake>0?net/totalStake:null,wins,losses,maxDrawdown:maxDrawdown(curve),terminal,finalState:typeof model.stateSummary==='function'?model.stateSummary(state):null,traceTruncated:steps>trace.length,trace,execution:execution(),hardGuards:{simulationCannotAuthorizeExecution:true,noAutomaticBetting:true,realMoneyAllowed:false}};
}
export function runMonteCarlo({model,policy,episodes=10000,maxSteps=10000,seed='mc',mode='HYPOTHESIS',context={}}={}){
  const n=Math.max(1,Math.min(2_000_000,Math.floor(num(episodes)||1)));const results=[];
  for(let i=0;i<n;i++){const r=runShadowEpisode({model,policy,seed:`${seed}:${i}`,maxSteps,mode,context});if(!r.valid)return r;results.push(r);}
  const nets=results.map(x=>x.net),stakes=results.map(x=>x.totalStake),rois=results.map(x=>x.roi).filter(Number.isFinite),mu=mean(nets),se=Math.sqrt(variance(nets)/Math.max(1,nets.length));const z=1.959963984540054;
  const sorted=[...nets].sort((a,b)=>a-b);const totalStake=stakes.reduce((a,b)=>a+b,0),totalNet=nets.reduce((a,b)=>a+b,0);
  return {version:VERSION,valid:true,modelId:model.id,mode:String(mode).toUpperCase(),episodes:n,seed:String(seed),meanNetPerEpisode:mu,standardErrorNet:se,ci95Net:[mu-z*se,mu+z*se],aggregateStake:totalStake,aggregateNet:totalNet,aggregateRoi:totalStake>0?totalNet/totalStake:null,meanEpisodeRoi:mean(rois),profitableEpisodeRate:results.filter(x=>x.net>0).length/n,quantiles:{p01:percentile(sorted,.01),p05:percentile(sorted,.05),p50:percentile(sorted,.5),p95:percentile(sorted,.95),p99:percentile(sorted,.99)},meanMaxDrawdown:mean(results.map(x=>x.maxDrawdown)),execution:execution(),hardGuards:{monteCarloCannotProveModelCorrectness:true,simulationCannotAuthorizeExecution:true,noAutomaticBetting:true,realMoneyAllowed:false}};
}
export function searchPoliciesOutOfSample({model,policies=[],discoveryEpisodes=5000,validationEpisodes=5000,holdoutEpisodes=10000,maxSteps=10000,seed='policy-search',mode='HYPOTHESIS',context={}}={}){
  if(!Array.isArray(policies)||!policies.length)return {version:VERSION,valid:false,reason:'POLICIES_REQUIRED',execution:execution()};
  const discovery=policies.map((p,i)=>({id:p.id||`policy-${i}`,policy:p.policy,report:runMonteCarlo({model,policy:p.policy,episodes:discoveryEpisodes,maxSteps,seed:`${seed}:discovery:${p.id||i}`,mode,context})}));
  if(discovery.some(x=>!x.report.valid))return discovery.find(x=>!x.report.valid).report;
  discovery.sort((a,b)=>(b.report.aggregateRoi??-Infinity)-(a.report.aggregateRoi??-Infinity));
  const winner=discovery[0];
  const validation=runMonteCarlo({model,policy:winner.policy,episodes:validationEpisodes,maxSteps,seed:`${seed}:validation:${winner.id}`,mode,context});
  const holdout=runMonteCarlo({model,policy:winner.policy,episodes:holdoutEpisodes,maxSteps,seed:`${seed}:holdout:${winner.id}`,mode,context});
  const holdoutPositive=holdout.valid&&Array.isArray(holdout.ci95Net)&&holdout.ci95Net[0]>0;
  return {version:VERSION,valid:true,modelId:model.id,selectedPolicy:winner.id,selectionRule:'DISCOVERY_ONLY',discoveryLeaderboard:discovery.map(x=>({id:x.id,aggregateRoi:x.report.aggregateRoi,ci95Net:x.report.ci95Net})),validation,holdout,holdoutPositiveAt95Pct:holdoutPositive,promotion:'RESEARCH_ONLY',execution:execution(),hardGuards:{holdoutNeverUsedForPolicySelection:true,positiveHoldoutCannotAuthorizeExecution:true,modelEvidenceStillRequired:true,noAutomaticBetting:true,realMoneyAllowed:false}};
}
export function enumerateFiniteStateActions({states=[],actionsForState,transitionDistribution,reward,stake=()=>0}={}){
  const rows=[];
  for(const state of states){const actions=actionsForState(state)||[];for(const action of actions){const dist=transitionDistribution(state,action)||[];let ps=0,ev=0,ev2=0,st=0;for(const o of dist){const p=num(o.probability),r=num(reward(state,action,o));ps+=p;ev+=p*r;ev2+=p*r*r;st+=p*Math.max(0,num(stake(state,action,o)));}rows.push({state,action,probabilitySum:ps,normalized:Math.abs(ps-1)<1e-9,expectedNet:ev,expectedStake:st,expectedRoi:st>0?ev/st:null,variance:Math.max(0,ev2-ev*ev)});}}
  return {version:VERSION,valid:rows.every(x=>x.normalized),rows,execution:execution(),hardGuards:{enumerationCannotAuthorizeExecution:true,realMoneyAllowed:false}};
}
export function makeEuropeanRouletteControlModel({unit=1}={}){
  const stake=Math.max(.01,num(unit)||1);const numbers=Array.from({length:37},(_,i)=>i);
  return {id:'EUROPEAN_ROULETTE_FAIR_CONTROL',evidence:{exactRulesVerified:true,exactPayoutModelVerified:true,exactStateTransitionModelVerified:true,exactStakeSemanticsVerified:true},initialState:()=>({spins:0}),actions:()=>[{type:'RED',stake},{type:'BLACK',stake},{type:'STRAIGHT',number:17,stake}],transition:(state,action,rng)=>{const n=numbers[Math.floor(rng()*37)],red=new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);let reward=-stake;if(action.type==='RED'&&red.has(n))reward=stake;if(action.type==='BLACK'&&n!==0&&!red.has(n))reward=stake;if(action.type==='STRAIGHT'&&n===action.number)reward=35*stake;return {state:{spins:state.spins+1,last:n},reward,stake};},stateSummary:s=>({spins:s.spins,last:s.last})};
}
export function makeFixedRtpControlModel({rtp=.96,stake=1}={}){
  const p=clamp(num(rtp),0,1),s=Math.max(.01,num(stake)||1);return {id:`FIXED_RTP_CONTROL_${p}`,evidence:{exactRulesVerified:true,exactPayoutModelVerified:true,exactStateTransitionModelVerified:true,exactStakeSemanticsVerified:true},initialState:()=>({plays:0}),actions:()=>[{type:'PLAY',stake:s}],transition:(state,action,rng)=>{const win=rng()<p;return {state:{plays:state.plays+1},reward:win?0:-s,stake:s};},stateSummary:x=>({plays:x.plays})};
}
export function getShadowCasinoLabManifest(){return {version:VERSION,purpose:'Offline digital-twin / fictitious-play research across casino, lottery and stateful-game models.',modes:['HYPOTHESIS','VERIFIED'],engines:['episode replay','Monte Carlo','out-of-sample policy search','finite-state exact enumeration'],modelFamilies:['persistent-state slots','must-hit-by progressives','timed jackpots/races','progressive video poker','roulette controls','lottery payout overlays'],antiOverfit:['discovery selects policy','validation measures generalization','holdout is untouched until final evaluation'],execution:execution(),hardGuards:{noRealMoney:true,noAutomaticBetting:true,simulationDoesNotMakeUnknownRulesKnown:true,negativeEvGamesDoNotBecomePositiveByBettingPattern:true,realMoneyAllowed:false}};}

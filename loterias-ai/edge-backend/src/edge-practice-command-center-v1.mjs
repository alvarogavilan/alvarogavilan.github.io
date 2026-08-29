import fs from 'node:fs';
import {evaluateAmountBoundaryPractice,evaluateTimedFirstContributionPractice} from './edge-practice-lab-v1.mjs';
import {evaluateFixedStakeLadder,classifyStakeChangeClaim} from './slot-stake-ladder-lab-v1.mjs';
import {evaluatePhysicsWindow,analyzeRouletteSpinSeries,classifyRouletteProduct} from './roulette-edge-lab-v1.mjs';
import {predictPhysicsSector,walkForwardPhysicsValidation} from './roulette-current-spin-physics-learner-v1.mjs';
import {analyzeProgressiveNetworkSnapshots} from './progressive-network-observer-v1.mjs';
import {validateRouletteCandidateProspectively} from './roulette-prospective-holdout-validator-v1.mjs';
import {evaluatePredictionLog} from './roulette-predictor-falsification-lab-v1.mjs';
import {runAxaRepeatedNumberProxy} from './roulette-axa-proxy-practice-v1.mjs';
import {evaluateRepetitionJackpot} from './roulette-repetition-jackpot-screen-v1.mjs';
import {screenAotgLiveRoulette} from './aotg-live-roulette-ev-screen-v1.mjs';
import {evaluateQuantumAutoPhysicsEv} from './quantum-auto-physics-ev-screen-v1.mjs';
import {evaluatePostReleaseSectorEv} from './roulette-post-release-sector-ev-screen-v1.mjs';

const VERSION='edge-practice-command-center-v1.2-current-spin-physics';
const EXECUTION=Object.freeze({decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0});
const execution=()=>({...EXECUTION});
function scoreResult(result){
  const v=result?.practiceVerdict||result?.physics||result?.classification||result?.status||result?.reason||'';
  if(String(v).includes('CONSERVATIVE_POSITIVE')) return 100;
  if(String(v).includes('ROBUST_POSITIVE')) return 95;
  if(String(v).includes('POSITIVE_ONE_SPIN')) return 92;
  if(String(v).includes('POSITIVE_IN_PRACTICE')) return 90;
  if(String(v).includes('REPRODUCIBLE_BIAS')) return 85;
  if(String(v).includes('PHYSICS_TIMING_CANDIDATE')) return 80;
  if(String(v).includes('WALK_FORWARD_PHYSICS_RESEARCH_CANDIDATE')) return 79;
  if(String(v).includes('REAL_STAKE_DEPENDENT_MECHANIC')) return 76;
  if(String(v).includes('RESEARCH_CANDIDATE')) return 70;
  if(String(v).includes('WAIT_FOR')) return 55;
  if(String(v).includes('INSUFFICIENT')) return 40;
  if(String(v).includes('DISCOVERY_ONLY')) return 30;
  if(String(v).includes('RITUAL')) return 15;
  if(String(v).includes('BLOCKED')) return 20;
  return 10;
}
function dispatchScenario(s={}){
  if(s.type==='AMOUNT_BOUNDARY_MHB')return evaluateAmountBoundaryPractice(s.input||{});
  if(s.type==='TIMED_FIRST_CONTRIBUTION')return evaluateTimedFirstContributionPractice(s.input||{});
  if(s.type==='SLOT_STAKE_LADDER')return evaluateFixedStakeLadder(s.input||{});
  if(s.type==='SLOT_STAKE_CHANGE_CLAIM')return classifyStakeChangeClaim(s.input||{});
  if(s.type==='ROULETTE_PHYSICS_WINDOW')return evaluatePhysicsWindow(s.input||{});
  if(s.type==='ROULETTE_CURRENT_SPIN_PHYSICS_PREDICT')return predictPhysicsSector(s.training||[],s.current||{},s.options||{});
  if(s.type==='ROULETTE_CURRENT_SPIN_PHYSICS_WALK_FORWARD')return walkForwardPhysicsValidation(s.records||[],s.options||{});
  if(s.type==='ROULETTE_SPIN_SERIES')return analyzeRouletteSpinSeries(s.records||[],s.options||{});
  if(s.type==='ROULETTE_PRODUCT_CLASSIFICATION')return classifyRouletteProduct(s.input||{});
  if(s.type==='ROULETTE_PREDICTOR_LOG')return evaluatePredictionLog(s.entries||[],s.options||{});
  if(s.type==='AXA_REPEATED_NUMBER_PROXY')return runAxaRepeatedNumberProxy(s.input||{});
  if(s.type==='ROULETTE_REPETITION_JACKPOT')return evaluateRepetitionJackpot(s.input||{});
  if(s.type==='AOTG_LIVE_ROULETTE_EV')return screenAotgLiveRoulette(s.input||{});
  if(s.type==='QUANTUM_AUTO_PHYSICS_EV')return evaluateQuantumAutoPhysicsEv(s.input||{});
  if(s.type==='POST_RELEASE_SECTOR_EV')return evaluatePostReleaseSectorEv(s.input||{});
  if(s.type==='PROGRESSIVE_NETWORK')return analyzeProgressiveNetworkSnapshots(s.snapshots||[],s.options||{});
  if(s.type==='ROULETTE_PROSPECTIVE_HOLDOUT')return validateRouletteCandidateProspectively(s.candidate||{},s.holdout||[],s.options||{});
  return {ok:false,reason:'UNSUPPORTED_SCENARIO_TYPE',execution:execution()};
}
export function runPracticeExperiment(bundle={}){
  const scenarios=Array.isArray(bundle.scenarios)?bundle.scenarios:[];
  const results=scenarios.map((s,index)=>{
    let result;
    try{result=dispatchScenario(s);}catch(error){result={ok:false,reason:'SCENARIO_EXCEPTION',message:String(error?.message||error),execution:execution()};}
    return {index,id:s.id||`scenario-${index+1}`,type:s.type||null,score:scoreResult(result),result};
  });
  results.sort((a,b)=>b.score-a.score||a.index-b.index);
  const executableResearchCandidates=results.filter(x=>x.score>=70);
  return {version:VERSION,target:bundle.target||null,scenarioCount:results.length,ranked:results,highestPriority:results[0]||null,researchCandidateCount:executableResearchCandidates.length,researchCandidates:executableResearchCandidates.map(x=>({id:x.id,type:x.type,score:x.score,verdict:x.result?.practiceVerdict||x.result?.physics||x.result?.classification||x.result?.status||x.result?.reason||null})),execution:execution(),hardGuards:{practiceCannotAuthorizeRealMoney:true,syntheticInputsCannotBecomeFacts:true,rankingIsResearchPriorityNotBetRecommendation:true,creatorOrHistoryMethodsCannotSelfPromote:true,currentSpinPhysicsNeedsIndependentProspectiveHoldout:true,exactCurrentTargetEvidenceRequired:true,noAutomaticBetting:true,noWagerProbe:true}};
}
export function runPracticeExperimentText(raw){let bundle;try{bundle=JSON.parse(raw);}catch(error){return {version:VERSION,ok:false,reason:'JSON_PARSE_FAILED',message:String(error?.message||error),execution:execution()};}return runPracticeExperiment(bundle);}
if(import.meta.url===`file://${process.argv[1]}`){const file=process.argv[2];if(!file){process.stdout.write('Usage: node edge-practice-command-center-v1.mjs <experiment.json>\n');process.exitCode=2;}else{const out=runPracticeExperimentText(fs.readFileSync(file,'utf8'));process.stdout.write(`${JSON.stringify(out,null,2)}\n`);}}

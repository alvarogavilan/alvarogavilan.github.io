import fs from 'node:fs';
import {evaluateAmountBoundaryPractice,evaluateTimedFirstContributionPractice} from './edge-practice-lab-v1.mjs';
import {evaluatePhysicsWindow,analyzeRouletteSpinSeries,classifyRouletteProduct} from './roulette-edge-lab-v1.mjs';
import {analyzeProgressiveNetworkSnapshots} from './progressive-network-observer-v1.mjs';
import {validateRouletteCandidateProspectively} from './roulette-prospective-holdout-validator-v1.mjs';

const VERSION='edge-practice-command-center-v1';
const EXECUTION=Object.freeze({decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0});
const execution=()=>({...EXECUTION});
function scoreResult(result){
  const v=result?.practiceVerdict||result?.physics||result?.reason||'';
  if(String(v).includes('CONSERVATIVE_POSITIVE')) return 100;
  if(String(v).includes('ROBUST_POSITIVE')) return 95;
  if(String(v).includes('POSITIVE_IN_PRACTICE')) return 90;
  if(String(v).includes('REPRODUCIBLE_BIAS')) return 85;
  if(String(v).includes('PHYSICS_TIMING_CANDIDATE')) return 80;
  if(String(v).includes('RESEARCH_CANDIDATE')) return 70;
  if(String(v).includes('INSUFFICIENT')) return 40;
  if(String(v).includes('BLOCKED')) return 20;
  return 10;
}
export function runPracticeExperiment(bundle={}){
  const scenarios=Array.isArray(bundle.scenarios)?bundle.scenarios:[];
  const results=scenarios.map((s,index)=>{
    let result;
    if(s.type==='AMOUNT_BOUNDARY_MHB')result=evaluateAmountBoundaryPractice(s.input||{});
    else if(s.type==='TIMED_FIRST_CONTRIBUTION')result=evaluateTimedFirstContributionPractice(s.input||{});
    else if(s.type==='ROULETTE_PHYSICS_WINDOW')result=evaluatePhysicsWindow(s.input||{});
    else if(s.type==='ROULETTE_SPIN_SERIES')result=analyzeRouletteSpinSeries(s.records||[],s.options||{});
    else if(s.type==='ROULETTE_PRODUCT_CLASSIFICATION')result=classifyRouletteProduct(s.input||{});
    else if(s.type==='PROGRESSIVE_NETWORK')result=analyzeProgressiveNetworkSnapshots(s.snapshots||[],s.options||{});
    else if(s.type==='ROULETTE_PROSPECTIVE_HOLDOUT')result=validateRouletteCandidateProspectively(s.candidate||{},s.holdout||[],s.options||{});
    else result={ok:false,reason:'UNSUPPORTED_SCENARIO_TYPE',execution:execution()};
    return {index,id:s.id||`scenario-${index+1}`,type:s.type||null,score:scoreResult(result),result};
  });
  results.sort((a,b)=>b.score-a.score);
  return {version:VERSION,target:bundle.target||null,scenarioCount:results.length,ranked:results,highestPriority:results[0]||null,execution:execution(),hardGuards:{practiceCannotAuthorizeRealMoney:true,syntheticInputsCannotBecomeFacts:true,rankingIsResearchPriorityNotBetRecommendation:true,noAutomaticBetting:true}};
}
export function runPracticeExperimentText(raw){let bundle;try{bundle=JSON.parse(raw);}catch(error){return {version:VERSION,ok:false,reason:'JSON_PARSE_FAILED',message:String(error?.message||error),execution:execution()};}return runPracticeExperiment(bundle);}
if(import.meta.url===`file://${process.argv[1]}`){const file=process.argv[2];if(!file){process.stdout.write('Usage: node edge-practice-command-center-v1.mjs <experiment.json>\n');process.exitCode=2;}else{const out=runPracticeExperimentText(fs.readFileSync(file,'utf8'));process.stdout.write(`${JSON.stringify(out,null,2)}\n`);}}

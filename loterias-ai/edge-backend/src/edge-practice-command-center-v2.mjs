import fs from 'node:fs';
import {runPracticeExperiment as runV1} from './edge-practice-command-center-v1.mjs';
import {summarizeMermaidCrossBetLeverage,screenMermaidPearlJackpotExercise,screenMermaidBuildExerciseCycle} from './mermaid-frenzy-cross-bet-pearl-option-v1.mjs';
import {screenRhinoFiveRegularCoins} from './rhino-coins-five-sticky-screen-v1.mjs';
import {classifyPersistentStateTransferability,rankPersistentStateMechanisms} from './persistent-state-transferability-theorem-v1.mjs';
import {screenOperatorCrossBetFrontier} from './cross-bet-operator-frontier-v1.mjs';

const VERSION='edge-practice-command-center-v2-cross-bet-state';
const EXEC=Object.freeze({decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0});
const execution=()=>({...EXEC});

function score(result){
  const v=String(result?.practiceVerdict||result?.classification||result?.status||result?.reason||'');
  if(v.includes('CONSERVATIVE_POSITIVE'))return 100;
  if(v.includes('REAL_CROSS_BET_STATE_LEVERAGE'))return 88;
  if(v.includes('VERIFIED_CROSS_BET_MECHANIC_FRONTIER'))return 86;
  if(v.includes('RESEARCH'))return 70;
  if(v.includes('WAIT_FOR'))return 55;
  if(v.includes('CONDITIONAL_STATE_ONLY'))return 48;
  if(v.includes('DISCOVERY'))return 30;
  if(v.includes('BLOCKED')||v.includes('UNVERIFIED'))return 20;
  return 10;
}

function dispatchNew(s={}){
  if(s.type==='MERMAID_CROSS_BET_LEVERAGE')return summarizeMermaidCrossBetLeverage(s.input||{});
  if(s.type==='MERMAID_PEARL_JACKPOT_EXERCISE')return screenMermaidPearlJackpotExercise(s.input||{});
  if(s.type==='MERMAID_BUILD_EXERCISE_CYCLE')return screenMermaidBuildExerciseCycle(s.input||{});
  if(s.type==='RHINO_FIVE_REGULAR_COINS')return screenRhinoFiveRegularCoins(s.input||{});
  if(s.type==='PERSISTENT_STATE_TRANSFERABILITY')return classifyPersistentStateTransferability(s.input||{});
  if(s.type==='PERSISTENT_STATE_TRANSFERABILITY_RANK')return {version:VERSION,classification:'RESEARCH_RANK',ranked:rankPersistentStateMechanisms(s.rows||[]),execution:execution()};
  if(s.type==='CROSS_BET_OPERATOR_FRONTIER')return screenOperatorCrossBetFrontier(s.rows||[]);
  return null;
}

function dispatch(s={}){
  const newer=dispatchNew(s);if(newer)return newer;
  const old=runV1({target:s.id||null,scenarios:[s]});
  return old.ranked?.[0]?.result||{ok:false,reason:'UNSUPPORTED_SCENARIO_TYPE',execution:execution()};
}

export function runPracticeExperimentV2(bundle={}){
  const scenarios=Array.isArray(bundle.scenarios)?bundle.scenarios:[];
  const ranked=scenarios.map((s,index)=>{let result;try{result=dispatch(s);}catch(error){result={ok:false,reason:'SCENARIO_EXCEPTION',message:String(error?.message||error),execution:execution()};}return{index,id:s.id||`scenario-${index+1}`,type:s.type||null,score:score(result),result};}).sort((a,b)=>b.score-a.score||a.index-b.index);
  return{version:VERSION,target:bundle.target||null,scenarioCount:ranked.length,ranked,highestPriority:ranked[0]||null,execution:execution(),hardGuards:{practiceCannotAuthorizeRealMoney:true,crossBetRatioAloneCannotAuthorizeRealMoney:true,noRuleTransferAcrossOperators:true,overallHitFrequencyCannotBecomeFeatureProbability:true,monthlyObservedRtpCannotBecomeNextSpinProbability:true,persistentConditionalStateDoesNotProveRepeatableCycle:true,noAutomaticBetting:true,noWagerProbe:true}};
}

export function runPracticeExperimentTextV2(raw){let bundle;try{bundle=JSON.parse(raw);}catch(error){return{version:VERSION,ok:false,reason:'JSON_PARSE_FAILED',message:String(error?.message||error),execution:execution()};}return runPracticeExperimentV2(bundle);}

if(import.meta.url===`file://${process.argv[1]}`){const file=process.argv[2];if(!file){process.stdout.write('Usage: node edge-practice-command-center-v2.mjs <experiment.json>\n');process.exitCode=2;}else{process.stdout.write(`${JSON.stringify(runPracticeExperimentTextV2(fs.readFileSync(file,'utf8')),null,2)}\n`);}}

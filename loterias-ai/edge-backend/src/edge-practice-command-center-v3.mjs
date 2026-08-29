import fs from 'node:fs';
import {runPracticeExperimentV2} from './edge-practice-command-center-v2.mjs';
import {screenSharedStateCycle,screenTerminalIndicatorLeverage,rankSharedStateFrontier} from './cross-bet-shared-state-cycle-v1.mjs';
import {screenUnstoppableWolfSuperRespin,compareUnstoppableWolfOperators} from './unstoppable-wolf-super-respin-screen-v1.mjs';

const VERSION='edge-practice-command-center-v3-shared-state-terminal';
const EXEC=Object.freeze({decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0});
const execution=()=>({...EXEC});

function dispatchV3(s={}){
  if(s.type==='CROSS_BET_SHARED_STATE_CYCLE')return screenSharedStateCycle(s.input||{});
  if(s.type==='SHARED_TERMINAL_INDICATOR_LEVERAGE')return screenTerminalIndicatorLeverage(s.input||{});
  if(s.type==='SHARED_STATE_FRONTIER_RANK')return{version:VERSION,ok:true,classification:'RESEARCH_RANK',ranked:rankSharedStateFrontier(s.rows||[]),execution:execution()};
  if(s.type==='UNSTOPPABLE_WOLF_SUPER_RESPIN')return screenUnstoppableWolfSuperRespin(s.input||{});
  if(s.type==='UNSTOPPABLE_WOLF_OPERATOR_COMPARE')return{version:VERSION,ok:true,classification:'OPERATOR_COMPARISON',rows:compareUnstoppableWolfOperators(),execution:execution()};
  return null;
}

function score(result){const v=String(result?.practiceVerdict||result?.classification||result?.status||result?.reason||'');if(v.includes('POSITIVE_TERMINAL_ONE_SPIN_FLOOR')||v.includes('POSITIVE_CYCLE_MATH'))return 100;if(v.includes('ONE_EVENT_FROM_SHARED_STATE_TERMINAL_TRIGGER'))return 95;if(v.includes('STRUCTURAL_SHARED_STATE_LEVERAGE'))return 88;if(v.includes('RESEARCH_RANK'))return 80;if(v.includes('WAIT_FOR'))return 55;if(v.includes('NON_POSITIVE'))return 25;if(v.includes('UNCLOSED')||v.includes('GATE'))return 30;return 10;}

export function runPracticeExperimentV3(bundle={}){
  const scenarios=Array.isArray(bundle.scenarios)?bundle.scenarios:[];
  const ranked=scenarios.map((s,index)=>{let result=dispatchV3(s);if(result===null){const old=runPracticeExperimentV2({target:s.id||null,scenarios:[s]});result=old.ranked?.[0]?.result||{ok:false,reason:'UNSUPPORTED_SCENARIO_TYPE',execution:execution()};}return{index,id:s.id||`scenario-${index+1}`,type:s.type||null,score:score(result),result};}).sort((a,b)=>b.score-a.score||a.index-b.index);
  return{version:VERSION,target:bundle.target||null,scenarioCount:ranked.length,ranked,highestPriority:ranked[0]||null,execution:execution(),hardGuards:{practiceCannotAuthorizeRealMoney:true,terminalProximityCannotAuthorizeRealMoney:true,transitionProbabilitiesCannotBeInvented:true,featureValueCannotBeInvented:true,buildCostMustBeClosedForRepeatableCycle:true,noRuleTransferAcrossOperators:true,noWagerProbe:true,noAutomaticBetting:true}};
}

export function runPracticeExperimentTextV3(raw){let bundle;try{bundle=JSON.parse(raw);}catch(error){return{version:VERSION,ok:false,reason:'JSON_PARSE_FAILED',message:String(error?.message||error),execution:execution()};}return runPracticeExperimentV3(bundle);}
if(import.meta.url===`file://${process.argv[1]}`){const file=process.argv[2];if(!file){process.stdout.write('Usage: node edge-practice-command-center-v3.mjs <experiment.json>\n');process.exitCode=2;}else{process.stdout.write(`${JSON.stringify(runPracticeExperimentTextV3(fs.readFileSync(file,'utf8')),null,2)}\n`);}}

import {runAutonomousPracticeV2} from './edge-autonomous-practice-runner-v2.mjs';
import {rankSharedStateFrontier,screenSharedStateCycle} from './cross-bet-shared-state-cycle-v1.mjs';
import {screenUnstoppableWolfSuperRespin,compareUnstoppableWolfOperators} from './unstoppable-wolf-super-respin-screen-v1.mjs';

const VERSION='edge-autonomous-practice-runner-v3-shared-state-terminal';
const EXEC=Object.freeze({decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0});

function sharedStateRows(){return [
  {id:'INTERWETTEN_ES_UNSTOPPABLE_WOLF',terminal:true,exactCurrentOperatorRuleVerified:true,stateSurvivesBetChange:true,featureUsesTriggeringSpinStake:true,indicatorsFilled:4,totalIndicators:5,buildStakeEUR:.20,exerciseStakeEUR:40},
  {id:'JOKERBET_ES_UNSTOPPABLE_WOLF',terminal:true,exactCurrentOperatorRuleVerified:true,stateSurvivesBetChange:true,featureUsesTriggeringSpinStake:true,indicatorsFilled:4,totalIndicators:5,buildStakeEUR:.20,exerciseStakeEUR:8},
  {id:'JOKERBET_ES_LAW_OF_ATHENA',exactCurrentOperatorRuleVerified:true,stateSurvivesBetChange:true,stateDependentAwardUsesCurrentOrTriggerStake:true,buildStakeEUR:.20,exerciseStakeEUR:8},
  {id:'JOKERBET_ES_LAW_OF_ZEUS',exactCurrentOperatorRuleVerified:true,stateSurvivesBetChange:true,stateDependentAwardUsesCurrentOrTriggerStake:true,buildStakeEUR:.20,exerciseStakeEUR:8},
  {id:'JOKERBET_ES_MERMAID_FRENZY',exactCurrentOperatorRuleVerified:true,stateSurvivesBetChange:true,stateDependentAwardUsesCurrentOrTriggerStake:true,buildStakeEUR:.20,exerciseStakeEUR:7.50},
  {id:'JOKERBET_ES_EXPLOSIVE_FRENZY',exactCurrentOperatorRuleVerified:true,stateSurvivesBetChange:true,stateDependentAwardUsesCurrentOrTriggerStake:true,buildStakeEUR:.20,exerciseStakeEUR:7.50},
  {id:'JOKERBET_ES_STARS_BONANZA',exactCurrentOperatorRuleVerified:true,stateSurvivesBetChange:true,stateDependentAwardUsesCurrentOrTriggerStake:true,buildStakeEUR:.20,exerciseStakeEUR:7.50},
  {id:'JOKERBET_ES_SHAMROCK_BONANZA',exactCurrentOperatorRuleVerified:true,stateSurvivesBetChange:true,stateDependentAwardUsesCurrentOrTriggerStake:true,buildStakeEUR:.20,exerciseStakeEUR:7.50}
];}

function sharedMultiplierStructuralScreens(){return [
  {id:'LAW_OF_ATHENA',result:screenSharedStateCycle({exactCurrentOperatorRuleVerified:true,stateSurvivesBetChange:true,stateDependentAwardUsesCurrentOrTriggerStake:true,buildStakeEUR:.20,exerciseStakeEUR:8})},
  {id:'LAW_OF_ZEUS',result:screenSharedStateCycle({exactCurrentOperatorRuleVerified:true,stateSurvivesBetChange:true,stateDependentAwardUsesCurrentOrTriggerStake:true,buildStakeEUR:.20,exerciseStakeEUR:8})},
  {id:'MERMAID_FRENZY',result:screenSharedStateCycle({exactCurrentOperatorRuleVerified:true,stateSurvivesBetChange:true,stateDependentAwardUsesCurrentOrTriggerStake:true,buildStakeEUR:.20,exerciseStakeEUR:7.50})}
];}

export function runAutonomousPracticeV3(options={}){
  const base=runAutonomousPracticeV2(options);
  const sharedStateRank=rankSharedStateFrontier(sharedStateRows());
  const unstoppableInterwetten=screenUnstoppableWolfSuperRespin({operatorId:'INTERWETTEN_ES',indicatorsFilled:4});
  const unstoppableJokerbet=screenUnstoppableWolfSuperRespin({operatorId:'JOKERBET_ES',indicatorsFilled:4});
  return{version:VERSION,mode:'AUTONOMOUS_NO_USER_INPUT',generatedAt:new Date().toISOString(),base,sharedStateFrontier:{ranked:sharedStateRank.map(x=>({id:x.id,score:x.score,classification:x.result.classification,stakeLeverageRatio:x.result.metrics?.stakeLeverageRatio??null,indicatorsNeeded:x.result.metrics?.indicatorsNeeded??null})),highestStructuralPriority:sharedStateRank[0]?.id??null,reason:'Terminal shared state with triggering-stake feature valuation is prioritized over shared multipliers and isolated per-bet state. This is closure priority, not a bet recommendation.'},unstoppableWolf:{operatorComparison:compareUnstoppableWolfOperators(),interwettenFourOfFive:unstoppableInterwetten,jokerbetFourOfFive:unstoppableJokerbet},sharedMultiplierStructuralScreens:sharedMultiplierStructuralScreens(),execution:{...EXEC},hardGuards:{autonomousRunnerCannotAuthorizeRealMoney:true,sharedStateLeverageIsNotEv:true,lastStackProbabilityCannotBeInvented:true,superRespinValueCannotBeInvented:true,allBuildCostsMustBeCounted:true,noRuleTransferAcrossOperators:true,noWagerProbe:true,noAutomaticBetting:true}};
}

if(import.meta.url===`file://${process.argv[1]}`){process.stdout.write(`${JSON.stringify(runAutonomousPracticeV3(),null,2)}\n`);}

import {screenTerminalIndicatorLeverage} from './cross-bet-shared-state-cycle-v1.mjs';

const VERSION='unstoppable-wolf-super-respin-screen-v1';
const EXEC=Object.freeze({decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0});
const OPERATOR_CONFIG=Object.freeze({
  INTERWETTEN_ES:{operator:'Interwetten Spain',minStakeEUR:0.20,maxStakeEUR:40.00,rtpPct:96.50,stakeRatio:200,ruleClass:'CURRENT_OPERATOR_RULE_PAGE'},
  JOKERBET_ES:{operator:'JOKERBET Spain',minStakeEUR:0.20,maxStakeEUR:8.00,rtpPct:94.10,stakeRatio:40,ruleClass:'CURRENT_EXACT_GAME_HELP_PDF'}
});

export function screenUnstoppableWolfSuperRespin(input={}){
  const cfg=OPERATOR_CONFIG[input.operatorId];
  if(!cfg)return{version:VERSION,ok:false,classification:'EXACT_OPERATOR_ID_REQUIRED',execution:{...EXEC}};
  const filled=Number.isInteger(Number(input.indicatorsFilled))?Number(input.indicatorsFilled):null;
  const buildStake=Number.isFinite(Number(input.buildStakeEUR))?Number(input.buildStakeEUR):cfg.minStakeEUR;
  const exerciseStake=Number.isFinite(Number(input.exerciseStakeEUR))?Number(input.exerciseStakeEUR):cfg.maxStakeEUR;
  const r=screenTerminalIndicatorLeverage({terminal:true,exactCurrentOperatorRuleVerified:true,stateSurvivesBetChange:true,featureUsesTriggeringSpinStake:true,indicatorsFilled:filled,totalIndicators:5,buildStakeEUR:buildStake,exerciseStakeEUR:exerciseStake,probabilityTerminalCompletionNextSpin:input.probabilityRemainingReelFullWolfStackNextSpin,featurePayoutFloorX:input.superRespinPayoutFloorX});
  return{...r,version:VERSION,operatorConfig:cfg,exactMechanic:{indicatorPerReel:true,fillEvent:'FULL_STACK_OF_FOUR_WOLVES_ON_THAT_REEL_IN_BASE_GAME',allFiveTrigger:'SUPER_RESPIN_WITH_ALL_THREE_SPECIAL_FEATURES_GUARANTEED',indicatorsResetAfterTrigger:true,stateDoesNotResetWhenBetChanges:true,featureStakeEqualsTriggeringSpinStake:true},practiceVerdict:r.classification,execution:{...EXEC},hardGuards:{...(r.hardGuards||{}),sameTitleRulesNotTransferredAcrossOperators:true,servedRuntimeStateStillMustMatchPublishedRules:true,lastStackProbabilityUnknownUnlessExplicitlySupplied:true,superRespinConservativeValueUnknownUnlessExplicitlySupplied:true,repeatableCycleMustCountLowStakeBuildCost:true,realMoneyAllowed:false}};
}

export function compareUnstoppableWolfOperators(){return Object.entries(OPERATOR_CONFIG).map(([operatorId,cfg])=>({operatorId,...cfg,execution:{...EXEC}})).sort((a,b)=>b.stakeRatio-a.stakeRatio);}

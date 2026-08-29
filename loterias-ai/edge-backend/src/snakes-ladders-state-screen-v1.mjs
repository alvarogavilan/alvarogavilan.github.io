const VERSION='snakes-ladders-state-screen-v1';
const EXEC=Object.freeze({decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0});
const n=v=>Number.isFinite(Number(v))?Number(v):null;
const round=(v,d=8)=>Number.isFinite(v)?Number(v.toFixed(d)):null;
const exec=()=>({...EXEC});
export function screenSnakeProgressNextSpin(input={}){
  const stake=n(input.totalStakeEUR), segments=n(input.observedActiveSegments), total=n(input.totalSegments)??11, bonusFloorX=n(input.bonusMinimumGuaranteedMultiple)??20, p=n(input.probabilityCompletesSnakeNextSpin);
  if(!(stake>0)||!Number.isInteger(segments)||!Number.isInteger(total)||total<2||segments<0||segments>=total||!(bonusFloorX>0))return{version:VERSION,ok:false,reason:'VALID_PRE_TRIGGER_STATE_REQUIRED',execution:exec()};
  if(input.exactCurrentOperatorProgressRuleVerified!==true||input.exactCurrentOperatorBonusFloorVerified!==true)return{version:VERSION,ok:false,reason:'EXACT_OPERATOR_RULE_AND_BONUS_FLOOR_REQUIRED',execution:exec()};
  const needed=total-segments, payoutFloor=stake*bonusFloorX, breakEven=stake/payoutFloor;
  const base={version:VERSION,ok:true,observedActiveSegments:segments,totalSegments:total,minimumAdditionalProgressPointsNeeded:needed,totalStakeEUR:stake,bonusMinimumGuaranteedMultiple:bonusFloorX,metrics:{bonusPayoutFloorEUR:round(payoutFloor),breakEvenCompletionProbability:round(breakEven),breakEvenCompletionProbabilityPct:round(100*breakEven)},practiceVerdict:'WAIT_FOR_EXACT_OR_PROSPECTIVE_COMPLETION_PROBABILITY',execution:exec(),hardGuards:{ordinarySpinReturnIgnored:true,bonusUpsideAbove20xIgnored:true,completionProbabilityCannotBeInvented:true,stateMustBeObservedBeforeWager:true,currentServedBetLevelMustMatchState:true,noAutomaticBetting:true,noWagerProbe:true}};
  if(p===null)return base;
  if(p<0||p>1)return{version:VERSION,ok:false,reason:'INVALID_COMPLETION_PROBABILITY',execution:exec()};
  const evFloor=-stake+p*payoutFloor;
  return{...base,metrics:{...base.metrics,oneSpinNetEvFloorEUR:round(evFloor)},practiceVerdict:evFloor>0?'CONSERVATIVE_POSITIVE_SNAKE_COMPLETION_ONE_SPIN_CANDIDATE':'NON_POSITIVE_SNAKE_COMPLETION_LOWER_BOUND'};
}

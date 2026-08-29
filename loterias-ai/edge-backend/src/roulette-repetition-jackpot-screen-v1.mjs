const VERSION='roulette-repetition-jackpot-screen-v1';
const EXEC=Object.freeze({decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0});
const num=v=>Number.isFinite(Number(v))?Number(v):null;
const clamp01=v=>Math.max(0,Math.min(1,v));
const round=(v,d=8)=>Number.isFinite(v)?Number(v.toFixed(d)):null;
const execution=()=>({...EXEC});
function fail(reason,missing=[]){return {version:VERSION,ok:false,reason,missing,execution:execution()};}
export function evaluateRepetitionJackpot(input={}){
  const required=['wheelSize','currentStreakLength','triggerLength','qualifyingStakeEUR','baseHouseEdgePct','jackpotAwardFloorEUR','captureProbability'];
  const missing=required.filter(k=>num(input[k])===null);
  if(missing.length)return fail('MISSING_REQUIRED_INPUTS',missing);
  const wheel=Math.floor(num(input.wheelSize)),streak=Math.floor(num(input.currentStreakLength)),trigger=Math.floor(num(input.triggerLength));
  const stake=num(input.qualifyingStakeEUR),edge=num(input.baseHouseEdgePct)/100,award=num(input.jackpotAwardFloorEUR),capture=clamp01(num(input.captureProbability));
  if(!(wheel>=2&&streak>=1&&trigger>=2&&streak<trigger&&stake>0&&edge>=0&&edge<=1&&award>=0))return fail('INVALID_INPUT_RANGE');
  const exactEligibility=input.exactEligibilityRuleVerified===true;
  const exactPayout=input.exactPayoutFloorVerified===true;
  const exactStake=input.exactQualifyingStakeVerified===true;
  const fairWheel=input.fairIndependentWheelAssumptionVerified===true;
  const remaining=trigger-streak;
  const probabilityToCompleteFromHere=Math.pow(1/wheel,remaining);
  const nextSpinClosesJackpot=remaining===1;
  const nextSpinJackpotProbability=nextSpinClosesJackpot?1/wheel:0;
  const baseExpectedLossEUR=stake*edge;
  const jackpotExpectedValueFloorEUR=award*capture*nextSpinJackpotProbability;
  const oneSpinNetEvFloorEUR=jackpotExpectedValueFloorEUR-baseExpectedLossEUR;
  const breakEvenAwardFloorEUR=nextSpinJackpotProbability>0&&capture>0?baseExpectedLossEUR/(capture*nextSpinJackpotProbability):null;
  const allExact=exactEligibility&&exactPayout&&exactStake&&fairWheel;
  const practiceVerdict=!nextSpinClosesJackpot?'WAIT_FOR_TRIGGER_MINUS_ONE_STREAK':(!allExact?'BLOCKED_UNVERIFIED_EXECUTION_INPUTS':(oneSpinNetEvFloorEUR>0?'POSITIVE_ONE_SPIN_OVERLAY_IN_PRACTICE':'NON_POSITIVE_ONE_SPIN_OVERLAY_IN_PRACTICE'));
  return {version:VERSION,ok:true,practiceVerdict,inputs:{wheelSize:wheel,currentStreakLength:streak,triggerLength:trigger,qualifyingStakeEUR:stake,baseHouseEdgePct:num(input.baseHouseEdgePct),jackpotAwardFloorEUR:award,captureProbability:capture,exactEligibilityRuleVerified:exactEligibility,exactPayoutFloorVerified:exactPayout,exactQualifyingStakeVerified:exactStake,fairIndependentWheelAssumptionVerified:fairWheel},metrics:{remainingConsecutiveMatchesRequired:remaining,probabilityToCompleteFromHere:round(probabilityToCompleteFromHere,12),nextSpinClosesJackpot,nextSpinJackpotProbability:round(nextSpinJackpotProbability,12),baseExpectedLossEUR:round(baseExpectedLossEUR),jackpotExpectedValueFloorEUR:round(jackpotExpectedValueFloorEUR),oneSpinNetEvFloorEUR:round(oneSpinNetEvFloorEUR),breakEvenAwardFloorEUR:round(breakEvenAwardFloorEUR)},execution:execution(),hardGuards:{historicalRepetitionAloneDoesNotPredictOrdinaryRoulette:true,edgeExistsOnlyFromVerifiedJackpotOverlay:true,noHotNumberInference:true,noMartingaleInference:true,noAutomaticBetting:true,currentTargetAvailabilityMustBeVerified:true,partnerSpecificJackpotEconomicsMustBeVerified:true}};
}
export function liveG24ResearchTemplate(overrides={}){
  return evaluateRepetitionJackpot({wheelSize:37,currentStreakLength:2,triggerLength:3,qualifyingStakeEUR:1,baseHouseEdgePct:2.7027027027,jackpotAwardFloorEUR:0,captureProbability:1,exactEligibilityRuleVerified:false,exactPayoutFloorVerified:false,exactQualifyingStakeVerified:false,fairIndependentWheelAssumptionVerified:false,...overrides});
}

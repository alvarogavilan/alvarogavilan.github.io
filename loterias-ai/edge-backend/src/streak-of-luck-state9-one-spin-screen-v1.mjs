const VERSION='streak-of-luck-state9-one-spin-screen-v1.1-bonus-dice-guard';
const EXEC=Object.freeze({decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0});
const n=v=>Number.isFinite(Number(v))?Number(v):null;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const round=(v,d=8)=>Number.isFinite(v)?Number(v.toFixed(d)):null;
const exec=()=>({...EXEC});
export function screenStreak9NextSpin(input={}){
  const stake=n(input.totalStakeEUR), jackpot=n(input.jackpotAwardFloorEUR), fs=n(input.sixtyFreeSpinsValueFloorEUR)??0, p=n(input.probabilityJackpotBeforeState9TerminalLoss??input.probabilityNextSpinWinning);
  if(!(stake>0)||!(jackpot>=0)||!(fs>=0)) return {version:VERSION,ok:false,reason:'STAKE_JACKPOT_AND_NONNEGATIVE_FS_FLOOR_REQUIRED',execution:exec()};
  if(input.observedStreakState!==9) return {version:VERSION,ok:false,reason:'EXACT_OBSERVED_STREAK_STATE_9_REQUIRED',execution:exec()};
  const delta=jackpot-fs; let breakEven=null;if(delta>0)breakEven=clamp((stake-fs)/delta,0,1);
  const resolved=input.bonusDiceSequencingResolved===true;
  const base={version:VERSION,ok:true,mechanic:'STATE_9_TERMINAL_BRANCH_SENSITIVITY',inputs:{totalStakeEUR:stake,jackpotAwardFloorEUR:jackpot,sixtyFreeSpinsValueFloorEUR:fs,probabilityJackpotBeforeState9TerminalLoss:p,bonusDiceSequencingResolved:resolved},metrics:{guaranteedTerminalFeatureFloorEUR:round(Math.min(jackpot,fs)),breakEvenJackpotBeforeTerminalLossProbability:round(breakEven),breakEvenJackpotBeforeTerminalLossProbabilityPct:round(breakEven===null?null:100*breakEven)},execution:exec(),hardGuards:{ordinaryPaidSpinReturnIgnoredForLowerBound:true,futureValueAfterFreeSpinsIgnored:true,probabilityCannotBeInvented:true,jackpotMustBeExactSameBetLevel:true,state9MustBeObservedBeforeWager:true,bonusDiceWinningResultsCountTowardStreak:true,bonusDiceSequencingMustBeResolvedBeforePositiveVerdict:true,noAutomaticBetting:true,noWagerProbe:true}};
  if(!resolved)return{...base,practiceVerdict:'BLOCKED_BONUS_DICE_SEQUENCE_UNRESOLVED'};
  if(p===null)return{...base,practiceVerdict:'WAIT_FOR_EXACT_OR_PROSPECTIVE_TERMINAL_BRANCH_PROBABILITY'};
  if(p<0||p>1)return{version:VERSION,ok:false,reason:'INVALID_TERMINAL_BRANCH_PROBABILITY',execution:exec()};
  const evFloor=-stake+p*jackpot+(1-p)*fs;
  return{...base,metrics:{...base.metrics,oneSpinNetEvFloorEUR:round(evFloor)},practiceVerdict:evFloor>0?'CONSERVATIVE_POSITIVE_STATE9_ONE_SPIN_CANDIDATE':'NON_POSITIVE_STATE9_LOWER_BOUND'};
}

const VERSION='streak-of-luck-state9-one-spin-screen-v1';
const EXEC=Object.freeze({decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0});
const n=v=>Number.isFinite(Number(v))?Number(v):null;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const round=(v,d=8)=>Number.isFinite(v)?Number(v.toFixed(d)):null;
const exec=()=>({...EXEC});

export function screenStreak9NextSpin(input={}){
  const stake=n(input.totalStakeEUR), jackpot=n(input.jackpotAwardFloorEUR), fs=n(input.sixtyFreeSpinsValueFloorEUR)??0, p=n(input.probabilityNextSpinWinning);
  if(!(stake>0)||!(jackpot>=0)||!(fs>=0)) return {version:VERSION,ok:false,reason:'STAKE_JACKPOT_AND_NONNEGATIVE_FS_FLOOR_REQUIRED',execution:exec()};
  if(input.observedStreakState!==9) return {version:VERSION,ok:false,reason:'EXACT_OBSERVED_STREAK_STATE_9_REQUIRED',execution:exec()};
  const delta=jackpot-fs;
  let breakEvenWinProbability=null;
  if(delta>0) breakEvenWinProbability=clamp((stake-fs)/delta,0,1);
  const structuralFeatureFloor=Math.min(jackpot,fs);
  const base={version:VERSION,ok:true,mechanic:'STATE_9_NEXT_SPIN_TERMINAL_BRANCH',inputs:{totalStakeEUR:stake,jackpotAwardFloorEUR:jackpot,sixtyFreeSpinsValueFloorEUR:fs,probabilityNextSpinWinning:p},metrics:{guaranteedFeaturePayoutFloorEUR:round(structuralFeatureFloor),breakEvenWinProbabilityIgnoringOrdinarySpinPayouts:round(breakEvenWinProbability),breakEvenWinProbabilityPct:round(breakEvenWinProbability===null?null:100*breakEvenWinProbability)},execution:exec(),hardGuards:{ordinaryPaidSpinReturnIgnoredForLowerBound:true,futureValueAfterFreeSpinsIgnored:true,probabilityCannotBeInvented:true,jackpotMustBeExactSameBetLevel:true,state9MustBeObservedBeforeWager:true,noAutomaticBetting:true,noWagerProbe:true}};
  if(p===null) return {...base,practiceVerdict:'WAIT_FOR_EXACT_OR_PROSPECTIVE_WIN_PROBABILITY'};
  if(p<0||p>1) return {version:VERSION,ok:false,reason:'INVALID_WIN_PROBABILITY',execution:exec()};
  const evFloor=-stake+p*jackpot+(1-p)*fs;
  return {...base,metrics:{...base.metrics,oneSpinNetEvFloorEUR:round(evFloor)},practiceVerdict:evFloor>0?'CONSERVATIVE_POSITIVE_STATE9_ONE_SPIN_CANDIDATE':'NON_POSITIVE_STATE9_LOWER_BOUND'};
}

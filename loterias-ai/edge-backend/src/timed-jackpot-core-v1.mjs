export const TIMED_JACKPOT_CANDIDATES=[{
  id:'jokerbet:777-diamond-strike:daily',
  jurisdiction:'ES',operator:'jokerbet-es',provider:'Red Tiger',game:'777 Diamond Strike',tier:'Daily',
  mechanism:'TIMED_PROGRESSIVE',catalogMinStakeEUR:0.10,catalogMaxStakeEUR:10,publishedRtp:0.9474,
  currentCatalogVerified:true,currentRulesMechanismVerified:true,
  guaranteedBeforeDeadline:true,probabilityIncreasesTowardDeadline:true,payoutGuaranteeAtDeadline:true,
  catalogSaysHigherBetRaisesChance:true,
  rulesDynamicAllocationRawEUR:1.71,rulesDynamicAllocationInterpretationVerified:false,
  historicalIndexedPotEUR:8556.52,historicalIndexedPotIsCurrent:false,
  currentPotEUR:null,currentDeadline:null,currentDeadlineTimezone:null,currentEligibleStakeEUR:null,currentPanelFingerprint:null,
  sourceUrls:['https://www.jokerbet.es/tragaperras-slots/777-diamond-strike.html','https://www.jokerbet.es/img/logos/pdf/777-diamond-strike.pdf']
}];

export function evaluateTimedJackpotCandidate(c,nowMs=Date.now()){
  const deadlineMs=c.currentDeadline?Date.parse(c.currentDeadline):NaN;
  const deadlineReadable=Number.isFinite(deadlineMs);
  const secondsToDeadline=deadlineReadable?Math.floor((deadlineMs-nowMs)/1000):null;
  const exactStake=Number.isFinite(Number(c.currentEligibleStakeEUR))&&Number(c.currentEligibleStakeEUR)>0?Number(c.currentEligibleStakeEUR):null;
  const currentPot=Number.isFinite(Number(c.currentPotEUR))&&Number(c.currentPotEUR)>0?Number(c.currentPotEUR):null;
  const blockers=[];
  if(!c.currentRulesMechanismVerified)blockers.push('TIMED_MECHANISM_NOT_VERIFIED');
  if(!deadlineReadable)blockers.push('CURRENT_DEADLINE_UNRESOLVED');
  if(!c.currentDeadlineTimezone)blockers.push('DEADLINE_TIMEZONE_UNRESOLVED');
  if(currentPot===null)blockers.push('CURRENT_TIMED_POT_UNRESOLVED');
  if(exactStake===null)blockers.push('EXACT_ELIGIBLE_STAKE_UNRESOLVED');
  if(!c.currentPanelFingerprint)blockers.push('CURRENT_PANEL_IDENTITY_UNRESOLVED');
  blockers.push('PLAYER_SPECIFIC_HAZARD_CURVE_UNRESOLVED');
  blockers.push('STAKE_SCALING_LAW_UNRESOLVED');
  blockers.push('COMPETING_PLAYER_INTENSITY_UNRESOLVED');
  blockers.push('LATENCY_TO_LAST_ELIGIBLE_SPIN_UNRESOLVED');
  return {
    ...c,secondsToDeadline,
    staleHistoricalPotExcludedFromCurrent:true,
    executionReady:false,positiveEvProven:false,realMoneyAllowed:false,
    priorityScore:c.currentRulesMechanismVerified?95:50,
    blockers,
    interpretation:{
      payoutGuaranteeAtDeadline:'The rules guarantee the jackpot is paid by the stated time; this is NOT a 100% individual-player win probability.',
      probabilityIncrease:'The rules establish increasing award probability as the deadline approaches, but do not expose the player-specific hazard curve.',
      stakeScaling:'The current catalog says larger bets improve chances, but the exact function is unknown.',
      historicalIndexedPot:'The indexed €8,556.52 value is a stale rules/index snapshot and is never rendered as current.'
    }
  };
}

export function timedJackpotResearch(nowMs=Date.now()){
  const rows=TIMED_JACKPOT_CANDIDATES.map(x=>evaluateTimedJackpotCandidate(x,nowMs));
  return {version:'edge-timed-jackpot-lab-v1',rows,leader:rows[0]||null,guards:{deadlineGuaranteeNeverEqualsPlayerCertainty:true,staleRulesValuesNeverCurrent:true,exactCurrentPanelRequired:true,exactEligibleStakeRequired:true,stakeScalingLawRequired:true,latencyAndCompetitionRequired:true,realMoneyAllowed:false}};
}

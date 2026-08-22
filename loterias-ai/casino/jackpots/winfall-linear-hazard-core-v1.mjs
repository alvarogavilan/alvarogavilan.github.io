// Winfall Wishes Jackpot: exact algebra implied by the operator's statement
// that jackpot probability is proportional to Total Bet. This module never
// estimates the missing proportionality constant k.

export function finiteOrNull(v){
  if(v===null||v===undefined||v==='') return null;
  const n=Number(v);
  return Number.isFinite(n)?n:null;
}

// If P(jackpot | stake=s) is proportional to s, then P = k*s for an unknown
// k with units 1/EUR. A jackpot award of current value J therefore contributes
// expected return (k*s*J)/s = k*J per euro wagered. Stake cancels exactly.
export function progressiveReturnPerEuro({jackpotEUR,kPerEUR}={}){
  const J=finiteOrNull(jackpotEUR),k=finiteOrNull(kPerEUR);
  if(J===null||k===null||J<0||k<=0) return null;
  return k*J;
}

export function conservativeTotalRtp({baseRtpPct=94.85,jackpotEUR,kPerEUR}={}){
  const base=finiteOrNull(baseRtpPct);
  const prog=progressiveReturnPerEuro({jackpotEUR,kPerEUR});
  if(base===null||prog===null) return null;
  return base/100+prog;
}

export function breakEvenJackpotEUR({baseRtpPct=94.85,kPerEUR}={}){
  const base=finiteOrNull(baseRtpPct),k=finiteOrNull(kPerEUR);
  if(base===null||k===null||k<=0||base>=100||base<0) return null;
  return (1-base/100)/k;
}

export function buildWinfallEconomicsState({
  baseRtpPct=94.85,
  contributionPct=0.60,
  jackpotEUR=null,
  kPerEUR=null,
}={}){
  const total=conservativeTotalRtp({baseRtpPct,jackpotEUR,kPerEUR});
  const breakEven=breakEvenJackpotEUR({baseRtpPct,kPerEUR});
  return {
    model:{
      probabilityLaw:'P_JACKPOT_PER_DECISION = kPerEUR * stakeEUR',
      progressiveReturnPerEuroFormula:'kPerEUR * jackpotEUR',
      totalRtpFormula:'baseRtpPct/100 + kPerEUR*jackpotEUR',
      breakEvenFormula:'(1 - baseRtpPct/100) / kPerEUR',
      stakeCancelsUnderPublishedProportionality:true,
    },
    inputs:{baseRtpPct,contributionPct,jackpotEUR:finiteOrNull(jackpotEUR),kPerEUR:finiteOrNull(kPerEUR)},
    current:{
      progressiveReturnPerEuro:progressiveReturnPerEuro({jackpotEUR,kPerEUR}),
      conservativeTotalRtp:total,
      breakEvenJackpotEUR:breakEven,
      positiveEvProven:total!==null&&total>1,
    },
    decision:{
      hazardConstantKnown:finiteOrNull(kPerEUR)!==null&&Number(kPerEUR)>0,
      breakEvenKnown:breakEven!==null,
      economicPromotionAllowed:total!==null&&total>1,
      realMoneyAllowed:false,
    },
    guards:{
      contributionRateNeverSubstitutesForHazard:true,
      publishedBasePlusContributionNeverUsedAsCurrentRtp:true,
      foreignSeedNeverUsed:true,
      unknownKStaysNull:true,
      noBetting:true,
      realMoneyAllowed:false,
    },
  };
}

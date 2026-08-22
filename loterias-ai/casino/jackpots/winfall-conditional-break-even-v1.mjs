export function breakEvenMultipleOfMeanHit({baseRtpPct=94.85,contributionPct=0.60}={}){
  const base=Number(baseRtpPct), c=Number(contributionPct)/100;
  if(!Number.isFinite(base)||!Number.isFinite(c)||base<0||base>=100||c<=0) return null;
  return (1-base/100)/c;
}

export function conditionalKFromMeanHit({meanHitEUR,contributionPct=0.60}={}){
  const mean=Number(meanHitEUR), c=Number(contributionPct)/100;
  if(!Number.isFinite(mean)||mean<=0||!Number.isFinite(c)||c<=0) return null;
  return c/mean;
}

export function conditionalBreakEvenFromMeanHit({meanHitEUR,baseRtpPct=94.85,contributionPct=0.60}={}){
  const mult=breakEvenMultipleOfMeanHit({baseRtpPct,contributionPct});
  const mean=Number(meanHitEUR);
  if(mult===null||!Number.isFinite(mean)||mean<=0) return null;
  return mult*mean;
}

export function buildConditionalWinfallDiagnostic({
  observedHitCandidatesEUR=[],
  baseRtpPct=94.85,
  contributionPct=0.60,
  exactPoolIdentityVerified=false,
  jackpotAwardVerified=false,
  constantHazardVerified=false,
}={}){
  const hits=observedHitCandidatesEUR.map(Number).filter(x=>Number.isFinite(x)&&x>0);
  const mean=hits.length?hits.reduce((a,b)=>a+b,0)/hits.length:null;
  const k=mean===null?null:conditionalKFromMeanHit({meanHitEUR:mean,contributionPct});
  const breakEven=mean===null?null:conditionalBreakEvenFromMeanHit({meanHitEUR:mean,baseRtpPct,contributionPct});
  return {
    assumptions:{
      probabilityLaw:'P(jackpot on wager)=kPerEUR*stakeEUR',
      zeroReset:true,
      contributionPct,
      baseRtpPct,
      hitAmountDistributionUnderConstantHazard:'exponential in jackpot meter amount',
    },
    sample:{count:hits.length,hitCandidatesEUR:hits,meanHitCandidateEUR:mean},
    conditional:{
      breakEvenMultipleOfMeanHit:breakEvenMultipleOfMeanHit({baseRtpPct,contributionPct}),
      kPerEUR_MLE:k,
      breakEvenJackpotEUR_MLE:breakEven,
    },
    verification:{exactPoolIdentityVerified,jackpotAwardVerified,constantHazardVerified},
    decision:{
      estimatorPromotionAllowed:exactPoolIdentityVerified&&jackpotAwardVerified&&constantHazardVerified&&hits.length>=10,
      economicPromotionAllowed:false,
      realMoneyAllowed:false,
      stakeEUR:0,
    },
    guards:{
      singleResetNeverEnough:true,
      synchronizedResetDoesNotProveAward:true,
      proportionalToStakeDoesNotByItselfProveConstantHazardAcrossJackpotValues:true,
      noOptionalStopping:true,
      realMoneyAllowed:false,
    }
  };
}

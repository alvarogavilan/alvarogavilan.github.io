export function summarizeAwards(values=[]){
  const a=values.map(Number).filter(Number.isFinite).filter(x=>x>0).sort((x,y)=>x-y);
  if(!a.length)return {n:0,totalEUR:0,meanEUR:null,medianEUR:null,minEUR:null,maxEUR:null};
  const total=a.reduce((s,x)=>s+x,0),mid=Math.floor(a.length/2),median=a.length%2?a[mid]:(a[mid-1]+a[mid])/2;
  return {n:a.length,totalEUR:total,meanEUR:total/a.length,medianEUR:median,minEUR:a[0],maxEUR:a[a.length-1]};
}

export function conditionalConstantHazardScreen({awardAmounts=[],contributionRates=[0.02,0.035],currentJackpotEUR=null}={}){
  const stats=summarizeAwards(awardAmounts);
  if(!stats.n||!stats.meanEUR)return {eligible:false,stats,models:[]};
  const seedLowerEUR=0,seedUpperEUR=stats.minEUR;
  const models=contributionRates.filter(x=>Number.isFinite(Number(x))&&Number(x)>0).map(raw=>{
    const c=Number(raw),kAtSeedLower=c/(stats.meanEUR-seedLowerEUR),kAtSeedUpper=stats.meanEUR>seedUpperEUR?c/(stats.meanEUR-seedUpperEUR):null;
    const kLow=Math.min(kAtSeedLower,kAtSeedUpper??kAtSeedLower),kHigh=Math.max(kAtSeedLower,kAtSeedUpper??kAtSeedLower);
    const j=Number(currentJackpotEUR);
    return {contributionRateFraction:c,seedAssumptionRangeEUR:[seedLowerEUR,seedUpperEUR],hazardPerEURConditionalRange:[kLow,kHigh],currentProgressiveRtpConditionalRange:Number.isFinite(j)&&j>0?[kLow*j,kHigh*j]:null};
  });
  return {
    eligible:true,stats,models,
    assumptions:{sameConfigurationAcrossHistoricalAwards:false,constantHazardPerEUR:false,contributionRateResolved:false,seedKnown:false,unbiasedCompleteAwardSample:false},
    interpretation:'Pure hypothesis screen. Formula assumes E[J]=S+c/k, so k=c/(E[J]-S). None of the required identity/constant-hazard/seed/contribution assumptions is verified.',
    breakEvenJackpotEUR:null,positiveEvProven:false,realMoneyAllowed:false
  };
}

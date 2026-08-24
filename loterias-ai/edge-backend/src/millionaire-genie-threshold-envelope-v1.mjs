import { summarizeAwards } from './millionaire-genie-historical-screen-v1.mjs';

function finitePositive(v){return v!==null&&v!==undefined&&Number.isFinite(Number(v))&&Number(v)>0;}

export function buildMillionaireGenieThresholdEnvelope({awardAmounts=[],theoreticalRtp=0.9502,contributionRates=[0.02,0.035],currentJackpotEUR=null}={}){
  const stats=summarizeAwards(awardAmounts);
  if(!stats.n||!finitePositive(stats.meanEUR))return {eligible:false,stats,scenarios:[],minimumEnumeratedThresholdEUR:null,currentBelowAllEnumeratedConditionalScreens:null};
  const seedRange=[0,stats.minEUR];
  const scenarios=[];
  for(const raw of contributionRates){
    const c=Number(raw);if(!(c>0))continue;
    const kLow=c/(stats.meanEUR-seedRange[0]);
    const kHigh=c/(stats.meanEUR-seedRange[1]);
    const variants=[
      {rtpSemantic:'THEORETICAL_RTP_IS_BASE_EXCLUDING_PROGRESSIVE',baseRtp:Number(theoreticalRtp)},
      {rtpSemantic:'THEORETICAL_RTP_INCLUDES_STATIONARY_PROGRESSIVE_RETURN',baseRtp:Number(theoreticalRtp)-c}
    ];
    for(const v of variants){
      const shortfall=1-v.baseRtp;
      const lower=shortfall/kHigh,upper=shortfall/kLow;
      scenarios.push({
        contributionRateFraction:c,
        rtpSemantic:v.rtpSemantic,
        assumedBaseRtp:v.baseRtp,
        seedAssumptionRangeEUR:seedRange,
        conditionalHazardPerEURRange:[kLow,kHigh],
        conditionalBreakEvenJackpotEURRange:[lower,upper],
        currentJackpotEUR:finitePositive(currentJackpotEUR)?Number(currentJackpotEUR):null,
        currentBelowThisEnumeratedConditionalRange:finitePositive(currentJackpotEUR)?Number(currentJackpotEUR)<lower:null,
        executable:false
      });
    }
  }
  const minThreshold=scenarios.length?Math.min(...scenarios.map(x=>x.conditionalBreakEvenJackpotEURRange[0])):null;
  const current=finitePositive(currentJackpotEUR)?Number(currentJackpotEUR):null;
  return {
    eligible:true,
    stats,
    scenarios,
    minimumEnumeratedThresholdEUR:minThreshold,
    currentBelowAllEnumeratedConditionalScreens:current!==null&&minThreshold!==null?current<minThreshold:null,
    assumptionsVerified:{historicalConfigurationContinuity:false,contributionRate:false,rtpSemantic:false,seed:false,constantHazard:false,completeUnbiasedAwardSample:false},
    interpretation:'Scenario envelope only. It shows what the threshold would be under explicitly enumerated assumptions; it is not a rigorous lower bound outside those assumptions and cannot prove positive or negative EV.',
    positiveEvProven:false,
    negativeEvProven:false,
    realMoneyAllowed:false
  };
}

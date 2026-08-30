import {poissonLatencySurvival} from './competition.mjs';
export function worstCaseFreshnessSurvival({competitorAcceptedSpinRateUpperPerSecond,latencyUpperSeconds}){
  if(competitorAcceptedSpinRateUpperPerSecond==null||latencyUpperSeconds==null)return{status:'UNKNOWN',value:null};
  return{status:'PARAMETRIC_LOWER_BOUND',value:poissonLatencySurvival({competitorAcceptedSpinRatePerSecond:competitorAcceptedSpinRateUpperPerSecond,latencySeconds:latencyUpperSeconds})};
}

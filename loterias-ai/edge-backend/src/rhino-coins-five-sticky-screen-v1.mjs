const VERSION='rhino-coins-five-sticky-screen-v1';
const EXEC=Object.freeze({decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0});
const n=v=>Number.isFinite(Number(v))?Number(v):null;
const round=(v,d=8)=>Number.isFinite(v)?Number(v.toFixed(d)):null;
const exec=()=>({...EXEC});
export function screenRhinoFiveRegularCoins(input={}){
  const stake=n(input.totalStakeEUR),values=Array.isArray(input.visibleRegularBonusCoinValuesX)?input.visibleRegularBonusCoinValuesX.map(n).filter(v=>v!==null&&v>=1):[],p=n(input.probabilityAtLeastOneNewRegularBonusCoinNextSpin);
  if(!(stake>0))return{version:VERSION,ok:false,reason:'TOTAL_STAKE_REQUIRED',execution:exec()};
  if(values.length<5)return{version:VERSION,ok:false,reason:'AT_LEAST_FIVE_VISIBLE_REGULAR_BONUS_COINS_REQUIRED',execution:exec()};
  const visibleFloorX=values.reduce((a,b)=>a+b,0),completionFloorX=visibleFloorX+1,breakEven=1/completionFloorX;
  const base={version:VERSION,ok:true,mechanic:'FIVE_VISIBLE_REGULAR_BONUS_COINS_ONE_SPIN_COMPLETION_LOWER_BOUND',inputs:{totalStakeEUR:stake,visibleRegularBonusCoinValuesX:values,probabilityAtLeastOneNewRegularBonusCoinNextSpin:p},metrics:{visibleCoinFloorX:round(visibleFloorX),completionPayoutFloorX:round(completionFloorX),completionPayoutFloorEUR:round(completionFloorX*stake),breakEvenCompletionProbability:round(breakEven),breakEvenCompletionProbabilityPct:round(100*breakEven)},execution:exec(),hardGuards:{exactInterwettenSavedStateRequired:true,onlyRegularBonusCoinCompletionModeled:true,ordinarySpinReturnIgnored:true,otherQualifyingSymbolsIgnored:true,bonusUpsideIgnored:true,probabilityCannotBeInvented:true,stickyOccupancyEffectMustBeResolved:true,noAutomaticBetting:true,noWagerProbe:true}};
  if(input.exactCurrentStateObserved!==true)return{...base,practiceVerdict:'WAIT_FOR_EXACT_CURRENT_SAVED_STATE'};
  if(p===null)return{...base,practiceVerdict:'WAIT_FOR_PROSPECTIVE_REGULAR_COIN_PROBABILITY'};
  if(p<0||p>1)return{version:VERSION,ok:false,reason:'INVALID_PROBABILITY',execution:exec()};
  const ev=-stake+p*completionFloorX*stake;
  return{...base,metrics:{...base.metrics,oneSpinNetEvLowerBoundEUR:round(ev)},practiceVerdict:ev>0?'CONSERVATIVE_POSITIVE_RHINO_FIVE_COIN_CANDIDATE':'NON_POSITIVE_RHINO_LOWER_BOUND'};
}

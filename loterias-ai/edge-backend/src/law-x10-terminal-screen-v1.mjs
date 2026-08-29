const VERSION='law-x10-terminal-screen-v1';
const EXEC=Object.freeze({decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0});
const n=v=>Number.isFinite(Number(v))?Number(v):null;
const r=(v,d=8)=>Number.isFinite(v)?Number(v.toFixed(d)):null;

export function screenLawX10({stakeEUR=8,multiplier=10,minCoinValueX=.5,minQualifyingReels=3,netBuildCostEUR=0,coinWinProbability=null,exerciseLossRate=1}={}){
 const s=n(stakeEUR),m=n(multiplier),coin=n(minCoinValueX),reels=n(minQualifyingReels),build=n(netBuildCostEUR),p=n(coinWinProbability),loss=n(exerciseLossRate);
 if(!(s>0)||!(m>0)||!(coin>0)||!(reels>=3)||build===null||build<0||loss===null||loss<0)return{version:VERSION,ok:false,reason:'INVALID_INPUT',execution:{...EXEC}};
 const floorX=m*coin*reels;
 const denom=floorX-build/s;
 const breakEven=denom>0?loss/denom:null;
 const out={version:VERSION,ok:true,inputs:{stakeEUR:s,multiplier:m,minCoinValueX:coin,minQualifyingReels:reels,netBuildCostEUR:build,coinWinProbability:p,exerciseLossRate:loss},metrics:{minimumQualifyingCoinGrossPayoutX:r(floorX),breakEvenCoinWinProbability:r(breakEven),breakEvenCoinWinProbabilityPct:breakEven===null?null:r(100*breakEven)},execution:{...EXEC},hardGuards:{minimumPayoutUsesOnlyExactCoinFloor:true,overallHitFrequencyCannotReplaceCoinWinProbability:true,buildCostMustIncludeNineMultiplierIncrements:true,wildReelStateIsPerBetAndMustBeInactiveAtExercise:true,ordinaryReturnsIgnoredUnlessBounded:true,noWagerProbe:true,noAutomaticBetting:true}};
 if(p===null)return{...out,practiceVerdict:'WAIT_FOR_COIN_WIN_PROBABILITY_AND_BUILD_COST'};
 if(!(p>0&&p<=1))return{version:VERSION,ok:false,reason:'INVALID_COIN_WIN_PROBABILITY',execution:{...EXEC}};
 const waitingCost=s*loss/p;
 const floorEUR=floorX*s;
 const ev=floorEUR-waitingCost-build;
 return{...out,metrics:{...out.metrics,expectedExerciseSpins:r(1/p),conservativeWaitingCostEUR:r(waitingCost),minimumQualifyingCoinGrossPayoutEUR:r(floorEUR),cycleEvLowerBoundEUR:r(ev)},practiceVerdict:ev>0?'ROBUST_POSITIVE_IF_INPUT_BOUNDS_ARE_OPERATOR_VALID':'NON_POSITIVE_UNDER_INPUT_BOUNDS'};
}

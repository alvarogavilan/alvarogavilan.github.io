const VERSION='law-of-zeus-x10-wait-cycle-v1';
const EXEC=Object.freeze({decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0});
const n=v=>Number.isFinite(Number(v))?Number(v):null;
const round=(v,d=8)=>Number.isFinite(v)?Number(v.toFixed(d)):null;
export function breakEvenCoinWinProbability({exerciseStakeEUR=8,minCoinWinGrossX=15,netBuildCostEUR=0}={}){
  const s=n(exerciseStakeEUR),x=n(minCoinWinGrossX),c=n(netBuildCostEUR);
  if(!(s>0)||!(x>0)||c===null||c<0)return{version:VERSION,ok:false,reason:'INVALID_INPUT',execution:{...EXEC}};
  const grossFloor=s*x;
  if(c>=grossFloor)return{version:VERSION,ok:true,mathematicallyPossibleUnderFloorOnly:false,grossFloorEUR:round(grossFloor),netBuildCostEUR:c,breakEvenCoinWinProbability:null,execution:{...EXEC}};
  const q=s/(grossFloor-c);
  return{version:VERSION,ok:true,mathematicallyPossibleUnderFloorOnly:q<=1,grossFloorEUR:round(grossFloor),netBuildCostEUR:c,breakEvenCoinWinProbability:round(q),breakEvenCoinWinProbabilityPct:round(100*q),expectedExerciseSpinsAtThreshold:round(1/q),execution:{...EXEC},hardGuards:{ordinarySpinReturnsIgnored:true,coinWinProbabilityUnknown:true,buildCostUnknownUnlessSupplied:true,operatorConfigMustMatch:true,noAutomaticBetting:true,noWagerProbe:true}};
}
export function frontier({exerciseStakeEUR=8,minCoinWinGrossX=15,buildCostsEUR=[0,4,10,20,40,60,80,100]}={}){
 return buildCostsEUR.map(netBuildCostEUR=>breakEvenCoinWinProbability({exerciseStakeEUR,minCoinWinGrossX,netBuildCostEUR}));
}
if(import.meta.url===`file://${process.argv[1]}`)process.stdout.write(`${JSON.stringify(frontier(),null,2)}\n`);

const VERSION='roulette-practice-engine-v1';
export const RED=new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);
export const WHEEL=Object.freeze([0,32,15,19,4,21,2,25,17,34,6,27,13,36,11,30,8,23,10,5,24,16,33,1,20,14,31,9,22,18,29,7,28,12,35,3,26]);
const round=(v,d=6)=>Number.isFinite(v)?Number(v.toFixed(d)):null;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export function seededRng(seed=1){let a=(Number(seed)>>>0)||1;return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
export function drawPocket(rng=Math.random,{biasPocket=null,biasWeight=1}={}){
  const p=Number.isInteger(Number(biasPocket))?Number(biasPocket):null;const w=Math.max(0.000001,Number(biasWeight)||1);
  if(p===null||p<0||p>36||Math.abs(w-1)<1e-12)return Math.floor(rng()*37);
  const total=36+w;let x=rng()*total;for(let n=0;n<=36;n++){const weight=n===p?w:1;if(x<weight)return n;x-=weight;}return 36;
}
function uniqueRandomSet(rng,k){const a=Array.from({length:37},(_,i)=>i);for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return new Set(a.slice(0,clamp(Math.floor(k),1,36)));}
function neighbors(center,radius=2){const idx=WHEEL.indexOf(Number(center));if(idx<0)return new Set([Number(center)]);const s=new Set();for(let d=-radius;d<=radius;d++)s.add(WHEEL[(idx+d+37)%37]);return s;}
function settleSet(number,set,unit){const k=set.size,totalStake=k*unit;const gross=set.has(number)?36*unit:0;return{stake:totalStake,gross,net:gross-totalStake,hit:set.has(number)};}
function settleEven(number,predicate,stake){const hit=predicate(number),gross=hit?2*stake:0;return{stake,gross,net:gross-stake,hit};}
function settleStraight(number,target,stake){const hit=number===target,gross=hit?36*stake:0;return{stake,gross,net:gross-stake,hit};}
export function theoreticalStraightEvPerEuro({biasPocket=null,biasWeight=1,targetNumber=17}={}){const p=(Number(biasPocket)===Number(targetNumber))?Number(biasWeight)/(36+Number(biasWeight)):1/(36+Number(biasWeight));return{hitProbability:p,netEvPerEuro:36*p-1,breakEvenProbability:1/36};}
export function simulateRoulettePractice(input={}){
  const strategy=String(input.strategy||'flat-red'),spins=clamp(Math.floor(Number(input.spins)||10000),1,2_000_000),baseUnit=Math.max(.000001,Number(input.baseUnit)||1),maxBet=Math.max(baseUnit,Number(input.maxBet)||1024),startBankroll=Number(input.startBankroll)||1000,target=clamp(Math.floor(Number(input.targetNumber)||17),0,36),biasPocket=Number.isInteger(Number(input.biasPocket))?clamp(Number(input.biasPocket),0,36):null,biasWeight=Math.max(.000001,Number(input.biasWeight)||1),rng=seededRng(Number(input.seed)||1);
  let bankroll=startBankroll,totalStake=0,totalGross=0,wins=0,maxBankroll=bankroll,maxDrawdown=0,currentMartingale=baseUnit,fib=[1,1],fibIndex=0,axaSet=uniqueRandomSet(rng,Number(input.axaSetSize)||18),axaLeft=3;const history=[];
  for(let i=0;i<spins;i++){
    const n=drawPocket(rng,{biasPocket,biasWeight});let settle;
    if(strategy==='flat-red')settle=settleEven(n,x=>RED.has(x),baseUnit);
    else if(strategy==='martingale-red'){const stake=Math.min(currentMartingale,maxBet);settle=settleEven(n,x=>RED.has(x),stake);currentMartingale=settle.hit?baseUnit:Math.min(stake*2,maxBet);}
    else if(strategy==='fibonacci-red'){while(fib.length<=fibIndex)fib.push(fib.at(-1)+fib.at(-2));const stake=Math.min(baseUnit*fib[fibIndex],maxBet);settle=settleEven(n,x=>RED.has(x),stake);fibIndex=settle.hit?Math.max(0,fibIndex-2):fibIndex+1;}
    else if(strategy==='straight')settle=settleStraight(n,target,baseUnit);
    else if(strategy==='neighbors5')settle=settleSet(n,neighbors(target,2),baseUnit);
    else if(strategy==='axa-like-random-set'){if(axaLeft<=0){axaSet=uniqueRandomSet(rng,Number(input.axaSetSize)||18);axaLeft=3;}settle=settleSet(n,axaSet,baseUnit);axaLeft--;}
    else settle=settleEven(n,x=>RED.has(x),baseUnit);
    bankroll+=settle.net;totalStake+=settle.stake;totalGross+=settle.gross;if(settle.hit)wins++;if(bankroll>maxBankroll)maxBankroll=bankroll;maxDrawdown=Math.max(maxDrawdown,maxBankroll-bankroll);if(i<200)history.push(n);
  }
  return{version:VERSION,mode:biasPocket===null||Math.abs(biasWeight-1)<1e-12?'FAIR_EUROPEAN_RNG':'CONTROLLED_BIAS',strategy,spins,baseUnit,startBankroll,endingBankroll:round(bankroll),profit:round(bankroll-startBankroll),totalStake:round(totalStake),totalGrossReturn:round(totalGross),observedRtpPct:round(totalStake?100*totalGross/totalStake:null),observedNetPerEuro:round(totalStake?(totalGross-totalStake)/totalStake:null),wins,maxDrawdown:round(maxDrawdown),targetNumber:target,biasPocket,biasWeight,firstResults:history,execution:{decision:'PRACTICE_ONLY',realMoneyAllowed:false,realStakeEUR:0},hardGuards:{simulationIsNotCasinoEvidence:true,axaLikeModeIsAuditInformedSurrogateNotExactProprietaryClone:true,martingaleDoesNotChangeUnderlyingProbability:true,fibonacciDoesNotChangeUnderlyingProbability:true}};
}

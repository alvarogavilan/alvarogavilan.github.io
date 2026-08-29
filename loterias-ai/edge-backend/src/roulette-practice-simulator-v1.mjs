const VERSION='roulette-european-practice-simulator-v1';
const WHEEL=[0,32,15,19,4,21,2,25,17,34,6,27,13,36,11,30,8,23,10,5,24,16,33,1,20,14,31,9,22,18,29,7,28,12,35,3,26];
const RED=new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);
const BLACK=new Set([...Array(37).keys()].filter(n=>n!==0&&!RED.has(n)));
const EXECUTION=Object.freeze({decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0});
const round=(v,d=6)=>Number.isFinite(v)?Number(v.toFixed(d)):null;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function mulberry32(seed){let a=seed>>>0;return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function normalizeWeights(bias={}){const w=Array(37).fill(1);for(const [k,v] of Object.entries(bias||{})){const n=Number(k),m=Number(v);if(Number.isInteger(n)&&n>=0&&n<=36&&Number.isFinite(m)&&m>0)w[n]=m;}const sum=w.reduce((a,b)=>a+b,0);return w.map(x=>x/sum);}
export function createWheelSampler({seed=123456789,bias={}}={}){const rnd=mulberry32(seed),p=normalizeWeights(bias),cdf=[];let s=0;for(let n=0;n<37;n++){s+=p[n];cdf.push(s);}return()=>{const x=rnd();for(let n=0;n<37;n++)if(x<cdf[n])return n;return 36;};}
export function settleEvenMoney(number,selection){const s=String(selection||'RED').toUpperCase();if(number===0)return -1;if(s==='RED')return RED.has(number)?1:-1;if(s==='BLACK')return BLACK.has(number)?1:-1;if(s==='EVEN')return number%2===0?1:-1;if(s==='ODD')return number%2===1?1:-1;if(s==='LOW')return number>=1&&number<=18?1:-1;if(s==='HIGH')return number>=19&&number<=36?1:-1;throw new Error('UNKNOWN_EVEN_MONEY_SELECTION');}
export function exactEuropeanEvenMoneyEV(){return {winProbability:18/37,lossProbability:19/37,netPerUnit:(18-19)/37,houseEdgePct:100/37};}
function fibonacciNext(state,win){let {a,b}=state;if(win)return {a:1,b:1,stake:1};const next=a+b;return {a:b,b:next,stake:next};}
export function simulateEvenMoneyStrategy({strategy='FLAT',spins=1000000,baseBetEUR=1,tableMaxEUR=100,startingBankrollEUR=1000000,seed=1,bias={},selection='RED',stopOnRuin=true}={}){
  const sample=createWheelSampler({seed,bias});const mode=String(strategy).toUpperCase();let bankroll=startingBankrollEUR,peak=bankroll,maxDrawdown=0,totalWagered=0,wins=0,losses=0,maxStake=0,stake=baseBetEUR;let fib={a:1,b:1,stake:1};let completed=0;
  for(let i=0;i<spins;i++){
    let units=1;if(mode==='MARTINGALE')units=stake/baseBetEUR;else if(mode==='FIBONACCI')units=fib.stake;else if(mode==='DALEMBERT')units=stake/baseBetEUR;
    let bet=clamp(baseBetEUR*units,baseBetEUR,tableMaxEUR);if(bet>bankroll){if(stopOnRuin)break;bet=Math.max(0,bankroll);}if(!(bet>0))break;
    maxStake=Math.max(maxStake,bet);totalWagered+=bet;const number=sample();const outcome=settleEvenMoney(number,selection);const win=outcome>0;bankroll+=bet*outcome;if(win)wins++;else losses++;completed++;
    if(mode==='MARTINGALE')stake=win?baseBetEUR:Math.min(tableMaxEUR,bet*2);
    else if(mode==='FIBONACCI'){fib=fibonacciNext(fib,win);fib.stake=Math.min(fib.stake,Math.max(1,Math.floor(tableMaxEUR/baseBetEUR)));}
    else if(mode==='DALEMBERT')stake=win?Math.max(baseBetEUR,bet-baseBetEUR):Math.min(tableMaxEUR,bet+baseBetEUR);
    peak=Math.max(peak,bankroll);maxDrawdown=Math.max(maxDrawdown,peak-bankroll);
  }
  const net=bankroll-startingBankrollEUR;return {version:VERSION,strategy:mode,selection,requestedSpins:spins,completedSpins:completed,wins,losses,startingBankrollEUR,endingBankrollEUR:round(bankroll),netEUR:round(net),totalWageredEUR:round(totalWagered),realizedReturnOnWagerPct:totalWagered?round(net/totalWagered*100):null,maxStakeEUR:round(maxStake),maxDrawdownEUR:round(maxDrawdown),ruined:completed<spins,practiceOnly:true,execution:{...EXECUTION}};
}
export function compareStrategies(options={}){const strategies=['FLAT','MARTINGALE','FIBONACCI','DALEMBERT'];return {version:VERSION,exactEvenMoney:exactEuropeanEvenMoneyEV(),results:strategies.map((strategy,i)=>simulateEvenMoneyStrategy({...options,strategy,seed:(options.seed??1)+i*9973})),execution:{...EXECUTION},hardGuards:{fairHistoryDoesNotCreatePredictiveEdge:true,progressionCannotChangeExactEvenMoneyHouseEdge:true,biasMustBeExternallyValidatedBeforeAnyRealWorldInference:true}};}
export {WHEEL as EUROPEAN_WHEEL_ORDER};

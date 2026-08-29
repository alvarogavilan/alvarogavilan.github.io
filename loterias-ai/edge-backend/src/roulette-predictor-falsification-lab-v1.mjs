const VERSION='roulette-predictor-falsification-lab-v1';
const EXEC={decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0};
const n=v=>Number.isFinite(Number(v))?Number(v):null;
const round=(v,d=8)=>Number.isFinite(v)?Number(v.toFixed(d)):null;
function erf(x){const s=x<0?-1:1; x=Math.abs(x);const a1=.254829592,a2=-.284496736,a3=1.421413741,a4=-1.453152027,a5=1.061405429,p=.3275911,t=1/(1+p*x),y=1-(((((a5*t+a4)*t)+a3)*t+a2)*t+a1)*t*Math.exp(-x*x);return s*y}
const normalTail=z=>Math.max(0,Math.min(1,(1-erf(z/Math.SQRT2))/2));
function cleanSet(v){return [...new Set((Array.isArray(v)?v:[]).map(Number).filter(x=>Number.isInteger(x)&&x>=0&&x<=36))]}
export function evaluatePredictionLog(entries=[],options={}){
 const rows=(Array.isArray(entries)?entries:[]).map((e,i)=>({i,outcome:Number(e?.outcome),predicted:cleanSet(e?.predicted),createdBeforeOutcome:e?.createdBeforeOutcome===true})).filter(r=>Number.isInteger(r.outcome)&&r.outcome>=0&&r.outcome<=36&&r.predicted.length>0);
 if(!rows.length)return {version:VERSION,ok:false,reason:'NO_VALID_PREDICTIONS',execution:{...EXEC}};
 if(rows.some(r=>!r.createdBeforeOutcome))return {version:VERSION,ok:false,reason:'NON_PROSPECTIVE_PREDICTION_PRESENT',execution:{...EXEC}};
 const split=Math.max(1,Math.min(rows.length-1,Math.floor(rows.length*(n(options.discoveryFraction)??0.5))));
 const discovery=rows.slice(0,split),holdout=rows.slice(split);
 function calc(part){let hits=0,stake=0,profit=0,expectedHits=0,variance=0;for(const r of part){const k=r.predicted.length,p=k/37;const hit=r.predicted.includes(r.outcome);if(hit)hits++;expectedHits+=p;variance+=p*(1-p);stake+=1;profit+=hit?(36/k-1):-1;}const z=variance>0?(hits-expectedHits)/Math.sqrt(variance):0;return {n:part.length,hits,hitRate:round(hits/part.length),fairExpectedHits:round(expectedHits),z:round(z),oneSidedPHigh:round(normalTail(z),10),flatTotalStakeEUR:round(stake),flatNetEUR:round(profit),flatRoiPct:round(profit/stake*100)};}
 const d=calc(discovery),h=calc(holdout);const threshold=n(options.holdoutPThreshold)??0.001;const candidate=h.oneSidedPHigh<threshold&&h.flatNetEUR>0;
 return {version:VERSION,ok:true,totalPredictions:rows.length,discovery:d,holdout:h,practiceVerdict:candidate?'PROSPECTIVE_PREDICTOR_RESEARCH_CANDIDATE':'NO_PROSPECTIVE_EDGE',execution:{...EXEC},hardGuards:{predictionsMustPrecedeOutcome:true,discoveryAndHoldoutSeparated:true,marketingVideosAreNotHoldout:true,fairSetCoverageIsKOver37:true,breakEvenCoverageRequiresMoreThanKOver36:true,exactTargetGeneratorRequiredBeforeAnyExecution:true}};
}
export function axaClaimModel(){return {version:VERSION,publicClaimShape:{historyInput:'recent outcomes / reports describe last 6 numbers',predictionHorizonSpins:3,predictedSetSize:'UNKNOWN',algorithm:'PROPRIETARY_UNKNOWN'},falsificationRequirement:'Record every AXA recommendation before the next outcome on an exact target roulette, then evaluate a frozen prospective holdout. Do not select only winning sessions.',execution:{...EXEC}}}

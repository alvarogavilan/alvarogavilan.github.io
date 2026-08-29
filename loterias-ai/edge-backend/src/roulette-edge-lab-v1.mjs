const VERSION='roulette-edge-lab-v1';
const EXECUTION=Object.freeze({decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0});
const EUROPEAN_WHEEL=[0,32,15,19,4,21,2,25,17,34,6,27,13,36,11,30,8,23,10,5,24,16,33,1,20,14,31,9,22,18,29,7,28,12,35,3,26];
const num=v=>Number.isFinite(Number(v))?Number(v):null;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const round=(v,d=6)=>Number.isFinite(v)?Number(v.toFixed(d)):null;
const execution=()=>({...EXECUTION});

function erf(x){
  const sign=x<0?-1:1; x=Math.abs(x);
  const a1=0.254829592,a2=-0.284496736,a3=1.421413741,a4=-1.453152027,a5=1.061405429,p=0.3275911;
  const t=1/(1+p*x); const y=1-(((((a5*t+a4)*t)+a3)*t+a2)*t+a1)*t*Math.exp(-x*x); return sign*y;
}
function normalTwoSidedP(z){return clamp(1-erf(Math.abs(z)/Math.SQRT2),0,1);}
function classifyMode(x={}){
  const mode=String(x.mode||'UNKNOWN').toUpperCase();
  const physical=x.physicalWheel===true;
  const rng=x.rngOutcome===true;
  const closeBefore=x.betsCloseBeforeBallRelease===true;
  const multipliersAfter=x.multiplierRevealAfterBetClose===true;
  const progressive=x.progressiveJackpot===true;
  const reasons=[];
  let physics='UNKNOWN';
  if(rng) physics='BLOCKED_RNG_OUTCOME';
  else if(physical&&closeBefore) physics='BLOCKED_BETS_CLOSE_BEFORE_RELEASE';
  else if(physical&&!closeBefore) physics='PHYSICS_RESEARCH_CANDIDATE_REQUIRES_TIMING_PROOF';
  if(multipliersAfter) reasons.push('REACTIVE_MULTIPLIER_CHASING_BLOCKED_AFTER_BET_CLOSE');
  if(progressive) reasons.push('STRUCTURAL_PROGRESSIVE_JACKPOT_RESEARCH_CANDIDATE');
  return {version:VERSION,mode,physics,reasons,execution:execution(),hardGuards:{historyDoesNotPredictFairRng:true,postCloseMultiplierRevealCannotBeReactedTo:true,physicalPredictionNeedsOpenBetWindowAfterRelease:true,progressiveJackpotNeedsExactAccounting:true}};
}

export function evaluatePhysicsWindow(input={}){
  const ballReleaseMs=num(input.ballReleaseMs), betCloseMs=num(input.betCloseMs), firstDeflectorMs=num(input.firstDeflectorMs), streamLatencyMs=num(input.streamLatencyMs)??0, actionLatencyMs=num(input.actionLatencyMs)??0, observationMs=num(input.minimumObservationMs)??700;
  if([ballReleaseMs,betCloseMs].some(v=>v===null)) return {version:VERSION,ok:false,reason:'BALL_RELEASE_AND_BET_CLOSE_REQUIRED',execution:execution()};
  const rawOpenWindow=betCloseMs-ballReleaseMs;
  const usableOpenWindow=rawOpenWindow-streamLatencyMs-actionLatencyMs;
  const preDeflectorWindow=firstDeflectorMs===null?null:firstDeflectorMs-ballReleaseMs-streamLatencyMs;
  const candidate=usableOpenWindow>=observationMs && (preDeflectorWindow===null || preDeflectorWindow>=observationMs);
  return {version:VERSION,ok:true,metrics:{rawOpenWindowMs:round(rawOpenWindow,3),usableOpenWindowMs:round(usableOpenWindow,3),preDeflectorObservationWindowMs:round(preDeflectorWindow,3),minimumObservationMs:observationMs},practiceVerdict:candidate?'PHYSICS_TIMING_CANDIDATE':'PHYSICS_TIMING_BLOCKED',execution:execution(),hardGuards:{timingCandidateIsNotPredictionEdge:true,noLiveBetAutomation:true}};
}

function normalizeRecords(records=[]){
  return records.map((r,i)=>({index:i,number:num(r?.number),wheelId:r?.wheelId??null,dealerId:r?.dealerId??null,timestamp:r?.timestamp??null})).filter(r=>Number.isInteger(r.number)&&r.number>=0&&r.number<=36);
}
function pocketStats(records){
  const n=records.length,p0=1/37,mean=n*p0,sd=Math.sqrt(n*p0*(1-p0));
  return Array.from({length:37},(_,number)=>{const hits=records.filter(r=>r.number===number).length;const z=sd>0?(hits-mean)/sd:0;return {number,hits,rate:n?hits/n:null,z:round(z),pTwoSided:round(normalTwoSidedP(z),10)};});
}
function sectorSet(centerIndex,radius){
  const out=[]; for(let d=-radius;d<=radius;d++) out.push(EUROPEAN_WHEEL[(centerIndex+d+37)%37]); return out;
}
function sectorStats(records,radius=2){
  const n=records.length,k=radius*2+1,p0=k/37,mean=n*p0,sd=Math.sqrt(n*p0*(1-p0));
  return EUROPEAN_WHEEL.map((center,idx)=>{const nums=sectorSet(idx,radius);const set=new Set(nums);const hits=records.filter(r=>set.has(r.number)).length;const z=sd>0?(hits-mean)/sd:0;return {center,numbers:nums,hits,rate:n?hits/n:null,z:round(z),pTwoSided:round(normalTwoSidedP(z),10)};});
}
function candidateDirection(stat,expectedRate){return stat.rate>expectedRate?'HIGH':'LOW';}
function validateCandidates(candidates,stats,expectedRate,minLift=0){
  const byKey=new Map(stats.map(s=>[s.number??s.center,s]));
  return candidates.map(c=>{const key=c.number??c.center;const v=byKey.get(key);const dir=candidateDirection(c,expectedRate);const lift=v?v.rate-expectedRate:null;const holds=v?((dir==='HIGH'&&lift>minLift)||(dir==='LOW'&&lift<-minLift)):false;return {...c,discoveryDirection:dir,validationRate:v?.rate??null,validationLift:round(lift),holdsDirectionInValidation:holds};});
}

export function analyzeRouletteSpinSeries(records=[],options={}){
  const clean=normalizeRecords(records);
  const minSpins=Math.max(100,Math.floor(num(options.minSpins)??1000));
  if(clean.length<minSpins) return {version:VERSION,ok:false,reason:'INSUFFICIENT_SPINS',spinCount:clean.length,minSpins,execution:execution()};
  const split=clamp(num(options.discoveryFraction)??0.7,0.5,0.9); const cut=Math.floor(clean.length*split);
  const discovery=clean.slice(0,cut),validation=clean.slice(cut);
  const alpha=clamp(num(options.alpha)??0.01,1e-6,0.2); const pocketThreshold=alpha/37; const sectorThreshold=alpha/37;
  const dp=pocketStats(discovery),vp=pocketStats(validation),ds=sectorStats(discovery,2),vs=sectorStats(validation,2);
  const pocketCandidates=dp.filter(s=>s.pTwoSided<pocketThreshold); const sectorCandidates=ds.filter(s=>s.pTwoSided<sectorThreshold);
  const pocketValidated=validateCandidates(pocketCandidates,vp,1/37,num(options.minValidationLift)??0);
  const sectorValidated=validateCandidates(sectorCandidates,vs,5/37,num(options.minValidationLift)??0);
  const robustPocket=pocketValidated.filter(c=>c.holdsDirectionInValidation); const robustSector=sectorValidated.filter(c=>c.holdsDirectionInValidation);
  return {version:VERSION,ok:true,spinCount:clean.length,discoverySpins:discovery.length,validationSpins:validation.length,multipleTesting:{alpha,pocketBonferroniThreshold:round(pocketThreshold,10),sectorBonferroniThreshold:round(sectorThreshold,10)},discovery:{pocketCandidates,sectorCandidates},validation:{pocketValidated,sectorValidated},robustResearchCandidates:{pockets:robustPocket,sectors:robustSector},practiceVerdict:(robustPocket.length||robustSector.length)?'REPRODUCIBLE_BIAS_RESEARCH_CANDIDATE':'NO_REPRODUCIBLE_BIAS_SIGNAL',execution:execution(),hardGuards:{noMartingaleInference:true,noHotNumberInference:true,noColdNumberInference:true,discoveryValidationSeparated:true,multipleTestingCorrected:true,wheelAndDealerSegmentationRecommended:true,executionRequiresIndependentProspectiveHoldout:true}};
}

export function analyzeByWheelDealer(records=[],options={}){
  const clean=normalizeRecords(records); const groups=new Map();
  for(const r of clean){const key=`${r.wheelId??'UNKNOWN_WHEEL'}::${r.dealerId??'UNKNOWN_DEALER'}`; if(!groups.has(key))groups.set(key,[]); groups.get(key).push(r);}
  const analyses=[]; for(const [key,rows] of groups){const [wheelId,dealerId]=key.split('::'); analyses.push({wheelId,dealerId,...analyzeRouletteSpinSeries(rows,options)});}
  return {version:VERSION,groupCount:analyses.length,groups:analyses,execution:execution(),hardGuards:{poolingAcrossWheelDealerCanHideOrFabricateBias:true}};
}

export function classifyRouletteProduct(input={}){return classifyMode(input);}
export const EUROPEAN_WHEEL_ORDER=Object.freeze([...EUROPEAN_WHEEL]);

import {isApprovedBetfairApMcCoySurvivalReviewArtifact} from './betfair-apmccoy-post-ght-survival-review-v1.mjs';

const VERSION='betfair-apmccoy-post-ght-survival-curve-v1.1-exact-cycle-artifacts';
const REVIEW_VERSION='betfair-apmccoy-post-ght-survival-review-v1';
const HORIZON_INTERVALS=Object.freeze([1,2,3,4,5,6,7,8,9,10,11,12]);
const finite=v=>{if(v===null||v===undefined||v===''||typeof v==='boolean')return null;const n=Number(v);return Number.isFinite(n)?n:null;};
const text=v=>typeof v==='string'&&v.trim()?v.trim():null;
function logChoose(n,k){const m=Math.min(k,n-k);let out=0;for(let i=1;i<=m;i++)out+=Math.log(n-m+i)-Math.log(i);return out;}
function binomialUpperTail(n,k,p){if(k<=0)return 1;if(k>n)return 0;if(p<=0)return 0;if(p>=1)return 1;const lp=logChoose(n,k)+k*Math.log(p)+(n-k)*Math.log1p(-p);let term=Math.exp(lp),sum=term;for(let i=k;i<n;i++){term*=((n-i)/(i+1))*(p/(1-p));sum+=term;if(!Number.isFinite(sum))return 1;}return Math.min(1,Math.max(0,sum));}
function cpLower(n,k,c){const alpha=1-c;if(k<=0)return 0;let lo=0,hi=1;for(let i=0;i<80;i++){const mid=(lo+hi)/2;const tail=binomialUpperTail(n,k,mid);if(tail>alpha)hi=mid;else lo=mid;}return (lo+hi)/2;}
function execution(){return {decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0};}
function bindingKey(v){const b=v?.bindingScope||{};return [String(b.expectedBetfairImsCasino||'').toLowerCase(),String(b.tickerEndpoint||''),String(b.configSourceUrl||''),String(b.instanceCode||'')].join('|');}
function fail(reason,extra={}){return {version:VERSION,valid:false,reason,frozenHorizonCurveAvailable:false,usableForLatencySelection:false,usableForRaceEvidence:false,usableForExecution:false,execution:execution(),...extra};}

export function classifyBetfairApMcCoyReviewedSurvivalCycleAtLatency(reviewedCycle,latencySeconds){
  const l=finite(latencySeconds),detect=finite(reviewedCycle?.detectionTimestamp),last=finite(reviewedCycle?.lastConfirmedUnawardedTimestamp),terminal=finite(reviewedCycle?.firstObservedAwardOrResetTimestamp);
  if(!(l>0)||detect===null||last===null)return {valid:false,classification:'INVALID'};
  const threshold=detect+l;
  if(last>=threshold)return {valid:true,classification:'SUCCESS',thresholdTimestamp:threshold};
  if(terminal!==null&&terminal<threshold)return {valid:true,classification:'FAILURE',thresholdTimestamp:threshold};
  return {valid:true,classification:'AMBIGUOUS',thresholdTimestamp:threshold};
}

export function deriveBetfairApMcCoyFrozenHorizonSurvivalCurve({reviewedCycles,confidence=0.95}={}){
  const list=Array.isArray(reviewedCycles)?reviewedCycles:[],c=finite(confidence);
  if(!(c>0&&c<1))return fail('INVALID_CONFIDENCE');
  if(list.length<1)return fail('NO_INDEPENDENTLY_REVIEWED_SURVIVAL_CYCLES');
  const ids=new Set(),bindings=new Set(),execs=new Set();
  for(const x of list){
    if(!x||x.version!==REVIEW_VERSION||x.valid!==true||x.independentReviewApproved!==true||x.usableForLatencyClassification!==true||x.completeAttemptLedgerVerified!==true||x.completeObservationHorizon!==true)return fail('INVALID_REVIEWED_SURVIVAL_CYCLE');
    if(!isApprovedBetfairApMcCoySurvivalReviewArtifact(x))return fail('CYCLE_REVIEW_ARTIFACT_NOT_CODE_APPROVED',{cycleId:x.cycleId||null,reviewCommit:x.reviewCommit||null,reviewArtifactIdentity:x.reviewArtifactIdentity||null});
    const id=text(x.cycleId);if(!id||ids.has(id))return fail('MISSING_OR_DUPLICATE_CYCLE_ID',{cycleId:id});ids.add(id);
    const key=bindingKey(x);if(!key||key==='|||')return fail('MISSING_BINDING_SCOPE',{cycleId:id});bindings.add(key);
    const exec=finite(x.requestExecIntervalSeconds);if(!(exec>0))return fail('INVALID_EXEC_INTERVAL',{cycleId:id});execs.add(exec);
  }
  if(bindings.size!==1)return fail('BINDING_SCOPE_CHANGED_ACROSS_SURVIVAL_LEDGER',{bindingScopeCount:bindings.size});
  if(execs.size!==1)return fail('EXEC_INTERVAL_CHANGED_ACROSS_SURVIVAL_LEDGER',{execIntervals:[...execs]});
  const exec=[...execs][0],n=list.length;
  const curve=HORIZON_INTERVALS.map(intervals=>{
    const latencySeconds=intervals*exec;let successes=0,observedFailures=0,ambiguous=0;
    const classifications=[];
    for(const x of list){const r=classifyBetfairApMcCoyReviewedSurvivalCycleAtLatency(x,latencySeconds);if(r.classification==='SUCCESS')successes++;else if(r.classification==='FAILURE')observedFailures++;else ambiguous++;classifications.push({cycleId:x.cycleId,classification:r.classification});}
    return {horizonIntervals:intervals,latencySeconds,totalReviewedCycles:n,strictSuccessCount:successes,observedFailureCount:observedFailures,ambiguousCount:ambiguous,conservativeFailureCount:n-successes,ambiguousCountedAsFailureForBound:true,confidence:c,method:'ONE_SIDED_CLOPPER_PEARSON_BINOMIAL_CONSERVATIVE_AMBIGUOUS_AS_FAILURE',survivalProbabilityLowerBound:cpLower(n,successes,c),classifications};
  });
  return {
    version:VERSION,mode:'OFFLINE_REVIEWED_PROSPECTIVE_BETFAIR_AP_MCCOY_POST_GHT_FROZEN_HORIZON_CURVE_NO_PLAY',valid:true,
    reason:'EXACT_REVIEWED_FROZEN_HORIZON_SURVIVAL_CURVE_AVAILABLE_ACTION_LATENCY_AND_EXECUTION_GATES_STILL_UNFROZEN',
    operator:'Betfair Spain',market:'ES',target:{title:'AP McCoy Sporting Legends',gameId:'ap-mccoy-sporting-legends-cptn'},
    reviewedCycleCount:n,cycleIds:[...ids],reviewArtifactIdentities:list.map(x=>x.reviewArtifactIdentity),bindingScopeKey:[...bindings][0],requestExecIntervalSeconds:exec,
    horizonIntervals:[...HORIZON_INTERVALS],curve,frozenHorizonCurveAvailable:true,
    latencyThresholdChosenFromOutcomes:false,ambiguousCyclesDropped:false,ambiguousCyclesCountedAsFailuresForBound:true,
    actionLatencyFrozen:false,operatorFollowingDayRuleCodeOwned:true,operatorAnyBetAnySizeRuleCodeOwned:true,servedStakeAtDecisionVerified:false,
    binomialIidAssumptionJustified:false,currentCycleExchangeabilityVerified:false,
    usableForLatencySelection:false,usableForRaceEvidence:false,usableForExecution:false,
    scientificUse:'Transforms only exact code-owned reviewed prospective Betfair AP McCoy post-GHT survival artifacts into the predeclared one-through-twelve requestExecInterval curve. An approved review SHA cannot be reused with altered cycle timing or outcomes. No latency is selected from the curve; unresolved intervals remain conservative failures and the result remains descriptive until the independent latency, stake, race-assumption and fresh-state gates close.',
    execution:execution(),
    hardGuards:{onlineOnly:true,nonPromoOnly:true,exactReviewedCycleArtifactsOnly:true,approvedReviewShaCannotAuthorizeAlteredCycle:true,frozenHorizonsOneThroughTwelve:true,latencyCannotBeSelectedFromCurve:true,ambiguousCyclesCannotBeDropped:true,ambiguousAreFailuresForLowerBound:true,sameBindingRequired:true,sameCadenceRequired:true,noPointEstimateExecution:true,servedStakeStillRequired:true,binomialAssumptionsStillRequired:true,freshFinalStateStillRequired:true,noWagerProbe:true,noAutomaticBetting:true,realMoneyAllowed:false},
  };
}

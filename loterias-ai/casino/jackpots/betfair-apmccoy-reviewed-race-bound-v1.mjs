import {isApprovedBetfairApMcCoySurvivalReviewCommit} from './betfair-apmccoy-post-ght-survival-review-v1.mjs';
import {classifyBetfairApMcCoyReviewedSurvivalCycleAtLatency} from './betfair-apmccoy-post-ght-survival-curve-v1.mjs';
import {isApprovedBetfairApMcCoyActionLatencyReviewCommit} from './betfair-apmccoy-action-latency-review-v1.mjs';
import {isApprovedBetfairApMcCoyRaceAssumptionReviewCommit} from './betfair-apmccoy-race-assumptions-review-v1.mjs';

const VERSION='betfair-apmccoy-reviewed-race-bound-v1';
const CYCLE_VERSION='betfair-apmccoy-post-ght-survival-review-v1';
const LATENCY_VERSION='betfair-apmccoy-action-latency-review-v1';
const ASSUMPTION_VERSION='betfair-apmccoy-race-assumptions-review-v1';
const finite=v=>{if(v===null||v===undefined||v===''||typeof v==='boolean')return null;const n=Number(v);return Number.isFinite(n)?n:null;};
const text=v=>typeof v==='string'&&v.trim()?v.trim():null;
function logChoose(n,k){const m=Math.min(k,n-k);let out=0;for(let i=1;i<=m;i++)out+=Math.log(n-m+i)-Math.log(i);return out;}
function binomialUpperTail(n,k,p){if(k<=0)return 1;if(k>n)return 0;if(p<=0)return 0;if(p>=1)return 1;const lp=logChoose(n,k)+k*Math.log(p)+(n-k)*Math.log1p(-p);let term=Math.exp(lp),sum=term;for(let i=k;i<n;i++){term*=((n-i)/(i+1))*(p/(1-p));sum+=term;if(!Number.isFinite(sum))return 1;}return Math.min(1,Math.max(0,sum));}
function cpLower(n,k,c){const alpha=1-c;if(k<=0)return 0;let lo=0,hi=1;for(let i=0;i<80;i++){const mid=(lo+hi)/2;const tail=binomialUpperTail(n,k,mid);if(tail>alpha)hi=mid;else lo=mid;}return (lo+hi)/2;}
function execution(){return {decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0};}
function bindingKey(v){const b=v?.bindingScope||{};return [String(b.expectedBetfairImsCasino||'').toLowerCase(),String(b.tickerEndpoint||''),String(b.configSourceUrl||''),String(b.instanceCode||'')].join('|');}
function fail(reason,extra={}){return {version:VERSION,valid:false,reason,reviewedRaceLowerBoundAvailable:false,usableForRaceEvidence:false,usableForExecution:false,execution:execution(),...extra};}

export function deriveBetfairApMcCoyReviewedRaceLowerBound({reviewedCycles,actionLatencyReview,raceAssumptionsReview,confidence=0.95}={}){
  const list=Array.isArray(reviewedCycles)?reviewedCycles:[],c=finite(confidence);
  if(!(c>0&&c<1))return fail('INVALID_CONFIDENCE');
  if(list.length<1)return fail('NO_REVIEWED_SURVIVAL_CYCLES');
  const latency=actionLatencyReview;
  if(!latency||latency.version!==LATENCY_VERSION||latency.valid!==true||latency.measuredActionLatencyVerified!==true||latency.latencyPolicyIndependentlyReviewed!==true||latency.selectedUsingPostGhtSurvivalOutcomes!==false)return fail('VALID_INDEPENDENT_ACTION_LATENCY_REVIEW_REQUIRED');
  if(!isApprovedBetfairApMcCoyActionLatencyReviewCommit(latency.reviewCommit))return fail('ACTION_LATENCY_REVIEW_COMMIT_NOT_CODE_ALLOWLISTED',{reviewCommit:latency.reviewCommit||null});
  const latencySeconds=finite(latency.measuredActionLatencySeconds);if(!(latencySeconds>0))return fail('INVALID_REVIEWED_ACTION_LATENCY');
  const assumptions=raceAssumptionsReview;
  if(!assumptions||assumptions.version!==ASSUMPTION_VERSION||assumptions.valid!==true||assumptions.independentRaceAssumptionsReviewed!==true||assumptions.completeProspectiveCycleLedgerVerified!==true||assumptions.binomialSamplingAssumptionJustified!==true||assumptions.currentCycleExchangeabilityVerified!==true)return fail('VALID_INDEPENDENT_RACE_ASSUMPTIONS_REVIEW_REQUIRED');
  if(!isApprovedBetfairApMcCoyRaceAssumptionReviewCommit(assumptions.reviewCommit))return fail('RACE_ASSUMPTION_REVIEW_COMMIT_NOT_CODE_ALLOWLISTED',{reviewCommit:assumptions.reviewCommit||null});
  const ids=new Set(),bindings=new Set(),execs=new Set(),classifications=[];let successes=0,observedFailures=0,ambiguous=0;
  for(const x of list){
    if(!x||x.version!==CYCLE_VERSION||x.valid!==true||x.independentReviewApproved!==true||x.completeAttemptLedgerVerified!==true||x.completeObservationHorizon!==true||x.usableForLatencyClassification!==true)return fail('INVALID_REVIEWED_SURVIVAL_CYCLE');
    if(!isApprovedBetfairApMcCoySurvivalReviewCommit(x.reviewCommit))return fail('SURVIVAL_REVIEW_COMMIT_NOT_CODE_ALLOWLISTED',{cycleId:x.cycleId||null,reviewCommit:x.reviewCommit||null});
    const id=text(x.cycleId);if(!id||ids.has(id))return fail('MISSING_OR_DUPLICATE_CYCLE_ID',{cycleId:id});ids.add(id);
    const key=bindingKey(x);if(!key||key==='|||')return fail('MISSING_BINDING_SCOPE',{cycleId:id});bindings.add(key);
    const exec=finite(x.requestExecIntervalSeconds);if(!(exec>0))return fail('INVALID_EXEC_INTERVAL',{cycleId:id});execs.add(exec);
    const classification=classifyBetfairApMcCoyReviewedSurvivalCycleAtLatency(x,latencySeconds);
    if(classification?.valid!==true)return fail('LATENCY_CLASSIFICATION_FAILED',{cycleId:id});
    if(classification.classification==='SUCCESS')successes++;else if(classification.classification==='FAILURE')observedFailures++;else ambiguous++;
    classifications.push({cycleId:id,classification:classification.classification});
  }
  if(bindings.size!==1)return fail('BINDING_SCOPE_CHANGED_ACROSS_LEDGER',{bindingScopeCount:bindings.size});
  if(execs.size!==1)return fail('EXEC_INTERVAL_CHANGED_ACROSS_LEDGER',{execIntervals:[...execs]});
  const n=list.length;
  const conservativeFailures=n-successes;
  const lowerBound=cpLower(n,successes,c);
  return {
    version:VERSION,valid:true,mode:'OFFLINE_CODE_REVIEWED_AP_MCCOY_RACE_BOUND_NO_PLAY',
    reason:'CODE_REVIEWED_AP_MCCOY_CONSERVATIVE_RACE_LOWER_BOUND_AVAILABLE',
    operator:'Betfair Spain',market:'ES',target:{title:'AP McCoy Sporting Legends',gameId:'ap-mccoy-sporting-legends-cptn'},
    protocolId:assumptions.protocolId,latencyMeasurementProtocolId:latency.protocolId,
    actionLatencySeconds:latencySeconds,actionLatencyReviewCommit:latency.reviewCommit,
    raceAssumptionReviewCommit:assumptions.reviewCommit,completeProspectiveLedgerCommit:assumptions.completeProspectiveLedgerCommit,assumptionEvidenceId:assumptions.assumptionEvidenceId,
    cycleIds:[...ids],reviewedCycleCount:n,successfulDryRunCycles:successes,observedFailureCycles:observedFailures,ambiguousCycles:ambiguous,conservativeFailureCycles:conservativeFailures,
    ambiguousCountedAsFailureForBound:true,classifications,
    confidence:c,method:'ONE_SIDED_CLOPPER_PEARSON_BINOMIAL_CONSERVATIVE_AMBIGUOUS_AS_FAILURE',
    firstBetRaceProbabilityLowerBound:lowerBound,
    completeProspectiveCycleLedgerVerified:true,binomialSamplingAssumptionJustified:true,currentCycleExchangeabilityVerified:true,
    bindingScopeKey:[...bindings][0],requestExecIntervalSeconds:[...execs][0],
    reviewedRaceLowerBoundAvailable:true,usableForRaceEvidence:true,usableForExecution:false,
    scientificUse:'Derives the AP McCoy first-bet race lower confidence bound only from code-allowlisted prospective post-GHT survival-cycle reviews, a separately code-allowlisted manual-action latency review that explicitly was not chosen from survival outcomes, and a code-allowlisted review of the complete prospective ledger, binomial sampling model and current-cycle exchangeability. Unknown/interval-censored outcomes at the approved latency are retained and conservatively treated as failures. This bound is race evidence only; exact served stake, current jackpot, remaining freshness budget and a final execution adapter/review remain mandatory.',
    execution:execution(),
    hardGuards:{onlineOnly:true,nonPromoOnly:true,reviewedCyclesOnly:true,codeOwnedSurvivalReviewAllowlist:true,codeOwnedLatencyReviewAllowlist:true,codeOwnedRaceAssumptionReviewAllowlist:true,latencyIndependentOfSurvivalOutcomes:true,ambiguousCyclesCannotBeDropped:true,ambiguousCountedAsFailure:true,completeProspectiveLedgerRequired:true,sameBindingRequired:true,sameCadenceRequired:true,notExecutionAuthority:true,servedStakeStillRequired:true,currentFreshStateStillRequired:true,noWagerProbe:true,noAutomaticBetting:true,realMoneyAllowed:false}
  };
}

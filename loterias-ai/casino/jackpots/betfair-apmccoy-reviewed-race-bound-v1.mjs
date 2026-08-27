import {isApprovedBetfairApMcCoySurvivalReviewCommit} from './betfair-apmccoy-post-ght-survival-review-v1.mjs';
import {classifyBetfairApMcCoyReviewedSurvivalCycleAtLatency} from './betfair-apmccoy-post-ght-survival-curve-v1.mjs';
import {isApprovedBetfairApMcCoyActionLatencyReviewCommit} from './betfair-apmccoy-action-latency-review-v1.mjs';
import {isApprovedBetfairApMcCoyRaceAssumptionReviewCommit} from './betfair-apmccoy-race-assumptions-review-v1.mjs';
import {isApprovedBetfairApMcCoyAttemptLedgerReviewCommit} from './betfair-apmccoy-scheduled-attempt-ledger-review-v1.mjs';

const VERSION='betfair-apmccoy-reviewed-race-bound-v1.3-fixed-seven-attempt-denominator';
const CYCLE_VERSION='betfair-apmccoy-post-ght-survival-review-v1';
const LATENCY_VERSION='betfair-apmccoy-action-latency-review-v1';
const ASSUMPTION_VERSION='betfair-apmccoy-race-assumptions-review-v1';
const ATTEMPT_REVIEW_VERSION='betfair-apmccoy-scheduled-attempt-ledger-review-v1.1-committed-ledger';
const MAX_DECISION_FEED_AGE_INTERVALS=2;
const FROZEN_SURVIVAL_HORIZON_INTERVALS=12;
const REQUIRED_SCHEDULED_ATTEMPTS=7;
const MIN_CONFIDENCE=0.95;
const finite=v=>{if(v===null||v===undefined||v===''||typeof v==='boolean')return null;const n=Number(v);return Number.isFinite(n)?n:null;};
const text=v=>typeof v==='string'&&v.trim()?v.trim():null;
function logChoose(n,k){const m=Math.min(k,n-k);let out=0;for(let i=1;i<=m;i++)out+=Math.log(n-m+i)-Math.log(i);return out;}
function binomialUpperTail(n,k,p){if(k<=0)return 1;if(k>n)return 0;if(p<=0)return 0;if(p>=1)return 1;const lp=logChoose(n,k)+k*Math.log(p)+(n-k)*Math.log1p(-p);let term=Math.exp(lp),sum=term;for(let i=k;i<n;i++){term*=((n-i)/(i+1))*(p/(1-p));sum+=term;if(!Number.isFinite(sum))return 1;}return Math.min(1,Math.max(0,sum));}
function cpLower(n,k,c){const alpha=1-c;if(k<=0)return 0;let lo=0,hi=1;for(let i=0;i<80;i++){const mid=(lo+hi)/2;const tail=binomialUpperTail(n,k,mid);if(tail>alpha)hi=mid;else lo=mid;}return (lo+hi)/2;}
function execution(){return {decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0};}
function bindingKey(v){const b=v?.bindingScope||{};return [String(b.expectedBetfairImsCasino||'').toLowerCase(),String(b.tickerEndpoint||''),String(b.configSourceUrl||''),String(b.instanceCode||'')].join('|');}
function fail(reason,extra={}){return {version:VERSION,valid:false,reason,reviewedRaceLowerBoundAvailable:false,exactScheduledAttemptDenominatorVerified:false,usableForRaceEvidence:false,usableForExecution:false,execution:execution(),...extra};}
function sameExactIdSet(actual,reviewed){
  if(!Array.isArray(actual)||!Array.isArray(reviewed)||actual.length!==reviewed.length)return false;
  const a=actual.map(text),b=reviewed.map(text);
  if(a.some(x=>!x)||b.some(x=>!x)||new Set(a).size!==a.length||new Set(b).size!==b.length)return false;
  const bs=new Set(b);return a.every(x=>bs.has(x));
}

export function deriveBetfairApMcCoyReviewedRaceLowerBound({reviewedCycles,scheduledAttemptLedgerReview,actionLatencyReview,raceAssumptionsReview,confidence=0.95}={}){
  const c=finite(confidence);
  if(c===null||c<MIN_CONFIDENCE||c>=1)return fail('CONFIDENCE_BELOW_FROZEN_MINIMUM',{confidence:c,minimumConfidence:MIN_CONFIDENCE});

  const attempt=scheduledAttemptLedgerReview;
  if(!attempt||attempt.version!==ATTEMPT_REVIEW_VERSION||attempt.valid!==true||attempt.completeScheduledAttemptLedgerVerified!==true||attempt.allScheduledOpportunitiesRetained!==true||attempt.usableForRaceDenominator!==true)return fail('VALID_FIXED_SCHEDULED_ATTEMPT_LEDGER_REVIEW_REQUIRED');
  if(!isApprovedBetfairApMcCoyAttemptLedgerReviewCommit(attempt.reviewCommit))return fail('ATTEMPT_LEDGER_REVIEW_COMMIT_NOT_CODE_ALLOWLISTED',{reviewCommit:attempt.reviewCommit||null});
  if(Number(attempt.targetScheduledOpportunities)!==REQUIRED_SCHEDULED_ATTEMPTS||Number(attempt.scheduledAttemptCount)!==REQUIRED_SCHEDULED_ATTEMPTS)return fail('EXACT_SEVEN_SCHEDULED_ATTEMPTS_REQUIRED',{scheduledAttemptCount:attempt.scheduledAttemptCount??null});
  if(attempt.nonCycleAttemptsCountAsConservativeRaceFailures!==true||attempt.ambiguousReviewedCyclesCountAsConservativeRaceFailures!==true||attempt.stopRuleChangedAfterObservation!==false)return fail('FROZEN_DENOMINATOR_CONSERVATISM_REQUIRED');
  const fullLedgerCommit=text(attempt.ledgerCommit)?.toLowerCase();
  if(!fullLedgerCommit)return fail('COMMITTED_FULL_ATTEMPT_LEDGER_REQUIRED');
  const attemptBinding=text(attempt.bindingScopeKey);if(!attemptBinding||attemptBinding==='|||')return fail('ATTEMPT_LEDGER_BINDING_SCOPE_REQUIRED');
  const attemptEntries=Array.isArray(attempt.entries)?attempt.entries:[];
  if(attemptEntries.length!==REQUIRED_SCHEDULED_ATTEMPTS)return fail('ATTEMPT_LEDGER_ENTRY_COUNT_MISMATCH',{entryCount:attemptEntries.length});
  const list=attemptEntries.filter(e=>e?.terminalClass==='REVIEWED_COMPLETE_SURVIVAL_CYCLE').map(e=>e.reviewedCycle);
  if(list.length<1)return fail('NO_REVIEWED_COMPLETE_SURVIVAL_CYCLES_IN_FIXED_LEDGER',{scheduledAttemptCount:REQUIRED_SCHEDULED_ATTEMPTS,nonCycleFailureCount:attempt.nonCycleFailureCount??null});
  const callerList=Array.isArray(reviewedCycles)?reviewedCycles:[];
  if(callerList.length){
    const callerIds=callerList.map(x=>text(x?.cycleId));
    const ledgerIds=list.map(x=>text(x?.cycleId));
    if(!sameExactIdSet(callerIds,ledgerIds))return fail('CALLER_REVIEWED_CYCLE_LIST_DOES_NOT_MATCH_FIXED_ATTEMPT_LEDGER',{callerCycleIds,ledgerCycleIds:ledgerIds});
  }

  const latency=actionLatencyReview;
  if(!latency||latency.version!==LATENCY_VERSION||latency.valid!==true||latency.measuredActionLatencyVerified!==true||latency.latencyPolicyIndependentlyReviewed!==true||latency.selectedUsingPostGhtSurvivalOutcomes!==false)return fail('VALID_INDEPENDENT_ACTION_LATENCY_REVIEW_REQUIRED');
  if(!isApprovedBetfairApMcCoyActionLatencyReviewCommit(latency.reviewCommit))return fail('ACTION_LATENCY_REVIEW_COMMIT_NOT_CODE_ALLOWLISTED',{reviewCommit:latency.reviewCommit||null});
  const measuredActionLatencySeconds=finite(latency.measuredActionLatencySeconds);if(!(measuredActionLatencySeconds>0))return fail('INVALID_REVIEWED_ACTION_LATENCY');

  const assumptions=raceAssumptionsReview;
  if(!assumptions||assumptions.version!==ASSUMPTION_VERSION||assumptions.valid!==true||assumptions.independentRaceAssumptionsReviewed!==true||assumptions.completeProspectiveCycleLedgerVerified!==true||assumptions.binomialSamplingAssumptionJustified!==true||assumptions.currentCycleExchangeabilityVerified!==true||assumptions.samplingWindowFrozenBeforeFirstCycle!==true||assumptions.allEligibleDistinctDailyGhtCyclesIncluded!==true||assumptions.failedShortAndAmbiguousCyclesRetained!==true||assumptions.assumptionsSelectedUsingSurvivalOutcomes!==false)return fail('VALID_INDEPENDENT_RACE_ASSUMPTIONS_REVIEW_REQUIRED');
  if(!isApprovedBetfairApMcCoyRaceAssumptionReviewCommit(assumptions.reviewCommit))return fail('RACE_ASSUMPTION_REVIEW_COMMIT_NOT_CODE_ALLOWLISTED',{reviewCommit:assumptions.reviewCommit||null});
  if(text(assumptions.completeProspectiveLedgerCommit)?.toLowerCase()!==fullLedgerCommit)return fail('RACE_ASSUMPTIONS_NOT_BOUND_TO_FULL_SCHEDULED_ATTEMPT_LEDGER',{assumptionLedgerCommit:assumptions.completeProspectiveLedgerCommit||null,attemptLedgerCommit:fullLedgerCommit});

  const ids=new Set(),bindings=new Set(),execs=new Set(),prepared=[];
  for(const x of list){
    if(!x||x.version!==CYCLE_VERSION||x.valid!==true||x.independentReviewApproved!==true||x.completeAttemptLedgerVerified!==true||x.completeObservationHorizon!==true||x.usableForLatencyClassification!==true)return fail('INVALID_REVIEWED_SURVIVAL_CYCLE');
    if(!isApprovedBetfairApMcCoySurvivalReviewCommit(x.reviewCommit))return fail('SURVIVAL_REVIEW_COMMIT_NOT_CODE_ALLOWLISTED',{cycleId:x.cycleId||null,reviewCommit:x.reviewCommit||null});
    const id=text(x.cycleId);if(!id||ids.has(id))return fail('MISSING_OR_DUPLICATE_CYCLE_ID',{cycleId:id});ids.add(id);
    const key=bindingKey(x);if(!key||key==='|||')return fail('MISSING_BINDING_SCOPE',{cycleId:id});bindings.add(key);
    const exec=finite(x.requestExecIntervalSeconds);if(!(exec>0))return fail('INVALID_EXEC_INTERVAL',{cycleId:id});execs.add(exec);
    prepared.push({id,cycle:x});
  }
  if(bindings.size!==1)return fail('BINDING_SCOPE_CHANGED_ACROSS_REVIEWED_CYCLES',{bindingScopeCount:bindings.size});
  if(execs.size!==1)return fail('EXEC_INTERVAL_CHANGED_ACROSS_REVIEWED_CYCLES',{execIntervals:[...execs]});
  const actualCycleIds=[...ids],actualBindingScopeKey=[...bindings][0];
  if(actualBindingScopeKey!==attemptBinding)return fail('REVIEWED_CYCLE_BINDING_DOES_NOT_MATCH_FIXED_ATTEMPT_LEDGER',{actualBindingScopeKey,attemptBindingScopeKey:attemptBinding});
  if(!sameExactIdSet(actualCycleIds,attempt.reviewedCycleIds))return fail('REVIEWED_CYCLE_SET_DOES_NOT_MATCH_FIXED_ATTEMPT_LEDGER',{actualCycleIds,attemptReviewedCycleIds:attempt.reviewedCycleIds||null});
  if(!sameExactIdSet(actualCycleIds,assumptions.cycleIds))return fail('RACE_ASSUMPTION_REVIEW_CYCLE_LEDGER_MISMATCH',{actualCycleIds,reviewedCycleIds:Array.isArray(assumptions.cycleIds)?assumptions.cycleIds:null});
  if(text(assumptions.bindingScopeKey)!==actualBindingScopeKey)return fail('RACE_ASSUMPTION_REVIEW_BINDING_SCOPE_MISMATCH',{actualBindingScopeKey,reviewedBindingScopeKey:assumptions.bindingScopeKey||null});

  const exec=[...execs][0];
  const maxDecisionFeedAgeSeconds=exec*MAX_DECISION_FEED_AGE_INTERVALS;
  const validatedRaceWindowSeconds=maxDecisionFeedAgeSeconds+measuredActionLatencySeconds;
  const frozenSurvivalHorizonSeconds=exec*FROZEN_SURVIVAL_HORIZON_INTERVALS;
  if(validatedRaceWindowSeconds>frozenSurvivalHorizonSeconds)return fail('REVIEWED_RACE_WINDOW_EXCEEDS_FROZEN_SURVIVAL_HORIZON',{validatedRaceWindowSeconds,frozenSurvivalHorizonSeconds,measuredActionLatencySeconds,maxDecisionFeedAgeSeconds});

  const classifications=[];let successes=0,observedReviewedCycleFailures=0,ambiguous=0;
  for(const {id,cycle} of prepared){
    const classification=classifyBetfairApMcCoyReviewedSurvivalCycleAtLatency(cycle,validatedRaceWindowSeconds);
    if(classification?.valid!==true)return fail('RACE_WINDOW_CLASSIFICATION_FAILED',{cycleId:id});
    if(classification.classification==='SUCCESS')successes++;else if(classification.classification==='FAILURE')observedReviewedCycleFailures++;else ambiguous++;
    classifications.push({cycleId:id,classification:classification.classification});
  }
  const n=REQUIRED_SCHEDULED_ATTEMPTS;
  const nonCycleFailureCount=Number(attempt.nonCycleFailureCount);
  if(!Number.isInteger(nonCycleFailureCount)||nonCycleFailureCount<0||nonCycleFailureCount+list.length!==n)return fail('FIXED_ATTEMPT_LEDGER_COUNTS_INCONSISTENT',{nonCycleFailureCount,reviewedCycleCount:list.length,scheduledAttemptCount:n});
  const conservativeFailures=n-successes;
  const lowerBound=cpLower(n,successes,c);
  return {
    version:VERSION,valid:true,mode:'OFFLINE_CODE_REVIEWED_AP_MCCOY_FIXED_ATTEMPT_RACE_BOUND_NO_PLAY',
    reason:'CODE_REVIEWED_AP_MCCOY_CONSERVATIVE_RACE_LOWER_BOUND_AVAILABLE_OVER_FIXED_SEVEN_ATTEMPTS',
    operator:'Betfair Spain',market:'ES',target:{title:'AP McCoy Sporting Legends',gameId:'ap-mccoy-sporting-legends-cptn'},
    protocolId:assumptions.protocolId,latencyMeasurementProtocolId:latency.protocolId,
    measuredActionLatencySeconds,actionLatencyReviewCommit:latency.reviewCommit,
    maxDecisionFeedAgeIntervals:MAX_DECISION_FEED_AGE_INTERVALS,maxDecisionFeedAgeSeconds,
    frozenSurvivalHorizonIntervals:FROZEN_SURVIVAL_HORIZON_INTERVALS,frozenSurvivalHorizonSeconds,validatedRaceWindowSeconds,
    raceAssumptionReviewCommit:assumptions.reviewCommit,attemptLedgerReviewCommit:attempt.reviewCommit,completeProspectiveLedgerCommit:fullLedgerCommit,assumptionEvidenceId:assumptions.assumptionEvidenceId,
    attemptIds:attempt.attemptIds,scheduledGhtEpochSeconds:attempt.scheduledGhtEpochSeconds,
    cycleIds:actualCycleIds,reviewedCycleCount:list.length,scheduledAttemptCount:n,nonCycleFailureCount,
    successfulDryRunCycles:successes,observedReviewedCycleFailureCount:observedReviewedCycleFailures,ambiguousReviewedCycles:ambiguous,conservativeFailureCycles:conservativeFailures,
    nonCycleAttemptsCountAsFailures:true,ambiguousReviewedCyclesCountAsFailures:true,classifications,
    confidence:c,minimumConfidence:MIN_CONFIDENCE,method:'ONE_SIDED_CLOPPER_PEARSON_BINOMIAL_FIXED_SEVEN_ATTEMPTS_CONSERVATIVE_FAILURES',
    firstBetRaceProbabilityLowerBound:lowerBound,
    exactScheduledAttemptDenominatorVerified:true,completeProspectiveCycleLedgerVerified:true,binomialSamplingAssumptionJustified:true,currentCycleExchangeabilityVerified:true,
    exactCycleLedgerMatchesAssumptionReview:true,bindingScopeMatchesAssumptionReview:true,samplingWindowFrozenBeforeFirstCycle:true,allEligibleDistinctDailyGhtCyclesIncluded:true,failedShortAndAmbiguousCyclesRetained:true,assumptionsSelectedUsingSurvivalOutcomes:false,
    bindingScopeKey:actualBindingScopeKey,requestExecIntervalSeconds:exec,
    reviewedRaceLowerBoundAvailable:true,usableForRaceEvidence:true,usableForExecution:false,
    scientificUse:'Derives the AP McCoy race lower confidence bound over the complete fixed first seven scheduled Daily GHT opportunities frozen before collection. Only code-reviewed complete survival cycles can count as successes at the reviewed feed-age-plus-action window; every failed, short, invalid or missed scheduled opportunity remains in the denominator as a conservative failure, and ambiguous reviewed cycles also count as failures. The statistical review must point to the same committed full attempt ledger, the served binding must match, confidence may not be below 95%, and the race window may not exceed the frozen twelve-interval survival horizon. This remains race evidence only and cannot authorize money.',
    execution:execution(),
    hardGuards:{onlineOnly:true,nonPromoOnly:true,fixedSevenScheduledAttemptDenominator:true,codeOwnedAttemptLedgerReviewAllowlist:true,codeOwnedSurvivalReviewAllowlist:true,codeOwnedLatencyReviewAllowlist:true,codeOwnedRaceAssumptionReviewAllowlist:true,fullAttemptLedgerCommitMustMatchRaceAssumptionReview:true,callerReviewedCycleSubsetCannotReplaceAttemptLedger:true,nonCycleFailuresCannotBeDropped:true,ambiguousReviewedCyclesCannotBeDropped:true,minimumConfidence95Pct:true,optionalStoppingForbidden:true,exactCycleLedgerMustMatchAssumptionReview:true,bindingScopeMustMatchAttemptAndAssumptionReviews:true,samplingWindowFrozenBeforeFirstCycle:true,latencyIndependentOfSurvivalOutcomes:true,maxDecisionFeedAgeIntervalsFrozen:true,raceWindowIncludesFeedAgePlusActionLatency:true,raceWindowCannotExceedFrozenTwelveIntervalSurvivalHorizon:true,notExecutionAuthority:true,servedStakeStillRequired:true,currentFreshStateStillRequired:true,noWagerProbe:true,noAutomaticBetting:true,realMoneyAllowed:false}
  };
}

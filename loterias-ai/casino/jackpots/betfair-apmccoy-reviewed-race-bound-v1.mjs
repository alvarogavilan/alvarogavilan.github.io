import {isApprovedBetfairApMcCoySurvivalReviewCommit} from './betfair-apmccoy-post-ght-survival-review-v1.mjs';
import {classifyBetfairApMcCoyReviewedSurvivalCycleAtLatency} from './betfair-apmccoy-post-ght-survival-curve-v1.mjs';
import {isApprovedBetfairApMcCoyActionLatencyReviewArtifact} from './betfair-apmccoy-action-latency-review-v1.mjs';
import {isApprovedBetfairApMcCoyRaceAssumptionReviewCommit} from './betfair-apmccoy-race-assumptions-review-v1.mjs';
import {isApprovedBetfairApMcCoyAttemptLedgerReviewArtifact} from './betfair-apmccoy-scheduled-attempt-ledger-review-v1.mjs';

const VERSION='betfair-apmccoy-reviewed-race-bound-v1.4-exact-reviewed-artifacts';
const CYCLE_VERSION='betfair-apmccoy-post-ght-survival-review-v1';
const LATENCY_VERSION='betfair-apmccoy-action-latency-review-v1';
const ASSUMPTION_VERSION='betfair-apmccoy-race-assumptions-review-v1';
const ATTEMPT_REVIEW_VERSION='betfair-apmccoy-scheduled-attempt-ledger-review-v1.3-code-owned-artifact-identity';
const REQUIRED_SCHEDULED_ATTEMPTS=7;
const MIN_CONFIDENCE=0.95;
const MAX_DECISION_FEED_AGE_INTERVALS=2;
const FROZEN_SURVIVAL_HORIZON_INTERVALS=12;
const finite=v=>{if(v===null||v===undefined||v===''||typeof v==='boolean')return null;const n=Number(v);return Number.isFinite(n)?n:null;};
const text=v=>typeof v==='string'&&v.trim()?v.trim():null;
function execution(){return {decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0};}
function fail(reason,extra={}){return {version:VERSION,valid:false,reason,reviewedRaceLowerBoundAvailable:false,exactScheduledAttemptDenominatorVerified:false,usableForRaceEvidence:false,usableForExecution:false,execution:execution(),...extra};}
function bindingKey(v){const b=v?.bindingScope||{};return [String(b.expectedBetfairImsCasino||'').toLowerCase(),String(b.tickerEndpoint||''),String(b.configSourceUrl||''),String(b.instanceCode||'')].join('|');}
function exactSet(a,b){if(!Array.isArray(a)||!Array.isArray(b)||a.length!==b.length)return false;const x=a.map(text),y=b.map(text);if(x.some(v=>!v)||y.some(v=>!v)||new Set(x).size!==x.length||new Set(y).size!==y.length)return false;const ys=new Set(y);return x.every(v=>ys.has(v));}
function logChoose(n,k){const m=Math.min(k,n-k);let out=0;for(let i=1;i<=m;i++)out+=Math.log(n-m+i)-Math.log(i);return out;}
function upperTail(n,k,p){if(k<=0)return 1;if(k>n)return 0;if(p<=0)return 0;if(p>=1)return 1;let term=Math.exp(logChoose(n,k)+k*Math.log(p)+(n-k)*Math.log1p(-p)),sum=term;for(let i=k;i<n;i++){term*=((n-i)/(i+1))*(p/(1-p));sum+=term;if(!Number.isFinite(sum))return 1;}return Math.min(1,Math.max(0,sum));}
function cpLower(n,k,c){if(k<=0)return 0;const alpha=1-c;let lo=0,hi=1;for(let i=0;i<80;i++){const mid=(lo+hi)/2;if(upperTail(n,k,mid)>alpha)hi=mid;else lo=mid;}return (lo+hi)/2;}

export function deriveBetfairApMcCoyReviewedRaceLowerBound({reviewedCycles,scheduledAttemptLedgerReview,actionLatencyReview,raceAssumptionsReview,confidence=0.95}={}){
  const c=finite(confidence);
  if(c===null||c<MIN_CONFIDENCE||c>=1)return fail('CONFIDENCE_BELOW_FROZEN_MINIMUM',{confidence:c,minimumConfidence:MIN_CONFIDENCE});

  const attempt=scheduledAttemptLedgerReview;
  if(!attempt||attempt.version!==ATTEMPT_REVIEW_VERSION||attempt.valid!==true||attempt.completeScheduledAttemptLedgerVerified!==true||attempt.allScheduledOpportunitiesRetained!==true||attempt.usableForRaceDenominator!==true)return fail('VALID_FIXED_SCHEDULED_ATTEMPT_LEDGER_REVIEW_REQUIRED');
  if(attempt.activationVerifiedBeforeFirstScheduledGht!==true||!text(attempt.activationReviewCommit)||!(finite(attempt.activatedAtEpochSeconds)>0))return fail('CODE_OWNED_ATTEMPT_PLAN_ACTIVATION_REQUIRED');
  if(!isApprovedBetfairApMcCoyAttemptLedgerReviewArtifact(attempt))return fail('ATTEMPT_LEDGER_REVIEW_ARTIFACT_NOT_CODE_APPROVED',{reviewCommit:attempt.reviewCommit||null,reviewArtifactIdentity:attempt.reviewArtifactIdentity||null});
  if(Number(attempt.targetScheduledOpportunities)!==REQUIRED_SCHEDULED_ATTEMPTS||Number(attempt.scheduledAttemptCount)!==REQUIRED_SCHEDULED_ATTEMPTS)return fail('EXACT_SEVEN_SCHEDULED_ATTEMPTS_REQUIRED',{scheduledAttemptCount:attempt.scheduledAttemptCount??null});
  if(attempt.nonCycleAttemptsCountAsConservativeRaceFailures!==true||attempt.ambiguousReviewedCyclesCountAsConservativeRaceFailures!==true||attempt.stopRuleChangedAfterObservation!==false)return fail('FROZEN_DENOMINATOR_CONSERVATISM_REQUIRED');
  const fullLedgerCommit=text(attempt.ledgerCommit)?.toLowerCase(),attemptBinding=text(attempt.bindingScopeKey);
  if(!fullLedgerCommit)return fail('COMMITTED_FULL_ATTEMPT_LEDGER_REQUIRED');
  if(!attemptBinding||attemptBinding==='|||')return fail('ATTEMPT_LEDGER_BINDING_SCOPE_REQUIRED');
  const entries=Array.isArray(attempt.entries)?attempt.entries:[];
  if(entries.length!==REQUIRED_SCHEDULED_ATTEMPTS)return fail('ATTEMPT_LEDGER_ENTRY_COUNT_MISMATCH',{entryCount:entries.length});
  const cycles=entries.filter(e=>e?.terminalClass==='REVIEWED_COMPLETE_SURVIVAL_CYCLE').map(e=>e.reviewedCycle);
  if(cycles.length<1)return fail('NO_REVIEWED_COMPLETE_SURVIVAL_CYCLES_IN_FIXED_LEDGER',{scheduledAttemptCount:REQUIRED_SCHEDULED_ATTEMPTS,nonCycleFailureCount:attempt.nonCycleFailureCount??null});
  const caller=Array.isArray(reviewedCycles)?reviewedCycles:[];
  if(caller.length&&!exactSet(caller.map(x=>x?.cycleId),cycles.map(x=>x?.cycleId)))return fail('CALLER_REVIEWED_CYCLE_LIST_DOES_NOT_MATCH_FIXED_ATTEMPT_LEDGER',{callerCycleIds:caller.map(x=>text(x?.cycleId)),ledgerCycleIds:cycles.map(x=>text(x?.cycleId))});

  const latency=actionLatencyReview;
  if(!latency||latency.version!==LATENCY_VERSION||latency.valid!==true||latency.measuredActionLatencyVerified!==true||latency.latencyPolicyIndependentlyReviewed!==true||latency.selectedUsingPostGhtSurvivalOutcomes!==false)return fail('VALID_INDEPENDENT_ACTION_LATENCY_REVIEW_REQUIRED');
  if(!isApprovedBetfairApMcCoyActionLatencyReviewArtifact(latency))return fail('ACTION_LATENCY_REVIEW_ARTIFACT_NOT_CODE_APPROVED',{reviewCommit:latency.reviewCommit||null,reviewArtifactIdentity:latency.reviewArtifactIdentity||null});
  const measuredActionLatencySeconds=finite(latency.measuredActionLatencySeconds);if(!(measuredActionLatencySeconds>0))return fail('INVALID_REVIEWED_ACTION_LATENCY');

  const assumptions=raceAssumptionsReview;
  if(!assumptions||assumptions.version!==ASSUMPTION_VERSION||assumptions.valid!==true||assumptions.independentRaceAssumptionsReviewed!==true||assumptions.completeProspectiveCycleLedgerVerified!==true||assumptions.binomialSamplingAssumptionJustified!==true||assumptions.currentCycleExchangeabilityVerified!==true||assumptions.samplingWindowFrozenBeforeFirstCycle!==true||assumptions.allEligibleDistinctDailyGhtCyclesIncluded!==true||assumptions.failedShortAndAmbiguousCyclesRetained!==true||assumptions.assumptionsSelectedUsingSurvivalOutcomes!==false)return fail('VALID_INDEPENDENT_RACE_ASSUMPTIONS_REVIEW_REQUIRED');
  if(!isApprovedBetfairApMcCoyRaceAssumptionReviewCommit(assumptions.reviewCommit))return fail('RACE_ASSUMPTION_REVIEW_COMMIT_NOT_CODE_ALLOWLISTED',{reviewCommit:assumptions.reviewCommit||null});
  if(text(assumptions.completeProspectiveLedgerCommit)?.toLowerCase()!==fullLedgerCommit)return fail('RACE_ASSUMPTIONS_NOT_BOUND_TO_FULL_SCHEDULED_ATTEMPT_LEDGER',{assumptionLedgerCommit:assumptions.completeProspectiveLedgerCommit||null,attemptLedgerCommit:fullLedgerCommit});

  const ids=new Set(),bindings=new Set(),execs=new Set(),prepared=[];
  for(const cycle of cycles){
    if(!cycle||cycle.version!==CYCLE_VERSION||cycle.valid!==true||cycle.independentReviewApproved!==true||cycle.completeAttemptLedgerVerified!==true||cycle.completeObservationHorizon!==true||cycle.usableForLatencyClassification!==true)return fail('INVALID_REVIEWED_SURVIVAL_CYCLE');
    if(!isApprovedBetfairApMcCoySurvivalReviewCommit(cycle.reviewCommit))return fail('SURVIVAL_REVIEW_COMMIT_NOT_CODE_ALLOWLISTED',{cycleId:cycle.cycleId||null,reviewCommit:cycle.reviewCommit||null});
    const id=text(cycle.cycleId),key=bindingKey(cycle),exec=finite(cycle.requestExecIntervalSeconds);
    if(!id||ids.has(id))return fail('MISSING_OR_DUPLICATE_CYCLE_ID',{cycleId:id});ids.add(id);
    if(!key||key==='|||')return fail('MISSING_BINDING_SCOPE',{cycleId:id});bindings.add(key);
    if(!(exec>0))return fail('INVALID_EXEC_INTERVAL',{cycleId:id});execs.add(exec);
    prepared.push({id,cycle});
  }
  if(bindings.size!==1)return fail('BINDING_SCOPE_CHANGED_ACROSS_REVIEWED_CYCLES',{bindingScopeCount:bindings.size});
  if(execs.size!==1)return fail('EXEC_INTERVAL_CHANGED_ACROSS_REVIEWED_CYCLES',{execIntervals:[...execs]});
  const actualCycleIds=[...ids],actualBindingScopeKey=[...bindings][0];
  if(actualBindingScopeKey!==attemptBinding)return fail('REVIEWED_CYCLE_BINDING_DOES_NOT_MATCH_FIXED_ATTEMPT_LEDGER',{actualBindingScopeKey,attemptBindingScopeKey:attemptBinding});
  if(!exactSet(actualCycleIds,attempt.reviewedCycleIds))return fail('REVIEWED_CYCLE_SET_DOES_NOT_MATCH_FIXED_ATTEMPT_LEDGER',{actualCycleIds,attemptReviewedCycleIds:attempt.reviewedCycleIds||null});
  if(!exactSet(actualCycleIds,assumptions.cycleIds))return fail('RACE_ASSUMPTION_REVIEW_CYCLE_LEDGER_MISMATCH',{actualCycleIds,reviewedCycleIds:assumptions.cycleIds||null});
  if(text(assumptions.bindingScopeKey)!==actualBindingScopeKey)return fail('RACE_ASSUMPTION_REVIEW_BINDING_SCOPE_MISMATCH',{actualBindingScopeKey,reviewedBindingScopeKey:assumptions.bindingScopeKey||null});

  const exec=[...execs][0],maxDecisionFeedAgeSeconds=exec*MAX_DECISION_FEED_AGE_INTERVALS;
  const validatedRaceWindowSeconds=maxDecisionFeedAgeSeconds+measuredActionLatencySeconds;
  const frozenSurvivalHorizonSeconds=exec*FROZEN_SURVIVAL_HORIZON_INTERVALS;
  if(validatedRaceWindowSeconds>frozenSurvivalHorizonSeconds)return fail('REVIEWED_RACE_WINDOW_EXCEEDS_FROZEN_SURVIVAL_HORIZON',{validatedRaceWindowSeconds,frozenSurvivalHorizonSeconds,measuredActionLatencySeconds,maxDecisionFeedAgeSeconds});

  const classifications=[];let successes=0,observedReviewedCycleFailures=0,ambiguous=0;
  for(const {id,cycle} of prepared){
    const r=classifyBetfairApMcCoyReviewedSurvivalCycleAtLatency(cycle,validatedRaceWindowSeconds);
    if(r?.valid!==true)return fail('RACE_WINDOW_CLASSIFICATION_FAILED',{cycleId:id});
    if(r.classification==='SUCCESS')successes++;else if(r.classification==='FAILURE')observedReviewedCycleFailures++;else ambiguous++;
    classifications.push({cycleId:id,classification:r.classification});
  }
  const nonCycleFailureCount=Number(attempt.nonCycleFailureCount);
  if(!Number.isInteger(nonCycleFailureCount)||nonCycleFailureCount<0||nonCycleFailureCount+cycles.length!==REQUIRED_SCHEDULED_ATTEMPTS)return fail('FIXED_ATTEMPT_LEDGER_COUNTS_INCONSISTENT',{nonCycleFailureCount,reviewedCycleCount:cycles.length,scheduledAttemptCount:REQUIRED_SCHEDULED_ATTEMPTS});
  const conservativeFailures=REQUIRED_SCHEDULED_ATTEMPTS-successes;
  const lowerBound=cpLower(REQUIRED_SCHEDULED_ATTEMPTS,successes,c);
  return {
    version:VERSION,valid:true,mode:'OFFLINE_CODE_REVIEWED_AP_MCCOY_FIXED_ATTEMPT_RACE_BOUND_NO_PLAY',reason:'CODE_REVIEWED_AP_MCCOY_CONSERVATIVE_RACE_LOWER_BOUND_AVAILABLE_OVER_FIXED_SEVEN_ATTEMPTS',
    operator:'Betfair Spain',market:'ES',target:{title:'AP McCoy Sporting Legends',gameId:'ap-mccoy-sporting-legends-cptn'},
    protocolId:assumptions.protocolId,latencyMeasurementProtocolId:latency.protocolId,measuredActionLatencySeconds,actionLatencyReviewCommit:latency.reviewCommit,actionLatencyReviewArtifactIdentity:latency.reviewArtifactIdentity,
    activationReviewCommit:attempt.activationReviewCommit,activatedAtEpochSeconds:attempt.activatedAtEpochSeconds,
    maxDecisionFeedAgeIntervals:MAX_DECISION_FEED_AGE_INTERVALS,maxDecisionFeedAgeSeconds,frozenSurvivalHorizonIntervals:FROZEN_SURVIVAL_HORIZON_INTERVALS,frozenSurvivalHorizonSeconds,validatedRaceWindowSeconds,
    raceAssumptionReviewCommit:assumptions.reviewCommit,attemptLedgerReviewCommit:attempt.reviewCommit,attemptLedgerReviewArtifactIdentity:attempt.reviewArtifactIdentity,completeProspectiveLedgerCommit:fullLedgerCommit,assumptionEvidenceId:assumptions.assumptionEvidenceId,
    attemptIds:attempt.attemptIds,scheduledGhtEpochSeconds:attempt.scheduledGhtEpochSeconds,cycleIds:actualCycleIds,reviewedCycleCount:cycles.length,scheduledAttemptCount:REQUIRED_SCHEDULED_ATTEMPTS,nonCycleFailureCount,
    successfulDryRunCycles:successes,observedReviewedCycleFailureCount:observedReviewedCycleFailures,ambiguousReviewedCycles:ambiguous,conservativeFailureCycles:conservativeFailures,
    nonCycleAttemptsCountAsFailures:true,ambiguousReviewedCyclesCountAsFailures:true,classifications,
    confidence:c,minimumConfidence:MIN_CONFIDENCE,method:'ONE_SIDED_CLOPPER_PEARSON_BINOMIAL_FIXED_SEVEN_ATTEMPTS_CONSERVATIVE_FAILURES',firstBetRaceProbabilityLowerBound:lowerBound,
    exactScheduledAttemptDenominatorVerified:true,exactReviewedArtifactIdentitiesVerified:true,activationVerifiedBeforeFirstScheduledGht:true,completeProspectiveCycleLedgerVerified:true,binomialSamplingAssumptionJustified:true,currentCycleExchangeabilityVerified:true,
    exactCycleLedgerMatchesAssumptionReview:true,bindingScopeMatchesAssumptionReview:true,samplingWindowFrozenBeforeFirstCycle:true,allEligibleDistinctDailyGhtCyclesIncluded:true,failedShortAndAmbiguousCyclesRetained:true,assumptionsSelectedUsingSurvivalOutcomes:false,
    bindingScopeKey:actualBindingScopeKey,requestExecIntervalSeconds:exec,reviewedRaceLowerBoundAvailable:true,usableForRaceEvidence:true,usableForExecution:false,
    scientificUse:'Derives the AP McCoy race lower confidence bound only from exact code-owned reviewed artifacts. The attempt-ledger review SHA is bound to its exact seven-opportunity ledger identity and the latency review SHA to its exact end-to-end dispatch-plus-passive-RTT measurement identity; approved SHAs cannot be reused with altered content. Exactly seven scheduled Daily GHT opportunities remain in the denominator, missing/failed/ambiguous outcomes are conservative failures, confidence is at least 95%, and the feed-age-plus-action window may not exceed the frozen survival horizon.',
    execution:execution(),
    hardGuards:{onlineOnly:true,nonPromoOnly:true,exactReviewedArtifactIdentitiesRequired:true,approvedReviewShaCannotAuthorizeAlteredArtifact:true,codeOwnedActivationRequired:true,activationBeforeFirstScheduledGhtRequired:true,fixedSevenScheduledAttemptDenominator:true,codeOwnedAttemptLedgerReviewArtifact:true,codeOwnedLatencyReviewArtifact:true,codeOwnedRaceAssumptionReviewAllowlist:true,fullAttemptLedgerCommitMustMatchRaceAssumptionReview:true,callerReviewedCycleSubsetCannotReplaceAttemptLedger:true,nonCycleFailuresCannotBeDropped:true,ambiguousReviewedCyclesCannotBeDropped:true,minimumConfidence95Pct:true,optionalStoppingForbidden:true,bindingScopeMustMatchAttemptAndAssumptionReviews:true,latencyIndependentOfSurvivalOutcomes:true,maxDecisionFeedAgeIntervalsFrozen:true,raceWindowIncludesFeedAgePlusActionLatency:true,raceWindowCannotExceedFrozenTwelveIntervalSurvivalHorizon:true,notExecutionAuthority:true,servedStakeStillRequired:true,currentFreshStateStillRequired:true,noWagerProbe:true,noAutomaticBetting:true,realMoneyAllowed:false}
  };
}

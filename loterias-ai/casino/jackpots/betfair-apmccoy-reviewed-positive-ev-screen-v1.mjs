const VERSION='betfair-apmccoy-reviewed-positive-ev-screen-v1.2-scheduled-attempt-denominator-hard-block';
const BRIDGE_VERSION='betfair-sporting-har-overdue-bridge-v1.10-code-owned-latency-dryrun';
const LEGACY_RACE_VERSION='betfair-apmccoy-reviewed-race-bound-v1.2-exact-ledger-frozen-horizon';
const SCHEDULED_ATTEMPT_PLAN_FREEZE_COMMIT='e82f6d61dffa21ec3ca7ec940c51fc3fe36f0e1a';
const SCHEDULED_ATTEMPT_LEDGER_REVIEW_VERSION='betfair-apmccoy-scheduled-attempt-ledger-review-v1.1-committed-ledger';
const REQUIRED_SCHEDULED_ATTEMPTS=7;
const MIN_RACE_CONFIDENCE=0.95;
const MAX_BASE_RTP_PCT=93.03;
// Deliberately false. The current legacy race-bound denominator contains only
// reviewed complete cycles and therefore cannot prove that failed/short/missed
// scheduled opportunities remained in the statistical denominator. A later,
// separately reviewed implementation must consume the frozen seven-opportunity
// attempt ledger before this switch may ever change.
const SCHEDULED_ATTEMPT_RACE_BOUND_IMPLEMENTATION_AVAILABLE=false;
const finite=v=>{if(v===null||v===undefined||v===''||typeof v==='boolean')return null;const n=Number(v);return Number.isFinite(n)?n:null;};
const text=v=>typeof v==='string'&&v.trim()?v.trim():null;
const lower=v=>text(v)?.toLowerCase()??null;
const endpointShape=v=>{try{const u=new URL(String(v||''));return `${u.origin}${u.pathname}`;}catch{return null;}};
function currentBindingKey(bridge){const s=bridge?.after?.snapshot||{};return [lower(bridge?.after?.expectedBetfairImsCasino),endpointShape(bridge?.after?.tickerEndpoint),endpointShape(bridge?.after?.configSourceUrl),text(s.instanceCode)].join('|');}
function execution(){return {decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0};}
function fail(reason,extra={}){return {version:VERSION,valid:false,reason,reviewedPositiveEvScreenPassed:false,usableForExecution:false,execution:execution(),...extra};}

export function evaluateBetfairApMcCoyReviewedPositiveEvScreen({overdueBridgeResult,reviewedRaceBound}={}){
  const bridge=overdueBridgeResult,race=reviewedRaceBound;
  if(!bridge||bridge.version!==BRIDGE_VERSION||bridge.valid!==true)return fail('VALID_CURRENT_AP_MCCOY_OVERDUE_BRIDGE_RESULT_REQUIRED');
  if(bridge.operatorFollowingDayRuleVerifiedFromCodeOwnedCurrentEvidence!==true||bridge.providerGhtBoundarySemanticsVerifiedFromCodeOwnedEvidence!==true)return fail('CODE_OWNED_OPERATOR_SEMANTICS_REQUIRED');
  if(bridge.currentDailyAmountExactVerifiedFromValidatedServerSnapshot!==true||bridge.finalEvaluation?.followingDayUnawardedVerified!==true||bridge.finalEvaluation?.nextEligibleNetworkBetGuaranteedJackpot!==true)return fail('CURRENT_EXACT_POST_GHT_UNAWARDED_STATE_REQUIRED');
  if(bridge.stakeAtDecisionExactVerifiedFromCodeOwnedReview!==true||bridge.stakeReview?.valid!==true||bridge.stakeReview?.stakeAtDecisionExactVerified!==true)return fail('CODE_REVIEWED_SERVED_STAKE_REQUIRED');
  if(bridge.measuredActionLatencyVerifiedFromCodeOwnedReview!==true||bridge.actionLatencyReview?.valid!==true||bridge.actionLatencyReview?.measuredActionLatencyVerified!==true)return fail('CODE_REVIEWED_ACTION_LATENCY_REQUIRED');

  if(SCHEDULED_ATTEMPT_RACE_BOUND_IMPLEMENTATION_AVAILABLE!==true){
    return fail('COMPLETE_FIXED_SCHEDULED_ATTEMPT_DENOMINATOR_NOT_YET_INTEGRATED',{
      legacyRaceBoundVersionRejected:race?.version===LEGACY_RACE_VERSION?LEGACY_RACE_VERSION:null,
      requiredPlanFreezeCommit:SCHEDULED_ATTEMPT_PLAN_FREEZE_COMMIT,
      requiredAttemptLedgerReviewVersion:SCHEDULED_ATTEMPT_LEDGER_REVIEW_VERSION,
      requiredScheduledAttemptCount:REQUIRED_SCHEDULED_ATTEMPTS,
      requiredMinimumRaceConfidence:MIN_RACE_CONFIDENCE,
      scientificBlocker:'The legacy race bound can classify reviewed complete cycles but does not itself carry every scheduled failed, short, invalid or missed opportunity in its denominator. Until a separately reviewed bound consumes the complete frozen seven-opportunity ledger, positive-EV promotion is disabled regardless of caller-supplied race fields.',
      hardGuards:{scheduledAttemptDenominatorRequired:true,legacyReviewedCycleOnlyDenominatorRejected:true,failedShortInvalidMissedAttemptsMustRemainInDenominator:true,optionalStoppingForbidden:true,minimumRaceConfidence95Pct:true,callerCannotEnableImplementationSwitch:true,realMoneyAllowed:false}
    });
  }

  // The code below is intentionally unreachable until a later reviewed change
  // replaces the legacy race contract with a complete scheduled-attempt bound.
  if(!race||race.valid!==true||race.reviewedRaceLowerBoundAvailable!==true||race.usableForRaceEvidence!==true)return fail('VALID_REVIEWED_AP_MCCOY_RACE_BOUND_REQUIRED');
  if(race.exactScheduledAttemptDenominatorVerified!==true||Number(race.scheduledAttemptCount)!==REQUIRED_SCHEDULED_ATTEMPTS||race.nonCycleAttemptsCountAsFailures!==true||race.ambiguousReviewedCyclesCountAsFailures!==true)return fail('COMPLETE_FIXED_SCHEDULED_ATTEMPT_DENOMINATOR_REQUIRED');
  const raceConfidence=finite(race.confidence);if(raceConfidence===null||raceConfidence<MIN_RACE_CONFIDENCE||raceConfidence>=1)return fail('RACE_CONFIDENCE_BELOW_REQUIRED_MINIMUM',{raceConfidence,minimumRaceConfidence:MIN_RACE_CONFIDENCE});
  if(race.exactCycleLedgerMatchesAssumptionReview!==true||race.bindingScopeMatchesAssumptionReview!==true||race.samplingWindowFrozenBeforeFirstCycle!==true||race.allEligibleDistinctDailyGhtCyclesIncluded!==true||race.failedShortAndAmbiguousCyclesRetained!==true||race.assumptionsSelectedUsingSurvivalOutcomes!==false)return fail('EXACT_REVIEWED_RACE_LEDGER_CONTRACT_REQUIRED');
  const raceWindow=finite(race.validatedRaceWindowSeconds),frozenHorizon=finite(race.frozenSurvivalHorizonSeconds);
  if(!(raceWindow>0)||!(frozenHorizon>0)||raceWindow>frozenHorizon)return fail('REVIEWED_RACE_WINDOW_OUTSIDE_FROZEN_SURVIVAL_HORIZON',{validatedRaceWindowSeconds:raceWindow,frozenSurvivalHorizonSeconds:frozenHorizon});
  if(race.actionLatencyReviewCommit!==bridge.actionLatencyReview.reviewCommit||finite(race.measuredActionLatencySeconds)!==finite(bridge.actionLatencyReview.measuredActionLatencySeconds))return fail('RACE_BOUND_LATENCY_REVIEW_DOES_NOT_MATCH_CURRENT_BRIDGE');
  const key=currentBindingKey(bridge);if(!key||key==='|||')return fail('CURRENT_BINDING_KEY_REQUIRED');
  if(race.bindingScopeKey!==key)return fail('RACE_BOUND_BINDING_SCOPE_DOES_NOT_MATCH_CURRENT_SESSION',{currentBindingScopeKey:key,raceBindingScopeKey:race.bindingScopeKey||null});
  const stake=finite(bridge.stakeReview.selectedStakeEUR),jackpot=finite(bridge.after?.snapshot?.amount);
  if(!(stake>0)||!(jackpot>0))return fail('CURRENT_STAKE_AND_DAILY_JACKPOT_REQUIRED');
  const requestedRtp=finite(bridge.semantics?.conservativeMainGameRtpPct);
  if(requestedRtp===null||requestedRtp<0||requestedRtp>MAX_BASE_RTP_PCT)return fail('CONSERVATIVE_BASE_RTP_NOT_PINNED_TO_CURRENT_OPERATOR_FLOOR',{requestedConservativeBaseRtpPct:requestedRtp});
  const baseRtpPct=requestedRtp;
  const expectedBaseLossEUR=stake*((100-baseRtpPct)/100);
  const breakEvenFirstBetProbability=expectedBaseLossEUR/jackpot;
  const pLower=finite(race.firstBetRaceProbabilityLowerBound);
  if(!(breakEvenFirstBetProbability>0&&breakEvenFirstBetProbability<1)||pLower===null||pLower<0||pLower>1)return fail('INVALID_BREAK_EVEN_OR_RACE_BOUND',{breakEvenFirstBetProbability,firstBetRaceProbabilityLowerBound:pLower});
  const feedAgeSeconds=finite(bridge.finalEvaluation?.feedAgeSeconds),measuredActionLatencySeconds=finite(bridge.actionLatencyReview.measuredActionLatencySeconds),validatedRaceWindowSeconds=raceWindow;
  if(feedAgeSeconds===null||feedAgeSeconds<0||!(measuredActionLatencySeconds>0))return fail('CURRENT_EXPOSURE_WINDOW_FIELDS_REQUIRED');
  const totalExposureSeconds=feedAgeSeconds+measuredActionLatencySeconds;
  if(totalExposureSeconds>validatedRaceWindowSeconds)return fail('CURRENT_TOTAL_EXPOSURE_EXCEEDS_REVIEWED_RACE_WINDOW',{feedAgeSeconds,measuredActionLatencySeconds,totalExposureSeconds,validatedRaceWindowSeconds});
  const reviewedPositiveEvScreenPassed=pLower>breakEvenFirstBetProbability;
  return {
    version:VERSION,valid:true,reason:reviewedPositiveEvScreenPassed?'REVIEWED_AP_MCCOY_RACE_LOWER_BOUND_EXCEEDS_EXACT_CONSERVATIVE_BREAK_EVEN':'REVIEWED_AP_MCCOY_RACE_LOWER_BOUND_DOES_NOT_EXCEED_BREAK_EVEN',
    operator:'Betfair Spain',market:'ES',target:{title:'AP McCoy Sporting Legends',gameId:'ap-mccoy-sporting-legends-cptn'},
    bindingScopeKey:key,stakeEUR:stake,currentDailyJackpotEUR:jackpot,conservativeBaseRtpPct:baseRtpPct,expectedBaseLossEUR,
    breakEvenFirstBetProbability,firstBetRaceProbabilityLowerBound:pLower,raceConfidence,
    feedAgeSeconds,measuredActionLatencySeconds,totalExposureSeconds,validatedRaceWindowSeconds,frozenSurvivalHorizonSeconds:frozenHorizon,
    exactScheduledAttemptDenominatorVerified:true,scheduledAttemptCount:REQUIRED_SCHEDULED_ATTEMPTS,
    exactCycleLedgerMatchesAssumptionReview:true,bindingScopeMatchesAssumptionReview:true,
    reviewedPositiveEvScreenPassed,
    executionAdapterStillRequired:true,freshFinalRevalidationStillRequired:true,usableForExecution:false,
    scientificUse:'Fail-closed AP McCoy positive-EV screen. The execution path is intentionally disabled until a separately reviewed race bound consumes the complete fixed seven-opportunity prospective attempt ledger, with every failed, short, invalid, missed and ambiguous attempt retained conservatively in the denominator at at least 95% confidence. Passing the later screen will still not be execution authority: fresh final same-binding revalidation remains mandatory.',
    execution:execution(),
    hardGuards:{onlineOnly:true,nonPromoOnly:true,completeFixedScheduledAttemptDenominatorRequired:true,legacyReviewedCycleOnlyRaceBoundRejected:true,minimumRaceConfidence95Pct:true,exactCurrentPostGhtStateRequired:true,codeReviewedStakeRequired:true,codeReviewedLatencyRequired:true,exactBindingScopeEqualityRequired:true,failedShortInvalidMissedAttemptsMustRemainInDenominator:true,optionalStoppingForbidden:true,reviewedRaceWindowMustFitFrozenSurvivalHorizon:true,conservativeRtpFloorRequired:true,currentExposureMustFitReviewedRaceWindow:true,positiveEvScreenIsNotExecutionAuthority:true,freshFinalRevalidationStillRequired:true,noWagerProbe:true,noAutomaticBetting:true,realMoneyAllowed:false}
  };
}

import {isApprovedBetfairApMcCoyAttemptLedgerReviewCommit} from './betfair-apmccoy-scheduled-attempt-ledger-review-v1.mjs';
import {isApprovedBetfairApMcCoyRaceAssumptionReviewCommit} from './betfair-apmccoy-race-assumptions-review-v1.mjs';
import {isApprovedBetfairApMcCoyActionLatencyReviewCommit} from './betfair-apmccoy-action-latency-review-v1.mjs';

const VERSION='betfair-apmccoy-reviewed-positive-ev-screen-v1.4-prior-activation-required';
const BRIDGE_VERSION='betfair-sporting-har-overdue-bridge-v1.10-code-owned-latency-dryrun';
const RACE_VERSION='betfair-apmccoy-reviewed-race-bound-v1.3-fixed-seven-attempt-denominator';
const REQUIRED_SCHEDULED_ATTEMPTS=7;
const MIN_RACE_CONFIDENCE=0.95;
const MAX_BASE_RTP_PCT=93.03;
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

  if(!race||race.version!==RACE_VERSION||race.valid!==true||race.reviewedRaceLowerBoundAvailable!==true||race.usableForRaceEvidence!==true)return fail('VALID_FIXED_ATTEMPT_AP_MCCOY_RACE_BOUND_REQUIRED');
  if(race.exactScheduledAttemptDenominatorVerified!==true||Number(race.scheduledAttemptCount)!==REQUIRED_SCHEDULED_ATTEMPTS||race.nonCycleAttemptsCountAsFailures!==true||race.ambiguousReviewedCyclesCountAsFailures!==true)return fail('COMPLETE_FIXED_SCHEDULED_ATTEMPT_DENOMINATOR_REQUIRED');
  if(race.activationVerifiedBeforeFirstScheduledGht!==true||!text(race.activationReviewCommit)||!(finite(race.activatedAtEpochSeconds)>0))return fail('PRIOR_CODE_OWNED_ATTEMPT_PLAN_ACTIVATION_REQUIRED');
  const raceConfidence=finite(race.confidence);if(raceConfidence===null||raceConfidence<MIN_RACE_CONFIDENCE||raceConfidence>=1)return fail('RACE_CONFIDENCE_BELOW_REQUIRED_MINIMUM',{raceConfidence,minimumRaceConfidence:MIN_RACE_CONFIDENCE});
  if(!isApprovedBetfairApMcCoyAttemptLedgerReviewCommit(race.attemptLedgerReviewCommit))return fail('ATTEMPT_LEDGER_REVIEW_NOT_CODE_ALLOWLISTED',{attemptLedgerReviewCommit:race.attemptLedgerReviewCommit||null});
  if(!isApprovedBetfairApMcCoyRaceAssumptionReviewCommit(race.raceAssumptionReviewCommit))return fail('RACE_ASSUMPTION_REVIEW_NOT_CODE_ALLOWLISTED',{raceAssumptionReviewCommit:race.raceAssumptionReviewCommit||null});
  if(!isApprovedBetfairApMcCoyActionLatencyReviewCommit(race.actionLatencyReviewCommit))return fail('ACTION_LATENCY_REVIEW_NOT_CODE_ALLOWLISTED',{actionLatencyReviewCommit:race.actionLatencyReviewCommit||null});
  if(race.exactCycleLedgerMatchesAssumptionReview!==true||race.bindingScopeMatchesAssumptionReview!==true||race.samplingWindowFrozenBeforeFirstCycle!==true||race.allEligibleDistinctDailyGhtCyclesIncluded!==true||race.failedShortAndAmbiguousCyclesRetained!==true||race.assumptionsSelectedUsingSurvivalOutcomes!==false)return fail('EXACT_REVIEWED_RACE_LEDGER_CONTRACT_REQUIRED');
  if(!text(race.completeProspectiveLedgerCommit))return fail('COMMITTED_FULL_ATTEMPT_LEDGER_REQUIRED');

  const raceWindow=finite(race.validatedRaceWindowSeconds),frozenHorizon=finite(race.frozenSurvivalHorizonSeconds);
  if(!(raceWindow>0)||!(frozenHorizon>0)||raceWindow>frozenHorizon)return fail('REVIEWED_RACE_WINDOW_OUTSIDE_FROZEN_SURVIVAL_HORIZON',{validatedRaceWindowSeconds:raceWindow,frozenSurvivalHorizonSeconds:frozenHorizon});
  if(race.actionLatencyReviewCommit!==bridge.actionLatencyReview.reviewCommit||finite(race.measuredActionLatencySeconds)!==finite(bridge.actionLatencyReview.measuredActionLatencySeconds))return fail('RACE_BOUND_LATENCY_REVIEW_DOES_NOT_MATCH_CURRENT_BRIDGE');

  const key=currentBindingKey(bridge);if(!key||key==='|||')return fail('CURRENT_BINDING_KEY_REQUIRED');
  if(race.bindingScopeKey!==key)return fail('RACE_BOUND_BINDING_SCOPE_DOES_NOT_MATCH_CURRENT_SESSION',{currentBindingScopeKey:key,raceBindingScopeKey:race.bindingScopeKey||null});
  const stake=finite(bridge.stakeReview.selectedStakeEUR),jackpot=finite(bridge.after?.snapshot?.amount);
  if(!(stake>0)||!(jackpot>0))return fail('CURRENT_STAKE_AND_DAILY_JACKPOT_REQUIRED');
  const requestedRtp=finite(bridge.semantics?.conservativeMainGameRtpPct);
  if(requestedRtp===null||requestedRtp<0||requestedRtp>MAX_BASE_RTP_PCT)return fail('CONSERVATIVE_BASE_RTP_NOT_PINNED_TO_CURRENT_OPERATOR_FLOOR',{requestedConservativeBaseRtpPct:requestedRtp});
  const expectedBaseLossEUR=stake*((100-requestedRtp)/100),breakEvenFirstBetProbability=expectedBaseLossEUR/jackpot;
  const pLower=finite(race.firstBetRaceProbabilityLowerBound);
  if(!(breakEvenFirstBetProbability>0&&breakEvenFirstBetProbability<1)||pLower===null||pLower<0||pLower>1)return fail('INVALID_BREAK_EVEN_OR_RACE_BOUND',{breakEvenFirstBetProbability,firstBetRaceProbabilityLowerBound:pLower});

  const feedAgeSeconds=finite(bridge.finalEvaluation?.feedAgeSeconds),measuredActionLatencySeconds=finite(bridge.actionLatencyReview.measuredActionLatencySeconds);
  if(feedAgeSeconds===null||feedAgeSeconds<0||!(measuredActionLatencySeconds>0))return fail('CURRENT_EXPOSURE_WINDOW_FIELDS_REQUIRED');
  const totalExposureSeconds=feedAgeSeconds+measuredActionLatencySeconds;
  if(totalExposureSeconds>raceWindow)return fail('CURRENT_TOTAL_EXPOSURE_EXCEEDS_REVIEWED_RACE_WINDOW',{feedAgeSeconds,measuredActionLatencySeconds,totalExposureSeconds,validatedRaceWindowSeconds:raceWindow});

  const reviewedPositiveEvScreenPassed=pLower>breakEvenFirstBetProbability;
  return {
    version:VERSION,valid:true,reason:reviewedPositiveEvScreenPassed?'REVIEWED_AP_MCCOY_FIXED_ATTEMPT_RACE_LOWER_BOUND_EXCEEDS_EXACT_CONSERVATIVE_BREAK_EVEN':'REVIEWED_AP_MCCOY_FIXED_ATTEMPT_RACE_LOWER_BOUND_DOES_NOT_EXCEED_BREAK_EVEN',
    operator:'Betfair Spain',market:'ES',target:{title:'AP McCoy Sporting Legends',gameId:'ap-mccoy-sporting-legends-cptn'},
    bindingScopeKey:key,stakeEUR:stake,currentDailyJackpotEUR:jackpot,conservativeBaseRtpPct:requestedRtp,expectedBaseLossEUR,breakEvenFirstBetProbability,firstBetRaceProbabilityLowerBound:pLower,raceConfidence,
    feedAgeSeconds,measuredActionLatencySeconds,totalExposureSeconds,validatedRaceWindowSeconds:raceWindow,frozenSurvivalHorizonSeconds:frozenHorizon,
    activationVerifiedBeforeFirstScheduledGht:true,activationReviewCommit:race.activationReviewCommit,activatedAtEpochSeconds:race.activatedAtEpochSeconds,
    exactScheduledAttemptDenominatorVerified:true,scheduledAttemptCount:REQUIRED_SCHEDULED_ATTEMPTS,attemptLedgerReviewCommit:race.attemptLedgerReviewCommit,completeProspectiveLedgerCommit:race.completeProspectiveLedgerCommit,
    reviewedPositiveEvScreenPassed,executionAdapterStillRequired:true,freshFinalRevalidationStillRequired:true,usableForExecution:false,
    scientificUse:'Research-only AP McCoy positive-EV screen using a code-owned activation fixed before the first scheduled GHT and the lower confidence bound over exactly the first seven scheduled Daily GHT opportunities. Every failed, short, invalid, missed and ambiguous attempt remains in the denominator, confidence is at least 95%, and the attempt-ledger, race-assumption and action-latency reviews must all be code-allowlisted. Even a positive screen cannot authorize a wager: a separate fresh final same-binding revalidation and execution contract remain mandatory.',
    execution:execution(),
    hardGuards:{onlineOnly:true,nonPromoOnly:true,priorCodeOwnedActivationRequired:true,activationMustPrecedeFirstScheduledGht:true,fixedSevenScheduledAttemptDenominatorRequired:true,minimumRaceConfidence95Pct:true,codeOwnedAttemptLedgerReviewRequired:true,codeOwnedRaceAssumptionReviewRequired:true,codeOwnedActionLatencyReviewRequired:true,exactCurrentPostGhtStateRequired:true,codeReviewedStakeRequired:true,exactBindingScopeEqualityRequired:true,failedShortInvalidMissedAttemptsRemainInDenominator:true,optionalStoppingForbidden:true,reviewedRaceWindowMustFitFrozenSurvivalHorizon:true,conservativeRtpFloorRequired:true,currentExposureMustFitReviewedRaceWindow:true,positiveEvScreenIsNotExecutionAuthority:true,freshFinalRevalidationStillRequired:true,noWagerProbe:true,noAutomaticBetting:true,realMoneyAllowed:false}
  };
}

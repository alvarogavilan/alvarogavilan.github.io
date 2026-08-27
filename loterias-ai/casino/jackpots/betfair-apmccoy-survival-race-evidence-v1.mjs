import {deriveProspectiveEmpiricalRaceLowerBoundFromValidatedCycles} from './sporting-legends-empirical-race-bound-v1.mjs';
import {classifyBetfairApMcCoyReviewedSurvivalCycleAtLatency,deriveBetfairApMcCoyFrozenHorizonSurvivalCurve} from './betfair-apmccoy-post-ght-survival-curve-v1.mjs';
import {reviewBetfairApMcCoyActionLatency} from './betfair-apmccoy-action-latency-review-v1.mjs';
import {reviewBetfairApMcCoyRaceAssumptions} from './betfair-apmccoy-race-assumption-review-v1.mjs';

const VERSION='betfair-apmccoy-survival-race-evidence-v1';
const finite=v=>{if(v===null||v===undefined||v===''||typeof v==='boolean')return null;const n=Number(v);return Number.isFinite(n)?n:null;};
const text=v=>typeof v==='string'&&v.trim()?v.trim():null;
function execution(){return {decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0};}
function fail(reason,extra={}){return {version:VERSION,valid:false,reason,raceEvidenceCandidateAvailable:false,usableForFinalRaceLedgerReview:false,usableForExecution:false,execution:execution(),...extra};}
function sameIdSet(a,b){if(!Array.isArray(a)||!Array.isArray(b)||a.length!==b.length)return false;const aa=a.map(text),bb=b.map(text);if(aa.some(x=>!x)||bb.some(x=>!x))return false;const sa=new Set(aa),sb=new Set(bb);return sa.size===aa.length&&sb.size===bb.length&&[...sa].every(x=>sb.has(x));}

export function deriveBetfairApMcCoyRaceEvidenceFromReviewedSurvival({
  reviewedCycles,
  actionLatencyMeasurement,
  actionLatencyReviewCommit,
  assumptionArtifact,
  assumptionReviewCommit,
  confidence=0.95,
  independentRaceLedgerReview=null,
}={}){
  const curve=deriveBetfairApMcCoyFrozenHorizonSurvivalCurve({reviewedCycles,confidence});
  if(curve?.valid!==true)return fail('REVIEWED_SURVIVAL_CURVE_REQUIRED',{curve});

  const latencyReview=reviewBetfairApMcCoyActionLatency({measurement:actionLatencyMeasurement,reviewCommit:actionLatencyReviewCommit});
  if(latencyReview?.valid!==true||latencyReview.measuredActionLatencyVerified!==true)return fail('CODE_OWNED_ACTION_LATENCY_REVIEW_REQUIRED',{curve,latencyReview});

  const assumptionReview=reviewBetfairApMcCoyRaceAssumptions({assumptionArtifact,reviewCommit:assumptionReviewCommit});
  if(assumptionReview?.valid!==true||assumptionReview.raceExecutionAssumptionsVerified!==true)return fail('CODE_OWNED_RACE_ASSUMPTION_REVIEW_REQUIRED',{curve,latencyReview,assumptionReview});

  if(text(latencyReview.protocolId)!==text(assumptionReview.protocolId))return fail('PROTOCOL_ID_MISMATCH_BETWEEN_LATENCY_AND_ASSUMPTION_REVIEWS',{curve,latencyReview,assumptionReview});
  if(!sameIdSet(curve.cycleIds,assumptionReview.cycleIds))return fail('ASSUMPTION_REVIEW_CYCLE_LEDGER_MISMATCH',{curveCycleIds:curve.cycleIds,assumptionCycleIds:assumptionReview.cycleIds});
  if(text(curve.bindingScopeKey)!==text(assumptionReview.bindingScopeKey))return fail('ASSUMPTION_REVIEW_BINDING_SCOPE_MISMATCH',{curveBindingScopeKey:curve.bindingScopeKey,assumptionBindingScopeKey:assumptionReview.bindingScopeKey});

  const latencySeconds=finite(latencyReview.measuredActionLatencySeconds),exec=finite(curve.requestExecIntervalSeconds);
  if(!(latencySeconds>0&&exec>0))return fail('POSITIVE_LATENCY_AND_CADENCE_REQUIRED',{curve,latencyReview,assumptionReview});
  const maximumObservedLatencySeconds=12*exec;
  if(latencySeconds>maximumObservedLatencySeconds)return fail('REVIEWED_ACTION_LATENCY_EXCEEDS_FROZEN_SURVIVAL_HORIZON',{latencySeconds,maximumObservedLatencySeconds});

  let ambiguousClassifications=0,strictSuccesses=0,observedFailures=0;
  const derivedCycles=[];
  for(const x of reviewedCycles){
    const c=classifyBetfairApMcCoyReviewedSurvivalCycleAtLatency(x,latencySeconds);
    if(c?.valid!==true||c.classification==='INVALID')return fail('SURVIVAL_CYCLE_LATENCY_CLASSIFICATION_FAILED',{cycleId:x?.cycleId||null});
    if(c.classification==='SUCCESS')strictSuccesses++;
    else if(c.classification==='FAILURE')observedFailures++;
    else ambiguousClassifications++;
    const conservativeOutcome=c.classification==='SUCCESS'?'SUCCESS':'FAILURE';
    derivedCycles.push({
      version:'betfair-apmccoy-reviewed-survival-binary-adapter-v1',
      valid:true,usableForRaceEvidence:true,validatorVersion:'sporting-legends-passive-race-cycle-v1',
      passiveDryRun:true,prospectivelyObserved:true,comparableCycleDefinitionVerified:true,
      cycleId:x.cycleId,protocolId:latencyReview.protocolId,actionLatencySeconds:latencySeconds,
      outcome:conservativeOutcome,rawSurvivalClassification:c.classification,
      ambiguousConservativelyMappedToFailure:c.classification==='AMBIGUOUS',
      sourceReviewCommit:x.reviewCommit,
    });
  }

  const bound=deriveProspectiveEmpiricalRaceLowerBoundFromValidatedCycles({
    cycles:derivedCycles,confidence,protocolId:latencyReview.protocolId,actionLatencySeconds:latencySeconds,
    prospectiveProtocolFrozen:true,
    binomialIidAssumptionJustified:assumptionReview.binomialIidAssumptionJustified,
    completeProspectiveCycleLedgerVerified:assumptionReview.completeProspectiveCycleLedgerVerified,
    currentCycleExchangeabilityVerified:assumptionReview.currentCycleExchangeabilityVerified,
    assumptionEvidenceId:assumptionReview.assumptionEvidenceId,
  });
  if(bound?.valid!==true||bound.usableForExecution!==true)return fail('GENERIC_EMPIRICAL_RACE_BOUND_CONTRACT_NOT_CLOSED',{curve,latencyReview,assumptionReview,bound});

  const raceEvidence={...bound,independentReview:independentRaceLedgerReview||null};
  return {
    version:VERSION,valid:true,mode:'OFFLINE_REVIEWED_AP_MCCOY_SURVIVAL_TO_CONSERVATIVE_BINARY_RACE_EVIDENCE_NO_PLAY',
    reason:'RACE_EVIDENCE_CANDIDATE_READY_FOR_FINAL_INDEPENDENT_RACE_LEDGER_REVIEW',
    curve,latencyReview,assumptionReview,
    classificationSummary:{totalCycles:derivedCycles.length,strictSuccesses,observedFailures,ambiguousClassifications,conservativeFailures:derivedCycles.length-strictSuccesses,ambiguousMappedToFailure:true},
    derivedCycles,raceEvidence,raceEvidenceCandidateAvailable:true,usableForFinalRaceLedgerReview:true,usableForExecution:false,
    scientificUse:'Bridges the latency-agnostic AP McCoy survival protocol into the existing validated passive-cycle Clopper-Pearson contract only after code-owned cycle, action-latency and sampling-assumption reviews. A reviewed cycle counts as SUCCESS only when unchanged/unreset state is confirmed at or beyond the independently reviewed action latency. Observed pre-threshold awards and every ambiguous/censored classification are retained and mapped to FAILURE, so adaptation cannot improve the empirical lower bound by dropping uncertainty. The resulting raceEvidence is still NO_PLAY and still requires the final code-owned independent race-ledger review enforced by the overdue evaluator, plus served stake and a fresh current cross-GHT state.',
    execution:execution(),
    hardGuards:{onlineOnly:true,nonPromoOnly:true,reviewedSurvivalCyclesOnly:true,actionLatencyCodeOwned:true,raceAssumptionsCodeOwned:true,latencyMustFitFrozenTwelveIntervalHorizon:true,ambiguousCyclesCannotBeDropped:true,ambiguousCyclesMappedToFailure:true,sameCycleLedgerAcrossAssumptionReviewRequired:true,sameBindingScopeAcrossAssumptionReviewRequired:true,finalIndependentRaceLedgerReviewStillRequired:true,servedStakeStillRequired:true,freshCurrentStateStillRequired:true,noWagerProbe:true,noAutomaticBetting:true,realMoneyAllowed:false},
  };
}

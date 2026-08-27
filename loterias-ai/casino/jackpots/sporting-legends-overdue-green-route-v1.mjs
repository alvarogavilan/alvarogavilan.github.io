import {deriveProspectiveEmpiricalRaceLowerBoundFromValidatedCycles} from './sporting-legends-empirical-race-bound-v1.mjs';
import {validateSportingLegendsPassiveRaceCycle} from './sporting-legends-passive-race-cycle-v1.mjs';
import {evaluateSportingLegendsOverdueFirstBet} from './sporting-legends-overdue-first-bet-v1.mjs';
const finite=(v)=>{if(v===null||v===undefined||v===''||typeof v==='boolean')return null;const n=Number(v);return Number.isFinite(n)?n:null;};
const text=v=>typeof v==='string'&&v.trim()?v.trim():null;
const VERSION='sporting-legends-overdue-green-route-v1.4-retired-research-only';
const noPlay=(reason,extra={})=>({version:VERSION,decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0,usableForExecution:false,reason,...extra});

export function evaluateSportingLegendsOverdueGreenRoute({
  before,after,nowEpochSeconds,
  exactBetfairSpainTickerImsBindingVerified=false,
  expectedBetfairImsCasino=null,
  betfairFirstBetFollowingDayRuleVerified=false,
  providerGuaranteedHitTimeDefinesFollowingDayBoundaryVerified=false,
  conservativeBaseRtpPct=93.03,stakeEUR=null,
  currentDailyAmountExactVerified=false,stakeAtDecisionExactVerified=false,
  measuredActionLatencySeconds=null,measuredActionLatencyVerified=false,
  frozenActionLatencyCeilingSeconds=null,
  frozenProtocolId=null,dryRunCycles=[],confidence=0.95,
  binomialIidAssumptionJustified=false,completeProspectiveCycleLedgerVerified=false,
  currentCycleExchangeabilityVerified=false,assumptionEvidenceId=null,
  independentRaceLedgerReview=null,
}={}){
  const measured=finite(measuredActionLatencySeconds),ceiling=finite(frozenActionLatencyCeilingSeconds),protocol=text(frozenProtocolId),ims=text(expectedBetfairImsCasino);
  if(measuredActionLatencyVerified!==true||measured===null||!(measured>0))return noPlay('MEASURED_ACTION_LATENCY_NOT_VERIFIED');
  if(!(ceiling>0)||measured>ceiling)return noPlay('MEASURED_LATENCY_EXCEEDS_FROZEN_CEILING',{measuredActionLatencySeconds:measured,frozenActionLatencyCeilingSeconds:ceiling});
  if(!protocol)return noPlay('FROZEN_PROTOCOL_ID_REQUIRED');
  if(!ims)return noPlay('EXPECTED_BETFAIR_IMS_REQUIRED');
  if(!Array.isArray(dryRunCycles)||dryRunCycles.length<1)return noPlay('NO_PROSPECTIVE_DRY_RUN_CYCLES');

  const validated=[];
  for(const [index,cycle] of dryRunCycles.entries()){
    if(!cycle||typeof cycle!=='object')return noPlay('INVALID_DRY_RUN_CYCLE',{cycleIndex:index});
    const v=validateSportingLegendsPassiveRaceCycle({
      cycleId:cycle.cycleId,protocolId:protocol,
      protocolFrozenAtEpochSeconds:cycle.protocolFrozenAtEpochSeconds,
      recordedAtEpochSeconds:cycle.recordedAtEpochSeconds,
      beforeBoundary:cycle.beforeBoundary,detection:cycle.detection,confirmation:cycle.confirmation,
      expectedBetfairImsCasino:ims,exactBetfairSpainTickerImsBindingVerified,
      betfairFirstBetFollowingDayRuleVerified,providerGuaranteedHitTimeDefinesFollowingDayBoundaryVerified,
      actionLatencySeconds:ceiling,
    });
    if(!v.valid||!v.usableForRaceEvidence)return noPlay('INVALID_DRY_RUN_CYCLE',{cycleIndex:index,cycleValidation:v});
    validated.push(v);
  }

  const bound=deriveProspectiveEmpiricalRaceLowerBoundFromValidatedCycles({
    cycles:validated,confidence,protocolId:protocol,actionLatencySeconds:ceiling,prospectiveProtocolFrozen:true,
    binomialIidAssumptionJustified,completeProspectiveCycleLedgerVerified,currentCycleExchangeabilityVerified,assumptionEvidenceId,
  });
  if(!bound.valid)return noPlay('EMPIRICAL_RACE_BOUND_INVALID',{empiricalRaceBound:bound});
  const reviewedBound={...bound,independentReview:independentRaceLedgerReview||null};
  const legacy=evaluateSportingLegendsOverdueFirstBet({
    before,after,nowEpochSeconds,
    exactBetfairSpainTickerImsBindingVerified,expectedBetfairImsCasino:ims,
    betfairFirstBetFollowingDayRuleVerified,providerGuaranteedHitTimeDefinesFollowingDayBoundaryVerified,
    conservativeBaseRtpPct,stakeEUR,raceEvidence:reviewedBound,
    currentDailyAmountExactVerified,stakeAtDecisionExactVerified,
    measuredActionLatencyVerified:true,measuredActionLatencySeconds:measured,
    prospectiveDryRunCycleVerified:true,
  });
  return {
    ...legacy,
    version:VERSION,
    legacyDecision:legacy.decision,
    legacyRealMoneyAllowed:legacy.realMoneyAllowed===true,
    decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0,usableForExecution:false,
    reason:'LEGACY_SPORTING_LEGENDS_GREEN_ROUTE_RETIRED_RESEARCH_ONLY',
    empiricalRaceBound:reviewedBound,validatedDryRunCycles:validated,
    dryRunSummary:{protocolId:protocol,frozenActionLatencyCeilingSeconds:ceiling,measuredActionLatencySeconds:measured,successfulDryRunCycles:bound.successfulDryRunCycles,totalDryRunCycles:bound.totalDryRunCycles,confidence,executionAssumptionsClosed:bound.executionAssumptionsClosed,independentRaceLedgerReviewSupplied:!!independentRaceLedgerReview,legacyIndependentRaceLedgerReviewVerified:legacy.raceLedgerIndependentlyReviewed===true},
    guards:{...(legacy.guards||{}),legacyGreenRouteRetired:true,researchOnly:true,legacyGreenCannotPropagate:true,exactArtifactOperatorSpecificPipelineRequiredForAnyFuturePromotion:true,noWagerProbe:true,noAutomaticWagering:true,realMoneyAllowed:false},
    scientificUse:'Retired compatibility route. It may still reproduce legacy validation and race diagnostics for historical comparison, but any legacy GREEN is captured only as legacyDecision and cannot propagate. Future promotion must use an operator-specific exact-artifact pipeline with current served evidence, frozen prospective denominator and a separately reviewed fresh final adapter.'
  };
}

#!/usr/bin/env node
import fs from 'node:fs';

const LEDGER='loterias-ai/casino/lightning/evidence/economic-readiness-ledger-v1.json';
const OUT='loterias-ai/casino/jackpots/evidence/jackpot-king-mbwb-inference-v1.json';
const SCREEN='loterias-ai/casino/jackpots/evidence/jackpot-king-spain-near-cap-research-v1.json';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const median=a=>{if(!a.length)return null;const x=[...a].sort((m,n)=>m-n),i=Math.floor(x.length/2);return x.length%2?x[i]:(x[i-1]+x[i])/2};
const finitePositive=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v))&&Number(v)>0;

const ledger=read(LEDGER);
const screen=read(SCREEN);
const hz=ledger.jackpotKingHazardProspectiveV1||{};
const resets=(hz.hardResets||[]).filter(r=>finitePositive(r.fromEUR)&&finitePositive(r.toEUR)&&Number(r.fromEUR)>Number(r.toEUR));
const n=resets.length;
const pre=resets.map(r=>Number(r.fromEUR));
const post=resets.map(r=>Number(r.toEUR));
const reserveMedian=median(post);
const maxObservedTrigger=n?Math.max(...pre):null;

let uniformHiddenTriggerResearch=null;
if(n>0&&Number.isFinite(reserveMedian)&&maxObservedTrigger>reserveMedian){
  const span=maxObservedTrigger-reserveMedian;
  const biasCorrectedCap=reserveMedian+((n+1)/n)*span;
  const upper95=reserveMedian+span/Math.pow(0.05,1/n);
  uniformHiddenTriggerResearch={
    hypothesisOnly:true,
    providerConfirmed:false,
    resetSamples:n,
    reserveMedianEUR:reserveMedian,
    maxObservedPreResetEUR:maxObservedTrigger,
    capMLELowerBoundEUR:maxObservedTrigger,
    capBiasCorrectedPointEUR:biasCorrectedCap,
    capOneSided95UpperEUR:upper95,
    formulaNote:'If hidden trigger T is Uniform(S,C), max(T) yields C_MLE=max(T); bias-corrected point is S+(n+1)/n*(max-S); one-sided 95% upper is S+(max-S)/0.05^(1/n). Observation interval censoring is not corrected here.'
  };
}

const monitor=ledger.jackpotKingOfficialMonitor||{};
const latestLiveReadable=monitor.sourceReadable===true&&finitePositive(monitor?.latest?.networkPotEUR);
const currentPot=latestLiveReadable?Number(monitor.latest.networkPotEUR):null;
const validPast=(monitor.observations||[]).filter(o=>o?.corroborated===true&&finitePositive(o.networkPotEUR));
const lastValid=validPast.at(-1)||null;
const lastValidPot=lastValid?Number(lastValid.networkPotEUR):null;
const lastValidObservedAt=lastValid?.observedAt??null;

const vRoyal=screen?.verifiedSpainThresholds?.royalMbwbEUR;
const vRegal=screen?.verifiedSpainThresholds?.regalMbwbEUR;
const exactSpainRoyal=finitePositive(vRoyal)?Number(vRoyal):null;
const exactSpainRegal=finitePositive(vRegal)?Number(vRegal):null;
const ratios=screen?.economicScreen||{};
const capStatus=(cap,pot)=>{
  if(!Number.isFinite(cap)||!Number.isFinite(pot)||cap<=0||pot<=0)return null;
  const frac=pot/cap;
  return {
    capEUR:cap,
    potEUR:pot,
    fractionOfCap:frac,
    percentOfCap:100*frac,
    optimisticAllMeterZone:frac>=Number(ratios?.optimisticIfAll038GoesToTargetPot?.minimumFractionOfCapForBreakEven||Infinity),
    halfMeterZone:frac>=Number(ratios?.ifHalfOf038GoesToTargetPot?.minimumFractionOfCapForBreakEven||Infinity),
    equalThreeWayZone:frac>=Number(ratios?.if038SplitEquallyAcrossThreePots?.minimumFractionOfCapForBreakEven||Infinity)
  };
};

const out={
  version:'jackpot-king-mbwb-inference-v1.2',
  generatedAt:new Date().toISOString(),
  sourceLedger:LEDGER,
  prospectiveFreezeVersion:hz.freezeVersion??null,
  progress:{
    validFutureObservations:Number(hz.progress?.validObservations||0),
    cleanHardResets:n,
    minimumHardResetsBeforeHazardDiscovery:Number(hz.progress?.minimumHardResetsBeforeHazardDiscovery||10),
    minimumIndependentHardResetsBeforeEconomicReplication:Number(hz.progress?.minimumIndependentHardResetsBeforeAnyEconomicReplication||20),
    thresholdInferenceExploratory:n>=3,
    hazardDiscoveryAllowed:n>=Number(hz.progress?.minimumHardResetsBeforeHazardDiscovery||10),
    economicReplicationAllowed:n>=Number(hz.progress?.minimumIndependentHardResetsBeforeAnyEconomicReplication||20)
  },
  cleanResetEvents:resets,
  uniformHiddenTriggerResearch,
  potReadability:{
    currentSourceReadable:latestLiveReadable,
    currentNetworkPotEUR:currentPot,
    lastValidCorroboratedPotEUR:lastValidPot,
    lastValidCorroboratedObservedAt:lastValidObservedAt,
    stalePotNeverPresentedAsCurrent:true
  },
  nearCapScreen:{
    current:{
      royal:capStatus(exactSpainRoyal,currentPot),
      regal:capStatus(exactSpainRegal,currentPot)
    },
    lastValidReference:{
      observedAt:lastValidObservedAt,
      royal:capStatus(exactSpainRoyal,lastValidPot),
      regal:capStatus(exactSpainRegal,lastValidPot),
      historicalReferenceOnly:true
    },
    researchThresholdFractions:{
      optimisticAllMeter:Number(ratios?.optimisticIfAll038GoesToTargetPot?.minimumFractionOfCapForBreakEven||null),
      halfMeter:Number(ratios?.ifHalfOf038GoesToTargetPot?.minimumFractionOfCapForBreakEven||null),
      equalThreeWay:Number(ratios?.if038SplitEquallyAcrossThreePots?.minimumFractionOfCapForBreakEven||null)
    }
  },
  modelAgnostic:{
    exactSpainRoyalMbwbEUR:exactSpainRoyal,
    exactSpainRegalMbwbEUR:exactSpainRegal,
    exactHazardLawKnown:false,
    currentPotToExactWinProbabilityConvertible:false
  },
  decision:{
    nearCapEntryThresholdKnown:Boolean(exactSpainRoyal||exactSpainRegal)&&n>=10,
    positiveEVKnown:false,
    realMoneyAllowed:false,
    reason:!(exactSpainRoyal||exactSpainRegal)?'EXACT_SPAIN_MBWB_NOT_YET_RESOLVED':n<10?'INSUFFICIENT_CLEAN_FUTURE_RESETS':'HAZARD_FORM_NOT_PROVIDER_CONFIRMED'
  },
  guards:{
    futureOnlyEvidence:true,
    legacyResetLabelsExcluded:true,
    uniformModelNeverPromotesAlone:true,
    noCrossMarketThresholdSubstitution:true,
    stalePotNeverPromotes:true,
    noOptionalStopping:true,
    automaticBettingAllowed:false,
    realMoneyAllowed:false,
    realStakeEUR:0
  }
};
ledger.jackpotKingMbwbInferenceV1={
  generatedAt:out.generatedAt,
  progress:out.progress,
  uniformHiddenTriggerResearch:out.uniformHiddenTriggerResearch,
  potReadability:out.potReadability,
  nearCapScreen:out.nearCapScreen,
  decision:out.decision,
  guards:out.guards
};
fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');
fs.writeFileSync(LEDGER,JSON.stringify(ledger,null,2)+'\n');
console.log(JSON.stringify({progress:out.progress,potReadability:out.potReadability,uniformHiddenTriggerResearch:out.uniformHiddenTriggerResearch,nearCapScreen:out.nearCapScreen,decision:out.decision},null,2));

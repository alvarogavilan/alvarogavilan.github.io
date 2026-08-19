#!/usr/bin/env node
import fs from 'node:fs';

const LEDGER='loterias-ai/casino/lightning/evidence/economic-readiness-ledger-v1.json';
const OUT='loterias-ai/casino/jackpots/evidence/jackpot-king-mbwb-inference-v1.json';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const median=a=>{if(!a.length)return null;const x=[...a].sort((m,n)=>m-n),i=Math.floor(x.length/2);return x.length%2?x[i]:(x[i-1]+x[i])/2};

const ledger=read(LEDGER);
const hz=ledger.jackpotKingHazardProspectiveV1||{};
const resets=(hz.hardResets||[]).filter(r=>Number.isFinite(Number(r.fromEUR))&&Number.isFinite(Number(r.toEUR))&&Number(r.fromEUR)>Number(r.toEUR));
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

const out={
  version:'jackpot-king-mbwb-inference-v1',
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
  modelAgnostic:{
    exactSpainRoyalMbwbEUR:null,
    exactSpainRegalMbwbEUR:null,
    exactHazardLawKnown:false,
    currentPotToExactWinProbabilityConvertible:false
  },
  decision:{
    nearCapEntryThresholdKnown:false,
    positiveEVKnown:false,
    realMoneyAllowed:false,
    reason:n<10?'INSUFFICIENT_CLEAN_FUTURE_RESETS':'HAZARD_FORM_NOT_PROVIDER_CONFIRMED'
  },
  guards:{
    futureOnlyEvidence:true,
    legacyResetLabelsExcluded:true,
    uniformModelNeverPromotesAlone:true,
    noOptionalStopping:true,
    automaticBettingAllowed:false,
    realMoneyAllowed:false,
    realStakeEUR:0
  }
};
fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({progress:out.progress,uniformHiddenTriggerResearch:out.uniformHiddenTriggerResearch,decision:out.decision},null,2));

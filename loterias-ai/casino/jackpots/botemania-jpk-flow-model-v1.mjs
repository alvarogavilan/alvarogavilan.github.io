#!/usr/bin/env node
import fs from 'node:fs';

const OBS='loterias-ai/casino/jackpots/evidence/botemania-jackpot-king-observer-v1.json';
const OUT='loterias-ai/casino/jackpots/evidence/botemania-jpk-flow-model-v1.json';
// These rates are verified for the selected Fishin' Frenzy JPK configuration only.
// Other games feeding the shared Botemania Jackpot King network publish different rates,
// so observed aggregate pot growth MUST NOT be divided by 2.32% and called total network stake.
const FISHIN_ACTIVE_CONTRIB=0.0232;
const FISHIN_RESERVE_CONTRIB=0.0068;
const HYPOTHESIS_CAPS={ROYAL:3500,REGAL:35000};
const HYPOTHESIS_SEEDS={ROYAL:500,REGAL:5000};
const j=JSON.parse(fs.readFileSync(OBS,'utf8'));
const obs=(j.observations||[]).filter(o=>o?.labeledPots&&Object.keys(o.labeledPots).length>=3).sort((a,b)=>Date.parse(a.observedAt)-Date.parse(b.observedAt));
const intervals=[];
for(let i=1;i<obs.length;i++){
 const a=obs[i-1],b=obs[i]; const dt=(Date.parse(b.observedAt)-Date.parse(a.observedAt))/1000;
 if(!(dt>0)) continue;
 const d={}; let clean=true,sum=0;
 for(const k of ['JACKPOT_KING','REGAL','ROYAL']){
  const x=Number(a.labeledPots[k]),y=Number(b.labeledPots[k]);
  if(!Number.isFinite(x)||!Number.isFinite(y)){clean=false;break;}
  const delta=y-x; if(delta<0){clean=false;break;} d[k]=delta; sum+=delta;
 }
 if(!clean||sum<=0) continue;
 const fishinEquivalentStake=sum/FISHIN_ACTIVE_CONTRIB;
 intervals.push({
   from:a.observedAt,to:b.observedAt,seconds:dt,
   deltasEUR:Object.fromEntries(Object.entries(d).map(([k,v])=>[k,+v.toFixed(4)])),
   activePotGrowthEUR:+sum.toFixed(4),
   fishinFrenzyStakeEquivalentEUR:+fishinEquivalentStake.toFixed(2),
   fishinFrenzyStakeEquivalentPerMinuteEUR:+(fishinEquivalentStake/(dt/60)).toFixed(2),
   fishinEquivalentReserveGrowthEUR:+(fishinEquivalentStake*FISHIN_RESERVE_CONTRIB).toFixed(4),
   allocationShares:Object.fromEntries(Object.entries(d).map(([k,v])=>[k,+(v/sum).toFixed(6)]))
 });
}
const totalGrowth=intervals.reduce((s,x)=>s+x.activePotGrowthEUR,0);
const totals={JACKPOT_KING:0,REGAL:0,ROYAL:0};for(const x of intervals)for(const k of Object.keys(totals))totals[k]+=x.deltasEUR[k];
const fishinEquivalentTotal=totalGrowth/FISHIN_ACTIVE_CONTRIB;
const allocationShares=Object.fromEntries(Object.entries(totals).map(([k,v])=>[k,totalGrowth?+(v/totalGrowth).toFixed(6):null]));
const latest=obs.at(-1)||null;
const current=latest?.labeledPots||{};
const recent=intervals.slice(-Math.min(12,intervals.length));
const recentSeconds=recent.reduce((s,x)=>s+x.seconds,0);
const recentGrowth=Object.fromEntries(['JACKPOT_KING','REGAL','ROYAL'].map(k=>[k,recent.reduce((s,x)=>s+x.deltasEUR[k],0)]));
const ratePerHour=Object.fromEntries(Object.entries(recentGrowth).map(([k,v])=>[k,recentSeconds?+(v/(recentSeconds/3600)).toFixed(4):null]));
const capScreen={};
for(const k of ['ROYAL','REGAL']){
 const v=Number(current[k]),cap=HYPOTHESIS_CAPS[k],seed=HYPOTHESIS_SEEDS[k],rate=ratePerHour[k];
 capScreen[k]={currentEUR:Number.isFinite(v)?v:null,hypothesisCapEUR:cap,hypothesisSeedEUR:seed,hypothesisOnly:true,pctOfCap:Number.isFinite(v)?+(100*v/cap).toFixed(3):null,pctThroughSeedToCap:Number.isFinite(v)?+(100*(v-seed)/(cap-seed)).toFixed(3):null,remainingToCapEUR:Number.isFinite(v)?+(cap-v).toFixed(2):null,hoursToCapAtRecentNetGrowthNoReset:Number.isFinite(v)&&rate>0?+((cap-v)/rate).toFixed(2):null};
}
const resets=(j.resets||[]).filter(r=>r.cleanLabelMatched);
const hazardReady=resets.length>=10;
const out={
 version:'botemania-jpk-flow-model-v1.1',generatedAt:new Date().toISOString(),source:OBS,operator:'botemania-es',
 method:'MEASURE_SHARED_POT_GROWTH_AND_ALLOCATION;_FISHIN_RATE_USED_ONLY_FOR_FISHIN_EQUIVALENT_NOT_NETWORK_STAKE',
 verifiedInputs:{fishinFrenzyActivePotContributionPct:2.32,fishinFrenzyReserveContributionPct:0.68,stakeProportionalEligibility:true,mixedNetworkContributionRates:true},
 observationsUsed:obs.length,cleanGrowthIntervals:intervals.length,intervals,
 aggregate:{
   activePotGrowthEUR:+totalGrowth.toFixed(4),
   allocationShares,
   fishinFrenzyStakeEquivalentEUR:Number.isFinite(fishinEquivalentTotal)?+fishinEquivalentTotal.toFixed(2):null,
   networkStakeEUR:null,
   networkStakeIdentifiableFromPotGrowthAlone:false,
   note:'Shared network contains JPK titles with different published contribution rates. Fishin-equivalent stake is a normalization only, not observed or inferred total network wagering.'
 },
 latest:{observedAt:latest?.observedAt||null,potsEUR:current,recentRatePerHourEUR:ratePerHour,capScreen},
 hazard:{cleanResets:resets.length,minimumResetsForFit:10,ready:hazardReady,status:hazardReady?'READY_FOR_STATE_DEPENDENT_RESET_FIT':'ACCUMULATING_CLEAN_RESETS',note:'Fit reset occurrence against directly observed pot-state/time and contribution-flow proxies. Do not label aggregate network stake unless game-mix contribution rates become identifiable.'},
 decision:{exactSpainMbwbKnown:false,capHypothesisOnly:true,positiveEvProven:false,realMoneyAllowed:false,automaticBettingAllowed:false},
 corrections:{priorImpliedNetworkStakeFieldWithdrawn:true,reason:'MIXED_GAME_CONTRIBUTION_RATES_IN_SHARED_NETWORK'},
 guards:{noUniformHiddenThresholdAssumption:true,noCrossMarketCapUsedAsFact:true,noMixedRateNetworkStakeInference:true,noBetting:true,realMoneyAllowed:false}
};
fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({observationsUsed:out.observationsUsed,cleanGrowthIntervals:out.cleanGrowthIntervals,aggregate:out.aggregate,latest:out.latest,hazard:out.hazard,decision:out.decision,corrections:out.corrections},null,2));

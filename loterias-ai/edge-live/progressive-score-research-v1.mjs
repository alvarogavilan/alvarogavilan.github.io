#!/usr/bin/env node
import fs from 'node:fs';
import { finiteNumberOrNull } from './number-safety-v1.mjs';
import { dynamicFreshnessForMeter } from './meter-stasis-core-v1.mjs';
import { gateResearchThresholdZone } from './research-threshold-gate-v1.mjs';

const NETWORK='loterias-ai/edge-live/evidence/botemania-all-network-live-state-v1.json';
const REGISTRY='loterias-ai/edge-live/opportunity-registry-v1.json';
const GENERIC_LEDGER='loterias-ai/casino/jackpots/evidence/botemania-generic-fast-reset-ledger-v1.json';
const STASIS='loterias-ai/edge-live/evidence/meter-stasis-ledger-v1.json';
const OUT='loterias-ai/edge-live/evidence/progressive-score-research-v1.json';
const read=p=>{try{return JSON.parse(fs.readFileSync(p,'utf8'));}catch{return null}};
const now=new Date().toISOString();
const network=read(NETWORK)||{};
const registry=read(REGISTRY)||{};
const ledger=read(GENERIC_LEDGER)||{};
const stasis=read(STASIS)||{};

const RESEARCH_SCENARIOS={
  'botemania-diamond-bonanza-25c':{
    name:'DIAMOND_BONANZA_25C_HISTORICAL_COMPONENT_SCENARIO',
    baseRtpExcludingJackpotPct:93.52,
    averageJackpotContributionPct:5.66,
    seedNominal:500,
    averageHitNominal:7309,
    sourceModelCurrency:'GBP',
    liveCurrency:'EUR',
    configurationEquivalentToBotemaniaVerified:false,
    currencyNetworkEquivalentVerified:false,
    nearThresholdWindowNominal:500,
    evidenceNotes:[
      'External Roxor/Gamesys references report 93.52% RTP for Diamond Bonanza.',
      'A current Bally-family rules page reports 95.01% plus 5.66% jackpot contribution for a Diamond Bonanza configuration, but the contribution semantics are not safe to add without an exact definition.',
      'Long-running public jackpot history reports 25p seed 500 and average hit 7309 over 1060 wins.',
      'Botemania publishes 95.44% RTP and three denomination-based progressive pots but does not publish the 5.66% split.',
      'Botemania and Monopoly Casino Spain expose the same exact diamondbonanza25BTM id and amount with matching visible rules, strongly supporting a shared Spanish pool; this still does not prove the historical GBP economic configuration transfers to EUR.',
      'This is therefore prioritisation research only and never wager authorisation.'
    ]
  }
};

const mappings=Array.isArray(registry?.mappings)?registry.mappings:[];
const ledgerEvents=Array.isArray(ledger?.events)?ledger.events:[];
const ageSeconds=t=>{const n=Date.parse(t||'');return Number.isFinite(n)?Math.max(0,Math.floor((Date.now()-n)/1000)):null};
const sourceAgeSeconds=ageSeconds(network?.observedAt);

const rows=[];
for(const m of mappings){
  if(!String(m?.type||'').includes('PROGRESSIVE'))continue;
  const key=`${m.network}:${m.feedId}`;
  const live=network?.currentByKey?.[key]||null;
  const current=finiteNumberOrNull(live?.amountEUR);
  const meter=stasis?.meters?.[key]||null;
  const dynamicFreshness=dynamicFreshnessForMeter(meter,{maxStasisSeconds:1800});
  const scoreModel=m?.economic?.scoreModel||null;
  const seed=finiteNumberOrNull(scoreModel?.seed);
  const averageHit=finiteNumberOrNull(scoreModel?.averageHit);
  const inputsComparable=scoreModel?.inputsComparable===true;
  const denominator=seed!==null&&averageHit!==null?averageHit-seed:null;
  const exactScore=inputsComparable&&current!==null&&seed!==null&&averageHit!==null&&denominator>0
    ?((current-seed)/denominator)*100:null;
  const nominalCrossUnitScore=!inputsComparable&&scoreModel?.allowNominalResearchScore===true&&current!==null&&seed!==null&&averageHit!==null&&denominator>0
    ?((current-seed)/denominator)*100:null;

  const baseExJackpot=finiteNumberOrNull(m?.economic?.baseRtpExcludingJackpotPct);
  const avgContribution=finiteNumberOrNull(m?.economic?.averageJackpotContributionPct);
  const estimatedCurrentRtpPct=exactScore!==null&&baseExJackpot!==null&&avgContribution!==null
    ?baseExJackpot+(exactScore/100)*avgContribution:null;
  const exactEconomicPass=estimatedCurrentRtpPct!==null&&estimatedCurrentRtpPct>100;

  const scenario=RESEARCH_SCENARIOS[m.id]||null;
  let researchScenario=null;
  if(scenario){
    const sSeed=finiteNumberOrNull(scenario.seedNominal);
    const sAvg=finiteNumberOrNull(scenario.averageHitNominal);
    const sDen=sSeed!==null&&sAvg!==null?sAvg-sSeed:null;
    const score=current!==null&&sSeed!==null&&sAvg!==null&&sDen>0?((current-sSeed)/sDen)*100:null;
    const sBase=finiteNumberOrNull(scenario.baseRtpExcludingJackpotPct);
    const sContribution=finiteNumberOrNull(scenario.averageJackpotContributionPct);
    const breakEvenScore=sBase!==null&&sContribution!==null&&sContribution>0?((100-sBase)/sContribution)*100:null;
    const breakEvenNominal=breakEvenScore!==null&&sDen>0?sSeed+sDen*(breakEvenScore/100):null;
    const estimatedRtp=score!==null&&sBase!==null&&sContribution!==null?sBase+(score/100)*sContribution:null;
    const distance=current!==null&&breakEvenNominal!==null?breakEvenNominal-current:null;
    const nearWindow=finiteNumberOrNull(scenario.nearThresholdWindowNominal)??500;
    const nominalZone=distance!==null?(distance<=0?'ABOVE_RESEARCH_THRESHOLD':distance<=nearWindow?'NEAR_RESEARCH_THRESHOLD':'BELOW_RESEARCH_THRESHOLD'):'NO_LIVE_VALUE';
    const thresholdGate=gateResearchThresholdZone({
      nominalZone,
      dynamicFreshnessVerified:dynamicFreshness.verified===true,
      configurationEquivalentVerified:scenario.configurationEquivalentToBotemaniaVerified===true,
      currencyNetworkEquivalentVerified:scenario.currencyNetworkEquivalentVerified===true,
    });
    researchScenario={
      name:scenario.name,
      zone:thresholdGate.zone,
      nominalZone:thresholdGate.nominalZone,
      nominalNearOrAbove:thresholdGate.nominalNearOrAbove,
      operationalThresholdComparable:thresholdGate.operationalThresholdComparable,
      countsAsNearOrAboveResearchThreshold:thresholdGate.countsAsNearOrAboveResearchThreshold,
      stateDynamicallyVerified:dynamicFreshness.verified===true,
      currentNominal:current!==null?+current.toFixed(6):null,
      score:score!==null?+score.toFixed(3):null,
      estimatedRtpPct:estimatedRtp!==null?+estimatedRtp.toFixed(4):null,
      breakEvenScore:breakEvenScore!==null?+breakEvenScore.toFixed(3):null,
      breakEvenJackpotNominal:breakEvenNominal!==null?+breakEvenNominal.toFixed(2):null,
      distanceToResearchThresholdNominal:distance!==null?+distance.toFixed(2):null,
      baseRtpExcludingJackpotPct:sBase,
      averageJackpotContributionPct:sContribution,
      seedNominal:sSeed,
      averageHitNominal:sAvg,
      sourceModelCurrency:scenario.sourceModelCurrency,
      liveCurrency:scenario.liveCurrency,
      configurationEquivalentToBotemaniaVerified:scenario.configurationEquivalentToBotemaniaVerified===true,
      currencyNetworkEquivalentVerified:scenario.currencyNetworkEquivalentVerified===true,
      executionPromotionAllowed:false,
      evidenceNotes:scenario.evidenceNotes,
      safety:'RESEARCH_ONLY_NEVER_GREEN'
    };
  }

  const exactIdDropCandidates=ledgerEvents.filter(e=>(e?.network||'generic')===m?.network&&String(e?.id||'')===String(m?.feedId||'')&&e?.identityClass==='EXACT_NETWORK_PLUS_UNIQUE_ID');
  const confirmedLocalResets=exactIdDropCandidates.filter(e=>e?.classification==='CONFIRMED_RESET');
  const externalReferenceScore=finiteNumberOrNull(scoreModel?.externalReference?.score);
  const scenarioNominalNear=researchScenario?.nominalZone==='ABOVE_RESEARCH_THRESHOLD'||researchScenario?.nominalZone==='NEAR_RESEARCH_THRESHOLD';
  const researchPriority=exactEconomicPass?1000:exactScore!==null?exactScore:researchScenario?.operationalThresholdComparable&&researchScenario?.nominalZone==='ABOVE_RESEARCH_THRESHOLD'?900:researchScenario?.operationalThresholdComparable&&researchScenario?.nominalZone==='NEAR_RESEARCH_THRESHOLD'?500:scenarioNominalNear?75:nominalCrossUnitScore!==null?Math.min(nominalCrossUnitScore,50):externalReferenceScore!==null?Math.min(externalReferenceScore,50):0;
  const publishedRtp=finiteNumberOrNull(m?.economic?.publishedRtpPct);
  const executionPromotionAllowed=exactEconomicPass&&m?.identity?.verified===true&&m?.execution?.exactStakeKnown===true&&m?.execution?.strategyVerified===true&&dynamicFreshness.verified===true;

  rows.push({
    id:m.id,game:m.game,type:m.type,monitor:{network:m.network,feedId:m.feedId,key},
    current:{amountEUR:current,observedAt:network?.observedAt||null,sourceAgeSeconds,dynamicFreshnessVerified:dynamicFreshness.verified,dynamicFreshnessReason:dynamicFreshness.reason,stasisSeconds:dynamicFreshness.stasisSeconds??meter?.stasisSeconds??null,lastChangedAt:meter?.lastChangedAt||null,observationCount:meter?.observationCount||0,changeCount:meter?.changeCount||0},
    identity:{verified:m?.identity?.verified===true,confidence:m?.identity?.confidence||null,evidenceClass:m?.identity?.evidenceClass||null},
    score:{exactScore:exactScore!==null?+exactScore.toFixed(3):null,nominalCrossUnitResearchScore:nominalCrossUnitScore!==null?+nominalCrossUnitScore.toFixed(3):null,inputsComparable,formula:'(jackpot-seed)/(averageHit-seed)*100',seed,averageHit,modelCurrency:scoreModel?.currency||null,liveCurrency:scoreModel?.liveCurrency||'EUR',externalReference:scoreModel?.externalReference||null,localExactIdDropCandidates:exactIdDropCandidates.length,localConfirmedResetEvents:confirmedLocalResets.length,localExactIdResetEvents:confirmedLocalResets.length,localCleanResetEvents:confirmedLocalResets.length},
    researchScenario,
    economic:{publishedRtpPct:publishedRtp,publishedRtpRangePct:Array.isArray(m?.economic?.publishedRtpRangePct)?m.economic.publishedRtpRangePct:null,exactVariantRtpVerified:m?.economic?.exactVariantRtpVerified===true,baseRtpExcludingJackpotPct:baseExJackpot,averageJackpotContributionPct:avgContribution,estimatedCurrentRtpPct:estimatedCurrentRtpPct!==null?+estimatedCurrentRtpPct.toFixed(4):null,exactEconomicPass,executionPromotionAllowed},
    researchPriorityScore:+researchPriority.toFixed(3),
    blockers:[...(live?[]:['LIVE_COUNTER_NOT_FOUND']),...(m?.identity?.verified===true?[]:['COUNTER_IDENTITY_NOT_FULLY_VERIFIED']),...(dynamicFreshness.verified?[]:['DYNAMIC_METER_FRESHNESS_NOT_VERIFIED']),...(inputsComparable?[]:['SCORE_INPUT_UNITS_NOT_COMPARABLE']),...(baseExJackpot!==null&&avgContribution!==null?[]:['RTP_COMPONENTS_NOT_VERIFIED']),...(researchScenario?.operationalThresholdComparable?[]:researchScenario?['RESEARCH_SCENARIO_CONFIGURATION_OR_STATE_NOT_VERIFIED']:[]),...(m?.execution?.exactStakeKnown===true?[]:['EXACT_STAKE_NOT_VERIFIED']),...(m?.execution?.strategyVerified===true?[]:['EXECUTION_STRATEGY_NOT_VERIFIED'])]
  });
}

rows.sort((a,b)=>b.researchPriorityScore-a.researchPriorityScore);
const nearResearch=rows.filter(x=>x?.researchScenario?.countsAsNearOrAboveResearchThreshold===true);
const out={version:'progressive-score-research-v1.4-operational-research-zone-gate',generatedAt:now,operator:'botemania-es',sourceObservedAt:network?.observedAt||null,sourceAgeSeconds,methodology:{scoreFormula:'(Jackpot-Seed)/(AverageHit-Seed)*100',interpretation:'SCORE 100 means current growth equals historical average growth before a hit. SCORE alone is not total RTP.',exactRtpFormula:'baseRtpExcludingJackpotPct + (SCORE/100)*averageJackpotContributionPct',dynamicFreshnessRule:'HTTP/sample freshness and dynamic-meter freshness are separate. No recent observed movement does not prove stale data, but execution remains blocked until dynamic freshness is positively verified.',researchScenarioRule:'A nominal cross-network/cross-currency threshold may remain visible as a comparator, but it is not counted as near/above until dynamic state, configuration equivalence and currency/network equivalence are all positively verified.',safety:'Cross-currency/cross-network historical inputs are research-only and cannot authorize wagering.'},rows,summary:{trackedProgressiveMappings:rows.length,exactScoreRows:rows.filter(x=>x?.score?.exactScore!==null).length,exactEconomicPositiveRows:rows.filter(x=>x?.economic?.exactEconomicPass===true).length,executionPromotableRows:rows.filter(x=>x?.economic?.executionPromotionAllowed===true).length,dynamicallyFreshRows:rows.filter(x=>x?.current?.dynamicFreshnessVerified===true).length,nominalNearOrAboveComparatorRows:rows.filter(x=>x?.researchScenario?.nominalNearOrAbove===true).length,nearOrAboveResearchThresholdRows:nearResearch.length},nearResearchThreshold:nearResearch.map(x=>({id:x.id,game:x.game?.name||null,zone:x.researchScenario.nominalZone,currentNominal:x.researchScenario.currentNominal,breakEvenJackpotNominal:x.researchScenario.breakEvenJackpotNominal,distanceNominal:x.researchScenario.distanceToResearchThresholdNominal,estimatedRtpPct:x.researchScenario.estimatedRtpPct,operationalThresholdComparable:true,executionPromotionAllowed:false})),guards:{nullNeverCoercedToZero:true,stableExactIdEventsOnly:true,identityClassDoesNotEqualConfirmedReset:true,httpFreshnessDoesNotEqualDynamicFreshness:true,dynamicFreshnessRequiredForExecution:true,noAutomaticBetting:true,noCrossCurrencyScoreForExecution:true,noScoreAloneAsEvProof:true,noExternalHistoricalAverageAsSpanishThreshold:true,unverifiedNominalNearDoesNotCountAsOperationalNear:true,researchScenarioNeverPromotesToGreen:true,finalExecutionGateStillRequired:true,realMoneyAllowed:false}};
fs.mkdirSync('loterias-ai/edge-live/evidence',{recursive:true});
fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({summary:out.summary,diamond:rows.find(x=>x.monitor.key==='generic:diamondbonanza25BTM')||null,wagerBet:rows.find(x=>x.monitor.key==='generic:WAGER_BET')||null,nearResearchThreshold:out.nearResearchThreshold},null,2));

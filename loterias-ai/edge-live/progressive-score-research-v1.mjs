#!/usr/bin/env node
import fs from 'node:fs';

const NETWORK='loterias-ai/edge-live/evidence/botemania-all-network-live-state-v1.json';
const REGISTRY='loterias-ai/edge-live/opportunity-registry-v1.json';
const GENERIC_LEDGER='loterias-ai/casino/jackpots/evidence/botemania-generic-fast-reset-ledger-v1.json';
const OUT='loterias-ai/edge-live/evidence/progressive-score-research-v1.json';
const read=p=>{try{return JSON.parse(fs.readFileSync(p,'utf8'));}catch{return null}};
const now=new Date().toISOString();
const network=read(NETWORK)||{};
const registry=read(REGISTRY)||{};
const ledger=read(GENERIC_LEDGER)||{};

const RESEARCH_SCENARIOS={
  'botemania-diamond-bonanza-25c':{
    name:'DIAMOND_BONANZA_25C_HISTORICAL_COMPONENT_SCENARIO',
    baseRtpExcludingJackpotPct:93.52,
    averageJackpotContributionPct:5.66,
    seedNominal:500,
    averageHitNominal:7309,
    sourceModelCurrency:'GBP',
    liveCurrency:'EUR',
    nearThresholdWindowNominal:500,
    evidenceNotes:[
      'External Roxor/Gamesys references report 93.52% RTP for Diamond Bonanza.',
      'A current Bally-family rules page reports 95.01% plus 5.66% jackpot contribution for a Diamond Bonanza configuration.',
      'Long-running public jackpot history reports 25p seed 500 and average hit 7309 over 1060 wins.',
      'Botemania publishes 95.44% RTP and three denomination-based progressive pots but does not publish the 5.66% split.',
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
  const current=Number(live?.amountEUR);
  const scoreModel=m?.economic?.scoreModel||null;
  const seed=Number(scoreModel?.seed);
  const averageHit=Number(scoreModel?.averageHit);
  const inputsComparable=scoreModel?.inputsComparable===true;
  const denominator=averageHit-seed;
  const exactScore=inputsComparable&&Number.isFinite(current)&&Number.isFinite(seed)&&Number.isFinite(averageHit)&&denominator>0
    ?((current-seed)/denominator)*100:null;
  const nominalCrossUnitScore=!inputsComparable&&scoreModel?.allowNominalResearchScore===true&&Number.isFinite(current)&&Number.isFinite(seed)&&Number.isFinite(averageHit)&&denominator>0
    ?((current-seed)/denominator)*100:null;

  const baseExJackpot=Number(m?.economic?.baseRtpExcludingJackpotPct);
  const avgContribution=Number(m?.economic?.averageJackpotContributionPct);
  const estimatedCurrentRtpPct=Number.isFinite(exactScore)&&Number.isFinite(baseExJackpot)&&Number.isFinite(avgContribution)
    ?baseExJackpot+(exactScore/100)*avgContribution:null;
  const exactEconomicPass=Number.isFinite(estimatedCurrentRtpPct)&&estimatedCurrentRtpPct>100;

  const scenario=RESEARCH_SCENARIOS[m.id]||null;
  let researchScenario=null;
  if(scenario){
    const sSeed=Number(scenario.seedNominal),sAvg=Number(scenario.averageHitNominal),sDen=sAvg-sSeed;
    const score=Number.isFinite(current)&&Number.isFinite(sSeed)&&Number.isFinite(sAvg)&&sDen>0?((current-sSeed)/sDen)*100:null;
    const sBase=Number(scenario.baseRtpExcludingJackpotPct),sContribution=Number(scenario.averageJackpotContributionPct);
    const breakEvenScore=Number.isFinite(sBase)&&Number.isFinite(sContribution)&&sContribution>0?((100-sBase)/sContribution)*100:null;
    const breakEvenNominal=Number.isFinite(breakEvenScore)&&sDen>0?sSeed+sDen*(breakEvenScore/100):null;
    const estimatedRtp=Number.isFinite(score)&&Number.isFinite(sBase)&&Number.isFinite(sContribution)?sBase+(score/100)*sContribution:null;
    const distance=Number.isFinite(current)&&Number.isFinite(breakEvenNominal)?breakEvenNominal-current:null;
    const nearWindow=Number(scenario.nearThresholdWindowNominal)||500;
    const zone=Number.isFinite(distance)?(distance<=0?'ABOVE_RESEARCH_THRESHOLD':distance<=nearWindow?'NEAR_RESEARCH_THRESHOLD':'BELOW_RESEARCH_THRESHOLD'):'NO_LIVE_VALUE';
    researchScenario={
      name:scenario.name,
      zone,
      currentNominal:Number.isFinite(current)?+current.toFixed(6):null,
      score:Number.isFinite(score)?+score.toFixed(3):null,
      estimatedRtpPct:Number.isFinite(estimatedRtp)?+estimatedRtp.toFixed(4):null,
      breakEvenScore:Number.isFinite(breakEvenScore)?+breakEvenScore.toFixed(3):null,
      breakEvenJackpotNominal:Number.isFinite(breakEvenNominal)?+breakEvenNominal.toFixed(2):null,
      distanceToResearchThresholdNominal:Number.isFinite(distance)?+distance.toFixed(2):null,
      baseRtpExcludingJackpotPct:sBase,
      averageJackpotContributionPct:sContribution,
      seedNominal:sSeed,
      averageHitNominal:sAvg,
      sourceModelCurrency:scenario.sourceModelCurrency,
      liveCurrency:scenario.liveCurrency,
      configurationEquivalentToBotemaniaVerified:false,
      currencyNetworkEquivalentVerified:false,
      executionPromotionAllowed:false,
      evidenceNotes:scenario.evidenceNotes,
      safety:'RESEARCH_ONLY_NEVER_GREEN'
    };
  }

  const exactIdEvents=ledgerEvents.filter(e=>String(e?.id||'')===String(m?.feedId||''));
  const cleanLocalResets=exactIdEvents.filter(e=>e?.classification==='CONFIRMED_RESET'||e?.identityClass==='EXACT_NETWORK_PLUS_UNIQUE_ID');
  const externalReferenceScore=Number(scoreModel?.externalReference?.score);
  const researchPriority=(
    researchScenario?.zone==='ABOVE_RESEARCH_THRESHOLD'?900:
    researchScenario?.zone==='NEAR_RESEARCH_THRESHOLD'?500:
    exactEconomicPass?1000:
    Number.isFinite(exactScore)?exactScore:
    Number.isFinite(nominalCrossUnitScore)?Math.min(nominalCrossUnitScore,300):
    Number.isFinite(externalReferenceScore)?externalReferenceScore:0
  );

  rows.push({
    id:m.id,
    game:m.game,
    type:m.type,
    monitor:{network:m.network,feedId:m.feedId,key},
    current:{amountEUR:Number.isFinite(current)?current:null,observedAt:network?.observedAt||null,sourceAgeSeconds},
    identity:{verified:m?.identity?.verified===true,confidence:m?.identity?.confidence||null,evidenceClass:m?.identity?.evidenceClass||null},
    score:{
      exactScore:Number.isFinite(exactScore)?+exactScore.toFixed(3):null,
      nominalCrossUnitResearchScore:Number.isFinite(nominalCrossUnitScore)?+nominalCrossUnitScore.toFixed(3):null,
      inputsComparable,
      formula:'(jackpot-seed)/(averageHit-seed)*100',
      seed:Number.isFinite(seed)?seed:null,
      averageHit:Number.isFinite(averageHit)?averageHit:null,
      modelCurrency:scoreModel?.currency||null,
      liveCurrency:scoreModel?.liveCurrency||'EUR',
      externalReference:scoreModel?.externalReference||null,
      localExactIdResetEvents:exactIdEvents.length,
      localCleanResetEvents:cleanLocalResets.length
    },
    researchScenario,
    economic:{
      publishedRtpPct:Number(m?.economic?.publishedRtpPct||m?.economic?.publishedBaseRtpPctApprox)||null,
      baseRtpExcludingJackpotPct:Number.isFinite(baseExJackpot)?baseExJackpot:null,
      averageJackpotContributionPct:Number.isFinite(avgContribution)?avgContribution:null,
      estimatedCurrentRtpPct:Number.isFinite(estimatedCurrentRtpPct)?+estimatedCurrentRtpPct.toFixed(4):null,
      exactEconomicPass,
      executionPromotionAllowed:exactEconomicPass&&m?.identity?.verified===true&&m?.execution?.exactStakeKnown===true&&m?.execution?.strategyVerified===true
    },
    researchPriorityScore:+researchPriority.toFixed(3),
    blockers:[
      ...(live?[]:['LIVE_COUNTER_NOT_FOUND']),
      ...(m?.identity?.verified===true?[]:['COUNTER_IDENTITY_NOT_FULLY_VERIFIED']),
      ...(inputsComparable?[]:['SCORE_INPUT_UNITS_NOT_COMPARABLE']),
      ...(Number.isFinite(baseExJackpot)&&Number.isFinite(avgContribution)?[]:['RTP_COMPONENTS_NOT_VERIFIED']),
      ...(researchScenario?['RESEARCH_SCENARIO_CONFIGURATION_NOT_VERIFIED']:[]),
      ...(m?.execution?.exactStakeKnown===true?[]:['EXACT_STAKE_NOT_VERIFIED']),
      ...(m?.execution?.strategyVerified===true?[]:['EXECUTION_STRATEGY_NOT_VERIFIED'])
    ]
  });
}

rows.sort((a,b)=>b.researchPriorityScore-a.researchPriorityScore);
const nearResearch=rows.filter(x=>['NEAR_RESEARCH_THRESHOLD','ABOVE_RESEARCH_THRESHOLD'].includes(x?.researchScenario?.zone));
const out={
  version:'progressive-score-research-v1.1-near-edge',
  generatedAt:now,
  operator:'botemania-es',
  sourceObservedAt:network?.observedAt||null,
  sourceAgeSeconds,
  methodology:{
    scoreFormula:'(Jackpot-Seed)/(AverageHit-Seed)*100',
    interpretation:'SCORE 100 means current growth equals historical average growth before a hit. SCORE alone is not total RTP.',
    exactRtpFormula:'baseRtpExcludingJackpotPct + (SCORE/100)*averageJackpotContributionPct',
    researchScenarioRule:'Cross-network/cross-currency scenarios may rank and accelerate investigation but can never authorize wagering.',
    safety:'Cross-currency/cross-network historical inputs are research-only and cannot authorize wagering.'
  },
  rows,
  summary:{
    trackedProgressiveMappings:rows.length,
    exactScoreRows:rows.filter(x=>Number.isFinite(x?.score?.exactScore)).length,
    exactEconomicPositiveRows:rows.filter(x=>x?.economic?.exactEconomicPass===true).length,
    executionPromotableRows:rows.filter(x=>x?.economic?.executionPromotionAllowed===true).length,
    nearOrAboveResearchThresholdRows:nearResearch.length
  },
  nearResearchThreshold:nearResearch.map(x=>({id:x.id,game:x.game?.name||null,zone:x.researchScenario.zone,currentNominal:x.researchScenario.currentNominal,breakEvenJackpotNominal:x.researchScenario.breakEvenJackpotNominal,distanceNominal:x.researchScenario.distanceToResearchThresholdNominal,estimatedRtpPct:x.researchScenario.estimatedRtpPct,executionPromotionAllowed:false})),
  guards:{
    noAutomaticBetting:true,
    noCrossCurrencyScoreForExecution:true,
    noScoreAloneAsEvProof:true,
    noExternalHistoricalAverageAsSpanishThreshold:true,
    researchScenarioNeverPromotesToGreen:true,
    finalExecutionGateStillRequired:true,
    realMoneyAllowed:false
  }
};
fs.mkdirSync('loterias-ai/edge-live/evidence',{recursive:true});
fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({summary:out.summary,nearResearchThreshold:out.nearResearchThreshold,top:rows.slice(0,10).map(x=>({id:x.id,current:x.current.amountEUR,score:x.score,researchScenario:x.researchScenario,researchPriorityScore:x.researchPriorityScore,blockers:x.blockers}))},null,2));

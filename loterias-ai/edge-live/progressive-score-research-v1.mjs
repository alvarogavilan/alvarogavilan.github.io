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

  const exactIdEvents=ledgerEvents.filter(e=>String(e?.id||'')===String(m?.feedId||''));
  const cleanLocalResets=exactIdEvents.filter(e=>e?.classification==='CONFIRMED_RESET'||e?.identityClass==='EXACT_NETWORK_PLUS_UNIQUE_ID');
  const externalReferenceScore=Number(scoreModel?.externalReference?.score);
  const researchPriority=(
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
      ...(m?.execution?.exactStakeKnown===true?[]:['EXACT_STAKE_NOT_VERIFIED']),
      ...(m?.execution?.strategyVerified===true?[]:['EXECUTION_STRATEGY_NOT_VERIFIED'])
    ]
  });
}

rows.sort((a,b)=>b.researchPriorityScore-a.researchPriorityScore);
const out={
  version:'progressive-score-research-v1',
  generatedAt:now,
  operator:'botemania-es',
  sourceObservedAt:network?.observedAt||null,
  sourceAgeSeconds,
  methodology:{
    scoreFormula:'(Jackpot-Seed)/(AverageHit-Seed)*100',
    interpretation:'SCORE 100 means current growth equals historical average growth before a hit. SCORE alone is not total RTP.',
    exactRtpFormula:'baseRtpExcludingJackpotPct + (SCORE/100)*averageJackpotContributionPct',
    safety:'Cross-currency/cross-network historical inputs are research-only and cannot authorize wagering.'
  },
  rows,
  summary:{trackedProgressiveMappings:rows.length,exactScoreRows:rows.filter(x=>Number.isFinite(x?.score?.exactScore)).length,exactEconomicPositiveRows:rows.filter(x=>x?.economic?.exactEconomicPass===true).length,executionPromotableRows:rows.filter(x=>x?.economic?.executionPromotionAllowed===true).length},
  guards:{noAutomaticBetting:true,noCrossCurrencyScoreForExecution:true,noScoreAloneAsEvProof:true,noExternalHistoricalAverageAsSpanishThreshold:true,finalExecutionGateStillRequired:true,realMoneyAllowed:false}
};
fs.mkdirSync('loterias-ai/edge-live/evidence',{recursive:true});
fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({summary:out.summary,top:rows.slice(0,10).map(x=>({id:x.id,current:x.current.amountEUR,score:x.score,researchPriorityScore:x.researchPriorityScore,blockers:x.blockers}))},null,2));

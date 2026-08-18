#!/usr/bin/env node
import fs from 'node:fs';

const ROOT='loterias-ai/casino/lightning/evidence';
const MASTER='loterias-ai/data/shadow/prospective-master-scoreboard.json';
const OUT=`${ROOT}/economic-readiness-ledger-v1.json`;

const read=p=>{try{return JSON.parse(fs.readFileSync(p,'utf8'));}catch{return null;}};
const timing=read(`${ROOT}/timing-replication-v3-status.json`)||{};
const physical=read(`${ROOT}/physical-rng-prospective-v2-status.json`)||{};
const selector=read(`${ROOT}/economic-number-selection-prospective-status-v2.json`)||{};
const lag8=read(`${ROOT}/prospective-lag8-clean-v2-status-v1.json`)||{};
const legacyTiming=read(`${ROOT}/economic-multiplier-window-prospective-status-v1.json`)||{};
const master=read(MASTER)||{};

const pct=(used,total)=>total>0?Number((100*Number(used||0)/Number(total)).toFixed(2)):0;
const lane=(id,label,used,total,status,extra={})=>({
  id,label,status,
  progress:{used:Number(used||0),boundary:Number(total||0),percent:pct(used,total),remaining:Math.max(0,Number(total||0)-Number(used||0))},
  ...extra
});

const lanes=[
  lane('clean-timing-v3','Lightning timing replication — clean V2',timing?.progress?.closedEpisodes,timing?.progress?.fixedBoundaryClosedEpisodes,'BLINDED_ACCUMULATING',{
    disclosure:timing?.disclosure?.policy||null,
    outcomePerformanceVisible:timing?.disclosure?.performanceHidden!==true,
    realMoneyAllowed:timing?.guards?.realMoneyAllowed===true
  }),
  lane('clean-lag8-economic-v1','Lightning lag-8 conservative economic replication',lag8?.progress?.comparisonsUsed,lag8?.progress?.fixedBoundaryComparisons,'BLINDED_ACCUMULATING',{
    disclosure:lag8?.disclosure?.policy||null,
    outcomePerformanceVisible:lag8?.disclosure?.performanceHidden!==true,
    conservativeEconomicModel:true,
    luckyMultiplierUpliftExcluded:true,
    realMoneyAllowed:lag8?.guards?.realMoneyAllowed===true
  }),
  lane('physical-rng-v2','Lightning physical RNG prospective — clean V2',physical?.progress?.roundsUsedForV2,physical?.progress?.fixedBoundaryRounds,'BLINDED_ACCUMULATING',{
    disclosure:physical?.disclosure?.policy||null,
    outcomePerformanceVisible:physical?.disclosure?.observedStatisticsHidden!==true,
    realMoneyAllowed:physical?.guards?.realMoneyAllowed===true
  }),
  lane('number-selection-v2','Lightning economic number selection — clean V2 Phase A',selector?.progress?.eligibleFutureRounds,selector?.progress?.phaseARoundsRequired,'BLINDED_ACCUMULATING',{
    disclosure:selector?.disclosure?.reason||null,
    outcomePerformanceVisible:selector?.disclosure?.candidatePerformanceHidden!==true,
    frozenCandidates:Number(selector?.frozenFamily?.totalCandidates||0),
    realMoneyAllowed:selector?.guards?.realMoneyAllowed===true
  })
].sort((a,b)=>b.progress.percent-a.progress.percent);

const legacyDirectional={
  lane:'economic-multiplier-window-prospective-v1',
  status:legacyTiming?.status||null,
  closedEpisodes:Number(legacyTiming?.closedEpisodes||0),
  successRate:legacyTiming?.successRate??null,
  frozenNullPrimary:legacyTiming?.frozenNull?.primary??null,
  absoluteLiftVsPrimary:legacyTiming?.liftVsPrimary??null,
  relativeLiftVsPrimary:legacyTiming?.relativeLiftVsPrimary??null,
  promotable:false,
  reason:'Legacy directional evidence only; clean V2 replication is the promotion lane.'
};

const traditionalLottery={
  trackedProspectiveArtifacts:Number(master?.counts?.total||0),
  evaluated:Number(master?.counts?.evaluated||0),
  realMoneyPasses:Number(master?.counts?.realMoneyPass||0),
  status:Number(master?.counts?.realMoneyPass||0)>0?'PROMOTION_CANDIDATE_PRESENT':'NO_VALIDATED_ECONOMIC_EDGE_YET'
};

const payload={
  version:'economic-readiness-ledger-v1',
  generatedAt:new Date().toISOString(),
  mission:'Identify reproducible positive expected value without future-information leakage or optional stopping.',
  strongestCurrentLead:'LIGHTNING_CLEAN_TIMING_REPLICATION',
  closestBlindBoundary:lanes[0]||null,
  lanes,
  legacyDirectional,
  traditionalLottery,
  promotionPolicy:{
    progressIsNotEvidence:true,
    hiddenPerformanceMustRemainHidden:true,
    fixedBoundariesRequired:true,
    positiveEconomicsAndScientificGateRequired:true,
    realMoneyRequiresSeparateExplicitAuthorization:true
  },
  realMoneyAllowed:false,
  realStakeEUR:0
};

fs.writeFileSync(OUT,JSON.stringify(payload,null,2)+'\n');
console.log(JSON.stringify(payload,null,2));

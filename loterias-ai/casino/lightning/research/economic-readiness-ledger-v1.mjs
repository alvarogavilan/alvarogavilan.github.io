#!/usr/bin/env node
import fs from 'node:fs';

const ROOT='loterias-ai/casino/lightning/evidence';
const MASTER='loterias-ai/data/shadow/prospective-master-scoreboard.json';
const V315='loterias-ai/data/research/metapleno-v315-prospective-status.json';
const PF4='loterias-ai/data/research/primitiva-frequency4-prospective-status.json';
const PF4_FINAL='loterias-ai/data/research/primitiva-frequency4-prospective-final-50.json';
const QLEDGER='loterias-ai/data/shadow/quinigol-ledger.json';
const QFINAL='loterias-ai/data/shadow/quinigol-prospective-final-30.json';
const QHIST='loterias-ai/data/backtests/quinigol-official-financial-tournament.json';
const OUT=`${ROOT}/economic-readiness-ledger-v1.json`;

const read=p=>{try{return JSON.parse(fs.readFileSync(p,'utf8'));}catch{return null;}};
const timing=read(`${ROOT}/timing-replication-v3-status.json`)||{};
const physical=read(`${ROOT}/physical-rng-prospective-v2-status.json`)||{};
const selector=read(`${ROOT}/economic-number-selection-prospective-status-v2.json`)||{};
const lag8=read(`${ROOT}/prospective-lag8-clean-v2-status-v1.json`)||{};
const lagFamily=read(`${ROOT}/prospective-lag-family-clean-v2-status-v1.json`)||{};
const pastLucky=read(`${ROOT}/prospective-past-lucky-family-clean-v2-status-v1.json`)||{};
const legacyTiming=read(`${ROOT}/economic-multiplier-window-prospective-status-v1.json`)||{};
const master=read(MASTER)||{},v315=read(V315)||{},pf4=read(PF4)||{},pf4Final=read(PF4_FINAL)||{},q=read(QLEDGER)||{},qFinal=read(QFINAL)||{},qHist=read(QHIST)||{};

const pct=(used,total)=>total>0?Number((100*Number(used||0)/Number(total)).toFixed(2)):0;
const lane=(id,label,used,total,status,extra={})=>({id,label,status,progress:{used:Number(used||0),boundary:Number(total||0),percent:pct(used,total),remaining:Math.max(0,Number(total||0)-Number(used||0))},...extra});

const lanes=[
  lane('clean-timing-v3','Lightning timing replication — clean V2',timing?.progress?.closedEpisodes,timing?.progress?.fixedBoundaryClosedEpisodes,'BLINDED_ACCUMULATING',{disclosure:timing?.disclosure?.policy||null,outcomePerformanceVisible:timing?.disclosure?.performanceHidden!==true,realMoneyAllowed:false}),
  lane('physical-rng-v2','Lightning physical RNG prospective — clean V2',physical?.progress?.roundsUsedForV2,physical?.progress?.fixedBoundaryRounds,'BLINDED_ACCUMULATING',{disclosure:physical?.disclosure?.policy||null,outcomePerformanceVisible:physical?.disclosure?.observedStatisticsHidden!==true,realMoneyAllowed:false}),
  lane('number-selection-v2','Lightning economic number selection — clean V2 Phase A',selector?.progress?.eligibleFutureRounds,selector?.progress?.phaseARoundsRequired,'BLINDED_ACCUMULATING',{disclosure:selector?.disclosure?.reason||null,outcomePerformanceVisible:selector?.disclosure?.candidatePerformanceHidden!==true,frozenCandidates:Number(selector?.frozenFamily?.totalCandidates||0),realMoneyAllowed:false}),
  lane('clean-lag8-economic-v1','Lightning lag-8 conservative economic replication',lag8?.progress?.comparisonsUsed,lag8?.progress?.fixedBoundaryComparisons,'BLINDED_ACCUMULATING',{disclosure:lag8?.disclosure?.policy||null,outcomePerformanceVisible:lag8?.disclosure?.performanceHidden!==true,conservativeEconomicModel:true,luckyMultiplierUpliftExcluded:true,realMoneyAllowed:false}),
  lane('quinigol-shadow-v3','Quinigol window320 / 2 tickets — fixed 30-jornada economic shadow',q?.summary?.observedJornadas,q?.summary?.requiredNewJornadas,'BLINDED_ACCUMULATING',{sealedPendingPredictions:Number(q?.summary?.sealedPendingPredictions||0),performanceHidden:q?.summary?.performanceHidden!==false,historicalContext:{holdoutDraws:Number(qHist?.holdout?.draws||0),holdoutROI:qHist?.holdout?.roi??null,holdoutPL:qHist?.holdout?.pl??null,randomAverageROI:qHist?.randomBaseline?.averageROI??null,beatAll100Random:qHist?.gates?.beatAll100Random===true,fullHistoricalGatePassed:qHist?.realMoneyPass===true,contextOnly:true},fixedFinalEconomicPromotionCandidate:qFinal?.gates?.economicPromotionCandidate===true,realMoneyAllowed:false}),
  lane('clean-lag-family-v1','Lightning lag family 1–20 — clean V2',lagFamily?.progress?.comparisonsUsed,lagFamily?.progress?.fixedBoundaryComparisons,'BLINDED_ACCUMULATING',{disclosure:lagFamily?.disclosure?.policy||null,outcomePerformanceVisible:lagFamily?.disclosure?.candidatePerformanceHidden!==true,frozenCandidates:20,familyWiseAlpha:lagFamily?.guards?.bonferroniFamilyWiseAlpha??0.01,perCandidateAlpha:lagFamily?.guards?.perCandidateAlpha??0.0005,realMoneyAllowed:false}),
  lane('clean-past-lucky-family-v1','Lightning past-Lucky selectors — clean V2',pastLucky?.progress?.roundsUsed,pastLucky?.progress?.fixedBoundaryRounds,'BLINDED_ACCUMULATING',{disclosure:pastLucky?.disclosure?.policy||null,outcomePerformanceVisible:pastLucky?.disclosure?.candidatePerformanceHidden!==true,frozenCandidates:4,pastInformationOnly:pastLucky?.guards?.pastInformationOnly===true,currentRoundLuckySelectionForbidden:true,realMoneyAllowed:false}),
  lane('primitiva-frequency4-v1','Primitiva frequency/4 — falsification-only fixed 50-draw lane',pf4?.progress?.resultAndEconomicsAvailable,pf4?.progress?.fixedBoundaryDraws,'HISTORICALLY_REJECTED_PROSPECTIVE_FALSIFICATION',{sealedTargets:Number(pf4?.progress?.sealedTargets||0),latestSealedTarget:pf4?.progress?.latestSealedTarget||null,historicalExpandedRefutation:{holdoutDraws:1162,holdoutROI:-0.8503098106712564,randomAverageROI:-0.7245745912220307},fixedFinalEconomicPromotionCandidate:pf4Final?.gates?.economicPromotionCandidate===true,realMoneyAllowed:false}),
  lane('primitiva-v315','Primitiva MetaPleno v315 cross-game transfer',v315?.progress?.officiallySettledTargets,v315?.progress?.fixedDecisionBoundary,'BLINDED_ACCUMULATING',{sealedTargets:Number(v315?.progress?.sealedTargets||0),latestSealedTarget:v315?.progress?.latestSealedTarget||null,outcomePerformanceVisible:v315?.disclosure?.candidatePerformanceHidden!==true,realMoneyAllowed:false})
].sort((a,b)=>b.progress.percent-a.progress.percent);

const payload={
 version:'economic-readiness-ledger-v1',generatedAt:new Date().toISOString(),mission:'Identify reproducible positive expected value without future-information leakage or optional stopping.',
 strongestCurrentLead:lanes[0]?.id||null,
 strongestTraditionalEconomicLead:'quinigol-shadow-v3',
 closestBlindBoundary:lanes[0]||null,
 lanes,
 legacyDirectional:{lane:'economic-multiplier-window-prospective-v1',status:legacyTiming?.status||null,closedEpisodes:Number(legacyTiming?.closedEpisodes||0),successRate:legacyTiming?.successRate??null,frozenNullPrimary:legacyTiming?.frozenNull?.primary??null,relativeLiftVsPrimary:legacyTiming?.relativeLiftVsPrimary??null,promotable:false,reason:'Legacy directional evidence only; clean V2 replication is the promotion lane.'},
 traditionalLottery:{trackedProspectiveArtifacts:Number(master?.counts?.total||0),evaluated:Number(master?.counts?.evaluated||0),realMoneyPasses:Number(master?.counts?.realMoneyPass||0),quinigol:{observedJornadas:Number(q?.summary?.observedJornadas||0),fixedBoundary:Number(q?.summary?.requiredNewJornadas||30),pendingPredictions:Number(q?.summary?.sealedPendingPredictions||0),historicalHoldoutROI:qHist?.holdout?.roi??null,historicalHoldoutDraws:Number(qHist?.holdout?.draws||0),historicalFullGatePassed:qHist?.realMoneyPass===true,prospectivePromotionCandidate:qFinal?.gates?.economicPromotionCandidate===true},primitivaFrequency4:{status:'HISTORICALLY_REJECTED_FALSIFICATION_ONLY',sealedTargets:Number(pf4?.progress?.sealedTargets||0),fixedBoundary:Number(pf4?.progress?.fixedBoundaryDraws||50)},status:qFinal?.gates?.economicPromotionCandidate===true?'PROMOTION_CANDIDATE_PRESENT':'NO_VALIDATED_ECONOMIC_EDGE_YET'},
 promotionPolicy:{progressIsNotEvidence:true,hiddenPerformanceMustRemainHidden:true,fixedBoundariesRequired:true,positiveEconomicsAndScientificGateRequired:true,realMoneyRequiresSeparateExplicitAuthorization:true},
 realMoneyAllowed:false,realStakeEUR:0
};
fs.writeFileSync(OUT,JSON.stringify(payload,null,2)+'\n');console.log(JSON.stringify(payload,null,2));

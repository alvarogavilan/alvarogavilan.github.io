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
const QMC='loterias-ai/data/backtests/quinigol-holdout-montecarlo-audit.json';
const QROB='loterias-ai/data/backtests/quinigol-holdout-robustness-audit.json';
const OUT=`${ROOT}/economic-readiness-ledger-v1.json`;

const read=p=>{try{return JSON.parse(fs.readFileSync(p,'utf8'));}catch{return null;}};
const timing=read(`${ROOT}/timing-replication-v3-status.json`)||{};
const timingV4=read(`${ROOT}/timing-replication-v4-status.json`)||{};
const physical=read(`${ROOT}/physical-rng-prospective-v2-status.json`)||{};
const selector=read(`${ROOT}/economic-number-selection-prospective-status-v2.json`)||{};
const lag8=read(`${ROOT}/prospective-lag8-clean-v2-status-v1.json`)||{};
const lag8V3=read(`${ROOT}/prospective-lag8-clean-v3-status-v1.json`)||{};
const lagFamily=read(`${ROOT}/prospective-lag-family-clean-v2-status-v1.json`)||{};
const pastLucky=read(`${ROOT}/prospective-past-lucky-family-clean-v2-status-v1.json`)||{};
const transition=read(`${ROOT}/prospective-transition-family-v1-status.json`)||{};
const legacyTiming=read(`${ROOT}/economic-multiplier-window-prospective-status-v1.json`)||{};
const master=read(MASTER)||{},v315=read(V315)||{},pf4=read(PF4)||{},pf4Final=read(PF4_FINAL)||{},q=read(QLEDGER)||{},qFinal=read(QFINAL)||{},qHist=read(QHIST)||{},qMC=read(QMC)||{},qRob=read(QROB)||{};

const pct=(used,total)=>total>0?Number((100*Number(used||0)/Number(total)).toFixed(2)):0;
const eta=(used,remaining,start,end)=>{const a=Date.parse(start||''),b=Date.parse(end||'');const u=Number(used||0),r=Number(remaining||0);if(!Number.isFinite(a)||!Number.isFinite(b)||b<=a||u<10)return null;const hours=(b-a)/36e5,rate=u/hours;if(!(rate>0))return null;return{observedPerHour:Number(rate.toFixed(2)),roughHoursRemaining:Number((r/rate).toFixed(2)),method:'administrative observed-rate extrapolation only; not scientific evidence'};};
const lane=(id,label,used,total,status,extra={})=>({id,label,status,progress:{used:Number(used||0),boundary:Number(total||0),percent:pct(used,total),remaining:Math.max(0,Number(total||0)-Number(used||0))},...extra});

const timingUsed=Number(timing?.progress?.closedEpisodes||0),timingBoundary=Number(timing?.progress?.fixedBoundaryClosedEpisodes||200);
const lagUsed=Number(lag8?.progress?.comparisonsUsed||0),lagBoundary=Number(lag8?.progress?.fixedBoundaryComparisons||1000);
const timingEta=eta(timingUsed,Math.max(0,timingBoundary-timingUsed),timing?.prospectiveStartsAt,timing?.generatedAt);
const lagEta=eta(lagUsed,Math.max(0,lagBoundary-lagUsed),lag8?.progress?.firstEligibleAt,lag8?.progress?.lastEligibleAt);
const qFragile=qRob?.descriptiveRobustness?.notSingleDrawDependent===false||Number(qRob?.concentration?.top1ShareOfReturn||0)>=0.5;
const lag8Status=lag8?.final?(lag8?.gates?.scientificPromotionCandidate===true?'FIXED_FINAL_PASS':'FIXED_FINAL_REJECTED'):'BLINDED_ACCUMULATING';
const lag8Final=lag8?.final?{comparisons:Number(lag8.final.comparisons||0),matches:Number(lag8.final.matches||0),hitRate:lag8.final.hitRate??null,pUpper:lag8.final.pUpper??null,alpha:lag8.final.alpha??null,conservativeBreakEvenHitRate:lag8.final.conservativeBreakEvenHitRate??null,conservativeBaseRoi:lag8.final.conservativeBaseRoi??null,statisticalPass:lag8.final.statisticalPass===true,economicPass:lag8.final.economicPass===true,scientificPromotionCandidate:lag8.final.scientificPromotionCandidate===true}:null;

const lanes=[
  lane('clean-timing-v3','Lightning timing replication — clean V2',timingUsed,timingBoundary,timing?.final?(timing?.final?.replicationPass===true?'FIXED_FINAL_PASS':'FIXED_FINAL_REJECTED'):'BLINDED_ACCUMULATING',{disclosure:timing?.disclosure?.policy||null,outcomePerformanceVisible:timing?.disclosure?.performanceHidden!==true,administrativeEta:timingEta,realMoneyAllowed:false}),
  lane('clean-timing-v4','Lightning timing independent replication V4 — preregistered',timingV4?.progress?.closedEpisodes,timingV4?.progress?.fixedBoundaryClosedEpisodes,timingV4?.final?(timingV4?.final?.replicationPass===true?'FIXED_FINAL_PASS':'FIXED_FINAL_REJECTED'):(timingV4?.state||'WAITING_FOR_V3_FIXED_BOUNDARY'),{disclosure:timingV4?.disclosure?.policy||'ADMINISTRATIVE_COUNTS_ONLY',outcomePerformanceVisible:timingV4?.disclosure?.performanceHidden===false,preRegisteredBeforeV3Final:true,activationIndependentOfV3Outcome:true,realMoneyAllowed:false}),
  lane('clean-lag8-economic-v1','Lightning lag-8 conservative economic replication V2',lagUsed,lagBoundary,lag8Status,{disclosure:lag8?.disclosure?.policy||null,outcomePerformanceVisible:lag8?.disclosure?.performanceHidden!==true,administrativeEta:lagEta,conservativeEconomicModel:true,luckyMultiplierUpliftExcluded:true,fixedFinal:lag8Final,realMoneyAllowed:false}),
  lane('clean-lag8-economic-v3','Lightning lag-8 independent economic replication V3 — preregistered',lag8V3?.progress?.comparisonsUsed,lag8V3?.progress?.fixedBoundaryComparisons,lag8V3?.final?(lag8V3?.gates?.independentReplicationPass===true?'FIXED_FINAL_PASS':'FIXED_FINAL_REJECTED'):(lag8V3?.state||'WAITING_FOR_LAG8_V2_FIXED_BOUNDARY'),{disclosure:lag8V3?.disclosure?.policy||'ADMINISTRATIVE_PROGRESS_ONLY',outcomePerformanceVisible:lag8V3?.disclosure?.performanceHidden===false,preRegisteredBeforeV2Final:true,activationIndependentOfV2Outcome:true,postBoundarySampleOnly:true,realMoneyAllowed:false}),
  lane('physical-rng-v2','Lightning physical RNG prospective — clean V2',physical?.progress?.roundsUsedForV2,physical?.progress?.fixedBoundaryRounds,physical?.final?'FIXED_FINAL_AVAILABLE':'BLINDED_ACCUMULATING',{disclosure:physical?.disclosure?.policy||null,outcomePerformanceVisible:physical?.disclosure?.observedStatisticsHidden!==true,realMoneyAllowed:false}),
  lane('number-selection-v2','Lightning economic number selection — clean V2 Phase A',selector?.progress?.eligibleFutureRounds,selector?.progress?.phaseARoundsRequired,selector?.gates?.fixedFinalComplete===true?'FIXED_FINAL_AVAILABLE':'BLINDED_ACCUMULATING',{disclosure:selector?.disclosure?.reason||null,outcomePerformanceVisible:selector?.disclosure?.candidatePerformanceHidden!==true,frozenCandidates:Number(selector?.frozenFamily?.totalCandidates||0),realMoneyAllowed:false}),
  lane('clean-lag-family-v1','Lightning lag family 1–20 — clean V2',lagFamily?.progress?.comparisonsUsed,lagFamily?.progress?.fixedBoundaryComparisons,lagFamily?.final?'FIXED_FINAL_AVAILABLE':'BLINDED_ACCUMULATING',{disclosure:lagFamily?.disclosure?.policy||null,outcomePerformanceVisible:lagFamily?.disclosure?.candidatePerformanceHidden!==true,frozenCandidates:20,familyWiseAlpha:lagFamily?.guards?.bonferroniFamilyWiseAlpha??0.01,perCandidateAlpha:lagFamily?.guards?.perCandidateAlpha??0.0005,realMoneyAllowed:false}),
  lane('clean-past-lucky-family-v1','Lightning past-Lucky selectors — clean V2',pastLucky?.progress?.roundsUsed,pastLucky?.progress?.fixedBoundaryRounds,pastLucky?.final?'FIXED_FINAL_AVAILABLE':'BLINDED_ACCUMULATING',{disclosure:pastLucky?.disclosure?.policy||null,outcomePerformanceVisible:pastLucky?.disclosure?.candidatePerformanceHidden!==true,frozenCandidates:4,pastInformationOnly:pastLucky?.guards?.pastInformationOnly===true,currentRoundLuckySelectionForbidden:true,realMoneyAllowed:false}),
  lane('clean-transition-family-v1','Lightning winner-transition family — preregistered',transition?.progress?.roundsUsed,transition?.progress?.fixedBoundaryRounds,transition?.final?'FIXED_FINAL_AVAILABLE':'BLINDED_ACCUMULATING',{disclosure:transition?.disclosure?.policy||'ADMINISTRATIVE_PROGRESS_ONLY',outcomePerformanceVisible:transition?.disclosure?.candidatePerformanceHidden===false,frozenCandidates:8,familyWiseAlpha:0.01,perCandidateAlpha:0.00125,pastInformationOnly:true,realMoneyAllowed:false}),
  lane('quinigol-shadow-v3','Quinigol window320 / 2 tickets — fixed 30-jornada falsification shadow',q?.summary?.observedJornadas,q?.summary?.requiredNewJornadas,'BLINDED_FALSIFICATION_SHADOW',{sealedPendingPredictions:Number(q?.summary?.sealedPendingPredictions||0),performanceHidden:q?.summary?.performanceHidden!==false,historicalSignalQuality:qFragile?'FRAGILE_SINGLE_PRIZE_DOMINATED':'UNRESOLVED',historicalContext:{holdoutDraws:Number(qHist?.holdout?.draws||0),holdoutROI:qHist?.holdout?.roi??null,holdoutPL:qHist?.holdout?.pl??null,monteCarloOneSidedP:qMC?.randomModel?.oneSidedEmpiricalPUpper??null,top1ShareOfReturn:qRob?.concentration?.top1ShareOfReturn??null,leaveBestDrawOutROI:qRob?.leaveOneOut?.minimumROI??null,positiveQuarterBlocks:qRob?.positiveQuarterBlocks??null,fullHistoricalGatePassed:false,contextOnly:true},fixedFinalEconomicPromotionCandidate:qFinal?.gates?.economicPromotionCandidate===true,realMoneyAllowed:false}),
  lane('primitiva-frequency4-v1','Primitiva frequency/4 — falsification-only fixed 50-draw lane',pf4?.progress?.resultAndEconomicsAvailable,pf4?.progress?.fixedBoundaryDraws,'HISTORICALLY_REJECTED_PROSPECTIVE_FALSIFICATION',{sealedTargets:Number(pf4?.progress?.sealedTargets||0),latestSealedTarget:pf4?.progress?.latestSealedTarget||null,historicalExpandedRefutation:{holdoutDraws:1162,holdoutROI:-0.8503098106712564,randomAverageROI:-0.7245745912220307},fixedFinalEconomicPromotionCandidate:pf4Final?.gates?.economicPromotionCandidate===true,realMoneyAllowed:false}),
  lane('primitiva-v315','Primitiva MetaPleno v315 cross-game transfer',v315?.progress?.officiallySettledTargets,v315?.progress?.fixedDecisionBoundary,'BLINDED_ACCUMULATING',{sealedTargets:Number(v315?.progress?.sealedTargets||0),latestSealedTarget:v315?.progress?.latestSealedTarget||null,outcomePerformanceVisible:v315?.disclosure?.candidatePerformanceHidden!==true,realMoneyAllowed:false})
].sort((a,b)=>b.progress.percent-a.progress.percent);

const closestBlindBoundary=lanes.filter(x=>String(x.status).startsWith('BLINDED_')).sort((a,b)=>b.progress.percent-a.progress.percent)[0]||null;
const fixedFinalPasses=lanes.filter(x=>x.status==='FIXED_FINAL_PASS');
const strongestCurrentLead=fixedFinalPasses[0]?.id||'NO_VALIDATED_CURRENT_LEAD_YET';
const selectedLead=lanes.find(x=>x.id===strongestCurrentLead)||null;
if(selectedLead&&/REJECTED/.test(String(selectedLead.status)))throw new Error(`scientific lead integrity failure: rejected lane ${selectedLead.id} cannot be strongestCurrentLead`);

const payload={
  version:'economic-readiness-ledger-v1',generatedAt:new Date().toISOString(),mission:'Identify reproducible positive expected value without future-information leakage or optional stopping.',
  strongestCurrentLead,
  strongestLeadPolicy:'FIXED_FINAL_PASS_ONLY',
  strongestDirectEconomicLane:'NO_VALIDATED_DIRECT_ECONOMIC_EDGE_YET',
  strongestTraditionalEconomicLead:qFragile?'NO_ROBUST_TRADITIONAL_EDGE_YET':'quinigol-shadow-v3',
  closestBlindBoundary,
  administrativeSpeed:{timingV3:timingEta,lag8V2:lagEta,warning:'ETA is operational extrapolation only and may change with source cadence.'},
  timingReplicationPlan:{v3Status:timing?.final?(timing?.final?.replicationPass===true?'FIXED_FINAL_PASS':'FIXED_FINAL_REJECTED'):'BLINDED_ACCUMULATING',v4PreRegistered:true,v4Status:timingV4?.state||'WAITING_FOR_V3_FIXED_BOUNDARY',v4ActivationIndependentOfV3Outcome:true},
  lag8ReplicationPlan:{v2Status:lag8Status,v2FixedFinal:lag8Final,v3PreRegistered:true,v3Status:lag8V3?.state||'WAITING_FOR_LAG8_V2_FIXED_BOUNDARY',v3ActivationIndependentOfV2Outcome:true,postBoundarySampleOnly:true},
  lanes,
  legacyDirectional:{lane:'economic-multiplier-window-prospective-v1',status:legacyTiming?.status||null,closedEpisodes:Number(legacyTiming?.closedEpisodes||0),successRate:legacyTiming?.successRate??null,frozenNullPrimary:legacyTiming?.frozenNull?.primary??null,relativeLiftVsPrimary:legacyTiming?.relativeLiftVsPrimary??null,promotable:false,reason:'Legacy directional evidence only; clean V2 replication is the promotion lane.'},
  traditionalLottery:{trackedProspectiveArtifacts:Number(master?.counts?.total||0),evaluated:Number(master?.counts?.evaluated||0),realMoneyPasses:Number(master?.counts?.realMoneyPass||0),quinigol:{status:qFragile?'HISTORICAL_SIGNAL_FRAGILE_PROSPECTIVE_FALSIFICATION':'PROSPECTIVE_SHADOW',observedJornadas:Number(q?.summary?.observedJornadas||0),fixedBoundary:Number(q?.summary?.requiredNewJornadas||30),pendingPredictions:Number(q?.summary?.sealedPendingPredictions||0),historicalHoldoutROI:qHist?.holdout?.roi??null,historicalHoldoutDraws:Number(qHist?.holdout?.draws||0),monteCarloOneSidedP:qMC?.randomModel?.oneSidedEmpiricalPUpper??null,top1ShareOfReturn:qRob?.concentration?.top1ShareOfReturn??null,leaveBestDrawOutROI:qRob?.leaveOneOut?.minimumROI??null,historicalFullGatePassed:false,prospectivePromotionCandidate:qFinal?.gates?.economicPromotionCandidate===true},primitivaFrequency4:{status:'HISTORICALLY_REJECTED_FALSIFICATION_ONLY',sealedTargets:Number(pf4?.progress?.sealedTargets||0),fixedBoundary:Number(pf4?.progress?.fixedBoundaryDraws||50)},status:qFinal?.gates?.economicPromotionCandidate===true?'PROMOTION_CANDIDATE_PRESENT':'NO_VALIDATED_ECONOMIC_EDGE_YET'},
  promotionPolicy:{progressIsNotEvidence:true,hiddenPerformanceMustRemainHidden:true,fixedBoundariesRequired:true,positiveEconomicsAndScientificGateRequired:true,realMoneyRequiresSeparateExplicitAuthorization:true},
  realMoneyAllowed:false,realStakeEUR:0
};
fs.writeFileSync(OUT,JSON.stringify(payload,null,2)+'\n');console.log(JSON.stringify(payload,null,2));

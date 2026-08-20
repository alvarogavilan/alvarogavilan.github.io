#!/usr/bin/env node
import fs from 'node:fs';
const read=p=>{try{return JSON.parse(fs.readFileSync(p,'utf8'));}catch{return null}};
const CENSUS='loterias-ai/casino/archive/evidence/botemania-all-games-census-v1.json';
const RANK='loterias-ai/casino/archive/evidence/botemania-state-dependent-priority-ranker-v1.json';
const JPK='loterias-ai/casino/jackpots/evidence/botemania-jpk-current-all-games-ev-screen-v1.json';
const IRISH='loterias-ai/casino/jackpots/evidence/botemania-irish-riches-jpk-current-screen-v1.json';
const LEDGER='loterias-ai/casino/jackpots/evidence/botemania-generic-fast-reset-ledger-v1.json';
const MAP='loterias-ai/casino/jackpots/evidence/botemania-progressive-network-map-v1.json';
const MULTI_EXECUTION='loterias-ai/edge-live/evidence/edge-live-multi-execution-plan-v1.json';
const EXECUTION_FALLBACK='loterias-ai/edge-live/evidence/edge-live-execution-plan-v1.json';
const OUT='loterias-ai/casino/evidence/botemania-global-economic-gate-v1.json';
const census=read(CENSUS)||{},rank=read(RANK)||{},jpk=read(JPK)||{},irish=read(IRISH)||{},ledger=read(LEDGER)||{},map=read(MAP)||{};
const multiExecution=read(MULTI_EXECUTION)||{};
const fallbackExecution=read(EXECUTION_FALLBACK)||{};
const execution=Array.isArray(multiExecution?.lanes)?multiExecution:fallbackExecution;

const games=census.games||[];
const withRtp=games.filter(g=>Array.isArray(g.rtpPcts)&&g.rtpPcts.length);
const staticPublishedAtOrAbove100=withRtp.filter(g=>Math.max(...g.rtpPcts.map(Number).filter(Number.isFinite))>=100).map(g=>({slug:g.slug,url:g.url,rtpPcts:g.rtpPcts}));
const dynamic=rank.rankedDynamic||[];
const progressive=rank.rankedProgressive||[];
const jpkRows=jpk.ranked||[];
const robustJpk=jpkRows.filter(x=>x?.currentZeroKingSensitivity?.robustAtOrAbove100===true);
const irishPass=irish?.decision?.currentPositiveEvProven===true;
const resetZeroRows=(map.rows||[]).filter(x=>x.resetZero===true);
const liveTracks=ledger.lastTracks||[];
const resetEvents=ledger.events||[];

const researchScreenCandidates=[];
for(const x of robustJpk)researchScreenCandidates.push({slug:x.slug,source:'JPK_CURRENT_SCREEN',status:'SCREEN_PASS_ONLY_NOT_EXECUTION'});
if(irishPass)researchScreenCandidates.push({slug:'irish-riches-megaways-jackpot-king',source:'IRISH_CURRENT_SCREEN',status:'SCREEN_PASS_ONLY_NOT_EXECUTION'});

const fallbackLane={
  id:execution?.selectedLaneId||execution?.game?.id||'selected-execution-plan',
  type:'SELECTED_EXECUTION_PLAN',
  game:execution?.game||{},
  phase:execution?.state==='READY_TO_EXECUTE_MANUALLY'?'GREEN':execution?.state==='PREPARE_OPEN_GAME_NO_BET'?'YELLOW':'RED',
  executionReady:execution?.state==='READY_TO_EXECUTE_MANUALLY'&&execution?.order?.action==='PLAY',
  order:execution?.order||{},
  evidence:execution?.evidence||{},
  current:{observedAt:execution?.evidence?.observedAt||null},
  economic:{conservativeRtp:execution?.evidence?.bestConservativeRtp??null}
};
const executionLanes=Array.isArray(execution?.lanes)&&execution.lanes.length?execution.lanes:[fallbackLane];
const laneIsFullyExecutable=lane=>{
  const untilMs=Date.parse(lane?.order?.validUntil||'');
  const freshNow=Number.isFinite(untilMs)&&untilMs>Date.now();
  return lane?.executionReady===true && lane?.phase==='GREEN' && lane?.order?.action==='PLAY' &&
    Number(lane?.order?.stakePerSpinEUR)>0 && Number(lane?.order?.maxSpins)>0 && Number(lane?.order?.maxTotalStakeEUR)>0 &&
    lane?.evidence?.structurePass===true && lane?.evidence?.economicPass===true && lane?.evidence?.exactStakeKnown===true &&
    lane?.evidence?.sourceFresh===true && lane?.evidence?.withinFreshExecutionWindow===true && freshNow;
};

const validatedEconomicCandidates=executionLanes.filter(laneIsFullyExecutable).map(lane=>({
  slug:lane?.game?.id||lane?.id||'unknown',
  laneId:lane?.id||null,
  type:lane?.type||null,
  name:lane?.game?.name||null,
  url:lane?.game?.url||null,
  source:'EDGE_LIVE_MULTI_EXECUTION_PLAN',
  status:'FULL_EXECUTION_GATE_PASSED',
  stakePerSpinEUR:Number(lane.order.stakePerSpinEUR),
  maxSpins:Number(lane.order.maxSpins),
  maxTotalStakeEUR:Number(lane.order.maxTotalStakeEUR),
  validUntil:lane.order.validUntil,
  observedAt:lane?.current?.observedAt||lane?.evidence?.observedAt||null,
  currentJackpotEUR:Number.isFinite(Number(lane?.current?.jackpotEUR))?Number(lane.current.jackpotEUR):null,
  breakEvenJackpotEUR:Number.isFinite(Number(lane?.economic?.breakEvenJackpotEUR))?Number(lane.economic.breakEvenJackpotEUR):null,
  conservativeRtp:lane?.economic?.conservativeRtp??lane?.evidence?.bestConservativeRtp??null
}));

const currentAnyValidatedPositiveEv=validatedEconomicCandidates.length>0;
const topDynamic=(rank?.summary?.topDynamic||[]).slice(0,10);
const unresolvedDynamicCount=Math.max(0,(rank?.summary?.progressiveOrJackpotCandidates||progressive.length)-validatedEconomicCandidates.length);
const selectedValidUntil=execution?.order?.validUntil||null;
const selectedValidUntilMs=Date.parse(selectedValidUntil||'');
const selectedFreshNow=Number.isFinite(selectedValidUntilMs)&&selectedValidUntilMs>Date.now();

const out={
  version:'botemania-global-economic-gate-v1.2-multi-execution-wired',generatedAt:new Date().toISOString(),operator:'botemania-es',
  scope:{promotionsExcluded:true,publicOperatorGamesOnly:true,automaticBettingExcluded:true},
  coverage:{
    censusGames:Number(census?.summary?.gamesDiscovered||games.length||0),
    http200:Number(census?.summary?.http200||0),
    gamesWithPublishedRtp:Number(census?.summary?.withRtp||withRtp.length||0),
    progressiveOrJackpotCandidates:Number(rank?.summary?.progressiveOrJackpotCandidates||progressive.length||0),
    stateOrMustDropCandidates:Number(rank?.summary?.stateOrMustDropCandidates||dynamic.length||0),
    jackpotKingGames:Number(census?.summary?.jackpotKing||0),
    jpkCurrentlyScreenable:jpkRows.filter(x=>x.screenable===true).length,
    resetZeroCandidates:resetZeroRows.length,
    genericLiveMeterTracks:liveTracks.length,
    genericResetCandidateEvents:resetEvents.length,
    staticPublishedRtpAtOrAbove100Count:staticPublishedAtOrAbove100.length,
    executionLanesTracked:executionLanes.length,
    executionLanesGreen:validatedEconomicCandidates.length
  },
  currentEvidence:{
    jpkObservedAt:jpk.observedAt||null,
    jpkRobustResearchScreenPassCount:robustJpk.length,
    irishObservedAt:irish?.current?.observedAt||null,
    irishBestResearchRtpPct:Number(irish?.current?.bestRtpPct)||null,
    irishCurrentPositiveEvProven:irishPass,
    researchScreenCandidates,
    executionPlan:{generatedAt:execution?.generatedAt||null,selectedLaneId:execution?.selectedLaneId||null,state:execution?.state||null,action:execution?.order?.action||null,validUntil:selectedValidUntil,freshNow:selectedFreshNow,trackedLanes:executionLanes.length,greenLanes:validatedEconomicCandidates.length},
    topDynamic,
    staticPublishedRtpAtOrAbove100:staticPublishedAtOrAbove100.slice(0,20)
  },
  validatedEconomicCandidates,
  decision:{
    state:currentAnyValidatedPositiveEv?'VALIDATED_POSITIVE_EV_CANDIDATE_EXISTS':'NO_VALIDATED_POSITIVE_EV_CANDIDATE',
    action:currentAnyValidatedPositiveEv?'MANUAL_EXECUTION_ALLOWED_IF_FINAL_RECHECK_GREEN':'DO_NOT_PLAY',
    validatedPositiveEvCount:validatedEconomicCandidates.length,
    unresolvedProgressiveOrDynamicCandidates:unresolvedDynamicCount,
    realMoneyAllowed:currentAnyValidatedPositiveEv,
    automaticBettingAllowed:false,
    reason:currentAnyValidatedPositiveEv?'ONE_OR_MORE_FULL_EDGE_LIVE_EXECUTION_GATES_PASSED':'ZERO_CANDIDATES_HAVE_PASSED_FULL_EXECUTION_GATE'
  },
  interpretation:'Global economic gate for structural, non-promotional opportunities. Research screens never authorize wagering. Only fully green, fresh, stake-bounded EDGE LIVE lanes are promoted, and a final live recheck remains mandatory.',
  guards:{noPromotionFromPublishedRtpAlone:true,noPromotionFromResearchScreenAlone:true,noClaimAllGamesExhaustivelyNegative:true,promotionsExcluded:true,noAutomaticBetting:true,finalGreenRecheckMandatory:true,staleExecutionPlanFailsClosed:true}
};
fs.mkdirSync('loterias-ai/casino/evidence',{recursive:true});fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify({coverage:out.coverage,currentEvidence:{jpkRobustResearchScreenPassCount:out.currentEvidence.jpkRobustResearchScreenPassCount,irishBestResearchRtpPct:out.currentEvidence.irishBestResearchRtpPct,executionPlan:out.currentEvidence.executionPlan,topDynamic:out.currentEvidence.topDynamic},decision:out.decision,validatedEconomicCandidates:out.validatedEconomicCandidates},null,2));

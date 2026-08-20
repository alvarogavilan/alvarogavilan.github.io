#!/usr/bin/env node
import fs from 'node:fs';
const read=p=>{try{return JSON.parse(fs.readFileSync(p,'utf8'));}catch{return null}};
const CENSUS='loterias-ai/casino/archive/evidence/botemania-all-games-census-v1.json';
const RANK='loterias-ai/casino/archive/evidence/botemania-state-dependent-priority-ranker-v1.json';
const JPK='loterias-ai/casino/jackpots/evidence/botemania-jpk-current-all-games-ev-screen-v1.json';
const IRISH='loterias-ai/casino/jackpots/evidence/botemania-irish-riches-jpk-current-screen-v1.json';
const LEDGER='loterias-ai/casino/jackpots/evidence/botemania-generic-fast-reset-ledger-v1.json';
const MAP='loterias-ai/casino/jackpots/evidence/botemania-progressive-network-map-v1.json';
const OUT='loterias-ai/casino/evidence/botemania-global-economic-gate-v1.json';
const census=read(CENSUS)||{},rank=read(RANK)||{},jpk=read(JPK)||{},irish=read(IRISH)||{},ledger=read(LEDGER)||{},map=read(MAP)||{};

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
const validatedPositiveCandidates=[];
for(const x of robustJpk)validatedPositiveCandidates.push({slug:x.slug,source:'JPK_CURRENT_SCREEN',status:'SCREEN_PASS_ONLY_NOT_EXECUTION'});
if(irishPass)validatedPositiveCandidates.push({slug:'irish-riches-megaways-jackpot-king',source:'IRISH_CURRENT_SCREEN',status:'SCREEN_PASS_ONLY_NOT_EXECUTION'});

// Promotion requires an actual validated economic candidate; a research screen pass alone is not enough.
const validatedEconomicPromotionCandidates=[];
const currentAnyValidatedPositiveEv=validatedEconomicPromotionCandidates.length>0;
const topDynamic=(rank?.summary?.topDynamic||[]).slice(0,10);
const unresolvedDynamicCount=Math.max(0,(rank?.summary?.progressiveOrJackpotCandidates||progressive.length)-validatedEconomicPromotionCandidates.length);

const out={
  version:'botemania-global-economic-gate-v1',generatedAt:new Date().toISOString(),operator:'botemania-es',
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
    staticPublishedRtpAtOrAbove100Count:staticPublishedAtOrAbove100.length
  },
  currentEvidence:{
    jpkObservedAt:jpk.observedAt||null,
    jpkRobustResearchScreenPassCount:robustJpk.length,
    irishObservedAt:irish?.current?.observedAt||null,
    irishBestResearchRtpPct:Number(irish?.current?.bestRtpPct)||null,
    irishCurrentPositiveEvProven:irishPass,
    topDynamic,
    staticPublishedRtpAtOrAbove100:staticPublishedAtOrAbove100.slice(0,20)
  },
  decision:{
    state:currentAnyValidatedPositiveEv?'VALIDATED_POSITIVE_EV_CANDIDATE_EXISTS':'NO_VALIDATED_POSITIVE_EV_CANDIDATE',
    action:currentAnyValidatedPositiveEv?'REQUIRE_EXECUTION_GATE':'DO_NOT_PLAY',
    validatedPositiveEvCount:validatedEconomicPromotionCandidates.length,
    unresolvedProgressiveOrDynamicCandidates:unresolvedDynamicCount,
    realMoneyAllowed:false,
    reason:currentAnyValidatedPositiveEv?'ECONOMIC_CANDIDATE_REQUIRES_EXECUTION_VALIDATION':'ZERO_CANDIDATES_HAVE_PASSED_FULL_ECONOMIC_PROMOTION_GATE'
  },
  interpretation:'This is a global promotion gate, not a proof that every censused game has negative EV in every future state. Fixed-RTP games below 100% are not promoted; progressive/state-dependent games remain open until their live state, hazard and execution parameters are sufficiently resolved.',
  guards:{
    noPromotionFromPublishedRtpAlone:true,
    noPromotionFromResearchScreenAlone:true,
    noClaimAllGamesExhaustivelyNegative:true,
    promotionsExcluded:true,
    noAutomaticBetting:true,
    realMoneyAllowed:false
  }
};
fs.mkdirSync('loterias-ai/casino/evidence',{recursive:true});fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify({coverage:out.coverage,currentEvidence:{jpkRobustResearchScreenPassCount:out.currentEvidence.jpkRobustResearchScreenPassCount,irishBestResearchRtpPct:out.currentEvidence.irishBestResearchRtpPct,irishCurrentPositiveEvProven:out.currentEvidence.irishCurrentPositiveEvProven,topDynamic:out.currentEvidence.topDynamic},decision:out.decision},null,2));

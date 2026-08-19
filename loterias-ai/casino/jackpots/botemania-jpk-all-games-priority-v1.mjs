#!/usr/bin/env node
import fs from 'node:fs';

const read=p=>{try{return JSON.parse(fs.readFileSync(p,'utf8'));}catch{return null}};
const CENSUS='loterias-ai/casino/jackpots/evidence/botemania-jpk-game-economics-census-v1.json';
const LIVE='loterias-ai/casino/jackpots/evidence/botemania-jpk-live-gate-v1.json';
const ALLOC='loterias-ai/casino/jackpots/evidence/botemania-jpk-allocation-prospective-status-v1.json';
const OUT='loterias-ai/casino/jackpots/evidence/botemania-jpk-all-games-priority-v1.json';
const census=read(CENSUS)||{}, live=read(LIVE)||{}, alloc=read(ALLOC)||{};
const rows=(Array.isArray(census.rows)?census.rows:[]).map(r=>{
  const base=Number(r.baseRtpPct), active=Number(r.activeContributionPct), reserve=Number(r.reserveContributionPct);
  const usable=Number.isFinite(base)&&Number.isFinite(active)&&active>0;
  const contributionConflict=r?.contributionConsistency?.mechanicsVsRtpConflict===true;
  const gap=usable?100-base:null;
  const activeMultiple=usable?gap/active:null;
  const totalPublished=usable?base+active+(Number.isFinite(reserve)?reserve:0):null;
  const researchEligible=usable&&!contributionConflict&&r.stateDependentProbability===true&&r.probabilityProportionalToTotalBet===true;
  const sharedCorroboration=r.explicitBotemaniaCanalBingoSharedNetwork===true;
  const rankingTier=contributionConflict
    ?'D_CONTRIBUTION_CONFLICT_FAIL_CLOSED'
    :researchEligible&&sharedCorroboration
      ?'A_EXPLICIT_SHARED_STATE_DEPENDENT'
      :researchEligible
        ?'B_STATE_DEPENDENT_SHARED_NOT_PAGE_EXPLICIT'
        :'C_NOT_PRIMARY';
  return {
    slug:r.slug||null,title:r.title||null,url:r.url||null,
    baseRtpPct:Number.isFinite(base)?base:null,
    activeContributionPct:Number.isFinite(active)?active:null,
    reserveContributionPct:Number.isFinite(reserve)?reserve:null,
    explicitComponentsTotalPct:Number.isFinite(totalPublished)?+totalPublished.toFixed(4):null,
    baseGapTo100PctPoints:Number.isFinite(gap)?+gap.toFixed(4):null,
    requiredMultipleOfPublishedActiveContributionToBridgeBaseGap:Number.isFinite(activeMultiple)?+activeMultiple.toFixed(4):null,
    stateDependentProbability:r.stateDependentProbability===true,
    probabilityProportionalToTotalBet:r.probabilityProportionalToTotalBet===true,
    explicitBotemaniaCanalBingoSharedNetwork:sharedCorroboration,
    contributionConsistency:{
      genericMechanicsStatementPresent:r?.contributionConsistency?.genericMechanicsStatementPresent===true,
      specificRtpComponentsPresent:r?.contributionConsistency?.specificRtpComponentsPresent===true,
      mechanicsVsRtpConflict:contributionConflict
    },
    requiresExplicitContributionReview:contributionConflict,
    researchEligible,
    rankingTier
  };
});
const tierRank={
  A_EXPLICIT_SHARED_STATE_DEPENDENT:0,
  B_STATE_DEPENDENT_SHARED_NOT_PAGE_EXPLICIT:1,
  C_NOT_PRIMARY:2,
  D_CONTRIBUTION_CONFLICT_FAIL_CLOSED:3
};
const ranked=rows.filter(x=>Number.isFinite(x.requiredMultipleOfPublishedActiveContributionToBridgeBaseGap)).sort((a,b)=>
  (tierRank[a.rankingTier]-tierRank[b.rankingTier])||
  (a.requiredMultipleOfPublishedActiveContributionToBridgeBaseGap-b.requiredMultipleOfPublishedActiveContributionToBridgeBaseGap)
);
const primary=ranked.find(x=>x.researchEligible)||null;
const fishin=ranked.find(x=>String(x.slug).includes('fishin-frenzy-jackpot-king'))||null;
const beatsFishin=fishin?ranked.filter(x=>x.researchEligible&&x.requiredMultipleOfPublishedActiveContributionToBridgeBaseGap<fishin.requiredMultipleOfPublishedActiveContributionToBridgeBaseGap):[];
const contributionConflictGames=ranked.filter(x=>x.requiresExplicitContributionReview).map(x=>({slug:x.slug,title:x.title,url:x.url}));
const out={
  version:'botemania-jpk-all-games-priority-v1.1',generatedAt:new Date().toISOString(),operator:'botemania-es',
  purpose:'RESEARCH_PRIORITY_ONLY_NOT_WAGER_RECOMMENDATION',
  method:'Rank every parsed Botemania Jackpot King title by how many multiples of its published active jackpot contribution would be needed to bridge base RTP to 100%, then prefer titles whose public page confirms state-dependent, stake-proportional jackpot probability and explicit shared-network context. Any title whose generic mechanics contribution conflicts with its game-specific RTP contribution block is failed closed and cannot be research-eligible until explicitly resolved. This is not a state-specific EV calculation.',
  gamesScanned:rows.length,
  ranked,
  decision:{
    currentPrimaryResearchGame:primary,
    fishinReference:fishin,
    eligibleGamesBeatingFishinOnThisConservativeLeverageMetric:beatsFishin,
    contributionConflictGames,
    contributionConflictCount:contributionConflictGames.length,
    shouldSwitchPrimaryFromFishin:beatsFishin.length>0,
    liveGateState:live.state||null,
    allocationProspectiveState:alloc.state||'NOT_YET_GENERATED',
    realMoneyAllowed:false,
    automaticBettingAllowed:false
  },
  guards:{
    rankingDoesNotUseFutureOutcomes:true,
    noCapAssumptionUsedForRanking:true,
    noHazardAssumptionUsedForRanking:true,
    noReserveCreditInLeverageMetric:true,
    contributionConflictsFailClosed:true,
    contributionConflictCannotBePrimary:true,
    noRankingAsPositiveEvClaim:true,
    noBetting:true,
    realMoneyAllowed:false
  }
};
fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({gamesScanned:out.gamesScanned,primary:out.decision.currentPrimaryResearchGame,beatsFishin:beatsFishin.map(x=>x.slug),contributionConflictGames},null,2));

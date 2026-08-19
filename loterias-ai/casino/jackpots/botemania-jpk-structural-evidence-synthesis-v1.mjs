#!/usr/bin/env node
import fs from 'node:fs';

const read=p=>{try{return JSON.parse(fs.readFileSync(p,'utf8'));}catch{return null}};
const ALLOC='loterias-ai/casino/jackpots/evidence/botemania-jpk-allocation-prospective-status-v1.json';
const CENSUS='loterias-ai/casino/jackpots/evidence/botemania-jpk-game-economics-census-v1.json';
const LIVE='loterias-ai/casino/jackpots/evidence/botemania-jpk-live-gate-v1.json';
const OUT='loterias-ai/casino/jackpots/evidence/botemania-jpk-structural-evidence-synthesis-v1.json';

const alloc=read(ALLOC)||{}, census=read(CENSUS)||{}, live=read(LIVE)||{};
const fishin=(Array.isArray(census.rows)?census.rows:[]).find(r=>r.slug==='fishin-frenzy-jackpot-king')||null;
const networkValidated=alloc?.decision?.networkAllocationProspectivelyValidated===true;
const perTitleSplitProven=alloc?.decision?.perTitleContributionSplitProven===true;
const fishinContributionClean=fishin?.contributionConsistency?.mechanicsVsRtpConflict===false;
const exactSpainMbwbKnown=live?.evidence?.exactSpainMbwbKnown===true;
const exactHazardKnown=live?.evidence?.exactHazardKnown===true;
const currentScreenPass=live?.evidence?.currentScreenPass===true;

let structuralState='ACCUMULATING_PROSPECTIVE_NETWORK_EVIDENCE';
if(alloc.state==='VALIDATION_FAILED_FROZEN_CRITERIA') structuralState='FROZEN_NETWORK_ALLOCATION_VALIDATION_FAILED';
if(networkValidated) structuralState='NETWORK_ALLOCATION_PROSPECTIVELY_VALIDATED';

const economicsReady=networkValidated&&perTitleSplitProven&&fishinContributionClean&&exactSpainMbwbKnown&&exactHazardKnown&&currentScreenPass;
const blockers=[];
if(!networkValidated) blockers.push('NETWORK_ALLOCATION_NOT_YET_PROSPECTIVELY_VALIDATED');
if(!perTitleSplitProven) blockers.push('PER_TITLE_CONTRIBUTION_SPLIT_NOT_PROVEN');
if(!fishinContributionClean) blockers.push('FISHIN_CONTRIBUTION_ECONOMICS_CONFLICT_OR_MISSING');
if(!exactSpainMbwbKnown) blockers.push('EXACT_SPAIN_MBWB_UNKNOWN');
if(!exactHazardKnown) blockers.push('EXACT_HAZARD_UNKNOWN');
if(!currentScreenPass) blockers.push('CURRENT_CONSERVATIVE_SCREEN_NOT_PASSING');

const out={
  version:'botemania-jpk-structural-evidence-synthesis-v1',
  generatedAt:new Date().toISOString(),
  operator:'botemania-es',
  primaryGame:'fishin-frenzy-jackpot-king',
  structuralState,
  prospectiveNetworkEvidence:{
    protocolFrozenAt:alloc.protocolFrozenAt||null,
    state:alloc.state||null,
    progress:alloc.progress||null,
    weightedAllocationShares:alloc.weightedAllocationShares||null,
    checks:alloc.checks||null,
    networkAllocationProspectivelyValidated:networkValidated
  },
  gameSpecificEvidence:{
    contributionEconomicsInternallyConsistent:fishinContributionClean,
    baseRtpPct:fishin?.baseRtpPct??null,
    activeContributionPct:fishin?.activeContributionPct??null,
    reserveContributionPct:fishin?.reserveContributionPct??null,
    perTitleContributionSplitProven:perTitleSplitProven
  },
  economicStateEvidence:{
    exactSpainMbwbKnown,
    exactHazardKnown,
    currentConservativeScreenPass:currentScreenPass,
    liveGateState:live.state||null,
    bestConservativeRtp:live?.current?.modelScreen?.bestConservativeRtp??null
  },
  decision:{
    structuralPromotionAllowed:networkValidated,
    economicPromotionAllowed:economicsReady,
    realMoneyAllowed:false,
    automaticBettingAllowed:false,
    blockers
  },
  interpretation:{
    ifNetworkPasses:'A pass validates the frozen network-level 60/20/20-style allocation structure only. It does not prove Fishin Frenzy inherits that split exactly.',
    noDoubleCounting:'Published RTP/contribution components must never be added twice when moving from structural evidence to economic EV modelling.',
    noLifeChangingClaim:'Structural validation is a scientific milestone, not proof of profit or a guaranteed wagering advantage.'
  },
  guards:{
    futureOnly:true,
    noRetuning:true,
    networkLevelDoesNotImplyPerTitle:true,
    noMbwbFromCrossMarketAsSpainFact:true,
    noHazardAssumptionAsFact:true,
    noScreenPassAsProof:true,
    noBetting:true,
    realMoneyAllowed:false
  }
};

fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify(out,null,2));

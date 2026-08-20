#!/usr/bin/env node
import fs from 'node:fs';

const IN='loterias-ai/casino/jackpots/evidence/botemania-jpk-game-economics-census-v1.json';
const OUT='loterias-ai/casino/jackpots/evidence/botemania-jpk-internal-contribution-reconciliation-v1.json';
const c=JSON.parse(fs.readFileSync(IN,'utf8'));
const rows=(c.rows||[]).map(r=>({
  slug:r.slug,title:r.title,baseRtpPct:r.baseRtpPct??null,
  activeContributionPct:r.activeContributionPct??null,
  reserveContributionPct:r.reserveContributionPct??null,
  explicitComponentsTotalPct:r.explicitComponentsTotalPct??null,
  rtpContexts:r.rtpContexts||[],
  genericMechanicsContribution:r.genericMechanicsContribution||null,
  mechanicsVsRtpConflict:r.contributionConsistency?.mechanicsVsRtpConflict===true,
  stateDependentProbability:r.stateDependentProbability===true,
  probabilityProportionalToTotalBet:r.probabilityProportionalToTotalBet===true,
  sharedNetwork:r.explicitBotemaniaCanalBingoSharedNetwork===true
}));
const key=x=>`${x.activeContributionPct??'null'}|${x.reserveContributionPct??'null'}`;
const clusters={};
for(const r of rows){const k=key(r);(clusters[k]??=[]).push(r.slug);}
const irish=rows.find(r=>r.slug==='irish-riches-megaways-jackpot-king')||null;
const explicitPeers=rows.filter(r=>Number.isFinite(r.activeContributionPct)&&Number.isFinite(r.reserveContributionPct));
const samePublishedExtraPeers=rows.filter(r=>r.slug!==irish?.slug && (r.rtpContexts||[]).some(x=>/\+\s*1\s*%/i.test(String(x))));
const candidateSplits=[...new Map(explicitPeers.map(r=>[key(r),{activeContributionPct:r.activeContributionPct,reserveContributionPct:r.reserveContributionPct,examples:[]}])).values()];
for(const x of candidateSplits){x.examples=explicitPeers.filter(r=>r.activeContributionPct===x.activeContributionPct&&r.reserveContributionPct===x.reserveContributionPct).map(r=>r.slug);x.activePlusReservePct=Number((x.activeContributionPct+x.reserveContributionPct).toFixed(6));}
const out={
  version:'botemania-jpk-internal-contribution-reconciliation-v1',generatedAt:new Date().toISOString(),operator:'botemania-es',
  sourceGeneratedAt:c.generatedAt||null,rowCount:rows.length,
  irish,
  explicitPeerCount:explicitPeers.length,
  contributionClusters:clusters,
  explicitCandidateSplits:candidateSplits,
  peersWhoseRtpTextAlsoContainsPlus1Pct:samePublishedExtraPeers,
  decision:{
    irishExactActiveContributionKnown:Number.isFinite(irish?.activeContributionPct),
    irishExactReserveContributionKnown:Number.isFinite(irish?.reserveContributionPct),
    canInferIrishSplitFromOtherGames:false,
    reason:'GAME_SPECIFIC_RTP_COMPONENTS_VARY_WITHIN_BOTEMANIA; PEER SPLITS ARE DISCOVERY CONTROLS ONLY',
    economicPromotionAllowed:false,realMoneyAllowed:false
  },
  guards:{operatorInternalComparisonOnly:true,noCrossOperatorSubstitution:true,noPeerParameterImputation:true,noBetting:true,realMoneyAllowed:false}
};
fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({irish:out.irish,explicitPeerCount:out.explicitPeerCount,clusters:out.contributionClusters,candidateSplits:out.explicitCandidateSplits,decision:out.decision},null,2));

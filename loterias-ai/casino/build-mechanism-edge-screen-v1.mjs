#!/usr/bin/env node
import fs from 'node:fs';

const SRC='loterias-ai/casino/playuzu/evidence/validated-game-catalog-v1.json';
const OUT='loterias-ai/casino/evidence/mechanism-edge-screen-v1.json';
const catalog=JSON.parse(fs.readFileSync(SRC,'utf8'));
const games=Array.isArray(catalog.games)?catalog.games:[];
const round=n=>Number(Number(n||0).toFixed(4));
const classify=g=>{
  const cat=String(g.category||'').toLowerCase();
  const cats=(g.categories||[]).join(' ').toLowerCase();
  const src=String(g.sourcePage||'').toLowerCase();
  const jackpot=!!(g.isJackpot||g.isJackpotKing||g.dailyJackpot||cat.includes('jackpot'));
  if(jackpot)return 'STATE_DEPENDENT_PROGRESSIVE';
  if(cat.includes('blackjack')||cats.includes('blackjack'))return 'HIGH_RTP_RULESET_OR_REWARD';
  if(cat.includes('roulette')||cat.includes('ruleta')||cats.includes('roulette')||cats.includes('ruleta'))return 'ROULETTE_STATE_OR_PHYSICAL_ONLY';
  if(cat.includes('crash')||src.includes('/crash-games/'))return 'CRASH_NULL_OR_STATE_ONLY';
  if(src.includes('/slingo/')||cat.includes('slingo')||cats.includes('slingo'))return 'HYBRID_GAME_NO_EDGE_PATH_IDENTIFIED';
  return 'STATIC_RNG_NO_EDGE_PATH_IDENTIFIED';
};
const rows=games.map(g=>{
  const base=Number(g.rtpMaxPct||0),reward=Number(g.internalRewardFieldPct||0),conditional=base+reward;
  const mechanism=classify(g);
  return {
    id:String(g.internalGameId??g.externalGameId??`${g.name}|${g.provider}`),
    name:g.name,provider:g.provider||null,category:g.category||null,
    mechanism,
    publishedRtpPct:round(base),
    publishedHouseEdgePctPoints:round(Math.max(0,100-base)),
    internalRewardFieldPct:round(reward),
    conditionalCombinedPctIfOneToOneRewardMapping:round(conditional),
    requiredAdditionalReturnPctPointsAfterPublishedRtp:round(Math.max(0,100-base)),
    conditionalAdditionalReturnStillNeededPctPoints:round(Math.max(0,100-conditional)),
    baseAtOrAboveBreakEven:base>=100,
    conditionalAtOrAboveBreakEven:conditional>=100,
    nearBreakEvenConditional:conditional>=99.5,
    stateDependentResearchEligible:mechanism==='STATE_DEPENDENT_PROGRESSIVE',
    directEdgeClaimAllowed:false
  };
}).sort((a,b)=>a.conditionalAdditionalReturnStillNeededPctPoints-b.conditionalAdditionalReturnStillNeededPctPoints||b.publishedRtpPct-a.publishedRtpPct||String(a.name).localeCompare(String(b.name),'es'));
const byMechanism={};for(const r of rows)byMechanism[r.mechanism]=(byMechanism[r.mechanism]||0)+1;
const progressive=rows.filter(r=>r.mechanism==='STATE_DEPENDENT_PROGRESSIVE').sort((a,b)=>a.requiredAdditionalReturnPctPointsAfterPublishedRtp-b.requiredAdditionalReturnPctPointsAfterPublishedRtp);
const out={
  version:'mechanism-edge-screen-v1',generatedAt:new Date().toISOString(),operator:catalog.operator||'playuzu-es',
  formula:{baseGapPctPoints:'100 - publishedRtpPct',conditionalGapPctPoints:'100 - (publishedRtpPct + unconfirmedInternalRewardFieldPct)',promotionRule:'A game cannot be an edge candidate until a separately verified state/reward mechanism closes the gap and prospective lower-bound total EV exceeds 100%.',noVarianceGuarantee:true},
  summary:{gamesScreened:rows.length,baseAtOrAbove100:rows.filter(x=>x.baseAtOrAboveBreakEven).length,conditionalAtOrAbove100:rows.filter(x=>x.conditionalAtOrAboveBreakEven).length,nearBreakEvenConditional:rows.filter(x=>x.nearBreakEvenConditional).length,stateDependentProgressives:progressive.length,byMechanism},
  closestToBreakEven:rows.slice(0,25),
  progressivePriority:progressive.slice(0,50),
  rows,
  guards:{screeningIsNotEdge:true,internalRewardSemanticUnconfirmed:true,noBettingInstruction:true,noAutomaticBetting:true,realMoneyAllowed:false,realStakeEUR:0}
};
fs.mkdirSync('loterias-ai/casino/evidence',{recursive:true});fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify({summary:out.summary,top:out.closestToBreakEven.slice(0,5)},null,2));
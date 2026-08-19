#!/usr/bin/env node
import fs from 'node:fs';

const CAT='loterias-ai/casino/playuzu/evidence/validated-game-catalog-v1.json';
const OUT='loterias-ai/casino/playuzu/evidence/conditional-break-even-audit-v1.json';
const data=JSON.parse(fs.readFileSync(CAT,'utf8'));
const games=Array.isArray(data.games)?data.games:Array.isArray(data.uniqueGames)?data.uniqueGames:[];
if(!games.length) throw new Error('validated PlayUZU catalog has no games');

const rows=games.map(g=>{
  const rtp=Number(g.rtpMaxPct ?? g.rtp_max ?? g.rtpMax);
  const reward=Number(g.internalRewardFieldPct ?? g.ojo_plus_percent ?? g.internalPlusPercent);
  const conditional=Number.isFinite(rtp)&&Number.isFinite(reward)?Number((rtp+reward).toFixed(4)):null;
  return {
    name:g.name ?? g.applicationName ?? g.application_name ?? null,
    provider:g.provider ?? g.game_provider ?? null,
    category:g.category ?? null,
    rtpMaxPct:Number.isFinite(rtp)?rtp:null,
    internalRewardFieldPct:Number.isFinite(reward)?reward:null,
    conditionalCombinedPct:conditional,
    isJackpot:g.isJackpot===true || g.is_jackpot===true,
    isJackpotKing:g.isJackpotKing===true || g.is_jackpot_king===true,
    liveDealer:g.liveDealer===true || g.live_dealer===true,
  };
}).filter(r=>r.conditionalCombinedPct!==null)
  .sort((a,b)=>b.conditionalCombinedPct-a.conditionalCombinedPct || b.rtpMaxPct-a.rtpMaxPct || String(a.name).localeCompare(String(b.name)));

const atOrAbove100=rows.filter(r=>r.conditionalCombinedPct>=100);
const withinHalfPoint=rows.filter(r=>r.conditionalCombinedPct>=99.5);
const top=rows.slice(0,50);
const max=top[0]||null;
const payload={
  version:'conditional-break-even-audit-v1',
  generatedAt:new Date().toISOString(),
  sourceCatalog:CAT,
  purpose:'Upper-bound diagnostic only: test whether RTP plus the unconfirmed internal reward field could mathematically reach 100%.',
  summary:{
    validatedGames:Number(data.summary?.uniqueGames||games.length),
    scoredGames:rows.length,
    conditionalAtOrAbove100:atOrAbove100.length,
    conditionalAtOrAbove99_5:withinHalfPoint.length,
    maximumConditionalCombinedPct:max?.conditionalCombinedPct??null,
    maximumGame:max?.name??null,
    maximumBaseRtpPct:max?.rtpMaxPct??null,
    maximumInternalRewardFieldPct:max?.internalRewardFieldPct??null,
    minimumExtraPctPointsStillNeeded:max?Number((100-max.conditionalCombinedPct).toFixed(4)):null
  },
  candidatesAtOrAbove100:atOrAbove100,
  candidatesAtOrAbove99_5:withinHalfPoint,
  topConditional:top,
  interpretation:{
    internalRewardFieldSemanticsConfirmedAsCurrentSpanishUZUplus:false,
    economicUseAllowed:false,
    ifNoCandidateAtOrAbove100:'Even the optimistic conditional upper bound does not reach break-even; do not pursue RTP-plus-internal-field as a positive-EV mechanism.',
    ifCandidateAtOrAbove100:'Candidate remains research-only until reward semantics, eligibility, game rules and Spanish applicability are independently verified.'
  },
  guards:{
    officialValidatedCatalogOnly:true,
    noFutureInformation:true,
    noPatternAssumption:true,
    noBetting:true,
    automaticBettingAllowed:false,
    realMoneyAllowed:false,
    realStakeEUR:0
  }
};
fs.mkdirSync('loterias-ai/casino/playuzu/evidence',{recursive:true});
fs.writeFileSync(OUT,JSON.stringify(payload,null,2)+'\n');
console.log(JSON.stringify({summary:payload.summary,top:top.slice(0,5)},null,2));

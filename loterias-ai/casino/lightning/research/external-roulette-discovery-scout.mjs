#!/usr/bin/env node
import fs from 'node:fs';

const OUT='loterias-ai/casino/lightning/evidence/external-roulette-discovery-scout.json';
const BASE='https://livecasinodata.com/api/v1';
const get=async url=>{const r=await fetch(url,{headers:{accept:'application/json','user-agent':'LoteriasAI discovery-only roulette scout'},signal:AbortSignal.timeout(20000)});if(!r.ok)throw new Error(`HTTP ${r.status}`);return r.json();};

const [gamesPayload,fairnessPayload]=await Promise.all([
  get(`${BASE}/games?window=30d`),
  get(`${BASE}/fairness`)
]);
const fairnessBySlug=new Map((fairnessPayload.games||[]).map(x=>[String(x.slug||''),x]));
const games=(gamesPayload.games||[])
  .filter(g=>String(g.category||'').toLowerCase()==='roulette'||/roulette/i.test(String(g.name||'')))
  .map(g=>{
    const f=fairnessBySlug.get(String(g.slug||''))||{};
    const d30=g.stats?.d30||{};
    const rounds=Number(d30.total_rounds||f.total_rounds_30d||0);
    const observed=Number(f.observed_bonus_rate_pct);
    const theoretical=Number(f.theoretical_bonus_rate_pct??g.theoretical_bonus_rate_pct);
    const deviation=Number(f.bonus_deviation_pct);
    return {
      slug:g.slug,
      name:g.name,
      provider:g.provider,
      rounds30d:rounds,
      lcfiScore:Number(d30.lcfi_score??f.lcfi_score??0)||null,
      observedBonusRatePct:Number.isFinite(observed)?observed:null,
      theoreticalBonusRatePct:Number.isFinite(theoretical)?theoretical:null,
      reportedBonusDeviationPct:Number.isFinite(deviation)?deviation:null,
      discoveryPriorityScore:(Number.isFinite(deviation)?Math.abs(deviation):0)*Math.sqrt(Math.max(1,rounds)),
      candidateForRawProspective:rounds>=5000
    };
  })
  .sort((a,b)=>b.discoveryPriorityScore-a.discoveryPriorityScore||b.rounds30d-a.rounds30d);

const payload={
  version:'external-roulette-discovery-scout-v1',
  generatedAt:new Date().toISOString(),
  mode:'DISCOVERY_ONLY_EXTERNAL_AGGREGATES',
  source:{provider:'LiveCasinoData',api:`${BASE}/games and ${BASE}/fairness`,license:String(gamesPayload.meta?.license||'CC BY 4.0'),rawRoundDataUsed:false},
  rouletteGamesTracked:games.length,
  ranking:games,
  lightningFamily:games.filter(x=>/lightning/i.test(String(x.name||x.slug||''))),
  policy:{
    aggregateStatisticsAreNotPromotionEvidence:true,
    noPValueClaimFromExternalScore:true,
    noCrossTablePooling:true,
    independentRawRoundProspectiveRequired:true,
    externalRankingMayOnlyPrioritizeFutureResearch:true,
    automaticBettingAllowed:false,
    realMoneyAllowed:false,
    realStakeEUR:0
  }
};
fs.mkdirSync('loterias-ai/casino/lightning/evidence',{recursive:true});
fs.writeFileSync(OUT,JSON.stringify(payload,null,2)+'\n');
console.log(JSON.stringify({rouletteGamesTracked:payload.rouletteGamesTracked,lightningFamily:payload.lightningFamily.map(x=>x.slug),realMoneyAllowed:false},null,2));

#!/usr/bin/env node
import fs from 'node:fs';
const IN='loterias-ai/casino/playuzu/evidence/validated-game-catalog-v1.json';
const OUT='loterias-ai/casino/playuzu/evidence/economic-specialist-priority-v2.json';
const d=JSON.parse(fs.readFileSync(IN,'utf8'));
const games=d.games||[];
const gap=g=>Number.isFinite(Number(g.rtpMaxPct))?Number((100-Number(g.rtpMaxPct)).toFixed(4)):null;
const priority=g=>{
  const r=Number(g.rtpMaxPct||0),jack=!!(g.isJackpot||g.isJackpotKing||g.dailyJackpot),cat=String(g.category||'');
  if(r>=99.4)return 1000+r;
  if(jack)return 700+r;
  if(/blackjack/i.test(cat))return 650+r;
  if(/roulette|ruleta/i.test(cat))return 500+r;
  if(/crash/i.test(cat))return 450+r;
  return 100+r;
};
const ranked=games.map(g=>({...g,distanceTo100PctPoints:gap(g),priorityScore:Number(priority(g).toFixed(4))})).sort((a,b)=>b.priorityScore-a.priorityScore||Number(b.rtpMaxPct||0)-Number(a.rtpMaxPct||0));
const jackpots=ranked.filter(g=>g.isJackpot||g.isJackpotKing||g.dailyJackpot).sort((a,b)=>Number(b.rtpMaxPct||0)-Number(a.rtpMaxPct||0));
const highRtp=ranked.filter(g=>Number(g.rtpMaxPct)>=98).sort((a,b)=>Number(b.rtpMaxPct)-Number(a.rtpMaxPct));
const payload={version:'economic-specialist-priority-v2',generatedAt:new Date().toISOString(),sourceCatalog:IN,policy:{internalRewardFieldExcludedFromEconomicRanking:true,reason:'ojo_plus_percent semantic mapping to current Spanish UZUplus is not fully confirmed',stateDependentMechanismsPrioritized:true,noPatternAssumption:true},summary:{validatedGames:games.length,jackpots:jackpots.length,rtpAtLeast98:highRtp.length,rtpAtLeast99:highRtp.filter(x=>x.rtpMaxPct>=99).length,rtpAtLeast99_4:highRtp.filter(x=>x.rtpMaxPct>=99.4).length},topOverall:ranked.slice(0,40).map(g=>({name:g.name,provider:g.provider,category:g.category,rtpMaxPct:g.rtpMaxPct,distanceTo100PctPoints:g.distanceTo100PctPoints,isJackpot:g.isJackpot||g.isJackpotKing||g.dailyJackpot,internalRewardFieldPct:g.internalRewardFieldPct,priorityScore:g.priorityScore})),topJackpots:jackpots.slice(0,40).map(g=>({name:g.name,provider:g.provider,category:g.category,rtpMaxPct:g.rtpMaxPct,distanceTo100PctPoints:g.distanceTo100PctPoints,internalRewardFieldPct:g.internalRewardFieldPct,isJackpotKing:g.isJackpotKing,dailyJackpot:g.dailyJackpot})),highRtp:highRtp.slice(0,100).map(g=>({name:g.name,provider:g.provider,category:g.category,rtpMaxPct:g.rtpMaxPct,distanceTo100PctPoints:g.distanceTo100PctPoints,isJackpot:g.isJackpot||g.isJackpotKing||g.dailyJackpot,internalRewardFieldPct:g.internalRewardFieldPct})),guards:{researchOnly:true,noInternalRewardAddedToRtp:true,noBetting:true,realMoneyAllowed:false}};
fs.writeFileSync(OUT,JSON.stringify(payload,null,2)+'\n');console.log(JSON.stringify({summary:payload.summary,topOverall:payload.topOverall.slice(0,10),topJackpots:payload.topJackpots.slice(0,10)},null,2));
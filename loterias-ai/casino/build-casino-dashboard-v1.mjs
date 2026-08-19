#!/usr/bin/env node
import fs from 'node:fs';

const read=p=>{try{return JSON.parse(fs.readFileSync(p,'utf8'));}catch{return null}};
const CAT='loterias-ai/casino/playuzu/evidence/validated-game-catalog-v1.json';
const SPEC='loterias-ai/casino/playuzu/evidence/validated-game-specialists-v1.json';
const BREAK='loterias-ai/casino/playuzu/evidence/conditional-break-even-audit-v1.json';
const SEG='loterias-ai/casino/lightning/evidence/authoritative-segment-v2-status.json';
const TIM='loterias-ai/casino/lightning/evidence/timing-replication-v3-status.json';
const LAG='loterias-ai/casino/lightning/evidence/prospective-lag8-clean-v2-status-v1.json';
const READY='loterias-ai/casino/lightning/evidence/economic-readiness-ledger-v1.json';
const OUT='loterias-ai/casino/evidence/casino-dashboard-v1.json';
const catalog=read(CAT)||{},spec=read(SPEC)||{},br=read(BREAK)||{},seg=read(SEG)||{},tim=read(TIM)||{},lag=read(LAG)||{},ready=read(READY)||{};
const games=Array.isArray(catalog.games)?catalog.games:[];
const fieldsFor=g=>{const out=[];const cat=String(g.category||'');const cats=(g.categories||[]).join(' ');const src=String(g.sourcePage||'');if(/roulette|ruleta/i.test(cat)||/roulette|ruleta/i.test(cats))out.push('roulette');if(src.includes('/slots/'))out.push('slots');if(/blackjack/i.test(cat)||/blackjack/i.test(cats))out.push('blackjack');if(/crash/i.test(cat)||src.includes('/crash-games/'))out.push('crash');if(g.isJackpot||g.isJackpotKing||g.dailyJackpot)out.push('jackpots');if(src.includes('/slingo/')||/slingo/i.test(cat)||/slingo/i.test(cats))out.push('slingo');return [...new Set(out)]};
const count=f=>games.filter(g=>fieldsFor(g).includes(f)).length;
const fields={
  roulette:{id:'roulette',label:'Ruletas',count:count('roulette'),icon:'roulette-wheel',special:true},
  slots:{id:'slots',label:'Slots',count:count('slots'),icon:'slots'},
  blackjack:{id:'blackjack',label:'Blackjack',count:count('blackjack'),icon:'cards'},
  crash:{id:'crash',label:'Crash',count:count('crash'),icon:'rocket'},
  jackpots:{id:'jackpots',label:'Jackpots',count:count('jackpots'),icon:'jackpot'},
  slingo:{id:'slingo',label:'Slingo',count:count('slingo'),icon:'grid'}
};
const rouletteGames=games.filter(g=>fieldsFor(g).includes('roulette')).sort((a,b)=>Number(b.rtpMaxPct||0)-Number(a.rtpMaxPct||0)||String(a.name).localeCompare(String(b.name))).slice(0,12).map(g=>({name:g.name,provider:g.provider,rtpMaxPct:g.rtpMaxPct,liveDealer:!!g.liveDealer,minBet:g.minBet,maxBet:g.maxBet,isJackpot:!!(g.isJackpot||g.isJackpotKing||g.dailyJackpot)}));
const payload={
  version:'casino-dashboard-v1',generatedAt:new Date().toISOString(),
  catalog:{operator:catalog.operator||'playuzu-es',validatedGames:Number(catalog.summary?.uniqueGames||0),validatedRtp:Number(catalog.summary?.withRtp||0),specialists:Number(spec.summary?.specialists||0),fieldCountSemantics:'FILTERABLE_MECHANISM_MEMBERSHIP_WITH_OVERLAPS',fields},
  roulette:{specialSection:true,validatedSpecialists:Number(spec.summary?.byClass?.ROULETTE||0),visibleFieldGames:fields.roulette.count,topGames:rouletteGames,lightning:{cleanRows:Number(seg.rows||seg.progress?.eligibleRows||tim.progress?.eligibleRows||0),bridgeSafe:seg.continuity?.bridgeSafe===true,timing:{used:Number(tim.progress?.closedEpisodes||0),boundary:Number(tim.progress?.fixedBoundaryClosedEpisodes||200),remaining:Number(tim.progress?.remainingClosedEpisodes||0),performanceHidden:tim.disclosure?.performanceHidden!==false,finalAvailable:!!tim.final},lag8:{used:Number(lag.progress?.comparisonsUsed||0),boundary:Number(lag.progress?.fixedBoundaryComparisons||1000),remaining:Number(lag.progress?.comparisonsRemaining||0),performanceHidden:lag.disclosure?.performanceHidden!==false,finalAvailable:!!lag.final}}},
  economics:{validatedPositiveEdge:false,rtpPlusInternalRewardShortcut:{testedGames:Number(br.summary?.scoredGames||0),atOrAbove100:Number(br.summary?.conditionalAtOrAbove100||0),maxConditionalCombinedPct:Number(br.summary?.maximumConditionalCombinedPct||0),minimumExtraPctPointsStillNeeded:Number(br.summary?.minimumExtraPctPointsStillNeeded||0)},progressiveNetworks:{jackpotKing:ready.progressiveNetworks?.jackpotKing||null,ageOfGods:ready.progressiveNetworks?.ageOfGods||null}},
  policy:{paperOnly:true,realMoneyAllowed:false,automaticBettingAllowed:false,progressIsNotEvidence:true,hiddenInterimPerformanceMustRemainHidden:true}
};
fs.mkdirSync('loterias-ai/casino/evidence',{recursive:true});
fs.writeFileSync(OUT,JSON.stringify(payload,null,2)+'\n');
console.log(JSON.stringify({generatedAt:payload.generatedAt,catalog:payload.catalog,roulette:payload.roulette.lightning,economics:payload.economics.rtpPlusInternalRewardShortcut},null,2));
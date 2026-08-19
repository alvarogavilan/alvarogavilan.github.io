#!/usr/bin/env node
import fs from 'node:fs';
const SRC='loterias-ai/casino/playuzu/evidence/validated-game-catalog-v1.json';
const OUT='loterias-ai/casino/evidence/casino-catalog-ui-v1.json';
const c=JSON.parse(fs.readFileSync(SRC,'utf8'));
const games=Array.isArray(c.games)?c.games:[];
const fieldsFor=g=>{const out=[];const cat=String(g.category||'');const cats=(g.categories||[]).join(' ');const src=String(g.sourcePage||'');if(/roulette|ruleta/i.test(cat)||/roulette|ruleta/i.test(cats))out.push('roulette');if(src.includes('/slots/'))out.push('slots');if(/blackjack/i.test(cat)||/blackjack/i.test(cats))out.push('blackjack');if(/crash/i.test(cat)||src.includes('/crash-games/'))out.push('crash');if(g.isJackpot||g.isJackpotKing||g.dailyJackpot)out.push('jackpots');if(src.includes('/slingo/')||/slingo/i.test(cat)||/slingo/i.test(cats))out.push('slingo');return [...new Set(out.length?out:['other'])]};
const rows=games.map(g=>({id:String(g.internalGameId??g.externalGameId??`${g.name}|${g.provider}`),name:g.name,provider:g.provider||'—',studio:g.studio||null,fields:fieldsFor(g),category:g.category||null,rtpMinPct:g.rtpMinPct,rtpMaxPct:g.rtpMaxPct,internalRewardFieldPct:g.internalRewardFieldPct,minBet:g.minBet,maxBet:g.maxBet,isJackpot:!!(g.isJackpot||g.isJackpotKing||g.dailyJackpot),isJackpotKing:!!g.isJackpotKing,liveDealer:!!g.liveDealer,volatility:g.volatility||null})).sort((a,b)=>String(a.name).localeCompare(String(b.name),'es'));
const fieldIds=['roulette','slots','blackjack','crash','jackpots','slingo'];
const summary=Object.fromEntries(fieldIds.map(f=>[f,rows.filter(x=>x.fields.includes(f)).length]));
const out={version:'casino-catalog-ui-v1',generatedAt:new Date().toISOString(),operator:c.operator||'playuzu-es',validatedGames:rows.length,summary,rows,guards:{displayOnly:true,rtpIsPublishedConfigurationDataNotEdge:true,noBetting:true,realMoneyAllowed:false}};
fs.mkdirSync('loterias-ai/casino/evidence',{recursive:true});fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify({validatedGames:out.validatedGames,summary},null,2));
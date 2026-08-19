#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';
const URL='https://www.playuzu.es/blackjack/';
const OUT='loterias-ai/casino/playuzu/evidence/blackjack-catalog-state-probe-v1.json';
const r=await fetch(URL,{headers:{accept:'text/html,application/xhtml+xml','user-agent':'loterias-ai-playuzu-blackjack-probe/1.0','cache-control':'no-cache, no-store'}});
const html=await r.text();
const plain=html.replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#160;/gi,' ').replace(/&amp;/gi,'&').replace(/\s+/g,' ').trim();
const contexts=(rx,src=html,limit=150,span=450)=>[...src.matchAll(rx)].slice(0,limit).map(m=>({match:m[0].slice(0,160),index:m.index,context:src.slice(Math.max(0,m.index-span),Math.min(src.length,m.index+span)).replace(/\s+/g,' ')}));
const signals={
 blackjack:contexts(/blackjack/gi),
 uzuplus:contexts(/uzu(?:\+|plus|Plus)/gi),
 rtp:contexts(/(?:rtp|returnToPlayer|return_to_player|payoutPercentage)/gi),
 provider:contexts(/(?:provider|developer|vendor|gameProvider)/gi),
 gameId:contexts(/(?:gameId|game_id|casinoGameId|productId|gameCode)/gi),
 percentage:contexts(/(?:cashback|rewardRate|returnPercentage|uzuplusPercentage|uzuPlusPercentage)[^\n]{0,250}/gi)
};
const hrefs=[...new Set([...html.matchAll(/href=["']([^"']+)["']/gi)].map(m=>m[1]).filter(x=>/blackjack|casino\/game|\/game\//i.test(x)))];
const urls=[...new Set([...html.matchAll(/https?:\/\/[^"'<>\s]+/g)].map(m=>m[0].replace(/\\u002F/g,'/').replace(/\\\//g,'/')))];
const scripts=[...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)].map(m=>m[1]).filter(x=>/blackjack|gameId|uzuplus|rtp/i.test(x));
const payload={version:'blackjack-catalog-state-probe-v1',generatedAt:new Date().toISOString(),source:URL,httpStatus:r.status,finalUrl:r.url,responseSha256:crypto.createHash('sha256').update(html).digest('hex'),summary:{hrefs:hrefs.length,relevantUrls:urls.filter(u=>/api|game|blackjack|catalog|casino/i.test(u)).length,relevantScripts:scripts.length,blackjackSignals:signals.blackjack.length,uzuplusSignals:signals.uzuplus.length,rtpSignals:signals.rtp.length,gameIdSignals:signals.gameId.length,cashbackFieldSignals:signals.percentage.length},hrefs:hrefs.slice(0,200),relevantUrls:urls.filter(u=>/api|game|blackjack|catalog|casino/i.test(u)).slice(0,200),signals,relevantScripts:scripts.slice(0,20).map((x,i)=>({index:i,sha256:crypto.createHash('sha256').update(x).digest('hex'),snippet:x.slice(0,12000)})),guards:{officialPlayUZUOnly:true,noLoginBypass:true,noBetting:true,noEconomicClaimFromProbe:true,realMoneyAllowed:false}};
fs.mkdirSync('loterias-ai/casino/playuzu/evidence',{recursive:true});fs.writeFileSync(OUT,JSON.stringify(payload,null,2)+'\n');console.log(JSON.stringify(payload.summary,null,2));
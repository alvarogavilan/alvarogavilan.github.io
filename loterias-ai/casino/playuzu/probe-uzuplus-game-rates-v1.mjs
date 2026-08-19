#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';
const URL='https://www.playuzu.es/especiales/uzu-plus/';
const OUT='loterias-ai/casino/playuzu/evidence/uzuplus-game-rates-probe-v1.json';
const r=await fetch(URL,{headers:{accept:'text/html,application/xhtml+xml','user-agent':'loterias-ai-uzuplus-probe/1.0','cache-control':'no-cache, no-store'}});
const html=await r.text();
const text=html.replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#160;/gi,' ').replace(/&amp;/gi,'&').replace(/\s+/g,' ').trim();
const percentages=[...text.matchAll(/(\d+(?:[.,]\d+)?)\s*%/g)].map(m=>({value:Number(m[1].replace(',','.'))/100,index:m.index,raw:m[0],context:text.slice(Math.max(0,m.index-180),Math.min(text.length,m.index+220))})).filter(x=>Number.isFinite(x.value)&&x.value>=0&&x.value<=1);
const htmlPercentages=[...html.matchAll(/(\d+(?:[.,]\d+)?)\s*%/g)].map(m=>({value:Number(m[1].replace(',','.'))/100,index:m.index,raw:m[0],context:html.slice(Math.max(0,m.index-250),Math.min(html.length,m.index+350)).replace(/\s+/g,' ')})).filter(x=>Number.isFinite(x.value)&&x.value>=0&&x.value<=1);
const urls=[...new Set([...html.matchAll(/https?:\/\/[^"'<>\s]+/g)].map(m=>m[0].replace(/\\u002F/g,'/').replace(/\\\//g,'/')))];
const blackjackMentions=[...text.matchAll(/blackjack/gi)].map(m=>({index:m.index,context:text.slice(Math.max(0,m.index-220),Math.min(text.length,m.index+260))}));
const jsonSignals=[...html.matchAll(/(?:cashback|uzuplus|uzuPlus|returnPercentage|percentage|rewardRate)[^\n]{0,250}/gi)].map(m=>m[0].slice(0,500));
const payload={version:'uzuplus-game-rates-probe-v1',generatedAt:new Date().toISOString(),source:URL,httpStatus:r.status,finalUrl:r.url,responseSha256:crypto.createHash('sha256').update(html).digest('hex'),summary:{textPercentages:percentages.length,htmlPercentages:htmlPercentages.length,blackjackMentions:blackjackMentions.length,jsonSignals:jsonSignals.length},textPercentages:percentages.slice(0,100),htmlPercentages:htmlPercentages.slice(0,150),blackjackMentions:blackjackMentions.slice(0,30),jsonSignals:jsonSignals.slice(0,100),urls:urls.filter(u=>/playuzu|uzu|api|game|casino/i.test(u)).slice(0,100),guards:{officialPlayUZUOnly:true,noLoginBypass:true,noBetting:true,noEconomicClaimFromProbeAlone:true,realMoneyAllowed:false}};
fs.mkdirSync('loterias-ai/casino/playuzu/evidence',{recursive:true});fs.writeFileSync(OUT,JSON.stringify(payload,null,2)+'\n');console.log(JSON.stringify(payload.summary,null,2));
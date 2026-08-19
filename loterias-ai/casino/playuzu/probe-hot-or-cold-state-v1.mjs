#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';
const URL='https://www.playuzu.es/especiales/hot-or-cold/';
const OUT='loterias-ai/casino/playuzu/evidence/hot-or-cold-state-probe-v1.json';
const r=await fetch(URL,{headers:{accept:'text/html,application/xhtml+xml','user-agent':'loterias-ai-hot-cold-probe/1.0','cache-control':'no-cache, no-store'}});
const html=await r.text();
const text=html.replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#160;/gi,' ').replace(/&amp;/gi,'&').replace(/\s+/g,' ').trim();
const stateTerms=[...text.matchAll(/\b(HOT|COLD|caliente|fr[ií]o|llama|copo)\b/gi)].map(m=>({term:m[0],index:m.index,context:text.slice(Math.max(0,m.index-180),Math.min(text.length,m.index+260))}));
const scriptSignals=[...html.matchAll(/(?:hot|cold|payout|reward|lastWin|highestReward|gameName|gameId|provider)[^\n]{0,300}/gi)].map(m=>m[0].slice(0,600));
const urls=[...new Set([...html.matchAll(/https?:\/\/[^"'<>\s]+/g)].map(m=>m[0].replace(/\\u002F/g,'/').replace(/\\\//g,'/')))];
const gameLinks=[...new Set([...html.matchAll(/href=["']([^"']*(?:\/slots\/|\/casino\/|\/game\/)[^"']*)["']/gi)].map(m=>m[1]).filter(Boolean))];
const payload={version:'hot-or-cold-state-probe-v1',generatedAt:new Date().toISOString(),source:URL,httpStatus:r.status,finalUrl:r.url,responseSha256:crypto.createHash('sha256').update(html).digest('hex'),summary:{stateTerms:stateTerms.length,scriptSignals:scriptSignals.length,gameLinks:gameLinks.length,relevantUrls:urls.filter(u=>/api|hot|cold|game|casino|playuzu/i.test(u)).length},stateTerms:stateTerms.slice(0,100),scriptSignals:scriptSignals.slice(0,120),gameLinks:gameLinks.slice(0,100),relevantUrls:urls.filter(u=>/api|hot|cold|game|casino|playuzu/i.test(u)).slice(0,120),guards:{officialPlayUZUOnly:true,noLoginBypass:true,noBetting:true,noPredictionClaimFromProbe:true,realMoneyAllowed:false}};
fs.mkdirSync('loterias-ai/casino/playuzu/evidence',{recursive:true});fs.writeFileSync(OUT,JSON.stringify(payload,null,2)+'\n');console.log(JSON.stringify(payload.summary,null,2));
#!/usr/bin/env node
import fs from 'node:fs';
const IN='loterias-ai/casino/jackpots/evidence/botemania-jpk-lazy-chunk-feed-probe-v1.json';
const OUT='loterias-ai/casino/jackpots/evidence/botemania-jpk-lazy-chunk-feed-summary-v1.json';
const j=JSON.parse(fs.readFileSync(IN,'utf8'));
const keyChunks=(j.chunks||[]).filter(x=>/containers-(?:WinnersContainer|BlueprintJackpots|HeadlessJackpots|DoubleJackpots)-index-js|DoubleJackpots-MustDropWithin|WinnersCarousel|WinnersContainer/i.test(String(x.name||''))).map(x=>({id:x.id,name:x.name,url:x.url,httpStatus:x.httpStatus,bytes:x.bytes,hitTerms:x.hitTerms||[]}));
const out={version:'botemania-jpk-lazy-chunk-feed-summary-v1.1-compact',generatedAt:new Date().toISOString(),operator:'botemania-es',source:IN,keyChunks,candidateOperationNames:j.candidateOperationNames||[],candidateFields:j.candidateFields||[],decision:j.decision||{},guards:{summaryOnly:true,noNetworkMutation:true,noAuthentication:true,noGraphqlIntrospection:true,noBetting:true,realMoneyAllowed:false}};
fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify(out,null,2));

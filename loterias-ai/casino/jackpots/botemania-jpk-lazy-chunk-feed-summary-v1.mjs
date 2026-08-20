#!/usr/bin/env node
import fs from 'node:fs';
const IN='loterias-ai/casino/jackpots/evidence/botemania-jpk-lazy-chunk-feed-probe-v1.json';
const OUT='loterias-ai/casino/jackpots/evidence/botemania-jpk-lazy-chunk-feed-summary-v1.json';
const j=JSON.parse(fs.readFileSync(IN,'utf8'));
const interesting=(j.chunks||[]).filter(x=>/Winners|BlueprintJackpots|HeadlessJackpots|DoubleJackpots|MustDropWithin/i.test(String(x.name||''))).map(x=>({id:x.id,name:x.name,url:x.url,httpStatus:x.httpStatus,bytes:x.bytes,hitTerms:x.hitTerms||[]}));
const contexts=(j.contexts||[]).filter(x=>/Winners|BlueprintJackpots|HeadlessJackpots|DoubleJackpots|MustDropWithin/i.test(String(x.chunk||'')) && /winner|jackpot|amount|history|date/i.test(String(x.term||''))).slice(0,80);
const out={version:'botemania-jpk-lazy-chunk-feed-summary-v1',generatedAt:new Date().toISOString(),operator:'botemania-es',source:IN,interestingChunks:interesting,candidateOperationNames:j.candidateOperationNames||[],candidateFields:j.candidateFields||[],decision:j.decision||{},contexts,guards:{summaryOnly:true,noNetworkMutation:true,noAuthentication:true,noGraphqlIntrospection:true,noBetting:true,realMoneyAllowed:false}};
fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({interestingChunks:interesting.map(x=>x.name),candidateOperationNames:out.candidateOperationNames,candidateFields:out.candidateFields,decision:out.decision},null,2));

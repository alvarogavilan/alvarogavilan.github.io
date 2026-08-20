#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';
const SUM='loterias-ai/casino/jackpots/evidence/botemania-jpk-lazy-chunk-feed-summary-v1.json';
const OUT='loterias-ai/casino/jackpots/evidence/botemania-headless-jackpots-query-extractor-v2.json';
const s=JSON.parse(fs.readFileSync(SUM,'utf8'));
const targets=(s.keyChunks||[]).filter(x=>/containers-HeadlessJackpots-index-js|components-HeadlessJackpots(?:$|-jackpot-item)/i.test(String(x.name||'')));
const chunks=[];const operations=new Set(),fields=new Set(),contexts=[];
for(const t of targets){
 const r=await fetch(t.url,{headers:{accept:'application/javascript,*/*','user-agent':'loterias-ai-headless-jackpots-query-extractor/2.0','cache-control':'no-cache'},redirect:'follow'}),text=await r.text();
 for(const re of [/operationName\s*[:=]\s*["']([A-Za-z0-9_]+)["']/gi,/operation:\"query\",name:\{kind:\"Name\",value:\"([A-Za-z0-9_]+)\"/gi,/query\s+([A-Za-z0-9_]+)\s*[({]/gi])for(const m of text.matchAll(re))operations.add(m[1]);
 for(const re of [/value:\"([A-Za-z0-9_]*(?:jackpot|amount|currency|game|name|id|threshold|max|min|must)[A-Za-z0-9_]*)\"/gi])for(const m of text.matchAll(re))fields.add(m[1]);
 for(const needle of ['query','headlessJackpots','jackpot','amount','currency','threshold','mustDrop']){let p=0;while(contexts.length<80){const i=text.toLowerCase().indexOf(needle.toLowerCase(),p);if(i<0)break;contexts.push({chunk:t.name,needle,index:i,context:text.slice(Math.max(0,i-1000),Math.min(text.length,i+2500))});p=i+needle.length;}}
 chunks.push({name:t.name,url:t.url,httpStatus:r.status,bytes:text.length,sha256:crypto.createHash('sha256').update(text).digest('hex')});
}
const out={version:'botemania-headless-jackpots-query-extractor-v2',generatedAt:new Date().toISOString(),operator:'botemania-es',chunks,candidateOperationNames:[...operations],candidateFields:[...fields].slice(0,150),contexts,decision:{queryOperationRecovered:operations.size>0,safeToProbeReadOnly:false,reason:'EXACT_QUERY_SHAPE_REVIEW_REQUIRED_BEFORE_NETWORK_CALL',realMoneyAllowed:false},guards:{publicStaticBundlesOnly:true,noGraphqlIntrospection:true,noMutationInvocation:true,noAuthentication:true,noCookies:true,noBetting:true,realMoneyAllowed:false}};
fs.mkdirSync('loterias-ai/casino/jackpots/evidence',{recursive:true});fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify({operations:[...operations],fields:[...fields],decision:out.decision},null,2));

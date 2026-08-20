#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';
const SUM='loterias-ai/casino/jackpots/evidence/botemania-jpk-lazy-chunk-feed-summary-v1.json';
const OUT='loterias-ai/casino/jackpots/evidence/botemania-double-jackpots-query-extractor-v1.json';
const s=JSON.parse(fs.readFileSync(SUM,'utf8'));
const targets=(s.keyChunks||[]).filter(x=>/containers-DoubleJackpots-index-js|DoubleJackpots-MustDropWithin/i.test(String(x.name||'')));
const chunks=[];const operations=new Set(),fields=new Set(),contexts=[];
for(const t of targets){
 const r=await fetch(t.url,{headers:{accept:'application/javascript,*/*','user-agent':'loterias-ai-double-jackpots-query-extractor/1.0','cache-control':'no-cache'},redirect:'follow'}),text=await r.text();
 for(const re of [/operationName\s*[:=]\s*["']([A-Za-z0-9_]+)["']/gi,/operation:\"query\",name:\{kind:\"Name\",value:\"([A-Za-z0-9_]+)\"/gi,/query\s+([A-Za-z0-9_]+)\s*[({]/gi])for(const m of text.matchAll(re))operations.add(m[1]);
 for(const re of [/value:\"([A-Za-z0-9_]*(?:jackpot|amount|drop|must|threshold|max|min)[A-Za-z0-9_]*)\"/gi,/\b([A-Za-z0-9_]*(?:jackpot|amount|drop|must|threshold|max|min)[A-Za-z0-9_]*)\b/gi])for(const m of text.matchAll(re))fields.add(m[1]);
 for(const needle of ['query','MustDropWithin','mustDrop','jackpot','amount']){let p=0;while(contexts.length<40){const i=text.toLowerCase().indexOf(needle.toLowerCase(),p);if(i<0)break;contexts.push({chunk:t.name,needle,index:i,context:text.slice(Math.max(0,i-900),Math.min(text.length,i+2200))});p=i+needle.length;}}
 chunks.push({name:t.name,url:t.url,httpStatus:r.status,bytes:text.length,sha256:crypto.createHash('sha256').update(text).digest('hex')});
}
const out={version:'botemania-double-jackpots-query-extractor-v1',generatedAt:new Date().toISOString(),operator:'botemania-es',chunks,candidateOperationNames:[...operations],candidateFields:[...fields].slice(0,120),contexts,decision:{queryOperationRecovered:operations.size>0,mustDropFieldRecovered:[...fields].some(x=>/drop|must|threshold|max/i.test(x)),safeToProbeReadOnly:false,reason:'EXPLICIT_QUERY_SHAPE_REVIEW_REQUIRED'},guards:{publicStaticBundlesOnly:true,noGraphqlIntrospection:true,noMutationInvocation:true,noAuthentication:true,noCookies:true,noBetting:true,realMoneyAllowed:false}};
fs.mkdirSync('loterias-ai/casino/jackpots/evidence',{recursive:true});fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify({operations:[...operations],fields:[...fields],decision:out.decision},null,2));

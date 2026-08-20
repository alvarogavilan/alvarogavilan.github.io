#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';
const SUM='loterias-ai/casino/jackpots/evidence/botemania-jpk-lazy-chunk-feed-summary-v1.json';
const OUT='loterias-ai/casino/jackpots/evidence/botemania-headless-jackpot-param-extractor-v1.json';
const s=JSON.parse(fs.readFileSync(SUM,'utf8'));
const chunks=(s.keyChunks||[]).filter(x=>/HeadlessJackpots|GameHero|DoubleJackpots/i.test(String(x.name||''))&&x.url);
if(!chunks.length)throw new Error('No relevant public chunks recovered');
const needles=['jackpotId','jackpotsParams','jackpotName','jackpotname','headlessJackpots','GameProductSkinName','gameId','gameSkin','jackpots'];
const rows=[];
for(const c of chunks){
 try{
  const r=await fetch(c.url,{headers:{accept:'application/javascript,*/*','user-agent':'loterias-ai-headless-param-extractor/1.0','cache-control':'no-cache'},redirect:'follow'}),text=await r.text();
  const contexts=[];
  for(const needle of needles){let p=0,n=0;while(n<12){const i=text.indexOf(needle,p);if(i<0)break;contexts.push({needle,index:i,context:text.slice(Math.max(0,i-1000),Math.min(text.length,i+2200))});p=i+needle.length;n++;}}
  const gql=[];for(const m of text.matchAll(/(?:query|mutation)\s+[A-Za-z0-9_]+[\s\S]{0,2200?}/g))gql.push(m[0].slice(0,2600));
  rows.push({name:c.name,url:c.url,httpStatus:r.status,bytes:text.length,sha256:crypto.createHash('sha256').update(text).digest('hex'),contexts,gqlTemplates:[...new Set(gql)].slice(0,20)});
 }catch(e){rows.push({name:c.name,url:c.url,error:String(e?.message||e)});}
}
const combined=rows.flatMap(x=>x.contexts||[]);
const out={version:'botemania-headless-jackpot-param-extractor-v1',generatedAt:new Date().toISOString(),operator:'botemania-es',sourceChunks:rows.map(x=>({name:x.name,url:x.url,httpStatus:x.httpStatus,bytes:x.bytes,sha256:x.sha256,error:x.error||null})),contexts:combined,gqlTemplates:rows.flatMap(x=>x.gqlTemplates||[]),decision:{jackpotIdContractEvidence:combined.some(x=>x.needle==='jackpotId'),jackpotsParamsContractEvidence:combined.some(x=>x.needle==='jackpotsParams'),gameLinkageEvidence:combined.some(x=>['GameProductSkinName','gameId','gameSkin'].includes(x.needle)),safeForReadOnlyFollowup:true,realMoneyAllowed:false},guards:{publicStaticBundlesOnly:true,noGraphqlIntrospection:true,noMutationInvocation:true,noAuthentication:true,noCookies:true,noBetting:true,realMoneyAllowed:false}};
fs.mkdirSync('loterias-ai/casino/jackpots/evidence',{recursive:true});fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify({decision:out.decision,sourceChunks:out.sourceChunks,hitCounts:Object.fromEntries(needles.map(n=>[n,combined.filter(x=>x.needle===n).length]))},null,2));

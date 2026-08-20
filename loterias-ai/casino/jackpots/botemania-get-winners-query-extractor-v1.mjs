#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';
const SUM='loterias-ai/casino/jackpots/evidence/botemania-jpk-lazy-chunk-feed-summary-v1.json';
const OUT='loterias-ai/casino/jackpots/evidence/botemania-get-winners-query-extractor-v1.json';
const s=JSON.parse(fs.readFileSync(SUM,'utf8'));
const target=(s.keyChunks||[]).find(x=>/containers-WinnersContainer-index-js/i.test(String(x.name||'')));
if(!target?.url)throw new Error('WinnersContainer chunk URL not recovered');
const r=await fetch(target.url,{headers:{accept:'application/javascript,*/*','user-agent':'loterias-ai-get-winners-query-extractor/1.0','cache-control':'no-cache'},redirect:'follow'}),text=await r.text();
const needles=['getWinners','winners'];
const contexts=[];
for(const needle of needles){let p=0;while(contexts.length<20){const i=text.indexOf(needle,p);if(i<0)break;contexts.push({needle,index:i,context:text.slice(Math.max(0,i-1200),Math.min(text.length,i+2600))});p=i+needle.length;}}
const gqlTemplates=[];
for(const re of [/query\s+getWinners[\s\S]{0,2500?}/gi,/getWinners[\s\S]{0,1800}/gi]){for(const m of text.matchAll(re))gqlTemplates.push(m[0].slice(0,3000));}
const stringLiterals=[];for(const m of text.matchAll(/["'`]([^"'`]{0,1800}(?:getWinners|winners)[^"'`]{0,1800})["'`]/gi)){stringLiterals.push(m[1].slice(0,3600));if(stringLiterals.length>=20)break;}
const out={version:'botemania-get-winners-query-extractor-v1',generatedAt:new Date().toISOString(),operator:'botemania-es',sourceChunk:target,url:target.url,httpStatus:r.status,bytes:text.length,sha256:crypto.createHash('sha256').update(text).digest('hex'),contexts,gqlTemplates,stringLiterals,decision:{getWinnersSymbolPresent:text.includes('getWinners'),exactExecutableQueryRecovered:gqlTemplates.some(x=>/query\s+getWinners/i.test(x))||stringLiterals.some(x=>/getWinners/i.test(x)&&/[{}]/.test(x)),safeToProbeReadOnly:false,reason:'MANUAL_QUERY_SHAPE_REVIEW_REQUIRED_BEFORE_NETWORK_CALL'},guards:{publicStaticBundleOnly:true,noAuthentication:true,noCookies:true,noGraphqlIntrospection:true,noMutationInvocation:true,noGraphqlRequestMadeByThisExtractor:true,noBetting:true,realMoneyAllowed:false}};
fs.mkdirSync('loterias-ai/casino/jackpots/evidence',{recursive:true});fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify({sourceChunk:target.name,getWinnersSymbolPresent:out.decision.getWinnersSymbolPresent,exactExecutableQueryRecovered:out.decision.exactExecutableQueryRecovered,contexts:contexts.map(x=>x.context)},null,2));

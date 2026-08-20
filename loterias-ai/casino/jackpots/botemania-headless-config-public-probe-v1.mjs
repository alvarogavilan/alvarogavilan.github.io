#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';
const OUT='loterias-ai/casino/jackpots/evidence/botemania-headless-config-public-probe-v1.json';
const urls=[
 'https://www.botemania.es/',
 'https://www.botemania.es/es/',
 'https://www.botemania.es/juegos',
 'https://www.botemania.es/es/juegos',
 'https://www.botemania.es/juegos/slots-online',
 'https://www.botemania.es/es/juegos/slots-online'
];
const needles=['jackpotsParams','headless-jackpots-bff','jackpotId','accountId','HeadlessJackpots','headlessJackpots'];
const rows=[];
for(const url of urls){try{const r=await fetch(url,{headers:{accept:'text/html,*/*','user-agent':'loterias-ai-headless-config-public-probe/1.0','cache-control':'no-cache'},redirect:'follow'}),text=await r.text();const contexts=[];for(const needle of needles){let p=0,c=0;while(c<20){const i=text.indexOf(needle,p);if(i<0)break;contexts.push({needle,index:i,context:text.slice(Math.max(0,i-1200),Math.min(text.length,i+3000)).replace(/\s+/g,' ').slice(0,4400)});p=i+needle.length;c++;}}const urlsFound=[...new Set([...text.matchAll(/https:\/\/[^"'<>\\\s]+headless-jackpots[^"'<>\\\s]*/gi)].map(m=>m[0]))];const objectSnippets=[];for(const m of text.matchAll(/jackpotsParams.{0,2500}/gi))objectSnippets.push(m[0].slice(0,2600));rows.push({url,finalUrl:r.url,httpStatus:r.status,bytes:text.length,sha256:crypto.createHash('sha256').update(text).digest('hex'),contexts,headlessUrls:urlsFound,objectSnippets:objectSnippets.slice(0,20)});}catch(e){rows.push({url,error:String(e?.message||e)});}}
const allContexts=rows.flatMap(x=>(x.contexts||[]).map(c=>({...c,pageUrl:x.url})));const allUrls=[...new Set(rows.flatMap(x=>x.headlessUrls||[]))];
const kvHints=[];for(const c of allContexts){for(const m of c.context.matchAll(/(?:url|jackpotId|currency|site|env|accountId)\s*["']?\s*[:=]\s*["']([^"']{1,180})["']/g))kvHints.push({pageUrl:c.pageUrl,keyValue:m[0]});}
const out={version:'botemania-headless-config-public-probe-v1',generatedAt:new Date().toISOString(),operator:'botemania-es',pages:rows,headlessUrls:[...allUrls],kvHints:[...new Map(kvHints.map(x=>[x.pageUrl+'|'+x.keyValue,x])).values()].slice(0,200),decision:{publicHeadlessConfigRecovered:allUrls.length>0||kvHints.some(x=>/jackpotId|accountId|site|env/.test(x.keyValue)),botemaniaSpecificConfigReady:false,realMoneyAllowed:false},guards:{boundedPublicPagesOnly:true,noAuthentication:true,noCookies:true,noGraphqlIntrospection:true,noMutation:true,noBetting:true,realMoneyAllowed:false}};
fs.mkdirSync('loterias-ai/casino/jackpots/evidence',{recursive:true});fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify({pages:rows.map(x=>({url:x.url,httpStatus:x.httpStatus,bytes:x.bytes,hits:x.contexts?.length||0,headlessUrls:x.headlessUrls||[]})),headlessUrls:out.headlessUrls,kvHints:out.kvHints,decision:out.decision},null,2));

#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';

const OUT='loterias-ai/casino/jackpots/evidence/botemania-jpk-public-winner-history-probe-v1.json';
const SITEMAPS=['https://www.botemania.es/es/sitemap.xml','https://www.botemania.es/sitemap.xml'];
const headers={accept:'text/html,application/xml;q=0.9,*/*;q=0.8','user-agent':'loterias-ai-jpk-public-winner-history/1.0','cache-control':'no-cache'};
const urls=new Set();
const sitemapEvidence=[];
for(const u of SITEMAPS){
 try{const r=await fetch(u,{headers,redirect:'follow'}),t=await r.text();sitemapEvidence.push({url:u,httpStatus:r.status,bytes:t.length,sha256:crypto.createHash('sha256').update(t).digest('hex')});for(const m of t.matchAll(/<loc>(https?:\/\/[^<]+)<\/loc>/gi)){const x=m[1].replace(/&amp;/g,'&');if(/jackpot|bote|ganador|ganadores|premio|noticia|blog/i.test(x))urls.add(x);}}catch(e){sitemapEvidence.push({url:u,error:String(e?.message||e)});}
}
const candidates=[...urls].slice(0,80);
const hits=[];
for(const url of candidates){
 try{
  const r=await fetch(url,{headers,redirect:'follow'}),text=await r.text();if(!r.ok)continue;
  const plain=text.replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#160;/gi,' ').replace(/\s+/g,' ');
  const relevant=/Jackpot\s*King|Bote\s*(?:Real|Majestuoso)|Royal|Regal/i.test(plain)&&/ganador|ganadora|ganó|gano|adjudic|premio/i.test(plain);
  if(!relevant)continue;
  const amounts=[...plain.matchAll(/(?:€\s*)?(\d{1,3}(?:[.\s]\d{3})*(?:,\d{1,2})?|\d{3,6}(?:,\d{1,2})?)\s*€/g)].map(m=>m[0]).slice(0,40);
  const contexts=[];for(const needle of ['Jackpot King','Bote Real','Bote Majestuoso','Royal','Regal','ganador']){const i=plain.toLowerCase().indexOf(needle.toLowerCase());if(i>=0)contexts.push(plain.slice(Math.max(0,i-280),Math.min(plain.length,i+520)));}
  hits.push({url,httpStatus:r.status,bytes:text.length,sha256:crypto.createHash('sha256').update(text).digest('hex'),amountMentions:amounts,contexts:contexts.slice(0,8)});
 }catch{}
}
const out={version:'botemania-jpk-public-winner-history-probe-v1',generatedAt:new Date().toISOString(),operator:'botemania-es',scope:'BOUNDED_PUBLIC_OPERATOR_SITEMAP_ONLY_NO_AUTH',sitemapEvidence,urlsConsidered:candidates.length,hits,decision:{historicalWinnerPagesRecovered:hits.length>0,usableRoyalRegalHitLevelsRecovered:false,discoveryOnly:true,realMoneyAllowed:false},interpretation:hits.length?'Candidate public pages mentioning Jackpot King winners were found. Amounts require manual tier/date validation before any statistical use.':'No bounded official Botemania sitemap page exposed a directly usable Royal/Regal winner history in this pass.',guards:{officialOperatorDomainOnly:true,boundedUrls:true,noAuthentication:true,noCookies:true,noSearchEngineScraping:true,noBetting:true,realMoneyAllowed:false}};
fs.mkdirSync('loterias-ai/casino/jackpots/evidence',{recursive:true});fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify({urlsConsidered:out.urlsConsidered,hits:out.hits.length,decision:out.decision},null,2));

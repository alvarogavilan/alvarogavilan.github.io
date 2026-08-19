#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';

const PAGE='https://www.botemania.es/juegos/slots-online/fishin-frenzy-jackpot-king';
const OUT='loterias-ai/casino/jackpots/evidence/botemania-game-launch-client-map-v1.json';
const headers={'user-agent':'loterias-ai-botemania-game-launch-map/1.1',accept:'text/html,application/javascript,*/*','cache-control':'no-cache'};
const pr=await fetch(PAGE,{headers,redirect:'follow'});const html=await pr.text();
const scriptUrls=[];
for(const m of html.matchAll(/<script[^>]+src=["']([^"']+)["']/gi)){try{const u=new URL(m[1],pr.url).href;if(!scriptUrls.includes(u))scriptUrls.push(u)}catch{}}
const targets=scriptUrls.filter(u=>/(GameHero|CallToAction|PostPage|client\.|RedirectModal)/i.test(u));
const needles=['launch','playGame','gameLaunch','gameUrl','launchUrl','realPlay','funPlay','demo','providerId','gameId','session','token','iframe','openGame','playUrl','casinoGame','/game','/play'];
function contexts(text,needle,left=1000,right=1800,limit=12){const out=[];let from=0,low=text.toLowerCase(),n=needle.toLowerCase();while(out.length<limit){const i=low.indexOf(n,from);if(i<0)break;let c=text.slice(Math.max(0,i-left),Math.min(text.length,i+n.length+right)).replace(/\s+/g,' ');c=c.replace(/(authorization|token|cookie)\s*[:=]\s*["'][^"']+["']/gi,'$1:[REDACTED]');out.push(c);from=i+n.length;}return out;}
function urls(text,base){const out=[];for(const re of [/https?:\\?\/\\?\/[^"'<>\s]+/gi,/["'](\/[^"']{1,300})["']/gi])for(const m of text.matchAll(re)){const raw=(m[1]||m[0]).replace(/\\\//g,'/');if(!/(game|play|launch|casino|session|demo|graphql|api)/i.test(raw))continue;try{const u=new URL(raw,base).href;if(!out.includes(u))out.push(u)}catch{}}return out.slice(0,150)}
function queries(text){const out=[];for(const re of [/\b(?:query|mutation)\s+[A-Za-z_][A-Za-z0-9_]*/g,/operationName["']?\s*[:=]\s*["']([A-Za-z_][A-Za-z0-9_]*)["']/g])for(const m of text.matchAll(re)){const x=m[1]||m[0];if(!out.includes(x))out.push(x)}return out.slice(0,100)}
const files=[];const heroHrefContexts=[];
for(const u of targets){try{const r=await fetch(u,{headers});const text=await r.text();const cs={};for(const n of needles){const x=contexts(text,n);if(x.length)cs[n]=x}
  if(/GameHero\./i.test(u)){
    for(const marker of ['href:i','customRegisterUrl','customRegistrationUrl','cursor','StyledGameHero']){
      for(const c of contexts(text,marker,7000,4500,10))heroHrefContexts.push({file:u,marker,context:c});
    }
  }
  files.push({url:u,httpStatus:r.status,bytes:text.length,sha256:crypto.createHash('sha256').update(text).digest('hex'),urlCandidates:urls(text,u),querySignatures:queries(text),contexts:cs})}catch(e){files.push({url:u,error:String(e?.message||e)})}}
const allUrls=[...new Set(files.flatMap(f=>f.urlCandidates||[]))];const allQueries=[...new Set(files.flatMap(f=>f.querySignatures||[]))];
const candidates=[];for(const f of files)for(const [needle,cs] of Object.entries(f.contexts||{}))for(const c of cs){if(/launch|playgame|gameurl|realplay|funplay|demo|iframe|session/i.test(c))candidates.push({file:f.url,needle,context:c})}
const actualDemoEvidence=heroHrefContexts.filter(x=>/\bdemo\b|funplay|fun play|practice/i.test(x.context));
const out={version:'botemania-game-launch-client-map-v1.1',generatedAt:new Date().toISOString(),page:PAGE,pageStatus:pr.status,targets,files,allUrlCandidates:allUrls,allQuerySignatures:allQueries,launchContexts:candidates.slice(0,120),heroHrefContexts:heroHrefContexts.slice(0,40),decision:{publicDemoLaunchCandidateFound:actualDemoEvidence.length>0,priorLooseDemoDetectorFalsePositive:true,exactSpainPaytableRecovered:false,realMoneyAllowed:false},guards:{publicStaticAssetsOnly:true,noAuthentication:true,noCookies:true,noPrivateTokens:true,noLaunchInvocation:true,noBetting:true,realMoneyAllowed:false}};
fs.mkdirSync('loterias-ai/casino/jackpots/evidence',{recursive:true});fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify({targets,allUrlCandidates:allUrls,allQuerySignatures:allQueries,heroHrefContextCount:out.heroHrefContexts.length,decision:out.decision},null,2));

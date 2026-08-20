#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';
const SLUG='irish-riches-megaways-jackpot-king';
const PAGE=`https://www.botemania.es/juegos/slots-online/${SLUG}`;
const OUT='loterias-ai/casino/jackpots/evidence/botemania-irish-public-bundle-context-v1.json';
const UA='loterias-ai-irish-public-bundle-context/1.0';
const h={accept:'text/html,application/javascript,*/*','user-agent':UA,'cache-control':'no-cache'};
const pr=await fetch(PAGE,{headers:h,redirect:'follow'}),html=await pr.text();
const scripts=[...new Set([...html.matchAll(/<script[^>]+src=["']([^"']+)["']/gi)].map(m=>new URL(m[1],PAGE).href))];
const targets=[];
for(const u of scripts){if(/botemania\.es\/es\//i.test(u))targets.push(u);}
const needles=[SLUG,'irish-riches-megaways','Irish Riches Megaways','gameEngineID','gameEngineId','gameCode','gameSkin','skinId','providerGame','profile','jackpotkingdeluxe3','fileservice.blueprintgaming.com'];
const hits=[];let cursor=0;
async function worker(){while(true){const i=cursor++;if(i>=targets.length)return;const url=targets[i];try{const r=await fetch(url,{headers:{...h,accept:'application/javascript,*/*'},redirect:'follow'}),text=await r.text();const found=needles.filter(n=>text.toLowerCase().includes(n.toLowerCase()));if(!found.length)continue;const contexts=[];for(const n of found){let p=0,c=0,low=text.toLowerCase(),needle=n.toLowerCase();while(c<12){const at=low.indexOf(needle,p);if(at<0)break;contexts.push({needle:n,index:at,context:text.slice(Math.max(0,at-1400),Math.min(text.length,at+3000))});p=at+needle.length;c++;}}hits.push({url,httpStatus:r.status,bytes:text.length,sha256:crypto.createHash('sha256').update(text).digest('hex'),found,contexts});}catch(e){hits.push({url,error:String(e?.message||e),found:[]});}}}
await Promise.all(Array.from({length:10},()=>worker()));
const kv=[];for(const row of hits){for(const x of row.contexts||[]){for(const m of x.context.matchAll(/(?:gameEngineID|gameEngineId|gameCode|gameSkin|skinId|providerGame|profile|gameId)\s*[:=]\s*["']([^"']{1,160})["']/gi))kv.push({source:row.url,key:m[0].split(/[:=]/)[0].trim(),value:m[1],near:x.needle});for(const m of x.context.matchAll(/https?:\\?\/?\\?\/?[^"'\s<>]+/g)){const u=m[0].replace(/\\u0026/g,'&').replace(/\\\//g,'/');if(/blueprint|fileservice|game|launch/i.test(u))kv.push({source:row.url,key:'url',value:u.slice(0,500),near:x.needle});}}}
const unique=[...new Map(kv.map(x=>[`${x.key}|${x.value}`,x])).values()];
const irishSpecific=unique.filter(x=>/irish|riches|megaway|jackpotking/i.test(`${x.value} ${x.near}`));
const out={version:'botemania-irish-public-bundle-context-v1',generatedAt:new Date().toISOString(),operator:'botemania-es',page:{url:PAGE,httpStatus:pr.status,bytes:html.length,sha256:crypto.createHash('sha256').update(html).digest('hex')},scriptsScanned:targets.length,hitScripts:hits,extractedKeyValues:unique,irishSpecificCandidates:irishSpecific,decision:{irishLaunchIdentifierRecovered:irishSpecific.some(x=>x.key!=='url'&&/gameengine|gamecode|gameskin|skinid|providergame|gameid/i.test(x.key)),blueprintFileserviceUrlRecovered:irishSpecific.some(x=>x.key==='url'&&/fileservice\.blueprintgaming/i.test(x.value)),safeReadOnlyFollowup:true,realMoneyAllowed:false},guards:{publicPageAndStaticBundlesOnly:true,noAuthentication:true,noCookies:true,noIntrospection:true,noMutation:true,noBetting:true,realMoneyAllowed:false}};
fs.mkdirSync('loterias-ai/casino/jackpots/evidence',{recursive:true});fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify({scriptsScanned:out.scriptsScanned,irishSpecificCandidates:out.irishSpecificCandidates,decision:out.decision},null,2));

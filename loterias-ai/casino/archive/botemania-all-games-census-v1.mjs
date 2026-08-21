#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';
import { parseRtpPctsFromContexts } from './botemania-rtp-pct-parser-v1.mjs';

const ORIGIN='https://www.botemania.es';
const SITEMAPS=['/es/sitemap.xml','/sitemap.xml'];
const OUT='loterias-ai/casino/archive/evidence/botemania-all-games-census-v1.json';
const HISTORY='loterias-ai/casino/archive/evidence/botemania-all-games-history-v1.ndjson';
const headers={accept:'text/html,application/xhtml+xml,*/*','user-agent':'loterias-ai-botemania-all-games-census/1.0','cache-control':'no-cache'};
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
const strip=s=>s.replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#160;/gi,' ').replace(/&euro;|&#8364;/gi,'€').replace(/&#39;/g,"'").replace(/&quot;/g,'"').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();
const dec=s=>Number(String(s).replace(/\./g,'').replace(',','.'));
const uniq=a=>[...new Set(a.filter(Boolean))];
const now=new Date().toISOString();

let prior=null;try{prior=JSON.parse(fs.readFileSync(OUT,'utf8'));}catch{}
const urls=new Set();const sitemapEvidence=[];
for(const p of SITEMAPS){
  try{const r=await fetch(ORIGIN+p,{headers,redirect:'follow'}),text=await r.text();sitemapEvidence.push({url:ORIGIN+p,httpStatus:r.status,bytes:text.length,sha256:sha(text)});
    for(const m of text.matchAll(/<loc>([^<]+)<\/loc>/gi)){const u=m[1].replace(/&amp;/g,'&');if(/botemania\.es\/juegos\/slots-online\//i.test(u))urls.add(u);}
  }catch(e){sitemapEvidence.push({url:ORIGIN+p,error:String(e?.message||e)});}
}

function extract(html,url){
  const text=strip(html);const title=(text.match(/(?:^|\s)([^|]{2,120}?)(?:\s+Resumen del Juego|\s+Resumen|\s+Slots Online)/i)||[])[1]?.trim()||null;
  const rtpContexts=uniq([...text.matchAll(/(?:Porcentaje de Retorno al Jugador|\bRTP\b)[^.]{0,700}/gi)].map(m=>m[0].slice(0,700))).slice(0,8);
  const rtpPcts=parseRtpPctsFromContexts(rtpContexts);
  const betContexts=uniq([...text.matchAll(/(?:valor moneda|apuesta(?: total)?|apuesta mínima|apuesta máxima)[^.]{0,260}/gi)].map(m=>m[0].slice(0,260))).slice(0,10);
  const euroVals=uniq(betContexts.flatMap(c=>[...c.matchAll(/(\d+(?:[.,]\d+)?)\s*(?:€|eur|c\b)/gi)].map(m=>({raw:m[0],value:dec(m[1]),unit:/c\b/i.test(m[0])?'cent':'eur'})).map(x=>x.unit==='cent'?x.value/100:x.value))).filter(x=>x>0&&x<=10000).sort((a,b)=>a-b);
  const jackpotKing=/Jackpot King/i.test(text);const mustDrop=/must\s*drop|debe\s+ganarse|habr[aá]\s+un\s+ganador\s+antes|must\s+be\s+won/i.test(text);
  const stateDependent=/probabilidades?[^.]{0,260}(?:aumentan|aumenta|crecen|crece|incrementan|incrementa)[^.]{0,200}(?:valor|cantidad)[^.]{0,160}(?:bote|jackpot)/i.test(text);
  const providerHints=uniq(['Blueprint','Red Tiger','Evolution','Pragmatic Play','Playtech','NetEnt','Games Global','Big Time Gaming','Relax Gaming','Play’n GO','Play\'n GO'].filter(x=>new RegExp(x.replace(/[’']/g,"['’]"),'i').test(text)));
  const mechanics=uniq([
    jackpotKing?'JACKPOT_KING':null,
    mustDrop?'MUST_DROP_OR_MUST_BE_WON':null,
    /Megaways/i.test(text)?'MEGAWAYS':null,
    /Bote Progresivo|Progressive/i.test(text)?'PROGRESSIVE':null,
    /Slingo/i.test(text)?'SLINGO':null,
    /Jackpot/i.test(text)?'JACKPOT':null
  ]);
  const capContexts=uniq([...text.matchAll(/(?:Debe ganarse en|Habrá un ganador antes|Must Drop Within|Must Be Won By)[^.]{0,220}/gi)].map(m=>m[0].slice(0,220))).slice(0,8);
  return {url,slug:new URL(url).pathname.split('/').filter(Boolean).at(-1),title,httpStatus:200,bytes:html.length,sha256:sha(html),rtpContexts,rtpPcts,betContexts,observedBetValuesEUR:euroVals,providerHints,mechanics,jackpotKing,mustDrop,stateDependentProbability:stateDependent,capContexts};
}

const all=[...urls].sort();const rows=[];let idx=0;const concurrency=8;
async function worker(){while(true){const i=idx++;if(i>=all.length)return;const url=all[i];try{const r=await fetch(url,{headers,redirect:'follow'}),html=await r.text();const row=extract(html,r.url);row.httpStatus=r.status;row.finalUrl=r.url;rows[i]=row;}catch(e){rows[i]={url,slug:url.split('/').filter(Boolean).at(-1),httpStatus:null,error:String(e?.message||e)};}}}
await Promise.all(Array.from({length:Math.min(concurrency,all.length||1)},()=>worker()));
const clean=rows.filter(Boolean);
const bySlug=Object.fromEntries(clean.filter(x=>x.slug).map(x=>[x.slug,x]));
const priorBy=Object.fromEntries((prior?.games||[]).filter(x=>x.slug).map(x=>[x.slug,x]));
const changes=[];
for(const [slug,row] of Object.entries(bySlug)){
  const p=priorBy[slug];if(!p)changes.push({type:'ADDED',slug,url:row.url});
  else if(p.sha256!==row.sha256)changes.push({type:'CHANGED',slug,url:row.url,previousSha256:p.sha256,currentSha256:row.sha256,rtpChanged:JSON.stringify(p.rtpPcts)!==JSON.stringify(row.rtpPcts),betChanged:JSON.stringify(p.observedBetValuesEUR)!==JSON.stringify(row.observedBetValuesEUR),mechanicsChanged:JSON.stringify(p.mechanics)!==JSON.stringify(row.mechanics)});
}
for(const [slug,p] of Object.entries(priorBy))if(!bySlug[slug])changes.push({type:'REMOVED',slug,url:p.url});
const summary={gamesDiscovered:clean.length,http200:clean.filter(x=>x.httpStatus===200).length,withRtp:clean.filter(x=>x.rtpPcts?.length).length,jackpotKing:clean.filter(x=>x.jackpotKing).length,mustDropOrMustBeWon:clean.filter(x=>x.mustDrop).length,stateDependent:clean.filter(x=>x.stateDependentProbability).length,progressive:clean.filter(x=>x.mechanics?.includes('PROGRESSIVE')).length,changes:changes.length};
const out={version:'botemania-all-games-census-v1',generatedAt:now,operator:'botemania-es',scope:'ALL_PUBLIC_SLOT_PAGES_DISCOVERED_FROM_OPERATOR_SITEMAP',sitemapEvidence,summary,games:clean,changes,guards:{publicPagesOnly:true,noAuthentication:true,noCookies:true,noGraphqlIntrospection:true,noBetting:true,realMoneyAllowed:false}};
fs.mkdirSync('loterias-ai/casino/archive/evidence',{recursive:true});fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');
if(changes.length||!prior){const h={version:'botemania-all-games-history-event-v1',observedAt:now,summary,changes};fs.appendFileSync(HISTORY,JSON.stringify(h)+'\n');}
console.log(JSON.stringify({summary,topStateDependent:clean.filter(x=>x.stateDependentProbability||x.mustDrop).slice(0,30).map(x=>({slug:x.slug,rtp:x.rtpPcts,mechanics:x.mechanics}))},null,2));
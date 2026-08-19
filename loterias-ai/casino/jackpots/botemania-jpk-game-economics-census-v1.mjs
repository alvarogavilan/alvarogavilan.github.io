#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';

const ORIGIN='https://www.botemania.es';
const OUT='loterias-ai/casino/jackpots/evidence/botemania-jpk-game-economics-census-v1.json';
const headers={'user-agent':'loterias-ai-botemania-jpk-economics-census/1.0',accept:'text/html,*/*','cache-control':'no-cache'};
const fallbackSlugs=[
 'fishin-frenzy-jackpot-king','fishin-frenzy-megaways-jackpot-king','eye-of-horus-jackpot-king','eye-of-horus-megaways-jackpot-king',
 'king-kong-cash-jackpot-king','the-goonies-return-jackpot-king','7s-deluxe-jackpot-king','mega-bars-fortune-wheel-jackpot-king',
 'irish-riches-megaways-jackpot-king','wish-upon-a-leprechaun-jackpot-king','fruitinator-jackpot-king','gold-frenzy-jackpot-king','slots-o-gold-jackpot-king',
 'super-spinner-bar-x-jackpot-king'
];
const urls=new Set(fallbackSlugs.map(s=>`${ORIGIN}/juegos/slots-online/${s}`));
const sitemapAttempts=[];
for(const path of ['/sitemap.xml','/sitemap_index.xml','/es/sitemap.xml']){
 try{
  const r=await fetch(ORIGIN+path,{headers,redirect:'follow'}); const text=await r.text();
  sitemapAttempts.push({url:ORIGIN+path,httpStatus:r.status,bytes:text.length,sha256:crypto.createHash('sha256').update(text).digest('hex')});
  for(const m of text.matchAll(/<loc>([^<]+)<\/loc>/gi)){
   const u=m[1].replace(/&amp;/g,'&');
   if(/botemania\.es\/juegos\/slots-online\//i.test(u)&&/jackpot(?:-|%20)?king|jpk/i.test(u))urls.add(u);
  }
 }catch(e){sitemapAttempts.push({url:ORIGIN+path,httpStatus:null,error:String(e?.message||e)});}
}
const strip=s=>s.replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#160;/gi,' ').replace(/&euro;|&#8364;/gi,'€').replace(/&#39;/g,"'").replace(/&quot;/g,'"').replace(/\s+/g,' ').trim();
const num=s=>Number(String(s).replace(/\./g,'').replace(',','.'));
function extractPercentages(text){
 const rtpContexts=[];
 for(const re of [/Porcentaje de Retorno al Jugador[^.]{0,500}/gi,/RTP[^.]{0,350}/gi]){
  for(const m of text.matchAll(re)){const c=m[0].slice(0,600);if(!rtpContexts.includes(c))rtpContexts.push(c);if(rtpContexts.length>=12)break;}
 }
 const joined=rtpContexts.join(' | ');
 const pcts=[...joined.matchAll(/(\d{1,2}(?:[.,]\d{1,3})?)\s*%/g)].map(m=>num(m[1])).filter(x=>x>0&&x<100);
 const baseMatch=joined.match(/(\d{1,2}(?:[.,]\d{1,3})?)\s*%\s*(?:\(\s*(?:RTP\s*)?Base|\(Base)/i);
 const boteMatch=joined.match(/(\d{1,2}(?:[.,]\d{1,3})?)\s*%\s*\([^)]*(?:Bote|Jackpot)[^)]*\)/i);
 const reserveMatch=joined.match(/(\d{1,2}(?:[.,]\d{1,3})?)\s*%\s*\([^)]*Reserva[^)]*\)/i);
 let base=baseMatch?num(baseMatch[1]):null,active=boteMatch?num(boteMatch[1]):null,reserve=reserveMatch?num(reserveMatch[1]):null;
 // Explicit A + B + C patterns are stronger when labels were lost/reordered.
 const tri=joined.match(/(\d{1,2}(?:[.,]\d{1,3})?)\s*%\s*\+\s*(\d{1,2}(?:[.,]\d{1,3})?)\s*%[^+]{0,100}\+\s*(\d{1,2}(?:[.,]\d{1,3})?)\s*%/i);
 const duo=joined.match(/(\d{1,2}(?:[.,]\d{1,3})?)\s*%\s*\+\s*(\d{1,2}(?:[.,]\d{1,3})?)\s*%/i);
 if(tri){if(base==null)base=num(tri[1]);if(active==null)active=num(tri[2]);if(reserve==null)reserve=num(tri[3]);}
 else if(duo&&base==null){base=num(duo[1]);if(active==null)active=num(duo[2]);}
 const explicitTotal=(base!=null?base:0)+(active!=null?active:0)+(reserve!=null?reserve:0);
 return {rtpContexts,pcts,baseRtpPct:base,activeContributionPct:active,reserveContributionPct:reserve,explicitComponentsTotalPct:(base!=null&&active!=null)?+explicitTotal.toFixed(4):null};
}
const rows=[];
for(const url of [...urls].sort()){
 try{
  const r=await fetch(url,{headers,redirect:'follow'});const html=await r.text();const text=strip(html);
  const h1=(text.match(/#?\s*([^|]{3,100}Jackpot King[^|]{0,60})/i)||[])[1]||null;
  const eco=extractPercentages(text);
  const stake=(text.match(/(?:valor moneda|apuesta)[^€]{0,100}?(\d+(?:[.,]\d+)?)\s*(?:c|€)[^€]{0,60}?(\d+(?:[.,]\d+)?)\s*€/i)||[]);
  const minText=text.match(/(?:valor moneda disponible|apuesta)[^.]{0,160}/i)?.[0]||null;
  const stateDependent=/probabilidades? de ganar un Bote crecen según el valor del Bote/i.test(text);
  const proportionalBet=/probabilidades?[^.]{0,160}proporcionales? al valor de la Apuesta Total/i.test(text);
  const sharedBotemaniaCanal=/compartidos?[^.]{0,220}Boteman[ií]a y Canal Bingo/i.test(text);
  rows.push({url,slug:new URL(r.url).pathname.split('/').filter(Boolean).at(-1),httpStatus:r.status,finalUrl:r.url,title:h1,bytes:html.length,sha256:crypto.createHash('sha256').update(html).digest('hex'),...eco,minBetText:minText,stateDependentProbability:stateDependent,probabilityProportionalToTotalBet:proportionalBet,explicitBotemaniaCanalBingoSharedNetwork:sharedBotemaniaCanal});
 }catch(e){rows.push({url,httpStatus:null,error:String(e?.message||e)});}
}
const comparable=rows.filter(x=>x.httpStatus===200&&Number.isFinite(x.explicitComponentsTotalPct)).sort((a,b)=>b.explicitComponentsTotalPct-a.explicitComponentsTotalPct);
const out={
 version:'botemania-jpk-game-economics-census-v1',generatedAt:new Date().toISOString(),operator:'botemania-es',scope:'PUBLIC_OPERATOR_PAGES_ONLY',sitemapAttempts,urlsConsidered:urls.size,rows,
 ranking:{metric:'EXPLICIT_PUBLISHED_COMPONENT_SUM_ONLY_NOT_STATE_DEPENDENT_EV',comparable:comparable.map(x=>({slug:x.slug,title:x.title,baseRtpPct:x.baseRtpPct,activeContributionPct:x.activeContributionPct,reserveContributionPct:x.reserveContributionPct,explicitComponentsTotalPct:x.explicitComponentsTotalPct,stateDependentProbability:x.stateDependentProbability,probabilityProportionalToTotalBet:x.probabilityProportionalToTotalBet,explicitBotemaniaCanalBingoSharedNetwork:x.explicitBotemaniaCanalBingoSharedNetwork,url:x.url}))},
 decision:{bestPublishedComponentSumCandidate:comparable[0]?.slug||null,stateDependentBestGameNotProven:true,reason:'Trigger/hazard coefficient may differ by game configuration; published RTP component sum alone cannot rank current jackpot-state EV.',realMoneyAllowed:false},
 guards:{noPublishedRtpAsCurrentEv:true,noCrossGameHazardEqualityAssumption:true,noBetting:true,realMoneyAllowed:false}
};
fs.mkdirSync('loterias-ai/casino/jackpots/evidence',{recursive:true});fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({urlsConsidered:out.urlsConsidered,ranking:out.ranking.comparable.slice(0,20),decision:out.decision},null,2));

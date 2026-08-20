#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';

const SITEMAP='https://www.botemania.es/es/sitemap.xml';
const OUT='loterias-ai/casino/jackpots/evidence/botemania-progressive-catalog-v1.json';
const headers={accept:'text/html,application/xml,*/*','user-agent':'loterias-ai-botemania-progressive-catalog/1.0','cache-control':'no-cache'};
const s=await fetch(SITEMAP,{headers}),xml=await s.text();
const all=[...xml.matchAll(/<loc>(https?:\/\/[^<]+)<\/loc>/gi)].map(m=>m[1].replace(/&amp;/g,'&')).filter(u=>/\/juegos\/slots-online\//.test(u));
const slugPriority=u=>/jackpot|bote|pot|cash|fortune|gods|king|progress/i.test(new URL(u).pathname)?0:1;
const urls=[...new Set(all)].sort((a,b)=>slugPriority(a)-slugPriority(b)).slice(0,220);
const rows=[];
const clean=t=>t.replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#160;/gi,' ').replace(/\s+/g,' ').trim();
const pct=s=>[...s.matchAll(/(\d{1,2}(?:[.,]\d{1,3})?)\s*%/g)].map(m=>Number(m[1].replace(',','.'))).filter(Number.isFinite);
for(const url of urls){
 try{
  const r=await fetch(url,{headers,redirect:'follow'}),html=await r.text();if(!r.ok)continue;const text=clean(html);
  const progressive=/Bote Progresivo|Jackpot|bote progresivo/i.test(text);if(!progressive)continue;
  const stateDependent=/probabilidades?[^.]{0,100}(?:aument|crec)|debe ganarse|antes de (?:que )?llegue|must be won/i.test(text);
  const contribCtx=[];for(const key of ['contribución al Bote','contribuye al Bote','Bote Reserva','RTP']){const i=text.toLowerCase().indexOf(key.toLowerCase());if(i>=0)contribCtx.push(text.slice(Math.max(0,i-220),Math.min(text.length,i+520)));}
  const components=pct(contribCtx.join(' '));
  const title=(text.match(/^(?:.*?)?([A-Za-zÁÉÍÓÚÑ0-9][^|]{2,90}?)(?: Resumen del Juego| Slots Online)/i)||[])[1]||new URL(url).pathname.split('/').pop();
  rows.push({url,slug:new URL(url).pathname.split('/').pop(),title,sha256:crypto.createHash('sha256').update(html).digest('hex'),stateDependentMechanicMentioned:stateDependent,sharedNetworkMentioned:/compartid[oa]s?[^.]{0,220}(?:Botemanía|Botemania)/i.test(text),mustBeWonMentioned:/debe ganarse|antes de (?:que )?llegue|must be won/i.test(text),rtpAndContributionContexts:contribCtx.slice(0,6),percentMentions:[...new Set(components)].slice(0,20)});
 }catch{}
}
const state=rows.filter(x=>x.stateDependentMechanicMentioned||x.mustBeWonMentioned);
const out={version:'botemania-progressive-catalog-v1',generatedAt:new Date().toISOString(),operator:'botemania-es',scope:'PUBLIC_OPERATOR_SLOT_PAGES_BOUNDED',sitemap:{url:SITEMAP,httpStatus:s.status,slotUrls:all.length,scanned:urls.length,sha256:crypto.createHash('sha256').update(xml).digest('hex')},summary:{progressivePagesFound:rows.length,stateDependentOrMustBeWon:state.length},stateDependentCandidates:state,rows,decision:{newCandidateNetworksRequireDedicatedValidation:true,realMoneyAllowed:false},guards:{operatorDomainOnly:true,boundedScan:true,noAuthentication:true,noCookies:true,noMutation:true,noBetting:true,realMoneyAllowed:false}};
fs.mkdirSync('loterias-ai/casino/jackpots/evidence',{recursive:true});fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify({summary:out.summary,stateDependentCandidates:state.map(x=>({slug:x.slug,mustBeWon:x.mustBeWonMentioned,pcts:x.percentMentions}))},null,2));

#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';
const OUT='loterias-ai/casino/lightning/evidence/economic-readiness-ledger-v1.json';
const ADDENDUM='loterias-ai/casino/jackpots/evidence/age-of-gods-listing-corroboration-addendum-v1.json';
const URL='https://www.pokerstars.es/casino/slots/jackpot/';
const addendum=JSON.parse(fs.readFileSync(ADDENDUM,'utf8'));
if(addendum.version!=='age-of-gods-listing-corroboration-addendum-v1'||addendum.immutable!==true||addendum.method?.minimumDistinctAgeTitlesForCorroboration!==2||addendum.guards?.realMoneyAllowed!==false)throw new Error('Age of Gods listing addendum drift');
const now=new Date().toISOString(),read=p=>{try{return JSON.parse(fs.readFileSync(p,'utf8'));}catch{return {};}};const ledger=read(OUT),prev=ledger.ageOfGodsOfficialMonitor||{observations:[],resets:[]};
const parse=s=>Number(String(s).replace(/\./g,'').replace(',','.'));
const strip=html=>html.replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,'\n').replace(/&euro;|&#8364;/gi,'€').replace(/&nbsp;|&#160;/gi,' ').replace(/&amp;/gi,'&').replace(/\s+/g,' ').trim();
let sourceReadable=false,obs=null;
try{
  const r=await fetch(URL,{headers:{accept:'text/html','user-agent':'loterias-ai-aotg-list-observer/2.0','cache-control':'no-cache, no-store, max-age=0',pragma:'no-cache'}});
  const html=await r.text();
  const finalHost=new URL(r.url).hostname;
  const officialSpainHost=finalHost==='www.pokerstars.es'||finalHost==='pokerstars.es';
  const text=strip(html);
  const amountRx=/(\d{1,3}(?:\.\d{3})*,\d{2})\s*€/g;
  const matches=[];
  const ageRx=/(?:Age of the Gods|AOTG)[^€]{0,80}/gi;
  for(const m of text.matchAll(ageRx)){
    const prefix=text.slice(Math.max(0,m.index-120),m.index);
    const amounts=[...prefix.matchAll(amountRx)];
    const last=amounts.at(-1);
    if(!last)continue;
    const amount=parse(last[1]);
    if(!Number.isFinite(amount)||amount<10000)continue;
    const title=String(m[0]).split(/\s{2,}|\d{1,3}(?:\.\d{3})*,\d{2}\s*€/)[0].trim().slice(0,100);
    matches.push({title,amountEUR:amount});
  }
  const unique=[];const seen=new Set();for(const x of matches){const k=`${x.title}|${x.amountEUR.toFixed(2)}`;if(!seen.has(k)){seen.add(k);unique.push(x)}}
  const buckets=new Map();for(const x of unique){const k=x.amountEUR.toFixed(2),b=buckets.get(k)||{value:x.amountEUR,titles:new Set()};b.titles.add(x.title);buckets.set(k,b)}
  const ranked=[...buckets.values()].map(x=>({value:x.value,distinctTitles:x.titles.size,titles:[...x.titles]})).sort((a,b)=>b.distinctTitles-a.distinctTitles||b.value-a.value);
  const corroborated=ranked.find(x=>x.distinctTitles>=2)||null;
  const amount=corroborated?.value??null;
  const prior=(prev.observations||[]).filter(x=>Number.isFinite(Number(x.networkPotEUR))).at(-1)||null;
  let deltaEUR=null,growthEURPerHour=null,possibleReset=false;
  if(Number.isFinite(amount)&&prior){deltaEUR=Number((amount-Number(prior.networkPotEUR)).toFixed(2));const h=(Date.parse(now)-Date.parse(prior.observedAt))/36e5;if(h>0)growthEURPerHour=Number((deltaEUR/h).toFixed(2));possibleReset=deltaEUR<0;}
  obs={observedAt:now,networkPotEUR:amount,corroborated:Boolean(corroborated),corroboratingOfficialTitles:corroborated?.titles??[],distinctTitleCount:corroborated?.distinctTitles??0,candidateNetworks:ranked.slice(0,10),ageEntries:unique.slice(0,30),sourcePage:{url:URL,httpStatus:r.status,finalUrl:r.url,officialSpainHost,responseSha256:crypto.createHash('sha256').update(html).digest('hex')},deltaEUR,growthEURPerHour,possibleReset};
  sourceReadable=Boolean(r.ok&&officialSpainHost&&Number.isFinite(amount));
}catch(e){obs={observedAt:now,networkPotEUR:null,corroborated:false,error:String(e?.message||e),ageEntries:[],candidateNetworks:[]};}
const observations=[...(prev.observations||[]),obs].slice(-288),resets=[...(prev.resets||[])];if(obs?.possibleReset&&Number.isFinite(obs.networkPotEUR)){const prior=(prev.observations||[]).filter(x=>Number.isFinite(Number(x.networkPotEUR))).at(-1);if(prior)resets.push({observedAt:now,fromEUR:Number(prior.networkPotEUR),toEUR:obs.networkPotEUR,dropEUR:Number((Number(prior.networkPotEUR)-obs.networkPotEUR).toFixed(2))});}
ledger.ageOfGodsOfficialMonitor={generatedAt:now,operator:'pokerstars-es',network:'Playtech Age of the Gods',source:'PokerStars Spain official jackpot listing only',sourceReadable,latest:obs,observations,observationCountTotal:Number(prev.observationCountTotal||0)+1,resets:resets.slice(-100),resetCountTotal:Number(prev.resetCountTotal||0)+(obs?.possibleReset?1:0),economics:{referenceGame:'Age of the Gods: God of Storms',publishedRtpReference:0.9614,exactProgressiveContributionKnown:false,positiveEVClaimAllowed:false},guards:{singleOfficialSnapshot:true,minimumTwoDistinctAgeTitles:true,exactAmountMatchWithinSnapshot:true,individualGamePageRedirectsNotRequired:true,noBetting:true,noEconomicPromotionFromPotSizeAlone:true,realMoneyAllowed:false},realMoneyAllowed:false};
fs.writeFileSync(OUT,JSON.stringify(ledger,null,2)+'\n');console.log(JSON.stringify({sourceReadable,networkPotEUR:obs?.networkPotEUR??null,titles:obs?.corroboratingOfficialTitles??[],realMoneyAllowed:false},null,2));
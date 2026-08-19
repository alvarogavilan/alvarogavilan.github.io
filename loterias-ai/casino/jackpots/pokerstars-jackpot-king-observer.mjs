#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';

const OUT='loterias-ai/casino/lightning/evidence/economic-readiness-ledger-v1.json';
const URLS=[
  {id:'jpk-hub',url:'https://www.pokerstars.es/casino/jackpotking/'},
  {id:'jackpot-list',url:'https://www.pokerstars.es/casino/slots/jackpot/'},
  {id:'king-kong-cash-jpk',url:'https://www.pokerstars.es/casino/game/king-kong-cash-jpk/1017/100/'},
  {id:'eye-of-horus-megaways-jpk',url:'https://www.pokerstars.es/casino/game/eye-of-horus-megaways-jpk/1017/160/'},
  {id:'ted-jpk',url:'https://www.pokerstars.es/casino/game/ted-jpk/1017/59/'},
  {id:'gold-strike-bonanza-jpk',url:'https://www.pokerstars.es/casino/game/gold-strike-bonanza-jpk/1017/191/'}
];
const now=new Date().toISOString();
const read=p=>{try{return JSON.parse(fs.readFileSync(p,'utf8'));}catch{return {};}};
const ledger=read(OUT);
const prev=ledger.jackpotKingOfficialMonitor||{observations:[],resets:[]};

function parseNumber(raw){
  const s=String(raw).replace(/\s/g,'');
  if(s.includes(',')&&s.includes('.'))return Number(s.lastIndexOf(',')>s.lastIndexOf('.')?s.replace(/\./g,'').replace(',','.'):s.replace(/,/g,''));
  if(s.includes(','))return Number(s.replace(/\./g,'').replace(',','.'));
  return Number(s.replace(/,/g,''));
}
function amounts(html){
  const txt=html.replace(/&nbsp;|&#160;/g,' ').replace(/&euro;|&#8364;/gi,'€').replace(/\u20ac/gi,'€');
  const found=[];
  for(const re of [/(\d{1,3}(?:\.\d{3})*,\d{2})\s*€/g,/€\s*(\d{1,3}(?:,\d{3})*\.\d{2})/g,/(\d{3,}(?:[.,]\d{2})?)\s*€/g])for(const m of txt.matchAll(re)){const x=parseNumber(m[1]);if(Number.isFinite(x)&&x>=1000)found.push(x);}
  return found;
}
const pages=[];
for(const src of URLS){
  try{
    const r=await fetch(src.url,{redirect:'follow',headers:{accept:'text/html','user-agent':'loterias-ai-official-jackpot-observer/2.0'}});
    const html=await r.text(); const vals=amounts(html);
    pages.push({id:src.id,url:src.url,httpStatus:r.status,finalUrl:r.url,responseSha256:crypto.createHash('sha256').update(html).digest('hex'),amounts:[...new Set(vals)].sort((a,b)=>b-a).slice(0,30),officialSpainHost:new URL(r.url).hostname.endsWith('pokerstars.es')||new URL(src.url).hostname.endsWith('pokerstars.es')});
  }catch(e){pages.push({id:src.id,url:src.url,error:String(e?.message||e),amounts:[]});}
}

const jpkCandidateValues=[];
for(const p of pages){for(const a of p.amounts){if(a>=10000&&a<=10000000)jpkCandidateValues.push({page:p.id,value:a});}}
const buckets=new Map();
for(const x of jpkCandidateValues){const key=x.value.toFixed(2);const b=buckets.get(key)||{value:x.value,pages:new Set(),occurrences:0};b.pages.add(x.page);b.occurrences++;buckets.set(key,b);}
const ranked=[...buckets.values()].map(x=>({value:x.value,pageCount:x.pages.size,occurrences:x.occurrences,pages:[...x.pages]})).sort((a,b)=>b.pageCount-a.pageCount||b.occurrences-a.occurrences||b.value-a.value);
const corroborated=ranked.find(x=>x.pageCount>=2)||null;
const amount=corroborated?.value??null;
const priorObs=(prev.observations||[]).filter(x=>Number.isFinite(Number(x.networkPotEUR))).at(-1)||null;
let deltaEUR=null,hours=null,growthEURPerHour=null,possibleReset=false;
if(Number.isFinite(amount)&&priorObs){deltaEUR=Number((amount-Number(priorObs.networkPotEUR)).toFixed(2));hours=(Date.parse(now)-Date.parse(priorObs.observedAt))/36e5;if(hours>0)growthEURPerHour=Number((deltaEUR/hours).toFixed(2));possibleReset=deltaEUR<0;}
const observation={observedAt:now,networkPotEUR:amount,corroborated:Boolean(corroborated),corroboratingOfficialPages:corroborated?.pages??[],pageCount:corroborated?.pageCount??0,candidateNetworkValues:ranked.slice(0,10),pages,deltaEUR,growthEURPerHour,possibleReset};
const observations=[...(prev.observations||[]),observation].slice(-288);
const resets=[...(prev.resets||[])];if(possibleReset)resets.push({observedAt:now,fromEUR:Number(priorObs.networkPotEUR),toEUR:amount,dropEUR:Number((-deltaEUR).toFixed(2))});
const status={generatedAt:now,source:'PokerStars Spain official pages only',operator:'pokerstars-es',operatorOfficial:true,mode:'OBSERVATION_ONLY_NO_WAGERING',sourceReadable:Number.isFinite(amount),latest:observation,observations,observationCountTotal:Number(prev.observationCountTotal||0)+1,resets:resets.slice(-100),resetCountTotal:Number(prev.resetCountTotal||0)+(possibleReset?1:0),structuralResearch:{providerMechanic:'Jackpot probability increases with jackpot value; Royal/Regal MBWB confirmed by Blueprint rules.',exactMbwbValuesKnown:false,jackpotProbabilityKnown:false,totalRTPAtCurrentPotKnown:false,positiveEVClaimAllowed:false,nextEvidenceNeeded:['exact PokerStars Royal/Regal MBWB values','pot identity mapping Royal vs Regal vs Jackpot King','30+ observed network resets/hits','prospective hazard holdout']},guards:{officialPokerStarsPagesOnly:true,minimumTwoPageCorroboration:true,noSpinPlaced:true,noAutoplay:true,noBetting:true,noEconomicPromotionFromPotSizeAlone:true,realMoneyAllowed:false},realMoneyAllowed:false};
ledger.jackpotKingOfficialMonitor=status;
fs.writeFileSync(OUT,JSON.stringify(ledger,null,2)+'\n');
console.log(JSON.stringify({jackpotKingOfficialMonitor:{sourceReadable:status.sourceReadable,networkPotEUR:amount,corroboratingPages:observation.corroboratingOfficialPages,observationCountTotal:status.observationCountTotal,resetCountTotal:status.resetCountTotal,realMoneyAllowed:false}},null,2));

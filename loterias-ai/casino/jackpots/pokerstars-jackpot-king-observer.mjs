#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';

const OUT='loterias-ai/casino/lightning/evidence/economic-readiness-ledger-v1.json';
const URL='https://www.pokerstars.es/casino/jackpotking/';
const now=new Date().toISOString();
const read=p=>{try{return JSON.parse(fs.readFileSync(p,'utf8'));}catch{return {};}};
const ledger=read(OUT);
const prev=ledger.jackpotKingOfficialMonitor||{observations:[],resets:[]};

function eur(s){return Number(String(s).replace(/\./g,'').replace(',','.'));}
function strip(html){return html.replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#160;/g,' ').replace(/&euro;|&#8364;/g,'€').replace(/\s+/g,' ').trim();}

let status={generatedAt:now,source:URL,operator:'pokerstars-es',operatorOfficial:true,mode:'OBSERVATION_ONLY_NO_WAGERING',realMoneyAllowed:false};
try{
  const r=await fetch(URL,{headers:{accept:'text/html','user-agent':'loterias-ai-official-jackpot-observer/1.0'}});
  const html=await r.text();
  const text=strip(html);
  const matches=[...text.matchAll(/(\d{1,3}(?:\.\d{3})*,\d{2})\s*€/g)].map(m=>eur(m[1])).filter(x=>Number.isFinite(x)&&x>0);
  const progressive=matches.filter(x=>x>=1000);
  const counts=new Map(); for(const x of progressive)counts.set(x,(counts.get(x)||0)+1);
  const ranked=[...counts.entries()].sort((a,b)=>b[1]-a[1]||b[0]-a[0]);
  const mode=ranked[0]||[null,0];
  const amount=mode[0];
  const priorObs=(prev.observations||[]).at(-1)||null;
  let deltaEUR=null,hours=null,growthEURPerHour=null,possibleReset=false;
  if(Number.isFinite(amount)&&priorObs&&Number.isFinite(Number(priorObs.networkPotEUR))){
    deltaEUR=Number((amount-Number(priorObs.networkPotEUR)).toFixed(2));
    hours=(Date.parse(now)-Date.parse(priorObs.observedAt))/36e5;
    if(hours>0)growthEURPerHour=Number((deltaEUR/hours).toFixed(2));
    possibleReset=deltaEUR<0;
  }
  const observation={observedAt:now,httpStatus:r.status,responseSha256:crypto.createHash('sha256').update(html).digest('hex'),networkPotEUR:amount,modeCount:mode[1],progressiveAmountsSeen:[...new Set(progressive)].sort((a,b)=>b-a).slice(0,20),deltaEUR,growthEURPerHour,possibleReset,guaranteedDailyLanguagePresent:/garantizad[oa]s? cada d[ií]a|guaranteed to hit every day|daily drops/i.test(text)};
  const observations=[...(prev.observations||[]),observation].slice(-1008);
  const resets=[...(prev.resets||[])]; if(possibleReset)resets.push({observedAt:now,fromEUR:Number(priorObs.networkPotEUR),toEUR:amount,dropEUR:Number((-deltaEUR).toFixed(2))});
  status={...status,httpStatus:r.status,sourceReadable:r.ok&&Number.isFinite(amount),latest:observation,observations:observations.slice(-288),observationCountTotal:Number(prev.observationCountTotal||0)+1,resets:resets.slice(-100),resetCountTotal:Number(prev.resetCountTotal||0)+(possibleReset?1:0),structuralResearch:{question:'Does conditional jackpot hazard or jackpot-component EV vary with clock time, pot size, or contribution rate?',dailyGuaranteeRequiresMechanismValidation:true,jackpotProbabilityKnown:false,totalRTPAtCurrentPotKnown:false,positiveEVClaimAllowed:false,nextEvidenceNeeded:['official Jackpot King trigger/drop mechanics','official qualifying-bet rules','enough official PokerStars pot resets to estimate empirical hazard']},guards:{officialOperatorOnly:true,noSpinPlaced:true,noAutoplay:true,noBetting:true,noEconomicPromotionFromPotSizeAlone:true,realMoneyAllowed:false}};
}catch(e){
  status={...status,sourceReadable:false,error:String(e?.message||e),observations:(prev.observations||[]).slice(-288),observationCountTotal:Number(prev.observationCountTotal||0),resets:(prev.resets||[]).slice(-100),resetCountTotal:Number(prev.resetCountTotal||0),guards:{officialOperatorOnly:true,noBetting:true,realMoneyAllowed:false}};
}
ledger.jackpotKingOfficialMonitor=status;
fs.writeFileSync(OUT,JSON.stringify(ledger,null,2)+'\n');
console.log(JSON.stringify({jackpotKingOfficialMonitor:{sourceReadable:status.sourceReadable,latest:status.latest||null,observationCountTotal:status.observationCountTotal,resetCountTotal:status.resetCountTotal,realMoneyAllowed:false}},null,2));

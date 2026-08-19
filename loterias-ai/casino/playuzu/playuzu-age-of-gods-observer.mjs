#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';

const OUT='loterias-ai/casino/lightning/evidence/economic-readiness-ledger-v1.json';
const FREEZE='loterias-ai/casino/playuzu/evidence/age-of-gods-monitor-freeze-v1.json';
const freeze=JSON.parse(fs.readFileSync(FREEZE,'utf8'));
if(freeze.version!=='playuzu-age-of-gods-monitor-freeze-v1'||freeze.immutable!==true||freeze.guards?.realMoneyAllowed!==false)throw new Error('Age monitor freeze drift');
const read=p=>{try{return JSON.parse(fs.readFileSync(p,'utf8'));}catch{return {};}};
const ledger=read(OUT),prev=ledger.ageOfGodsOfficialMonitor||{};
const now=new Date().toISOString();
const minInterval=Number(freeze.monitor.minimumIntervalSeconds||3600)*1000;
const lastObs=(prev.observations||[]).at(-1)||prev.latest||null;
if(lastObs?.observedAt&&Date.now()-Date.parse(lastObs.observedAt)<minInterval&&prev.source==='PlayUZU Spain structured jackpot backend — raw counter only'){
  console.log(JSON.stringify({skipped:true,reason:'MINIMUM_INTERVAL_NOT_REACHED',lastObservedAt:lastObs.observedAt,realMoneyAllowed:false},null,2));
  process.exit(0);
}
const page=Number(freeze.monitor.page),url=`${freeze.backend}?page=${page}&appName=${encodeURIComponent(freeze.appName)}`;
let obs;
try{
  const r=await fetch(url,{headers:{accept:'application/json','user-agent':'loterias-ai-playuzu-aotg-observer/1.0','referer':freeze.sourcePage,'origin':'https://www.playuzu.es','cache-control':'no-cache, no-store, max-age=0'}});
  const text=await r.text();let j=null;try{j=JSON.parse(text)}catch{}
  const data=Array.isArray(j?.data)?j.data:[];
  const age=data.filter(g=>/(age of the gods|aotg)/i.test(String(g.application_name||g.item_title||''))).map(g=>({name:String(g.application_name||g.item_title||''),rawValue:Number(g?.jackpot?.amount),reportedCurrency:g?.jackpot?.currency??null,reportedSymbol:g?.jackpot?.symbol??null,internalGameId:g.internal_game_id??null})).filter(x=>Number.isFinite(x.rawValue)&&x.rawValue>0);
  const buckets=new Map();for(const x of age){const k=x.rawValue.toFixed(6),b=buckets.get(k)||{rawValue:x.rawValue,titles:new Set(),reportedCurrencies:new Set()};b.titles.add(x.name);if(x.reportedCurrency)b.reportedCurrencies.add(String(x.reportedCurrency));buckets.set(k,b)}
  const ranked=[...buckets.values()].map(x=>({rawValue:x.rawValue,distinctTitles:x.titles.size,titles:[...x.titles],reportedCurrencies:[...x.reportedCurrencies]})).sort((a,b)=>b.distinctTitles-a.distinctTitles||b.rawValue-a.rawValue);
  const corroborated=ranked.find(x=>x.distinctTitles>=Number(freeze.monitor.minimumDistinctAgeTitles||2))||null;
  const rawValue=corroborated?.rawValue??null;
  const prior=(prev.observations||[]).filter(x=>Number.isFinite(Number(x.rawNetworkCounter))).at(-1)||null;
  const deltaRaw=Number.isFinite(rawValue)&&prior?Number((rawValue-Number(prior.rawNetworkCounter)).toFixed(6)):null;
  obs={observedAt:now,rawNetworkCounter:rawValue,corroborated:Boolean(corroborated),distinctTitleCount:corroborated?.distinctTitles??0,corroboratingTitles:corroborated?.titles??[],reportedCurrencies:corroborated?.reportedCurrencies??[],currencyTrusted:false,deltaRaw,possibleReset:Boolean(deltaRaw!==null&&deltaRaw<0),source:{url,httpStatus:r.status,responseSha256:crypto.createHash('sha256').update(text).digest('hex'),itemCount:data.length,page},ageEntries:age};
}catch(e){obs={observedAt:now,rawNetworkCounter:null,corroborated:false,currencyTrusted:false,error:String(e?.message||e),source:{url,page}};}
const observations=[...(prev.observations||[]),obs].slice(-240),resets=[...(prev.resets||[])];if(obs.possibleReset){const prior=observations.slice(0,-1).filter(x=>Number.isFinite(Number(x.rawNetworkCounter))).at(-1);if(prior)resets.push({observedAt:now,fromRaw:Number(prior.rawNetworkCounter),toRaw:Number(obs.rawNetworkCounter),dropRaw:Number((Number(prior.rawNetworkCounter)-Number(obs.rawNetworkCounter)).toFixed(6))});}
ledger.ageOfGodsOfficialMonitor={generatedAt:now,operator:'playuzu-es',network:'Playtech Age of the Gods',source:'PlayUZU Spain structured jackpot backend — raw counter only',sourceReadable:Boolean(obs.corroborated&&Number.isFinite(obs.rawNetworkCounter)),latest:obs,observations,observationCountTotal:Number(prev.observationCountTotal||0)+1,resets:resets.slice(-100),resetCountTotal:Number(prev.resetCountTotal||0)+(obs.possibleReset?1:0),economics:{rawNetworkCounterOnly:true,currencyTrusted:false,exactProgressiveContributionKnown:false,triggerOddsKnown:false,positiveEVClaimAllowed:false},guards:{oneFrozenBackendPage:true,minimumTwoDistinctAgeTitles:true,currencyConversionForbidden:true,noEconomicPromotionFromRawCounter:true,noBetting:true,realMoneyAllowed:false},realMoneyAllowed:false};
fs.writeFileSync(OUT,JSON.stringify(ledger,null,2)+'\n');console.log(JSON.stringify({sourceReadable:ledger.ageOfGodsOfficialMonitor.sourceReadable,rawNetworkCounter:obs.rawNetworkCounter,currencyTrusted:false,titles:obs.corroboratingTitles||[],realMoneyAllowed:false},null,2));

#!/usr/bin/env node
import fs from 'node:fs';

const OBS='loterias-ai/casino/jackpots/evidence/botemania-jackpot-king-observer-v1.json';
const LEDGER='loterias-ai/casino/jackpots/evidence/botemania-jpk-fast-reset-ledger-v1.json';
const GRAPHQL='https://www.botemania.es/es/graphql';
const REFERER='https://www.botemania.es/juegos/slots-online/fishin-frenzy-jackpot-king';
const VENTURE='botemania_es';
const query='query loadJackpots { blueprintJackpots { id amount } }';
const mapId=id=>({JACKPOTKING_ROYAL:'ROYAL',JACKPOTKING:'JACKPOT_KING',JACKPOTKING_REGAL:'REGAL'})[String(id)]||null;
const read=p=>{try{return JSON.parse(fs.readFileSync(p,'utf8'));}catch{return null}};
const now=new Date().toISOString();

const prev=read(OBS)||{};
const ledger=read(LEDGER)||{version:'botemania-jpk-fast-reset-ledger-v1',operator:'botemania-es',events:[]};
const candidates=[prev?.latest,ledger?.lastSample].filter(x=>x?.observedAt&&x?.labeledPots).sort((a,b)=>Date.parse(a.observedAt)-Date.parse(b.observedAt));
const prior=candidates.at(-1)||null;

const r=await fetch(GRAPHQL,{method:'POST',headers:{accept:'application/json','content-type':'application/json',venture:VENTURE,referer:REFERER,origin:'https://www.botemania.es','cache-control':'no-cache, no-store, max-age=0','user-agent':'edge-live-fast-meter-sample/1.1'},body:JSON.stringify({operationName:'loadJackpots',variables:{},query})});
const text=await r.text();let body=null;try{body=JSON.parse(text);}catch{}
const rows=Array.isArray(body?.data?.blueprintJackpots)?body.data.blueprintJackpots:[];
const labeledPots={};
for(const x of rows){const k=mapId(x?.id),n=Number(x?.amount);if(k&&Number.isFinite(n)&&n>0)labeledPots[k]=n;}
if(!r.ok||Object.keys(labeledPots).length!==3)throw new Error(`Fast Botemania meter sample failed HTTP=${r.status} pots=${JSON.stringify(labeledPots)}`);

const drops={};
for(const label of ['ROYAL','REGAL','JACKPOT_KING']){
  const from=Number(prior?.labeledPots?.[label]),to=Number(labeledPots[label]);
  if(Number.isFinite(from)&&from>0&&Number.isFinite(to)&&to>0&&from>to&&to/from<=0.90)drops[label]={from,to,dropRatio:Number((1-to/from).toFixed(6))};
}
const resetRows=[];
for(const tier of ['ROYAL','REGAL']){
  if(!drops[tier])continue;
  const sibling=tier==='ROYAL'?'REGAL':'ROYAL';
  const siblingFrom=Number(prior?.labeledPots?.[sibling]),siblingTo=Number(labeledPots[sibling]);
  const kingFrom=Number(prior?.labeledPots?.JACKPOT_KING),kingTo=Number(labeledPots.JACKPOT_KING);
  const siblingGrowth=Number.isFinite(siblingFrom)&&Number.isFinite(siblingTo)?siblingTo-siblingFrom:null;
  const kingGrowth=Number.isFinite(kingFrom)&&Number.isFinite(kingTo)?kingTo-kingFrom:null;
  const cleanSingleTierCandidate=!drops[sibling]&&!drops.JACKPOT_KING&&Number.isFinite(siblingGrowth)&&siblingGrowth>=0&&Number.isFinite(kingGrowth)&&kingGrowth>=0;
  const from=drops[tier].from;
  resetRows.push({eventId:`${tier}:${now}`,observedAt:now,fromObservedAt:prior?.observedAt||null,tier,fromEUR:+from.toFixed(2),toEUR:+drops[tier].to.toFixed(2),dropRatio:drops[tier].dropRatio,siblingTier:sibling,siblingGrowthEUR:Number.isFinite(siblingGrowth)?+siblingGrowth.toFixed(4):null,jackpotKingGrowthEUR:Number.isFinite(kingGrowth)?+kingGrowth.toFixed(4):null,cleanSingleTierCandidate,awardIntervalEUR:cleanSingleTierCandidate?{lower:+from.toFixed(2),upper:+(from+siblingGrowth).toFixed(2),width:+Math.max(0,siblingGrowth).toFixed(4)}:null,source:'BOTEMANIA_PUBLIC_GRAPHQL_FAST_15S',guards:{singleTierOnlyForCleanClassification:true,noHazardClaimFromSingleReset:true}});
}
if(drops.JACKPOT_KING)resetRows.push({eventId:`JACKPOT_KING:${now}`,observedAt:now,fromObservedAt:prior?.observedAt||null,tier:'JACKPOT_KING',fromEUR:+drops.JACKPOT_KING.from.toFixed(2),toEUR:+drops.JACKPOT_KING.to.toFixed(2),dropRatio:drops.JACKPOT_KING.dropRatio,cleanSingleTierCandidate:false,source:'BOTEMANIA_PUBLIC_GRAPHQL_FAST_15S'});

const observation={observedAt:now,sourceReadable:true,graphql:{endpoint:GRAPHQL,operationName:'loadJackpots',ventureHeader:VENTURE,httpStatus:r.status,ok:true,rows:rows.map(x=>({id:String(x?.id||''),label:mapId(x?.id),amountEUR:Number(x?.amount)})).filter(x=>x.label&&Number.isFinite(x.amountEUR))},pages:[],sharedAmounts:[],labeledPots,counterSource:'BOTEMANIA_PUBLIC_GRAPHQL_FAST'};
const observations=[...(Array.isArray(prev?.observations)?prev.observations:[]),observation].slice(-2016);
const allResets=[...(Array.isArray(prev?.resets)?prev.resets:[]),...resetRows].slice(-200);
const out={...prev,generatedAt:now,latest:observation,observations,resets:allResets,progress:{...(prev?.progress||{}),observations:observations.length,cleanLabeledResets:allResets.filter(x=>x.cleanSingleTierCandidate).length,labeledCurrentPots:3,publicGraphqlCaptureActive:true},fastSampler:{version:'botemania-fast-meter-sample-v1.1-persistent-reset-ledger',lastSampleAt:now,intervalSecondsTarget:15,noPageOrScriptScan:true,noBetting:true}};
fs.writeFileSync(OBS,JSON.stringify(out,null,2)+'\n');

const oldEvents=Array.isArray(ledger?.events)?ledger.events:[];
const dedup=new Map([...oldEvents,...resetRows].map(e=>[e.eventId||`${e.tier}:${e.observedAt}`,e]));
const events=[...dedup.values()].sort((a,b)=>Date.parse(a.observedAt)-Date.parse(b.observedAt)).slice(-500);
const fastLedger={version:'botemania-jpk-fast-reset-ledger-v1',generatedAt:now,operator:'botemania-es',samplingTargetSeconds:15,lastSample:{observedAt:now,labeledPots},events,summary:{events:events.length,cleanSingleTierCandidates:events.filter(e=>e.cleanSingleTierCandidate===true).length,royalClean:events.filter(e=>e.tier==='ROYAL'&&e.cleanSingleTierCandidate===true).length,regalClean:events.filter(e=>e.tier==='REGAL'&&e.cleanSingleTierCandidate===true).length},guards:{compactPersistenceOnly:true,noEverySampleHistoryPersisted:true,noOptionalStopping:true,noBetting:true,realMoneyAllowed:false}};
fs.mkdirSync('loterias-ai/casino/jackpots/evidence',{recursive:true});fs.writeFileSync(LEDGER,JSON.stringify(fastLedger,null,2)+'\n');
console.log(JSON.stringify({observedAt:now,labeledPots,resetsThisSample:resetRows,fastLedgerSummary:fastLedger.summary},null,2));

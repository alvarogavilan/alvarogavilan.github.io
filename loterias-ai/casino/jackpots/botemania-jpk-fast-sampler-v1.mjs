#!/usr/bin/env node
import fs from 'node:fs';

// Triggerable public sampler: same Botemania GraphQL counters, no protocol retuning.
const OUT='loterias-ai/casino/jackpots/evidence/botemania-jackpot-king-observer-v1.json';
const GRAPHQL='https://www.botemania.es/es/graphql';
const REFERER='https://www.botemania.es/juegos/slots-online/fishin-frenzy-jackpot-king';
const VENTURE='botemania_es';
const query='query loadJackpots { blueprintJackpots { id amount } }';
const mapId=id=>({JACKPOTKING_ROYAL:'ROYAL',JACKPOTKING:'JACKPOT_KING',JACKPOTKING_REGAL:'REGAL'})[String(id)]||null;
const valid=x=>Number.isFinite(Number(x))&&Number(x)>0;
const now=new Date().toISOString();

if(!fs.existsSync(OUT)) throw new Error('Observer evidence missing');
const prev=JSON.parse(fs.readFileSync(OUT,'utf8'));
const r=await fetch(GRAPHQL,{method:'POST',redirect:'follow',headers:{accept:'application/json','content-type':'application/json','user-agent':'loterias-ai-botemania-jpk-fast-sampler/1.0',referer:REFERER,origin:'https://www.botemania.es',venture:VENTURE,'cache-control':'no-cache, no-store, max-age=0'},body:JSON.stringify({operationName:'loadJackpots',variables:{},query})});
const text=await r.text();
let body=null;try{body=JSON.parse(text);}catch{}
const raw=Array.isArray(body?.data?.blueprintJackpots)?body.data.blueprintJackpots:[];
const rows=raw.map(x=>({id:String(x?.id||''),label:mapId(x?.id),amountEUR:valid(x?.amount)?Number(x.amount):null})).filter(x=>x.label&&valid(x.amountEUR));
if(!r.ok||rows.length<3) throw new Error(`Botemania GraphQL sample failed HTTP ${r.status} rows=${rows.length}`);
const labeled={};for(const x of rows)labeled[x.label]=x.amountEUR;
for(const k of ['ROYAL','REGAL','JACKPOT_KING']) if(!valid(labeled[k])) throw new Error(`Missing ${k}`);

const prior=(prev.observations||[]).at(-1)||null;
const observation={observedAt:now,sourceReadable:true,graphql:{endpoint:GRAPHQL,operationName:'loadJackpots',ventureHeader:VENTURE,httpStatus:r.status,ok:true,rows,error:null},pages:[],sharedAmounts:[],labeledPots:labeled,counterSource:'BOTEMANIA_PUBLIC_GRAPHQL_FAST_SAMPLE'};
const resets=[];
for(const k of ['ROYAL','REGAL','JACKPOT_KING']){
 const from=Number(prior?.labeledPots?.[k]),to=Number(labeled[k]);
 if(valid(from)&&valid(to)&&from>to&&to/from<=0.90) resets.push({observedAt:now,label:k,fromEUR:from,toEUR:to,dropRatio:+(1-to/from).toFixed(6),cleanLabelMatched:true,source:'BOTEMANIA_PUBLIC_GRAPHQL_FAST_SAMPLE'});
}
const observations=[...(prev.observations||[]),observation].slice(-2016);
const allResets=[...(prev.resets||[]),...resets].slice(-200);
const progress={...(prev.progress||{}),observations:observations.length,cleanLabeledResets:allResets.filter(x=>x.cleanLabelMatched).length,labeledCurrentPots:3,publicGraphqlCaptureActive:true};
const out={...prev,generatedAt:now,latest:observation,observations,resets:allResets,progress,fastSampler:{version:'botemania-jpk-fast-sampler-v1',lastSampleAt:now,publicGraphqlOnly:true,noAuthenticationBypass:true,noPrivateCredentials:true}};
fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({sampledAt:now,labeledPots:labeled,resetsThisRun:resets,observations:observations.length},null,2));
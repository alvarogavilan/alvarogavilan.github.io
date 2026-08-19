#!/usr/bin/env node
import fs from 'node:fs';

const OBS='loterias-ai/casino/jackpots/evidence/botemania-jackpot-king-observer-v1.json';
const GRAPHQL='https://www.botemania.es/es/graphql';
const REFERER='https://www.botemania.es/juegos/slots-online/fishin-frenzy-jackpot-king';
const VENTURE='botemania_es';
const query='query loadJackpots { blueprintJackpots { id amount } }';
const mapId=id=>({JACKPOTKING_ROYAL:'ROYAL',JACKPOTKING:'JACKPOT_KING',JACKPOTKING_REGAL:'REGAL'})[String(id)]||null;
const now=new Date().toISOString();

const prev=JSON.parse(fs.readFileSync(OBS,'utf8'));
const r=await fetch(GRAPHQL,{
  method:'POST',
  headers:{accept:'application/json','content-type':'application/json',venture:VENTURE,referer:REFERER,origin:'https://www.botemania.es','cache-control':'no-cache, no-store, max-age=0','user-agent':'edge-live-fast-meter-sample/1.0'},
  body:JSON.stringify({operationName:'loadJackpots',variables:{},query})
});
const text=await r.text();
let body=null;try{body=JSON.parse(text);}catch{}
const rows=Array.isArray(body?.data?.blueprintJackpots)?body.data.blueprintJackpots:[];
const labeledPots={};
for(const x of rows){const k=mapId(x?.id),n=Number(x?.amount);if(k&&Number.isFinite(n)&&n>0)labeledPots[k]=n;}
if(!r.ok||Object.keys(labeledPots).length!==3)throw new Error(`Fast Botemania meter sample failed HTTP=${r.status} pots=${JSON.stringify(labeledPots)}`);

const prior=prev?.latest||null;
const resets=[];
for(const label of ['ROYAL','REGAL','JACKPOT_KING']){
  const from=Number(prior?.labeledPots?.[label]),to=Number(labeledPots[label]);
  if(Number.isFinite(from)&&from>0&&Number.isFinite(to)&&to>0&&from>to&&to/from<=0.90){
    resets.push({observedAt:now,label,fromEUR:from,toEUR:to,dropRatio:Number((1-to/from).toFixed(6)),cleanLabelMatched:true,source:'BOTEMANIA_PUBLIC_GRAPHQL_FAST'});
  }
}

const observation={
  observedAt:now,
  sourceReadable:true,
  graphql:{endpoint:GRAPHQL,operationName:'loadJackpots',ventureHeader:VENTURE,httpStatus:r.status,ok:true,rows:rows.map(x=>({id:String(x?.id||''),label:mapId(x?.id),amountEUR:Number(x?.amount)})).filter(x=>x.label&&Number.isFinite(x.amountEUR))},
  pages:[],sharedAmounts:[],labeledPots,counterSource:'BOTEMANIA_PUBLIC_GRAPHQL_FAST'
};
const observations=[...(Array.isArray(prev?.observations)?prev.observations:[]),observation].slice(-2016);
const allResets=[...(Array.isArray(prev?.resets)?prev.resets:[]),...resets].slice(-200);
const out={...prev,generatedAt:now,latest:observation,observations,resets:allResets,progress:{...(prev?.progress||{}),observations:observations.length,cleanLabeledResets:allResets.filter(x=>x.cleanLabelMatched).length,labeledCurrentPots:3,publicGraphqlCaptureActive:true},fastSampler:{version:'botemania-fast-meter-sample-v1',lastSampleAt:now,intervalFriendly:true,noPageOrScriptScan:true,noBetting:true}};
fs.writeFileSync(OBS,JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({observedAt:now,labeledPots,resetsThisSample:resets},null,2));

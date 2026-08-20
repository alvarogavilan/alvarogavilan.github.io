#!/usr/bin/env node
import fs from 'node:fs';

const OUT='loterias-ai/edge-live/evidence/botemania-all-network-live-state-v1.json';
const ENDPOINT='https://www.botemania.es/es/graphql';
const QUERY=`query loadJackpots {
  jackpots { id amount }
  redTigerJackpots { id amount }
  blueprintJackpots { id amount }
}`;
const now=new Date().toISOString();
const read=p=>{try{return JSON.parse(fs.readFileSync(p,'utf8'));}catch{return null}};
const previous=read(OUT)||{};

const r=await fetch(ENDPOINT,{
  method:'POST',
  headers:{
    accept:'application/json',
    'content-type':'application/json',
    venture:'botemania_es',
    origin:'https://www.botemania.es',
    referer:'https://www.botemania.es/',
    'cache-control':'no-cache, no-store, max-age=0',
    'user-agent':'edge-live-all-network-fast-meter/1.1'
  },
  body:JSON.stringify({operationName:'loadJackpots',variables:{},query:QUERY})
});
const text=await r.text();
let body=null;try{body=JSON.parse(text)}catch{}
if(!r.ok)throw new Error(`Botemania all-network meter HTTP=${r.status}`);

const rows=[];
const add=(network,items)=>{
  for(const x of Array.isArray(items)?items:[]){
    const id=String(x?.id??'').trim(),amountEUR=Number(x?.amount);
    if(id&&Number.isFinite(amountEUR)&&amountEUR>=0)rows.push({network,id,amountEUR:+amountEUR.toFixed(6)});
  }
};
add('generic',body?.data?.jackpots);
add('redTiger',body?.data?.redTigerJackpots);
add('blueprint',body?.data?.blueprintJackpots);
if(!rows.length)throw new Error('Botemania all-network meter returned no readable rows');

// The public feed can repeat the same logical jackpot for several tiles/games.
// Equal network+id+amount rows are safe aliases and collapse to one state.
// Only an id carrying >1 distinct amount at the same instant is ambiguous.
const grouped=new Map();
for(const x of rows){
  const key=`${x.network}:${x.id}`;
  if(!grouped.has(key))grouped.set(key,[]);
  grouped.get(key).push(x);
}
const ambiguousKeys=[];
const canonicalRows=[];
let collapsedAliasRows=0;
for(const [key,group] of grouped){
  const amounts=[...new Set(group.map(x=>Number(x.amountEUR).toFixed(6)))];
  if(amounts.length!==1){ambiguousKeys.push(key);continue;}
  canonicalRows.push(group[0]);
  collapsedAliasRows+=Math.max(0,group.length-1);
}
ambiguousKeys.sort();
const currentByKey=Object.fromEntries(canonicalRows.map(x=>[`${x.network}:${x.id}`,x]));
const prevByKey=previous?.currentByKey&&typeof previous.currentByKey==='object'?previous.currentByKey:{};

const resetEvents=[];
for(const [key,current] of Object.entries(currentByKey)){
  const prior=prevByKey[key];
  const from=Number(prior?.amountEUR),to=Number(current?.amountEUR);
  if(!Number.isFinite(from)||!Number.isFinite(to)||from<=0||to<0||to>=from)continue;
  const dropFraction=1-to/from;
  if(dropFraction<0.20)continue;
  resetEvents.push({
    eventId:`${key}:${now}`,
    observedAt:now,
    fromObservedAt:previous?.observedAt||null,
    key,
    network:current.network,
    id:current.id,
    fromEUR:+from.toFixed(6),
    toEUR:+to.toFixed(6),
    dropEUR:+(from-to).toFixed(6),
    dropFraction:+dropFraction.toFixed(6),
    identityClass:'EXACT_NETWORK_ID_WITH_SINGLE_LIVE_AMOUNT',
    economicPromotionAllowed:false
  });
}

const oldEvents=Array.isArray(previous?.resetEvents)?previous.resetEvents:[];
const dedup=new Map([...oldEvents,...resetEvents].map(e=>[e.eventId,e]));
const events=[...dedup.values()].sort((a,b)=>Date.parse(a.observedAt)-Date.parse(b.observedAt)).slice(-1000);
const out={
  version:'botemania-all-network-live-state-v1.1-alias-collapse',
  generatedAt:now,
  observedAt:now,
  operator:'botemania-es',
  source:{endpoint:ENDPOINT,operationName:'loadJackpots',httpStatus:r.status,publicNoAuth:true},
  coverage:{
    totalRows:rows.length,
    canonicalIdentityRows:canonicalRows.length,
    collapsedAliasRows,
    ambiguousIdentityKeys:ambiguousKeys.length,
    networks:[...new Set(rows.map(x=>x.network))]
  },
  rows,
  canonicalRows,
  ambiguousKeys,
  currentByKey,
  resetEvents:events,
  summary:{newResetEvents:resetEvents.length,totalResetEvents:events.length},
  guards:{
    noRankBasedIdentity:true,
    equalAmountAliasesCollapsed:true,
    conflictingAmountIdsQuarantined:true,
    exactNetworkIdSingleAmountRequiredForTransitions:true,
    noResetImpliesNoEdgeClaim:true,
    noBetting:true,
    realMoneyAllowed:false
  }
};
fs.mkdirSync('loterias-ai/edge-live/evidence',{recursive:true});
fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({observedAt:now,coverage:out.coverage,ambiguousKeys,newResetEvents:resetEvents,current:canonicalRows},null,2));

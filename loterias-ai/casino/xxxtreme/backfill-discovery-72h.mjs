#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';

const ENDPOINT='https://api-cs.casino.org/svc-evolution-game-events/api/xxxtremelightningroulette';
const FREEZE='loterias-ai/casino/xxxtreme/evidence/authoritative-segment-v1-freeze.json';
const OUT='loterias-ai/casino/xxxtreme/discovery/history-72h.jsonl';
const STATUS='loterias-ai/casino/xxxtreme/discovery/history-72h-status.json';
const freeze=JSON.parse(fs.readFileSync(FREEZE,'utf8')),barrier=Date.parse(freeze.prospectiveStartsAt),lower=barrier-72*3600_000;
if(!Number.isFinite(barrier)||freeze.guards?.realMoneyAllowed!==false)throw new Error('XXXtreme discovery freeze unavailable');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function norm(item){const d=item?.data||item,id=String(item?.id||d?.id||''),rawTs=d?.settledAt||d?.startedAt||null,t=Date.parse(rawTs),winner=Number(d?.result?.outcome?.number),lucky=Array.isArray(d?.result?.luckyNumbersList)?d.result.luckyNumbersList:[];if(!id||!Number.isFinite(t)||!Number.isInteger(winner)||winner<0||winner>36)return null;const luckyEvents=lucky.map(x=>({number:Number(x?.number),multiplier:Number(x?.roundedMultiplier??x?.multiplier),eventType:x?.type??x?.kind??null})).filter(x=>Number.isInteger(x.number)&&x.number>=0&&x.number<=36&&Number.isFinite(x.multiplier)&&x.multiplier>0);return{roundId:id,timestamp:new Date(t).toISOString(),winner,luckyEvents,source:'casinoorg-evolution-public-api-xxxtreme',mode:'DISCOVERY_ONLY_PRE_PROSPECTIVE',prospectiveEligible:false,realMoney:false,rawHash:crypto.createHash('sha256').update(JSON.stringify(item)).digest('hex')}}
const byId=new Map(),pages=[];let stopReason='MAX_PAGES';
for(let page=0;page<180;page++){
  const url=page===0?ENDPOINT:`${ENDPOINT}?page=${page}`;
  const res=await fetch(url,{headers:{accept:'application/json','user-agent':'LoteriasAI-xxxtreme-discovery-backfill/1.0'}});
  if(!res.ok){stopReason=`HTTP_${res.status}_PAGE_${page}`;break}
  const text=await res.text();let j;try{j=JSON.parse(text)}catch{stopReason=`INVALID_JSON_PAGE_${page}`;break}
  const items=Array.isArray(j)?j:Array.isArray(j?.data)?j.data:[];
  if(!items.length){stopReason=`EMPTY_PAGE_${page}`;break}
  const normalized=items.map(norm).filter(Boolean),times=normalized.map(x=>Date.parse(x.timestamp)).filter(Number.isFinite);pages.push({page,count:items.length,newest:times.length?new Date(Math.max(...times)).toISOString():null,oldest:times.length?new Date(Math.min(...times)).toISOString():null});
  for(const r of normalized)if(Date.parse(r.timestamp)<barrier&&Date.parse(r.timestamp)>=lower)byId.set(r.roundId,r);
  if(times.length&&Math.min(...times)<lower){stopReason=`REACHED_72H_PAGE_${page}`;break}
  await sleep(40);
}
const rows=[...byId.values()].sort((a,b)=>a.timestamp.localeCompare(b.timestamp)||a.roundId.localeCompare(b.roundId));
if(rows.some(r=>Date.parse(r.timestamp)>=barrier))throw new Error('discovery backfill leaked across prospective barrier');
fs.mkdirSync('loterias-ai/casino/xxxtreme/discovery',{recursive:true});fs.writeFileSync(OUT,rows.map(r=>JSON.stringify(r)).join('\n')+(rows.length?'\n':''));
const status={version:'xxxtreme-discovery-history-72h-v1',generatedAt:new Date().toISOString(),mode:'DISCOVERY_ONLY_PRE_PROSPECTIVE',endpoint:ENDPOINT,prospectiveBarrier:freeze.prospectiveStartsAt,requestedWindowHours:72,pagesFetched:pages.length,rounds:rows.length,firstAt:rows[0]?.timestamp??null,lastAt:rows.at(-1)?.timestamp??null,stopReason,pageSummary:pages,guards:{strictlyBeforeProspectiveBarrier:true,prospectiveEligible:false,cannotSeedProspectiveState:true,cannotPromoteByItself:true,automaticBettingAllowed:false,realMoneyAllowed:false,realStakeEUR:0}};fs.writeFileSync(STATUS,JSON.stringify(status,null,2)+'\n');console.log(JSON.stringify({rounds:status.rounds,pagesFetched:status.pagesFetched,firstAt:status.firstAt,lastAt:status.lastAt,stopReason},null,2));

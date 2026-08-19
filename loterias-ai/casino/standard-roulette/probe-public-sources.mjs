#!/usr/bin/env node
import fs from 'node:fs';
const base='https://api-cs.casino.org/svc-evolution-game-events/api/';
const candidates=['roulette','immersiveroulette','autoroulette','speedroulette','viproulette','instantroulette','goldvaultroulette','americanroulette','classicroulette','firstpersonroulette','immersiveroulettedeluxe'];
const out=[];
for(const slug of candidates){
  try{
    const r=await fetch(base+slug,{headers:{accept:'application/json','user-agent':'loterias-ai-standard-roulette-probe/1.0'}});
    const text=await r.text();
    let body=null;try{body=JSON.parse(text)}catch{}
    const rows=Array.isArray(body)?body:(Array.isArray(body?.data)?body.data:(Array.isArray(body?.results)?body.results:[]));
    const sample=rows[0]||null;
    out.push({slug,httpStatus:r.status,ok:r.ok,count:rows.length,keys:sample&&typeof sample==='object'?Object.keys(sample).slice(0,20):[],sample:sample&&typeof sample==='object'?{id:sample.id??sample.roundId??null,startedAt:sample.startedAt??sample.startTime??null,settledAt:sample.settledAt??sample.timestamp??null,result:sample.result??sample.winner??sample.number??null}:null});
  }catch(e){out.push({slug,error:String(e?.message||e)});}
}
const report={version:'standard-roulette-public-source-probe-v1',generatedAt:new Date().toISOString(),mode:'ONE_SHOT_DISCOVERY_ONLY',base,candidates,out,guards:{noRowsPersisted:true,prospectiveEligible:false,cannotPromote:true,automaticBettingAllowed:false,realMoneyAllowed:false,realStakeEUR:0}};
fs.mkdirSync('loterias-ai/casino/standard-roulette/evidence',{recursive:true});
fs.writeFileSync('loterias-ai/casino/standard-roulette/evidence/public-source-probe.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));

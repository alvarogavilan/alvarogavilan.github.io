#!/usr/bin/env node
import fs from 'node:fs';
const base='https://api-cs.casino.org/svc-evolution-game-events/api/';
const candidates=['roulette','immersiveroulette','autoroulette','speedroulette','viproulette','instantroulette','goldvaultroulette','americanroulette','classicroulette','firstpersonroulette','immersiveroulettedeluxe'];
const out=[];
const pick=(o,keys)=>{for(const k of keys){if(o&&o[k]!==undefined&&o[k]!==null)return o[k]}return null};
for(const slug of candidates){
  try{
    const r=await fetch(base+slug,{headers:{accept:'application/json','user-agent':'loterias-ai-standard-roulette-probe/1.1'}});
    const text=await r.text();
    let body=null;try{body=JSON.parse(text)}catch{}
    const rows=Array.isArray(body)?body:(Array.isArray(body?.data)?body.data:(Array.isArray(body?.results)?body.results:[]));
    const sample=rows[0]||null;
    const data=sample&&typeof sample?.data==='object'?sample.data:null;
    const nestedResult=data&&typeof data?.result==='object'?data.result:null;
    out.push({
      slug,httpStatus:r.status,ok:r.ok,count:rows.length,
      keys:sample&&typeof sample==='object'?Object.keys(sample).slice(0,30):[],
      dataKeys:data?Object.keys(data).slice(0,40):[],
      resultKeys:nestedResult?Object.keys(nestedResult).slice(0,40):[],
      sample:sample&&typeof sample==='object'?{
        id:sample.id??sample.roundId??null,
        topStartedAt:sample.startedAt??sample.startTime??null,
        topSettledAt:sample.settledAt??sample.timestamp??null,
        topResult:sample.result??sample.winner??sample.number??null,
        dataStartedAt:pick(data,['startedAt','startTime','started','createdAt']),
        dataSettledAt:pick(data,['settledAt','timestamp','completedAt','endedAt']),
        dataResult:pick(data,['result','winner','winningNumber','number','outcome']),
        nestedResult
      }:null
    });
  }catch(e){out.push({slug,error:String(e?.message||e)});}
}
const report={version:'standard-roulette-public-source-probe-v2',generatedAt:new Date().toISOString(),mode:'ONE_SHOT_DISCOVERY_ONLY',base,candidates,out,guards:{noRowsPersisted:true,prospectiveEligible:false,cannotPromote:true,automaticBettingAllowed:false,realMoneyAllowed:false,realStakeEUR:0}};
fs.mkdirSync('loterias-ai/casino/standard-roulette/evidence',{recursive:true});
fs.writeFileSync('loterias-ai/casino/standard-roulette/evidence/public-source-probe.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));

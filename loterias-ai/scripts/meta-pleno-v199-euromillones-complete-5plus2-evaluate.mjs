#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';

const freezePath='loterias-ai/data/prospective/euromillones-v199-complete-5plus2-2026-08-18.json';
const archiveDir='loterias-ai/data/archive/euromillones';
const outPath='loterias-ai/data/research/euromillones-v199-complete-5plus2-evaluation.json';
const freeze=JSON.parse(fs.readFileSync(freezePath,'utf8'));
const targetDate=freeze.config.target;
let rows=[];
for(const f of fs.readdirSync(archiveDir).filter(x=>/^\d{4}\.json$/.test(x)).sort()){
  const d=JSON.parse(fs.readFileSync(`${archiveDir}/${f}`,'utf8'));
  rows.push(...(Array.isArray(d)?d:(d.records||d.draws||d.results||[])));
}
const dateOf=r=>String(r?.drawDate||r?.date||r?.fecha||'').slice(0,10);
const target=rows.find(r=>dateOf(r)===targetDate);
const arr=(...xs)=>{for(const x of xs){if(Array.isArray(x)){const a=x.map(Number).filter(Number.isFinite);if(a.length)return a}if(typeof x==='string'){const a=(x.match(/\d+/g)||[]).map(Number);if(a.length)return a}}return[]};
const base={version:'euromillones-v199-complete-5plus2-evaluation-v1',targetDrawDate:targetDate,freezeFingerprintSha256:freeze.fingerprintSha256,retuningPerformed:false,selectionUsedTargetResult:false,realMoneyPass:false,realStakeEUR:0,bettingRecommendation:false};
let semantic;
if(!target) semantic={...base,status:'WAITING_OFFICIAL_ARCHIVE',ticket:freeze.tickets[0],next:'wait for official archived target draw; do not alter freeze'};
else {
  const nums=arr(target?.result?.main,target?.result?.numbers,target?.numbers,target?.combination,target?.winningNumbers).slice(0,5);
  const stars=arr(target?.result?.stars,target?.stars,target?.estrellas).slice(0,2);
  if(nums.length!==5||stars.length!==2) semantic={...base,status:'WAITING_COMPLETE_OFFICIAL_RESULT',ticket:freeze.tickets[0],archivedTargetFound:true};
  else {
    const t=freeze.tickets[0], nHits=t.numbers.filter(n=>nums.includes(Number(n))).length, sHits=t.stars.filter(s=>stars.includes(Number(s))).length;
    semantic={...base,status:'EVALUATED',ticket:t,winningNumbers:nums,winningStars:stars,numberHits:nHits,starHits:sHits,category:`${nHits}+${sHits}`,full5plus2:nHits===5&&sHits===2,nearFull:nHits>=4||nHits===5,claimAllowed:nHits===5&&sHits===2,interpretation:nHits===5&&sHits===2?'prospective 5+2 matched; requires independent replication before any predictive claim':'record prospective result only; no retuning'};
  }
}
const evaluationHash=crypto.createHash('sha256').update(JSON.stringify(semantic)).digest('hex');
const existing=fs.existsSync(outPath)?JSON.parse(fs.readFileSync(outPath,'utf8')):null;
if(existing?.evaluationHash===evaluationHash){
  console.log(JSON.stringify({...semantic,evaluationHash,persisted:false,reasonNotPersisted:'semantic evaluation unchanged'},null,2));
  process.exit(0);
}
const out={...semantic,generatedAt:new Date().toISOString(),evaluationHash};
fs.mkdirSync('loterias-ai/data/research',{recursive:true});
fs.writeFileSync(outPath,JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({...out,persisted:true},null,2));

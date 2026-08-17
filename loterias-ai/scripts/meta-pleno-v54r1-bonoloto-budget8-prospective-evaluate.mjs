#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';

const freezePath='loterias-ai/data/shadow/bonoloto-2026-08-17-metapleno-v54r1-budget8.json';
const archivePath='loterias-ai/data/archive/bonoloto/2026.json';
const outPath='loterias-ai/data/research/bonoloto-v54r1-budget8-prospective-evaluation.json';
const freeze=JSON.parse(fs.readFileSync(freezePath,'utf8'));
const archive=JSON.parse(fs.readFileSync(archivePath,'utf8'));
const rows=Array.isArray(archive)?archive:(archive.records||archive.draws||archive.results||[]);
const dateOf=r=>String(r?.drawDate||r?.date||r?.fecha||'').slice(0,10);
const target=rows.find(r=>dateOf(r)===freeze.targetDrawDate);
function mainNumbers(r){
  const candidates=[r?.result?.main,r?.result?.numbers,r?.result?.combination,r?.numbers,r?.combination,r?.winningNumbers,r?.resultado?.combinacion];
  for(const x of candidates){
    if(Array.isArray(x)){const a=x.map(Number).filter(Number.isFinite);if(a.length>=6)return a.slice(0,6)}
    if(typeof x==='string'){const a=(x.match(/\d+/g)||[]).map(Number);if(a.length>=6)return a.slice(0,6)}
  }
  return [];
}
const base={version:'bonoloto-v54r1-budget8-prospective-evaluation-v1',engine:freeze.engine,targetDrawDate:freeze.targetDrawDate,freezeSealSHA256:freeze.sealSHA256,specUnchanged:freeze.specUnchanged===true,retuningPerformed:false,selectionUsedTargetResult:false,realMoneyPass:false,realStakeEUR:0,bettingRecommendation:false};
let semantic;
if(!target){
  semantic={...base,status:'WAITING_OFFICIAL_ARCHIVE',pool:freeze.pool,next:'wait for official archived target draw; do not alter freeze'};
}else{
  const winning=mainNumbers(target);
  if(winning.length!==6) semantic={...base,status:'WAITING_COMPLETE_OFFICIAL_RESULT',pool:freeze.pool,archivedTargetFound:true,next:'wait for complete six-number official result'};
  else {
    const pool=[...freeze.pool].map(Number);
    const matched=winning.filter(n=>pool.includes(n));
    const fullSixCovered=matched.length===6;
    const nearFull5of6=matched.length===5;
    const status=fullSixCovered?'EVALUATED_FULL_6_OF_6':nearFull5of6?'EVALUATED_NEAR_FULL_5_OF_6':'EVALUATED_NEGATIVE';
    semantic={...base,status,pool,winningNumbers:winning,matchedNumbers:matched,poolHits:matched.length,poolMisses:6-matched.length,fullSixCovered,nearFull5of6,coverageLines:freeze.coverage?.simpleCombinations??28,claimAllowed:fullSixCovered,interpretation:fullSixCovered?'pool contained the six official winning numbers; requires independent replication before any claim':nearFull5of6?'prospective 5/6 near-full; record only, no retuning':'prospective replication did not reach near-full threshold'};
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

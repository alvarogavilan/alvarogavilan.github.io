#!/usr/bin/env node
import fs from 'node:fs';

const DATA='loterias-ai/casino/lightning/data/casinoorg-lightningroulette.jsonl';
const OUT='loterias-ai/casino/lightning/evidence/source-cadence-baseline-v1.json';
const CUTOFF='2026-08-18T05:57:30.374Z';
const cutoffMs=Date.parse(CUTOFF);

const rows=fs.readFileSync(DATA,'utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse)
  .map(r=>({roundId:String(r.roundId||''),timestamp:new Date(Date.parse(r.timestamp??r.ts)).toISOString()}))
  .filter(r=>r.roundId&&Number.isFinite(Date.parse(r.timestamp))&&Date.parse(r.timestamp)<=cutoffMs)
  .sort((a,b)=>a.timestamp.localeCompare(b.timestamp)||a.roundId.localeCompare(b.roundId));

if(rows.length<100)throw new Error('insufficient pre-gap authoritative rows');
const gaps=[];
for(let i=1;i<rows.length;i++){
  const seconds=(Date.parse(rows[i].timestamp)-Date.parse(rows[i-1].timestamp))/1000;
  if(seconds<0)throw new Error('non-monotonic timestamps');
  gaps.push({seconds,from:rows[i-1],to:rows[i]});
}
const values=gaps.map(g=>g.seconds).sort((a,b)=>a-b);
const q=p=>values[Math.min(values.length-1,Math.max(0,Math.ceil(p*values.length)-1))];
const countOver=x=>gaps.filter(g=>g.seconds>x).length;
const top=[...gaps].sort((a,b)=>b.seconds-a.seconds).slice(0,25);
const targetGapSeconds=144.5;
const report={
  version:'source-cadence-baseline-v1',
  generatedAt:new Date().toISOString(),
  source:'existing authoritative corpus only',
  decisionIsolation:{
    cutoffInclusive:CUTOFF,
    targetRecoveryGapSeconds:targetGapSeconds,
    postCutoffRowsRead:false,
    purpose:'Calibrate continuity policy from data that existed before the current ingestion gap; do not relax a threshold by looking at prospective outcomes.'
  },
  rows:rows.length,
  intervals:gaps.length,
  cadenceSeconds:{
    median:q(0.5),p90:q(0.9),p95:q(0.95),p99:q(0.99),p999:q(0.999),max:values.at(-1),
    over60:countOver(60),over90:countOver(90),over120:countOver(120),over150:countOver(150),over180:countOver(180),over300:countOver(300)
  },
  targetGapContext:{
    seconds:targetGapSeconds,
    countHistoricalIntervalsAtLeastAsLarge:gaps.filter(g=>g.seconds>=targetGapSeconds).length,
    percentileApprox:(values.filter(v=>v<=targetGapSeconds).length/values.length)
  },
  topGaps:top,
  guards:{
    noProspectiveOutcomeRead:true,
    noModelRetuning:true,
    automaticBettingAllowed:false,
    realMoneyAllowed:false
  }
};
fs.mkdirSync('loterias-ai/casino/lightning/evidence',{recursive:true});
fs.writeFileSync(OUT,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({rows:report.rows,cadenceSeconds:report.cadenceSeconds,targetGapContext:report.targetGapContext},null,2));

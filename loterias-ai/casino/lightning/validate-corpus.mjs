import fs from 'node:fs';
import crypto from 'node:crypto';

const input=process.argv[2]||'loterias-ai/casino/lightning/data/rounds.jsonl';
if(!fs.existsSync(input)){
  console.log(JSON.stringify({status:'NO_DATA',trainingEligible:false,realMoney:false}));
  process.exit(0);
}
const text=fs.readFileSync(input,'utf8').trim();
if(!text){
  console.log(JSON.stringify({status:'EMPTY',trainingEligible:false,realMoney:false}));
  process.exit(0);
}
const rows=text.split(/\r?\n/).filter(Boolean).map((line,i)=>{
  try{return JSON.parse(line)}catch{throw new Error(`Bad JSONL line ${i+1}`)}
});
const seen=new Set();
let duplicates=0,bad=0,complete=0,withLightning=0;
const gaps=[];
const winners=Array(37).fill(0);
const mults={};
let prev=null;
for(const [i,r] of rows.entries()){
  const validId=typeof r.roundId==='string'&&r.roundId.length>0;
  const validTs=typeof r.ts==='string'&&!Number.isNaN(Date.parse(r.ts));
  const validWinner=Number.isInteger(r.winner)&&r.winner>=0&&r.winner<=36;
  const validLightning=Array.isArray(r.lightning)&&r.lightning.every(x=>Number.isInteger(x.number)&&x.number>=0&&x.number<=36&&Number.isFinite(x.multiplier)&&x.multiplier>=1);
  if(!validId||!validTs||!validWinner||!validLightning){bad++;continue;}
  if(seen.has(r.roundId)) duplicates++; else seen.add(r.roundId);
  const t=Date.parse(r.ts);
  if(prev!==null){const d=(t-prev)/1000;if(d<=0) bad++; else gaps.push(d)}
  prev=t;
  complete++;
  winners[r.winner]++;
  if(r.lightning.length) withLightning++;
  for(const x of r.lightning) mults[x.multiplier]=(mults[x.multiplier]||0)+1;
}
gaps.sort((a,b)=>a-b);
const q=p=>gaps.length?gaps[Math.min(gaps.length-1,Math.floor((gaps.length-1)*p))]:null;
const completeRate=rows.length?complete/rows.length:0;
const uniqueRate=complete?seen.size/complete:0;
const trainingEligible=rows.length>=500 && bad===0 && duplicates===0 && completeRate===1;
const report={
  status:trainingEligible?'PASS':'BLOCKED',
  dataset:{rows:rows.length,sha256:crypto.createHash('sha256').update(text).digest('hex')},
  quality:{complete,bad,duplicates,completeRate,uniqueRate,withLightning,withLightningRate:complete?withLightning/complete:0},
  timing:{gapSecondsP50:q(.5),gapSecondsP95:q(.95),gapSecondsP99:q(.99),maxGapSeconds:gaps.at(-1)??null},
  distributions:{winners,multipliers:mults},
  gates:{minimumRows:500,strictChronology:true,noDuplicates:true,noMalformedRows:true},
  trainingEligible,
  realMoney:false
};
console.log(JSON.stringify(report,null,2));
if(!trainingEligible) process.exitCode=3;

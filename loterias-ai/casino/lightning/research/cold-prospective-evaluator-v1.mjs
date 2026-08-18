#!/usr/bin/env node
import fs from 'node:fs';

const OUT='loterias-ai/casino/lightning/evidence/cold-prospective-evaluation-v1.json';
const freeze=JSON.parse(fs.readFileSync('loterias-ai/casino/lightning/evidence/cold-prospective-freeze-v1.json','utf8'));
const rows=fs.readFileSync('loterias-ai/casino/lightning/data/casinoorg-lightningroulette.jsonl','utf8').trim().split('\n').filter(Boolean).map(JSON.parse).filter(r=>Number.isInteger(r.winner)&&r.timestamp).sort((a,b)=>new Date(a.timestamp)-new Date(b.timestamp));
const future=rows.filter(r=>new Date(r.timestamp)>new Date(freeze.freezeLastTimestamp));
const minimumProspectiveRounds=Number(freeze.minimumProspectiveRounds)||500;
const alpha=0.05;
// Lock inference to the preregistered boundary. Rows arriving after the first 500
// remain observable as corpus growth but must not alter the primary frozen test.
const evaluationFuture=future.slice(0,minimumProspectiveRounds);

function selectAt(idx,c){
  const start=Math.max(0,idx-c.lookback);
  const hist=rows.slice(start,idx);
  const counts=Array(37).fill(0);
  for(const r of hist)counts[r.winner]++;
  return [...Array(37).keys()].sort((a,b)=>counts[a]-counts[b]||a-b).slice(0,c.pickCount);
}

function luckyMultiplierForWinner(r){
  if(Array.isArray(r.allLuckyNumbers)&&Array.isArray(r.allLuckyMultipliers)){
    const i=r.allLuckyNumbers.findIndex(n=>Number(n)===r.winner);
    if(i>=0)return Number(r.allLuckyMultipliers[i]??0);
  }
  const lucky=Array.isArray(r.lightningNumbers)?r.lightningNumbers:[];
  const entry=lucky.find(x=>Number(x?.number??x?.value??x?.num)===r.winner);
  return entry?Number(entry.multiplier??entry.x??0):0;
}

function binomialUpperTail(k,n,p){
  if(k<=0)return 1;
  if(k>n)return 0;
  if(p<=0)return 0;
  if(p>=1)return 1;
  const q=1-p;
  let prob=Math.pow(q,n);
  let sum=0;
  for(let i=0;i<=n;i++){
    if(i>=k)sum+=prob;
    if(i<n)prob*=((n-i)/(i+1))*(p/q);
  }
  return Math.min(1,Math.max(0,sum));
}

const startIdx=rows.findIndex(r=>new Date(r.timestamp)>new Date(freeze.freezeLastTimestamp));
let candidates=freeze.candidates.map(c=>{
  let hits=0,luckyHits=0,big100=0,big200=0,big500=0;
  for(let j=0;j<evaluationFuture.length;j++){
    const idx=startIdx+j;
    const sel=selectAt(idx,c);
    const r=rows[idx];
    if(sel.includes(r.winner)){
      hits++;
      const m=luckyMultiplierForWinner(r);
      if(m>0){
        luckyHits++;
        if(m>=100)big100++;
        if(m>=200)big200++;
        if(m>=500)big500++;
      }
    }
  }
  const nullRate=c.pickCount/37;
  const hitRate=evaluationFuture.length?hits/evaluationFuture.length:null;
  const rawP=evaluationFuture.length?binomialUpperTail(hits,evaluationFuture.length,nullRate):null;
  return{
    id:c.id,
    lookback:c.lookback,
    pickCount:c.pickCount,
    rounds:evaluationFuture.length,
    hits,
    hitRate,
    nullRate,
    excess:hitRate===null?null:hitRate-nullRate,
    rawOneSidedBinomialP:rawP,
    holmAdjustedP:null,
    significantHolm:false,
    luckyHits,big100,big200,big500
  };
});

if(evaluationFuture.length){
  const ranked=candidates.map((c,i)=>({i,p:c.rawOneSidedBinomialP})).sort((a,b)=>a.p-b.p||a.i-b.i);
  let running=0;
  for(let rank=0;rank<ranked.length;rank++){
    const {i,p}=ranked[rank];
    const adjusted=Math.min(1,p*(ranked.length-rank));
    running=Math.max(running,adjusted);
    candidates[i].holmAdjustedP=running;
    candidates[i].significantHolm=running<=alpha && candidates[i].excess>0;
  }
}

const boundaryReached=future.length>=minimumProspectiveRounds;
const edgeClaimAllowed=boundaryReached&&candidates.some(c=>c.significantHolm);
const scientific={
  version:'lightning-cold-prospective-evaluation-v1',
  freezeHash:freeze.freezeHash,
  freezeRoundCount:freeze.freezeRoundCount,
  freezeLastTimestamp:freeze.freezeLastTimestamp,
  currentRoundCount:rows.length,
  observedProspectiveRounds:future.length,
  prospectiveRounds:evaluationFuture.length,
  minimumProspectiveRounds,
  boundaryReached,
  excludedPostBoundaryRounds:Math.max(0,future.length-minimumProspectiveRounds),
  inferenceReady:boundaryReached,
  primaryInference:'one-sided exact binomial versus frozen pick-count null; Holm family-wise correction across frozen candidates',
  alpha,
  multiplicityMethod:'Holm-Bonferroni',
  candidates,
  claimAllowed:edgeClaimAllowed,
  edgeObserved:edgeClaimAllowed,
  retuningPerformed:false,
  realMoney:false
};
let previous=null;try{previous=JSON.parse(fs.readFileSync(OUT,'utf8'))}catch{}
const previousScientific=previous?Object.fromEntries(Object.entries(previous).filter(([k])=>k!=='generatedAt')):null;
if(previousScientific&&JSON.stringify(previousScientific)===JSON.stringify(scientific)){
  console.log(JSON.stringify({status:'UNCHANGED',...scientific},null,2));
  process.exit(0);
}
const out={...scientific,generatedAt:new Date().toISOString()};
fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({status:'UPDATED',...out},null,2));

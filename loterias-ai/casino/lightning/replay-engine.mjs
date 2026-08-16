import fs from 'node:fs';
import crypto from 'node:crypto';

const input = process.argv[2] || 'loterias-ai/casino/lightning/data/rounds.jsonl';
if (!fs.existsSync(input)) {
  console.error(`Missing dataset: ${input}`);
  process.exit(2);
}

const raw = fs.readFileSync(input,'utf8').trim();
if (!raw) {
  console.error('Dataset empty');
  process.exit(2);
}
const rows = raw.split(/\r?\n/).filter(Boolean).map((line,i)=>{
  try { return JSON.parse(line); } catch { throw new Error(`Bad JSONL line ${i+1}`); }
});

function assertRound(r,i){
  if (!Number.isInteger(r.winner) || r.winner < 0 || r.winner > 36) throw new Error(`Invalid winner at ${i}`);
  if (!r.ts || Number.isNaN(Date.parse(r.ts))) throw new Error(`Invalid ts at ${i}`);
  if (!Array.isArray(r.lightning)) throw new Error(`Invalid lightning at ${i}`);
  for (const x of r.lightning) {
    if (!Number.isInteger(x.number) || x.number < 0 || x.number > 36) throw new Error(`Invalid lightning number at ${i}`);
    if (!Number.isFinite(x.multiplier) || x.multiplier < 1) throw new Error(`Invalid multiplier at ${i}`);
  }
}
rows.forEach(assertRound);
rows.sort((a,b)=>Date.parse(a.ts)-Date.parse(b.ts));
for(let i=1;i<rows.length;i++) if(Date.parse(rows[i].ts)<=Date.parse(rows[i-1].ts)) throw new Error(`Non-strict chronology at row ${i}`);

const datasetHash = crypto.createHash('sha256').update(raw).digest('hex');
const coverageSizes=[1,2,3,4,5,6,8,10,12,15,18];
const windows=[25,50,100,250,500,1000];
const minWarmup=Math.min(500, Math.max(100, Math.floor(rows.length*0.1)));

function topKFromPast(past,k,window){
  const slice=past.slice(-window);
  const score=Array(37).fill(0);
  for(let j=0;j<slice.length;j++){
    const r=slice[j];
    const age=slice.length-j;
    const recency=1/(1+age/20);
    score[r.winner]+=recency;
    const d=new Date(r.ts);
    const minute=d.getUTCMinutes();
    const second=d.getUTCSeconds();
    // Temporal-context component uses only past observations sharing coarse clock buckets.
    if(minute%5===0) score[r.winner]+=0.03;
    if(second<15) score[r.winner]+=0.02;
  }
  return [...Array(37).keys()].sort((a,b)=>score[b]-score[a] || a-b).slice(0,k);
}

function baselineP(k){ return k/37; }
function straightPayout(stakePerNumber, multiplier){ return stakePerNumber * (multiplier || 36); }

const strategies=[];
for(const k of coverageSizes){
  for(const w of windows){
    if(w>=minWarmup/2) strategies.push({id:`freq-recency-k${k}-w${w}`,k,w});
  }
}

for(const s of strategies){
  let hits=0, spins=0, firstHit=null, firstLightning=null;
  const firstByMult={50:null,100:null,200:null,300:null,400:null,500:null};
  const costs={1:0,2:0,5:0,6:0,7:0,10:0};
  let bankroll={1:0,2:0,5:0,6:0,7:0,10:0};
  let peak={1:0,2:0,5:0,6:0,7:0,10:0};
  let maxDD={1:0,2:0,5:0,6:0,7:0,10:0};
  const past=[];
  for(let i=0;i<rows.length;i++){
    const r=rows[i];
    if(i<minWarmup){past.push(r);continue;}
    const picks=topKFromPast(past,s.k,s.w);
    spins++;
    const hit=picks.includes(r.winner);
    if(hit){
      hits++;
      if(firstHit===null) firstHit=spins;
      const lm=r.lightning.find(x=>x.number===r.winner);
      if(lm){
        if(firstLightning===null) firstLightning=spins;
        for(const t of Object.keys(firstByMult).map(Number)) if(lm.multiplier>=t && firstByMult[t]===null) firstByMult[t]=spins;
      }
    }
    for(const stake of Object.keys(costs).map(Number)){
      const roundCost=stake*s.k;
      costs[stake]+=roundCost;
      bankroll[stake]-=roundCost;
      if(hit){
        const lm=r.lightning.find(x=>x.number===r.winner);
        bankroll[stake]+=straightPayout(stake,lm?.multiplier);
      }
      peak[stake]=Math.max(peak[stake],bankroll[stake]);
      maxDD[stake]=Math.max(maxDD[stake],peak[stake]-bankroll[stake]);
    }
    past.push(r);
  }
  const pObs=spins?hits/spins:0;
  const p0=baselineP(s.k);
  const se=Math.sqrt(Math.max(1e-12,p0*(1-p0)/Math.max(1,spins)));
  const z=(pObs-p0)/se;
  s.result={spins,hits,hitRate:pObs,baseline:p0,lift:pObs-p0,z,firstHit,firstLightning,firstByMult,costs,net:bankroll,maxDrawdown:maxDD};
}

strategies.sort((a,b)=>b.result.z-a.result.z || b.result.net[1]-a.result.net[1]);
const out={
  generatedAt:new Date().toISOString(),
  mode:'PAPER_ONLY',
  dataset:{rows:rows.length,sha256:datasetHash,from:rows[0]?.ts,to:rows.at(-1)?.ts},
  methodology:{chronological:true,futureLeakage:false,minWarmup,coverageSizes,windows,baseline:'k/37',note:'Selection ranking is exploratory only; OOS freeze required before any discovery claim.'},
  top:strategies.slice(0,25),
  allCount:strategies.length,
  realMoneyEnabled:false
};
console.log(JSON.stringify(out,null,2));

#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const R='loterias-ai';
const OUT=path.join(R,'data/research/metapleno-v311-stage1-2.json');
const games=[
  {id:'bonoloto',dir:'bonoloto',max:49,pick:6},
  {id:'primitiva',dir:'primitiva',max:49,pick:6},
  {id:'euromillones',dir:'euromillones',max:50,pick:5},
  {id:'gordo-primitiva',dir:'gordo-primitiva',max:54,pick:5}
];
const H=s=>crypto.createHash('sha256').update(String(s)).digest('hex');
function load(g){
  const rows=[];
  for(const f of fs.readdirSync(path.join(R,'data/archive',g.dir)).filter(x=>/^\d{4}\.json$/.test(x)).sort()){
    const j=JSON.parse(fs.readFileSync(path.join(R,'data/archive',g.dir,f)));
    for(const z of j.records||j.draws||[]){
      const date=z.drawDate||z.date;
      const main=(z.result?.main||z.main||z.numbers||[]).map(Number).sort((a,b)=>a-b);
      if(date&&date<'2023-01-01'&&main.length===g.pick) rows.push({date,main,set:new Set(main)});
    }
  }
  return [...new Map(rows.map(x=>[x.date,x])).values()].sort((a,b)=>a.date.localeCompare(b.date));
}
function scoreNumber(rows,i,n,cfg){
  let excitation=0,cross=0;
  const lo=Math.max(0,i-cfg.lookback);
  for(let t=lo;t<i;t++){
    const lag=i-t;
    if(rows[t].set.has(n)) excitation+=Math.exp(-cfg.beta*lag);
    if(cfg.cross>0){
      let overlap=0;
      for(const m of rows[i-1]?.main||[]) if(rows[t].set.has(m)) overlap++;
      if(rows[t].set.has(n)) cross+=cfg.cross*overlap*Math.exp(-cfg.beta*lag);
    }
  }
  let count=0; for(let t=lo;t<i;t++) if(rows[t].set.has(n)) count++;
  const baseline=(count+cfg.prior)/(Math.max(1,i-lo)+2*cfg.prior);
  return Math.log(Math.max(1e-12,baseline))+cfg.alpha*excitation+cross;
}
function predict(rows,i,g,cfg){
  const s=[];
  for(let n=1;n<=g.max;n++) s.push({n,v:scoreNumber(rows,i,n,cfg)+((n*37+cfg.phase*17)%997)*1e-12});
  s.sort((a,b)=>b.v-a.v||a.n-b.n);
  return s.slice(0,g.pick).map(x=>x.n).sort((a,b)=>a-b);
}
const configs=[];
for(const lookback of [32,64,128]) for(const alpha of [0.25,0.5,1,2]) for(const beta of [0.03,0.06,0.12]) for(const prior of [0.5,1]) for(const cross of [0,0.05]) for(const phase of [1,7]) configs.push({lookback,alpha,beta,prior,cross,phase});
const outGames=[];
for(const g of games){
  const rows=load(g);
  const devIdx=rows.map((r,i)=>[r,i]).filter(([r,i])=>r.date>='2019-01-01'&&r.date<'2023-01-01'&&i>=160).map(x=>x[1]);
  const ranked=[];
  for(const cfg of configs){
    let hits=0,maxHits=0,nearFull=0,full=0; const trajectory=[];
    for(const i of devIdx){
      const p=predict(rows,i,g,cfg),k=p.filter(n=>rows[i].set.has(n)).length;
      hits+=k; maxHits=Math.max(maxHits,k); if(k>=g.pick-1) nearFull++; if(k===g.pick) full++;
      trajectory.push(`${rows[i].date}:${p.join('-')}:${k}`);
    }
    ranked.push({cfg,draws:devIdx.length,meanHits:hits/Math.max(1,devIdx.length),maxHits,nearFull,full,behaviorHash:H(trajectory.join('|'))});
  }
  ranked.sort((a,b)=>b.meanHits-a.meanHits||b.nearFull-a.nearFull||a.behaviorHash.localeCompare(b.behaviorHash));
  const unique=[]; const seen=new Set();
  for(const r of ranked){if(seen.has(r.behaviorHash)) continue; seen.add(r.behaviorHash); unique.push(r); if(unique.length>=64) break;}
  outGames.push({game:g.id,rows:rows.length,developmentDraws:devIdx.length,logicalConfigs:configs.length,uniqueScreenedBehaviors:seen.size,top:unique.slice(0,16)});
}
const out={version:'v311-stage1-2',family:'HAWKES_SELF_EXCITING_NUMBER_EVENTS',developmentEndExclusive:'2023-01-01',validationTouched:false,postFreezeTouched:false,retuningPerformed:false,realMoneyPass:false,realStakeEUR:0,theoreticalBudgetEURMax:15,status:'DEVELOPMENT_SCREEN_ONLY',games:outGames};
fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({status:out.status,games:out.games.map(x=>({game:x.game,logicalConfigs:x.logicalConfigs,uniqueScreenedBehaviors:x.uniqueScreenedBehaviors,best:x.top[0]})),realMoneyPass:false,realStakeEUR:0},null,2));

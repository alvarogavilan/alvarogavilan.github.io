#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const ROOT='loterias-ai';
const ARCH=path.join(ROOT,'data','archive','bonoloto');
const OUT=path.join(ROOT,'data','research','metapleno-v236-johnson-combination-geometry.json');
const MAXN=49, K=6, LINES=30, COST=15;

function load(){
  const files=fs.readdirSync(ARCH).filter(f=>/^\d{4}\.json$/.test(f)).sort();
  const rows=[];
  for(const f of files){
    const j=JSON.parse(fs.readFileSync(path.join(ARCH,f),'utf8'));
    for(const r of (j.records||j.draws||[])){
      const date=r.drawDate||r.date;
      const main=(r.result?.main||r.main||r.numbers||[]).map(Number).sort((a,b)=>a-b);
      if(date&&main.length===K&&main.every(n=>n>=1&&n<=MAXN)) rows.push({date,main});
    }
  }
  const m=new Map(rows.map(r=>[r.date,r]));
  return [...m.values()].sort((a,b)=>a.date.localeCompare(b.date));
}
function inter(a,b){const s=new Set(a);return b.reduce((n,x)=>n+s.has(x),0)}
function combos6(pool){const out=[];for(let a=0;a<pool.length-5;a++)for(let b=a+1;b<pool.length-4;b++)for(let c=b+1;c<pool.length-3;c++)for(let d=c+1;d<pool.length-2;d++)for(let e=d+1;e<pool.length-1;e++)for(let f=e+1;f<pool.length;f++)out.push([pool[a],pool[b],pool[c],pool[d],pool[e],pool[f]]);return out}
function linesFor(rows,i,cfg){
  const start=Math.max(0,i-cfg.window), freq=Array(MAXN+1).fill(0);
  for(let t=start;t<i;t++) for(const n of rows[t].main) freq[n]++;
  const pool=Array.from({length:MAXN},(_,x)=>x+1).sort((a,b)=>freq[b]-freq[a]||a-b).slice(0,9);
  const cand=combos6(pool).map(line=>{
    let score=0;
    for(let t=start;t<i;t++){
      const age=i-t, overlap=inter(line,rows[t].main), d=K-overlap;
      score += Math.exp(-age/cfg.tau)*Math.exp(-cfg.beta*d);
    }
    return {line,score};
  });
  cand.sort((x,y)=>y.score-x.score||x.line.join(',').localeCompare(y.line.join(',')));
  return cand.slice(0,LINES).map(x=>x.line);
}
function evalCfg(rows,cfg,start,end){
  let n=0,sum=0,h5=0,h6=0; const hitDates=[];
  for(let i=cfg.window;i<rows.length;i++){
    const d=rows[i]; if(d.date<start||d.date>=end) continue;
    const truth=new Set(d.main); let best=0;
    for(const line of linesFor(rows,i,cfg)){
      const h=line.reduce((s,x)=>s+truth.has(x),0); if(h>best)best=h;
    }
    n++;sum+=best;if(best>=5){h5++;hitDates.push({date:d.date,best});}if(best===6)h6++;
  }
  return {n,meanBest:n?sum/n:0,hit5Plus:h5,full6:h6,hitDates};
}

const rows=load(); if(rows.length<1000) throw new Error(`archive too small: ${rows.length}`);
const configs=[]; for(const window of [90,180,365]) for(const tau of [15,45,120]) for(const beta of [.35,.7,1.4]) configs.push({window,tau,beta});
const train=configs.map((cfg,id)=>({id,cfg,...evalCfg(rows,cfg,'2019-01-01','2023-01-01')}));
train.sort((a,b)=>b.full6-a.full6||b.hit5Plus-a.hit5Plus||b.meanBest-a.meanBest||a.cfg.window-b.cfg.window||a.cfg.tau-b.cfg.tau||a.cfg.beta-b.cfg.beta||a.id-b.id);
const selected=train[0];
const validation=evalCfg(rows,selected.cfg,'2023-01-01','2025-01-01');
const postFreeze=evalCfg(rows,selected.cfg,'2025-01-01','9999-12-31');
const repeat5=validation.hit5Plus>0&&postFreeze.hit5Plus>0;
const out={version:'v236J',engine:'Johnson Combination Geometry',family:'JOHNSON_J49_6_GEODESIC_KERNEL',gameId:'bonoloto',generatedAt:new Date().toISOString(),archiveDraws:rows.length,candidatePool:{nominalConfigurations:configs.length,effectiveConfigurations:configs.length,poolSize:9,linesPerDraw:LINES,theoreticalCostEUR:COST},selection:{criterion:'pre-2023 only: full6 > hit5+ > meanBest > lower complexity',period:'2019-01-01..2022-12-31',selectedId:selected.id,hyperparameters:selected.cfg,train:{n:selected.n,meanBest:selected.meanBest,hit5Plus:selected.hit5Plus,full6:selected.full6}},validation:{period:'2023-2024',...validation},postFreeze:{period:'2025+',...postFreeze},signal:{repeat5PlusAcrossEras:repeat5,fullAcrossEras:validation.full6>0&&postFreeze.full6>0,requiresAudit:repeat5||validation.full6>0||postFreeze.full6>0},realMoneyPass:false,realStakeEUR:0,decision:(repeat5||validation.full6||postFreeze.full6)?'AUDIT_SIGNAL':'NEGATIVE',note:'Ranks six-number sets by an exponential kernel on Johnson distance d=6-|intersection|, with recency decay. Hyperparameters selected before 2023 and frozen. Retrospective evidence never authorizes real money.'};
fs.mkdirSync(path.dirname(OUT),{recursive:true}); fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n'); console.log(JSON.stringify(out,null,2));

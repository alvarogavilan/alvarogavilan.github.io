#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const ROOT='loterias-ai';
const RNG_SEED=289031;
let seed=RNG_SEED>>>0;
const rand=()=>((seed=(1664525*seed+1013904223)>>>0)/2**32);
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const safe=(x)=>Number.isFinite(x)?x:0;

const GAMES=[
  {id:'bonoloto',dir:'bonoloto',max:49,pick:6,cost:.5,lines:8,start:'1900-01-01',side:null},
  {id:'primitiva',dir:'primitiva',max:49,pick:6,cost:1,lines:4,start:'1900-01-01',side:null},
  {id:'euromillones',dir:'euromillones',max:50,pick:5,cost:2.5,lines:1,start:'2016-09-27',side:'stars'},
  {id:'gordo-primitiva',dir:'gordo-primitiva',max:54,pick:5,cost:1.5,lines:2,start:'1900-01-01',side:'key'}
];

function load(g){
  let rows=[];
  const dir=path.join(ROOT,'data','archive',g.dir);
  for(const f of fs.readdirSync(dir).filter(x=>/^\d{4}\.json$/.test(x)).sort()){
    const j=JSON.parse(fs.readFileSync(path.join(dir,f)));
    for(const r of (j.records||j.draws||[])){
      const date=r.drawDate||r.date;
      const main=(r.result?.main||r.main||r.numbers||[]).map(Number).sort((a,b)=>a-b);
      if(date&&date>=g.start&&main.length===g.pick&&new Set(main).size===g.pick){
        rows.push({date,main,stars:(r.result?.stars||[]).map(Number),key:Number(r.result?.key)});
      }
    }
  }
  return [...new Map(rows.map(r=>[r.date,r])).values()].sort((a,b)=>a.date.localeCompare(b.date));
}

const OPS=['add','sub','mul','div','abs','sq','sqrt','log1p','tanh','min','max'];
const FEATURES=['freq30','freq60','freq120','gap','pairDrift','position','parity','neighbor','recentHit','baselineHit'];

function atom(){return {t:'f',k:FEATURES[Math.floor(rand()*FEATURES.length)]};}
function expr(depth=0){
  if(depth>=3||rand()<.32)return atom();
  const op=OPS[Math.floor(rand()*OPS.length)];
  if(['abs','sq','sqrt','log1p','tanh'].includes(op))return {t:'u',op,a:expr(depth+1)};
  return {t:'b',op,a:expr(depth+1),b:expr(depth+1)};
}
function mutate(e){
  const x=structuredClone(e);
  function rec(n,d=0){
    if(rand()<.18){Object.assign(n,expr(Math.min(2,d)));return;}
    if(n.a)rec(n.a,d+1); if(n.b)rec(n.b,d+1);
  }
  rec(x);return x;
}
function key(e){return JSON.stringify(e);}
function complexity(e){return 1+(e.a?complexity(e.a):0)+(e.b?complexity(e.b):0);}
function evalExpr(e,f){
  if(e.t==='f')return safe(f[e.k]||0);
  if(e.t==='u'){
    const a=evalExpr(e.a,f);
    return safe(e.op==='abs'?Math.abs(a):e.op==='sq'?clamp(a*a,-1e6,1e6):e.op==='sqrt'?Math.sqrt(Math.abs(a)):e.op==='log1p'?Math.log1p(Math.abs(a)):Math.tanh(a));
  }
  const a=evalExpr(e.a,f),b=evalExpr(e.b,f);
  return safe(e.op==='add'?a+b:e.op==='sub'?a-b:e.op==='mul'?clamp(a*b,-1e6,1e6):e.op==='div'?a/(Math.abs(b)<1e-6?1e-6:b):e.op==='min'?Math.min(a,b):Math.max(a,b));
}

function makeFeatures(rows,i,g,n){
  const count=(w)=>rows.slice(Math.max(0,i-w),i).filter(r=>r.main.includes(n)).length/Math.max(1,Math.min(w,i));
  let last=i-1;while(last>=0&&!rows[last].main.includes(n))last--;
  const r30=rows.slice(Math.max(0,i-30),i),b90=rows.slice(Math.max(0,i-120),Math.max(0,i-30));
  let pR=0,pB=0;
  for(const r of r30)for(const x of r.main)if(x!==n&&Math.abs(x-n)<=2)pR++;
  for(const r of b90)for(const x of r.main)if(x!==n&&Math.abs(x-n)<=2)pB++;
  const pos=n/g.max;
  return {
    freq30:count(30),freq60:count(60),freq120:count(120),gap:last<0?1:clamp((i-last)/120,0,2),
    pairDrift:pR/Math.max(1,r30.length)-pB/Math.max(1,b90.length),position:pos,parity:n%2?1:-1,
    neighbor:(n>1?1:0)+(n<g.max?1:0),recentHit:rows[i-1]?.main.includes(n)?1:0,baselineHit:count(240)
  };
}
function linesFromExpr(e,rows,i,g){
  const scored=[];for(let n=1;n<=g.max;n++)scored.push([n,evalExpr(e,makeFeatures(rows,i,g,n))]);
  scored.sort((a,b)=>b[1]-a[1]||a[0]-b[0]);
  const pool=scored.slice(0,g.pick+2).map(x=>x[0]);
  const out=[];
  function rec(s,c){if(c.length===g.pick){out.push([...c]);return;}for(let j=s;j<=pool.length-(g.pick-c.length);j++){c.push(pool[j]);rec(j+1,c);c.pop();}}
  rec(0,[]);return out.slice(0,g.lines);
}
function scoreEra(e,rows,g,start,end){
  let draws=0,sum=0,near=0,full=0;
  for(let i=240;i<rows.length;i++){
    if(rows[i].date<start||rows[i].date>=end)continue;
    const truth=new Set(rows[i].main),lines=linesFromExpr(e,rows,i,g);let best=0;
    for(const l of lines)best=Math.max(best,l.filter(n=>truth.has(n)).length);
    draws++;sum+=best;if(best>=g.pick-1)near++;if(best===g.pick)full++;
  }
  return {draws,meanBestHits:draws?sum/draws:0,nearFull:near,fullMain:full};
}
function fitness(r,e){return r.fullMain*100+r.nearFull*8+r.meanBestHits-complexity(e)*0.015;}

const results=[];
for(const g of GAMES){
  const rows=load(g);
  let pop=[];for(let i=0;i<96;i++)pop.push(expr());
  const seen=new Set();
  for(let gen=0;gen<8;gen++){
    const scored=[];
    for(const e of pop){const k=key(e);if(seen.has(k))continue;seen.add(k);const selection=scoreEra(e,rows,g,'2019-01-01','2023-01-01');scored.push({e,selection,fit:fitness(selection,e)});}
    scored.sort((a,b)=>b.fit-a.fit);
    const elite=scored.slice(0,16);
    pop=[...elite.map(x=>x.e)];
    while(pop.length<96)pop.push(mutate(elite[Math.floor(rand()*elite.length)]?.e||expr()));
  }
  const finalists=[];
  for(const e of pop.slice(0,24)){
    const selection=scoreEra(e,rows,g,'2019-01-01','2023-01-01');
    finalists.push({formula:e,complexity:complexity(e),selection,validation:scoreEra(e,rows,g,'2023-01-01','2025-01-01'),postFreeze:scoreEra(e,rows,g,'2025-01-01','9999-12-31')});
  }
  finalists.sort((a,b)=>fitness(b.selection,b.formula)-fitness(a.selection,a.formula));
  const leaders=finalists.slice(0,5);
  const audit=leaders.some(x=>x.validation.fullMain>0||x.postFreeze.fullMain>0||(x.validation.nearFull>0&&x.postFreeze.nearFull>0));
  results.push({gameId:g.id,archiveDraws:rows.length,budget:{lineCostEUR:g.cost,lines:g.lines,theoreticalEUR:g.cost*g.lines},generatedHypotheses:seen.size,leaders,decision:audit?'AUDIT_SIGNAL':'NEGATIVE'});
}

const out={
  version:'v289',family:'AUTONOMOUS_HYPOTHESIS_SYNTHESIS_GENETIC_SYMBOLIC_SEARCH',generatedAt:new Date().toISOString(),
  methodology:'Autonomous symbolic hypothesis generator over a bounded expression grammar. Evolution occurs only on 2019-2022. Formula structure and complexity are frozen before untouched 2023-2024 validation and 2025+ post-freeze. Negative hypotheses are deduplicated by exact AST hash. Objective penalizes complexity and never optimizes on validation/post-freeze.',
  limitations:['This cannot enumerate literally all possible mathematics.','A historical full match is not evidence unless it survives untouched temporal validation.','Generated formulas are research hypotheses, not guarantees or real-money instructions.'],
  games:results,anyAuditSignal:results.some(r=>r.decision==='AUDIT_SIGNAL'),realMoneyPass:false,realStakeEUR:0,
  computePolicy:{singleActionForFourGames:true,maxGenerations:8,population:96,deterministicSeed:RNG_SEED}
};
fs.mkdirSync(path.join(ROOT,'data','research'),{recursive:true});
fs.writeFileSync(path.join(ROOT,'data','research','metapleno-v289-autonomous-hypothesis-synthesizer.json'),JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({anyAuditSignal:out.anyAuditSignal,games:results.map(x=>({gameId:x.gameId,generatedHypotheses:x.generatedHypotheses,decision:x.decision}))},null,2));

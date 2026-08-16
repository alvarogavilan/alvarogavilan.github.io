#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const R='loterias-ai';
const G=[
  ['bonoloto','bonoloto',49,6,.5,8,'1900-01-01',null],
  ['primitiva','primitiva',49,6,1,4,'1900-01-01',null],
  ['euromillones','euromillones',50,5,2.5,1,'2016-09-27','stars'],
  ['gordo-primitiva','gordo-primitiva',54,5,1.5,2,'1900-01-01','key']
].map(([id,dir,max,pick,cost,lines,start,side])=>({id,dir,max,pick,cost,lines,start,side}));

function load(g){
  let a=[];
  const dir=path.join(R,'data','archive',g.dir);
  for(const f of fs.readdirSync(dir).filter(x=>/^\d{4}\.json$/.test(x)).sort()){
    const j=JSON.parse(fs.readFileSync(path.join(dir,f)));
    for(const r of (j.records||j.draws||[])){
      const date=r.drawDate||r.date;
      const main=(r.result?.main||r.main||r.numbers||[]).map(Number).sort((a,b)=>a-b);
      if(date&&date>=g.start&&main.length===g.pick&&new Set(main).size===g.pick){
        a.push({date,main,stars:(r.result?.stars||[]).map(Number),key:Number(r.result?.key)});
      }
    }
  }
  return [...new Map(a.map(x=>[x.date,x])).values()].sort((a,b)=>a.date.localeCompare(b.date));
}

function graph(rows,g){
  const w=Array.from({length:g.max+1},()=>Array(g.max+1).fill(0));
  const deg=Array(g.max+1).fill(0);
  for(const r of rows){
    for(let i=0;i<r.main.length;i++)for(let j=i+1;j<r.main.length;j++){
      const a=r.main[i],b=r.main[j];
      w[a][b]++;w[b][a]++;
    }
  }
  for(let i=1;i<=g.max;i++)for(let j=1;j<=g.max;j++)if(w[i][j]>0)deg[i]++;
  return {w,deg};
}

function curvatureSignature(rows,g){
  const {w,deg}=graph(rows,g);
  const edge=[];
  const node=Array(g.max+1).fill(0);
  const nodeN=Array(g.max+1).fill(0);
  for(let i=1;i<=g.max;i++)for(let j=i+1;j<=g.max;j++)if(w[i][j]>0){
    const c=4-deg[i]-deg[j];
    edge.push(c);node[i]+=c;node[j]+=c;nodeN[i]++;nodeN[j]++;
  }
  edge.sort((a,b)=>a-b);
  const mean=edge.length?edge.reduce((a,b)=>a+b,0)/edge.length:0;
  const q=p=>edge.length?edge[Math.min(edge.length-1,Math.max(0,Math.floor((edge.length-1)*p)))]:0;
  const nodeMean=node.map((v,i)=>nodeN[i]?v/nodeN[i]:0);
  return {mean,q25:q(.25),q50:q(.5),q75:q(.75),nodeMean};
}

function drift(recent,base,g){
  const a=curvatureSignature(recent,g),b=curvatureSignature(base,g);
  const global=Math.abs(a.mean-b.mean)+Math.abs(a.q25-b.q25)+Math.abs(a.q50-b.q50)+Math.abs(a.q75-b.q75);
  const rank=[];
  for(let n=1;n<=g.max;n++)rank.push([n,Math.abs(a.nodeMean[n]-b.nodeMean[n])]);
  rank.sort((x,y)=>y[1]-x[1]||x[0]-y[0]);
  return {global,rank:rank.map(x=>x[0])};
}

function combos(a,k){
  const out=[];
  function rec(s,c){
    if(c.length===k){out.push([...c]);return;}
    for(let i=s;i<=a.length-(k-c.length);i++){c.push(a[i]);rec(i+1,c);c.pop();}
  }
  rec(0,[]);return out;
}

function side(g,rows,i,w){
  if(g.side==='stars'){
    const c=Array(13).fill(0);
    for(const r of rows.slice(Math.max(0,i-w),i))for(const s of r.stars||[])c[s]++;
    return [...Array(12)].map((_,i)=>i+1).sort((a,b)=>c[b]-c[a]||a-b).slice(0,2);
  }
  if(g.side==='key'){
    const c=Array(10).fill(0);
    for(const r of rows.slice(Math.max(0,i-w),i))if(Number.isInteger(r.key)&&r.key>=0&&r.key<=9)c[r.key]++;
    return [...Array(10)].map((_,i)=>i).sort((a,b)=>c[b]-c[a]||a-b)[0];
  }
  return null;
}

function era(g,rows,c,s,e){
  let draws=0,near=0,full=0,jack=0,sum=0;
  for(let i=4*c.w;i<rows.length;i++){
    if(rows[i].date<s||rows[i].date>=e)continue;
    const recent=rows.slice(i-c.w,i),base=rows.slice(i-4*c.w,i-c.w);
    const d=drift(recent,base,g);
    if(d.global<c.thr)continue;
    const lines=combos(d.rank.slice(0,g.pick+2),g.pick).slice(0,g.lines);
    const truth=new Set(rows[i].main);
    let best=0;
    for(const l of lines)best=Math.max(best,l.filter(x=>truth.has(x)).length);
    draws++;sum+=best;
    if(best>=g.pick-1)near++;
    if(best===g.pick){
      full++;
      if(!g.side)jack++;
      else if(g.side==='stars'){
        const p=side(g,rows,i,c.w);
        if(p.length===2&&p.every(x=>rows[i].stars.includes(x)))jack++;
      } else if(side(g,rows,i,c.w)===rows[i].key)jack++;
    }
  }
  return {draws,meanBestHits:draws?sum/draws:0,nearFull:near,fullMain:full,fullJackpot:jack};
}

const games=[];
for(const g of G){
  const rows=load(g),cfg=[];
  for(const w of [30,60,120]){
    const vals=[];
    for(let i=4*w;i<rows.length;i++)if(rows[i].date>='2019-01-01'&&rows[i].date<'2023-01-01'){
      vals.push(drift(rows.slice(i-w,i),rows.slice(i-4*w,i-w),g).global);
    }
    vals.sort((a,b)=>a-b);
    for(const q of [.75,.9])cfg.push({w,q,thr:vals[Math.floor((vals.length-1)*q)]??Infinity});
  }
  const leaders=cfg.map(c=>({c,selection:era(g,rows,c,'2019-01-01','2023-01-01')}))
    .sort((a,b)=>b.selection.fullJackpot-a.selection.fullJackpot||b.selection.fullMain-a.selection.fullMain||b.selection.nearFull-a.selection.nearFull||b.selection.meanBestHits-a.selection.meanBestHits)
    .slice(0,3)
    .map(x=>({...x,validation:era(g,rows,x.c,'2023-01-01','2025-01-01'),postFreeze:era(g,rows,x.c,'2025-01-01','9999-12-31')}));
  const signal=leaders.some(x=>x.validation.nearFull>0&&x.postFreeze.nearFull>0)||leaders.some(x=>x.validation.fullJackpot>0||x.postFreeze.fullJackpot>0);
  games.push({gameId:g.id,archiveDraws:rows.length,budget:{lineCostEUR:g.cost,lines:g.lines,theoreticalEUR:g.cost*g.lines},leaders,decision:signal?'AUDIT_SIGNAL':'NEGATIVE'});
}

const out={
  version:'v288',
  family:'CONSOLIDATED_FORMAN_RICCI_GRAPH_CURVATURE',
  generatedAt:new Date().toISOString(),
  methodology:'Forman-Ricci curvature drift on rolling co-occurrence support graphs. Window/gate chosen on 2019-2022 only; parameters frozen for 2023-2024 and 2025+. Exact stars/Clave, compact theoretical budgets <=4 EUR.',
  games,
  anyAuditSignal:games.some(g=>g.decision==='AUDIT_SIGNAL'),
  realMoneyPass:false,
  realStakeEUR:0,
  computePolicy:{singleActionForFourGames:true,manualDispatch:true,cheapCurvature:true}
};
fs.mkdirSync(path.join(R,'data','research'),{recursive:true});
fs.writeFileSync(path.join(R,'data','research','metapleno-v288-consolidated-graph-curvature.json'),JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({anyAuditSignal:out.anyAuditSignal,games:games.map(g=>({gameId:g.gameId,decision:g.decision,budget:g.budget}))},null,2));
// scoped trigger v288

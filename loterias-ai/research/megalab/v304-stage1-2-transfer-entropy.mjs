#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const R='loterias-ai';
const OUT=path.join(R,'data/research/metapleno-v304-stage1-2-selection.json');
const H=s=>crypto.createHash('sha256').update(String(s)).digest('hex');
const G={
  bonoloto:{dir:'bonoloto',max:49,pick:6},
  primitiva:{dir:'primitiva',max:49,pick:6},
  euromillones:{dir:'euromillones',max:50,pick:5},
  'gordo-primitiva':{dir:'gordo-primitiva',max:54,pick:5}
};
const LB=[96,192,384,768],LAG=[1,2,3,5],SRC=['self','wheel-neighbor','mod5-sector','decile-sector'],CB=[2,3,4,5],PS=[1,5,20,50];

function load(id){
  const g=G[id],a=[];
  for(const f of fs.readdirSync(path.join(R,'data/archive',g.dir)).filter(x=>/^\d{4}\.json$/.test(x)).sort()){
    const j=JSON.parse(fs.readFileSync(path.join(R,'data/archive',g.dir,f)));
    for(const z of j.records||j.draws||[]){
      const date=z.drawDate||z.date;
      const main=(z.result?.main||z.main||z.numbers||[]).map(Number).sort((a,b)=>a-b);
      if(date&&date>='2015-01-01'&&date<'2023-01-01'&&main.length===g.pick)a.push({date,main,set:new Set(main)});
    }
  }
  return [...new Map(a.map(x=>[x.date,x])).values()].sort((a,b)=>a.date.localeCompare(b.date));
}

function cfg(n,game){
  let x=n;
  const lookback=LB[x%4];x=Math.floor(x/4);
  const lag=LAG[x%4];x=Math.floor(x/4);
  const sourceMode=SRC[x%4];x=Math.floor(x/4);
  const contextBins=CB[x%4];x=Math.floor(x/4);
  const priorStrength=PS[x%4];x=Math.floor(x/4);
  const phase=x%8;
  return {scientistId:`T${String(n).padStart(6,'0')}`,game,lookback,lag,sourceMode,contextBins,priorStrength,phase};
}

function feature(row,g){
  const s=row.main;
  const sum=s.reduce((a,b)=>a+b,0)/(g.max*s.length);
  const span=(s.at(-1)-s[0])/g.max;
  const even=s.filter(x=>x%2===0).length/s.length;
  return .45*sum+.30*span+.25*even;
}
function context(row,g,b){return Math.max(0,Math.min(b-1,Math.floor(feature(row,g)*b)));}
function source(row,n,g,mode){
  if(mode==='self')return row.set.has(n)?1:0;
  if(mode==='wheel-neighbor')return row.set.has(n===1?g.max:n-1)||row.set.has(n===g.max?1:n+1)?1:0;
  if(mode==='mod5-sector'){
    const r=n%5;let c=0;for(const x of row.main)if(x%5===r)c++;return c>=2?1:0;
  }
  const width=Math.ceil(g.max/5),bucket=Math.floor((n-1)/width);let c=0;
  for(const x of row.main)if(Math.floor((x-1)/width)===bucket)c++;
  return c>=2?1:0;
}

function predict(rows,i,g,s){
  const lo=Math.max(s.lag+1,i-s.lookback);
  const currentXRow=rows[i-s.lag], currentC=context(rows[i-1],g,s.contextBins);
  const scores=[];
  for(let n=1;n<=g.max;n++){
    const counts=Array.from({length:s.contextBins},()=>[[0,0],[0,0]]);
    let totalY=0,totalN=0;
    for(let t=lo;t<i;t++){
      const c=context(rows[t-1],g,s.contextBins),x=source(rows[t-s.lag],n,g,s.sourceMode),y=rows[t].set.has(n)?1:0;
      counts[c][x][y]++;totalY+=y;totalN++;
    }
    const base=(totalY+s.priorStrength*(g.pick/g.max))/(totalN+s.priorStrength);
    const xNow=source(currentXRow,n,g,s.sourceMode),cell=counts[currentC][xNow],den=cell[0]+cell[1];
    const p=(cell[1]+s.priorStrength*base)/(den+s.priorStrength);
    const a=counts[currentC][1],b=counts[currentC][0];
    const p1=(a[1]+1)/(a[0]+a[1]+2),p0=(b[1]+1)/(b[0]+b[1]+2);
    const info=Math.abs(Math.log(p1/(1-p1))-Math.log(p0/(1-p0)));
    const tie=((n*17+s.phase*13)%997)*1e-10;
    scores.push({n,v:p+.012*Math.min(4,info)+tie});
  }
  return scores.sort((a,b)=>b.v-a.v||a.n-b.n).slice(0,g.pick).map(x=>x.n).sort((a,b)=>a-b);
}

let logicalTotal=0,historicalTotal=0,behaviorTotal=0;const byGame={};
for(const [id,g] of Object.entries(G)){
  const rows=load(id),logical=8192;logicalTotal+=logical;
  const selected=[];for(let t=0;t<1024;t++)selected.push(cfg((t*73+id.length*419)%logical,id));historicalTotal+=selected.length;
  const idx=[];for(let i=0;i<rows.length;i++)if(rows[i].date>='2019-01-01'&&rows[i].date<'2023-01-01'&&i>=420)idx.push(i);
  const stride=Math.max(1,Math.floor(idx.length/20)),probes=idx.filter((_,z)=>z%stride===0).slice(0,20);
  const seen=new Map();
  for(const s of selected){
    let hits=0,near=0,full=0,n=0;const hist={},traj=[];
    for(const i of probes){
      const p=predict(rows,i,g,s),k=p.filter(x=>rows[i].set.has(x)).length;
      traj.push(p.join('-'));hits+=k;n++;hist[k]=(hist[k]||0)+1;if(k>=g.pick-1)near++;if(k===g.pick)full++;
    }
    const behaviorHash=H(traj.join('|'));
    const rec={...s,behaviorHash,selection:{draws:n,meanHits:hits/Math.max(1,n),nearFull:near,fullMain:full,hitHistogram:hist}};
    const old=seen.get(behaviorHash);
    if(!old||full>old.selection.fullMain||near>old.selection.nearFull||rec.selection.meanHits>old.selection.meanHits)seen.set(behaviorHash,rec);
  }
  const reps=[...seen.values()].sort((a,b)=>b.selection.fullMain-a.selection.fullMain||b.selection.nearFull-a.selection.nearFull||b.selection.meanHits-a.selection.meanHits||a.behaviorHash.localeCompare(b.behaviorHash));
  behaviorTotal+=reps.length;
  byGame[id]={logicalStructuralScreen:logical,historicalScreened:selected.length,selectionProbeDraws:probes.length,behavioralRepresentatives:reps.length,behavioralDuplicates:selected.length-reps.length,nearFullBehaviors:reps.filter(x=>x.selection.nearFull>0).length,fullMainBehaviors:reps.filter(x=>x.selection.fullMain>0).length,best:reps.slice(0,48)};
}
const signal=Object.values(byGame).some(x=>x.nearFullBehaviors>0);
const out={version:'v304-stage1-2',family:'CONDITIONAL_TRANSFER_ENTROPY',generatedAt:new Date().toISOString(),logicalStructuralScreen:logicalTotal,historicalScreened:historicalTotal,behavioralRepresentatives:behaviorTotal,selectionWindow:'2019-01-01/2023-01-01',validationTouched:false,postFreezeTouched:false,retuningPerformed:false,signalForDenseFreeze:signal,byGame,realMoneyPass:false,realStakeEUR:0,ordinaryBudgetMaxEUR:4,next:signal?'dense-selection-freeze':'close-family-early'};
fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({logicalStructuralScreen:logicalTotal,historicalScreened:historicalTotal,behavioralRepresentatives:behaviorTotal,signalForDenseFreeze:signal,byGame:Object.fromEntries(Object.entries(byGame).map(([k,v])=>[k,{reps:v.behavioralRepresentatives,near:v.nearFullBehaviors,full:v.fullMainBehaviors}])),validationTouched:false,realMoneyPass:false},null,2));

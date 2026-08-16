#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const R='loterias-ai';
const OUT=path.join(R,'data/research/metapleno-v301-stage1-2-selection.json');
const H=s=>crypto.createHash('sha256').update(String(s)).digest('hex');
const G={bonoloto:{dir:'bonoloto',max:49,pick:6},primitiva:{dir:'primitiva',max:49,pick:6},euromillones:{dir:'euromillones',max:50,pick:5},'gordo-primitiva':{dir:'gordo-primitiva',max:54,pick:5}};
const LOOK=[48,96,144,240],K=[1,2,4,8],LAG=[1,2,3,5],MODE=['nearest-displacement','local-barycenter','tangent-median','transport-momentum'],SHRINK=[0,0.25,0.5,0.75],PHASE=[0,1,2,3,4,5];

function load(id){
  const g=G[id],a=[];
  for(const f of fs.readdirSync(path.join(R,'data/archive',g.dir)).filter(x=>/^\d{4}\.json$/.test(x)).sort()){
    const j=JSON.parse(fs.readFileSync(path.join(R,'data/archive',g.dir,f)));
    for(const z of j.records||j.draws||[]){
      const date=z.drawDate||z.date;
      const main=(z.result?.main||z.main||z.numbers||[]).map(Number).sort((a,b)=>a-b);
      if(date&&date>='2017-01-01'&&date<'2023-01-01'&&main.length===g.pick)a.push({date,main});
    }
  }
  return [...new Map(a.map(x=>[x.date,x])).values()].sort((a,b)=>a.date.localeCompare(b.date));
}
function vec(main,g){return main.map(x=>(x-.5)/g.max)}
function cfg(n,game){
  let x=n;
  const lookback=LOOK[x%4];x=Math.floor(x/4);
  const neighbors=K[x%4];x=Math.floor(x/4);
  const transportLag=LAG[x%4];x=Math.floor(x/4);
  const mode=MODE[x%4];x=Math.floor(x/4);
  const shrink=SHRINK[x%4];x=Math.floor(x/4);
  const phase=PHASE[x%6];
  return{scientistId:`W${String(n).padStart(6,'0')}`,game,lookback,neighbors,transportLag,mode,shrink,phase};
}
function dist(a,b,phase){
  let s=0;
  for(let q=0;q<a.length;q++){
    const w=1+(((q+phase)%a.length)/(2*a.length));
    const d=Math.abs(a[q]-b[q]);
    s+=w*(phase%2?d*d:d);
  }
  return s;
}
function median(xs){const a=[...xs].sort((a,b)=>a-b);const m=Math.floor(a.length/2);return a.length%2?a[m]:(a[m-1]+a[m])/2}
function project(v,g){
  const used=new Set(),out=[];
  for(let q=0;q<v.length;q++){
    let target=Math.round(Math.max(1,Math.min(g.max,v[q]*g.max+.5)));
    if(used.has(target)){
      let best=null,bestD=Infinity;
      for(let n=1;n<=g.max;n++)if(!used.has(n)){
        const d=Math.abs(n-target);
        if(d<bestD||(d===bestD&&n<best)){best=n;bestD=d}
      }
      target=best;
    }
    used.add(target);out.push(target);
  }
  return out.sort((a,b)=>a-b);
}
function predict(rows,i,g,s){
  const L=s.transportLag;
  if(i<=L+2)return rows[i-1].main;
  const anchor=vec(rows[i-L].main,g);
  const lo=Math.max(L,i-s.lookback);
  const cand=[];
  for(let j=lo;j<i;j++){
    if(j-L<0)continue;
    const histAnchor=vec(rows[j-L].main,g);
    cand.push({j,d:dist(anchor,histAnchor,s.phase)});
  }
  cand.sort((a,b)=>a.d-b.d||b.j-a.j);
  const nn=cand.slice(0,Math.max(1,s.neighbors));
  if(!nn.length)return rows[i-1].main;
  const nexts=nn.map(o=>vec(rows[o.j].main,g));
  const bases=nn.map(o=>vec(rows[o.j-L].main,g));
  const disps=nexts.map((v,r)=>v.map((x,q)=>x-bases[r][q]));
  const recent=vec(rows[i-1].main,g);
  const recentBase=vec(rows[Math.max(0,i-1-L)].main,g);
  let raw=[];
  for(let q=0;q<g.pick;q++){
    if(s.mode==='nearest-displacement') raw[q]=anchor[q]+disps[0][q];
    else if(s.mode==='local-barycenter') raw[q]=nexts.reduce((a,v)=>a+v[q],0)/nexts.length;
    else if(s.mode==='tangent-median') raw[q]=anchor[q]+median(disps.map(v=>v[q]));
    else {
      const local=disps.reduce((a,v)=>a+v[q],0)/disps.length;
      const momentum=recent[q]-recentBase[q];
      raw[q]=anchor[q]+0.65*local+0.35*momentum;
    }
  }
  const uniform=Array.from({length:g.pick},(_,q)=>(q+1)/(g.pick+1));
  const phaseBias=(s.phase-2.5)*0.0015;
  const shrunk=raw.map((x,q)=>(1-s.shrink)*x+s.shrink*uniform[q]+phaseBias*(q-(g.pick-1)/2));
  shrunk.sort((a,b)=>a-b);
  return project(shrunk,g);
}

const byGame={};let logicalTotal=0,historicalTotal=0,behaviorTotal=0;
for(const [id,g] of Object.entries(G)){
  const rows=load(id),logical=6144;
  logicalTotal+=logical;
  const selected=[];
  for(let t=0;t<1024;t++)selected.push(cfg((t*37+id.length*101)%logical,id));
  historicalTotal+=selected.length;
  const evalIdx=[];
  for(let i=0;i<rows.length;i++)if(rows[i].date>='2019-01-01'&&rows[i].date<'2023-01-01'&&i>=160)evalIdx.push(i);
  const stride=Math.max(1,Math.floor(evalIdx.length/24));
  const probes=evalIdx.filter((_,z)=>z%stride===0).slice(0,24);
  const seen=new Map();
  for(const s of selected){
    let hits=0,near=0,full=0,n=0;const hist={},traj=[];
    for(const i of probes){
      const p=predict(rows,i,g,s);const k=p.filter(x=>rows[i].main.includes(x)).length;
      traj.push(p.join('-'));hits+=k;n++;hist[k]=(hist[k]||0)+1;
      if(k>=g.pick-1)near++;if(k===g.pick)full++;
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
const out={version:'v301-stage1-2',family:'WASSERSTEIN_POINT_PROCESS_DYNAMICS',generatedAt:new Date().toISOString(),logicalStructuralScreen:logicalTotal,historicalScreened:historicalTotal,behavioralRepresentatives:behaviorTotal,selectionWindow:'2019-01-01/2023-01-01',validationTouched:false,postFreezeTouched:false,retuningPerformed:false,signalForDenseFreeze:signal,byGame,realMoneyPass:false,realStakeEUR:0,ordinaryBudgetMaxEUR:4,next:signal?'dense-selection-freeze':'close-family-early'};
fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({logicalStructuralScreen:logicalTotal,historicalScreened:historicalTotal,behavioralRepresentatives:behaviorTotal,signalForDenseFreeze:signal,byGame:Object.fromEntries(Object.entries(byGame).map(([k,v])=>[k,{reps:v.behavioralRepresentatives,near:v.nearFullBehaviors,full:v.fullMainBehaviors}])),validationTouched:false,realMoneyPass:false},null,2));

#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const R='loterias-ai';
const IN=path.join(R,'data/research/metapleno-v301-stage1-2-selection.json');
const OUT=path.join(R,'data/research/metapleno-v301-stage3-dense-freeze.json');
const H=s=>crypto.createHash('sha256').update(String(s)).digest('hex');
const G={bonoloto:{dir:'bonoloto',max:49,pick:6},primitiva:{dir:'primitiva',max:49,pick:6},euromillones:{dir:'euromillones',max:50,pick:5},'gordo-primitiva':{dir:'gordo-primitiva',max:54,pick:5}};
if(!fs.existsSync(IN))throw new Error('Missing v301 stage1-2 evidence');
const stage1=JSON.parse(fs.readFileSync(IN,'utf8'));
if(stage1.validationTouched||stage1.postFreezeTouched||stage1.retuningPerformed)throw new Error('Blindness gate violated upstream');

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
function dist(a,b,phase){let s=0;for(let q=0;q<a.length;q++){const w=1+(((q+phase)%a.length)/(2*a.length));const d=Math.abs(a[q]-b[q]);s+=w*(phase%2?d*d:d)}return s}
function median(xs){const a=[...xs].sort((a,b)=>a-b),m=Math.floor(a.length/2);return a.length%2?a[m]:(a[m-1]+a[m])/2}
function project(v,g){const used=new Set(),out=[];for(let q=0;q<v.length;q++){let target=Math.round(Math.max(1,Math.min(g.max,v[q]*g.max+.5)));if(used.has(target)){let best=null,bestD=Infinity;for(let n=1;n<=g.max;n++)if(!used.has(n)){const d=Math.abs(n-target);if(d<bestD||(d===bestD&&(best===null||n<best))){best=n;bestD=d}}target=best}used.add(target);out.push(target)}return out.sort((a,b)=>a-b)}
function predict(rows,i,g,s){
  const L=s.transportLag;if(i<=L+2)return rows[i-1].main;
  const anchor=vec(rows[i-L].main,g),lo=Math.max(L,i-s.lookback),cand=[];
  for(let j=lo;j<i;j++){if(j-L<0)continue;const histAnchor=vec(rows[j-L].main,g);cand.push({j,d:dist(anchor,histAnchor,s.phase)})}
  cand.sort((a,b)=>a.d-b.d||b.j-a.j);const nn=cand.slice(0,Math.max(1,s.neighbors));if(!nn.length)return rows[i-1].main;
  const nexts=nn.map(o=>vec(rows[o.j].main,g)),bases=nn.map(o=>vec(rows[o.j-L].main,g)),disps=nexts.map((v,r)=>v.map((x,q)=>x-bases[r][q]));
  const recent=vec(rows[i-1].main,g),recentBase=vec(rows[Math.max(0,i-1-L)].main,g);let raw=[];
  for(let q=0;q<g.pick;q++){
    if(s.mode==='nearest-displacement')raw[q]=anchor[q]+disps[0][q];
    else if(s.mode==='local-barycenter')raw[q]=nexts.reduce((a,v)=>a+v[q],0)/nexts.length;
    else if(s.mode==='tangent-median')raw[q]=anchor[q]+median(disps.map(v=>v[q]));
    else{const local=disps.reduce((a,v)=>a+v[q],0)/disps.length,momentum=recent[q]-recentBase[q];raw[q]=anchor[q]+0.65*local+0.35*momentum}
  }
  const uniform=Array.from({length:g.pick},(_,q)=>(q+1)/(g.pick+1)),phaseBias=(s.phase-2.5)*0.0015;
  const shrunk=raw.map((x,q)=>(1-s.shrink)*x+s.shrink*uniform[q]+phaseBias*(q-(g.pick-1)/2)).sort((a,b)=>a-b);
  return project(shrunk,g);
}

const byGame={};let frozenTotal=0,promotableTotal=0;
for(const [id,g] of Object.entries(G)){
  const src=stage1.byGame?.[id];
  const rows=load(id);
  const signalBest=(src?.best||[]).filter(x=>x.selection?.nearFull>0||x.selection?.fullMain>0);
  const fallback=(src?.best||[]).slice(0,Math.max(0,12-signalBest.length));
  const map=new Map([...signalBest,...fallback].map(x=>[x.behaviorHash,x]));
  const frozen=[...map.values()].slice(0,24).map(x=>({scientistId:x.scientistId,game:id,lookback:x.lookback,neighbors:x.neighbors,transportLag:x.transportLag,mode:x.mode,shrink:x.shrink,phase:x.phase,behaviorHash:x.behaviorHash,selectionEvidence:x.selection}));
  frozenTotal+=frozen.length;
  const evalIdx=[];for(let i=0;i<rows.length;i++)if(rows[i].date>='2019-01-01'&&rows[i].date<'2023-01-01'&&i>=160)evalIdx.push(i);
  const dense=[];
  for(const s of frozen){
    let hits=0,full=0;const hist={},nearDates=[],fullDates=[];
    for(const i of evalIdx){const p=predict(rows,i,g,s),k=p.filter(x=>rows[i].main.includes(x)).length;hits+=k;hist[k]=(hist[k]||0)+1;if(k>=g.pick-1)nearDates.push({date:rows[i].date,hits:k,prediction:p,target:rows[i].main});if(k===g.pick){full++;fullDates.push(rows[i].date)}}
    const uniqueNear=[...new Set(nearDates.map(x=>x.date))];
    const rec={...s,freezeHash:H(JSON.stringify({game:id,lookback:s.lookback,neighbors:s.neighbors,transportLag:s.transportLag,mode:s.mode,shrink:s.shrink,phase:s.phase})),denseSelection:{draws:evalIdx.length,meanHits:hits/Math.max(1,evalIdx.length),nearFullCount:nearDates.length,uniqueNearDates:uniqueNear,fullMain:full,fullDates,hitHistogram:hist,nearEvents:nearDates.slice(0,20)},promotionCandidate:full>0||uniqueNear.length>=2};
    if(rec.promotionCandidate)promotableTotal++;dense.push(rec);
  }
  dense.sort((a,b)=>Number(b.promotionCandidate)-Number(a.promotionCandidate)||b.denseSelection.fullMain-a.denseSelection.fullMain||b.denseSelection.uniqueNearDates.length-a.denseSelection.uniqueNearDates.length||b.denseSelection.meanHits-a.denseSelection.meanHits);
  byGame[id]={stage1NearBehaviors:src?.nearFullBehaviors||0,frozenCount:frozen.length,promotionCandidates:dense.filter(x=>x.promotionCandidate).length,bestDense:dense.slice(0,24)};
}
const out={version:'v301-stage3',family:'WASSERSTEIN_POINT_PROCESS_DYNAMICS',generatedAt:new Date().toISOString(),selectionWindow:'2019-01-01/2023-01-01',selectionOnly:true,frozenTotal,promotableTotal,validationTouched:false,postFreezeTouched:false,retuningPerformed:false,byGame,realMoneyPass:false,realStakeEUR:0,next:promotableTotal>0?'matched-null-before-oos':'close-family-early'};
fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({frozenTotal,promotableTotal,byGame:Object.fromEntries(Object.entries(byGame).map(([k,v])=>[k,{stage1Near:v.stage1NearBehaviors,frozen:v.frozenCount,promotable:v.promotionCandidates,bestUniqueNear:v.bestDense[0]?.denseSelection?.uniqueNearDates?.length||0,bestFull:v.bestDense[0]?.denseSelection?.fullMain||0}])),validationTouched:false,realMoneyPass:false},null,2));

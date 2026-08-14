import fs from 'node:fs';
import path from 'node:path';

const base='loterias-ai/data/archive/loteria-nacional';
const files=fs.readdirSync(base).filter(f=>/^\d{4}\.json$/.test(f)).sort();
const rows=[];
for(const file of files){
  const doc=JSON.parse(fs.readFileSync(path.join(base,file),'utf8'));
  for(const r of doc.records||[]){
    if(!r?.drawDate||!r?.result?.firstPrize) continue;
    if(['NAVIDAD','EL_NINO'].includes(r.drawType)) continue;
    const n=String(r.result.firstPrize).padStart(5,'0');
    if(!/^\d{5}$/.test(n)) continue;
    rows.push({date:r.drawDate,n,reintegro:(r.result.reintegro||[]).map(Number).filter(Number.isFinite),drawType:r.drawType||'REGULAR'});
  }
}
rows.sort((a,b)=>a.date.localeCompare(b.date));
if(rows.length<500) throw new Error(`Nacional history too small: ${rows.length}`);

const strategies=['balanced','long-frequency','recent-frequency','suffix-heavy'];
const candidateCount=10;
const minTrain=300;
const split=Math.max(minTrain,Math.floor(rows.length*0.70));

function freqState(hist){
  const pos=Array.from({length:5},()=>Array(10).fill(0));
  const suffix1=Array(10).fill(0), suffix2=Array(100).fill(0), suffix3=Array(1000).fill(0);
  for(const r of hist){const s=r.n;for(let i=0;i<5;i++)pos[i][Number(s[i])]++;suffix1[Number(s.slice(-1))]++;suffix2[Number(s.slice(-2))]++;suffix3[Number(s.slice(-3))]++;}
  return {pos,suffix1,suffix2,suffix3,total:hist.length};
}
function norm(v,arr){const max=Math.max(...arr,1),min=Math.min(...arr);return max===min?0.5:(v-min)/(max-min)}
function scoreNumber(num,long,recent,strategy){
  const s=String(num).padStart(5,'0');let positional=0;
  for(let i=0;i<5;i++) positional+=norm(long.pos[i][Number(s[i])],long.pos[i]);
  positional/=5;
  const l1=norm(long.suffix1[Number(s.slice(-1))],long.suffix1),l2=norm(long.suffix2[Number(s.slice(-2))],long.suffix2),l3=norm(long.suffix3[Number(s.slice(-3))],long.suffix3);
  const r1=norm(recent.suffix1[Number(s.slice(-1))],recent.suffix1),r2=norm(recent.suffix2[Number(s.slice(-2))],recent.suffix2);
  if(strategy==='long-frequency') return 0.55*positional+0.20*l1+0.15*l2+0.10*l3;
  if(strategy==='recent-frequency') return 0.30*positional+0.25*r1+0.25*r2+0.10*l1+0.10*l2;
  if(strategy==='suffix-heavy') return 0.15*positional+0.25*l1+0.30*l2+0.20*l3+0.10*r2;
  return 0.35*positional+0.20*l1+0.20*l2+0.10*l3+0.075*r1+0.075*r2;
}
function candidates(hist,strategy){
  const long=freqState(hist),recent=freqState(hist.slice(-120));
  const scored=[];
  for(let n=0;n<100000;n++) scored.push([scoreNumber(n,long,recent,strategy),String(n).padStart(5,'0')]);
  scored.sort((a,b)=>b[0]-a[0]||a[1].localeCompare(b[1]));
  const out=[];const endings2=new Set();
  for(const [score,n] of scored){
    const e2=n.slice(-2);if(endings2.has(e2)&&out.length<5)continue;
    out.push({number:n,score:Number((score*100).toFixed(2)),ending1:n.slice(-1),ending2:e2,ending3:n.slice(-3)});endings2.add(e2);
    if(out.length===candidateCount)break;
  }
  return out;
}
function outcomeMetrics(cs,draw){
  let best=0,reintegro=0;
  for(const c of cs){const n=c.number,t=draw.n;let m=0;for(let k=1;k<=5;k++){if(n.slice(-k)===t.slice(-k))m=k;else break;}best=Math.max(best,m);if(draw.reintegro.includes(Number(n.slice(-1))))reintegro++;}
  return {bestSuffix:best,reintegroHits:reintegro};
}
function aggregate(events){
  const n=events.length||1;return {draws:events.length,suffix1Rate:events.filter(e=>e.bestSuffix>=1).length/n,suffix2Rate:events.filter(e=>e.bestSuffix>=2).length/n,suffix3Rate:events.filter(e=>e.bestSuffix>=3).length/n,suffix4Rate:events.filter(e=>e.bestSuffix>=4).length/n,exactRate:events.filter(e=>e.bestSuffix>=5).length/n,avgReintegroHits:events.reduce((a,e)=>a+e.reintegroHits,0)/n};
}
function seeded(seed){let x=seed>>>0;return()=>{x=(1664525*x+1013904223)>>>0;return x/4294967296}}
function randomCandidates(rng){const set=new Set();while(set.size<candidateCount)set.add(String(Math.floor(rng()*100000)).padStart(5,'0'));return [...set].map(number=>({number}));}

const discovery=rows.slice(0,split),holdout=rows.slice(split);const discoveryEval={};
for(const strategy of strategies){const events=[];for(let i=minTrain;i<discovery.length;i++){const hist=discovery.slice(0,i),cs=candidates(hist,strategy);events.push(outcomeMetrics(cs,discovery[i]));}discoveryEval[strategy]=aggregate(events);}
const selected=[...strategies].sort((a,b)=>{const A=discoveryEval[a],B=discoveryEval[b];const ua=A.suffix3Rate*8+A.suffix2Rate*3+A.suffix1Rate+A.avgReintegroHits*0.05;const ub=B.suffix3Rate*8+B.suffix2Rate*3+B.suffix1Rate+B.avgReintegroHits*0.05;return ub-ua;})[0];
const holdEvents=[];for(let i=split;i<rows.length;i++){const hist=rows.slice(0,i),cs=candidates(hist,selected);holdEvents.push(outcomeMetrics(cs,rows[i]));}const holdoutModel=aggregate(holdEvents);
const baselines=[];for(let seed=1;seed<=100;seed++){const rng=seeded(seed*7919);const ev=holdout.map(d=>outcomeMetrics(randomCandidates(rng),d));baselines.push(aggregate(ev));}
const baselineMean={};for(const key of ['suffix1Rate','suffix2Rate','suffix3Rate','suffix4Rate','exactRate','avgReintegroHits'])baselineMean[key]=baselines.reduce((a,b)=>a+b[key],0)/baselines.length;
const better2=holdoutModel.suffix2Rate>baselineMean.suffix2Rate,better3=holdoutModel.suffix3Rate>baselineMean.suffix3Rate;
const currentCandidates=candidates(rows,selected);
const output={generatedAt:new Date().toISOString(),gameId:'loteria-nacional',status:'RESEARCH_SHADOW',method:'chronological discovery/holdout; seasonal Navidad/Nino excluded',records:rows.length,earliest:rows[0].date,latest:rows.at(-1).date,split:{discovery:discovery.length,holdout:holdout.length,holdoutStart:holdout[0]?.date},strategies:discoveryEval,selectedStrategy:selected,holdout:{model:holdoutModel,baseline100Mean:baselineMean,liftSuffix2:baselineMean.suffix2Rate?holdoutModel.suffix2Rate/baselineMean.suffix2Rate-1:null,liftSuffix3:baselineMean.suffix3Rate?holdoutModel.suffix3Rate/baselineMean.suffix3Rate-1:null,passesStructuralSignal:better2&&better3},currentCandidates,interpretation:'Scores rank historical structure only. They are not probabilities of winning. Geography/administrations are excluded until persisted and independently validated.'};
fs.mkdirSync('loterias-ai/data/models',{recursive:true});fs.writeFileSync('loterias-ai/data/models/loteria-nacional-number5.json',JSON.stringify(output,null,2)+'\n');console.log(JSON.stringify({records:output.records,selectedStrategy:selected,holdout:output.holdout,currentCandidates},null,2));

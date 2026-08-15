import fs from 'node:fs';

let rows=[];
for(const f of fs.readdirSync('loterias-ai/data/archive/bonoloto').filter(x=>/^\d{4}\.json$/.test(x)).sort()){
  const j=JSON.parse(fs.readFileSync(`loterias-ai/data/archive/bonoloto/${f}`,'utf8'));
  rows.push(...(j.records||[]));
}
rows=rows.filter(r=>r.drawDate&&Array.isArray(r.result?.main)&&r.result.main.length===6&&new Set(r.result.main).size===6).sort((a,b)=>a.drawDate.localeCompare(b.drawDate));
const MAX=49;
const PORTS=[1,5,25];
const CONFIGS=[];
for(const stateWindow of [20,40,80]) for(const neighbors of [20,50,100]) for(const recency of [0,0.5,1]) CONFIGS.push({stateWindow,neighbors,recency});

function rng(seed){let x=seed>>>0;return()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return(x>>>0)/4294967296}}
function drawFeat(a,prev){const s=[...a].sort((x,y)=>x-y);let odd=0,low=0,cons=0,maxGap=0;for(const n of s){odd+=n%2;low+=n<=24?1:0}for(let i=1;i<s.length;i++){const g=s[i]-s[i-1];if(g===1)cons++;if(g>maxGap)maxGap=g}const ov=prev?s.filter(n=>prev.has(n)).length:0;return [s.reduce((x,y)=>x+y,0)/294,odd/6,low/6,cons/5,maxGap/48,(s[5]-s[0])/48,ov/6];}
function stateAt(i,w){const from=Math.max(1,i-w),m=Array(7).fill(0),sd=Array(7).fill(0),vals=[];for(let j=from;j<i;j++){const v=drawFeat(rows[j].result.main,new Set(rows[j-1].result.main));vals.push(v);for(let k=0;k<7;k++)m[k]+=v[k]}for(let k=0;k<7;k++)m[k]/=Math.max(1,vals.length);for(const v of vals)for(let k=0;k<7;k++)sd[k]+=(v[k]-m[k])**2;for(let k=0;k<7;k++)sd[k]=Math.sqrt(sd[k]/Math.max(1,vals.length))||0.05;const last=drawFeat(rows[i-1].result.main,i>1?new Set(rows[i-2].result.main):null);return [...m,...sd,...last];}
function dist(a,b){let s=0;for(let i=0;i<a.length;i++){const d=a[i]-b[i];s+=d*d}return Math.sqrt(s/a.length)}
function stateModel(i,cfg){const target=stateAt(i,cfg.stateWindow),cand=[];const minIdx=Math.max(cfg.stateWindow+2,80);for(let j=minIdx;j<i-1;j++){const st=stateAt(j,cfg.stateWindow);let d=dist(target,st);if(cfg.recency>0){const age=(i-j)/Math.max(1,i);d*=1+cfg.recency*age*0.35}cand.push({j,d})}cand.sort((a,b)=>a.d-b.d||b.j-a.j);const nn=cand.slice(0,Math.min(cfg.neighbors,cand.length));const freq=new Float64Array(MAX+1),pair=Array.from({length:MAX+1},()=>new Float64Array(MAX+1));let weightSum=0;for(const q of nn){const wt=1/(0.02+q.d);weightSum+=wt;const a=rows[q.j].result.main.map(Number);for(const n of a)freq[n]+=wt;for(let x=0;x<a.length;x++)for(let y=x+1;y<a.length;y++){pair[a[x]][a[y]]+=wt;pair[a[y]][a[x]]+=wt}}if(weightSum===0)weightSum=1;for(let n=1;n<=MAX;n++)freq[n]/=weightSum;return{freq,pair,weightSum,nn,target};}
function sampleWeightedWithoutReplacement(R,weights,k){const avail=Array.from({length:MAX},(_,q)=>q+1),out=[];while(out.length<k&&avail.length){let total=0;for(const n of avail)total+=Math.max(1e-6,weights[n]);let x=R()*total,idx=0;for(;idx<avail.length;idx++){x-=Math.max(1e-6,weights[avail[idx]]);if(x<=0)break}out.push(avail.splice(Math.min(idx,avail.length-1),1)[0]);}return out.sort((a,b)=>a-b)}
function portfolio(i,cfg,k){const m=stateModel(i,cfg),R=rng((0x21b00000+i*2654435761+cfg.stateWindow*101+cfg.neighbors*997+Math.floor(cfg.recency*100)*7919)>>>0),cand=[],seen=new Set();for(let q=0;q<1600;q++){const a=sampleWeightedWithoutReplacement(R,m.freq,6),key=a.join('-');if(seen.has(key))continue;seen.add(key);let ns=0,ps=0;for(const n of a)ns+=m.freq[n];for(let x=0;x<6;x++)for(let y=x+1;y<6;y++)ps+=m.pair[a[x]][a[y]]/m.weightSum;const score=ns+0.7*ps;cand.push({a,score})}cand.sort((a,b)=>b.score-a.score||a.a.join('-').localeCompare(b.a.join('-')));const out=[];for(const q of cand){if(out.length>=k)break;let overlap=false;for(const p of out){let ov=0;for(const n of q.a)if(p.includes(n))ov++;if(ov>=5){overlap=true;break}}if(!overlap)out.push(q.a)}return out;}
function settle(r,t){const truth=r.result.main.map(Number),h=t.filter(n=>truth.includes(n)).length,c=Number(r.result.complementary??r.result.complementario??NaN),hasC=Number.isFinite(c)&&t.includes(c);let cat=null;if(h===6)cat=1;else if(h===5&&hasC)cat=2;else if(h===5)cat=3;else if(h===4)cat=4;else if(h===3)cat=5;const prize=cat?Number((r.economics?.categories||[]).find(x=>Number(x.category)===cat)?.prize||0):0;return{h,cat,prize};}
function evalPeriod(cfg,k,fromYear,toYear){let draws=0,stake=0,ret=0,high=0,six=0;const byYear={},events=[];for(let i=150;i<rows.length;i++){const y=Number(rows[i].drawDate.slice(0,4));if(y<fromYear||y>toYear||!rows[i].economics?.categories)continue;const port=portfolio(i,cfg,k),unit=Number(rows[i].economics?.ticketCost||0.5);let best=0,bestTicket=null,dr=0;for(const t of port){const q=settle(rows[i],t);dr+=q.prize;if(q.h>best){best=q.h;bestTicket=t}}draws++;stake+=port.length*unit;ret+=dr;byYear[y]??={draws:0,stake:0,ret:0,high:0,six:0};const yy=byYear[y];yy.draws++;yy.stake+=port.length*unit;yy.ret+=dr;if(best>=5){high++;yy.high++;events.push({date:rows[i].drawDate,bestHits:best,bestTicket,truth:rows[i].result.main,portfolioSize:port.length})}if(best===6){six++;yy.six++}}
  for(const v of Object.values(byYear))v.roi=v.stake?v.ret/v.stake-1:null;
  const rois=Object.values(byYear).map(v=>v.roi).filter(Number.isFinite).sort((a,b)=>a-b);
  return{draws,stakeEUR:stake,returnEUR:ret,roi:stake?ret/stake-1:null,high,six,medianYearROI:rois.length?rois[Math.floor(rois.length/2)]:null,worstYearROI:rois.length?rois[0]:null,byYear,events};
}

const candidates=[];
for(const cfg of CONFIGS)for(const k of PORTS){const validation=evalPeriod(cfg,k,2020,2022);candidates.push({cfg,k,validation});}
candidates.sort((a,b)=>b.validation.six-a.validation.six||b.validation.high-a.validation.high||((b.validation.medianYearROI??-9)-(a.validation.medianYearROI??-9))||((b.validation.roi??-9)-(a.validation.roi??-9))||a.validation.stakeEUR-b.validation.stakeEUR);
const selected=candidates[0];
selected.research2023_2026=evalPeriod(selected.cfg,selected.k,2023,2026);
const out={generatedAt:new Date().toISOString(),engine:'MetaPleno-v21-bonoloto-latent-state',methodology:'Nearest-neighbour latent-state forecasting. Each target draw is represented only by structural state vectors computed from prior draws; historical analogue states are selected without future leakage, and their subsequent outcomes drive number/pair probabilities. Hyperparameters and portfolio size are chosen using 2020-2022 only. 2023-2026 is research evaluation, not virgin holdout. Future promotion requires sealed prospective draws.',candidateConfigs:candidates.length,selected,topValidation:candidates.slice(0,10),realMoneyPass:false};
fs.mkdirSync('loterias-ai/data/research',{recursive:true});
fs.writeFileSync('loterias-ai/data/research/meta-pleno-v21-bonoloto-latent-state.json',JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({selected:{cfg:selected.cfg,k:selected.k,validation:selected.validation,research:selected.research2023_2026}},null,2));
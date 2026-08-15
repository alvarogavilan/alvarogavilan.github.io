import fs from 'node:fs';
import crypto from 'node:crypto';

const DIR='loterias-ai/data/archive/bonoloto';
const OUT='loterias-ai/data/prospective/bonoloto-v135-freeze.json';
const CUTOFF='2026-08-14';
const TARGET='2026-08-15';
const LAMBDA=0.05;
const W={longFrequency:.3022952842805535,shortMomentum:.053809041558997704,gap:.05963261735800188,stability:.14257350411498917,pairAffinity:.09574737392249517,entropy:.18896698849508542,meanReversion:.11614609738171566};
const K=Object.keys(W),minHistory=250;
let rows=[];
for(const f of fs.readdirSync(DIR).filter(x=>/^\d{4}\.json$/.test(x)).sort())rows.push(...(JSON.parse(fs.readFileSync(`${DIR}/${f}`,'utf8')).records||[]));
rows=[...new Map(rows.map(r=>[r.drawId,r])).values()].filter(r=>r.result?.main?.length===6&&r.drawDate<=CUTOFF).sort((a,b)=>a.drawDate.localeCompare(b.drawDate));
if(!rows.length||rows.at(-1).drawDate!==CUTOFF)throw new Error(`Freeze requires archive through ${CUTOFF}; latest=${rows.at(-1)?.drawDate}`);
if(rows.some(r=>r.drawDate>=TARGET))throw new Error('Target result already present in training archive; prospective freeze refused');
const draws=rows.map(r=>({date:r.drawDate,n:r.result.main.map(Number).sort((a,b)=>a-b)}));
const mean=a=>a.reduce((s,x)=>s+x,0)/Math.max(1,a.length),sd=a=>{const m=mean(a);return Math.sqrt(mean(a.map(x=>(x-m)**2)))||1},clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x)),unit=z=>.5+.5*Math.tanh(z/2),comb=(a,k)=>{const o=[];function r(s,p){if(p.length===k){o.push([...p]);return}for(let i=s;i<a.length;i++){p.push(a[i]);r(i+1,p);p.pop()}}r(0,[]);return o};
function structural(a){const x=[...a].sort((p,q)=>p-q),g=x.slice(1).map((v,i)=>v-x[i]),dec={};for(const n of x)dec[Math.floor((n-1)/10)]=(dec[Math.floor((n-1)/10)]||0)+1;return[x.reduce((s,n)=>s+n,0),x.at(-1)-x[0],x.filter(n=>n%2).length,g.filter(v=>v===1).length,Math.max(...Object.values(dec)),sd(g)]}
function sstats(hist){const f=hist.map(x=>structural(x.n)),m=[],s=[];for(let j=0;j<6;j++){const v=f.map(x=>x[j]);m[j]=mean(v);s[j]=sd(v)}return{m,s}}
function nc(a,S){const f=structural(a);return mean(f.map((v,j)=>Math.abs(v-S.m[j])/S.s[j]))}
function c12rank(hist){const all=Array(50).fill(0),c20=Array(50).fill(0),c50=Array(50).fill(0),c100=Array(50).fill(0),last=Array(50).fill(-1),pairs=Array.from({length:50},()=>Array(50).fill(0));for(let i=0;i<hist.length;i++)for(const n of hist[i].n){all[n]++;last[n]=i;if(i>=hist.length-20)c20[n]++;if(i>=hist.length-50)c50[n]++;if(i>=hist.length-100)c100[n]++;for(const x of hist[i].n)if(x!==n)pairs[n][x]++}const z=(c,n)=>{const v=c.slice(1),m=mean(v),s=sd(v);return(c[n]-m)/s};let gm=1,gaps=Array(50).fill(0);for(let n=1;n<=49;n++){gaps[n]=last[n]<0?hist.length:hist.length-1-last[n];gm=Math.max(gm,gaps[n])}const total=all.slice(1).reduce((a,b)=>a+b,0)||1,out=[];for(let n=1;n<=49;n++){const za=z(all,n),z20=z(c20,n),z50=z(c50,n),z100=z(c100,n),lf=unit(za),sm=clamp(.6*unit(z20)+.4*unit(z50)),gap=clamp(gaps[n]/gm),stab=clamp(1-(Math.abs(z20-z50)+Math.abs(z50-z100)+Math.abs(z100-za))/8);let pa=0;if(all[n])for(let x=1;x<=49;x++)if(x!==n)pa=Math.max(pa,pairs[n][x]/all[n]);const p=all[n]/total,ent=clamp((p>0?-p*Math.log(p):0)*8),mr=clamp(1-Math.abs(unit(za)-.5)*2),f={longFrequency:lf,shortMomentum:sm,gap,stability:stab,pairAffinity:clamp(pa),entropy:ent,meanReversion:mr},den=Object.values(W).reduce((a,b)=>a+b,0),score=K.reduce((a,k)=>a+f[k]*W[k],0)/den;out.push([n,score])}return out.sort((a,b)=>b[1]-a[1]||a[0]-b[0])}
function candidates(r){const b=r.slice(0,8).map(x=>x[0]),o=[b];for(let d=5;d<8;d++)for(let a=8;a<14;a++){const p=[...b];p[d]=r[a][0];if(new Set(p).size===8)o.push(p)}return[...new Map(o.map(p=>[[...p].sort((a,b)=>a-b).join(','),p])).values()]}
const hist=draws,r=c12rank(hist),S=sstats(hist),cs=candidates(r);let pool=null,best=-Infinity;
for(const p of cs){const rankScore=mean(p.map(n=>r.find(x=>x[0]===n)?.[1]||0)),structScore=-mean(comb(p,6).map(x=>nc(x,S))),v=rankScore+LAMBDA*structScore;if(v>best){best=v;pool=[...p].sort((a,b)=>a-b)}}
if(!pool||pool.length!==8)throw new Error('No frozen pool');
const tickets=comb(pool,6).map(x=>x.sort((a,b)=>a-b));
if(tickets.length!==28)throw new Error(`Expected 28 tickets, got ${tickets.length}`);
const config={engine:'v132-c12-structural-budget8',lambda:LAMBDA,weights:W,minHistory,poolSize:8,playableCombinations:28,theoreticalStakeEUR:14,trainingCutoff:CUTOFF,targetDrawDate:TARGET};
const fingerprint=crypto.createHash('sha256').update(JSON.stringify({config,pool,tickets})).digest('hex');
const out={generatedAt:new Date().toISOString(),version:'v135',gameId:'bonoloto',status:'FROZEN_BEFORE_TARGET_RESULT',purpose:'Fresh prospective replication of the exploratory v132 architecture. No parameter, pool or ticket change is permitted after this commit for the target draw.',config,prediction:{pool,tickets,fingerprintSha256:fingerprint},dataBoundary:{lastTrainingDraw:CUTOFF,targetDraw:TARGET,trainingDraws:draws.length,targetResultObserved:false},evidencePolicy:{successMetrics:['poolHits','bestPlayableHits','full6'],primaryConfirmatoryMetric:'full6',noPostResultMutation:true,globalEvidenceRegistryRequired:true},realMoneyPass:false,realStakeEUR:0};
fs.mkdirSync('loterias-ai/data/prospective',{recursive:true});fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify({target:TARGET,pool,tickets:tickets.length,fingerprint},null,2));
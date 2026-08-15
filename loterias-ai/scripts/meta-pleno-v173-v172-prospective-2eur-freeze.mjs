import fs from 'node:fs';
import crypto from 'node:crypto';
import {pathToFileURL} from 'node:url';
const SRC='loterias-ai/scripts/meta-pleno-v157-pre2023-hybrid-selector.mjs';
if(!fs.existsSync(SRC))throw new Error('v157 source required');
let s=fs.readFileSync(SRC,'utf8');
s=s.replace("loterias-ai/data/research/meta-pleno-v157-pre2023-hybrid-selector.json","/tmp/meta-pleno-v173-internal.json")
 .replace("version:'v157'","version:'v173-internal'")
 .replace("family:'PRE2023_HYBRID_ROUTE_SELECTOR'","family:'V173_PROSPECTIVE_2EUR_INTERNAL'")
 .replace("sd=a=>{if(a.length<2)return 1;const m=mean(a);return Math.sqrt(a.reduce((s,x)=>s+(x-m)**2,0)/(a.length-1))||1}","sd=a=>{if(!a.length)return 1;const m=mean(a);return Math.sqrt(mean(a.map(x=>(x-m)**2)))||1}")
 .replace("Math.sqrt((S.structM2[j]/Math.max(1,S.structN-1))||1)","Math.sqrt((S.structM2[j]/Math.max(1,S.structN))||1)")
 .replace("rawDays.push({date:d.date,winning:d.n,r,gr,base:r.slice(0,8).map(x=>x.n).sort((a,b)=>a-b)})","const sr=structuralRoute(r);rawDays.push({date:d.date,winning:d.n,r,gr,base:r.slice(0,8).map(x=>x.n).sort((a,b)=>a-b),sr})")
 .replace("sr=structuralRoute(day.r),structHits=day.winning.filter(n=>sr.pool.includes(n)).length","sr=day.sr,structHits=day.winning.filter(n=>sr.pool.includes(n)).length")
 .replace("const useFrontier=day.graphAdv>=s.threshold","const useFrontier=day.graphAdv<=s.threshold");
const marker="const thresholds=[-999,0,4,8,12,16,20,24,28,32,36,40,999],stats=";if(!s.includes(marker))throw new Error('v173 marker missing');
const inject=`
const V173_CUTOFF='2026-08-14',V173_TARGET='2026-08-15',V173_THRESHOLD=40,V173_OUT='loterias-ai/data/prospective/bonoloto-v173-v172-compressed-2eur-freeze.json';
if(ds.at(-1)?.date!==V173_CUTOFF)throw new Error('Freeze refused: expected cutoff '+V173_CUTOFF+' got '+ds.at(-1)?.date);if(ds.some(x=>x.date>=V173_TARGET))throw new Error('Freeze refused: target result already present');
function v173F(r,gr,n){const x=r.find(q=>q.n===n),rank=r.findIndex(q=>q.n===n)+1;return[1-rank/49,x?.score||0,1-(gr.get(n)||49)/49,...K.map(k=>x?.f?.[k]||0)]}
const tr=[];for(const day of days.filter(x=>x.date>='2021-01-01'&&x.date<='2022-12-31')){const pool=day.graphAdv<=V173_THRESHOLD?day.frontierPool:day.structPool,win=new Set(day.winning);for(const n of pool)tr.push({f:v173F(day.r,day.gr,n),bad:!win.has(n)})}const P=tr.filter(x=>x.bad).map(x=>x.f),N=tr.filter(x=>!x.bad).map(x=>x.f),coef=[],mn=[],sc=[];for(let j=0;j<P[0].length;j++){const mp=mean(P.map(x=>x[j]));mn[j]=mean(N.map(x=>x[j]));sc[j]=sd([...P.map(x=>x[j]),...N.map(x=>x[j])]);coef[j]=(mp-mn[j])/sc[j]}const drop=(r,gr,n)=>v173F(r,gr,n).reduce((z,v,j)=>z+coef[j]*(v-mn[j])/sc[j],0);
const i=ds.length,r=rank(i),g=graph(i),gr=new Map(g.map((x,k)=>[x.n,k+1])),base=r.slice(0,8).map(x=>x.n).sort((a,b)=>a-b),baseDrop=r.slice(0,8).map((x,k)=>({x,rank:k+1,s:drop(r,gr,x.n)})).sort((a,b)=>b.s-a.s||a.rank-b.rank)[0],add9=r[8],adv=gr.get(baseDrop.x.n)-gr.get(add9.n),frontier=base.filter(n=>n!==baseDrop.x.n).concat(add9.n).sort((a,b)=>a-b),sr=structuralRoute(r),pool=adv<=V173_THRESHOLD?frontier:sr.pool,route=adv<=V173_THRESHOLD?'FRONTIER_RANK9':'STRUCTURAL_V132';
const pairs=comb(pool,2).map(p=>{const kept=pool.filter(n=>!p.includes(n)),d1=drop(r,gr,p[0]),d2=drop(r,gr,p[1]),div=Math.abs((r.find(x=>x.n===p[0])?.score||0)-(r.find(x=>x.n===p[1])?.score||0));return{omit:p,ticket:kept,score:.25*(d1+d2)-2*div}}).sort((a,b)=>b.score-a.score||a.omit.join(',').localeCompare(b.omit.join(','))),selected=pairs.slice(0,4),tickets=selected.map(x=>x.ticket.slice().sort((a,b)=>a-b));
const config={sourcePoolEngine:'v162-threshold40',compressionEngine:'v172-d0.25-div2',training:'2021-2022 only',target:V173_TARGET,cutoff:V173_CUTOFF,poolSize:8,selectedTickets:4,unitStakeEUR:.5,theoreticalStakeEUR:2,alternativeNotAdditiveToV164:true};const fp=crypto.createHash('sha256').update(JSON.stringify({config,pool,tickets})).digest('hex'),out={generatedAt:new Date().toISOString(),version:'v173',gameId:'bonoloto',status:'FROZEN_BEFORE_TARGET_RESULT',purpose:'Prospective cost-compressed alternative to v164. Never additive with v164. Four pre-ranked tickets / 2 EUR theoretical.',config,prediction:{route,graphAdvantage:adv,pool,tickets,omittedPairs:selected.map(x=>({omit:x.omit,score:x.score})),fingerprintSha256:fp},dataBoundary:{lastTrainingDraw:V173_CUTOFF,targetDraw:V173_TARGET,targetResultObserved:false},evidence:{historicalExploratoryRetention:'v172 leader retained both v162 full-hit dates at <=2 EUR',architecturePosthoc:true,requiresProspectiveReplication:true},realMoneyPass:false,realStakeEUR:0};fs.mkdirSync('loterias-ai/data/prospective',{recursive:true});fs.writeFileSync(V173_OUT,JSON.stringify(out,null,2)+'\\n');console.log(JSON.stringify({route,adv,pool,tickets,fingerprint:fp},null,2));
`;
s=s.replace(marker,inject+'\n'+marker);const tmp='/tmp/meta-pleno-v173.mjs';fs.writeFileSync(tmp,s);await import(pathToFileURL(tmp).href);

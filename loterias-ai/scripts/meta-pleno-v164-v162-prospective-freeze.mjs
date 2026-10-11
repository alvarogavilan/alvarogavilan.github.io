import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
const SRC='loterias-ai/scripts/meta-pleno-v157-pre2023-hybrid-selector.mjs';
if(!fs.existsSync(SRC)) throw new Error('v157 source required');
let s=fs.readFileSync(SRC,'utf8');
s=s.replace("import fs from 'node:fs';","import fs from 'node:fs';\nimport crypto from 'node:crypto';")
 .replace("meta-pleno-v157-pre2023-hybrid-selector.json","meta-pleno-v164-internal.json")
 .replace("version:'v157'","version:'v164-internal'")
 .replace("family:'PRE2023_HYBRID_ROUTE_SELECTOR'","family:'V162_THRESHOLD40_PROSPECTIVE_FREEZE_INTERNAL'")
 .replace("sd=a=>{if(a.length<2)return 1;const m=mean(a);return Math.sqrt(a.reduce((s,x)=>s+(x-m)**2,0)/(a.length-1))||1}","sd=a=>{if(!a.length)return 1;const m=mean(a);return Math.sqrt(mean(a.map(x=>(x-m)**2)))||1}")
 .replace("Math.sqrt((S.structM2[j]/Math.max(1,S.structN-1))||1)","Math.sqrt((S.structM2[j]/Math.max(1,S.structN))||1)")
 .replace("rawDays.push({date:d.date,winning:d.n,r,gr,base:r.slice(0,8).map(x=>x.n).sort((a,b)=>a-b)})","const sr=structuralRoute(r);rawDays.push({date:d.date,winning:d.n,r,gr,base:r.slice(0,8).map(x=>x.n).sort((a,b)=>a-b),sr})")
 .replace("sr=structuralRoute(day.r),structHits=day.winning.filter(n=>sr.pool.includes(n)).length","sr=day.sr,structHits=day.winning.filter(n=>sr.pool.includes(n)).length")
 .replace("const useFrontier=day.graphAdv>=s.threshold","const useFrontier=day.graphAdv<=s.threshold");
const marker="fs.writeFileSync(O,JSON.stringify(out,null,2)+'\\n');console.log(JSON.stringify(out.summary));";
if(!s.includes(marker)) throw new Error('v164 injection marker missing');
const inject=`
const CUTOFF='2026-08-14',TARGET='2026-08-15',THRESHOLD=40,FREEZE='loterias-ai/data/prospective/bonoloto-v164-v162-threshold40-freeze.json';
if(ds.at(-1)?.date!==CUTOFF) throw new Error('Prospective freeze refused: expected archive cutoff '+CUTOFF+' latest='+ds.at(-1)?.date);
if(ds.some(x=>x.date>=TARGET)) throw new Error('Prospective freeze refused: target result already present');
const cr=rank(ds.length),cg=graph(ds.length),cgr=new Map(cg.map((x,k)=>[x.n,k+1])),cbase=cr.slice(0,8).map(x=>x.n).sort((a,b)=>a-b);
const cdrop=cr.slice(0,8).map((x,i)=>({x,rank:i+1,s:dropScore([1-(i+1)/49,x.score,1-cgr.get(x.n)/49,...K.map(k=>x.f[k])])})).sort((a,b)=>b.s-a.s||a.rank-b.rank)[0];
const cadd=cr[8],cadv=cgr.get(cdrop.x.n)-cgr.get(cadd.n),cfrontier=cbase.filter(n=>n!==cdrop.x.n).concat(cadd.n).sort((a,b)=>a-b),csr=structuralRoute(cr),cuseFrontier=cadv<=THRESHOLD,cpool=cuseFrontier?cfrontier:csr.pool,ctickets=comb(cpool,6).map(x=>x.sort((a,b)=>a-b));
if(cpool.length!==8||ctickets.length!==28) throw new Error('Invalid v164 Budget8 freeze');
const config={engine:'v162-inverted-route-gate',threshold:THRESHOLD,routeRule:'FRONTIER_IF_GRAPH_ADVANTAGE_LTE_THRESHOLD_ELSE_STRUCTURAL_V132',dropTraining:'2018-2020',gateSelection:'2021-2022',poolSize:8,playableCombinations:28,theoreticalStakeEUR:14,trainingCutoff:CUTOFF,targetDrawDate:TARGET};
const fingerprint=crypto.createHash('sha256').update(JSON.stringify({config,pool:cpool,tickets:ctickets})).digest('hex');
const freeze={generatedAt:new Date().toISOString(),version:'v164',gameId:'bonoloto',status:'FROZEN_BEFORE_TARGET_RESULT',purpose:'Fresh prospective replication of exploratory v162 threshold40. No parameter, route, pool or ticket change is permitted after this commit for the target draw.',config,prediction:{route:cuseFrontier?'FRONTIER_RANK9':'STRUCTURAL_V132',graphAdvantage:cadv,frontierAdd:cadd.n,frontierAddRank:9,frontierDrop:cdrop.x.n,frontierDropRank:cdrop.rank,frontierDropFalsePositiveScore:cdrop.s,structuralGain:csr.gain,pool:cpool,tickets:ctickets,fingerprintSha256:fingerprint},dataBoundary:{lastTrainingDraw:CUTOFF,targetDraw:TARGET,trainingDraws:ds.length,targetResultObserved:false},evidencePolicy:{primaryConfirmatoryMetric:'full6',secondaryMetrics:['poolHits','bestPlayableHits'],noPostResultMutation:true,globalArchitectureCorrectionRequired:true},realMoneyPass:false,realStakeEUR:0};
fs.mkdirSync('loterias-ai/data/prospective',{recursive:true});fs.writeFileSync(FREEZE,JSON.stringify(freeze,null,2)+'\\n');
fs.writeFileSync(O,JSON.stringify(out,null,2)+'\\n');console.log(JSON.stringify({target:TARGET,route:freeze.prediction.route,pool:cpool,graphAdvantage:cadv,fingerprint},null,2));`;
s=s.replace(marker,inject);
const tmp='/tmp/meta-pleno-v164-freeze.mjs';
fs.writeFileSync(tmp,s);
await import(pathToFileURL(tmp).href);

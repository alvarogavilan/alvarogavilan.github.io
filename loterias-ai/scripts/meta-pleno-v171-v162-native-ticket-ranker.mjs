import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
const SRC='loterias-ai/scripts/meta-pleno-v157-pre2023-hybrid-selector.mjs';
if(!fs.existsSync(SRC)) throw new Error('v157 source required');
let s=fs.readFileSync(SRC,'utf8');
s=s.replace("meta-pleno-v157-pre2023-hybrid-selector.json","/tmp/meta-pleno-v171-internal.json")
 .replace("version:'v157'","version:'v171-internal'")
 .replace("family:'PRE2023_HYBRID_ROUTE_SELECTOR'","family:'V162_NATIVE_TICKET_RANKER_INTERNAL'")
 .replace("sd=a=>{if(a.length<2)return 1;const m=mean(a);return Math.sqrt(a.reduce((s,x)=>s+(x-m)**2,0)/(a.length-1))||1}","sd=a=>{if(!a.length)return 1;const m=mean(a);return Math.sqrt(mean(a.map(x=>(x-m)**2)))||1}")
 .replace("Math.sqrt((S.structM2[j]/Math.max(1,S.structN-1))||1)","Math.sqrt((S.structM2[j]/Math.max(1,S.structN))||1)")
 .replace("rawDays.push({date:d.date,winning:d.n,r,gr,base:r.slice(0,8).map(x=>x.n).sort((a,b)=>a-b)})","const sr=structuralRoute(r);rawDays.push({date:d.date,winning:d.n,r,gr,base:r.slice(0,8).map(x=>x.n).sort((a,b)=>a-b),sr})")
 .replace("sr=structuralRoute(day.r),structHits=day.winning.filter(n=>sr.pool.includes(n)).length","sr=day.sr,structHits=day.winning.filter(n=>sr.pool.includes(n)).length")
 .replace("const useFrontier=day.graphAdv>=s.threshold","const useFrontier=day.graphAdv<=s.threshold");
const marker="const thresholds=[-999,0,4,8,12,16,20,24,28,32,36,40,999],stats=";
if(!s.includes(marker)) throw new Error('v171 injection marker missing');
const inject=`
const V171_OUT='loterias-ai/data/research/meta-pleno-v171-v162-native-ticket-ranker.json',V171_THRESHOLD=40,V171_BUDGETS=[1,2,3,5,10,14],V171_K=Object.fromEntries(V171_BUDGETS.map(e=>[e,Math.round(e/.5)]));
const V171_CFG=[];for(const a of [0,.5,1,2,4])for(const b of [0,.5,1,2,4])for(const c of [0,.25,.5,1,2])for(const d of [0,.25,.5,1])if(a+b+c+d>0)V171_CFG.push({id:'r'+a+'-p'+b+'-g'+c+'-s'+d,a,b,c,d});
const V171_STATS=Object.fromEntries(V171_CFG.map(q=>[q.id,{config:q,select:{},mid:{},late:{}}]));for(const x of Object.values(V171_STATS))for(const ph of ['select','mid','late'])for(const e of V171_BUDGETS)x[ph][e]={n:0,h4:0,h5:0,h6:0,sumBest:0,fullEvents:[]};
function v171Pool(day){return day.graphAdv<=V171_THRESHOLD?day.frontierPool:day.structPool}
function v171TicketFeatures(day,t){const byN=new Map(day.r.map((x,i)=>[x.n,{...x,rank:i+1}]));const rs=mean(t.map(n=>byN.get(n)?.score||0)),pa=mean(t.map(n=>byN.get(n)?.f?.pairAffinity||0)),gr=mean(t.map(n=>1-(day.gr.get(n)||49)/49)),st=mean(t.map(n=>byN.get(n)?.f?.stability||0));return{rs,pa,gr,st}}
for(const day of days){if(day.date<'2021-01-01')continue;const pool=v171Pool(day),tf=comb(pool,6).map(t=>({t,...v171TicketFeatures(day,t)})),ph=day.date<='2022-12-31'?'select':day.date<='2024-12-31'?'mid':'late';for(const q of V171_CFG){const ordered=tf.map(x=>({t:x.t,score:q.a*x.rs+q.b*x.pa+q.c*x.gr+q.d*x.st})).sort((x,y)=>y.score-x.score||x.t.join(',').localeCompare(y.t.join(',')));for(const e of V171_BUDGETS){const top=ordered.slice(0,V171_K[e]),best=Math.max(...top.map(x=>x.t.filter(n=>day.winning.includes(n)).length)),z=V171_STATS[q.id][ph][e];z.n++;z.sumBest+=best;if(best>=4)z.h4++;if(best>=5)z.h5++;if(best===6){z.h6++;z.fullEvents.push({date:day.date,route:day.graphAdv<=V171_THRESHOLD?'FRONTIER_RANK9':'STRUCTURAL_V132',pool,winning:day.winning,winningRank:ordered.findIndex(x=>x.t.slice().sort((a,b)=>a-b).join(',')===day.winning.slice().sort((a,b)=>a-b).join(','))+1})}}}}
function v171SelScore(x){let z=0;for(const e of [1,2,3,5,10]){const s=x.select[e];z+=s.h6*1e9+s.h5*1e6+s.h4*1e3+s.sumBest/Math.max(1,s.n)}return z}const V171_LEAD=[...Object.values(V171_STATS)].sort((a,b)=>v171SelScore(b)-v171SelScore(a)||a.config.id.localeCompare(b.config.id)).slice(0,12),V171_SUM={leaders:V171_LEAD.length,bothEraFullByBudget:{}};for(const e of V171_BUDGETS)V171_SUM.bothEraFullByBudget[e]=V171_LEAD.filter(x=>x.mid[e].h6>0&&x.late[e].h6>0).length;
const V171_OUTOBJ={generatedAt:new Date().toISOString(),version:'v171',gameId:'bonoloto',family:'V162_NATIVE_WITHIN_POOL_TICKET_RANKER',methodology:'Reconstructs the exact pre-draw v162 threshold40 pool route. Ticket-ranking formulas use only each draw pre-draw c12 rank score, pair-affinity feature, graph-rank quality and stability. Formulas are selected solely on 2021-2022, then frozen before opening 2023-2024 and 2025-latest. The 8-number pool is unchanged. Goal: test whether compressed 1/2/3/5/10 EUR portfolios can retain v162 full hits without using post-2022 results for ticket-order selection.',threshold:V171_THRESHOLD,candidateConfigs:V171_CFG.length,selection:'2021-01-01..2022-12-31',validation:{mid:'2023-2024',late:'2025-latest'},budgetsEUR:V171_BUDGETS,leaders:V171_LEAD,summary:V171_SUM,baselineConditionalCoverage:Object.fromEntries(V171_BUDGETS.map(e=>[e,V171_K[e]/28])),realMoneyPass:false,realStakeEUR:0,decision:'EXPLORATORY_ARCHITECTURE_POSTHOC_REMAINS_REQUIRES_PROSPECTIVE_COMPRESSED_FREEZE'};fs.writeFileSync(V171_OUT,JSON.stringify(V171_OUTOBJ,null,2)+'\\n');console.log(JSON.stringify(V171_SUM,null,2));
`;
s=s.replace(marker,inject+'\n'+marker);
const tmp='/tmp/meta-pleno-v171-native-ticket-ranker.mjs';fs.writeFileSync(tmp,s);await import(pathToFileURL(tmp).href);

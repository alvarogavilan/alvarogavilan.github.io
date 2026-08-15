import fs from 'node:fs';
const DIR='loterias-ai/data/archive/bonoloto', OUT='loterias-ai/data/research/meta-pleno-v95-bonoloto-bayesian-set-process-budget8.json';
const files=fs.readdirSync(DIR).filter(f=>/^\d{4}\.json$/.test(f)).sort(); let rows=[];
for(const f of files){const z=JSON.parse(fs.readFileSync(`${DIR}/${f}`,'utf8')); rows.push(...(z.records||[]));}
rows=rows.map(r=>({date:r.drawDate,nums:(r.result?.mainNumbers||r.result?.numbers||r.mainNumbers||[]).map(Number).sort((a,b)=>a-b)})).filter(r=>r.date&&r.nums.length===6).sort((a,b)=>a.date.localeCompare(b.date));
const split={sel0:'2020-01-01',sel1:'2022-12-31',mid0:'2023-01-01',mid1:'2024-12-31',late0:'2025-01-01'};
function shape(ns){return {sum:ns.reduce((a,b)=>a+b,0),odd:ns.filter(x=>x%2).length,low:ns.filter(x=>x<=24).length,span:ns[5]-ns[0]};}
function dist(a,b){return Math.abs(a.sum-b.sum)/30+Math.abs(a.odd-b.odd)+Math.abs(a.low-b.low)+Math.abs(a.span-b.span)/10;}
function predict(i,cfg){const hist=rows.slice(Math.max(0,i-cfg.window),i); const s=shape(rows[i-1].nums); const neigh=hist.slice(0,-1).map((r,j)=>({j,d:dist(shape(r.nums),s)})).sort((a,b)=>a.d-b.d).slice(0,cfg.k);
 const alpha=Array(50).fill(cfg.alpha), beta=Array(50).fill(cfg.beta);
 for(const n of neigh){const succ=hist[n.j+1]; if(!succ)continue; const w=Math.exp(-cfg.lambda*n.d); for(let x=1;x<=49;x++){if(succ.nums.includes(x))alpha[x]+=w; else beta[x]+=w;}}
 return Array.from({length:49},(_,j)=>j+1).sort((a,b)=>(alpha[b]/(alpha[b]+beta[b]))-(alpha[a]/(alpha[a]+beta[a]))||a-b).slice(0,8).sort((a,b)=>a-b);
}
function hits(pool,nums){let h=0;for(const n of nums)if(pool.includes(n))h++;return h;}
const cfgs=[];for(const window of [120,240,480,720])for(const k of [5,10,20,40])for(const alpha of [0.25,0.5,1,2])for(const beta of [3,6,12])for(const lambda of [0.25,0.5,1])cfgs.push({window,k,alpha,beta,lambda});
function evalCfg(cfg,a,b){let full=0,h5=0,score=0,events=[];for(let i=1;i<rows.length;i++){const d=rows[i].date;if(d<a||d>b)continue;const p=predict(i,cfg),h=hits(p,rows[i].nums);score+=Math.pow(h,3);if(h===6){full++;events.push({date:d,pool:p,nums:rows[i].nums})}if(h>=5)h5++;}return{full,h5,score,events};}
const ranked=cfgs.map((cfg,id)=>({id,cfg,sel:evalCfg(cfg,split.sel0,split.sel1)})).sort((a,b)=>b.sel.full-a.sel.full||b.sel.h5-a.sel.h5||b.sel.score-a.sel.score||a.id-b.id);const frozen=ranked.slice(0,30).map(x=>({...x,mid:evalCfg(x.cfg,split.mid0,split.mid1),late:evalCfg(x.cfg,split.late0,'9999-12-31')}));
const out={generatedAt:new Date().toISOString(),engine:'MetaPleno-v95-bonoloto-bayesian-set-process-budget8',method:'Hierarchical beta-binomial successor mixture conditioned on whole-draw shape; hyperparameters selected only on 2020-2022.',budget:{poolSize:8,combinations:28,theoreticalCostEUR:14,maxEUR:15,realStakeEUR:0},configurations:cfgs.length,frozen:30,summary:{midFullModels:frozen.filter(x=>x.mid.full>0).length,lateFullModels:frozen.filter(x=>x.late.full>0).length,repeatFullModels:frozen.filter(x=>x.mid.full>0&&x.late.full>0).length,repeat5PlusModels:frozen.filter(x=>x.mid.h5>0&&x.late.h5>0).length},leaders:frozen.slice(0,10),realMoneyPass:false};fs.mkdirSync('loterias-ai/data/research',{recursive:true});fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify({configurations:out.configurations,...out.summary}));
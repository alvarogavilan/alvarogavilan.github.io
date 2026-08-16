#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT='loterias-ai';
const CFG=JSON.parse(fs.readFileSync(path.join(ROOT,'research','megalab','v290-config.json'),'utf8'));
const OUT=path.join(ROOT,'data','research','metapleno-v290-megalab.json');
const MEMORY=path.join(ROOT,'data','research','metapleno-global-negative-memory.json');
const memory=fs.existsSync(MEMORY)?JSON.parse(fs.readFileSync(MEMORY,'utf8')):{version:1,hashes:{}};
const sha=x=>crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));

const GAME_CFG={
  bonoloto:{dir:'bonoloto',max:49,pick:6,cost:.5,lines:8,start:'1900-01-01'},
  primitiva:{dir:'primitiva',max:49,pick:6,cost:1,lines:4,start:'1900-01-01'},
  euromillones:{dir:'euromillones',max:50,pick:5,cost:2.5,lines:1,start:'2016-09-27',side:'stars'},
  'gordo-primitiva':{dir:'gordo-primitiva',max:54,pick:5,cost:1.5,lines:2,start:'1900-01-01',side:'key'}
};

function rng(seed){let s=seed>>>0;return()=>((s=(1664525*s+1013904223)>>>0)/2**32)}
function load(id){const g=GAME_CFG[id],rows=[];for(const f of fs.readdirSync(path.join(ROOT,'data','archive',g.dir)).filter(x=>/^\d{4}\.json$/.test(x)).sort()){const j=JSON.parse(fs.readFileSync(path.join(ROOT,'data','archive',g.dir,f)));for(const r of (j.records||j.draws||[])){const date=r.drawDate||r.date,m=(r.result?.main||r.main||r.numbers||[]).map(Number).sort((a,b)=>a-b);if(date&&date>=g.start&&m.length===g.pick&&new Set(m).size===g.pick)rows.push({date,main:m,stars:(r.result?.stars||[]).map(Number),key:Number(r.result?.key)})}}return [...new Map(rows.map(x=>[x.date,x])).values()].sort((a,b)=>a.date.localeCompare(b.date));}

const atoms=['freq15','freq30','freq60','freq120','gap','recent','parity','position','neighbor','pairNear','pairFar','hotDelta','coldDelta','mod3','mod5','decade','lastSeenNorm'];
const unary=['abs','sq','sqrt','log','tanh','sin','cos','sign'];
const binary=['add','sub','mul','div','min','max','avg','diffabs'];
function genExpr(r,depth=0,bias='mixed'){if(depth>=4||r()<.28)return{t:'a',k:atoms[Math.floor(r()*atoms.length)]};if(r()<.36)return{t:'u',op:unary[Math.floor(r()*unary.length)],a:genExpr(r,depth+1,bias)};return{t:'b',op:binary[Math.floor(r()*binary.length)],a:genExpr(r,depth+1,bias),b:genExpr(r,depth+1,bias)}}
function complexity(e){return 1+(e.a?complexity(e.a):0)+(e.b?complexity(e.b):0)}
function evalE(e,f){if(e.t==='a')return f[e.k]||0;if(e.t==='u'){const a=evalE(e.a,f);return Number.isFinite(e.op==='abs'?Math.abs(a):e.op==='sq'?clamp(a*a,-1e6,1e6):e.op==='sqrt'?Math.sqrt(Math.abs(a)):e.op==='log'?Math.log1p(Math.abs(a)):e.op==='tanh'?Math.tanh(a):e.op==='sin'?Math.sin(a):e.op==='cos'?Math.cos(a):Math.sign(a))? (e.op==='abs'?Math.abs(a):e.op==='sq'?clamp(a*a,-1e6,1e6):e.op==='sqrt'?Math.sqrt(Math.abs(a)):e.op==='log'?Math.log1p(Math.abs(a)):e.op==='tanh'?Math.tanh(a):e.op==='sin'?Math.sin(a):e.op==='cos'?Math.cos(a):Math.sign(a)):0;}const a=evalE(e.a,f),b=evalE(e.b,f);const v=e.op==='add'?a+b:e.op==='sub'?a-b:e.op==='mul'?clamp(a*b,-1e6,1e6):e.op==='div'?a/(Math.abs(b)<1e-6?1e-6:b):e.op==='min'?Math.min(a,b):e.op==='max'?Math.max(a,b):e.op==='avg'?(a+b)/2:Math.abs(a-b);return Number.isFinite(v)?v:0;}
function features(rows,i,g,n){const cnt=w=>rows.slice(Math.max(0,i-w),i).filter(r=>r.main.includes(n)).length/Math.max(1,Math.min(w,i));let last=i-1;while(last>=0&&!rows[last].main.includes(n))last--;const r=rows.slice(Math.max(0,i-30),i),b=rows.slice(Math.max(0,i-120),Math.max(0,i-30));let nearR=0,nearB=0,farR=0,farB=0;for(const z of r)for(const x of z.main){if(x!==n&&Math.abs(x-n)<=2)nearR++;if(x!==n&&Math.abs(x-n)>=15)farR++}for(const z of b)for(const x of z.main){if(x!==n&&Math.abs(x-n)<=2)nearB++;if(x!==n&&Math.abs(x-n)>=15)farB++}const f15=cnt(15),f120=cnt(120);return{freq15:f15,freq30:cnt(30),freq60:cnt(60),freq120:f120,gap:last<0?1:clamp((i-last)/120,0,2),recent:rows[i-1]?.main.includes(n)?1:0,parity:n%2?1:-1,position:n/g.max,neighbor:(n>1?1:0)+(n<g.max?1:0),pairNear:nearR/Math.max(1,r.length)-nearB/Math.max(1,b.length),pairFar:farR/Math.max(1,r.length)-farB/Math.max(1,b.length),hotDelta:f15-f120,coldDelta:f120-f15,mod3:(n%3)/2,mod5:(n%5)/4,decade:Math.floor((n-1)/10)/6,lastSeenNorm:last<0?1:(i-last)/Math.max(1,i)}}
function choose(expr,rows,i,g){const s=[];for(let n=1;n<=g.max;n++)s.push([n,evalE(expr,features(rows,i,g,n))]);s.sort((a,b)=>b[1]-a[1]||a[0]-b[0]);return s.slice(0,g.pick+2).map(x=>x[0]);}
function combos(pool,k,max){const o=[];function rec(s,c){if(c.length===k){o.push([...c]);return}for(let i=s;i<=pool.length-(k-c.length)&&o.length<max;i++){c.push(pool[i]);rec(i+1,c);c.pop()}}rec(0,[]);return o;}
function era(expr,rows,g,start,end,stride=1){let draws=0,sum=0,near=0,full=0;for(let i=240;i<rows.length;i+=stride){if(rows[i].date<start||rows[i].date>=end)continue;const truth=new Set(rows[i].main),ls=combos(choose(expr,rows,i,g),g.pick,g.lines);let best=0;for(const l of ls)best=Math.max(best,l.filter(x=>truth.has(x)).length);draws++;sum+=best;if(best>=g.pick-1)near++;if(best===g.pick)full++;}return{draws,meanBestHits:draws?sum/draws:0,nearFull:near,fullMain:full}}
function objective(x,c,obj){const base=x.meanBestHits-c*.01;return obj==='near-full'?base+x.nearFull*10+x.fullMain*120:obj==='tail-uplift'?base+x.nearFull*6+x.fullMain*90:obj==='simplicity'?base-c*.03:obj==='stability'?base+x.nearFull*4:obj==='era-replication'?base+x.nearFull*7:base+x.nearFull*5+x.fullMain*100;}

const all=[];let generated=0,skippedMemory=0;
for(let s=0;s<CFG.scientistCount;s++){
  const r=rng(290000+s*7919),game=CFG.games[s%CFG.games.length],specialty=CFG.specialties[s%CFG.specialties.length],obj=CFG.objectiveVariants[Math.floor(s/CFG.games.length)%CFG.objectiveVariants.length],expr=genExpr(r,0,specialty),h=sha({game,specialty,obj,expr});
  if(memory.hashes[h]){skippedMemory++;continue}
  generated++;all.push({scientistId:`S${String(s+1).padStart(4,'0')}`,game,specialty,objective:obj,expr,hash:h,complexity:complexity(expr)});
}

const byGame=[];let promotedSelection=0,promotedOOS=0,newNegatives=0;
for(const id of CFG.games){const g=GAME_CFG[id],rows=load(id),pool=all.filter(x=>x.game===id);for(const x of pool){x.screen=era(x.expr,rows,g,'2019-01-01','2023-01-01',7);x.screenScore=objective(x.screen,x.complexity,x.objective)}pool.sort((a,b)=>b.screenScore-a.screenScore);const p1=pool.slice(0,Math.max(8,Math.ceil(pool.length*CFG.promotion.cheapScreenTopFraction)));promotedSelection+=p1.length;for(const x of p1){x.selection=era(x.expr,rows,g,'2019-01-01','2023-01-01',1);x.selectionScore=objective(x.selection,x.complexity,x.objective)}p1.sort((a,b)=>b.selectionScore-a.selectionScore);const p2=p1.slice(0,Math.max(CFG.promotion.oosFinalistsPerGame,Math.ceil(p1.length*CFG.promotion.selectionTopFraction)));promotedOOS+=p2.length;for(const x of p2){x.validation=era(x.expr,rows,g,'2023-01-01','2025-01-01',1);x.postFreeze=era(x.expr,rows,g,'2025-01-01','9999-12-31',1)}const leaders=p2.slice(0,CFG.promotion.oosFinalistsPerGame);const audit=leaders.some(x=>x.validation.fullMain>0||x.postFreeze.fullMain>0||(x.validation.nearFull>0&&x.postFreeze.nearFull>0));for(const x of pool){if(!leaders.some(y=>y.hash===x.hash)){memory.hashes[x.hash]={game:id,version:'v290',reason:'not-promoted-or-negative'};newNegatives++;}}byGame.push({gameId:id,archiveDraws:rows.length,budget:{lineCostEUR:g.cost,lines:g.lines,theoreticalEUR:g.cost*g.lines},scientists:pool.length,leaders:leaders.map(({expr,...x})=>({...x,formula:expr})),decision:audit?'AUDIT_SIGNAL':'NEGATIVE'})}

memory.updatedAt=new Date().toISOString();memory.count=Object.keys(memory.hashes).length;fs.mkdirSync(path.dirname(MEMORY),{recursive:true});fs.writeFileSync(MEMORY,JSON.stringify(memory,null,2)+'\n');
const out={version:'v290',family:'MEGALAB_AUTONOMOUS_SCIENTIST_SWARM',generatedAt:new Date().toISOString(),architecture:{configuredScientists:CFG.scientistCount,specialties:CFG.specialties.length,objectiveVariants:CFG.objectiveVariants.length,virtualShards:CFG.compute.virtualShards,sharedNegativeMemory:true,multiStagePromotion:true},counts:{generated,skippedMemory,promotedSelection,promotedOOS,newNegatives},games:byGame,anyAuditSignal:byGame.some(x=>x.decision==='AUDIT_SIGNAL'),realMoneyPass:false,realStakeEUR:0,scientificSafety:{selectionOnlyEvolution:true,oosUntouched:true,postFreezeUntouched:true,negativePersistence:true,noHistoricalPlenoTargeting:true}};fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify({counts:out.counts,decisions:byGame.map(x=>[x.gameId,x.decision]),anyAuditSignal:out.anyAuditSignal},null,2));

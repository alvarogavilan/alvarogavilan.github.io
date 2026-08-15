import fs from 'node:fs';

const GAME=process.env.GAME||'primitiva',SHARD=Number(process.env.SHARD||0),CANDIDATES=Math.max(100,Number(process.env.CANDIDATES||50000));
const cfgs={
  primitiva:{dir:'primitiva',max:49,k:6,extra:[['reintegro',10,1]]},
  bonoloto:{dir:'bonoloto',max:49,k:6,extra:[['reintegro',10,1]]},
  euromillones:{dir:'euromillones',max:50,k:5,extra:[['stars',12,2]]},
  eurodreams:{dir:'eurodreams',max:40,k:6,extra:[['dream',5,1]]},
  'gordo-primitiva':{dir:'gordo-primitiva',max:54,k:5,extra:[['key',10,1]]}
};
const cfg=cfgs[GAME];if(!cfg)throw new Error(`unsupported GAME ${GAME}`);
const dir=`loterias-ai/data/archive/${cfg.dir}`;let rows=[];for(const f of fs.readdirSync(dir).filter(x=>/^\d{4}\.json$/.test(x)).sort()){const j=JSON.parse(fs.readFileSync(`${dir}/${f}`,'utf8'));rows.push(...(j.records||[]))}
rows=rows.filter(r=>r.drawDate&&Array.isArray(r.result?.main)&&r.result.main.length===cfg.k).sort((a,b)=>rdate(a).localeCompare(rdate(b)));function rdate(r){return String(r.drawDate)}
if(rows.length<180)throw new Error(`${GAME} insufficient history ${rows.length}`);
const cut1=Math.floor(rows.length*.60),cut2=Math.floor(rows.length*.80),MINH=Math.min(120,Math.max(40,Math.floor(cut1*.15)));
const sample=(a,b,n)=>{const out=[];const lo=Math.max(MINH,a),len=Math.max(0,b-lo);if(!len)return out;for(let q=0;q<Math.min(n,len);q++)out.push(lo+Math.floor(q*(len-1)/Math.max(1,Math.min(n,len)-1)));return [...new Set(out)]};
const discovery=sample(MINH,cut1,24),validation=sample(cut1,cut2,28);
const mainSets=rows.map(r=>new Set(r.result.main.map(Number)));
const extras=rows.map(r=>Object.fromEntries(cfg.extra.map(([name])=>[name,Array.isArray(r.result?.[name])?r.result[name].map(Number):r.result?.[name]!=null?[Number(r.result[name])]:[]])));
const shortWs=[5,8,12,20,32,50,80,120],longWs=[100,160,250,400,700,1000];
function mix32(x){x|=0;x=Math.imul(x^(x>>>16),0x45d9f3b);x=Math.imul(x^(x>>>16),0x45d9f3b);return (x^(x>>>16))>>>0}function rnd(seed){let x=mix32(seed);return()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return(x>>>0)/4294967296}}
const cache=new Map();function featurePack(i,sw,lw){const key=`${i}|${sw}|${lw}`;if(cache.has(key))return cache.get(key);const f=Array.from({length:cfg.max+1},()=>[0,0,0,0,0,0]);const sc=new Uint16Array(cfg.max+1),lc=new Uint16Array(cfg.max+1),last=new Int32Array(cfg.max+1);last.fill(-9999);for(let j=Math.max(0,i-lw);j<i;j++)for(const n of rows[j].result.main){lc[n]++;last[n]=j;if(j>=i-sw)sc[n]++}const prev=mainSets[i-1]||new Set();for(let n=1;n<=cfg.max;n++){const sf=sc[n]/Math.max(1,Math.min(sw,i)),lf=lc[n]/Math.max(1,Math.min(lw,i)),gap=Math.min(200,i-last[n])/200;f[n]=[sf,lf,sf-lf,gap,prev.has(n)?1:0,n/cfg.max]}cache.set(key,f);return f}
function extraPredict(name,max,count,i,sw,lw,w){const score=[];for(let v=0;v<max;v++){let s=0,l=0,last=-9999;for(let j=Math.max(0,i-lw);j<i;j++){const a=extras[j][name]||[];if(a.includes(v)||a.includes(v+1)){l++;last=j;if(j>=i-sw)s++}}const x=[s/Math.max(1,Math.min(sw,i)),l/Math.max(1,Math.min(lw,i)),s/Math.max(1,Math.min(sw,i))-l/Math.max(1,Math.min(lw,i)),Math.min(200,i-last)/200,0,(v+1)/max];let z=0;for(let q=0;q<6;q++)z+=w[q]*x[q];score.push([z,v+1])}score.sort((a,b)=>b[0]-a[0]||a[1]-b[1]);return score.slice(0,count).map(x=>x[1]).sort((a,b)=>a-b)}
function spec(id){const R=rnd((SHARD+1)*0x9e3779b1+id*2654435761);const sw=shortWs[Math.floor(R()*shortWs.length)],lw=longWs[Math.floor(R()*longWs.length)],w=Array.from({length:6},()=>Math.round((R()*2-1)*1000)/1000);return{id:SHARD*CANDIDATES+id,shard:SHARD,sw,lw,w}}
function predict(c,i){const F=featurePack(i,c.sw,c.lw),sc=[];for(let n=1;n<=cfg.max;n++){let z=0;for(let q=0;q<6;q++)z+=c.w[q]*F[n][q];z+=((mix32(c.id^n)%1000)/1000-0.5)*0.0001;sc.push([z,n])}sc.sort((a,b)=>b[0]-a[0]||a[1]-b[1]);const main=sc.slice(0,cfg.k).map(x=>x[1]).sort((a,b)=>a-b),ex={};for(const [name,max,count] of cfg.extra)ex[name]=extraPredict(name,max,count,i,c.sw,c.lw,c.w);return{main,ex}}
function metrics(c,idxs){let sum=0,near=0,exactMain=0,exactFull=0;const fullSamples=[];for(const i of idxs){const p=predict(c,i),t=mainSets[i];let h=0;for(const n of p.main)if(t.has(n))h++;sum+=h;if(h>=cfg.k-1)near++;if(h===cfg.k){exactMain++;let ef=true;for(const [name,,count] of cfg.extra){const a=(p.ex[name]||[]).slice().sort((x,y)=>x-y),b=(extras[i][name]||[]).slice().sort((x,y)=>x-y);if(count&&a.join(',')!==b.join(','))ef=false}if(ef){exactFull++;if(fullSamples.length<10)fullSamples.push({date:rows[i].drawDate,prediction:p})}}}const meanHits=idxs.length?sum/idxs.length:0,score=exactFull*1e9+exactMain*1e7+near*1e4+meanHits;return{draws:idxs.length,meanHits,nearFull:near,exactMain,exactFull,score,fullSamples}}
const best=[];function keep(x){best.push(x);best.sort((a,b)=>b.discovery.score-a.discovery.score||b.discovery.meanHits-a.discovery.meanHits);if(best.length>150)best.length=150}
for(let id=0;id<CANDIDATES;id++){const c=spec(id),m=metrics(c,discovery);if(best.length<150||m.score>best.at(-1).discovery.score)keep({spec:c,discovery:m})}
for(const x of best)x.validation=metrics(x.spec,validation);best.sort((a,b)=>b.validation.score-a.validation.score||b.discovery.score-a.discovery.score);best.length=Math.min(50,best.length);
const out={generatedAt:new Date().toISOString(),gameId:GAME,shard:SHARD,candidatesTested:CANDIDATES,historyDraws:rows.length,splits:{discoveryEnd:cut1,validationEnd:cut2,holdoutStart:cut2,discoverySampleDraws:discovery.length,validationSampleDraws:validation.length},holdoutTouched:false,methodology:'mass-numeric-strategy-search-v1',features:['short-frequency','long-frequency','trend','gap','previous-draw','number-index'],top:best,truth:'This shard never reads holdout outcomes for candidate scoring. Candidate selection is discovery then validation only. Holdout is reserved for the separate aggregator after a global champion is frozen.'};
fs.mkdirSync('/tmp/loterias-ai-mass',{recursive:true});fs.writeFileSync(`/tmp/loterias-ai-mass/${GAME}-${SHARD}.json`,JSON.stringify(out));console.log(JSON.stringify({game:GAME,shard:SHARD,candidates:CANDIDATES,top:best.slice(0,3).map(x=>({id:x.spec.id,discovery:x.discovery,validation:x.validation}))},null,2));

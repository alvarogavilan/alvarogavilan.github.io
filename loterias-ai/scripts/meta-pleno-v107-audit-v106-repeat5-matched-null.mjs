import fs from 'node:fs';
const DIR='loterias-ai/data/archive/bonoloto',OUT='loterias-ai/data/research/meta-pleno-v107-audit-v106-repeat5-matched-null.json';
let rows=[];for(const f of fs.readdirSync(DIR).filter(x=>/^\d{4}\.json$/.test(x)).sort())rows.push(...(JSON.parse(fs.readFileSync(`${DIR}/${f}`,'utf8')).records||[]));
rows=rows.filter(r=>r.drawDate&&Array.isArray(r.result?.main)&&r.result.main.length===6&&new Set(r.result.main).size===6).sort((a,b)=>a.drawDate.localeCompare(b.drawDate));
const sets=rows.map(r=>[...r.result.main].sort((a,b)=>a-b)),truth=sets.map(x=>new Set(x));
function ids(a,b){const z=[];for(let i=1;i<rows.length;i++)if(rows[i].drawDate>=a&&rows[i].drawDate<=b)z.push(i);return z}
const sel=ids('2020-01-01','2022-12-31'),mid=ids('2023-01-01','2024-12-31'),late=ids('2025-01-01','9999-12-31');
const cfgs=[];for(const q of [.02,.05,.1,.25,.5,1,2])for(const r of [.5,1,2,4,8,16])for(const width of [1,1.5,2,3])cfgs.push({q,r,width});
function kpred(i,c){if(i<20)return null;const mus=[],vars=[];for(let p=0;p<6;p++){let m=sets[0][p],P=4;for(let t=1;t<i;t++){P+=c.q;const K=P/(P+c.r);m=m+K*(sets[t][p]-m);P=(1-K)*P}mus.push(m);vars.push(Math.max(.2,P+c.r))}const sc=[];for(let n=1;n<=49;n++){let s=0;for(let p=0;p<6;p++){const z=(n-mus[p])/(Math.sqrt(vars[p])*c.width);s+=Math.exp(-.5*z*z)}sc.push([n,s])}return sc.sort((a,b)=>b[1]-a[1]||a[0]-b[0]).slice(0,8).map(x=>x[0]).sort((a,b)=>a-b)}
function hits(pool,t){let h=0;for(const n of pool)if(t.has(n))h++;return h}
function ev(c,L){let full=0,h5=0,score=0;for(const i of L){const p=kpred(i,c);if(!p)continue;const h=hits(p,truth[i]);score+=h*h*h;if(h===6)full++;if(h>=5)h5++}return{full,h5,score}}
const ranked=cfgs.map((c,id)=>({id,c,sel:ev(c,sel)})).sort((a,b)=>b.sel.full-a.sel.full||b.sel.h5-a.sel.h5||b.sel.score-a.sel.score||a.id-b.id);
const frozen=ranked.slice(0,24);
function poolsFor(c,L){return L.map(i=>kpred(i,c))}
const midPools=frozen.map(x=>poolsFor(x.c,mid)),latePools=frozen.map(x=>poolsFor(x.c,late));
function shiftMask(allPools,L,shift){let mask=0n;for(let m=0;m<allPools.length;m++){let ok=false;for(let j=0;j<L.length;j++){const t=truth[L[(j+shift)%L.length]];if(hits(allPools[m][j],t)>=5){ok=true;break}}if(ok)mask|=(1n<<BigInt(m))}return mask}
function popcnt(x){let n=0;while(x){x&=x-1n;n++}return n}
const midMasks=Array.from({length:mid.length},(_,s)=>shiftMask(midPools,mid,s));
const lateMasks=Array.from({length:late.length},(_,s)=>shiftMask(latePools,late,s));
const observed=popcnt(midMasks[0]&lateMasks[0]);let ge=0,total=0,maxRepeat=0;
for(let a=0;a<midMasks.length;a++)for(let b=0;b<lateMasks.length;b++){if(a===0&&b===0)continue;const r=popcnt(midMasks[a]&lateMasks[b]);if(r>=observed)ge++;if(r>maxRepeat)maxRepeat=r;total++}
const p=(ge+1)/(total+1);
const repeatIds=[];for(let m=0;m<frozen.length;m++)if((midMasks[0]&(1n<<BigInt(m)))&&(lateMasks[0]&(1n<<BigInt(m))))repeatIds.push({rank:m,configId:frozen[m].id,config:frozen[m].c});
const out={generatedAt:new Date().toISOString(),engine:'MetaPleno-v107-audit-v106-repeat5-matched-null',sourceFamily:'v106 Kalman Order Budget8',method:'All circular-shift pairs across mid and late truth series; frozen pools/models preserved. Bitmask optimization evaluates repeat-5+ model counts exactly.',midDraws:mid.length,lateDraws:late.length,frozenModels:frozen.length,observed:{repeat5PlusModels:observed,repeatIds},null:{comparisons:total,geObserved:ge,pValue:p,maxRepeat5PlusModels:maxRepeat},decision:p<0.05?'SIGNAL_REQUIRES_MULTIPLE_TESTING_CORRECTION':'NOT_SIGNIFICANT_UNDER_MATCHED_NULL',budget:{poolSize:8,combinations:28,theoreticalCostEUR:14,maxEUR:15,realStakeEUR:0},realMoneyPass:false};
fs.mkdirSync('loterias-ai/data/research',{recursive:true});fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify(out));

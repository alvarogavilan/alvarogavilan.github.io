import fs from 'node:fs';

const TARGETS = new Map([
  ['2024-01-11', 22],
  ['2026-07-25', 38],
]);
const MAX = 49;
const MIN_HISTORY = 250;
const KEYS = ['longFrequency','shortMomentum','gap','stability','pairAffinity','entropy','meanReversion'];
const C46_WEIGHTS = {
  longFrequency:.2436021948629059,
  shortMomentum:.23052522678219245,
  gap:.1375835356389871,
  stability:.25253420687920874,
  pairAffinity:.07113006157102063,
  entropy:.07939597515272907,
  meanReversion:.24348168524738867,
};
const FAMILIES = {
  c46: C46_WEIGHTS,
  long_frequency: {longFrequency:1},
  short_momentum: {shortMomentum:1},
  overdue_gap: {gap:1},
  stability: {stability:1},
  pair_affinity: {pairAffinity:1},
  entropy: {entropy:1},
  mean_reversion: {meanReversion:1},
  trend_blend: {longFrequency:.45,shortMomentum:.55},
  reversion_blend: {gap:.55,meanReversion:.45},
  structural_blend: {stability:.65,pairAffinity:.35},
  balanced_orthogonal: {longFrequency:.2,shortMomentum:.2,gap:.2,stability:.2,pairAffinity:.2},
};

const mean=a=>a.length?a.reduce((s,x)=>s+x,0)/a.length:0;
const sd=a=>{if(a.length<2)return 0;const m=mean(a);return Math.sqrt(a.reduce((s,x)=>s+(x-m)**2,0)/(a.length-1))};
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const unit=z=>.5+.5*Math.tanh(z/2);
const z=(c,n)=>{const v=c.slice(1),m=mean(v),s=sd(v);return s?(c[n]-m)/s:0};

function features(st,i){
  const gaps=Array(MAX+1).fill(0);let gm=1;
  for(let n=1;n<=MAX;n++){gaps[n]=st.last[n]<0?i:i-1-st.last[n];gm=Math.max(gm,gaps[n])}
  const total=st.all.slice(1).reduce((a,b)=>a+b,0)||1,o=[];
  for(let n=1;n<=MAX;n++){
    const za=z(st.all,n),z20=z(st.c20,n),z50=z(st.c50,n),z100=z(st.c100,n);
    const lf=unit(za),sm=clamp(.6*unit(z20)+.4*unit(z50)),gap=clamp(gaps[n]/gm);
    const stab=clamp(1-(Math.abs(z20-z50)+Math.abs(z50-z100)+Math.abs(z100-za))/8);
    let pa=0;
    if(st.all[n])for(let x=1;x<=MAX;x++)if(x!==n)pa=Math.max(pa,st.pairs[n][x]/st.all[n]);
    const p=st.all[n]/total,ent=clamp((p>0?-p*Math.log(p):0)*8),mr=clamp(1-Math.abs(unit(za)-.5)*2);
    o.push({number:n,f:{longFrequency:lf,shortMomentum:sm,gap,stability:stab,pairAffinity:clamp(pa),entropy:ent,meanReversion:mr}});
  }
  return o;
}
function rank(fr,weights){
  const den=Object.values(weights).reduce((a,b)=>a+b,0)||1;
  return fr.map(x=>({number:x.number,score:Object.entries(weights).reduce((s,[k,w])=>s+(x.f[k]||0)*w,0)/den,f:x.f}))
    .sort((a,b)=>b.score-a.score||a.number-b.number);
}
function add(st,ns,i){
  st.q20.push(ns);st.q50.push(ns);st.q100.push(ns);
  for(const n of ns){st.all[n]++;st.c20[n]++;st.c50[n]++;st.c100[n]++;st.last[n]=i;for(const x of ns)if(x!==n)st.pairs[n][x]++}
  for(const[q,c,l]of[[st.q20,st.c20,20],[st.q50,st.c50,50],[st.q100,st.c100,100]])if(q.length>l)for(const n of q.shift())c[n]--;
}

let rows=[];
for(const f of fs.readdirSync('loterias-ai/data/archive/primitiva').filter(f=>/^\d{4}\.json$/.test(f)).sort()){
  rows.push(...(JSON.parse(fs.readFileSync(`loterias-ai/data/archive/primitiva/${f}`,'utf8')).records||[]));
}
rows=[...new Map(rows.map(r=>[r.drawId,r])).values()]
  .filter(r=>r.result?.main?.length===6)
  .sort((a,b)=>a.drawDate.localeCompare(b.drawDate));

const st={all:Array(50).fill(0),c20:Array(50).fill(0),c50:Array(50).fill(0),c100:Array(50).fill(0),last:Array(50).fill(-1),pairs:Array.from({length:50},()=>Array(50).fill(0)),q20:[],q50:[],q100:[]};
const events=[];
for(let i=0;i<rows.length;i++){
  const r=rows[i],truth=r.result.main.map(Number);
  if(i>=MIN_HISTORY&&TARGETS.has(r.drawDate)){
    const missing=TARGETS.get(r.drawDate),T=new Set(truth),fr=features(st,i),families={};
    for(const [name,weights] of Object.entries(FAMILIES)){
      const ranked=rank(fr,weights),idx=ranked.findIndex(x=>x.number===missing),rr=idx+1;
      families[name]={
        missingRank:rr,
        missingScore:idx>=0?ranked[idx].score:null,
        inTop8:rr<=8,
        inTop12:rr<=12,
        inTop16:rr<=16,
        top8:ranked.slice(0,8).map(x=>x.number),
        top8Hits:ranked.slice(0,8).filter(x=>T.has(x.number)).length,
      };
    }
    const rescuers=Object.entries(families).filter(([name])=>name!=='c46').map(([name,x])=>({name,...x}));
    events.push({
      date:r.drawDate,truth,missingNumber:missing,c46MissingRank:families.c46.missingRank,
      rescuedTop8:rescuers.filter(x=>x.inTop8).map(x=>x.name),
      rescuedTop12:rescuers.filter(x=>x.inTop12).map(x=>x.name),
      rescuedTop16:rescuers.filter(x=>x.inTop16).map(x=>x.name),
      bestRescuers:rescuers.sort((a,b)=>a.missingRank-b.missingRank||b.top8Hits-a.top8Hits).slice(0,5).map(x=>({name:x.name,missingRank:x.missingRank,top8Hits:x.top8Hits})),
      families,
    });
  }
  add(st,truth,i);
}

const out={
  generatedAt:new Date().toISOString(),version:'v186',gameId:'primitiva',family:'CROSS_FAMILY_RESCUE',
  methodology:'Leakage-safe pre-draw reconstruction. Freeze the v185 feature state and compare c46 with orthogonal single-feature and small composite families. No fitting to the two target draws; rescue means the known sixth winner was independently ranked inside top-8/top-12/top-16.',
  targetDates:[...TARGETS.keys()],familyCount:Object.keys(FAMILIES).length,events,
  conclusion:{
    bothRescuedTop8:events.length===2&&events.every(e=>e.rescuedTop8.length>0),
    bothRescuedTop12:events.length===2&&events.every(e=>e.rescuedTop12.length>0),
    bothRescuedTop16:events.length===2&&events.every(e=>e.rescuedTop16.length>0),
  },
  realMoneyPass:false,realStakeEUR:0,
};
fs.writeFileSync('loterias-ai/data/research/meta-pleno-v186-primitiva-cross-family-rescue.json',JSON.stringify(out,null,2)+'\n');
console.log('V186_RESULT '+JSON.stringify({familyCount:out.familyCount,events:events.map(e=>({date:e.date,missing:e.missingNumber,c46Rank:e.c46MissingRank,top8:e.rescuedTop8,top12:e.rescuedTop12,top16:e.rescuedTop16,best:e.bestRescuers})),conclusion:out.conclusion}));
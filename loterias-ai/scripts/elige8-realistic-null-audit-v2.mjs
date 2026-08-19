import fs from 'node:fs';
import path from 'node:path';

const ROOT='loterias-ai/data/archive';
const OUT='loterias-ai/data/research/elige8-realistic-null-audit-v2.json';
const SIGNS=['1','X','2'];

function load(dir){
  const rows=[];
  const p=path.join(ROOT,dir);
  for(const f of fs.readdirSync(p).filter(x=>/^\d{4}\.json$/.test(x)).sort()){
    const z=JSON.parse(fs.readFileSync(path.join(p,f),'utf8'));
    rows.push(...(z.records||[]));
  }
  const seen=new Set();
  return rows.filter(r=>{
    const k=r.drawId||`${r.drawDate}|${JSON.stringify(r.result||{})}`;
    if(!r.drawDate||seen.has(k))return false;
    seen.add(k);return true;
  }).sort((a,b)=>String(a.drawDate).localeCompare(String(b.drawDate)));
}
const quin=load('quiniela'),eli=load('elige8');
const norm=a=>{const s=a.reduce((x,y)=>x+y,0);return a.map(x=>x/s)};
function buildState(endDate){
  const team=new Map(),global={h:[1,1,1],a:[1,1,1]};
  for(const r of quin){
    if(r.drawDate>=endDate)break;
    for(const m of r.result?.matches||[]){
      const si=SIGNS.indexOf(m.sign);if(si<0)continue;
      if(!team.has(m.home))team.set(m.home,{home:[1,1,1],away:[1,1,1]});
      if(!team.has(m.away))team.set(m.away,{home:[1,1,1],away:[1,1,1]});
      team.get(m.home).home[si]++;team.get(m.away).away[si]++;global.h[si]++;global.a[si]++;
    }
  }
  return{team,global};
}
function signPred(st,m){
  const h=st.team.get(m.home)?.home||st.global.h;
  const a=st.team.get(m.away)?.away||st.global.a;
  const ph=norm(h),pa=norm(a),p=ph.map((x,j)=>(x+pa[j])/2);
  let k=0;for(let j=1;j<3;j++)if(p[j]>p[k])k=j;
  return{sign:SIGNS[k],confidence:p[k]};
}
function prediction(r){
  const st=buildState(r.drawDate),ms=r.result?.selectableMatches||[];
  return ms.map((m,j)=>({...signPred(st,m),position:j+1})).sort((a,b)=>b.confidence-a.confidence||a.position-b.position).slice(0,8);
}
function truthVector(r){return (r.result?.selectableMatches||[]).map(m=>m.sign)}
function exact(pred,truth){return pred.every(x=>truth[x.position-1]===x.sign)}

const eligible=eli.map((r,i)=>[r,i]).filter(([r,i])=>i>=Math.min(200,Math.max(30,Math.floor(eli.length*0.1)))&&r.economics&&Number(r.economics.ticketCost)>0).map(x=>x[1]);
const n=eligible.length,a=Math.floor(n*0.5),b=Math.floor(n*0.75);
const idxVal=eligible.slice(a,b),idxHold=eligible.slice(b);

function pack(indices){return indices.map(i=>({date:eli[i].drawDate,pred:prediction(eli[i]),truth:truthVector(eli[i])}))}
const val=pack(idxVal),hold=pack(idxHold),post=[...val,...hold];
function obs(arr){return arr.filter(x=>exact(x.pred,x.truth)).length}
function circular(arr){
  const observed=obs(arr),dist=[];
  for(let s=0;s<arr.length;s++){
    let k=0;
    for(let i=0;i<arr.length;i++)if(exact(arr[i].pred,arr[(i+s)%arr.length].truth))k++;
    dist.push({shift:s,exact8:k});
  }
  const extreme=dist.filter(x=>x.exact8>=observed).length;
  return{observed,shifts:dist.length,extreme,pValue:extreme/dist.length,maxNullExact8:Math.max(...dist.filter(x=>x.shift!==0).map(x=>x.exact8)),meanNullExact8:dist.filter(x=>x.shift!==0).reduce((s,x)=>s+x.exact8,0)/Math.max(1,dist.length-1),distributionCounts:Object.fromEntries([...new Set(dist.map(x=>x.exact8))].sort((x,y)=>x-y).map(k=>[k,dist.filter(x=>x.exact8===k).length]))};
}

function rng(seed=0x8e2026){let x=seed>>>0;return()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return(x>>>0)/4294967296}}
function permutationNull(arr,runs=20000){
  const R=rng(),observed=obs(arr),base=arr.map((_,i)=>i);let extreme=0,max=0,sum=0;const hist={};
  for(let z=0;z<runs;z++){
    const perm=[...base];for(let i=perm.length-1;i>0;i--){const j=Math.floor(R()*(i+1));[perm[i],perm[j]]=[perm[j],perm[i]]}
    let k=0;for(let i=0;i<arr.length;i++)if(exact(arr[i].pred,arr[perm[i]].truth))k++;
    if(k>=observed)extreme++;max=Math.max(max,k);sum+=k;hist[k]=(hist[k]||0)+1;
  }
  return{observed,runs,extreme,empiricalPUpper:(extreme+1)/(runs+1),maxNullExact8:max,meanNullExact8:sum/runs,distributionCounts:hist};
}

function favoriteBaseline(arr){
  // Global causal base-rate baseline: at each target date use only prior Quiniela sign frequencies,
  // predict the globally most frequent sign for all 14 fixtures, then select first 8 positions deterministically.
  let exact8=0,sumHits=0;
  for(const x of arr){
    const prior=quin.filter(q=>q.drawDate<x.date);let c={1:1,X:1,2:1};
    for(const q of prior)for(const m of q.result?.matches||[])if(SIGNS.includes(m.sign))c[m.sign]++;
    const s=SIGNS.sort((u,v)=>c[v]-c[u])[0];
    const picks=Array.from({length:8},(_,j)=>({position:j+1,sign:s}));
    const hits=picks.filter(p=>x.truth[p.position-1]===p.sign).length;sumHits+=hits;if(hits===8)exact8++;
  }
  return{exact8,meanHits:sumHits/arr.length};
}

const out={
  version:'elige8-realistic-null-audit-v2',generatedAt:new Date().toISOString(),
  purpose:'Re-test the Elige8 minimum-stake historical signal against nulls that preserve real football outcome imbalance and within-draw result structure; supersedes uniform 1/3 exact-null as the primary significance check.',
  samples:{validation:{draws:val.length,observedExact8:obs(val)},holdout:{draws:hold.length,observedExact8:obs(hold)},validationPlusHoldout:{draws:post.length,observedExact8:obs(post)}},
  nulls:{
    holdoutCircular:circular(hold),
    postFreezeCircular:circular(post),
    holdoutPermutation:permutationNull(hold,20000),
    postFreezePermutation:permutationNull(post,20000),
    globalCausalFavoriteBaseline:{holdout:favoriteBaseline(hold),validationPlusHoldout:favoriteBaseline(post)}
  },
  guards:{predictionsRecomputedFromStrictlyPriorQuinielaRows:true,targetOutcomeNeverUsedForPrediction:true,realOutcomeVectorsPreservedInCircularAndPermutationNulls:true,noRetuning:true,realMoney:false},
  decision:{
    primaryNull:'POST_FREEZE_PERMUTATION',
    signalSurvivesOnePercent:null,
    signalSurvivesBonferroni11:null,
    realMoneyPass:false
  }
};
out.decision.signalSurvivesOnePercent=out.nulls.postFreezePermutation.empiricalPUpper<0.01;
out.decision.signalSurvivesBonferroni11=Math.min(1,out.nulls.postFreezePermutation.empiricalPUpper*11)<0.01;
out.decision.interpretation=out.decision.signalSurvivesBonferroni11?'STRONG_SIGNAL_SURVIVES_REALISTIC_OUTCOME_NULL_REQUIRES_LIVE_PROSPECTIVE_REPLICATION':out.decision.signalSurvivesOnePercent?'PROMISING_SIGNAL_SURVIVES_REALISTIC_NULL_BUT_NOT_11_GAME_CORRECTION':'RETROSPECTIVE_SIGNAL_WEAKENS_UNDER_REALISTIC_OUTCOME_NULL';
fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({samples:out.samples,nulls:out.nulls,decision:out.decision},null,2));

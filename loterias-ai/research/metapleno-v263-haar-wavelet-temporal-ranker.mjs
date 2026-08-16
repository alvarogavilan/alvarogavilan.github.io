#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const ROOT='loterias-ai';
const ARCH=path.join(ROOT,'data','archive','bonoloto');
const OUT=path.join(ROOT,'data','research','metapleno-v263-haar-wavelet-temporal-ranker.json');
const REG=path.join(ROOT,'data','research','metapleno-research-registry.json');
const FAMILY='HAAR_WAVELET_TEMPORAL_RANKER';
const MAXN=49,POOL=8,COST=14;

function load(){
  const all=[];
  for(const f of fs.readdirSync(ARCH).filter(x=>/^\d{4}\.json$/.test(x)).sort()){
    const j=JSON.parse(fs.readFileSync(path.join(ARCH,f),'utf8'));
    for(const r of (j.records||j.draws||[])){
      const date=r.drawDate||r.date;
      const main=(r.result?.main||r.main||r.numbers||[]).map(Number).sort((a,b)=>a-b);
      if(date&&main.length===6&&new Set(main).size===6&&main.every(n=>n>=1&&n<=MAXN)) all.push({date,main});
    }
  }
  return [...new Map(all.map(x=>[x.date,x])).values()].sort((a,b)=>a.date.localeCompare(b.date));
}
function antiDuplicateGuard(){
  if(!fs.existsSync(REG)) return {registryPresent:false,matched:false};
  const raw=fs.readFileSync(REG,'utf8').toLowerCase();
  const aliases=['HAAR_WAVELET_TEMPORAL_RANKER','haar wavelet','wavelet temporal','wavelet ranker'];
  const matched=aliases.some(a=>raw.includes(a.toLowerCase()));
  if(matched) throw new Error(`anti-duplicate guard: family already represented (${FAMILY})`);
  return {registryPresent:true,matched:false,aliasesChecked:aliases};
}
function prefixCounts(rows){
  const p=Array.from({length:rows.length+1},()=>new Uint32Array(MAXN+1));
  for(let i=0;i<rows.length;i++){
    p[i+1].set(p[i]);
    for(const n of rows[i].main)p[i+1][n]++;
  }
  return p;
}
function count(p,n,lo,hi){return p[hi][n]-p[Math.max(0,lo)][n];}
function meanOccurrence(p,i,n,w){const lo=Math.max(0,i-w);return count(p,n,lo,i)/Math.max(1,i-lo);}
function haarScore(p,i,n,cfg){
  let s=0;
  for(let k=0;k<cfg.scales.length;k++){
    const w=cfg.scales[k];if(i<w)continue;const half=w/2;
    const recent=count(p,n,i-half,i),prior=count(p,n,i-w,i-half);
    s+=cfg.weights[k]*((recent-prior)/half);
  }
  return s+cfg.baseWeight*meanOccurrence(p,i,n,cfg.baseWindow);
}
function pool(p,i,cfg){
  return Array.from({length:MAXN},(_,k)=>k+1).sort((a,b)=>haarScore(p,i,b,cfg)-haarScore(p,i,a,cfg)||a-b).slice(0,POOL).sort((a,b)=>a-b);
}
function baselinePool(p,i,w=160){
  return Array.from({length:MAXN},(_,k)=>k+1).sort((a,b)=>meanOccurrence(p,i,b,w)-meanOccurrence(p,i,a,w)||a-b).slice(0,POOL).sort((a,b)=>a-b);
}
function hit(poolNums,truth){const s=new Set(truth);return poolNums.filter(n=>s.has(n)).length;}
function evaluate(rows,p,cfg,start,end){
  let draws=0,sum=0,bSum=0,h4=0,b4=0,h5=0,b5=0,h6=0,b6=0,wins=0,losses=0,ties=0;
  const events=[];
  for(let i=0;i<rows.length;i++){
    const d=rows[i].date;if(d<start||d>=end||i<cfg.minHistory)continue;
    const pred=pool(p,i,cfg),base=baselinePool(p,i),h=hit(pred,rows[i].main),bh=hit(base,rows[i].main);
    draws++;sum+=h;bSum+=bh;if(h>=4)h4++;if(bh>=4)b4++;if(h>=5)h5++;if(bh>=5)b5++;if(h===6)h6++;if(bh===6)b6++;
    if(h>bh)wins++;else if(h<bh)losses++;else ties++;
    if(h>=5)events.push({date:d,index:i,hits:h,pool:pred,truth:rows[i].main,baselineHits:bh,baselinePool:base});
  }
  return {draws,meanHits:draws?sum/draws:0,baselineMeanHits:draws?bSum/draws:0,deltaMeanHits:draws?(sum-bSum)/draws:0,hit4Plus:h4,baselineHit4Plus:b4,hit5Plus:h5,baselineHit5Plus:b5,full6:h6,baselineFull6:b6,pairwise:{wins,losses,ties},events};
}
function twoSidedSignP(w,l){
  const n=w+l;if(!n)return 1;const m=Math.min(w,l);let term=2**(-n),cdf=term;
  for(let k=0;k<m;k++){term*=((n-k)/(k+1));cdf+=term;}
  return Math.min(1,2*cdf);
}
function hardAudit(rows,p,cfg,validation,postFreeze){
  const dates=rows.map(r=>r.date),dupes=dates.length-new Set(dates).size;
  const allEvents=[...validation.events,...postFreeze.events];
  const exactEventRecheck=allEvents.every(e=>{
    const recomputed=pool(p,e.index,cfg);
    return JSON.stringify(recomputed)===JSON.stringify(e.pool)&&hit(recomputed,e.truth)===e.hits&&recomputed.length===POOL&&new Set(recomputed).size===POOL;
  });
  const preDrawCausalityCheck=allEvents.every(e=>e.index>=cfg.minHistory);
  const w=validation.pairwise.wins+postFreeze.pairwise.wins,l=validation.pairwise.losses+postFreeze.pairwise.losses;
  const signP=twoSidedSignP(w,l);
  const replicated5=validation.hit5Plus>0&&postFreeze.hit5Plus>0;
  const any6=validation.full6>0||postFreeze.full6>0;
  const statisticalAnomaly=signP<0.01&&validation.deltaMeanHits>0&&postFreeze.deltaMeanHits>0;
  const triggered=allEvents.length>0||any6||statisticalAnomaly;
  const integrityPass=dupes===0&&exactEventRecheck&&preDrawCausalityCheck;
  return {triggered,duplicateDrawDates:dupes,exactEventRecheck,preDrawCausalityCheck,pairwiseTwoSidedSignP:signP,replicated5PlusAcrossFrozenEras:replicated5,anyOOSFull6:any6,statisticalAnomaly,integrityPass,hardPass:triggered&&integrityPass&&(replicated5||any6||statisticalAnomaly)};
}

const guard=antiDuplicateGuard();
const rows=load(),p=prefixCounts(rows);
const cfgs=[];
for(const scales of [[16,32,64],[32,64,128],[16,64,256]])for(const weights of [[1,0.5,0.25],[1,1,0.5],[-1,-0.5,-0.25]])for(const baseWeight of [0.25,0.5])cfgs.push({scales,weights,baseWeight,baseWindow:160,minHistory:Math.max(...scales)});
let dev=cfgs.map(cfg=>({cfg,dev:evaluate(rows,p,cfg,'2019-01-01','2023-01-01')}));
dev.sort((a,b)=>b.dev.deltaMeanHits-a.dev.deltaMeanHits||b.dev.hit5Plus-a.dev.hit5Plus||b.dev.hit4Plus-a.dev.hit4Plus);
const frozen=dev.slice(0,4).map(x=>({...x,validation:evaluate(rows,p,x.cfg,'2023-01-01','2025-01-01'),postFreeze:evaluate(rows,p,x.cfg,'2025-01-01','9999-12-31')}));
const leader=frozen[0],audit=hardAudit(rows,p,leader.cfg,leader.validation,leader.postFreeze);
const positiveBoth=leader.validation.deltaMeanHits>0&&leader.postFreeze.deltaMeanHits>0;
const decision=audit.triggered?(audit.hardPass?'ANOMALY_UNRESOLVED':'AUDITED_NEGATIVE'):(positiveBoth?'WEAK_OOS_UPLIFT_NO_EXTREME':'NEGATIVE');
const out={version:'v263',engine:'Haar Wavelet Temporal Ranker',family:FAMILY,gameId:'bonoloto',generatedAt:new Date().toISOString(),archiveDraws:rows.length,antiDuplicateGuard:guard,candidatePool:{nominalConfigurations:cfgs.length,effectiveConfigurations:cfgs.length,frozenConfigurations:frozen.length,poolSize:POOL,combinations:28,theoreticalCostEUR:COST,budgetCapEUR:15},methodology:'Orthogonal multiscale Haar-style temporal contrasts over each number binary occurrence stream. Hyperparameters ranked only on 2019-2022; top four frozen before 2023 validation and 2025+ post-freeze evaluation. Every prediction is computed from prefix counts ending strictly before its target draw. Same-budget 160-draw frequency pool8 is the baseline.',leaders:frozen,hardAudit:audit,signal:{anyOOS5Plus:leader.validation.hit5Plus>0||leader.postFreeze.hit5Plus>0,anyOOSFull6:leader.validation.full6>0||leader.postFreeze.full6>0,statisticalAnomaly:audit.statisticalAnomaly,requiresAudit:audit.triggered},decision,realMoneyPass:false,realStakeEUR:0,note:'Research only. Negative or anomalous retrospective evidence never authorizes staking; real-money remains fail-closed.'};
fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({decision,validation:leader.validation,postFreeze:leader.postFreeze,hardAudit:audit,realMoneyPass:out.realMoneyPass,realStakeEUR:out.realStakeEUR},null,2));

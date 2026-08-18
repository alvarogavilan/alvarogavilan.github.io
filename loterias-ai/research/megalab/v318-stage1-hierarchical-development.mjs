#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';

const ROOT='loterias-ai';
const PREREG=`${ROOT}/data/research/metapleno-v318-preregister.json`;
const OUT=`${ROOT}/data/research/metapleno-v318-stage1-development.json`;
const rawPre=fs.readFileSync(PREREG,'utf8');
const pre=JSON.parse(rawPre);
if(pre.version!=='v318'||pre.family!=='HIERARCHICAL_6OF49_SHRINKAGE_AUDIT'||pre.status!=='PREREGISTERED_BEFORE_EXECUTION')throw new Error('v318 preregistration invalid');
if(pre.temporalProtocol?.developmentEnd!=='2018-12-31'||pre.temporalProtocol?.stage1MayReadDevelopmentOnly!==true)throw new Error('v318 temporal contract drift');
if(pre.guards?.futureInformationAllowed!==false||pre.guards?.targetTuningAllowed!==false||pre.guards?.realMoneyPass!==false)throw new Error('v318 safety guard drift');

const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
const choose=(n,k)=>{if(k<0||k>n)return 0;k=Math.min(k,n-k);let r=1;for(let i=1;i<=k;i++)r=r*(n-k+i)/i;return r;};
const randomFivePlus=(6*choose(43,3)+choose(43,2))/choose(49,8);
const randomFull=choose(43,2)/choose(49,8);

function loadDevelopment(game){
  const dir=`${ROOT}/data/archive/${game}`;
  const files=fs.readdirSync(dir).filter(f=>/^\d{4}\.json$/.test(f)&&Number(f.slice(0,4))<=2018).sort();
  let rows=[];
  for(const f of files){
    if(Number(f.slice(0,4))>2018)throw new Error(`v318 ${game} attempted post-development file ${f}`);
    const d=JSON.parse(fs.readFileSync(`${dir}/${f}`,'utf8'));
    rows.push(...(d.records||[]));
  }
  rows=[...new Map(rows.map(r=>[r.drawId||`${r.drawDate}-${JSON.stringify(r.result?.main)}`,r])).values()]
    .filter(r=>r.drawDate&&r.drawDate<='2018-12-31'&&Array.isArray(r.result?.main)&&r.result.main.length===6)
    .sort((a,b)=>a.drawDate.localeCompare(b.drawDate));
  if(rows.some(r=>r.drawDate>'2018-12-31'))throw new Error(`v318 ${game} development leakage`);
  return rows.map(r=>({date:r.drawDate,n:r.result.main.map(Number).sort((a,b)=>a-b)}));
}

function prefix(draws){
  const p=Array(draws.length+1);p[0]=new Int32Array(50);
  for(let i=0;i<draws.length;i++){
    const a=new Int32Array(p[i]);for(const n of draws[i].n)a[n]++;p[i+1]=a;
  }
  return p;
}
function upperBefore(draws,date){
  let lo=0,hi=draws.length;
  while(lo<hi){const mid=(lo+hi)>>1;if(draws[mid].date<date)lo=mid+1;else hi=mid;}return lo;
}
function windowCounts(pref,end,W){
  const start=Math.max(0,end-W),out=new Float64Array(50);for(let n=1;n<=49;n++)out[n]=pref[end][n]-pref[start][n];return out;
}
function zPosterior(counts,W,priorStrength){
  const vals=new Float64Array(49);let mean=0;
  for(let n=1;n<=49;n++){const d=(counts[n]+priorStrength*6/49)/(6*W+priorStrength)-1/49;vals[n-1]=d;mean+=d;}mean/=49;
  let variance=0;for(const v of vals)variance+=(v-mean)**2;const sd=Math.sqrt(variance/49)||1;
  const z=new Float64Array(50);for(let n=1;n<=49;n++)z[n]=(vals[n-1]-mean)/sd;return z;
}
function top8(ownZ,otherZ,crossWeight){
  const a=[];for(let n=1;n<=49;n++)a.push([n,ownZ[n]+crossWeight*otherZ[n]]);a.sort((x,y)=>y[1]-x[1]||x[0]-y[0]);return a.slice(0,8).map(x=>x[0]).sort((x,y)=>x-y);
}
function hits(pool,winning){return winning.filter(n=>pool.includes(n)).length;}

const games=Object.fromEntries(pre.games.map(g=>[g,loadDevelopment(g)]));
const prefs=Object.fromEntries(pre.games.map(g=>[g,prefix(games[g])]));
const windows=pre.frozenGrid.windows,priors=pre.frozenGrid.priorStrengths,weights=pre.frozenGrid.crossWeights;

function evaluateGame(game){
  const other=game==='bonoloto'?'primitiva':'bonoloto',draws=games[game],otherDraws=games[other],pref=prefs[game],otherPref=prefs[other];
  const configs=[];
  for(const W of windows)for(const priorStrength of priors)for(const crossWeight of weights){
    const id=`w${W}-p${priorStrength}-x${String(crossWeight).replace('.','p')}`;
    let evaluated=0,fivePlus=0,fullSix=0;const behavior=[],events=[];
    for(let i=0;i<draws.length;i++){
      const oEnd=upperBefore(otherDraws,draws[i].date);
      if(i<W||oEnd<W)continue;
      const own=windowCounts(pref,i,W),oth=windowCounts(otherPref,oEnd,W),ownZ=zPosterior(own,W,priorStrength),otherZ=zPosterior(oth,W,priorStrength),pool=top8(ownZ,otherZ,crossWeight),h=hits(pool,draws[i].n);
      evaluated++;if(h>=5){fivePlus++;events.push({date:draws[i].date,pool,winning:draws[i].n,hits:h});}if(h===6)fullSix++;
      behavior.push(`${draws[i].date}|${pool.join(',')}`);
    }
    configs.push({game,id,config:{window:W,priorStrength,crossWeight},evaluatedDraws:evaluated,fivePlusPoolHits:fivePlus,fullSixPoolHits:fullSix,matchedRandomExpectedFivePlus:+(evaluated*randomFivePlus).toFixed(6),matchedRandomExpectedFullSix:+(evaluated*randomFull).toFixed(6),behaviorHash:sha(behavior.join('\n')),events:events.slice(0,30)});
  }

  const nested=new Map(configs.filter(c=>c.config.crossWeight===0).map(c=>[`${c.config.window}|${c.config.priorStrength}`,c]));
  for(const c of configs){
    const n=nested.get(`${c.config.window}|${c.config.priorStrength}`);
    c.nestedSameGameFivePlus=n?.fivePlusPoolHits??null;
    c.fivePlusExcessOverNested=c.nestedSameGameFivePlus==null?null:c.fivePlusPoolHits-c.nestedSameGameFivePlus;
    c.fivePlusExcessOverMatchedRandom=+(c.fivePlusPoolHits-c.matchedRandomExpectedFivePlus).toFixed(6);
  }

  const byHash=new Map();
  for(const c of configs){const old=byHash.get(c.behaviorHash);if(!old||c.id.localeCompare(old.id)<0)byHash.set(c.behaviorHash,c);}
  const unique=[...byHash.values()];
  const eligible=unique.filter(c=>c.config.crossWeight>0&&c.evaluatedDraws>=pre.developmentGate.minimumEvaluatedDraws&&c.fivePlusExcessOverNested>=pre.developmentGate.minimumAbsoluteFivePlusExcessOverNested&&c.fivePlusExcessOverMatchedRandom>0)
    .sort((a,b)=>b.fivePlusExcessOverNested-a.fivePlusExcessOverNested||b.fivePlusExcessOverMatchedRandom-a.fivePlusExcessOverMatchedRandom||b.fivePlusPoolHits-a.fivePlusPoolHits||a.id.localeCompare(b.id));
  const selected=eligible.slice(0,pre.frozenGrid.maximumSelectedCrossGameCandidatesPerGameAfterDevelopment);
  return {game,drawsRead:draws.length,lastDrawRead:draws.at(-1)?.date||null,logicalConfigurations:configs.length,uniqueBehaviors:unique.length,behavioralDuplicates:configs.length-unique.length,eligibleCount:eligible.length,selected,topDevelopment:unique.sort((a,b)=>b.fivePlusExcessOverNested-a.fivePlusExcessOverNested||b.fivePlusExcessOverMatchedRandom-a.fivePlusExcessOverMatchedRandom||a.id.localeCompare(b.id)).slice(0,12)};
}

const results=pre.games.map(evaluateGame),selectedTotal=results.reduce((s,g)=>s+g.selected.length,0);
const out={generatedAt:new Date().toISOString(),version:'v318-stage1-development',family:pre.family,status:selectedTotal?'DEVELOPMENT_CANDIDATES_FROZEN_FOR_VALIDATION':'CLOSED_NO_DEVELOPMENT_TRANSFER_SIGNAL',preregisterSha256:sha(rawPre),temporalIsolation:{filesOpenedThroughYear:2018,developmentEnd:'2018-12-31',validationTouched:false,blindOosTouched:false,postFreezeTouched:false},matchedNull:{poolSize:8,fivePlusProbability:randomFivePlus,fullSixProbability:randomFull},games:results,selectedTotal,validationAllowed:selectedTotal>0,retuningPerformed:false,budget:{maximumTheoreticalCostEURPerGameDraw:14},realMoneyPass:false,realStakeEUR:0,next:selectedTotal?'persist immutable development-selected candidate definitions before any validation file is opened':'archive v318 without reading validation or OOS'};
fs.mkdirSync(`${ROOT}/data/research`,{recursive:true});fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({status:out.status,selectedTotal,games:results.map(g=>({game:g.game,drawsRead:g.drawsRead,lastDrawRead:g.lastDrawRead,logical:g.logicalConfigurations,unique:g.uniqueBehaviors,duplicates:g.behavioralDuplicates,eligible:g.eligibleCount,selected:g.selected.map(c=>({id:c.id,config:c.config,evaluated:c.evaluatedDraws,fivePlus:c.fivePlusPoolHits,nested:c.nestedSameGameFivePlus,excessNested:c.fivePlusExcessOverNested,expectedRandom:c.matchedRandomExpectedFivePlus,excessRandom:c.fivePlusExcessOverMatchedRandom,full:c.fullSixPoolHits}))})),validationTouched:false,blindOosTouched:false,realMoneyPass:false},null,2));

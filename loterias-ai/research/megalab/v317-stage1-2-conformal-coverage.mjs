#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';

const ROOT='loterias-ai';
const PREREG=`${ROOT}/data/research/metapleno-v317-preregister.json`;
const OUT=`${ROOT}/data/research/metapleno-v317-stage1-2-selection.json`;
const rawPre=fs.readFileSync(PREREG,'utf8');
const pre=JSON.parse(rawPre);
if(pre.version!=='v317'||pre.family!=='CONFORMAL_COVERAGE_AUDIT'||pre.status!=='PREREGISTERED_BEFORE_STAGE1_2')throw new Error('v317 preregistration invalid');
if(pre.temporalProtocol?.stage1_2DevelopmentEnd!=='2022-12-31'||pre.temporalProtocol?.stage1_2MustNotRead2023Plus!==true)throw new Error('v317 temporal preregistration drift');
if(pre.guards?.futureInformationAllowed!==false||pre.guards?.targetTuningAllowed!==false||pre.guards?.realMoneyPass!==false)throw new Error('v317 safety guards drift');

const choose=(n,k)=>{if(k<0||k>n)return 0;k=Math.min(k,n-k);let r=1;for(let i=1;i<=k;i++)r=r*(n-k+i)/i;return r};
const p5plus=k=>(6*choose(43,k-5)+choose(43,k-6))/choose(49,k);
const p6=k=>choose(43,k-6)/choose(49,k);
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
const modes=pre.frozenCandidateGrid.rankingModes,windows=pre.frozenCandidateGrid.rankingWindows,calWindows=pre.frozenCandidateGrid.calibrationWindows,alphas=pre.frozenCandidateGrid.alpha;

function loadGame(game){
  const dir=`${ROOT}/data/archive/${game}`;
  const files=fs.readdirSync(dir).filter(x=>/^\d{4}\.json$/.test(x)&&Number(x.slice(0,4))<=2022).sort();
  if(files.some(x=>Number(x.slice(0,4))>2022))throw new Error('v317 attempted to open post-2022 file');
  let rows=[];for(const f of files){const d=JSON.parse(fs.readFileSync(`${dir}/${f}`,'utf8'));rows.push(...(d.records||[]));}
  rows=[...new Map(rows.map(r=>[r.drawId||`${r.drawDate}-${JSON.stringify(r.result?.main)}`,r])).values()]
    .filter(r=>r.drawDate&&r.drawDate<='2022-12-31'&&Array.isArray(r.result?.main)&&r.result.main.length===6)
    .sort((a,b)=>a.drawDate.localeCompare(b.drawDate));
  if(rows.some(r=>r.drawDate>='2023-01-01'))throw new Error(`v317 ${game} post-2022 leakage`);
  return rows.map(r=>({date:r.drawDate,n:r.result.main.map(Number).sort((a,b)=>a-b)}));
}

function rankAt(draws,i,mode,W){
  const start=Math.max(0,i-W),hist=draws.slice(start,i),counts=Array(50).fill(0),last=Array(50).fill(-1);
  for(let j=0;j<hist.length;j++)for(const n of hist[j].n){counts[n]++;last[n]=j;}
  const gap=n=>last[n]<0?W+1:hist.length-1-last[n];
  const nums=Array.from({length:49},(_,j)=>j+1);
  if(mode==='hot')nums.sort((a,b)=>counts[b]-counts[a]||a-b);
  else if(mode==='overdue')nums.sort((a,b)=>gap(b)-gap(a)||a-b);
  else if(mode==='recent')nums.sort((a,b)=>gap(a)-gap(b)||a-b);
  else if(mode==='hot_gap_hybrid')nums.sort((a,b)=>{
    const sa=.65*(counts[a]/Math.max(1,6*W))+.35*(Math.min(gap(a),W+1)/(W+1));
    const sb=.65*(counts[b]/Math.max(1,6*W))+.35*(Math.min(gap(b),W+1)/(W+1));
    return sb-sa||a-b;
  });
  else throw new Error(`unknown v317 mode ${mode}`);
  return nums;
}

function fifthRank(rank,winning){
  const pos=new Map(rank.map((n,i)=>[n,i+1]));
  const r=winning.map(n=>pos.get(n)).sort((a,b)=>a-b);
  return r[4];
}
function quantileK(scores,alpha){
  const s=[...scores].sort((a,b)=>a-b),m=s.length,j=Math.min(m,Math.ceil((m+1)*(1-alpha)));
  return Math.max(6,s[j-1]);
}

function runGame(game){
  const draws=loadGame(game),results=[];
  for(const mode of modes)for(const W of windows){
    const ranks=Array(draws.length),nc=Array(draws.length);
    for(let i=W;i<draws.length;i++){const r=rankAt(draws,i,mode,W);ranks[i]=r;nc[i]=fifthRank(r,draws[i].n);}
    for(const C of calWindows)for(const alpha of alphas){
      const id=`${mode}-w${W}-c${C}-a${String(alpha).replace('.','p')}`;
      let playable=0,five=0,full=0,expectedFive=0,expectedFull=0;const behavior=[],events=[];
      for(let i=W+C;i<draws.length;i++){
        if(draws[i].date<'2018-01-01')continue;
        const cal=nc.slice(i-C,i);if(cal.length!==C||cal.some(x=>!Number.isInteger(x)))continue;
        const K=quantileK(cal,alpha);if(K>8)continue;
        const pool=ranks[i].slice(0,K).sort((a,b)=>a-b),hits=draws[i].n.filter(n=>pool.includes(n)).length;
        playable++;expectedFive+=p5plus(K);expectedFull+=p6(K);if(hits>=5){five++;events.push({date:draws[i].date,K,pool,winning:draws[i].n,hits});}if(hits===6)full++;
        behavior.push(`${draws[i].date}|${K}|${pool.join(',')}`);
      }
      const behaviorHash=sha(behavior.join('\n'));
      results.push({game,id,config:{mode,rankingWindow:W,calibrationWindow:C,alpha},playableEvaluations:playable,fivePlusCount:five,fullSixCount:full,matchedRandomExpectedFivePlus:+expectedFive.toFixed(6),matchedRandomExpectedFullSix:+expectedFull.toFixed(6),fivePlusExcessVsMatchedRandom:+(five-expectedFive).toFixed(6),behaviorHash,eventCount:events.length,events:events.slice(0,20)});
    }
  }
  const byHash=new Map();for(const r of results){const old=byHash.get(r.behaviorHash);if(!old||r.id.localeCompare(old.id)<0)byHash.set(r.behaviorHash,r);}
  const unique=[...byHash.values()];
  const eligible=unique.filter(r=>r.playableEvaluations>=pre.stage1_2SelectionRules.minimumPlayableEvaluations&&r.fivePlusCount>=pre.stage1_2SelectionRules.requiredObservedFivePlusEvents&&r.fivePlusExcessVsMatchedRandom>pre.stage1_2SelectionRules.requiredObservedMinusMatchedRandomExpectedFivePlus)
    .sort((a,b)=>b.fivePlusExcessVsMatchedRandom-a.fivePlusExcessVsMatchedRandom||b.fivePlusCount-a.fivePlusCount||b.playableEvaluations-a.playableEvaluations||b.fullSixCount-a.fullSixCount||a.id.localeCompare(b.id));
  return {game,drawsRead:draws.length,lastDrawRead:draws.at(-1)?.date||null,logicalConfigurations:results.length,uniqueBehaviors:unique.length,eligibleCount:eligible.length,selected:eligible.slice(0,pre.frozenCandidateGrid.maximumFrozenBehavioralRepresentativesPerGame),topDevelopment:unique.sort((a,b)=>b.fivePlusExcessVsMatchedRandom-a.fivePlusExcessVsMatchedRandom||b.fivePlusCount-a.fivePlusCount||a.id.localeCompare(b.id)).slice(0,10)};
}

const games=pre.games.map(runGame),selectedTotal=games.reduce((s,g)=>s+g.selected.length,0);
const out={
  generatedAt:new Date().toISOString(),version:'v317-stage1-2',family:pre.family,status:selectedTotal?'STAGE1_2_READY_FOR_FREEZE':'CLOSED_NO_DEVELOPMENT_SIGNAL',preregisterSha256:sha(rawPre),developmentBoundary:{filesOpenedThroughYear:2022,lastAllowedDate:'2022-12-31',blindOosStart:'2023-01-01',validationTouched:false,postFreezeTouched:false},candidateGrid:{logicalPerGame:72,totalLogical:games.reduce((s,g)=>s+g.logicalConfigurations,0)},games,selectedTotal,freezeAllowed:selectedTotal>0,retuningPerformed:false,realMoneyPass:false,realStakeEUR:0,budget:{maximumTheoreticalCostEURPerGameDraw:14},next:selectedTotal?'freeze only the selected behavioral representatives before any 2023+ file is opened':'archive v317; do not open 2023+ OOS'};
fs.mkdirSync(`${ROOT}/data/research`,{recursive:true});fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({status:out.status,selectedTotal,games:games.map(g=>({game:g.game,drawsRead:g.drawsRead,lastDrawRead:g.lastDrawRead,uniqueBehaviors:g.uniqueBehaviors,eligible:g.eligibleCount,selected:g.selected.map(x=>({id:x.id,playable:x.playableEvaluations,fivePlus:x.fivePlusCount,expected:x.matchedRandomExpectedFivePlus,excess:x.fivePlusExcessVsMatchedRandom,full:x.fullSixCount}))})),validationTouched:false,realMoneyPass:false},null,2));

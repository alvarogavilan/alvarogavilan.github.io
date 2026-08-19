import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const DIR='loterias-ai/data/archive/eurodreams';
const OUT='loterias-ai/data/research/eurodreams-minimum-stake-audit-v2.json';
const MODES=['hot','cold','overdue','hybrid'];
const WINDOWS=[10,25,50,100,200];
const CANDIDATES=MODES.flatMap(mode=>WINDOWS.map(window=>({mode,window})));

function loadRows(){
  const rows=[];
  for(const f of fs.readdirSync(DIR).filter(x=>/^\d{4}\.json$/.test(x)).sort()){
    const z=JSON.parse(fs.readFileSync(path.join(DIR,f),'utf8'));
    rows.push(...(z.records||[]));
  }
  const seen=new Set();
  return rows.filter(r=>{
    const k=r.drawId||`${r.drawDate}|${JSON.stringify(r.result||{})}`;
    if(!r.drawDate||seen.has(k)||!Array.isArray(r.result?.main)||r.result.main.length!==6)return false;
    seen.add(k);return Number(r.economics?.ticketCost)>0;
  }).sort((a,b)=>String(a.drawDate).localeCompare(String(b.drawDate)));
}

const rows=loadRows();
const hashInt=s=>parseInt(crypto.createHash('sha256').update(String(s)).digest('hex').slice(0,8),16)>>>0;
function shuffled(domain,seed){
  const a=[...domain];let x=hashInt(seed)||1;
  const rnd=()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return(x>>>0)/4294967296};
  for(let i=a.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a;
}
function scalar(r,field){const v=r?.result?.[field];return Array.isArray(v)?v:(v==null?[]:[v]);}
function rankDomain(i,field,max,pick,c){
  const domain=Array.from({length:max},(_,k)=>k+1),hist=rows.slice(Math.max(0,i-c.window),i);
  const counts=new Map(domain.map(n=>[n,0])),last=new Map(domain.map(n=>[n,-1]));
  for(let j=0;j<hist.length;j++)for(const n of scalar(hist[j],field))if(counts.has(n)){counts.set(n,counts.get(n)+1);last.set(n,j)}
  const den=Math.max(1,hist.length);
  const scored=domain.map(n=>{
    const f=counts.get(n)/den,gap=last.get(n)<0?1:Math.min(1,(hist.length-1-last.get(n))/Math.max(1,c.window)),lastHit=scalar(rows[i-1],field).includes(n)?1:0;
    let s=c.mode==='hot'?f:c.mode==='cold'?-f:c.mode==='overdue'?gap:f+0.25*gap-0.15*lastHit;
    return[s,n];
  }).sort((a,b)=>b[0]-a[0]||a[1]-b[1]);
  return scored.slice(0,pick).map(x=>x[1]).sort((a,b)=>a-b);
}
function prediction(i,c){return{main:rankDomain(i,'main',40,6,c),dream:rankDomain(i,'dream',5,1,c)[0]};}
function control(r){return{main:shuffled(Array.from({length:40},(_,k)=>k+1),`eurodreams|${r.drawDate}|main`).slice(0,6).sort((a,b)=>a-b),dream:shuffled([1,2,3,4,5],`eurodreams|${r.drawDate}|extra`)[0]};}
function prizeFor(r,mainHits,dreamHit){
  if(mainHits<2)return 0;
  const target=mainHits===6?`6+${dreamHit?1:0}`:`${mainHits}+0/1`;
  const cats=r.economics?.categories||[];
  const c=cats.find(x=>String(x.label||'').replace(/\s/g,'').replace(/^\d+ª/,'').startsWith(target));
  if(!c)return 0;
  const p=Number(c.prize||0);
  if(p>0)return p;
  if(mainHits===6&&dreamHit&&Number(r.economics?.jackpot)>0)return Number(r.economics.jackpot);
  return 0;
}
function settle(r,p){
  const mainHits=p.main.filter(n=>r.result.main.includes(n)).length,dreamHit=Number(r.result?.dream)===Number(p.dream),ret=prizeFor(r,mainHits,dreamHit);
  return{mainHits,dreamHit,ret,top:mainHits===6&&dreamHit};
}
function evaluate(indices,c,useControl=false){
  let stake=0,ret=0,topHits=0,prizeDraws=0,best=0;const trace=[];
  for(const i of indices){const r=rows[i],cost=Number(r.economics.ticketCost),p=useControl?control(r):prediction(i,c),s=settle(r,p);stake+=cost;ret+=s.ret;topHits+=s.top?1:0;prizeDraws+=s.ret>0?1:0;best=Math.max(best,s.mainHits);trace.push({date:r.drawDate,costEUR:cost,ticket:p,mainHits:s.mainHits,dreamHit:s.dreamHit,returnEUR:s.ret});}
  const sorted=[...trace].sort((a,b)=>b.returnEUR-a.returnEUR),max=sorted[0]?.returnEUR||0,maxCost=sorted[0]?.costEUR||0;
  const stakeWithoutBest=stake-maxCost,retWithoutBest=ret-max;
  return{draws:indices.length,stakeEUR:Number(stake.toFixed(2)),returnEUR:Number(ret.toFixed(2)),plEUR:Number((ret-stake).toFixed(2)),roi:stake?ret/stake-1:null,topHits,prizeDraws,bestPrimaryHits:best,maxSingleReturnEUR:max,top1ShareOfReturn:ret?max/ret:null,leaveBestDrawOutROI:stakeWithoutBest?retWithoutBest/stakeWithoutBest-1:null,topFiveEvents:sorted.slice(0,5),trace};
}

const warmup=30,usable=Array.from({length:Math.max(0,rows.length-warmup)},(_,k)=>k+warmup);
const dN=Math.floor(usable.length*0.50),vN=Math.floor(usable.length*0.25);
const discoveryIdx=usable.slice(0,dN),validationIdx=usable.slice(dN,dN+vN),holdoutIdx=usable.slice(dN+vN);
const candidateTable=CANDIDATES.map(c=>({candidate:c,discovery:evaluate(discoveryIdx,c)})).sort((a,b)=>b.discovery.roi-a.discovery.roi||b.discovery.prizeDraws-a.discovery.prizeDraws||a.candidate.window-b.candidate.window||a.candidate.mode.localeCompare(b.candidate.mode));
const champion=candidateTable[0].candidate;
const oldV1Candidate={mode:'cold',window:200};
const out={
  version:'eurodreams-minimum-stake-audit-v2',generatedAt:new Date().toISOString(),status:'CORRECTED_PAYOUT_AUDIT',
  bugFixed:'V1 payout regex could match category ordinal (e.g. 3ª) as hit count; V2 strips the ordinal before exact hit-tier matching.',
  methodology:{eachPredictionUsesOnlyEarlierDraws:true,warmupDraws:warmup,split:'50% discovery / 25% validation / 25% holdout',candidateSelection:'corrected discovery only',minimumStakePerDraw:true,realMoney:false},
  split:{discovery:discoveryIdx.length,validation:validationIdx.length,holdout:holdoutIdx.length,firstHoldoutDate:rows[holdoutIdx[0]]?.drawDate,lastHoldoutDate:rows[holdoutIdx.at(-1)]?.drawDate},
  correctedDiscoveryChampion:champion,
  correctedChampion:{discovery:evaluate(discoveryIdx,champion),validation:evaluate(validationIdx,champion),holdout:evaluate(holdoutIdx,champion),matchedControlHoldout:evaluate(holdoutIdx,champion,true)},
  v1SelectedCandidateReaudited:{candidate:oldV1Candidate,discovery:evaluate(discoveryIdx,oldV1Candidate),validation:evaluate(validationIdx,oldV1Candidate),holdout:evaluate(holdoutIdx,oldV1Candidate)},
  candidateDiscoverySummary:candidateTable.map(x=>({candidate:x.candidate,roi:x.discovery.roi,stakeEUR:x.discovery.stakeEUR,returnEUR:x.discovery.returnEUR,prizeDraws:x.discovery.prizeDraws,bestPrimaryHits:x.discovery.bestPrimaryHits})),
  guards:{noFutureRowsInPrediction:true,validationAndHoldoutNotUsedToSelectCorrectedChampion:true,postBugfixHistoricalReanalysis:true,notLiveProspective:true,realMoneyAllowed:false,realStakeEUR:0}
};
fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({champion,split:out.split,validation:out.correctedChampion.validation,holdout:{...out.correctedChampion.holdout,trace:undefined},control:{...out.correctedChampion.matchedControlHoldout,trace:undefined},v1Holdout:{...out.v1SelectedCandidateReaudited.holdout,trace:undefined},realMoneyAllowed:false},null,2));

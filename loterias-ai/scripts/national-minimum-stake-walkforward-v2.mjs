import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT='loterias-ai/data/archive/eurodreams';
const BASE='loterias-ai/data/research/national-minimum-stake-walkforward-v1.json';
const OUT='loterias-ai/data/research/national-minimum-stake-walkforward-v2.json';
const MODES=['hot','cold','overdue','hybrid'],WINDOWS=[10,25,50,100,200];
const CANDIDATES=[];for(const mode of MODES)for(const window of WINDOWS)CANDIDATES.push({mode,window});

const rows=[];
for(const f of fs.readdirSync(ROOT).filter(x=>/^\d{4}\.json$/.test(x)).sort()){
  const z=JSON.parse(fs.readFileSync(path.join(ROOT,f),'utf8'));
  rows.push(...(z.records||[]));
}
rows.sort((a,b)=>a.drawDate.localeCompare(b.drawDate));

function vals(r,field){const v=r.result?.[field];return Array.isArray(v)?v:(v==null?[]:[v])}
function rank(i,field,max,pick,c,zero=false){
  const domain=Array.from({length:max},(_,k)=>k+(zero?0:1)),hist=rows.slice(Math.max(0,i-c.window),i);
  const counts=new Map(domain.map(n=>[n,0])),last=new Map(domain.map(n=>[n,-1]));
  for(let j=0;j<hist.length;j++)for(const n of vals(hist[j],field))if(counts.has(n)){counts.set(n,counts.get(n)+1);last.set(n,j)}
  const lastVals=i>0?vals(rows[i-1],field):[];
  return domain.map(n=>{
    const f=counts.get(n)/Math.max(1,hist.length),gap=last.get(n)<0?1:Math.min(1,(hist.length-1-last.get(n))/Math.max(1,c.window)),lh=lastVals.includes(n)?1:0;
    let s=c.mode==='hot'?f:c.mode==='cold'?-f:c.mode==='overdue'?gap:f+0.25*gap-0.15*lh;
    return[s,n];
  }).sort((a,b)=>b[0]-a[0]||a[1]-b[1]).slice(0,pick).map(x=>x[1]).sort((a,b)=>a-b);
}
const pred=(i,c)=>({main:rank(i,'main',40,6,c),dream:rank(i,'dream',5,1,c)[0]});
const hashInt=s=>parseInt(crypto.createHash('sha256').update(String(s)).digest('hex').slice(0,8),16)>>>0;
function shuf(a,seed){a=[...a];let x=hashInt(seed)||1;const rnd=()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return(x>>>0)/4294967296};for(let i=a.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
const control=r=>({main:shuf(Array.from({length:40},(_,k)=>k+1),`ed|${r.drawDate}|main`).slice(0,6).sort((a,b)=>a-b),dream:shuf([1,2,3,4,5],`ed|${r.drawDate}|dream`)[0]});
function settle(r,p){
  const h=p.main.filter(n=>(r.result?.main||[]).includes(n)).length,dream=p.dream===r.result?.dream;
  const compact=x=>String(x||'').replace(/\s/g,'');
  let re=null;
  if(h===6&&dream)re=/6\+1/;
  else if(h===6)re=/6\+0/;
  else if(h>=2&&h<=5)re=new RegExp(`${h}\\+.*0\\/1`);
  const c=re&&(r.economics?.categories||[]).find(x=>re.test(compact(x.label)));
  let ret=Number(c?.prize||0);let top=h===6&&dream;
  if(top&&ret===0&&Number(r.economics?.jackpot)>0)ret=Number(r.economics.jackpot);
  return{hits:h,dreamHit:dream,returnEUR:ret,matchedCategory:c?{label:c.label,prize:Number(c.prize||0)}:null,top};
}
function ev(indices,c,isControl=false,withEvents=false){
  let stake=0,ret=0,top=0,prizeDraws=0,sum=0,best=0;const events=[];
  for(const i of indices){const r=rows[i],cost=Number(r.economics?.ticketCost||0);if(!(cost>0))continue;const p=isControl?control(r):pred(i,c),o=settle(r,p);stake+=cost;ret+=o.returnEUR;sum+=o.hits;best=Math.max(best,o.hits);if(o.top)top++;if(o.returnEUR>0){prizeDraws++;if(withEvents)events.push({date:r.drawDate,stakeEUR:cost,prediction:p,truth:{main:r.result.main,dream:r.result.dream},...o})}}
  return{draws:indices.length,stakeEUR:stake,returnEUR:ret,plEUR:ret-stake,roi:stake?ret/stake-1:null,topHits:top,prizeDraws,meanPrimaryHits:indices.length?sum/indices.length:null,bestPrimaryHits:best,...(withEvents?{prizeEvents:events}:{})};
}
const eligible=rows.map((r,i)=>[r,i]).filter(([r,i])=>i>=Math.min(200,Math.max(30,Math.floor(rows.length*0.1)))&&r.economics&&Number(r.economics.ticketCost)>0).map(x=>x[1]);
const n=eligible.length,a=Math.floor(n*0.5),b=Math.floor(n*0.75),disc=eligible.slice(0,a),val=eligible.slice(a,b),hold=eligible.slice(b);
let best=null;
for(const c of CANDIDATES){const e=ev(disc,c);const sc=e.topHits*1e12+e.prizeDraws*1e6+e.meanPrimaryHits*1e3+e.returnEUR;if(!best||sc>best.sc)best={c,e,sc}}
const c=best.c;
const corrected={gameId:'eurodreams',family:'numeric',status:'RETROSPECTIVE_CAUSAL_WALK_FORWARD_CORRECTED_V2',fixedCandidate:c,split:{discovery:disc.length,validation:val.length,holdout:hold.length,firstHoldoutDate:rows[hold[0]]?.drawDate,lastHoldoutDate:rows[hold.at(-1)]?.drawDate},minimumObservedUnitStakeEUR:Math.min(...hold.map(i=>Number(rows[i].economics.ticketCost))),medianHoldoutUnitStakeEUR:hold.map(i=>Number(rows[i].economics.ticketCost)).sort((x,y)=>x-y)[Math.floor(hold.length/2)],discovery:ev(disc,c,false,true),validation:ev(val,c,false,true),holdout:ev(hold,c,false,true),matchedControlHoldout:ev(hold,c,true,true),guards:{eachPredictionUsesOnlyEarlierRows:true,candidateSelectedOnDiscoveryOnly:true,validationAndHoldoutNotUsedForCandidateChoice:true,categoryParserRequiresExplicitHitsPlusPattern:true,realMoney:false}};
corrected.holdoutVsControl={roiDelta:(corrected.holdout.roi??0)-(corrected.matchedControlHoldout.roi??0),meanPrimaryHitsDelta:(corrected.holdout.meanPrimaryHits??0)-(corrected.matchedControlHoldout.meanPrimaryHits??0),topHitDelta:corrected.holdout.topHits-corrected.matchedControlHoldout.topHits};

const base=JSON.parse(fs.readFileSync(BASE,'utf8'));
const results=(base.results||[]).map(x=>x.gameId==='eurodreams'?corrected:x);
const ranked=[...results].filter(x=>x.holdout).sort((a,b)=>(b.holdout.roi??-99)-(a.holdout.roi??-99));
const out={...base,version:'national-minimum-stake-walkforward-v2',generatedAt:new Date().toISOString(),supersedes:'national-minimum-stake-walkforward-v1',correction:{reason:'EuroDreams v1 category regex could match ordinal category number instead of explicit hit-count token. V2 requires the explicit N+ pattern and persists prize-event audit rows.',v1EuroDreamsEconomicResultInvalid:true},results,rankingByHoldoutROI:ranked.map(x=>({gameId:x.gameId,roi:x.holdout.roi,stakeEUR:x.holdout.stakeEUR,returnEUR:x.holdout.returnEUR,topHits:x.holdout.topHits,controlROI:x.matchedControlHoldout.roi,roiDelta:x.holdoutVsControl.roiDelta})),decision:{realMoneyPass:false,automaticBetting:false,claim:'NO_LIVE_EDGE_CLAIM_FROM_RETROSPECTIVE_WALK_FORWARD'}};
fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({eurodreams:corrected,ranking:out.rankingByHoldoutROI},null,2));

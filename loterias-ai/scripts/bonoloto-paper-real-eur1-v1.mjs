import fs from 'node:fs';
import crypto from 'node:crypto';

const ARCH_DIR='loterias-ai/data/archive/bonoloto';
const OUT='loterias-ai/data/shadow/bonoloto-paper-real-eur1-v1.json';
const HORIZON_DRAWS=350;
const VIRTUAL_BANKROLL_START_EUR=350;
const STAKE_PER_DRAW_EUR=1;
const FIXED_SPEC={
  id:386952,sw:5,lw:960,wS:8,wL:-1,wGap:-3,wLast:-4,wPrev2:-1,wNum:-4,wParity:-1,wLow:-1,gapCap:160,powerS:1,powerL:2,setSize:8
};
const STRATEGY_TEMPLATES=[[0,1,2,3,4,5],[0,1,2,3,6,7]];

const read=p=>{try{return JSON.parse(fs.readFileSync(p,'utf8'));}catch{return null}};
const sha=o=>crypto.createHash('sha256').update(JSON.stringify(o)).digest('hex');
const round2=x=>Number(Number(x||0).toFixed(2));
const isOfficial=r=>r?.verification?.status==='OFFICIAL_SELAE_VALIDATED'||r?.economics?.validation?.officialSELAE===true;

let rows=[];
for(const f of fs.readdirSync(ARCH_DIR).filter(x=>/^\d{4}\.json$/.test(x)).sort()){
  const z=read(`${ARCH_DIR}/${f}`)||{};
  rows.push(...(z.records||[]));
}
rows=rows.filter(r=>r.drawDate&&Array.isArray(r.result?.main)&&r.result.main.length===6&&new Set(r.result.main).size===6).sort((a,b)=>String(a.drawDate).localeCompare(String(b.drawDate)));
if(!rows.length)throw new Error('No Bonoloto archive rows');

function combinations(a,k){
  const out=[];
  const rec=(start,p)=>{
    if(p.length===k){out.push([...p]);return;}
    for(let i=start;i<=a.length-(k-p.length);i++){p.push(a[i]);rec(i+1,p);p.pop();}
  };
  rec(0,[]);return out;
}
function seededIndex(seed,n){
  const h=crypto.createHash('sha256').update(seed).digest();
  return h.readUInt32BE(0)%n;
}
function predictPool(cutoffIndex){
  const i=cutoffIndex+1;
  const prefix=Array(i+1);prefix[0]=new Uint32Array(50);
  const last=new Int32Array(50);last.fill(-1);
  for(let j=0;j<i;j++){
    const p=new Uint32Array(prefix[j]);
    for(const n of rows[j].result.main)p[n]++;
    prefix[j+1]=p;
    for(const n of rows[j].result.main)last[n]=j;
  }
  const prev1=new Set(rows[cutoffIndex]?.result?.main||[]),prev2=new Set(rows[cutoffIndex-1]?.result?.main||[]);
  const scored=[];
  for(let n=1;n<=49;n++){
    const as=Math.max(0,i-FIXED_SPEC.sw),al=Math.max(0,i-FIXED_SPEC.lw);
    const cs=prefix[i][n]-prefix[as][n],cl=prefix[i][n]-prefix[al][n];
    const gap=Math.min(FIXED_SPEC.gapCap,last[n]<0?FIXED_SPEC.gapCap:i-last[n]);
    const f0=cs/Math.max(1,i-as),f1=cl/Math.max(1,i-al);
    const score=FIXED_SPEC.wS*(FIXED_SPEC.powerS===2?f0*f0:f0)
      +FIXED_SPEC.wL*(FIXED_SPEC.powerL===2?f1*f1:f1)
      +FIXED_SPEC.wGap*(gap/FIXED_SPEC.gapCap)
      +FIXED_SPEC.wLast*(prev1.has(n)?1:0)
      +FIXED_SPEC.wPrev2*(prev2.has(n)?1:0)
      +FIXED_SPEC.wNum*(n/49)
      +FIXED_SPEC.wParity*(n%2?1:-1)
      +FIXED_SPEC.wLow*(n<=24?1:-1);
    scored.push({n,score});
  }
  scored.sort((a,b)=>b.score-a.score||a.n-b.n);
  return scored.slice(0,8);
}
function makeFreeze(cutoffIndex){
  const ranked=predictPool(cutoffIndex);
  const rankedPool=ranked.map(x=>x.n);
  const strategyTickets=STRATEGY_TEMPLATES.map(t=>t.map(ix=>rankedPool[ix]).sort((a,b)=>a-b));
  const all=combinations(rankedPool,6).map(x=>[...x].sort((a,b)=>a-b));
  const first=seededIndex(`control-a|${rows[cutoffIndex].drawDate}|${rankedPool.join(',')}`,all.length);
  let second=seededIndex(`control-b|${rows[cutoffIndex].drawDate}|${rankedPool.join(',')}`,all.length-1);
  if(second>=first)second++;
  const controlTickets=[all[first],all[second]];
  const base={
    frozenAt:new Date().toISOString(),
    dataCutoff:rows[cutoffIndex].drawDate,
    target:`NEXT_OFFICIAL_BONOLOTO_DRAW_AFTER_${rows[cutoffIndex].drawDate}`,
    fixedPoolEngine:{name:'MetaPleno-v54 continuation of v53 frozen spec',spec:FIXED_SPEC},
    rankedPool,
    rankScores:ranked.map(x=>({n:x.n,score:Number(x.score.toFixed(12))})),
    strategy:{name:'EUR1_TOPRANK_BALANCED_V1',tickets:strategyTickets,virtualStakeEUR:1,conditionalFull6CoverageIfPoolContainsTruth:2/28},
    matchedControl:{name:'EUR1_DETERMINISTIC_RANDOM_2_OF_28',tickets:controlTickets,virtualStakeEUR:1,conditionalFull6CoverageIfPoolContainsTruth:2/28},
    guards:{preResultOnly:true,noRetuning:true,noOptionalStopping:true,performanceDoesNotChangeRule:true,realMoneyAllowed:false,realStakeEUR:0}
  };
  return {...base,sealSHA256:sha(base)};
}
function categoryFor(ticket,r){
  const truth=new Set(r.result.main),hits=ticket.filter(n=>truth.has(n)).length,c=Number(r.result?.complementary);
  if(hits===6)return 1;
  if(hits===5&&Number.isFinite(c)&&ticket.includes(c))return 2;
  if(hits===5)return 3;
  if(hits===4)return 4;
  if(hits===3)return 5;
  return null;
}
function settlePortfolio(tickets,r){
  const cats=r.economics?.categories||[];
  const detail=tickets.map(ticket=>({ticket,category:categoryFor(ticket,r)}));
  const virtualCounts=new Map();for(const x of detail)if(x.category)virtualCounts.set(x.category,(virtualCounts.get(x.category)||0)+1);
  let totalReturn=0;
  for(const x of detail){
    const truth=new Set(r.result.main);x.hits=x.ticket.filter(n=>truth.has(n)).length;x.matched=x.ticket.filter(n=>truth.has(n));x.returnEUR=0;x.payoutBasis='NO_PRIZE';
    if(!x.category)continue;
    const c=cats.find(z=>Number(z.category)===Number(x.category));
    const actualWinners=Number(c?.winners||0),historicalPrize=Number(c?.prize||0),virtualWinners=Number(virtualCounts.get(x.category)||1);
    if(actualWinners>0&&historicalPrize>0){
      const fixedCategoryFund=actualWinners*historicalPrize;
      x.returnEUR=fixedCategoryFund/(actualWinners+virtualWinners);
      x.payoutBasis='COUNTERFACTUAL_SHARED_FIXED_CATEGORY_FUND';
    }else if(x.category===1&&Number(r.economics?.jackpot)>0){
      x.returnEUR=Number(r.economics.jackpot)/virtualWinners;
      x.payoutBasis='OFFICIAL_JACKPOT_FIELD_COUNTERFACTUAL_FIRST_CATEGORY';
    }else{
      x.returnEUR=0;
      x.payoutBasis='UNPRICED_CATEGORY_CONSERVATIVE_ZERO';
    }
    x.returnEUR=round2(x.returnEUR);totalReturn+=x.returnEUR;
  }
  return {tickets:detail,returnEUR:round2(totalReturn),reintegroExcluded:true};
}
function summarize(settlements,key){
  const stake=settlements.length*STAKE_PER_DRAW_EUR,ret=round2(settlements.reduce((s,x)=>s+Number(x[key]?.returnEUR||0),0));
  const full6=settlements.reduce((s,x)=>s+(x[key]?.tickets||[]).filter(t=>t.category===1).length,0);
  const cat2=settlements.reduce((s,x)=>s+(x[key]?.tickets||[]).filter(t=>t.category===2).length,0);
  const cat3=settlements.reduce((s,x)=>s+(x[key]?.tickets||[]).filter(t=>t.category===3).length,0);
  const pl=round2(ret-stake),roi=stake?ret/stake-1:null;
  return {settledDraws:settlements.length,stakeEUR:stake,returnEUR:ret,plEUR:pl,roi,full6,category2_5plusC:cat2,category3_5hits:cat3,virtualBankrollEUR:round2(VIRTUAL_BANKROLL_START_EUR+pl)};
}

let ledger=read(OUT)||{
  version:'bonoloto-paper-real-eur1-v1',createdAt:new Date().toISOString(),mode:'VIRTUAL_REAL_MONEY_SIMULATION',
  policy:{virtualBankrollStartEUR:VIRTUAL_BANKROLL_START_EUR,stakePerDrawEUR:STAKE_PER_DRAW_EUR,horizonDraws:HORIZON_DRAWS,fixedHorizonNoOptionalStopping:true,realMoneyAllowed:false,realStakeEUR:0},
  scientificQuestion:'Can a 1 EUR two-ticket compression of the frozen 8-number pool outperform a matched 2-of-28 control prospectively and produce economically meaningful returns?',
  settlements:[],pending:null,skippedBacklogDraws:[],guards:{futureInformationForbidden:true,freezeBeforeResultRequired:true,retuningForbidden:true,controlFrozenSameTime:true,realMoneyAllowed:false}
};

// Settle the previously frozen next draw only after an official SELAE-validated record exists.
if(ledger.pending){
  const p=ledger.pending;
  const eligible=rows.filter(r=>String(r.drawDate)>String(p.dataCutoff)&&isOfficial(r));
  if(eligible.length){
    const r=eligible[0];
    const strategy=settlePortfolio(p.strategy.tickets,r),control=settlePortfolio(p.matchedControl.tickets,r);
    ledger.settlements.push({
      settledAt:new Date().toISOString(),freezeSealSHA256:p.sealSHA256,dataCutoff:p.dataCutoff,resultDate:r.drawDate,
      officialEvidence:{verificationStatus:r.verification?.status||null,economicsOfficialSELAE:r.economics?.validation?.officialSELAE===true,jackpotEUR:Number(r.economics?.jackpot||0)},
      strategy,control,virtualStakeEachPortfolioEUR:1,realStakeEUR:0
    });
    ledger.pending=null;
  }
}

// Never backfill a known result as prospective. Freeze only after the latest currently known archive row.
const latestIndex=rows.length-1;
if(!ledger.pending&&ledger.settlements.length<HORIZON_DRAWS){
  ledger.pending=makeFreeze(latestIndex);
}
ledger.updatedAt=new Date().toISOString();
ledger.summary={
  horizonDraws:HORIZON_DRAWS,remainingDraws:HORIZON_DRAWS-ledger.settlements.length,
  strategy:summarize(ledger.settlements,'strategy'),control:summarize(ledger.settlements,'control'),
  disclosure:'PAPER ACCOUNTING AS IF REAL; no real-money authorization is implied.',
  realMoneyPass:false,realStakeEUR:0
};
fs.mkdirSync('loterias-ai/data/shadow',{recursive:true});
fs.writeFileSync(OUT,JSON.stringify(ledger,null,2)+'\n');
console.log(JSON.stringify({status:ledger.pending?'PENDING_NEXT_OFFICIAL_DRAW':'COMPLETE',summary:ledger.summary,pending:ledger.pending&&{dataCutoff:ledger.pending.dataCutoff,target:ledger.pending.target,rankedPool:ledger.pending.rankedPool,strategyTickets:ledger.pending.strategy.tickets,sealSHA256:ledger.pending.sealSHA256}},null,2));

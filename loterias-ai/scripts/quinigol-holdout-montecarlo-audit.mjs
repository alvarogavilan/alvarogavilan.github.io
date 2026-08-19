import fs from 'node:fs';

const ARCHIVE='loterias-ai/data/archive/quinigol';
const TOURNAMENT='loterias-ai/data/backtests/quinigol-official-financial-tournament.json';
const OUT='loterias-ai/data/backtests/quinigol-holdout-montecarlo-audit.json';
const RUNS=Math.max(1000,Math.min(200000,Number(process.env.MC_RUNS||50000)));

let rows=[];
for(const f of fs.existsSync(ARCHIVE)?fs.readdirSync(ARCHIVE).filter(x=>/^\d{4}\.json$/.test(x)).sort():[]){
  rows.push(...(JSON.parse(fs.readFileSync(`${ARCHIVE}/${f}`,'utf8')).records||[]));
}
rows=rows.filter(r=>r.drawDate&&r.economics?.validation?.officialSELAE&&Array.isArray(r.result?.codes)&&r.result.codes.length===6).sort((a,b)=>a.drawDate.localeCompare(b.drawDate));
const tournament=JSON.parse(fs.readFileSync(TOURNAMENT,'utf8'));
if(tournament?.winner?.window!==320||tournament?.winner?.ticketsPerDraw!==2)throw new Error('Quinigol fixed winner drift');
if(tournament?.holdout?.draws!==207||!(Number(tournament?.holdout?.roi)>0))throw new Error('Unexpected fixed holdout state');

const buckets=['0','1','2','M'];
const codes=[];for(const a of buckets)for(const b of buckets)codes.push(`${a}-${b}`);
const payout=(rec,hits)=>{for(const c of rec.economics?.categories||[]){const l=String(c.label||'').toLowerCase();if(new RegExp(`(^|\\D)${hits}\\s*aciert`).test(l))return Number(c.prize||0)}return 0};
function predict(hist,window){const pos=Array.from({length:6},()=>Object.fromEntries(codes.map(c=>[c,1])));for(const r of hist.slice(-window))for(let i=0;i<6;i++){const c=String(r.result.codes[i]||'').toUpperCase();if(c in pos[i])pos[i][c]++}return pos.map(p=>Object.entries(p).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]))[0][0])}
function evalTicket(rec,t){let h=0;for(let i=0;i<6;i++)if(t[i]===String(rec.result.codes[i]).toUpperCase())h++;return{hits:h,ret:payout(rec,h)}}

const cut=Math.floor(rows.length*.7),prior=rows.slice(0,cut),hold=rows.slice(cut);
if(hold.length!==207)throw new Error(`Holdout length drift ${hold.length}`);
let modelStake=0,modelReturn=0;
for(let i=0;i<hold.length;i++){
  const base=predict([...prior,...hold.slice(0,i)],320);
  for(let k=0;k<2;k++){
    const t=[...base];
    if(k>0){const idx=(i+k*3)%6;t[idx]=codes[(codes.indexOf(t[idx])+k+1)%codes.length]}
    const e=evalTicket(hold[i],t);modelStake+=Number(hold[i].economics.ticketCost||1);modelReturn+=e.ret;
  }
}
const modelPL=modelReturn-modelStake,modelROI=modelPL/modelStake;
if(Math.abs(modelROI-Number(tournament.holdout.roi))>1e-12)throw new Error('Recomputed holdout ROI mismatch');

function choose(n,k){let x=1;for(let i=1;i<=k;i++)x=x*(n-k+i)/i;return x}
const p=1/16,hitProb=Array.from({length:7},(_,k)=>choose(6,k)*(p**k)*((1-p)**(6-k)));
const cdf=[];let acc=0;for(const q of hitProb){acc+=q;cdf.push(acc)}cdf[cdf.length-1]=1;
const sampleHits=r=>{for(let k=0;k<cdf.length;k++)if(r<cdf[k])return k;return 6};
function rng(seed){let x=seed>>>0;return()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return(x>>>0)/4294967296}}

const ticketsPerDraw=2;
const drawModels=hold.map(rec=>({cost:Number(rec.economics.ticketCost||1),payouts:Array.from({length:7},(_,h)=>payout(rec,h))}));
let exactExpectedReturn=0;
for(const d of drawModels){let perTicket=0;for(let h=0;h<=6;h++)perTicket+=hitProb[h]*d.payouts[h];exactExpectedReturn+=ticketsPerDraw*perTicket}
const exactExpectedROI=(exactExpectedReturn-modelStake)/modelStake;

const rois=new Float64Array(RUNS);let exceed=0,sum=0,sum2=0;
for(let s=0;s<RUNS;s++){
  const R=rng((0x51f15e5d^(s*2654435761))>>>0);let ret=0;
  for(const d of drawModels)for(let k=0;k<ticketsPerDraw;k++)ret+=d.payouts[sampleHits(R())];
  const roi=(ret-modelStake)/modelStake;rois[s]=roi;sum+=roi;sum2+=roi*roi;if(roi>=modelROI)exceed++;
}
const sorted=Array.from(rois).sort((a,b)=>a-b),q=x=>sorted[Math.min(sorted.length-1,Math.max(0,Math.floor(x*(sorted.length-1))))];
const mean=sum/RUNS,variance=Math.max(0,sum2/RUNS-mean*mean),sd=Math.sqrt(variance),pUpper=(exceed+1)/(RUNS+1);
const strong=modelROI>0&&pUpper<0.01;
const payload={
  generatedAt:new Date().toISOString(),gameId:'quinigol',version:'quinigol-holdout-montecarlo-audit-v1',mode:'POST_HOC_FIXED_HOLDOUT_SIGNIFICANCE_AUDIT',
  fixedStrategy:{window:320,ticketsPerDraw:2,selectionSource:'discovery-only tournament before holdout evaluation'},
  holdout:{draws:hold.length,stakeEUR:modelStake,returnEUR:modelReturn,plEUR:modelPL,roi:modelROI},
  randomModel:{positionMatchProbability:p,hitsDistribution:'Binomial(6, 1/16)',ticketsPerDraw,runs:RUNS,exactExpectedReturnEUR:exactExpectedReturn,exactExpectedROI,monteCarloMeanROI:mean,monteCarloSdROI:sd,roiQuantiles:{p50:q(.5),p90:q(.9),p95:q(.95),p99:q(.99),p999:q(.999),max:q(1)},runsAtOrAboveObserved:exceed,oneSidedEmpiricalPUpper:pUpper},
  interpretation:strong?'HOLDOUT_RETURN_IS_RARE_UNDER_MATCHED_RANDOM_MODEL_BUT_PROSPECTIVE_CONFIRMATION_REMAINS_MANDATORY':'HOLDOUT_RETURN_NOT_RARE_ENOUGH_UNDER_MATCHED_RANDOM_MODEL',
  gates:{positiveObservedROI:modelROI>0,descriptivePBelowOnePercent:pUpper<0.01,postHocAuditStrong:strong,prospectiveReplicationStillRequired:true,realMoneyPass:false},
  guards:{strategyNotRetuned:true,holdoutDatesUnchanged:true,officialSELAEEconomicsOnly:true,postHocTestSpecification:true,cannotPromoteByItself:true,automaticBettingAllowed:false,realMoneyAllowed:false,realStakeEUR:0}
};
fs.mkdirSync('loterias-ai/data/backtests',{recursive:true});fs.writeFileSync(OUT,JSON.stringify(payload,null,2)+'\n');console.log(JSON.stringify(payload,null,2));

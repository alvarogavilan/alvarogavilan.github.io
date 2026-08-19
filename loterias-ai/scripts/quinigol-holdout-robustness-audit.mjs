#!/usr/bin/env node
import fs from 'node:fs';

const ARCHIVE='loterias-ai/data/archive/quinigol';
const SOURCE='loterias-ai/data/backtests/quinigol-official-financial-tournament.json';
const OUT='loterias-ai/data/backtests/quinigol-holdout-robustness-audit.json';
const source=JSON.parse(fs.readFileSync(SOURCE,'utf8'));
if(source?.winner?.window!==320||source?.winner?.ticketsPerDraw!==2||source?.holdout?.draws!==207)throw new Error('fixed Quinigol holdout drift');

let rows=[];
for(const f of fs.readdirSync(ARCHIVE).filter(x=>/^\d{4}\.json$/.test(x)).sort())rows.push(...(JSON.parse(fs.readFileSync(`${ARCHIVE}/${f}`,'utf8')).records||[]));
rows=rows.filter(r=>r.drawDate&&r.economics?.validation?.officialSELAE&&Array.isArray(r.result?.codes)&&r.result.codes.length===6).sort((a,b)=>a.drawDate.localeCompare(b.drawDate));
const cut=Math.floor(rows.length*.7),prior=rows.slice(0,cut),hold=rows.slice(cut),buckets=['0','1','2','M'],codes=[];for(const a of buckets)for(const b of buckets)codes.push(`${a}-${b}`);
const payout=(rec,hits)=>{for(const c of rec.economics?.categories||[]){const l=String(c.label||'').toLowerCase();if(new RegExp(`(^|\\D)${hits}\\s*aciert`).test(l))return Number(c.prize||0)}return 0};
const predict=(hist,window)=>{const pos=Array.from({length:6},()=>Object.fromEntries(codes.map(c=>[c,1])));for(const r of hist.slice(-window))for(let i=0;i<6;i++){const c=String(r.result.codes[i]||'').toUpperCase();if(c in pos[i])pos[i][c]++}return pos.map(p=>Object.entries(p).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]))[0][0])};
const evalTicket=(rec,t)=>{let h=0;for(let i=0;i<6;i++)if(t[i]===String(rec.result.codes[i]).toUpperCase())h++;return{hits:h,ret:payout(rec,h)}};
const perDraw=[];
for(let i=0;i<hold.length;i++){
  const base=predict([...prior,...hold.slice(0,i)],320);let stake=0,ret=0,bestHits=0;
  for(let k=0;k<2;k++){const t=[...base];if(k>0){const idx=(i+k*3)%6;t[idx]=codes[(codes.indexOf(t[idx])+k+1)%codes.length]}const x=evalTicket(hold[i],t);stake+=Number(hold[i].economics.ticketCost||1);ret+=x.ret;bestHits=Math.max(bestHits,x.hits)}
  perDraw.push({drawDate:hold[i].drawDate,stakeEUR:stake,returnEUR:ret,plEUR:ret-stake,roi:stake?(ret-stake)/stake:null,bestHits});
}
const totalStake=perDraw.reduce((s,x)=>s+x.stakeEUR,0),totalReturn=perDraw.reduce((s,x)=>s+x.returnEUR,0),totalPL=totalReturn-totalStake,totalROI=totalPL/totalStake;
if(Math.abs(totalROI-Number(source.holdout.roi))>1e-12)throw new Error('reconstructed ROI mismatch');
const returnsSorted=[...perDraw].sort((a,b)=>b.returnEUR-a.returnEUR||a.drawDate.localeCompare(b.drawDate));
const shareTop=n=>totalReturn?returnsSorted.slice(0,n).reduce((s,x)=>s+x.returnEUR,0)/totalReturn:0;
const leaveOneOut=perDraw.map((x,i)=>{const stake=totalStake-x.stakeEUR,ret=totalReturn-x.returnEUR;return{removedDate:x.drawDate,removedReturnEUR:x.returnEUR,roi:(ret-stake)/stake}}).sort((a,b)=>a.roi-b.roi);
const blocks=[];for(let b=0;b<4;b++){const lo=Math.floor(b*perDraw.length/4),hi=Math.floor((b+1)*perDraw.length/4),arr=perDraw.slice(lo,hi),stake=arr.reduce((s,x)=>s+x.stakeEUR,0),ret=arr.reduce((s,x)=>s+x.returnEUR,0);blocks.push({block:b+1,firstDate:arr[0]?.drawDate||null,lastDate:arr.at(-1)?.drawDate||null,draws:arr.length,stakeEUR:stake,returnEUR:ret,plEUR:ret-stake,roi:stake?(ret-stake)/stake:null,profitableDraws:arr.filter(x=>x.plEUR>0).length})}
const positiveBlocks=blocks.filter(x=>x.roi>0).length,profitableDraws=perDraw.filter(x=>x.plEUR>0).length;
const payload={version:'quinigol-holdout-robustness-audit-v1',generatedAt:new Date().toISOString(),mode:'POST_HOC_FIXED_HOLDOUT_ROBUSTNESS_AUDIT',fixedStrategy:{window:320,ticketsPerDraw:2},holdout:{draws:perDraw.length,stakeEUR:totalStake,returnEUR:totalReturn,plEUR:totalPL,roi:totalROI,profitableDraws},concentration:{largestSingleDrawReturnEUR:returnsSorted[0]?.returnEUR||0,largestSingleDrawDate:returnsSorted[0]?.drawDate||null,top1ShareOfReturn:shareTop(1),top5ShareOfReturn:shareTop(5),top10ShareOfReturn:shareTop(10)},leaveOneOut:{minimumROI:leaveOneOut[0]?.roi??null,medianROI:leaveOneOut[Math.floor(leaveOneOut.length/2)]?.roi??null,maximumROI:leaveOneOut.at(-1)?.roi??null,worstRemoval:leaveOneOut[0]||null,positiveAfterEverySingleDrawRemoval:leaveOneOut.every(x=>x.roi>0)},chronologicalQuarterBlocks:blocks,positiveQuarterBlocks:positiveBlocks,descriptiveRobustness:{notSingleDrawDependent:leaveOneOut.every(x=>x.roi>0),atLeastTwoPositiveQuarterBlocks:positiveBlocks>=2,returnNotMajorityFromOneDraw:shareTop(1)<0.5},interpretation:'Descriptive robustness audit only. It cannot promote the model and does not replace the blinded prospective Shadow.',guards:{strategyNotRetuned:true,holdoutUnchanged:true,officialSELAEEconomicsOnly:true,postHocAudit:true,cannotPromoteByItself:true,automaticBettingAllowed:false,realMoneyAllowed:false,realStakeEUR:0}};
fs.writeFileSync(OUT,JSON.stringify(payload,null,2)+'\n');
console.log(JSON.stringify(payload,null,2));

/* Loterías AI — Batch Backfill Planner */
(function(root){
  'use strict';
  function yearRange(from,to){const out=[];for(let y=from;y<=to;y++)out.push(y);return out;}
  function buildPlan(gameId,fromYear,toYear,chunkYears){
    const years=yearRange(fromYear,toYear), size=Math.max(1,chunkYears||1), chunks=[];
    for(let i=0;i<years.length;i+=size){const ys=years.slice(i,i+size);chunks.push({gameId,fromYear:ys[0],toYear:ys[ys.length-1],status:'PENDING'});}return chunks;
  }
  function summarize(chunks){
    const rows=Array.isArray(chunks)?chunks:[];
    const by={PENDING:0,RUNNING:0,COMPLETE:0,GAPS:0,FAILED:0};
    rows.forEach(x=>{if(by[x.status]!==undefined)by[x.status]++;});
    return {total:rows.length,...by};
  }
  function mark(chunks,index,status,meta){return chunks.map((x,i)=>i===index?Object.assign({},x,{status},meta||{}):x);}
  root.LotteryBatchImport={buildPlan,summarize,mark};
})(typeof window!=='undefined'?window:globalThis);
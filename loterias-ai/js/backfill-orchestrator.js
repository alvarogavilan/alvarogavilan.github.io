/* Loterías AI — Backfill Orchestrator */
(function(root){'use strict';
function years(from,to){const a=[];for(let y=Number(to);y>=Number(from);y--)a.push(y);return a}
function plan(gameId,fromYear,toYear){return years(fromYear,toYear).map(y=>({id:`${gameId}-${y}`,gameId,year:y,status:'PENDING',fetched:0,validated:0,rejected:0,gaps:[],startedAt:null,finishedAt:null}))}
function summarize(batches){const b=Array.isArray(batches)?batches:[];return{batches:b.length,complete:b.filter(x=>x.status==='COMPLETE').length,gaps:b.filter(x=>x.status==='GAPS').length,failed:b.filter(x=>x.status==='FAILED').length,validated:b.reduce((s,x)=>s+(Number(x.validated)||0),0),rejected:b.reduce((s,x)=>s+(Number(x.rejected)||0),0)}}
function next(batches){return (Array.isArray(batches)?batches:[]).find(x=>['PENDING','GAPS','FAILED'].includes(x.status))||null}
function applyBatchResult(batch,result){const x=Object.assign({},batch);x.fetched=Number(result&&result.fetched)||0;x.validated=Number(result&&result.validated)||0;x.rejected=Number(result&&result.rejected)||0;x.gaps=Array.isArray(result&&result.gaps)?result.gaps:[];x.status=result&&result.error?'FAILED':x.gaps.length?'GAPS':'COMPLETE';x.finishedAt=new Date().toISOString();return x}
root.LotteryBackfill={plan,summarize,next,applyBatchResult};})(typeof window!=='undefined'?window:globalThis);
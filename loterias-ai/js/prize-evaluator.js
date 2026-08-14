/* Loterías AI — Generic Prize Evaluator */
(function(root){
  'use strict';
  const n=v=>Number(v);
  function hits(a,b){const s=new Set((b||[]).map(n));return (a||[]).map(n).filter(x=>s.has(x)).length;}
  function evaluateNumeric({ticket,draw,payoutTable}){
    if(!ticket||!draw||!payoutTable) throw new Error('ticket, draw and payoutTable required');
    const mainHits=hits(ticket.main||ticket.numbers,draw.main||draw.numbers);
    const secondaryHits=hits(ticket.secondary||ticket.stars||[],draw.secondary||draw.stars||[]);
    const complementaryHit=draw.complementary!=null && (ticket.main||ticket.numbers||[]).map(n).includes(n(draw.complementary));
    const reintegroHit=draw.reintegro!=null && ticket.reintegro!=null && n(ticket.reintegro)===n(draw.reintegro);
    const key=[mainHits,secondaryHits,complementaryHit?1:0,reintegroHit?1:0].join('|');
    const category=(payoutTable.categories||[]).find(c=>String(c.key)===key || (c.mainHits===mainHits && (c.secondaryHits==null||c.secondaryHits===secondaryHits) && (c.complementaryHit==null||!!c.complementaryHit===complementaryHit) && (c.reintegroHit==null||!!c.reintegroHit===reintegroHit)));
    return {mainHits,secondaryHits,complementaryHit,reintegroHit,category:category?.name||null,prize:Number(category?.prize||0),matched:!!category};
  }
  root.LotteryPrizeEvaluator={hits,evaluateNumeric};
})(typeof window!=='undefined'?window:globalThis);
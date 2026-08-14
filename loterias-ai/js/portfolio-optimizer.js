/* Loterías AI — Evidence-weighted portfolio optimizer */
(function(root){
  'use strict';
  function clamp(x,a,b){return Math.max(a,Math.min(b,x));}
  function scoreGame(g){
    const data=clamp(Number(g.dataQuality)||0,0,1);
    const sample=clamp(Math.log10(Math.max(1,Number(g.sampleSize)||1))/4,0,1);
    const stability=clamp(Number(g.modelStability)||0,0,1);
    const ci=Number(g.excessRoiCiLow);
    const excess=Number(g.excessRoi)||0;
    const shadow=Number(g.shadowRoi)||0;
    const dd=Math.abs(Number(g.maxDrawdown)||0);
    const evidenceGate=data>=0.9 && sample>=0.45 && stability>=0.65 && Number.isFinite(ci) && ci>0;
    const raw=(0.38*excess)+(0.18*shadow)+(0.16*stability)+(0.14*data)+(0.08*sample)-(0.06*dd);
    return {id:g.id,evidenceGate,score:raw,reason:evidenceGate?'eligible':'insufficient_evidence'};
  }
  function optimize(games,budget){
    const cap=Math.max(0,Number(budget)||0);
    const ranked=(Array.isArray(games)?games:[]).map(g=>Object.assign({},g,scoreGame(g))).sort((a,b)=>b.score-a.score);
    const eligible=ranked.filter(g=>g.evidenceGate && g.score>0 && Number(g.ticketCost)>0);
    if(!eligible.length||cap<=0) return {status:'NO_DEMONSTRATED_EDGE',budget:cap,allocated:0,positions:[],ranking:ranked};
    const positive=eligible.reduce((s,g)=>s+Math.max(0,g.score),0)||1;
    let remaining=cap; const positions=[];
    for(const g of eligible){
      const target=cap*(Math.max(0,g.score)/positive);
      const cost=Number(g.ticketCost);
      const maxEntries=Math.max(0,Math.floor(Math.min(target,remaining)/cost));
      if(maxEntries>0){positions.push({gameId:g.id,entries:maxEntries,unitCost:cost,simulatedCost:maxEntries*cost,score:g.score});remaining-=maxEntries*cost;}
    }
    return {status:positions.length?'RESEARCH_CANDIDATE':'NO_DEMONSTRATED_EDGE',budget:cap,allocated:cap-remaining,unallocated:remaining,positions,ranking:ranked};
  }
  root.LotteryPortfolioOptimizer={scoreGame,optimize};
})(typeof window!=='undefined'?window:globalThis);
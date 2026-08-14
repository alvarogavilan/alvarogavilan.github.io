/* Loterías AI — Daily Portfolio Planner */
(function(root){
  'use strict';
  function n(v,d=0){const x=Number(v);return Number.isFinite(x)?x:d;}
  function rank(c){
    return n(c.convictionScore)*0.45+n(c.excessRoiVsBaseline)*0.25+n(c.shadowLedgerRoi)*0.15+n(c.stabilityScore)*10*0.10-n(c.maxDrawdown)*0.05;
  }
  function chooseMode(game){
    if(game.supportsMultiple===true&&game.multipleEvidenceEligible===true&&n(game.edgePerEuroMultiple)>n(game.edgePerEuroSimple)) return 'MULTIPLE';
    return 'SIMPLE';
  }
  function plan({bankroll,candidates,minReserveFraction=.5,maxDailyFraction=.2}){
    const b=Math.max(0,n(bankroll));
    const reserve=Math.max(0,b*minReserveFraction);
    const deployable=Math.max(0,Math.min(b-reserve,b*maxDailyFraction));
    const eligible=(candidates||[]).filter(c=>c.realMoneyEligible===true&&n(c.convictionScore)>=85&&n(c.unitCost)>0).sort((a,b)=>rank(b)-rank(a));
    if(!eligible.length||deployable<=0)return {status:'NO_REAL_MONEY_PLAY',bankroll:b,deployable:0,reserve:b,allocations:[],reason:'No game passes every hard evidence gate.'};
    const scores=eligible.map(c=>Math.max(0.0001,rank(c)));const total=scores.reduce((a,b)=>a+b,0);let spent=0;const allocations=[];
    eligible.forEach((c,i)=>{const target=deployable*(scores[i]/total);const entries=Math.max(0,Math.floor(target/n(c.unitCost)));const cost=entries*n(c.unitCost);if(entries>0){spent+=cost;allocations.push({gameId:c.gameId,convictionScore:n(c.convictionScore),mode:chooseMode(c),entries,cost,unitCost:n(c.unitCost),rankScore:Number(scores[i].toFixed(3))});}});
    return {status:allocations.length?'REAL_MONEY_ELIGIBLE':'NO_REAL_MONEY_PLAY',bankroll:b,deployable:Number(spent.toFixed(2)),reserve:Number((b-spent).toFixed(2)),allocations};
  }
  root.LotteryPerfectPlay={plan};
})(typeof window!=='undefined'?window:globalThis);
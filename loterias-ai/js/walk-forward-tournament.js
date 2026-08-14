/* Loterías AI — Walk-Forward Strategy Tournament
 * Compares multiple strategy configurations without future leakage.
 */
(function(root){
  'use strict';
  const hit=(a,b)=>{const s=new Set(b||[]);return (a||[]).filter(x=>s.has(x)).length;};
  const mean=a=>a.length?a.reduce((s,x)=>s+x,0)/a.length:0;
  const sd=a=>{if(a.length<2)return 0;const m=mean(a);return Math.sqrt(a.reduce((s,x)=>s+(x-m)*(x-m),0)/(a.length-1));};
  const stderr=a=>a.length?sd(a)/Math.sqrt(a.length):0;
  function run(opts){
    opts=opts||{};const draws=(opts.draws||[]).slice().sort((a,b)=>String(a.drawDate||a.drawId).localeCompare(String(b.drawDate||b.drawId)));
    const game=opts.game,min=Math.max(1,Number(opts.minHistory||game?.minHistory||1));const configs=opts.strategies||[];
    if(!root.LotteryMegaNumericEngine) throw new Error('LotteryMegaNumericEngine required');
    const results=configs.map((cfg,idx)=>({id:cfg.id||`strategy-${idx+1}`,config:cfg,rows:[]}));
    for(let i=min;i<draws.length;i++){
      const training=draws.slice(0,i).map(d=>d.numbers);const target=draws[i];
      results.forEach(r=>{
        const p=root.LotteryMegaNumericEngine.portfolio(training,game,{tickets:cfgTickets(r.config),weights:r.config.weights,diversificationPenalty:r.config.diversificationPenalty});
        const tickets=p.tickets||[];const hs=tickets.map(t=>hit(t.numbers,target.numbers));
        r.rows.push({drawId:target.drawId,drawDate:target.drawDate,trainingSize:i,hits:hs,bestHits:Math.max(0,...hs),averageHits:mean(hs)});
      });
    }
    const ranked=results.map(r=>{
      const best=r.rows.map(x=>x.bestHits),avg=r.rows.map(x=>x.averageHits);const m=mean(avg),se=stderr(avg),lo=m-1.96*se,hi=m+1.96*se;
      return {id:r.id,config:r.config,drawsEvaluated:r.rows.length,averageHits:m,bestTicketAverageHits:mean(best),confidence95:{lower:lo,upper:hi},hitRateAtLeast2:r.rows.length?r.rows.filter(x=>x.bestHits>=2).length/r.rows.length:0,hitRateAtLeast3:r.rows.length?r.rows.filter(x=>x.bestHits>=3).length/r.rows.length:0,rows:r.rows};
    }).sort((a,b)=>b.averageHits-a.averageHits||b.hitRateAtLeast3-a.hitRateAtLeast3);
    return {status:ranked.length?'complete':'no_strategies',methodology:'walk-forward-strategy-tournament-v1',leakageGuard:'Each historical prediction uses only draws strictly earlier than its target.',strategies:ranked,winner:ranked[0]||null};
  }
  function cfgTickets(c){return Math.max(1,Math.floor(Number(c?.tickets||1)));}
  function defaultStrategies(){return [
    {id:'balanced',tickets:5,weights:{longFrequency:.20,shortMomentum:.15,gap:.15,stability:.15,pairAffinity:.10,entropy:.10,meanReversion:.15}},
    {id:'frequency-heavy',tickets:5,weights:{longFrequency:.35,shortMomentum:.25,gap:.05,stability:.15,pairAffinity:.08,entropy:.05,meanReversion:.07}},
    {id:'gap-heavy',tickets:5,weights:{longFrequency:.10,shortMomentum:.10,gap:.35,stability:.15,pairAffinity:.08,entropy:.07,meanReversion:.15}},
    {id:'stability-heavy',tickets:5,weights:{longFrequency:.15,shortMomentum:.10,gap:.10,stability:.35,pairAffinity:.08,entropy:.07,meanReversion:.15}},
    {id:'cooccurrence-heavy',tickets:5,weights:{longFrequency:.12,shortMomentum:.10,gap:.08,stability:.15,pairAffinity:.30,entropy:.10,meanReversion:.15}}
  ];}
  root.LotteryWalkForwardTournament={run,defaultStrategies};
})(typeof window!=='undefined'?window:globalThis);
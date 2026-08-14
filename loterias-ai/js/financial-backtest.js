/* Loterías AI — Financial Walk-Forward Backtest
 * Simulates what the system would have done BEFORE each historical draw.
 * Never permits future leakage. Prize/cost data must be supplied from verified historical rules.
 */
(function(root){
  'use strict';
  const num=v=>Number.isFinite(Number(v))?Number(v):0;
  const round2=v=>Math.round((num(v)+Number.EPSILON)*100)/100;

  function run(opts){
    opts=opts||{};
    const draws=(opts.draws||[]).slice().sort((a,b)=>String(a.drawDate).localeCompare(String(b.drawDate)));
    const minHistory=Math.max(1,num(opts.minHistory||0));
    const ticketsPerDraw=Math.max(1,Math.floor(num(opts.ticketsPerDraw||1)));
    if(typeof opts.generateTickets!=='function') throw new Error('generateTickets callback required');
    if(typeof opts.priceForDraw!=='function') throw new Error('verified priceForDraw callback required');
    if(typeof opts.prizeForTicket!=='function') throw new Error('verified prizeForTicket callback required');
    const rows=[];
    let cumulativeStake=0,cumulativePrize=0,bankroll=num(opts.openingBankroll||0),peak=bankroll,maxDrawdown=0;

    for(let i=minHistory;i<draws.length;i++){
      const target=draws[i];
      const training=draws.slice(0,i); // STRICTLY BEFORE TARGET
      const generated=opts.generateTickets({training,targetMeta:{drawId:target.drawId,drawDate:target.drawDate},ticketsPerDraw});
      const tickets=Array.isArray(generated)?generated.slice(0,ticketsPerDraw):[];
      if(!tickets.length) continue;
      const unitCost=num(opts.priceForDraw(target));
      if(!(unitCost>0)) throw new Error('Missing/invalid verified historical ticket price for '+target.drawId);
      let drawPrize=0;
      const scored=tickets.map(ticket=>{
        const prize=num(opts.prizeForTicket({ticket,draw:target}));
        drawPrize+=prize;
        return {ticket,prize:round2(prize)};
      });
      const stake=round2(unitCost*tickets.length);
      drawPrize=round2(drawPrize);
      const profit=round2(drawPrize-stake);
      cumulativeStake=round2(cumulativeStake+stake);
      cumulativePrize=round2(cumulativePrize+drawPrize);
      bankroll=round2(bankroll+profit);
      peak=Math.max(peak,bankroll);
      const dd=peak>0?(peak-bankroll)/peak:0;
      maxDrawdown=Math.max(maxDrawdown,dd);
      rows.push({drawId:target.drawId,drawDate:target.drawDate,trainingSize:i,tickets:scored,unitCost,stake,prize:drawPrize,profit,bankroll,drawdown:dd});
    }

    const pnl=round2(cumulativePrize-cumulativeStake);
    const roi=cumulativeStake?cumulativePrize/cumulativeStake-1:0;
    const profitableDraws=rows.filter(r=>r.profit>0).length;
    return {
      status:rows.length?'complete':'insufficient_history',
      methodology:'financial-walk-forward-v1',
      drawsEvaluated:rows.length,
      openingBankroll:round2(opts.openingBankroll||0),
      closingBankroll:round2(bankroll),
      totalStake:cumulativeStake,totalPrize:cumulativePrize,pnl,
      roi,profitableDrawRate:rows.length?profitableDraws/rows.length:0,
      maxDrawdown,
      leakageGuard:'For every target draw, ticket generation receives only draws strictly earlier than that target.',
      rows
    };
  }

  function compare(model,baseline){
    if(!model||!baseline) return {status:'invalid'};
    return {
      status:'complete',
      modelRoi:num(model.roi),baselineRoi:num(baseline.roi),
      excessRoi:num(model.roi)-num(baseline.roi),
      modelPnl:num(model.pnl),baselinePnl:num(baseline.pnl),
      modelMaxDrawdown:num(model.maxDrawdown),baselineMaxDrawdown:num(baseline.maxDrawdown),
      modelClosingBankroll:num(model.closingBankroll),baselineClosingBankroll:num(baseline.closingBankroll)
    };
  }

  root.LotteryFinancialBacktest={run,compare};
})(typeof window!=='undefined'?window:globalThis);
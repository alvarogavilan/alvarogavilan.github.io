/* Loterías AI — Treasury Engine */
(function(root){
  'use strict';
  function n(x){ const v=Number(x); return Number.isFinite(v)?v:0; }
  function round2(x){ return Math.round((n(x)+Number.EPSILON)*100)/100; }
  function initialState(bankroll){ const b=round2(bankroll); return {initialBankroll:b,bankroll:b,totalSpent:0,totalReturned:0,realizedPnL:0,peakBankroll:b,maxDrawdownPct:0,entries:[]}; }
  function apply(state,event){
    const s=JSON.parse(JSON.stringify(state));
    if(!event||!event.type) throw new Error('invalid_event');
    if(event.type==='STAKE_CONFIRMED'){
      const amount=round2(event.amount); if(amount<=0) throw new Error('invalid_stake'); if(amount>s.bankroll) throw new Error('insufficient_bankroll');
      s.bankroll=round2(s.bankroll-amount); s.totalSpent=round2(s.totalSpent+amount);
    } else if(event.type==='RETURN_VERIFIED' || event.type==='PRIZE_VERIFIED'){
      const amount=round2(event.amount); if(amount<0) throw new Error('invalid_return');
      s.bankroll=round2(s.bankroll+amount); s.totalReturned=round2(s.totalReturned+amount);
    } else if(event.type==='MANUAL_ADJUSTMENT'){
      const amount=round2(event.amount); s.bankroll=round2(s.bankroll+amount);
    } else throw new Error('unsupported_event');
    s.realizedPnL=round2(s.totalReturned-s.totalSpent);
    s.peakBankroll=Math.max(n(s.peakBankroll),s.bankroll);
    const dd=s.peakBankroll?Math.max(0,(s.peakBankroll-s.bankroll)/s.peakBankroll*100):0;
    s.maxDrawdownPct=Math.max(n(s.maxDrawdownPct),round2(dd));
    s.entries.push(Object.assign({},event,{appliedAt:new Date().toISOString(),bankrollAfter:s.bankroll}));
    return s;
  }
  function maxDeployable(bankroll,reservePct){
    const b=Math.max(0,n(bankroll)); const r=Math.min(100,Math.max(0,n(reservePct)))/100;
    return round2(b*(1-r));
  }
  function daily(entries){
    const out={};
    for(const e of Array.isArray(entries)?entries:[]){
      const day=String(e.timestamp||e.appliedAt||'unknown').slice(0,10);
      out[day] ||= {spent:0,returned:0,pnl:0};
      if(e.type==='STAKE_CONFIRMED') out[day].spent=round2(out[day].spent+Math.abs(n(e.amount)));
      if(e.type==='RETURN_VERIFIED'||e.type==='PRIZE_VERIFIED') out[day].returned=round2(out[day].returned+Math.abs(n(e.amount)));
      out[day].pnl=round2(out[day].returned-out[day].spent);
    }
    return out;
  }
  function summary(s,reservePct){
    const reserve=Math.min(s.bankroll,round2(s.bankroll*(Math.max(0,n(reservePct))/100)));
    return {bankroll:round2(s.bankroll),totalSpent:round2(s.totalSpent),totalReturned:round2(s.totalReturned),realizedPnL:round2(s.realizedPnL),roiPct:s.totalSpent?round2(s.realizedPnL/s.totalSpent*100):0,maxDrawdownPct:round2(s.maxDrawdownPct),reserveCash:reserve,maxDeployable:maxDeployable(s.bankroll,reservePct),daily:daily(s.entries)};
  }
  root.LotteryTreasury={initialState,apply,summary,maxDeployable,daily};
})(typeof window!=='undefined'?window:globalThis);
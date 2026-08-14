/* Loterías AI — Mega Numeric Engine v2
 * Multi-signal ranking with per-number audit trail.
 * Signals describe historical structure; none imply a number is causally "due".
 */
(function(root){
  'use strict';
  const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
  const mean=a=>a.length?a.reduce((s,x)=>s+x,0)/a.length:0;
  const sd=a=>{if(a.length<2)return 0;const m=mean(a);return Math.sqrt(a.reduce((s,x)=>s+(x-m)*(x-m),0)/(a.length-1));};
  function normDraw(d,max){return (Array.isArray(d)?d:[]).map(Number).filter(n=>Number.isInteger(n)&&n>=1&&n<=max);}
  function windows(history){const n=history.length;return {all:history,recent20:history.slice(Math.max(0,n-20)),recent50:history.slice(Math.max(0,n-50)),recent100:history.slice(Math.max(0,n-100))};}
  function counts(history,max){const c=Array(max+1).fill(0);history.forEach(d=>normDraw(d,max).forEach(n=>c[n]++));return c;}
  function lastGap(history,max,n){for(let i=history.length-1;i>=0;i--) if(normDraw(history[i],max).includes(n)) return history.length-1-i;return history.length;}
  function pairAffinity(history,max,n){const co=Array(max+1).fill(0);let seen=0;history.forEach(d=>{const a=normDraw(d,max);if(a.includes(n)){seen++;a.forEach(x=>{if(x!==n)co[x]++;});}});const vals=co.slice(1).filter((_,i)=>i+1!==n);return seen?Math.max(...vals,0)/seen:0;}
  function entropyContribution(history,max,n){const c=counts(history,max);const total=c.slice(1).reduce((a,b)=>a+b,0)||1;const p=c[n]/total;return p>0?-p*Math.log(p):0;}
  function zFromCounts(c,max,n){const vals=c.slice(1);const m=mean(vals),s=sd(vals);return s?(c[n]-m)/s:0;}
  function toUnitZ(z){return 0.5+0.5*Math.tanh(z/2);}
  function analyzeNumbers(history,max,weights){
    const w=Object.assign({longFrequency:.20,shortMomentum:.15,gap:.15,stability:.15,pairAffinity:.10,entropy:.10,meanReversion:.15},weights||{});
    const ws=windows(history),cAll=counts(ws.all,max),c20=counts(ws.recent20,max),c50=counts(ws.recent50,max),c100=counts(ws.recent100,max);
    const gaps=Array.from({length:max},(_,i)=>lastGap(history,max,i+1));const gapMax=Math.max(1,...gaps);
    const rows=[];
    for(let n=1;n<=max;n++){
      const zAll=zFromCounts(cAll,max,n),z20=zFromCounts(c20,max,n),z50=zFromCounts(c50,max,n),z100=zFromCounts(c100,max,n);
      const longFrequency=toUnitZ(zAll);
      const shortMomentum=clamp(0.6*toUnitZ(z20)+0.4*toUnitZ(z50));
      const gap=clamp(lastGap(history,max,n)/gapMax);
      const stability=clamp(1-(Math.abs(z20-z50)+Math.abs(z50-z100)+Math.abs(z100-zAll))/8);
      const affinity=clamp(pairAffinity(history,max,n));
      const entropy=clamp(entropyContribution(history,max,n)*8);
      const meanReversion=clamp(1-Math.abs(toUnitZ(zAll)-0.5)*2);
      const signals={longFrequency,shortMomentum,gap,stability,pairAffinity:affinity,entropy,meanReversion};
      const score=Object.entries(w).reduce((s,[k,v])=>s+(signals[k]||0)*Number(v||0),0)/(Object.values(w).reduce((a,b)=>a+Number(b||0),0)||1);
      rows.push({number:n,score,signals,raw:{countAll:cAll[n],count20:c20[n],count50:c50[n],count100:c100[n],gapDraws:lastGap(history,max,n),zAll,z20,z50,z100},explanation:[
        `Ha aparecido ${cAll[n]} veces en ${history.length} sorteos del histórico usado.`,
        `En las últimas 20 observaciones aparece ${c20[n]} veces y en las últimas 50, ${c50[n]}.`,
        `Lleva ${lastGap(history,max,n)} sorteos sin aparecer.`,
        `Estabilidad temporal del patrón: ${(stability*100).toFixed(1)}%.`,
        `Score compuesto del modelo: ${(score*100).toFixed(1)}/100.`
      ]});
    }
    return rows.sort((a,b)=>b.score-a.score||a.number-b.number);
  }
  function portfolio(history,game,opts){
    opts=opts||{};const max=game?.main?.max||0,pick=game?.main?.pick||0,tickets=Math.max(1,Math.floor(opts.tickets||1));
    if(!max||!pick) return {status:'unsupported'};
    const ranked=analyzeNumbers(history,max,opts.weights);const out=[];const usage=new Map();
    for(let t=0;t<tickets;t++){
      const scored=ranked.map(r=>({r,adjusted:r.score-(usage.get(r.number)||0)*(opts.diversificationPenalty??0.08)})).sort((a,b)=>b.adjusted-a.adjusted||a.r.number-b.r.number);
      const chosen=scored.slice(0,pick).map(x=>x.r).sort((a,b)=>a.number-b.number);chosen.forEach(x=>usage.set(x.number,(usage.get(x.number)||0)+1));
      out.push({numbers:chosen.map(x=>x.number),numberEvidence:chosen.map(x=>({number:x.number,score:x.score,signals:x.signals,raw:x.raw,explanation:x.explanation}))});
    }
    return {status:'candidate',methodologyVersion:'mega-numeric-v2',historyCount:history.length,tickets:out,rankedNumbers:ranked,truth:'Historical frequency, gaps and co-occurrence are descriptive signals. They do not make a number objectively due; only walk-forward outperformance may justify predictive weight.'};
  }
  root.LotteryMegaNumericEngine={analyzeNumbers,portfolio};
})(typeof window!=='undefined'?window:globalThis);
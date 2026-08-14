(function(){
  'use strict';

  function intersectionCount(a,b){
    const s=new Set(b||[]);
    return (a||[]).filter(x=>s.has(x)).length;
  }

  function normalizeHistory(draws){
    return (draws||[])
      .filter(d=>d&&Array.isArray(d.numbers)&&d.drawId)
      .map(d=>({drawId:String(d.drawId),numbers:d.numbers.map(Number).filter(Number.isFinite),extras:Array.isArray(d.extras)?d.extras.map(Number).filter(Number.isFinite):[]}));
  }

  function walkForward(game,draws,opts){
    opts=opts||{};
    if(!window.LoteriasAI) throw new Error('LoteriasAI engine required');
    const history=normalizeHistory(draws);
    const min=Math.max(game.minHistory||0,opts.minHistory||0);
    const rows=[];
    for(let i=min;i<history.length;i++){
      const training=history.slice(0,i).map(d=>d.numbers);
      const target=history[i];
      const candidate=window.LoteriasAI.analyze(game,training,{drawId:target.drawId});
      if(candidate.status!=='candidate') continue;
      rows.push({
        drawId:target.drawId,
        trainingSize:i,
        candidate:candidate.numbers,
        actual:target.numbers,
        hits:intersectionCount(candidate.numbers,target.numbers),
        modelScore:candidate.modelScore,
        methodologyVersion:candidate.methodologyVersion
      });
    }
    const distribution={};
    rows.forEach(r=>distribution[r.hits]=(distribution[r.hits]||0)+1);
    const totalHits=rows.reduce((s,r)=>s+r.hits,0);
    return {
      game:game.id,
      status: rows.length ? 'complete' : 'insufficient_history',
      methodology:'walk-forward-v1',
      drawsEvaluated:rows.length,
      firstEvaluation:rows[0]?.drawId||null,
      lastEvaluation:rows.at(-1)?.drawId||null,
      averageMainHits:rows.length?totalHits/rows.length:0,
      hitDistribution:distribution,
      leakageGuard:'Each prediction uses only draws strictly earlier than the target draw.',
      rows
    };
  }

  function randomBaseline(game,draws,seedBase){
    const h=normalizeHistory(draws);
    const pick=game?.main?.pick||0,max=game?.main?.max||0;
    if(!pick||!max) return {status:'unsupported'};
    function hash(s){let x=2166136261;for(let i=0;i<s.length;i++){x^=s.charCodeAt(i);x=Math.imul(x,16777619)}return x>>>0}
    function rng(seed){let x=seed>>>0;return()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return((x>>>0)%1e6)/1e6}}
    const rows=h.map(d=>{
      const r=rng(hash((seedBase||'baseline')+'|'+game.id+'|'+d.drawId));
      const pool=Array.from({length:max},(_,i)=>i+1),sel=[];
      while(sel.length<pick){const idx=Math.floor(r()*pool.length);sel.push(pool.splice(idx,1)[0])}
      sel.sort((a,b)=>a-b);
      return {drawId:d.drawId,hits:intersectionCount(sel,d.numbers),candidate:sel,actual:d.numbers};
    });
    return {status:'complete',drawsEvaluated:rows.length,averageMainHits:rows.length?rows.reduce((s,x)=>s+x.hits,0)/rows.length:0,rows};
  }

  window.LoteriasAIBacktest={walkForward,randomBaseline,intersectionCount};
})();
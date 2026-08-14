(function(){
  'use strict';

  function choose(n,k){
    if(k<0||n<0||k>n) return 0;
    k=Math.min(k,n-k);
    let r=1;
    for(let i=1;i<=k;i++) r=r*(n-k+i)/i;
    return Math.round(r);
  }

  function totalCombinations(game){
    if(game.family==='number5') return game.main.max;
    if(game.family!=='numeric') return null;
    let total=choose(game.main.max,game.main.pick);
    if(game.extra){
      const em=game.extra.max;
      const ep=game.extra.pick;
      total*=choose(em,ep);
    }
    return total;
  }

  function normalizeDraw(draw){
    return Array.isArray(draw) ? draw.map(Number).filter(Number.isFinite) : [];
  }

  function frequency(history,max){
    const counts=Array(max+1).fill(0);
    history.forEach(d=>normalizeDraw(d).forEach(n=>{if(n>=1&&n<=max) counts[n]++;}));
    return counts;
  }

  function gaps(history,max){
    const out=Array(max+1).fill(history.length);
    for(let n=1;n<=max;n++){
      for(let i=history.length-1;i>=0;i--){
        if(normalizeDraw(history[i]).includes(n)){out[n]=history.length-1-i;break;}
      }
    }
    return out;
  }

  function scoreNumbers(history,max){
    const freq=frequency(history,max);
    const gap=gaps(history,max);
    const expected=(history.length||1)/max;
    const values=[];
    for(let n=1;n<=max;n++){
      const fz=(freq[n]-expected)/Math.sqrt(Math.max(expected,1));
      const gz=Math.log1p(gap[n]);
      const shrink=fz/(1+Math.abs(fz));
      const score=0.58*shrink+0.42*(gz/(1+gz));
      values.push({n,score,freq:freq[n],gap:gap[n]});
    }
    return values.sort((a,b)=>b.score-a.score||a.n-b.n);
  }

  function seededRandom(seed){
    let x=seed>>>0;
    return function(){
      x^=x<<13; x^=x>>>17; x^=x<<5;
      return ((x>>>0)%1000000)/1000000;
    };
  }

  function hashString(s){
    let h=2166136261;
    for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}
    return h>>>0;
  }

  function weightedPick(ranked,pick,seed){
    const rnd=seededRandom(seed);
    const pool=ranked.slice(0,Math.max(pick*5,18));
    const selected=[];
    while(selected.length<pick&&pool.length){
      const weights=pool.map((x,i)=>Math.max(0.05,1.25-x.score*0.15-i/pool.length*0.35));
      const sum=weights.reduce((a,b)=>a+b,0);
      let t=rnd()*sum,idx=0;
      for(;idx<weights.length-1;idx++){t-=weights[idx];if(t<=0)break;}
      selected.push(pool[idx].n); pool.splice(idx,1);
    }
    return selected.sort((a,b)=>a-b);
  }

  function structureScore(nums,max){
    const evens=nums.filter(n=>n%2===0).length;
    const oddBalance=1-Math.abs(evens-nums.length/2)/(nums.length/2||1);
    const sorted=[...nums].sort((a,b)=>a-b);
    let consecutive=0;
    for(let i=1;i<sorted.length;i++) if(sorted[i]-sorted[i-1]===1) consecutive++;
    const span=(sorted.at(-1)-sorted[0])/(max-1||1);
    const spanScore=1-Math.abs(span-.62);
    return Math.max(0,Math.min(1,0.45*oddBalance+0.35*spanScore+0.20*(1-Math.min(1,consecutive/2))));
  }

  function analyze(game,history,opts){
    opts=opts||{};
    const min=game.minHistory||0;
    if(!Array.isArray(history)||history.length<min){
      return {status:'insufficient_history',game:game.id,historyCount:Array.isArray(history)?history.length:0,minHistory:min,totalCombinations:totalCombinations(game)};
    }
    if(game.family!=='numeric') return {status:'unsupported_family',game:game.id};
    const ranked=scoreNumbers(history,game.main.max);
    const dateKey=opts.drawId||new Date().toISOString().slice(0,10);
    const seed=hashString(game.id+'|'+dateKey+'|'+history.length+'|v1');
    const numbers=weightedPick(ranked,game.main.pick,seed);
    const ss=structureScore(numbers,game.main.max);
    const modelScore=Math.round((0.55*ss+0.45*Math.min(1,history.length/Math.max(min*4,1)))*100);
    return {
      status:'candidate',
      game:game.id,
      generatedAt:new Date().toISOString(),
      drawId:dateKey,
      historyCount:history.length,
      numbers,
      modelScore,
      totalCombinations:totalCombinations(game),
      impliedJackpotProbability: totalCombinations(game)?1/totalCombinations(game):null,
      methodologyVersion:'numeric-v1',
      disclaimer:'El score es interno al modelo y no cambia la probabilidad matemática fundamental del sorteo.'
    };
  }

  window.LoteriasAI={choose,totalCombinations,frequency,gaps,scoreNumbers,analyze};
})();
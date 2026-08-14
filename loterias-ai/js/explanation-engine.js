/* Loterías AI — Explanation Engine */
(function(root){
  'use strict';
  function pct(v){const n=Number(v);return Number.isFinite(n)?Math.round(n*10000)/100:null;}
  function explain(input){
    const x=input||{};
    const signals=[];
    const add=(id,label,value,weight,status,note)=>signals.push({id,label,value,weight,status,note});
    add('history','Histórico validado',x.historyScore??null,x.weights?.history??0,x.historyEligible?'ACTIVE':'BLOCKED',x.historyEligible?'Usa únicamente sorteos validados anteriores al objetivo.':'Sin muestra histórica suficiente para atribuir ventaja.');
    add('frequency','Frecuencias y gaps',x.frequencyScore??null,x.weights?.frequency??0,x.historyEligible?'ACTIVE':'BLOCKED','Describe distribución histórica; no implica que un número esté “debido”.');
    add('portfolio','Diversificación de cartera',x.diversificationScore??null,x.weights?.diversification??0,'ACTIVE','Reduce solapamiento entre nuestras propias combinaciones; no cambia la probabilidad de cada combinación individual.');
    add('backtest','Backtest walk-forward',x.backtestScore??null,x.weights?.backtest??0,x.backtestEligible?'ACTIVE':'BLOCKED',x.backtestEligible?'Resultado fuera de muestra frente a baseline reproducible.':'Aún no existe evidencia walk-forward suficiente.');
    add('shadow','Shadow Ledger',x.shadowScore??null,x.weights?.shadow??0,x.shadowEligible?'ACTIVE':'BLOCKED',x.shadowEligible?'Predicciones selladas antes del sorteo.':'Muestra prospectiva insuficiente.');
    add('market','Contexto de premio/coste',x.valueScore??null,x.weights?.value??0,x.valueEligible?'ACTIVE':'INFORMATIONAL','Compara coste y estructura de premios; no altera la aleatoriedad del sorteo.');
    const active=signals.filter(s=>s.status==='ACTIVE');
    const weighted=active.reduce((a,s)=>a+(Number(s.value)||0)*(Number(s.weight)||0),0);
    const weight=active.reduce((a,s)=>a+(Number(s.weight)||0),0);
    const modelScore=weight?weighted/weight:null;
    return {
      gameId:x.gameId||null,
      combination:x.combination||null,
      modelScore:pct(modelScore),
      evidenceLevel:x.evidenceLevel||'RESEARCH_ONLY',
      signals,
      foundation:x.foundation||[],
      limitations:x.limitations||[
        'En un sorteo aleatorio, cualquier combinación válida conserva la misma probabilidad matemática base salvo reglas específicas del juego.',
        'Frecuencia histórica y retraso no demuestran causalidad predictiva.',
        'El score del modelo mide respaldo del proceso, no probabilidad garantizada de premio.'
      ]
    };
  }
  root.LotteryExplanationEngine={explain};
})(typeof window!=='undefined'?window:globalThis);
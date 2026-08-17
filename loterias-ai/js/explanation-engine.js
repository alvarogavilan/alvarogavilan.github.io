/* Loterías AI — Explanation Engine */
(function(root){
  'use strict';

  const MISS_CAUSES=new Set([
    'irreducible_randomness',
    'calibration_error',
    'model_miss',
    'hypothesis_falsified',
    'insufficient_signal',
    'data_quality_issue',
    'execution_issue',
    'unknown'
  ]);

  function pct(v){const n=Number(v);return Number.isFinite(n)?Math.round(n*10000)/100:null;}
  function text(v){return typeof v==='string'&&v.trim()?v.trim():null;}
  function finite(v){const n=Number(v);return Number.isFinite(n)?n:null;}
  function arr(v){return Array.isArray(v)?v.filter(Boolean):[];}

  function explainNumber(n){
    const raw=n?.raw||{},signals=n?.signals||{};
    return {
      number:n?.number??null,
      score:pct(n?.score),
      facts:{
        historicalAppearances:raw.countAll??null,
        recent20:raw.count20??null,
        recent50:raw.count50??null,
        recent100:raw.count100??null,
        gapDraws:raw.gapDraws??null
      },
      signals:Object.fromEntries(Object.entries(signals).map(([k,v])=>[k,pct(v)])),
      explanation:Array.isArray(n?.explanation)?n.explanation:[],
      interpretation:'Estas métricas explican por qué el modelo puntúa el número; no significan por sí solas que esté “debido”. Solo el rendimiento walk-forward puede convertir una señal descriptiva en evidencia predictiva.'
    };
  }

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
      hypothesisId:x.hypothesisId||null,
      hypothesis:text(x.hypothesis),
      decisionRationale:text(x.decisionRationale),
      expectedSignal:text(x.expectedSignal),
      evidenceWindow:x.evidenceWindow||null,
      trainingCutoff:x.trainingCutoff||null,
      signals,
      perNumberEvidence:(x.numberEvidence||[]).map(explainNumber),
      foundation:x.foundation||[],
      limitations:x.limitations||[
        'En un sorteo aleatorio, cualquier combinación válida conserva la misma probabilidad matemática base salvo reglas específicas del juego.',
        'Frecuencia histórica y retraso no demuestran causalidad predictiva.',
        'Una frase como “hoy debe salir” solo puede aparecer como interpretación del modelo cuando una regla concreta haya demostrado rendimiento fuera de muestra; nunca como certeza matemática.',
        'El score del modelo mide respaldo del proceso, no probabilidad garantizada de premio.'
      ]
    };
  }

  function diagnoseMiss(input){
    const x=input||{};
    const declared=text(x.cause);
    const cause=MISS_CAUSES.has(declared)?declared:'unknown';
    const evidence=arr(x.evidenceForDiagnosis||x.evidence);
    const causalClaimSupported=x.causalClaimSupported===true && cause!=='unknown' && evidence.length>0;
    return {
      cause:causalClaimSupported?cause:'unknown',
      causalClaimSupported,
      whyMissed:causalClaimSupported?text(x.whyMissed):null,
      evidenceForDiagnosis:evidence,
      guardrail:causalClaimSupported
        ? 'Diagnóstico causal respaldado por evidencia registrada.'
        : 'No existe evidencia suficiente para atribuir causalmente el fallo. Se registra como unknown y no se inventa una explicación retrospectiva.'
    };
  }

  function postMortem(input){
    const x=input||{};
    const official=x.officialResult||null;
    const hits=finite(x.hits);
    const maxHits=finite(x.maxHits);
    const won=typeof x.won==='boolean'?x.won:(hits!==null&&maxHits!==null?hits>=maxHits:false);
    const diagnosis=won?{
      cause:null,
      causalClaimSupported:false,
      whyMissed:null,
      evidenceForDiagnosis:[],
      guardrail:'No aplica diagnóstico de fallo porque el objetivo registrado fue alcanzado.'
    }:diagnoseMiss(x.diagnosis||x);

    return {
      schemaVersion:'scientific-postmortem-v1',
      gameId:x.gameId||x.game||null,
      drawId:x.drawId||x.jornada||null,
      drawDate:x.drawDate||null,
      frozenAt:x.frozenAt||null,
      settledAt:x.settledAt||null,
      modelVersion:x.modelVersion||null,
      hypothesisId:x.hypothesisId||null,
      hypothesis:text(x.hypothesis),
      decisionRationale:text(x.decisionRationale),
      expectedSignal:text(x.expectedSignal),
      trainingCutoff:x.trainingCutoff||null,
      frozenSelection:x.frozenSelection||x.combination||null,
      officialResult:official,
      hits,
      maxHits,
      won,
      mode:x.mode||'PAPER',
      cost:finite(x.cost),
      prize:finite(x.prize),
      pnl:finite(x.pnl),
      roi:finite(x.roi),
      whatWasRight:arr(x.whatWasRight),
      whatFailed:arr(x.whatFailed),
      diagnosis,
      lesson:text(x.lesson),
      nextAction:text(x.nextAction),
      modelChangeRequired:x.modelChangeRequired===true,
      falsified:x.hypothesisFalsified===true || diagnosis.cause==='hypothesis_falsified',
      auditComplete:Boolean(x.drawDate && x.modelVersion && x.frozenAt && official),
      caveat:'Un resultado perdido no demuestra por sí solo que el modelo sea incorrecto, y un acierto no demuestra por sí solo que exista ventaja. Las conclusiones requieren series OOS/prospectivas y comparación contra controles NULL.'
    };
  }

  function validatePostMortem(input){
    const p=postMortem(input);
    const missing=[];
    for(const [key,value] of Object.entries({drawDate:p.drawDate,modelVersion:p.modelVersion,frozenAt:p.frozenAt,officialResult:p.officialResult})){
      if(value===null||value===undefined||value==='') missing.push(key);
    }
    if(!p.won && !p.diagnosis) missing.push('diagnosis');
    return {valid:missing.length===0,missing,postMortem:p};
  }

  root.LotteryExplanationEngine={
    explain,
    explainNumber,
    postMortem,
    diagnoseMiss,
    validatePostMortem,
    MISS_CAUSES:Array.from(MISS_CAUSES)
  };
})(typeof window!=='undefined'?window:globalThis);

/* Loterías AI — Conviction Engine */
(function(root){
  'use strict';
  function n(v,d=0){const x=Number(v);return Number.isFinite(x)?x:d;}
  const weights={archive_complete_enough:20,rule_eras_verified:10,walk_forward_positive:20,beats_random_baseline:20,confidence_lower_bound_positive:10,shadow_ledger_positive:10,drawdown_within_limit:5,model_stability:3,source_integrity:2};
  function evaluate(x){
    const checks={
      archive_complete_enough:!!x.archiveCompleteEnough,
      rule_eras_verified:!!x.ruleErasVerified,
      walk_forward_positive:n(x.walkForwardRoi)>0,
      beats_random_baseline:n(x.excessRoiVsBaseline)>0,
      confidence_lower_bound_positive:n(x.excessRoiLowerBound)>0,
      shadow_ledger_positive:n(x.shadowLedgerRoi)>0,
      drawdown_within_limit:Number.isFinite(Number(x.maxDrawdown))&&n(x.maxDrawdown)<=n(x.maxAllowedDrawdown,0),
      model_stability:n(x.stabilityScore)>=n(x.minimumStability,0.7),
      source_integrity:!!x.sourceIntegrity
    };
    const detail=Object.entries(checks).map(([id,pass])=>({id,pass,weight:weights[id]||0}));
    const convictionScore=Math.round(detail.reduce((s,c)=>s+(c.pass?c.weight:0),0));
    const failedGates=detail.filter(c=>!c.pass).map(c=>c.id);
    const hardPass=failedGates.length===0;
    const threshold=n(x.realMoneyThreshold,85);
    const eligible=hardPass&&convictionScore>=threshold;
    return {
      state:eligible?'EVIDENCE_QUALIFIED':'RESEARCH_ONLY',
      convictionScore,
      convictionLabel:convictionScore>=85?'MUY_ALTA':convictionScore>=70?'ALTA':convictionScore>=50?'MEDIA':'BAJA',
      failedGates,
      checks:detail,
      realMoneyThreshold:threshold,
      realMoneyEligible:eligible,
      recommendedRealStake:eligible?null:0,
      truth:'Conviction Score mide respaldo de evidencia; no es probabilidad de premio, de beneficio ni garantía.'
    };
  }
  function fromSystemStatus(status){
    const pass=id=>(status?.gates||[]).some(g=>g.id===id&&g.status==='PASS');
    return evaluate({
      archiveCompleteEnough:pass('historical-backfill-complete'),
      ruleErasVerified:pass('rule-era-registry-complete'),
      walkForwardRoi:pass('mass-walk-forward-backtests')?1:0,
      excessRoiVsBaseline:pass('baseline-outperformance')?1:0,
      excessRoiLowerBound:pass('baseline-outperformance')?1:0,
      shadowLedgerRoi:pass('shadow-ledger-evidence')?1:0,
      maxDrawdown:pass('mass-walk-forward-backtests')?0:1,
      maxAllowedDrawdown:0,
      stabilityScore:pass('mass-walk-forward-backtests')?1:0,
      minimumStability:.7,
      sourceIntegrity:pass('selae-multigame-parser')&&pass('archive-schema-integrity'),
      realMoneyThreshold:85
    });
  }
  root.LotteryConvictionEngine={evaluate,fromSystemStatus};
})(typeof window!=='undefined'?window:globalThis);
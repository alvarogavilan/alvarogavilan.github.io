/* Loterías AI — Conviction Engine */
(function(root){
  'use strict';
  function n(v,d=0){const x=Number(v);return Number.isFinite(x)?x:d;}
  function evaluate(x){
    const checks={
      archive_complete_enough:!!x.archiveCompleteEnough,
      walk_forward_positive:n(x.walkForwardRoi)<=0?false:true,
      beats_random_baseline:n(x.excessRoiVsBaseline)<=0?false:true,
      confidence_lower_bound_positive:n(x.excessRoiLowerBound)<=0?false:true,
      shadow_ledger_positive:n(x.shadowLedgerRoi)<=0?false:true,
      drawdown_within_limit:n(x.maxDrawdown)<=n(x.maxAllowedDrawdown,0)?true:false,
      model_stability:n(x.stabilityScore)>=n(x.minimumStability,0.7),
      source_integrity:!!x.sourceIntegrity
    };
    const failed=Object.entries(checks).filter(([,v])=>!v).map(([k])=>k);
    const passed=Object.keys(checks).length-failed.length;
    const score=Math.round((passed/Object.keys(checks).length)*100);
    return {
      state:failed.length?'RESEARCH_ONLY':'EVIDENCE_QUALIFIED',
      convictionScore:score,
      failedGates:failed,
      recommendedRealStake:failed.length?0:null,
      truth:'Conviction score is evidence coverage, not probability of profit or guarantee.'
    };
  }
  root.LotteryConvictionEngine={evaluate};
})(typeof window!=='undefined'?window:globalThis);
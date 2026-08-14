/* Loterías AI — Unified Evidence Gate */
(function(root){'use strict';
function n(x){const v=Number(x);return Number.isFinite(v)?v:0}
function evaluate(x){
  const d=x||{}, reasons=[];
  if(!d.dataComplete) reasons.push('historical_data_incomplete');
  if(n(d.validatedDraws)<n(d.minimumDraws||1)) reasons.push('insufficient_validated_draws');
  if(!d.ruleEraVerified) reasons.push('rule_era_unverified');
  if(!d.walkForwardComplete) reasons.push('walk_forward_incomplete');
  if(!d.baselineComplete) reasons.push('baseline_incomplete');
  if(n(d.excessRoiLowerCI)<=0) reasons.push('no_positive_excess_roi_lower_ci');
  if(!d.shadowLedgerSufficient) reasons.push('insufficient_prospective_evidence');
  if(n(d.dataQuality)<0.95) reasons.push('data_quality_below_95pct');
  return {eligible:reasons.length===0,state:reasons.length?'BLOCKED':'ELIGIBLE',reasons};
}
function rank(items){
  return (Array.isArray(items)?items:[]).map(x=>({input:x,gate:evaluate(x)}))
    .filter(x=>x.gate.eligible)
    .sort((a,b)=>(n(b.input.excessRoiLowerCI)-n(a.input.excessRoiLowerCI))||(n(b.input.shadowRoi)-n(a.input.shadowRoi))||(n(a.input.drawdown)-n(b.input.drawdown)));
}
root.LotteryEvidenceGate={evaluate,rank};
})(typeof window!=='undefined'?window:globalThis);
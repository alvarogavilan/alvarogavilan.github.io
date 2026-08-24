const finite=v=>v!==null&&v!==undefined&&Number.isFinite(Number(v));

export function evaluateFixedStrategyProgressiveVp(input={}){
  const baseRtp=finite(input.baseRtpWithBaselineAward)?Number(input.baseRtpWithBaselineAward):null;
  const p=finite(input.progressiveEventProbabilityPerDecision)?Number(input.progressiveEventProbabilityPerDecision):null;
  const stake=finite(input.totalStakePerDecisionEUR)?Number(input.totalStakePerDecisionEUR):null;
  const baseline=finite(input.baselineProgressiveAwardEUR)?Number(input.baselineProgressiveAwardEUR):null;
  const jackpot=finite(input.currentProgressiveAwardEUR)?Number(input.currentProgressiveAwardEUR):null;
  const flags={
    exactPaytableVerified:input.exactPaytableVerified===true,
    exactStakeVerified:input.exactStakeVerified===true,
    exactEventProbabilityVerified:input.exactEventProbabilityVerified===true,
    baselineAwardVerified:input.baselineAwardVerified===true,
    sameFixedStrategyVerified:input.sameFixedStrategyVerified===true,
    rulesFingerprintVerified:input.rulesFingerprintVerified===true,
    configurationIdentityVerified:input.configurationIdentityVerified===true
  };
  const numericValid=baseRtp!==null&&baseRtp>=0&&baseRtp<2&&p!==null&&p>0&&p<=1&&stake!==null&&stake>0&&baseline!==null&&baseline>=0;
  const scientificInputsVerified=numericValid&&Object.values(flags).every(Boolean);
  if(!scientificInputsVerified){
    return {
      status:'BLOCKED_UNVERIFIED_INPUTS',
      scientificInputsVerified:false,
      currentRtp:null,
      breakEvenAwardEUR:null,
      edgeFraction:null,
      flags,
      guards:{fixedStrategyOnly:true,strategyChangeRequiresRecalculation:true,noExecutionPromotion:true}
    };
  }
  const breakEvenAwardEUR=baseline+(stake*(1-baseRtp)/p);
  const currentRtp=jackpot===null?null:baseRtp+(p*(jackpot-baseline)/stake);
  return {
    status:jackpot===null?'READY_THRESHOLD_ONLY':'READY_RESEARCH_EVALUATION',
    scientificInputsVerified:true,
    currentRtp,
    breakEvenAwardEUR,
    edgeFraction:currentRtp===null?null:currentRtp-1,
    flags,
    formula:{
      rtp:'baseRtpWithBaselineAward + p*(currentAward-baselineAward)/totalStakePerDecision',
      breakEven:'baselineAward + totalStakePerDecision*(1-baseRtpWithBaselineAward)/p'
    },
    guards:{
      fixedStrategyOnly:true,
      strategyChangeRequiresRecalculation:true,
      multiHandRequiresTotalDecisionStakeAndExactProgressiveEventProbability:true,
      noExecutionPromotion:true
    }
  };
}

const VERSION='slot-bet-pattern-lab-v1';
const EXECUTION=Object.freeze({decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0});
const num=v=>Number.isFinite(Number(v))?Number(v):null;
const round=(v,d=8)=>Number.isFinite(v)?Number(v.toFixed(d)):null;
const execution=()=>({...EXECUTION});

function normalizeStep(s={}){
  return {stakeEUR:num(s.stakeEUR),spins:Math.max(0,Math.floor(num(s.spins)??0))};
}
function normalizeConfig(c={}){
  return {stakeEUR:num(c.stakeEUR),rtpPct:num(c.rtpPct),jackpotEligible:c.jackpotEligible===true,jackpotEvPerSpinEUR:num(c.jackpotEvPerSpinEUR)??0,stateId:c.stateId??null};
}
export function evaluateBetSequence(sequence=[],configs=[],options={}){
  const steps=(Array.isArray(sequence)?sequence:[]).map(normalizeStep).filter(s=>s.stakeEUR>0&&s.spins>0);
  const cfg=(Array.isArray(configs)?configs:[]).map(normalizeConfig);
  const byStake=new Map(cfg.map(c=>[c.stakeEUR,c]));
  if(!steps.length)return {version:VERSION,ok:false,reason:'SEQUENCE_REQUIRED',execution:execution()};
  const missing=[...new Set(steps.filter(s=>!byStake.has(s.stakeEUR)).map(s=>s.stakeEUR))];
  if(missing.length)return {version:VERSION,ok:false,reason:'MISSING_STAKE_CONFIG',missingStakeEUR:missing,execution:execution()};
  let coinIn=0,baseReturn=0,jackpotEv=0,totalSpins=0;
  const rows=[];
  for(const step of steps){
    const c=byStake.get(step.stakeEUR); if(!(c.rtpPct>=0&&c.rtpPct<=200))return {version:VERSION,ok:false,reason:'INVALID_RTP',execution:execution()};
    const stepCoinIn=step.stakeEUR*step.spins;
    const stepBaseReturn=stepCoinIn*(c.rtpPct/100);
    const stepJackpotEv=c.jackpotEligible?c.jackpotEvPerSpinEUR*step.spins:0;
    coinIn+=stepCoinIn;baseReturn+=stepBaseReturn;jackpotEv+=stepJackpotEv;totalSpins+=step.spins;
    rows.push({...step,rtpPct:c.rtpPct,jackpotEligible:c.jackpotEligible,stateId:c.stateId,coinInEUR:round(stepCoinIn),baseExpectedReturnEUR:round(stepBaseReturn),jackpotExpectedValueEUR:round(stepJackpotEv)});
  }
  const expectedReturn=baseReturn+jackpotEv,expectedNet=expectedReturn-coinIn;
  const weightedRtp=coinIn?baseReturn/coinIn*100:null;
  return {version:VERSION,ok:true,rows,totalSpins,coinInEUR:round(coinIn),baseExpectedReturnEUR:round(baseReturn),jackpotExpectedValueEUR:round(jackpotEv),totalExpectedReturnEUR:round(expectedReturn),expectedNetEUR:round(expectedNet),weightedBaseRtpPct:round(weightedRtp),sequenceHasIndependentMagicEffect:false,mechanismDependentEffectPossible:cfg.some(c=>c.jackpotEligible||c.stateId!==null)||new Set(cfg.map(c=>c.rtpPct)).size>1,interpretation:'Changing stake can only change expectation through documented stake-specific RTP, jackpot eligibility/contribution, feature mode or persistent-state scope. The order/count ritual itself has no independent expected-value term.',execution:execution(),hardGuards:{noHotColdInference:true,noDueAfterNSpinsInference:true,noSequenceMagic:true,exactStakeSpecificRulesRequired:true}};
}

export function compareSequenceToFlat(sequence=[],configs=[],flatStakeEUR=null){
  const seq=evaluateBetSequence(sequence,configs); if(!seq.ok)return seq;
  const stake=num(flatStakeEUR)??sequence?.[0]?.stakeEUR; const total=seq.totalSpins;
  const flat=evaluateBetSequence([{stakeEUR:stake,spins:total}],configs);
  if(!flat.ok)return {...seq,comparisonError:flat};
  return {version:VERSION,ok:true,sequence:seq,flat,deltaExpectedNetEUR:round(seq.expectedNetEUR-flat.expectedNetEUR),deltaCoinInEUR:round(seq.coinInEUR-flat.coinInEUR),reasonForAnyDifference:'ONLY_STAKE_SPECIFIC_MATH_OR_DIFFERENT_TOTAL_COIN_IN',execution:execution()};
}

export function auditPatternClaim(claim={}){
  const pattern=Array.isArray(claim.sequence)?claim.sequence.map(normalizeStep):[];
  const exactRuleEvidence=claim.exactRuleEvidence===true;
  const mechanism=String(claim.mechanism||'NONE').toUpperCase();
  const allowed=['STAKE_SPECIFIC_RTP','JACKPOT_ELIGIBILITY','METER_CONTRIBUTION','PERSISTENT_STATE_BY_STAKE','FEATURE_MODE_BY_STAKE'];
  const mechanismSupported=exactRuleEvidence&&allowed.includes(mechanism);
  return {version:VERSION,claim:{pattern,mechanism,exactRuleEvidence},classification:mechanismSupported?'MECHANISM_TESTABLE':'RITUAL_OR_UNVERIFIED_CLAIM',next:mechanismSupported?'TEST_EXACT_STAKE_SPECIFIC_MATH':'DO_NOT_TREAT_SPIN_COUNT_SEQUENCE_AS_EDGE',execution:execution()};
}

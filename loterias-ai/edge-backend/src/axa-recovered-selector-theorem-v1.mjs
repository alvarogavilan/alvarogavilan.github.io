const VERSION='axa-recovered-selector-theorem-v1';
const EXECUTION=Object.freeze({decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0});
export function exactFairSetMath(k,{horizon=3,unit=1}={}){
  k=Number(k);horizon=Math.max(1,Math.floor(Number(horizon)||3));unit=Number(unit);
  if(!Number.isInteger(k)||k<1||k>36||!(unit>0)) return {version:VERSION,ok:false,reason:'K_1_TO_36_AND_POSITIVE_UNIT_REQUIRED',execution:{...EXECUTION}};
  const hitProbability=k/37;
  const totalStakePerSpin=k*unit;
  const netOnHit=(36-k)*unit;
  const netOnMiss=-k*unit;
  const expectedNetPerSpin=hitProbability*netOnHit+(1-hitProbability)*netOnMiss;
  const expectedNetHorizon=expectedNetPerSpin*horizon;
  const expectedStakeHorizon=totalStakePerSpin*horizon;
  return {version:VERSION,ok:true,k,horizon,unit,hitProbability,totalStakePerSpin,netOnHit,netOnMiss,expectedNetPerSpin,expectedNetHorizon,expectedStakeHorizon,expectedRoi:expectedNetHorizon/expectedStakeHorizon,execution:{...EXECUTION}};
}
export function auditAxaRecoveredSelector({setSizes=[],selectorIndependentOfCasinoOutcome=true,horizon=3}={}){
  const ks=[...new Set(setSizes.map(Number).filter(k=>Number.isInteger(k)&&k>=1&&k<=36))];
  const rows=ks.map(k=>exactFairSetMath(k,{horizon}));
  return {version:VERSION,selectorIndependentOfCasinoOutcome,horizon,rows,conclusion:selectorIndependentOfCasinoOutcome?'INTERNAL_RANDOM_SET_SELECTION_CANNOT_CHANGE_FAIR_ROULETTE_EXPECTATION':'DEPENDENCE_NOT_ESTABLISHED_REQUIRES_PROSPECTIVE_TEST',exactFairRoiIfIndependent:selectorIndependentOfCasinoOutcome?-1/37:null,execution:{...EXECUTION},hardGuards:{recoveredInternalPrngDoesNotPredictCasinoRng:true,fullHardCodedSetTableNotRequiredForFairExpectationProof:true,prospectiveExactTargetTestStillRequiredForAnyGeneratorDefectClaim:true}};
}

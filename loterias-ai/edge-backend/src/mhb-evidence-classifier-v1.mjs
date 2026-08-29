const VERSION='mhb-evidence-classifier-v1';
const execution=()=>({decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0});
const b=v=>v===true;

export function classifyMhbEvidence(input={}){
  const exactOperatorTitleBound=b(input.exactOperatorTitleBound);
  const explicitMustHitByWording=b(input.explicitMustHitByWording);
  const mandatoryAwardAtBoundaryVerified=b(input.mandatoryAwardAtBoundaryVerified);
  const hardBoundaryVerified=explicitMustHitByWording&&mandatoryAwardAtBoundaryVerified;
  const nameOnly=b(input.risingRewardsNamePresent)&&!hardBoundaryVerified;
  const maxOnly=b(input.publishedMaximumPresent)&&!hardBoundaryVerified;
  const probabilityOnly=b(input.triggerProbabilityIncreasesWithMeter)&&!hardBoundaryVerified;

  let classification='UNVERIFIED';
  if(exactOperatorTitleBound&&hardBoundaryVerified) classification='EXPLICIT_MHB_RULE_CANDIDATE';
  else if(maxOnly||probabilityOnly) classification='BOUNDED_OR_RISING_RANDOM_JACKPOT_NOT_MHB_PROVEN';
  else if(nameOnly) classification='FAMILY_NAME_ONLY_NOT_MHB_PROVEN';

  return Object.freeze({
    version:VERSION,
    classification,
    admittedToMhbResearchLane:classification==='EXPLICIT_MHB_RULE_CANDIDATE',
    exactOperatorTitleBound,
    hardBoundaryVerified,
    evidenceFlags:Object.freeze({
      risingRewardsNamePresent:b(input.risingRewardsNamePresent),
      publishedMaximumPresent:b(input.publishedMaximumPresent),
      triggerProbabilityIncreasesWithMeter:b(input.triggerProbabilityIncreasesWithMeter),
      explicitMustHitByWording,
      mandatoryAwardAtBoundaryVerified
    }),
    warnings:Object.freeze([
      ...(nameOnly?['FAMILY_NAME_CANNOT_PROVE_MHB']:[]),
      ...(maxOnly?['PUBLISHED_MAXIMUM_CANNOT_PROVE_MHB']:[]),
      ...(probabilityOnly?['INCREASING_TRIGGER_PROBABILITY_CANNOT_PROVE_MHB']:[]),
      ...(!exactOperatorTitleBound?['EXACT_OPERATOR_TITLE_BINDING_REQUIRED']:[])
    ]),
    execution:execution(),
    hardGuards:Object.freeze({
      explicitMandatoryBoundaryRequired:true,
      familyNameCannotSetMhbTrue:true,
      publishedMaximumCannotSetMhbTrue:true,
      probabilityTrendCannotSetMhbTrue:true,
      exactOperatorTitleBindingRequired:true,
      noAutomaticBetting:true,
      realMoneyAllowed:false
    })
  });
}

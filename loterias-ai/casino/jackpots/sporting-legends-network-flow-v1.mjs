export const SPORTING_CURRENT_JACKPOT_CONTRIBUTION = Object.freeze({
  operatorContributionPctOfStake:2,
  currentJackpotsSharePct:84.5,
  effectiveCurrentPotContributionPct:1.69,
  effectiveCurrentPotContributionFraction:0.0169,
});

const finite=(v)=>Number.isFinite(Number(v))?Number(v):null;
const norm=(v)=>typeof v==='string'&&v.trim()?v.trim().toUpperCase():null;

function snapshot(x){
  if(!x||typeof x!=='object')return null;
  const ts=finite(x.epochSeconds);
  const daily=finite(x.daily);
  const weekly=finite(x.weekly);
  const mega=finite(x.mega);
  const currency=norm(x.currency);
  const scope=norm(x.scope);
  const feedIdentity=norm(x.feedIdentity);
  if(ts===null||daily===null||weekly===null||mega===null||!currency||!scope)return null;
  return {
    epochSeconds:ts,daily,weekly,mega,currency,scope,total:daily+weekly+mega,
    captureTimestampVerified:x.captureTimestampVerified===true,
    exactValues:x.exactValues===true,
    feedProvenanceVerified:x.feedProvenanceVerified===true,
    feedIdentity,
  };
}

export function estimateSportingLegendsNetworkFlow(previous,current,{
  expectedScope='GLOBAL',
  expectedCurrency='EUR',
  operatorContributionPctOfStake=2,
  currentJackpotsSharePct=84.5,
}={}){
  const a=snapshot(previous),b=snapshot(current);
  const guards={
    researchOnly:true,
    betfairSpainBindingRequiredForSpainExecution:true,
    flowDoesNotEqualPlayerHazard:true,
    noResetOrAwardMayOccurInsideWindow:true,
    verifiedCaptureProvenanceRequired:true,
    sameFeedIdentityRequired:true,
    roundedAggregatorSnapshotsRejected:true,
    realMoneyAllowed:false,
  };
  if(!a||!b)return {valid:false,reason:'INCOMPLETE_SNAPSHOT',guards};
  if(!a.captureTimestampVerified||!b.captureTimestampVerified||
     !a.exactValues||!b.exactValues||
     !a.feedProvenanceVerified||!b.feedProvenanceVerified||
     !a.feedIdentity||!b.feedIdentity){
    return {valid:false,reason:'UNVERIFIED_CAPTURE_PROVENANCE',previous:a,current:b,guards};
  }
  if(a.feedIdentity!==b.feedIdentity){
    return {valid:false,reason:'FEED_IDENTITY_CHANGED',previous:a,current:b,guards};
  }
  if(a.scope!==b.scope||a.currency!==b.currency)return {valid:false,reason:'SCOPE_OR_CURRENCY_CHANGED',previous:a,current:b,guards};
  if(expectedScope&&a.scope!==norm(expectedScope))return {valid:false,reason:'UNEXPECTED_SCOPE',previous:a,current:b,guards};
  if(expectedCurrency&&a.currency!==norm(expectedCurrency))return {valid:false,reason:'UNEXPECTED_CURRENCY',previous:a,current:b,guards};
  const seconds=b.epochSeconds-a.epochSeconds;
  if(!(seconds>0))return {valid:false,reason:'NON_POSITIVE_TIME_WINDOW',previous:a,current:b,guards};
  const deltas={daily:b.daily-a.daily,weekly:b.weekly-a.weekly,mega:b.mega-a.mega};
  if(Object.values(deltas).some(x=>x<0))return {valid:false,reason:'RESET_AWARD_OR_SCOPE_CHANGE',previous:a,current:b,deltas,guards};
  const contributionFraction=(Number(operatorContributionPctOfStake)/100)*(Number(currentJackpotsSharePct)/100);
  if(!(contributionFraction>0&&contributionFraction<1))return {valid:false,reason:'INVALID_CONTRIBUTION_FRACTION',previous:a,current:b,guards};
  const deltaCurrentPots=deltas.daily+deltas.weekly+deltas.mega;
  if(!(deltaCurrentPots>0))return {valid:false,reason:'NO_POSITIVE_POT_GROWTH',previous:a,current:b,deltas,guards};
  const impliedStakeEUR=deltaCurrentPots/contributionFraction;
  const hours=seconds/3600;
  return {
    valid:true,
    reason:'OK_RESEARCH_ONLY',
    previous:a,current:b,deltas,
    feedIdentity:a.feedIdentity,
    seconds,hours,
    contributionFraction,
    deltaCurrentPotsEUR:deltaCurrentPots,
    impliedNetworkStakeEUR:impliedStakeEUR,
    impliedNetworkStakePerHourEUR:impliedStakeEUR/hours,
    impliedNetworkStakePerMinuteEUR:impliedStakeEUR/(seconds/60),
    guards
  };
}

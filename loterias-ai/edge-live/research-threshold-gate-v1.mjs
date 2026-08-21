export function gateResearchThresholdZone({
  nominalZone,
  dynamicFreshnessVerified = false,
  configurationEquivalentVerified = false,
  currencyNetworkEquivalentVerified = false,
}) {
  const nominal=String(nominalZone||'NO_LIVE_VALUE');
  const nominalNearOrAbove=['NEAR_RESEARCH_THRESHOLD','ABOVE_RESEARCH_THRESHOLD'].includes(nominal);
  const operationalThresholdComparable=
    dynamicFreshnessVerified===true &&
    configurationEquivalentVerified===true &&
    currencyNetworkEquivalentVerified===true;

  let zone=nominal;
  if(!dynamicFreshnessVerified) zone='DYNAMIC_STATE_NOT_VERIFIED';
  else if(!configurationEquivalentVerified||!currencyNetworkEquivalentVerified) zone='CROSS_UNIT_CONFIGURATION_NOT_VERIFIED';

  return {
    nominalZone:nominal,
    zone,
    nominalNearOrAbove,
    operationalThresholdComparable,
    countsAsNearOrAboveResearchThreshold:operationalThresholdComparable&&nominalNearOrAbove,
  };
}

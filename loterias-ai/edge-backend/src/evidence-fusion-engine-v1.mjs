const VERSION='edge-evidence-fusion-engine-v1';
const EXECUTION=Object.freeze({decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0});

const SOURCE_WEIGHT={
  REGULATOR:100,
  CURRENT_OPERATOR_EXACT_TITLE:95,
  PROVIDER_OFFICIAL_EXACT_TITLE:90,
  OPERATOR_OTHER_JURISDICTION_EXACT_TITLE:70,
  PROVIDER_FAMILY_MATERIAL:65,
  INDEPENDENT_MATHEMATICAL_ANALYSIS:55,
  SPECIALIST_AP_GUIDE:40,
  JOURNALISM:30,
  CREATOR_VIDEO:20,
  FORUM:10,
  UNKNOWN:0
};
const norm=v=>String(v??'').trim();
const eq=(a,b)=>norm(a).toLowerCase()===norm(b).toLowerCase();
const stable=v=>JSON.stringify(v,Object.keys(v||{}).sort());
const execution=()=>({...EXECUTION});

export function sourceWeight(sourceClass){return SOURCE_WEIGHT[norm(sourceClass).toUpperCase()]??0;}

export function observationMatchesTarget(obs={},target={}){
  return eq(obs.jurisdiction,target.jurisdiction)&&eq(obs.operator,target.operator)&&eq(obs.title,target.title)&&obs.exactTargetBinding===true;
}

export function fuseClaim(claimId,observations=[],target={}){
  const rows=(Array.isArray(observations)?observations:[]).filter(o=>o&&o.claimId===claimId).map(o=>({...o,sourceWeight:sourceWeight(o.sourceClass),exactTargetMatch:observationMatchesTarget(o,target)}));
  if(!rows.length)return {version:VERSION,claimId,status:'NO_EVIDENCE',execution:execution()};
  const exact=rows.filter(r=>r.exactTargetMatch);
  const exactAuthoritative=exact.filter(r=>r.sourceWeight>=90);
  const exactValues=[...new Set(exactAuthoritative.map(r=>stable(r.value)))];
  if(exactValues.length>1){
    return {version:VERSION,claimId,status:'CONFLICTED_FAIL_CLOSED',reason:'AUTHORITATIVE_EXACT_TARGET_CONFLICT',observations:rows,execution:execution()};
  }
  if(exactAuthoritative.length){
    return {version:VERSION,claimId,status:'EXACT_VERIFIED_RESEARCH',value:exactAuthoritative[0].value,supportCount:exactAuthoritative.length,observations:rows,execution:execution(),promotion:{researchFactAllowed:true,executionAllowed:false}};
  }
  const exactNonAuthoritative=exact.filter(r=>r.sourceWeight>0);
  const crossMaterial=rows.filter(r=>!r.exactTargetMatch&&r.sourceWeight>=40);
  const crossAuthoritative=rows.filter(r=>!r.exactTargetMatch&&r.sourceWeight>=55);
  const crossValues=[...new Set(crossMaterial.map(r=>stable(r.value)))];
  if(exactNonAuthoritative.length){
    return {version:VERSION,claimId,status:'EXACT_TARGET_UNVERIFIED_SOURCE',observations:rows,execution:execution(),promotion:{researchFactAllowed:false,executionAllowed:false}};
  }
  if(crossValues.length>1){
    return {version:VERSION,claimId,status:'CROSS_DEPLOYMENT_CONFLICT_DISCOVERY_ONLY',observations:rows,execution:execution(),promotion:{researchFactAllowed:false,executionAllowed:false}};
  }
  if(crossAuthoritative.length&&crossValues.length===1){
    return {version:VERSION,claimId,status:'CROSS_DEPLOYMENT_CORROBORATION_ONLY',value:crossAuthoritative[0].value,supportCount:crossAuthoritative.length,observations:rows,execution:execution(),promotion:{researchFactAllowed:false,executionAllowed:false}};
  }
  return {version:VERSION,claimId,status:'DISCOVERY_ONLY',observations:rows,execution:execution(),promotion:{researchFactAllowed:false,executionAllowed:false}};
}

export function fuseResearchBundle(bundle={}){
  const target=bundle.target||{};
  const observations=Array.isArray(bundle.observations)?bundle.observations:[];
  const claimIds=[...new Set(observations.map(o=>o?.claimId).filter(Boolean))];
  const claims=claimIds.map(id=>fuseClaim(id,observations,target));
  return {
    version:VERSION,
    target,
    claimCount:claims.length,
    exactVerifiedClaims:claims.filter(c=>c.status==='EXACT_VERIFIED_RESEARCH').map(c=>c.claimId),
    conflictedClaims:claims.filter(c=>c.status.includes('CONFLICT')).map(c=>c.claimId),
    discoveryOnlyClaims:claims.filter(c=>['DISCOVERY_ONLY','CROSS_DEPLOYMENT_CORROBORATION_ONLY','EXACT_TARGET_UNVERIFIED_SOURCE','CROSS_DEPLOYMENT_CONFLICT_DISCOVERY_ONLY'].includes(c.status)).map(c=>c.claimId),
    claims,
    execution:execution(),
    hardGuards:{crossOperatorTransferForbidden:true,crossJurisdictionTransferForbidden:true,videoCannotAuthorizeExecution:true,forumCannotAuthorizeExecution:true,conflictsFailClosed:true,executionAlwaysSeparate:true}
  };
}

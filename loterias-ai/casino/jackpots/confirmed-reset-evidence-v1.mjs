const finiteOrNull=v=>{if(v===null||v===undefined)return null;const n=Number(v);return Number.isFinite(n)?n:null;};
const sameCent=(a,b)=>{const x=finiteOrNull(a),y=finiteOrNull(b);return x!==null&&y!==null&&Math.round(x*100)===Math.round(y*100);};

export function normalizeConfirmedResetEvidence(raw,{sourceFile=null}={}){
  if(raw?.inference?.meterResetConfirmed!==true) return null;
  if(raw?.guards?.noResetEqualsJackpotWin!==true || raw?.guards?.noPostResetEqualsExactSeed!==true || raw?.guards?.noTriggerAttribution!==true) return null;
  if(raw?.baseline?.identityExact!==true || raw?.baseline?.identityClass!=='EXACT_NETWORK_PLUS_UNIQUE_ID') return null;
  const network=String(raw?.target?.network||'').trim();
  const id=String(raw?.target?.id||'').trim();
  const baselineEUR=finiteOrNull(raw?.baseline?.amountEUR);
  const postResetUpperBoundEUR=finiteOrNull(raw?.inference?.postResetSeedUpperBoundEUR);
  const dropFraction=finiteOrNull(raw?.transition?.dropFraction);
  const samples=Array.isArray(raw?.confirmationSamples)?raw.confirmationSamples:[];
  const twoFreshUnique=samples.length>=2&&samples.slice(0,2).every(s=>s?.httpStatus===200&&s?.uniqueIdentityInSnapshot===true&&Array.isArray(s?.targetDistinctAmounts)&&s.targetDistinctAmounts.length===1&&finiteOrNull(s.targetDistinctAmounts[0])!==null);
  if(!network||!id||baselineEUR===null||baselineEUR<=0||postResetUpperBoundEUR===null||postResetUpperBoundEUR<0||dropFraction===null||dropFraction<0.20||!twoFreshUnique) return null;
  return {
    network,id,trackKey:`${network}:${id}`,
    baselineEUR,
    baselineObservedAt:raw?.baseline?.observedAt||null,
    confirmedAt:samples[1]?.observedAt||raw?.generatedAt||null,
    postResetUpperBoundEUR,
    dropFraction,
    evidenceClass:'INDEPENDENT_TWO_SAMPLE_STABLE_ID_RESET_CONFIRMATION',
    sourceFile,
    workflowRunId:raw?.workflowRunId??null,
    jackpotWinConfirmed:false,
    triggeringGameKnown:false,
    triggeringTierKnown:false,
    seedPointEstimateEUR:null,
    economicPromotionAllowed:false,
    realMoneyAllowed:false,
  };
}

export function promoteStableDropEvent(event,confirmations=[]){
  if(!event||event?.identityClass!=='EXACT_NETWORK_PLUS_UNIQUE_ID') return event;
  const c=(Array.isArray(confirmations)?confirmations:[]).find(x=>x?.trackKey===event?.trackKey&&sameCent(x?.baselineEUR,event?.previousEUR));
  if(!c) return event;
  const cur=finiteOrNull(event?.currentEUR);
  const prev=finiteOrNull(event?.previousEUR);
  if(cur===null||prev===null||prev<=0||cur>=prev) return event;
  // Confirmation establishes that this baseline entered the post-reset regime.
  // A later ledger sample may be above the first post-reset bound because the
  // meter has already resumed growing; the exact previous baseline match is
  // therefore the event-linking key, not equality to the first low sample.
  return {
    ...event,
    classification:'CONFIRMED_METER_RESET',
    confirmationEvidenceClass:c.evidenceClass,
    confirmationSourceFile:c.sourceFile,
    confirmationWorkflowRunId:c.workflowRunId,
    jackpotWinConfirmed:false,
    triggeringGameKnown:false,
    triggeringTierKnown:false,
    seedPointEstimateEUR:null,
    economicPromotionAllowed:false,
    realMoneyAllowed:false,
  };
}

export function confirmedResetSummary(confirmations=[]){
  const rows=(Array.isArray(confirmations)?confirmations:[]).filter(Boolean);
  return {count:rows.length,latest:rows.length?rows.slice().sort((a,b)=>Date.parse(a?.confirmedAt||0)-Date.parse(b?.confirmedAt||0)).at(-1):null};
}

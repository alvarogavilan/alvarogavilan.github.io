const VERSION='progressive-network-observer-v1';
const EXECUTION=Object.freeze({decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0});
const num=v=>Number.isFinite(Number(v))?Number(v):null;
const round=(v,d=8)=>Number.isFinite(v)?Number(v.toFixed(d)):null;
const execution=()=>({...EXECUTION});

function normalizeSnapshots(snapshots=[]){
  return (Array.isArray(snapshots)?snapshots:[]).map((s,i)=>({index:i,tsMs:num(s?.tsMs),tiers:s?.tiers&&typeof s.tiers==='object'?s.tiers:{}})).filter(s=>s.tsMs!==null).sort((a,b)=>a.tsMs-b.tsMs);
}
export function analyzeProgressiveNetworkSnapshots(snapshots=[],options={}){
  const rows=normalizeSnapshots(snapshots); const ratePct=num(options.contributionRatePct); const rate=ratePct===null?null:ratePct/100;
  if(rows.length<2)return {version:VERSION,ok:false,reason:'AT_LEAST_TWO_SNAPSHOTS_REQUIRED',execution:execution()};
  if(!(rate>0&&rate<1))return {version:VERSION,ok:false,reason:'VALID_CONTRIBUTION_RATE_REQUIRED',execution:execution()};
  if(options.contributionRateScope!=='ALL_VISIBLE_TIERS_COMBINED')return {version:VERSION,ok:false,reason:'CONTRIBUTION_RATE_SCOPE_MUST_BE_ALL_VISIBLE_TIERS_COMBINED',execution:execution()};
  const tierKeys=[...new Set(rows.flatMap(s=>Object.keys(s.tiers)))];
  const seeds=options.seedsByTier||{}; const resetTolerance=Math.max(0,num(options.resetToleranceEUR)??0.01);
  let totalPositiveGrowth=0; const perTier=Object.fromEntries(tierKeys.map(k=>[k,{positiveGrowthEUR:0,resetEvents:[],observations:0}]));
  for(let i=1;i<rows.length;i++){
    const prev=rows[i-1],cur=rows[i];
    for(const k of tierKeys){
      const a=num(prev.tiers[k]),b=num(cur.tiers[k]); if(a===null||b===null)continue; perTier[k].observations++;
      const delta=b-a;
      if(delta>=0){perTier[k].positiveGrowthEUR+=delta;totalPositiveGrowth+=delta;}
      else if(Math.abs(delta)>resetTolerance){
        const seed=num(seeds[k]);
        perTier[k].resetEvents.push({fromAmountEUR:a,toAmountEUR:b,tsMs:cur.tsMs,dropEUR:round(a-b),nearConfiguredSeed:seed!==null?Math.abs(b-seed)<=Math.max(resetTolerance,seed*0.02):null});
      }
    }
  }
  const estimatedNetworkCoinInEUR=totalPositiveGrowth/rate;
  const current=rows.at(-1).tiers;
  const tiers=tierKeys.map(k=>{
    const d=perTier[k],hits=d.resetEvents.length,hazard=estimatedNetworkCoinInEUR>0?hits/estimatedNetworkCoinInEUR:null;
    const conservativeHits=Math.max(0,hits-1.96*Math.sqrt(hits));
    const conservativeHazard=estimatedNetworkCoinInEUR>0?conservativeHits/estimatedNetworkCoinInEUR:null;
    const meanObservedAward=hits?d.resetEvents.reduce((a,e)=>a+e.fromAmountEUR,0)/hits:null;
    const currentAmount=num(current[k]);
    return {tier:k,positiveGrowthEUR:round(d.positiveGrowthEUR),observedHits:hits,meanObservedPreResetAwardEUR:round(meanObservedAward),currentAmountEUR:currentAmount,hazardPerEuroCoinIn:round(hazard,12),conservativeHazardPerEuroCoinIn:round(conservativeHazard,12),currentJackpotEvPerEuroCoinIn:hazard!==null&&currentAmount!==null?round(hazard*currentAmount,8):null,conservativeCurrentJackpotEvPerEuroCoinIn:conservativeHazard!==null&&currentAmount!==null?round(conservativeHazard*currentAmount,8):null,resetEvents:d.resetEvents};
  });
  const jackpotEv=tiers.reduce((a,t)=>a+(t.currentJackpotEvPerEuroCoinIn||0),0);
  const conservativeJackpotEv=tiers.reduce((a,t)=>a+(t.conservativeCurrentJackpotEvPerEuroCoinIn||0),0);
  const baseRtpPct=num(options.baseRtpExcludingJackpotPct); const accountingVerified=options.baseRtpExcludingJackpotVerified===true;
  const estimatedTotalRtpPct=accountingVerified&&baseRtpPct!==null?baseRtpPct+jackpotEv*100:null;
  const conservativeTotalRtpPct=accountingVerified&&baseRtpPct!==null?baseRtpPct+conservativeJackpotEv*100:null;
  const minHits=Math.max(1,Math.floor(num(options.minimumObservedHitsPerNetwork)??10)); const totalHits=tiers.reduce((a,t)=>a+t.observedHits,0);
  const practiceVerdict=!accountingVerified?'BLOCKED_BASE_RTP_ACCOUNTING':(totalHits<minHits?'INSUFFICIENT_HIT_HISTORY_FOR_HAZARD':(conservativeTotalRtpPct>100?'CONSERVATIVE_POSITIVE_RTP_PRACTICE_CANDIDATE':'NO_CONSERVATIVE_POSITIVE_RTP_SIGNAL'));
  return {version:VERSION,ok:true,practiceVerdict,snapshotCount:rows.length,tierCount:tiers.length,contributionRatePct:ratePct,totalPositiveGrowthEUR:round(totalPositiveGrowth),estimatedNetworkCoinInEUR:round(estimatedNetworkCoinInEUR),observedHitCount:totalHits,tiers,metrics:{jackpotEvPerEuroCoinIn:round(jackpotEv,8),conservativeJackpotEvPerEuroCoinIn:round(conservativeJackpotEv,8),estimatedTotalRtpPct:round(estimatedTotalRtpPct,6),conservativeTotalRtpPct:round(conservativeTotalRtpPct,6)},execution:execution(),hardGuards:{passiveSnapshotsOnly:true,negativeDeltaTreatedAsResetCandidateNotProofOfWin:true,contributionScopeMustBeExact:true,baseRtpAccountingMustBeExact:true,hazardAssumesStakeProportionalTriggerAndRequiresIndependentRuleEvidence:true,minimumProspectiveHoldoutStillRequired:true,noWagerProbe:true,noAutomaticBetting:true}};
}

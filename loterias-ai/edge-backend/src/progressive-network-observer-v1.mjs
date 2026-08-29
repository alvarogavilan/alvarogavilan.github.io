const VERSION='progressive-network-observer-v1.1-reset-safe';
const EXECUTION=Object.freeze({decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0});
const num=v=>Number.isFinite(Number(v))?Number(v):null;
const round=(v,d=8)=>Number.isFinite(v)?Number(v.toFixed(d)):null;
const execution=()=>({...EXECUTION});
function poissonLower99Approx(k){
  if(!(k>0))return 0;
  const df=2*k,z=-2.3263478740408408;
  const base=1-2/(9*df)+z*Math.sqrt(2/(9*df));
  if(base<=0)return 0;
  return 0.5*df*base**3;
}
function normalizeSnapshots(snapshots=[]){
  return (Array.isArray(snapshots)?snapshots:[]).map((s,i)=>({index:i,tsMs:num(s?.tsMs),tiers:s?.tiers&&typeof s.tiers==='object'?s.tiers:{}})).filter(s=>s.tsMs!==null).sort((a,b)=>a.tsMs-b.tsMs);
}
export function analyzeProgressiveNetworkSnapshots(snapshots=[],options={}){
  const rows=normalizeSnapshots(snapshots),ratePct=num(options.contributionRatePct),rate=ratePct===null?null:ratePct/100;
  if(rows.length<2)return {version:VERSION,ok:false,reason:'AT_LEAST_TWO_SNAPSHOTS_REQUIRED',execution:execution()};
  if(!(rate>0&&rate<1))return {version:VERSION,ok:false,reason:'VALID_CONTRIBUTION_RATE_REQUIRED',execution:execution()};
  if(options.contributionRateScope!=='ALL_VISIBLE_TIERS_COMBINED')return {version:VERSION,ok:false,reason:'CONTRIBUTION_RATE_SCOPE_MUST_BE_ALL_VISIBLE_TIERS_COMBINED',execution:execution()};
  const tierKeys=[...new Set(rows.flatMap(s=>Object.keys(s.tiers)))],seeds=options.seedsByTier||{},resetTolerance=Math.max(0,num(options.resetToleranceEUR)??0.01);
  let observedPositiveGrowthEUR=0,resetIntervalCount=0;
  const perTier=Object.fromEntries(tierKeys.map(k=>[k,{positiveGrowthEUR:0,resetEvents:[],observations:0}]));
  for(let i=1;i<rows.length;i++){
    const prev=rows[i-1],cur=rows[i],intervalHadReset=new Set();
    for(const k of tierKeys){
      const a=num(prev.tiers[k]),b=num(cur.tiers[k]); if(a===null||b===null)continue; perTier[k].observations++;
      const delta=b-a;
      if(delta>=0){perTier[k].positiveGrowthEUR+=delta;observedPositiveGrowthEUR+=delta;}
      else if(Math.abs(delta)>resetTolerance){
        intervalHadReset.add(k); const seed=num(seeds[k]);
        const nearConfiguredSeed=seed!==null?Math.abs(b-seed)<=Math.max(resetTolerance,seed*0.02):null;
        perTier[k].resetEvents.push({fromAmountEUR:a,toAmountEUR:b,tsMs:cur.tsMs,dropEUR:round(a-b),nearConfiguredSeed,confirmedBySeed:nearConfiguredSeed===true});
      }
    }
    if(intervalHadReset.size)resetIntervalCount++;
  }
  const growthBasedCoinInLowerBoundEUR=observedPositiveGrowthEUR/rate;
  const independentCoinIn=num(options.independentNetworkCoinInEUR),independentCoinInVerified=options.independentNetworkCoinInVerified===true&&independentCoinIn>0;
  const current=rows.at(-1).tiers;
  const tiers=tierKeys.map(k=>{
    const d=perTier[k],confirmed=d.resetEvents.filter(e=>e.confirmedBySeed),hits=confirmed.length,currentAmount=num(current[k]);
    const pointHazard=independentCoinInVerified?hits/independentCoinIn:null;
    const lower99=independentCoinInVerified?poissonLower99Approx(hits)/independentCoinIn:null;
    return {tier:k,positiveGrowthEUR:round(d.positiveGrowthEUR),resetCandidates:d.resetEvents.length,confirmedSeedResets:hits,currentAmountEUR:currentAmount,hazardPerEuroCoinIn:round(pointHazard,12),lower99HazardPerEuroCoinIn:round(lower99,12),currentJackpotEvPerEuroCoinIn:pointHazard!==null&&currentAmount!==null?round(pointHazard*currentAmount,8):null,lower99CurrentJackpotEvPerEuroCoinIn:lower99!==null&&currentAmount!==null?round(lower99*currentAmount,8):null,resetEvents:d.resetEvents};
  });
  const confirmedHits=tiers.reduce((a,t)=>a+t.confirmedSeedResets,0),jackpotEv=tiers.reduce((a,t)=>a+(t.currentJackpotEvPerEuroCoinIn||0),0),lower99JackpotEv=tiers.reduce((a,t)=>a+(t.lower99CurrentJackpotEvPerEuroCoinIn||0),0);
  const baseRtpPct=num(options.baseRtpExcludingJackpotPct),accountingVerified=options.baseRtpExcludingJackpotVerified===true;
  const estimatedTotalRtpPct=accountingVerified&&independentCoinInVerified&&baseRtpPct!==null?baseRtpPct+jackpotEv*100:null;
  const lower99TotalRtpPct=accountingVerified&&independentCoinInVerified&&baseRtpPct!==null?baseRtpPct+lower99JackpotEv*100:null;
  const minHits=Math.max(1,Math.floor(num(options.minimumConfirmedHitsPerNetwork)??10));
  let practiceVerdict='BLOCKED_INDEPENDENT_NETWORK_COIN_IN_REQUIRED';
  if(!accountingVerified)practiceVerdict='BLOCKED_BASE_RTP_ACCOUNTING';
  else if(independentCoinInVerified&&confirmedHits<minHits)practiceVerdict='INSUFFICIENT_CONFIRMED_HIT_HISTORY';
  else if(independentCoinInVerified)practiceVerdict=lower99TotalRtpPct>100?'LOWER99_POSITIVE_RTP_PRACTICE_CANDIDATE':'NO_LOWER99_POSITIVE_RTP_SIGNAL';
  return {version:VERSION,ok:true,practiceVerdict,snapshotCount:rows.length,tierCount:tiers.length,contributionRatePct:ratePct,observedPositiveGrowthEUR:round(observedPositiveGrowthEUR),growthBasedCoinInLowerBoundEUR:round(growthBasedCoinInLowerBoundEUR),resetIntervalCount,independentNetworkCoinInEUR:independentCoinInVerified?independentCoinIn:null,independentNetworkCoinInVerified:independentCoinInVerified,confirmedHitCount:confirmedHits,tiers,metrics:{jackpotEvPerEuroCoinIn:round(jackpotEv,8),lower99JackpotEvPerEuroCoinIn:round(lower99JackpotEv,8),estimatedTotalRtpPct:round(estimatedTotalRtpPct,6),lower99TotalRtpPct:round(lower99TotalRtpPct,6)},execution:execution(),hardGuards:{passiveSnapshotsOnly:true,growthBasedCoinInIsLowerBoundOnly:true,growthBasedCoinInCannotEstimateHazardAcrossResetIntervals:true,independentVerifiedNetworkCoinInRequiredForHazard:true,onlySeedConfirmedResetsCountAsHits:true,baseRtpAccountingMustBeExact:true,hazardRequiresStakeProportionalTriggerRuleEvidence:true,lower99IsPoissonApproximationNotExecutionProof:true,minimumProspectiveHoldoutStillRequired:true,noWagerProbe:true,noAutomaticBetting:true}};
}

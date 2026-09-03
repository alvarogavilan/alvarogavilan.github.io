const JPK_KEYS=Object.freeze({
  'blueprint:JACKPOTKING_ROYAL':'ROYAL',
  'blueprint:JACKPOTKING_REGAL':'REGAL',
  'blueprint:JACKPOTKING':'JACKPOT_KING',
});

function finite(v){return v!==null&&v!==undefined&&Number.isFinite(Number(v));}
function median(values){
  const a=values.filter(finite).map(Number).sort((x,y)=>x-y);
  if(!a.length)return null;
  const m=Math.floor(a.length/2);
  return a.length%2?a[m]:(a[m-1]+a[m])/2;
}

export function classifyBotemaniaJpkDropRows(rows=[]){
  const eligible=(Array.isArray(rows)?rows:[])
    .filter(r=>r?.type==='DROP_CANDIDATE'&&JPK_KEYS[String(r?.meter_key)]&&finite(r?.before_eur)&&finite(r?.after_eur))
    .map(r=>({
      observedAtMs:Number(r.observed_at_ms),
      observedAt:r.observed_at||null,
      tier:JPK_KEYS[String(r.meter_key)],
      meterKey:String(r.meter_key),
      beforeEUR:Number(r.before_eur),
      afterEUR:Number(r.after_eur),
      deltaEUR:Number(r.delta_eur),
    }))
    .filter(r=>Number.isFinite(r.observedAtMs)&&r.beforeEUR>0&&r.afterEUR>0&&r.beforeEUR>r.afterEUR)
    .sort((a,b)=>a.observedAtMs-b.observedAtMs||a.tier.localeCompare(b.tier));

  const grouped=new Map();
  for(const r of eligible){
    if(!grouped.has(r.observedAtMs))grouped.set(r.observedAtMs,[]);
    grouped.get(r.observedAtMs).push(r);
  }

  const groups=[];
  for(const [observedAtMs,g] of grouped){
    const tiers=[...new Set(g.map(x=>x.tier))];
    const rowsOut=g.map(x=>{
      const dropRatio=1-x.afterEUR/x.beforeEUR;
      return {...x,dropRatio,strongResetMagnitude:dropRatio>=0.10};
    });
    const cleanSingleTierCandidate=tiers.length===1&&rowsOut.length===1&&rowsOut[0].strongResetMagnitude;
    groups.push({
      observedAtMs,
      observedAt:rowsOut[0]?.observedAt||null,
      tiers,
      rows:rowsOut,
      cleanSingleTierCandidate,
      classification:cleanSingleTierCandidate?'CLEAN_SINGLE_TIER_RESET_CANDIDATE':tiers.length>1?'AMBIGUOUS_MULTI_TIER_DROP':'WEAK_OR_DUPLICATE_DROP',
    });
  }
  return groups.sort((a,b)=>b.observedAtMs-a.observedAtMs);
}

export function summarizeBotemaniaJpkResetGroups(groups=[]){
  const clean=(Array.isArray(groups)?groups:[]).filter(g=>g?.cleanSingleTierCandidate===true);
  const byTier={};
  for(const tier of ['ROYAL','REGAL','JACKPOT_KING']){
    const rs=clean.filter(g=>g.tiers?.[0]===tier).map(g=>g.rows[0]);
    const pre=rs.map(r=>r.beforeEUR);
    const post=rs.map(r=>r.afterEUR);
    byTier[tier]={
      cleanResetCandidates:rs.length,
      preResetObservedEUR:{min:pre.length?Math.min(...pre):null,median:median(pre),max:pre.length?Math.max(...pre):null},
      postResetObservedEUR:{min:post.length?Math.min(...post):null,median:median(post),max:post.length?Math.max(...post):null},
      latestObservedAt:rs.length?clean.find(g=>g.tiers?.[0]===tier)?.observedAt||null:null,
    };
  }
  return {
    totalDropGroups:Array.isArray(groups)?groups.length:0,
    cleanSingleTierResetCandidates:clean.length,
    ambiguousOrWeakGroups:(Array.isArray(groups)?groups.length:0)-clean.length,
    byTier,
    inferenceLimits:{
      resetCandidateIsNotConfirmedAward:true,
      preResetSampleIsNotExactAward:true,
      fiveSecondPollingCreatesIntervalCensoring:true,
      resetHistoryAloneDoesNotIdentifySelectedTitleHazardPerEUR:true,
      noHazardImputation:true,
      noFutureInformation:true,
    },
    decision:'NO_PLAY',
    realMoneyAllowed:false,
    realStakeEUR:0,
  };
}

export function analyzeBotemaniaJpkDropRows(rows=[]){
  const groups=classifyBotemaniaJpkDropRows(rows);
  return {groups,summary:summarizeBotemaniaJpkResetGroups(groups)};
}

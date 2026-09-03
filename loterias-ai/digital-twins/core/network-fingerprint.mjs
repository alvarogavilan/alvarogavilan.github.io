function num(x){const n=Number(x);if(!Number.isFinite(n))throw new Error('FINITE_NUMBER_REQUIRED');return n;}
function ms(x){if(Number.isFinite(Number(x)))return Number(x);const n=Date.parse(x);if(!Number.isFinite(n))throw new Error('VALID_TIMESTAMP_REQUIRED');return n;}

export function compareTimedMeterSeries(reference,candidate,{maxTimeSkewMs=120000,maxAbsoluteDifferenceEUR=2,maxRateRelativeError=0.05,minOverlappingIntervals=2}={}){
  if(!Array.isArray(reference)||!Array.isArray(candidate)||reference.length<2||candidate.length<2) return {binding:'CANDIDATE_ONLY',reason:'INSUFFICIENT_SERIES'};
  const a=reference.map(x=>({t:ms(x.t),v:num(x.v)})).sort((x,y)=>x.t-y.t);
  const b=candidate.map(x=>({t:ms(x.t),v:num(x.v)})).sort((x,y)=>x.t-y.t);
  const matched=[];
  for(const x of a){
    let best=null;
    for(const y of b){const skew=Math.abs(x.t-y.t);if(skew<=maxTimeSkewMs&&(!best||skew<best.skew))best={x,y,skew};}
    if(best)matched.push(best);
  }
  if(matched.length<2) return {binding:'CANDIDATE_ONLY',reason:'NO_TIMESTAMP_OVERLAP',matchedPoints:matched.length};
  const absOk=matched.every(m=>Math.abs(m.x.v-m.y.v)<=maxAbsoluteDifferenceEUR);
  const ratePairs=[];
  for(let i=1;i<matched.length;i++){
    const p=matched[i-1],q=matched[i];
    const dtA=(q.x.t-p.x.t)/60000,dtB=(q.y.t-p.y.t)/60000;
    if(dtA<=0||dtB<=0)continue;
    const ra=(q.x.v-p.x.v)/dtA,rb=(q.y.v-p.y.v)/dtB;
    const scale=Math.max(Math.abs(ra),Math.abs(rb),1e-12);
    ratePairs.push({referenceRatePerMinute:ra,candidateRatePerMinute:rb,relativeError:Math.abs(ra-rb)/scale});
  }
  const rateOk=ratePairs.length>=minOverlappingIntervals&&ratePairs.every(r=>r.relativeError<=maxRateRelativeError);
  if(absOk&&rateOk)return {binding:'NETWORK_FINGERPRINT_MATCH_ONLY',reason:'VALUES_AND_RATES_MATCH_WITH_TIMESTAMP_OVERLAP',matchedPoints:matched.length,ratePairs,executionBinding:false};
  return {binding:'CANDIDATE_ONLY',reason:!absOk?'ABSOLUTE_VALUES_MISMATCH':'RATES_MISMATCH_OR_TOO_FEW_INTERVALS',matchedPoints:matched.length,ratePairs,executionBinding:false};
}

export function cachedSearchSnapshotGate(snapshots=[]){
  const exactTimestamps=snapshots.every(s=>Number.isFinite(Number(s.timestampMs))||!Number.isNaN(Date.parse(s.timestamp)));
  if(!exactTimestamps)return {binding:'CANDIDATE_ONLY',reason:'SEARCH_CACHE_HAS_NO_EXACT_CAPTURE_TIMESTAMPS',executionBinding:false};
  return {binding:'TIMESTAMPED_CANDIDATE_READY_FOR_COMPARISON',reason:'EXACT_TIMESTAMPS_PRESENT',executionBinding:false};
}

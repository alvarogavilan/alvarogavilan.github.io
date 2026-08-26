import {evaluateBetfairSportingDualFeedCalibrationSeries} from './betfair-sporting-dual-feed-calibration-v1.mjs';

const VERSION='betfair-sporting-prospective-calibration-v1';
const FROZEN_PROTOCOL_VERSION='betfair-spain-apmccoy-dual-feed-prospective-freeze-v1';
const FROZEN_AT_UTC='2026-08-26T19:37:47Z';
const FREEZE_COMMIT_SHA='3f397f820914bfdd39b42e4bd5262bd1b986751f';
const FREEZE_COMMIT_EPOCH_SECONDS=1787773120;
const MIN_SAMPLES=3;
const finite=v=>{if(v===null||v===undefined||v===''||typeof v==='boolean')return null;const n=Number(v);return Number.isFinite(n)?n:null;};
const text=v=>typeof v==='string'&&v.trim()?v.trim():null;

function execution(){return {decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0};}
function fail(reason,extra={}){
  return {
    version:VERSION,
    mode:'OFFLINE_PASSIVE_PROSPECTIVE_CALIBRATION_TIMING_ATTESTATION_NO_PLAY',
    valid:false,reason,
    frozenProtocolVersion:FROZEN_PROTOCOL_VERSION,
    frozenAtUtc:FROZEN_AT_UTC,
    freezeCommitSha:FREEZE_COMMIT_SHA,
    freezeCommitEpochSeconds:FREEZE_COMMIT_EPOCH_SECONDS,
    prospectiveTimingCandidate:false,
    prospectiveCalibrationCandidate:false,
    completeAttemptLedgerVerified:false,
    exactModernResponseSemanticsVerified:false,
    usableForOverduePair:false,
    execution:execution(),
    hardGuards:{onlineOnly:true,nonPromoOnly:true,offlineOnly:true,noNetwork:true,frozenProtocolPinnedToPublicGitCommit:true,allAcceptedCapturesMustPostdateFreezeCommit:true,strictCaptureOrderRequired:true,retrospectiveSamplesCannotBecomeProspective:true,completeAttemptLedgerNotProvenBySampleSet:true,prospectiveCalibrationCannotAuthorizeGreen:true,noWagerProbe:true,noAutomaticBetting:true},
    ...extra,
  };
}
function sampleTiming(sample,index){
  const legacy=finite(sample?.legacyCaptureEpochSeconds),modern=finite(sample?.modernCaptureEpochSeconds);
  if(legacy===null||modern===null)return {valid:false,index,reason:'SAMPLE_CAPTURE_TIME_MISSING'};
  const start=Math.min(legacy,modern),end=Math.max(legacy,modern);
  return {valid:true,index,sourceName:text(sample?.sourceName),legacyCaptureEpochSeconds:legacy,modernCaptureEpochSeconds:modern,captureStartEpochSeconds:start,captureEndEpochSeconds:end};
}

export function evaluateBetfairSportingProspectiveCalibration(samples){
  const list=Array.isArray(samples)?samples:[];
  if(list.length<MIN_SAMPLES)return fail('INSUFFICIENT_PROSPECTIVE_SAMPLE_SET',{sampleCount:list.length,minimumSamples:MIN_SAMPLES});
  const timings=list.map(sampleTiming);
  const missing=timings.find(x=>x.valid!==true);
  if(missing)return fail(missing.reason,{sampleCount:list.length,rejectedSampleIndex:missing.index});
  const nonCandidate=list.findIndex(x=>x?.valid!==true||x?.calibrationCandidate!==true);
  if(nonCandidate>=0)return fail('NON_CALIBRATION_SAMPLE_IN_PROSPECTIVE_SET',{sampleCount:list.length,rejectedSampleIndex:nonCandidate});
  const preFreeze=timings.find(x=>x.captureStartEpochSeconds<=FREEZE_COMMIT_EPOCH_SECONDS||x.captureEndEpochSeconds<=FREEZE_COMMIT_EPOCH_SECONDS);
  if(preFreeze)return fail('CAPTURE_NOT_STRICTLY_AFTER_FROZEN_PROTOCOL_COMMIT',{sampleCount:list.length,rejectedSampleIndex:preFreeze.index,rejectedCaptureStartEpochSeconds:preFreeze.captureStartEpochSeconds,rejectedCaptureEndEpochSeconds:preFreeze.captureEndEpochSeconds});
  for(let i=1;i<timings.length;i++){
    if(!(timings[i].captureStartEpochSeconds>timings[i-1].captureStartEpochSeconds))return fail('PROSPECTIVE_CAPTURE_ORDER_NOT_STRICTLY_FORWARD',{sampleCount:list.length,rejectedSampleIndex:i,previousCaptureStartEpochSeconds:timings[i-1].captureStartEpochSeconds,currentCaptureStartEpochSeconds:timings[i].captureStartEpochSeconds});
  }
  const named=timings.map(x=>x.sourceName).filter(Boolean);
  if(new Set(named).size!==named.length)return fail('DUPLICATE_PROSPECTIVE_SOURCE_NAME',{sampleCount:list.length});

  const series=evaluateBetfairSportingDualFeedCalibrationSeries(list);
  if(series?.valid!==true)return fail('FROZEN_CALIBRATION_SERIES_REJECTED',{sampleCount:list.length,seriesReason:series?.reason||null});
  const prospectiveTimingCandidate=true;
  const prospectiveCalibrationCandidate=series.empiricalModernResponseMappingVerified===true;
  return {
    version:VERSION,
    mode:'OFFLINE_PASSIVE_PROSPECTIVE_CALIBRATION_TIMING_ATTESTATION_NO_PLAY',
    valid:true,
    frozenProtocolVersion:FROZEN_PROTOCOL_VERSION,
    frozenAtUtc:FROZEN_AT_UTC,
    freezeCommitSha:FREEZE_COMMIT_SHA,
    freezeCommitEpochSeconds:FREEZE_COMMIT_EPOCH_SECONDS,
    sampleCount:list.length,
    firstCaptureEpochSeconds:timings[0].captureStartEpochSeconds,
    lastCaptureEpochSeconds:timings[timings.length-1].captureEndEpochSeconds,
    allCapturesStrictlyAfterFreezeCommit:true,
    strictCaptureOrderVerified:true,
    uniqueNamedSourcesVerified:named.length===list.length,
    prospectiveTimingCandidate,
    series,
    empiricalModernResponseMappingVerified:series.empiricalModernResponseMappingVerified===true,
    prospectiveCalibrationCandidate,
    completeAttemptLedgerVerified:false,
    exactModernResponseSemanticsVerified:false,
    usableForOverduePair:false,
    scientificUse:'Pins calibration timing to the public Git commit that froze the Betfair Spain AP McCoy dual-feed protocol before future evidence. Every supplied exact calibration sample must postdate that commit and be supplied in strictly forward capture order before the frozen calibration-series evaluator is applied. This establishes a prospective timing candidate for the supplied successful sample set, not proof that every attempted capture was logged. It cannot retrospectively relabel old HARs, cannot independently document modern response semantics and cannot authorize overdue execution.',
    execution:execution(),
    hardGuards:{onlineOnly:true,nonPromoOnly:true,offlineOnly:true,noNetwork:true,frozenProtocolPinnedToPublicGitCommit:true,allAcceptedCapturesMustPostdateFreezeCommit:true,strictCaptureOrderRequired:true,duplicateNamedSourcesRejected:true,retrospectiveSamplesCannotBecomeProspective:true,completeAttemptLedgerNotProvenBySampleSet:true,empiricalCalibrationDoesNotEqualModernSchemaDocumentation:true,noAutomaticPromotionToOverdueGate:true,prospectiveCalibrationCannotAuthorizeGreen:true,noWagerProbe:true,noAutomaticBetting:true},
  };
}

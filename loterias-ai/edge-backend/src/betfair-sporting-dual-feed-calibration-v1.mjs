import {validateBetfairSportingHarSnapshot} from '../../casino/jackpots/betfair-sporting-har-overdue-bridge-v1.mjs';
import {analyzeBetfairSportingCorrelatedWebtickersSession} from './betfair-sporting-webtickers-correlated-session-v1.mjs';

const SAMPLE_VERSION='betfair-sporting-dual-feed-calibration-v1.3-frozen-policy';
const MAX_CALIBRATION_CAPTURE_SKEW_SECONDS=5;
const MIN_EXACT_CALIBRATION_SAMPLES=3;
const MIN_DISTINCT_SERVER_TIMESTAMPS=3;
const MIN_DISTINCT_AMOUNTS=2;
const finite=v=>{if(v===null||v===undefined||v===''||typeof v==='boolean')return null;const n=Number(v);return Number.isFinite(n)?n:null;};
const lower=v=>String(v??'').trim().toLowerCase();
const isoEpoch=v=>{const ms=Date.parse(String(v||''));return Number.isFinite(ms)?ms/1000:null;};
const safeEndpoint=v=>{try{const u=new URL(String(v||''));return ['https:','wss:'].includes(u.protocol)?`${u.origin}${u.pathname}`:null;}catch{return null;}};

function fail(reason,extra={}){
  return {
    version:SAMPLE_VERSION,
    mode:'OFFLINE_PASSIVE_LEGACY_XML_VS_MODERN_WEBTICKERS_CALIBRATION_NO_PLAY',
    valid:false,reason,
    calibrationCandidate:false,
    exactStateVectorMatch:false,
    empiricalModernResponseMappingVerified:false,
    exactModernResponseSemanticsVerified:false,
    usableForOverduePair:false,
    execution:{decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0},
    hardGuards:{rawHarNeverEmitted:true,credentialsAndCookiesNeverEmitted:true,failureDiagnosticsRedacted:true,callerCannotWeakenCaptureSkewPolicy:true,callerCannotWeakenCalibrationSeriesPolicy:true,noWagerProbe:true,noAutomaticBetting:true},
    ...extra,
  };
}
function safeLegacySummary(x){
  if(!x||typeof x!=='object')return null;
  return {
    valid:x.valid===true,
    reason:x.reason||null,
    exactApMcCoyRealLauncherBindingVerified:x.exactApMcCoyRealLauncherBindingVerified===true,
    latestPrecedingRealCasinoLauncherIsExactApMcCoy:x.latestPrecedingRealCasinoLauncherIsExactApMcCoy===true,
    latestPostLaunchBetfairInitialResourcesBindingVerified:x.latestPostLaunchBetfairInitialResourcesBindingVerified===true,
    launcherEntryIndex:Number.isInteger(x.launcherEntryIndex)?x.launcherEntryIndex:null,
    configEntryIndex:Number.isInteger(x.configEntryIndex)?x.configEntryIndex:null,
    tickerEntryIndex:Number.isInteger(x.tickerEntryIndex)?x.tickerEntryIndex:null,
    captureEpochSeconds:finite(x.captureEpochSeconds),
    expectedBetfairImsCasino:String(x.expectedBetfairImsCasino||'').trim()||null,
    tickerEndpoint:safeEndpoint(x.tickerEndpoint),
    configSourceEndpoint:safeEndpoint(x.configSourceUrl),
  };
}
function safeModernSummary(x){
  if(!x||typeof x!=='object')return null;
  return {
    valid:x.valid!==false,
    exactApMcCoyRealLauncherBindingObserved:x.exactApMcCoyRealLauncherBindingObserved===true,
    exactSessionRequestSemanticMatchCount:x.exactSessionRequestSemanticMatchCount??0,
    structuredSljp1RowCandidateCount:x.structuredSljp1RowCandidateCount??0,
    correlatedExactDailyCandidateCount:x.correlatedExactDailyCandidateCount??0,
    launcherOrderRejectedCount:x.launcherOrderRejectedCount??0,
    staleExactLauncherRejectedCount:x.staleExactLauncherRejectedCount??0,
    sessionConfigRejectedCount:x.sessionConfigRejectedCount??0,
    ambiguousCorrelationCount:x.ambiguousCorrelationCount??0,
  };
}
function oneModern(analysis){
  const c=analysis?.correlatedExactDailyCandidates||[];
  return c.length===1?c[0]:null;
}
function stateVector(row){
  return {
    game:String(row?.game||row?.code||'').toLowerCase(),
    currency:String(row?.currency||'').toUpperCase(),
    local:finite(row?.local),
    amount:finite(row?.amount),
    guaranteedHitTime:finite(row?.guaranteedHitTime),
    gameTimestamp:finite(row?.gameTimestamp),
    winCount:finite(row?.winCount),
  };
}
function complete(v){return v.game==='sljp-1'&&v.currency==='EUR'&&v.local===0&&v.amount!==null&&v.guaranteedHitTime!==null&&v.gameTimestamp!==null&&v.winCount!==null;}
function exactVectorEqual(a,b){
  return complete(a)&&complete(b)&&a.game===b.game&&a.currency===b.currency&&a.local===b.local&&a.amount===b.amount&&a.guaranteedHitTime===b.guaranteedHitTime&&a.gameTimestamp===b.gameTimestamp&&a.winCount===b.winCount;
}
function sampleContractValid(x){
  if(!x||x.version!==SAMPLE_VERSION||x.valid!==true||x.calibrationCandidate!==true)return false;
  if(x.sameLauncherEntry!==true||x.sameInitialResourcesEntry!==true||x.sameBetfairImsCasino!==true)return false;
  if(!lower(x.expectedBetfairImsCasino)||!safeEndpoint(x.legacyTickerEndpoint)||!safeEndpoint(x.modernTickerEndpoint))return false;
  if(!exactVectorEqual(stateVector(x.legacyStateVector),stateVector(x.modernStateVector)))return false;
  const legacyCapture=finite(x.legacyCaptureEpochSeconds),modernCapture=finite(x.modernCaptureEpochSeconds),maxSkew=finite(x.maxCaptureSkewSeconds);
  if(legacyCapture===null||modernCapture===null||maxSkew===null||maxSkew<0||maxSkew>MAX_CALIBRATION_CAPTURE_SKEW_SECONDS)return false;
  if(Math.abs(modernCapture-legacyCapture)>maxSkew||x.captureSkewWithinPolicy!==true||x.exactStateVectorMatch!==true)return false;
  return true;
}
function sampleFingerprint(x){
  const v=stateVector(x.legacyStateVector);
  return [
    lower(x.expectedBetfairImsCasino),safeEndpoint(x.legacyTickerEndpoint),safeEndpoint(x.modernTickerEndpoint),
    finite(x.legacyCaptureEpochSeconds),finite(x.modernCaptureEpochSeconds),
    v.game,v.currency,v.local,v.amount,v.guaranteedHitTime,v.gameTimestamp,v.winCount,
  ].join('|');
}

export function analyzeBetfairSportingDualFeedCalibrationSample(har,{sourceName='capture.har',maxCaptureSkewSeconds=5}={}){
  const maxSkew=finite(maxCaptureSkewSeconds);
  if(maxSkew===null||maxSkew<0||maxSkew>MAX_CALIBRATION_CAPTURE_SKEW_SECONDS){
    return fail('INVALID_CAPTURE_SKEW_POLICY',{sourceName,maxAllowedCaptureSkewSeconds:MAX_CALIBRATION_CAPTURE_SKEW_SECONDS});
  }
  const legacy=validateBetfairSportingHarSnapshot(har,{sourceName});
  const legacySummary=safeLegacySummary(legacy);
  if(legacy?.valid!==true)return fail('LEGACY_XML_SNAPSHOT_NOT_EXACTLY_VALIDATED',{sourceName,legacy:legacySummary});
  const modern=analyzeBetfairSportingCorrelatedWebtickersSession(har,{sourceName});
  const modernSummary=safeModernSummary(modern);
  const candidate=oneModern(modern);
  if(!candidate)return fail('MODERN_CORRELATED_DAILY_CANDIDATE_NOT_UNIQUE',{sourceName,legacy:legacySummary,modern:modernSummary});

  const sameLauncherEntry=legacy.launcherEntryIndex===candidate.launcherEntryIndex;
  const sameInitialResourcesEntry=legacy.configEntryIndex===candidate.initialResourcesEntryIndex;
  const expectedBetfairImsCasino=String(legacy.expectedBetfairImsCasino||'').trim()||null;
  const sameCasino=lower(expectedBetfairImsCasino)===lower(candidate.expectedBetfairImsCasino)&&!!lower(expectedBetfairImsCasino);
  if(!sameLauncherEntry||!sameInitialResourcesEntry||!sameCasino){
    return fail('DUAL_FEEDS_NOT_FROM_SAME_ATTESTED_AP_MCCOY_SESSION',{sourceName,legacy:legacySummary,modern:modernSummary,sameLauncherEntry,sameInitialResourcesEntry,sameCasino});
  }

  const legacyVector=stateVector(legacy.snapshot);
  const modernVector=stateVector(candidate?.responseRow?.row);
  if(!complete(legacyVector)||!complete(modernVector))return fail('DUAL_FEED_STATE_VECTOR_INCOMPLETE',{sourceName,legacy:legacySummary,modern:modernSummary,legacyStateVector:legacyVector,modernStateVector:modernVector});
  const legacyCapture=finite(legacy.captureEpochSeconds);
  const modernCapture=isoEpoch(candidate?.responseRow?.startedDateTime||candidate?.request?.startedDateTime);
  if(legacyCapture===null||modernCapture===null)return fail('DUAL_FEED_CAPTURE_TIME_MISSING',{sourceName,legacy:legacySummary,modern:modernSummary});
  const legacyTickerEndpoint=safeEndpoint(legacy.tickerEndpoint);
  const modernTickerEndpoint=safeEndpoint(candidate.configuredEndpoint||candidate?.responseRow?.configuredEndpoint||candidate?.request?.endpoint);
  if(!legacyTickerEndpoint||!modernTickerEndpoint)return fail('DUAL_FEED_ENDPOINT_SCOPE_MISSING',{sourceName,legacy:legacySummary,modern:modernSummary});
  const captureSkewSeconds=Math.abs(modernCapture-legacyCapture);
  const captureSkewWithinPolicy=captureSkewSeconds<=maxSkew;
  const exactStateVectorMatch=exactVectorEqual(legacyVector,modernVector);
  const calibrationCandidate=captureSkewWithinPolicy&&exactStateVectorMatch;

  return {
    version:SAMPLE_VERSION,
    mode:'OFFLINE_PASSIVE_LEGACY_XML_VS_MODERN_WEBTICKERS_CALIBRATION_NO_PLAY',
    valid:true,
    sourceName,
    sameLauncherEntry,
    sameInitialResourcesEntry,
    sameBetfairImsCasino:sameCasino,
    expectedBetfairImsCasino,
    legacyTickerEndpoint,
    modernTickerEndpoint,
    legacyCaptureEpochSeconds:legacyCapture,
    modernCaptureEpochSeconds:modernCapture,
    captureSkewSeconds,
    maxCaptureSkewSeconds:maxSkew,
    maxAllowedCaptureSkewSeconds:MAX_CALIBRATION_CAPTURE_SKEW_SECONDS,
    captureSkewWithinPolicy,
    legacyStateVector:legacyVector,
    modernStateVector:modernVector,
    exactStateVectorMatch,
    calibrationCandidate,
    empiricalModernResponseMappingVerified:false,
    exactModernResponseSemanticsVerified:false,
    usableForOverduePair:false,
    scientificUse:'A calibration candidate requires an independently validated legacy Playtech XML sljp-1 snapshot and an exact-session modern webtickers correlated row in the same AP McCoy HAR. Both must share the same launcher, post-launch Betfair initialResources entry and IMS casino, retain explicit legacy and modern endpoint scope, occur within the frozen capture-skew ceiling, and match the complete state vector exactly: game, EUR, local=0, amount, guaranteedHitTime, timestamp and winc. One matching sample is cross-feed consistency evidence only and cannot establish stable modern response semantics or authorize overdue execution.',
    execution:{decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0},
    hardGuards:{onlineOnly:true,nonPromoOnly:true,offlineOnly:true,noNetwork:true,rawHarNeverEmitted:true,credentialsAndCookiesNeverEmitted:true,failureDiagnosticsRedacted:true,callerCannotWeakenCaptureSkewPolicy:true,legacyXmlMustPassExactServerValidator:true,modernCandidateMustPassExactSessionCorrelation:true,sameLauncherAndInitialResourcesRequiredAcrossFeeds:true,sameBetfairImsCasinoRequired:true,legacyAndModernEndpointScopePreserved:true,completeStateVectorRequired:true,exactStateVectorEqualityRequired:true,boundedCaptureSkewRequired:true,singleCalibrationSampleCannotVerifyModernSemantics:true,dualFeedCalibrationCannotAuthorizeGreen:true,noWagerProbe:true,noAutomaticBetting:true},
  };
}

export function evaluateBetfairSportingDualFeedCalibrationSeries(samples,{minExactSamples=MIN_EXACT_CALIBRATION_SAMPLES,minDistinctServerTimestamps=MIN_DISTINCT_SERVER_TIMESTAMPS,minDistinctAmounts=MIN_DISTINCT_AMOUNTS}={}){
  const minSamples=finite(minExactSamples),minTs=finite(minDistinctServerTimestamps),minAmounts=finite(minDistinctAmounts);
  if(!Number.isInteger(minSamples)||minSamples<MIN_EXACT_CALIBRATION_SAMPLES||!Number.isInteger(minTs)||minTs<MIN_DISTINCT_SERVER_TIMESTAMPS||!Number.isInteger(minAmounts)||minAmounts<MIN_DISTINCT_AMOUNTS){
    return fail('INVALID_CALIBRATION_SERIES_POLICY',{minimumPolicy:{minExactSamples:MIN_EXACT_CALIBRATION_SAMPLES,minDistinctServerTimestamps:MIN_DISTINCT_SERVER_TIMESTAMPS,minDistinctAmounts:MIN_DISTINCT_AMOUNTS}});
  }
  const list=Array.isArray(samples)?samples:[];
  const contractExact=list.filter(sampleContractValid);
  const uniqueByFingerprint=new Map();
  for(const sample of contractExact)uniqueByFingerprint.set(sampleFingerprint(sample),sample);
  const exact=[...uniqueByFingerprint.values()];
  const timestamps=new Set(exact.map(x=>x?.legacyStateVector?.gameTimestamp).filter(v=>finite(v)!==null));
  const amounts=new Set(exact.map(x=>x?.legacyStateVector?.amount).filter(v=>finite(v)!==null));
  const ghts=new Set(exact.map(x=>x?.legacyStateVector?.guaranteedHitTime).filter(v=>finite(v)!==null));
  const scopeKeys=new Set(exact.map(x=>[
    lower(x.expectedBetfairImsCasino),
    safeEndpoint(x.legacyTickerEndpoint)||'',
    safeEndpoint(x.modernTickerEndpoint)||'',
    x.legacyStateVector?.game||'',
    x.legacyStateVector?.currency||'',
    x.legacyStateVector?.local,
  ].join('|')));
  const enoughSamples=exact.length>=minSamples;
  const enoughDistinctTimestamps=timestamps.size>=minTs;
  const enoughDistinctAmounts=amounts.size>=minAmounts;
  const oneLogicalScope=scopeKeys.size===1&&exact.length>0;
  const empiricalModernResponseMappingVerified=enoughSamples&&enoughDistinctTimestamps&&enoughDistinctAmounts&&oneLogicalScope;
  return {
    version:'betfair-sporting-dual-feed-calibration-series-v1.4-frozen-policy',
    mode:'OFFLINE_PASSIVE_EMPIRICAL_MODERN_RESPONSE_MAPPING_CALIBRATION_NO_PLAY',
    valid:true,
    sampleCount:list.length,
    contractValidCalibrationSampleCount:contractExact.length,
    exactCalibrationSampleCount:exact.length,
    uniqueExactCalibrationSampleCount:exact.length,
    duplicateExactCalibrationSampleCount:Math.max(0,contractExact.length-exact.length),
    rejectedSampleCount:list.length-contractExact.length,
    distinctServerTimestampCount:timestamps.size,
    distinctAmountCount:amounts.size,
    distinctGuaranteedHitTimeCount:ghts.size,
    logicalScopeCount:scopeKeys.size,
    policy:{minExactSamples:minSamples,minDistinctServerTimestamps:minTs,minDistinctAmounts:minAmounts,hardMinimums:{minExactSamples:MIN_EXACT_CALIBRATION_SAMPLES,minDistinctServerTimestamps:MIN_DISTINCT_SERVER_TIMESTAMPS,minDistinctAmounts:MIN_DISTINCT_AMOUNTS}},
    enoughSamples,enoughDistinctTimestamps,enoughDistinctAmounts,oneLogicalScope,
    empiricalModernResponseMappingVerified,
    exactModernResponseSemanticsVerified:false,
    usableForOverduePair:false,
    scientificUse:'Multiple exact dual-feed matches across changing server timestamps and jackpot amounts can cross-validate that observed modern fields track the provider-documented legacy XML vector only when every accepted sample satisfies the complete calibration-sample contract, duplicate captures are collapsed, all unique samples belong to one exact IMS and stable legacy/modern endpoint scope, and callers cannot lower the frozen minimum sample or state-variation policy. This remains empirical mapping calibration, not independent documentation of the modern schema. exactModernResponseSemanticsVerified stays false and the result cannot enter the overdue execution gate without a separately reviewed promotion standard.',
    execution:{decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0},
    hardGuards:{onlineOnly:true,nonPromoOnly:true,offlineOnly:true,noNetwork:true,rawHarNeverEmitted:true,credentialsAndCookiesNeverEmitted:true,callerCannotWeakenCaptureSkewPolicy:true,callerCannotWeakenCalibrationSeriesPolicy:true,multipleExactDualFeedSamplesRequired:true,fullSampleContractRecomputed:true,duplicateCapturesDoNotCountTowardCalibration:true,stateVariationRequired:true,threeDistinctServerTimestampsRequired:true,twoDistinctAmountsRequired:true,oneExactImsAndEndpointScopeRequired:true,empiricalCalibrationDoesNotEqualDocumentedSemantics:true,noAutomaticPromotionToOverdueGate:true,noWagerProbe:true,noAutomaticBetting:true},
  };
}

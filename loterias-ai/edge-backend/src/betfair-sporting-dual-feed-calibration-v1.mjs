import {validateBetfairSportingHarSnapshot} from '../../casino/jackpots/betfair-sporting-har-overdue-bridge-v1.mjs';
import {analyzeBetfairSportingCorrelatedWebtickersSession} from './betfair-sporting-webtickers-correlated-session-v1.mjs';

const finite=v=>{if(v===null||v===undefined||v===''||typeof v==='boolean')return null;const n=Number(v);return Number.isFinite(n)?n:null;};
const lower=v=>String(v??'').trim().toLowerCase();
const isoEpoch=v=>{const ms=Date.parse(String(v||''));return Number.isFinite(ms)?ms/1000:null;};

function fail(reason,extra={}){
  return {
    version:'betfair-sporting-dual-feed-calibration-v1',
    mode:'OFFLINE_PASSIVE_LEGACY_XML_VS_MODERN_WEBTICKERS_CALIBRATION_NO_PLAY',
    valid:false,reason,
    calibrationCandidate:false,
    exactStateVectorMatch:false,
    empiricalModernResponseMappingVerified:false,
    exactModernResponseSemanticsVerified:false,
    usableForOverduePair:false,
    execution:{decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0},
    ...extra,
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

export function analyzeBetfairSportingDualFeedCalibrationSample(har,{sourceName='capture.har',maxCaptureSkewSeconds=5}={}){
  const maxSkew=finite(maxCaptureSkewSeconds);
  if(maxSkew===null||maxSkew<0)return fail('INVALID_CAPTURE_SKEW_POLICY',{sourceName});
  const legacy=validateBetfairSportingHarSnapshot(har,{sourceName});
  if(legacy?.valid!==true)return fail('LEGACY_XML_SNAPSHOT_NOT_EXACTLY_VALIDATED',{sourceName,legacy});
  const modern=analyzeBetfairSportingCorrelatedWebtickersSession(har,{sourceName});
  const candidate=oneModern(modern);
  if(!candidate)return fail('MODERN_CORRELATED_DAILY_CANDIDATE_NOT_UNIQUE',{sourceName,legacy,modern});

  const sameLauncherEntry=legacy.launcherEntryIndex===candidate.launcherEntryIndex;
  const sameInitialResourcesEntry=legacy.configEntryIndex===candidate.initialResourcesEntryIndex;
  const sameCasino=lower(legacy.expectedBetfairImsCasino)===lower(candidate.expectedBetfairImsCasino)&&!!lower(legacy.expectedBetfairImsCasino);
  if(!sameLauncherEntry||!sameInitialResourcesEntry||!sameCasino){
    return fail('DUAL_FEEDS_NOT_FROM_SAME_ATTESTED_AP_MCCOY_SESSION',{sourceName,legacy,modern,sameLauncherEntry,sameInitialResourcesEntry,sameCasino});
  }

  const legacyVector=stateVector(legacy.snapshot);
  const modernVector=stateVector(candidate?.responseRow?.row);
  if(!complete(legacyVector)||!complete(modernVector))return fail('DUAL_FEED_STATE_VECTOR_INCOMPLETE',{sourceName,legacy,modern,legacyVector,modernVector});
  const legacyCapture=finite(legacy.captureEpochSeconds);
  const modernCapture=isoEpoch(candidate?.responseRow?.startedDateTime||candidate?.request?.startedDateTime);
  if(legacyCapture===null||modernCapture===null)return fail('DUAL_FEED_CAPTURE_TIME_MISSING',{sourceName,legacy,modern});
  const captureSkewSeconds=Math.abs(modernCapture-legacyCapture);
  const captureSkewWithinPolicy=captureSkewSeconds<=maxSkew;
  const exactStateVectorMatch=exactVectorEqual(legacyVector,modernVector);
  const calibrationCandidate=captureSkewWithinPolicy&&exactStateVectorMatch;

  return {
    version:'betfair-sporting-dual-feed-calibration-v1',
    mode:'OFFLINE_PASSIVE_LEGACY_XML_VS_MODERN_WEBTICKERS_CALIBRATION_NO_PLAY',
    valid:true,
    sourceName,
    sameLauncherEntry,
    sameInitialResourcesEntry,
    sameBetfairImsCasino:sameCasino,
    legacyCaptureEpochSeconds:legacyCapture,
    modernCaptureEpochSeconds:modernCapture,
    captureSkewSeconds,
    maxCaptureSkewSeconds:maxSkew,
    captureSkewWithinPolicy,
    legacyStateVector:legacyVector,
    modernStateVector:modernVector,
    exactStateVectorMatch,
    calibrationCandidate,
    empiricalModernResponseMappingVerified:false,
    exactModernResponseSemanticsVerified:false,
    usableForOverduePair:false,
    scientificUse:'A calibration candidate requires an independently validated legacy Playtech XML sljp-1 snapshot and an exact-session modern webtickers correlated row in the same AP McCoy HAR. Both must share the same launcher, same post-launch Betfair initialResources entry and IMS casino, occur within the capture-skew policy, and match the complete state vector exactly: game, EUR, local=0, amount, guaranteedHitTime, timestamp and winc. One matching sample is evidence for cross-feed consistency only; it cannot by itself establish stable modern response semantics or authorize overdue execution.',
    execution:{decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0},
    hardGuards:{onlineOnly:true,nonPromoOnly:true,offlineOnly:true,noNetwork:true,legacyXmlMustPassExactServerValidator:true,modernCandidateMustPassExactSessionCorrelation:true,sameLauncherAndInitialResourcesRequiredAcrossFeeds:true,sameBetfairImsCasinoRequired:true,completeStateVectorRequired:true,exactStateVectorEqualityRequired:true,boundedCaptureSkewRequired:true,singleCalibrationSampleCannotVerifyModernSemantics:true,dualFeedCalibrationCannotAuthorizeGreen:true,noWagerProbe:true,noAutomaticBetting:true},
  };
}

export function evaluateBetfairSportingDualFeedCalibrationSeries(samples,{minExactSamples=3,minDistinctServerTimestamps=2,minDistinctAmounts=2}={}){
  const minSamples=finite(minExactSamples),minTs=finite(minDistinctServerTimestamps),minAmounts=finite(minDistinctAmounts);
  if(!Number.isInteger(minSamples)||minSamples<2||!Number.isInteger(minTs)||minTs<2||!Number.isInteger(minAmounts)||minAmounts<1){
    return fail('INVALID_CALIBRATION_SERIES_POLICY');
  }
  const list=Array.isArray(samples)?samples:[];
  const exact=list.filter(x=>x?.valid===true&&x?.calibrationCandidate===true&&x?.exactStateVectorMatch===true);
  const timestamps=new Set(exact.map(x=>x?.legacyStateVector?.gameTimestamp).filter(v=>finite(v)!==null));
  const amounts=new Set(exact.map(x=>x?.legacyStateVector?.amount).filter(v=>finite(v)!==null));
  const ghts=new Set(exact.map(x=>x?.legacyStateVector?.guaranteedHitTime).filter(v=>finite(v)!==null));
  const sessionKeys=new Set(exact.map(x=>`${x.sameBetfairImsCasino}|${x.legacyStateVector?.game||''}|${x.legacyStateVector?.currency||''}|${x.legacyStateVector?.local}`));
  const enoughSamples=exact.length>=minSamples;
  const enoughDistinctTimestamps=timestamps.size>=minTs;
  const enoughDistinctAmounts=amounts.size>=minAmounts;
  const oneLogicalScope=sessionKeys.size===1;
  const empiricalModernResponseMappingVerified=enoughSamples&&enoughDistinctTimestamps&&enoughDistinctAmounts&&oneLogicalScope;
  return {
    version:'betfair-sporting-dual-feed-calibration-series-v1',
    mode:'OFFLINE_PASSIVE_EMPIRICAL_MODERN_RESPONSE_MAPPING_CALIBRATION_NO_PLAY',
    valid:true,
    sampleCount:list.length,
    exactCalibrationSampleCount:exact.length,
    distinctServerTimestampCount:timestamps.size,
    distinctAmountCount:amounts.size,
    distinctGuaranteedHitTimeCount:ghts.size,
    logicalScopeCount:sessionKeys.size,
    policy:{minExactSamples:minSamples,minDistinctServerTimestamps:minTs,minDistinctAmounts:minAmounts},
    enoughSamples,enoughDistinctTimestamps,enoughDistinctAmounts,oneLogicalScope,
    empiricalModernResponseMappingVerified,
    exactModernResponseSemanticsVerified:false,
    usableForOverduePair:false,
    scientificUse:'Multiple exact dual-feed matches across changing server timestamps and jackpot amounts can cross-validate that the observed modern fields track the provider-documented legacy XML state vector in the captured AP McCoy scope. This is an empirical mapping calibration, not independent documentation of the modern schema. Therefore exactModernResponseSemanticsVerified remains false and the result cannot enter the overdue execution gate without an explicit, separately reviewed promotion standard.',
    execution:{decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0},
    hardGuards:{onlineOnly:true,nonPromoOnly:true,offlineOnly:true,noNetwork:true,multipleExactDualFeedSamplesRequired:true,stateVariationRequired:true,oneLogicalScopeRequired:true,empiricalCalibrationDoesNotEqualDocumentedSemantics:true,noAutomaticPromotionToOverdueGate:true,noWagerProbe:true,noAutomaticBetting:true},
  };
}

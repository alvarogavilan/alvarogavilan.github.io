#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {analyzeBetfairSportingHar} from '../edge-backend/src/betfair-sporting-har-discovery-v1.mjs';
import {analyzeBetfairSportingWebtickersProtocolHar} from '../edge-backend/src/betfair-sporting-webtickers-har-protocol-v1.mjs';
import {analyzeBetfairSportingStructuredWebtickersRows} from '../edge-backend/src/betfair-sporting-webtickers-structured-row-v1.mjs';
import {validateBetfairSportingHarSnapshot} from '../casino/jackpots/betfair-sporting-har-overdue-bridge-v1.mjs';

function usage(){
  return 'Usage: node loterias-ai/scripts/analyze-betfair-sporting-har.mjs <capture.har> [--now-epoch <seconds>]';
}
function finite(v){const n=Number(v);return Number.isFinite(n)?n:null;}
function safeEndpoint(v){
  try{const u=new URL(String(v||''));return ['https:','wss:'].includes(u.protocol)?`${u.origin}${u.pathname}`:null;}catch{return null;}
}
function fail(reason,extra={}){
  return {version:'betfair-sporting-safe-har-cli-v1.2-structured-modern',ok:false,reason,execution:{decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0},...extra};
}
function safeSnapshotValidation(v){
  if(!v||typeof v!=='object')return null;
  const s=v.snapshot||{};
  return {
    valid:v.valid===true,
    reason:v.reason||null,
    exactBetfairSpainTickerImsBindingVerified:v.exactBetfairSpainTickerImsBindingVerified===true,
    exactApMcCoyRealLauncherBindingVerified:v.exactApMcCoyRealLauncherBindingVerified===true,
    expectedBetfairImsCasino:v.expectedBetfairImsCasino||null,
    tickerEndpoint:safeEndpoint(v.tickerEndpoint),
    configSourceUrl:safeEndpoint(v.configSourceUrl),
    snapshot:v.valid===true?{
      code:s.code||null,currency:s.currency||null,local:s.local??null,providerScope:s.providerScope||null,
      amount:s.amount??null,guaranteedHitTime:s.guaranteedHitTime??null,gameTimestamp:s.gameTimestamp??null,
      winCount:s.winCount??null,requestExecInterval:s.requestExecInterval??null,requestCasino:s.requestCasino||null,
    }:null,
    feedAgeSeconds:v.feedAgeSeconds??null,maxFeedAgeSeconds:v.maxFeedAgeSeconds??null,
    decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0,
  };
}
function safeLegacyDiscovery(d){
  const x=d?.discovery||{};
  return {
    version:d?.version||null,sourceName:d?.sourceName||null,entryCount:d?.entryCount??0,relevantEntryCount:d?.relevantEntryCount??0,
    exactApMcCoyRealLauncherBindingObserved:x.exactApMcCoyRealLauncherBindingObserved===true,
    exactApMcCoyRealLauncherBindingCount:(x.exactApMcCoyRealLauncherBindings||[]).length,
    imsCandidates:x.imsCandidates||[],tickerUrlCandidates:(x.tickerUrlCandidates||[]).map(safeEndpoint).filter(Boolean),
    configBindingCandidates:(x.configBindingCandidates||[]).map(b=>({sourceUrl:safeEndpoint(b.sourceUrl),jackpotsCasino:b.jackpotsCasino||null,tickerUrl:safeEndpoint(b.tickerUrl),instanceCode:b.instanceCode||null,sameDocument:b.sameDocument===true,sourceBetfairOwned:b.sourceBetfairOwned===true,sourceInitialResources:b.sourceInitialResources===true})),
    exactTickerEntryCandidateCount:(x.exactTickerEntryCandidates||[]).length,
    pairedServerEvidenceCount:(x.pairedServerEvidence||[]).length,
    currentSljp1RowRecovered:x.currentSljp1RowRecovered===true,
    execution:{decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0},
  };
}
function safeStructuredModern(s){
  const candidates=(s?.structuredSljp1RowCandidates||[]).map(c=>({
    entryIndex:c.entryIndex??null,
    startedDateTime:c.startedDateTime||null,
    payloadKind:c.payloadKind||null,
    payloadIndex:c.payloadIndex??null,
    objectPath:c.objectPath||null,
    configuredEndpoint:safeEndpoint(c.configuredEndpoint),
    expectedBetfairImsCasino:c.expectedBetfairImsCasino||null,
    exactConfiguredEndpointMatch:c.exactConfiguredEndpointMatch===true,
    configuredWebSocketTransportUpgradeObserved:c.configuredWebSocketTransportUpgradeObserved===true,
    requestCasinoMatchesConfiguredBinding:c.requestCasinoMatchesConfiguredBinding===true,
    responseCasinoMatchesConfiguredBinding:c.responseCasinoMatchesConfiguredBinding===true?true:c.responseCasinoMatchesConfiguredBinding===false?false:null,
    row:c.row?{
      game:c.row.game||null,currency:c.row.currency||null,local:c.row.local??null,
      amount:c.row.amount??null,guaranteedHitTime:c.row.guaranteedHitTime??null,gameTimestamp:c.row.gameTimestamp??null,
      winCount:c.row.winCount??null,casino:c.row.casino||null,instanceCode:c.row.instanceCode||null,gameGroup:c.row.gameGroup||null,
    }:null,
    coLocatedRequiredStateFields:c.coLocatedRequiredStateFields===true,
    exactModernResponseSemanticsVerified:false,
    usableForOverduePair:false,
  }));
  return {
    version:s?.version||null,
    exactConfiguredWebtickersTrafficObserved:s?.exactConfiguredWebtickersTrafficObserved===true,
    structuredSljp1RowCandidateCount:candidates.length,
    structuredSljp1RowCandidates:candidates,
    exactModernResponseSemanticsVerified:false,
    usableForOverduePair:false,
    execution:{decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0},
  };
}

export function analyzeSafeHarText(raw,{sourceName='capture.har',nowEpochSeconds=Math.floor(Date.now()/1000)}={}){
  let har;
  try{har=JSON.parse(raw);}catch(error){return fail('HAR_PARSE_FAILED',{error:String(error?.message||error)});}
  let legacy,modern,structured,validated;
  try{legacy=analyzeBetfairSportingHar(har,{sourceName});}catch(error){return fail('LEGACY_DISCOVERY_FAILED',{error:String(error?.message||error)});}
  try{modern=analyzeBetfairSportingWebtickersProtocolHar(har,{sourceName});}catch(error){return fail('MODERN_PROTOCOL_DISCOVERY_FAILED',{error:String(error?.message||error)});}
  try{structured=analyzeBetfairSportingStructuredWebtickersRows(har,{sourceName});}catch(error){return fail('MODERN_STRUCTURED_ROW_DISCOVERY_FAILED',{error:String(error?.message||error)});}
  try{validated=validateBetfairSportingHarSnapshot(har,{sourceName,nowEpochSeconds});}catch(error){validated=fail('SERVER_SNAPSHOT_VALIDATOR_FAILED',{error:String(error?.message||error)});}
  return {
    version:'betfair-sporting-safe-har-cli-v1.2-structured-modern',ok:true,sourceName,
    legacy:safeLegacyDiscovery(legacy),
    modernWebtickers:{
      version:modern?.version||null,
      modernBetfairConfigBindingCount:modern?.modernBetfairConfigBindingCount??0,
      exactConfiguredWebtickersTrafficCount:modern?.exactConfiguredWebtickersTrafficCount??0,
      exactModernWebtickersTrafficObserved:modern?.exactModernWebtickersTrafficObserved===true,
      exactModernRequestContractVerified:false,
      directPublicModernProbeAllowed:false,
      protocolFingerprints:modern?.protocolFingerprints||[],
    },
    structuredModernWebtickers:safeStructuredModern(structured),
    validatedLegacySnapshot:safeSnapshotValidation(validated),
    execution:{decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0},
    hardGuards:{offlineOnly:true,noNetwork:true,rawHarNeverEmitted:true,authorizationAndCookieValuesNeverEmitted:true,endpointQueriesAndFragmentsNeverEmitted:true,sensitiveModernValuesRedacted:true,structuredModernRowsRemainDiscoveryOnly:true,modernResponseSemanticsCannotBeGuessed:true,harCannotAuthorizeGreen:true,noWagerProbe:true,noAutomaticBetting:true},
  };
}

export function main(argv=process.argv.slice(2)){
  const file=argv[0];
  if(!file||file==='--help'||file==='-h'){
    process.stdout.write(`${usage()}\n`);return file?0:2;
  }
  let nowEpochSeconds=Math.floor(Date.now()/1000);
  const i=argv.indexOf('--now-epoch');
  if(i>=0){const n=finite(argv[i+1]);if(n===null){process.stdout.write(`${JSON.stringify(fail('INVALID_NOW_EPOCH'),null,2)}\n`);return 2;}nowEpochSeconds=n;}
  try{
    const raw=fs.readFileSync(file,'utf8');
    const result=analyzeSafeHarText(raw,{sourceName:path.basename(file),nowEpochSeconds});
    process.stdout.write(`${JSON.stringify(result,null,2)}\n`);
    return result.ok?0:1;
  }catch(error){
    process.stdout.write(`${JSON.stringify(fail('HAR_READ_FAILED',{error:String(error?.message||error)}),null,2)}\n`);return 1;
  }
}

if(import.meta.url===`file://${process.argv[1]}`)process.exitCode=main();

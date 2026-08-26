#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {analyzeBetfairSportingHar} from '../edge-backend/src/betfair-sporting-har-discovery-v1.mjs';
import {analyzeBetfairSportingWebtickersProtocolHar} from '../edge-backend/src/betfair-sporting-webtickers-har-protocol-v1.mjs';
import {validateBetfairSportingHarSnapshot} from '../casino/jackpots/betfair-sporting-har-overdue-bridge-v1.mjs';

function usage(){
  return 'Usage: node loterias-ai/scripts/analyze-betfair-sporting-har.mjs <capture.har> [--now-epoch <seconds>]';
}
function finite(v){const n=Number(v);return Number.isFinite(n)?n:null;}
function fail(reason,extra={}){
  return {version:'betfair-sporting-safe-har-cli-v1',ok:false,reason,execution:{decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0},...extra};
}
function safeSnapshotValidation(v){
  if(!v||typeof v!=='object')return null;
  const s=v.snapshot||{};
  return {
    valid:v.valid===true,
    reason:v.reason||null,
    exactBetfairSpainTickerImsBindingVerified:v.exactBetfairSpainTickerImsBindingVerified===true,
    expectedBetfairImsCasino:v.expectedBetfairImsCasino||null,
    tickerEndpoint:v.tickerEndpoint||null,
    configSourceUrl:v.configSourceUrl||null,
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
    imsCandidates:x.imsCandidates||[],tickerUrlCandidates:x.tickerUrlCandidates||[],
    configBindingCandidates:(x.configBindingCandidates||[]).map(b=>({sourceUrl:b.sourceUrl||null,jackpotsCasino:b.jackpotsCasino||null,tickerUrl:b.tickerUrl||null,instanceCode:b.instanceCode||null,sameDocument:b.sameDocument===true,sourceBetfairOwned:b.sourceBetfairOwned===true,sourceInitialResources:b.sourceInitialResources===true})),
    exactTickerEntryCandidateCount:(x.exactTickerEntryCandidates||[]).length,
    pairedServerEvidenceCount:(x.pairedServerEvidence||[]).length,
    currentSljp1RowRecovered:x.currentSljp1RowRecovered===true,
    execution:{decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0},
  };
}

export function analyzeSafeHarText(raw,{sourceName='capture.har',nowEpochSeconds=Math.floor(Date.now()/1000)}={}){
  let har;
  try{har=JSON.parse(raw);}catch(error){return fail('HAR_PARSE_FAILED',{error:String(error?.message||error)});}
  let legacy,modern,validated;
  try{legacy=analyzeBetfairSportingHar(har,{sourceName});}catch(error){return fail('LEGACY_DISCOVERY_FAILED',{error:String(error?.message||error)});}
  try{modern=analyzeBetfairSportingWebtickersProtocolHar(har,{sourceName});}catch(error){return fail('MODERN_PROTOCOL_DISCOVERY_FAILED',{error:String(error?.message||error)});}
  try{validated=validateBetfairSportingHarSnapshot(har,{sourceName,nowEpochSeconds});}catch(error){validated=fail('SERVER_SNAPSHOT_VALIDATOR_FAILED',{error:String(error?.message||error)});}
  return {
    version:'betfair-sporting-safe-har-cli-v1',ok:true,sourceName,
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
    validatedLegacySnapshot:safeSnapshotValidation(validated),
    execution:{decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0},
    hardGuards:{offlineOnly:true,noNetwork:true,rawHarNeverEmitted:true,authorizationAndCookieValuesNeverEmitted:true,sensitiveModernValuesRedacted:true,harCannotAuthorizeGreen:true,noWagerProbe:true,noAutomaticBetting:true},
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

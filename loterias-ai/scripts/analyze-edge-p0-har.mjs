#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {analyzeBetfairApMcCoyCurrentSessionHar} from './analyze-betfair-apmccoy-current-session.mjs';
import {analyzeBet365FrankCurrentSessionHarText} from './analyze-bet365-frank-current-session.mjs';
import {analyzeBotemaniaUltimateVpHarText} from './analyze-botemania-ultimate-vp-har.mjs';
import {analyzeEnRachaIgtHarText} from './analyze-enracha-igt-har.mjs';

const VERSION='analyze-edge-p0-har-v1.1-lane-specific-summary';
const LANES=Object.freeze({
  apmccoy:{label:'Betfair España — AP McCoy Sporting Legends',mode:'json-object'},
  frank:{label:'bet365 España — Frank Bruno Sporting Legends',mode:'raw-text'},
  'ultimate-vp':{label:'Botemania — Ultimate Video Poker · Jotas o Mejor Progresivo',mode:'raw-text'},
  'ocean-magic':{label:'EnRacha — Ocean Magic',mode:'raw-text'},
});
function execution(){return {decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0};}
function fail(reason,extra={}){return {version:VERSION,ok:false,reason,execution:execution(),...extra};}
function usage(){return `Usage: node loterias-ai/scripts/analyze-edge-p0-har.mjs <apmccoy|frank|ultimate-vp|ocean-magic> <capture.har>\n`;}
function safeClosed(lane,result){
  const src=result?.closed&&typeof result.closed==='object'?result.closed:null;
  if(src)return src;
  const a=result?.analysis;
  if(!a||typeof a!=='object')return {};
  if(lane==='ultimate-vp')return {
    targetSessionObserved:a.targetPageObserved===true,
    servedRuleReviewCandidatesFound:a.servedRuleCandidatesAvailable===true,
    exactJackpotTriggerVerified:a.exactJackpotTriggerVerified===true,
    exactJackpotQualifyingStakeVerified:a.exactJackpotQualifyingStakeVerified===true,
  };
  if(lane==='ocean-magic')return {
    exactTargetSessionObserved:a.valid===true&&a.targetPageObserved===true,
    exactIgtProviderFingerprintVerified:a.exactEnRachaIgtWrapperFingerprintVerified===true||a.exactIgtProviderFingerprintVerified===true,
    configurationCandidateObserved:Number(a.configurationCandidateCount||0)>0,
    persistentStateCandidateObserved:Number(a.stateCandidateCount||0)>0||a.persistentStateCandidateObserved===true,
    providerConflictObserved:Number(a.providerConflictCandidateCount||0)>0,
    crossPlayerPersistenceVerified:false,
  };
  return {};
}
export function analyzeEdgeP0HarText(raw,{lane,sourceName='capture.har'}={}){
  if(!LANES[lane])return fail('SUPPORTED_LANE_REQUIRED',{lane,supportedLanes:Object.keys(LANES)});
  if(typeof raw!=='string'||!raw.trim())return fail('HAR_TEXT_REQUIRED',{lane,sourceName});
  let result;
  try{
    if(lane==='apmccoy')result=analyzeBetfairApMcCoyCurrentSessionHar(JSON.parse(raw),{sourceName});
    else if(lane==='frank')result=analyzeBet365FrankCurrentSessionHarText(raw,{sourceName});
    else if(lane==='ultimate-vp')result=analyzeBotemaniaUltimateVpHarText(raw,{sourceName});
    else result=analyzeEnRachaIgtHarText(raw,{gameId:'ocean-magic',sourceName});
  }catch(error){return fail('LANE_ANALYSIS_FAILED',{lane,sourceName,message:String(error?.message||error)});}
  return {
    version:VERSION,
    ok:true,
    lane,
    laneLabel:LANES[lane].label,
    sourceName,
    analysisVersion:result?.version||result?.analysis?.version||null,
    closed:safeClosed(lane,result),
    result,
    execution:execution(),
    scientificUse:'Unified local dispatcher for the four highest-priority passive HAR lanes. It does not fetch network data, place wagers, approve review candidates or authorize execution.',
    hardGuards:{onlineOnly:true,nonPromoOnly:true,offlineOnly:true,passiveHarOnly:true,noNetwork:true,noWagerProbe:true,noAutomaticBetting:true,rawHarNeverEmitted:true,rawResponseBodiesNeverEmitted:true,reviewCandidatesCannotSelfApprove:true,laneSpecificSummaryRequired:true,realMoneyAllowed:false},
  };
}
export function main(argv=process.argv.slice(2)){
  const lane=argv[0],file=argv[1];
  if(!lane||!file||lane==='--help'||lane==='-h'){
    process.stdout.write(usage());
    return lane?0:2;
  }
  try{
    const out=analyzeEdgeP0HarText(fs.readFileSync(file,'utf8'),{lane,sourceName:path.basename(file)});
    process.stdout.write(`${JSON.stringify(out,null,2)}\n`);
    return out.ok?0:1;
  }catch(error){
    process.stdout.write(`${JSON.stringify(fail('HAR_READ_FAILED',{lane,file:path.basename(file),message:String(error?.message||error)}),null,2)}\n`);
    return 1;
  }
}
if(import.meta.url===`file://${process.argv[1]}`)process.exitCode=main();

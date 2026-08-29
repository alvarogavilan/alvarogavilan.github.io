#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {analyzeEdgeP0HarText as analyzeLegacy} from './analyze-edge-p0-har.mjs';
import {analyzeBetfairAotgnHarObject} from './analyze-betfair-aotgn-har.mjs';
import {analyzeBetfairLiveRouletteAogHarObject} from './analyze-betfair-live-roulette-aog-har.mjs';

const VERSION='analyze-edge-p0-har-v2-thirteen-lane-passive';
const NEW_LANES=Object.freeze({
  'betfair-aotgn':'Betfair España — Age of the Gods Norse: King of Asgard · Extra amount-boundary',
  'betfair-live-roulette-aog':'Betfair España — Ruleta en Vivo · Age of Gods progressive network'
});
const LEGACY_LANES=Object.freeze(['apmccoy','casino777-aotgn','frank','ultimate-vp','kingdoms-rise','betfair-regal-riches','magic-nile','scarab','hexbreak3r','golden-egypt','ocean-magic']);
const SUPPORTED=Object.freeze([...LEGACY_LANES,...Object.keys(NEW_LANES)]);
const execution=()=>({decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0});
function fail(reason,extra={}){return {version:VERSION,ok:false,reason,...extra,execution:execution()};}
function safeClosed(lane,a={}){
  if(lane==='betfair-aotgn')return {exactSessionCandidate:a.exactSessionCandidate===true,eurGlobalAognjpRowsObserved:Number(a.eurGlobalRowCount||0)>0,amountBoundaryRowsObserved:Array.isArray(a.amountRows)&&a.amountRows.length>0,exactExtraSemanticCandidate:a.exactExtraSemanticCandidate===true,practiceInputCandidateAvailable:!!a.practiceInputCandidate,qualifyingStakeVerified:a.practiceInputCandidate?.qualifyingStakeEUR!=null,awardFloorVerified:a.practiceInputCandidate?.jackpotAwardFloorEUR!=null,captureProbabilityVerified:a.practiceInputCandidate?.captureProbability!=null,executionAuthorized:false};
  if(lane==='betfair-live-roulette-aog')return {exactSessionCandidate:a.exactSessionCandidate===true,eurGlobalMrjRowsObserved:Number(a.eurGlobalRowCount||0)>0,networkSnapshotCandidateAvailable:!!a.networkSnapshotCandidate,numericTierIdentityVerified:Array.isArray(a.mrjRows)&&a.mrjRows.length>0&&a.mrjRows.every(r=>r.numericTierIdentityVerified===true),exactLiveContributionRateVerified:false,exactLiveBaseRtpExcludingJackpotVerified:false,resetHistorySufficient:false,prospectiveHazardStable:false,executionAuthorized:false};
  return {};
}
export function analyzeEdgeP0HarV2Text(raw,{lane,sourceName='capture.har'}={}){
  if(!SUPPORTED.includes(lane))return fail('SUPPORTED_LANE_REQUIRED',{lane,supportedLanes:SUPPORTED});
  if(typeof raw!=='string'||!raw.trim())return fail('HAR_TEXT_REQUIRED',{lane,sourceName});
  if(LEGACY_LANES.includes(lane)){
    const legacy=analyzeLegacy(raw,{lane,sourceName});
    return {...legacy,dispatcherVersion:VERSION,supportedLaneCount:SUPPORTED.length,supportedLanes:SUPPORTED};
  }
  let har;try{har=JSON.parse(raw);}catch(error){return fail('HAR_PARSE_FAILED',{lane,sourceName,message:String(error?.message||error)});}
  let result;try{result=lane==='betfair-aotgn'?analyzeBetfairAotgnHarObject(har):analyzeBetfairLiveRouletteAogHarObject(har,{sourceName});}catch(error){return fail('LANE_ANALYSIS_FAILED',{lane,sourceName,message:String(error?.message||error)});}
  return {version:VERSION,ok:true,lane,laneLabel:NEW_LANES[lane],sourceName,analysisVersion:result?.version||null,closed:safeClosed(lane,result),result,execution:execution(),scientificUse:'Unified thirteen-lane passive dispatcher. The two new lanes reuse exact Betfair session markers and never infer executable tier mappings or economics from cross-operator sources.',hardGuards:{onlineOnly:true,nonPromoOnly:true,passiveHarOnly:true,noWagerProbe:true,noAutomaticBetting:true,rawHarNeverEmitted:true,queryStringsNeverEmitted:true,crossOperatorRuleTransferForbidden:true,crossLaneGateTransferForbidden:true,practiceCandidatesCannotSelfApprove:true,realMoneyAllowed:false}};
}
export function main(argv=process.argv.slice(2)){const lane=argv[0],file=argv[1];if(!lane||!file||lane==='--help'||lane==='-h'){process.stdout.write(`Usage: node loterias-ai/scripts/analyze-edge-p0-har-v2.mjs <${SUPPORTED.join('|')}> <capture.har>\n`);return lane?0:2;}try{const out=analyzeEdgeP0HarV2Text(fs.readFileSync(file,'utf8'),{lane,sourceName:path.basename(file)});process.stdout.write(`${JSON.stringify(out,null,2)}\n`);return out.ok?0:1;}catch(error){process.stdout.write(`${JSON.stringify(fail('HAR_READ_FAILED',{lane,file:path.basename(file),message:String(error?.message||error)}),null,2)}\n`);return 1;}}
if(import.meta.url===`file://${process.argv[1]}`)process.exitCode=main();

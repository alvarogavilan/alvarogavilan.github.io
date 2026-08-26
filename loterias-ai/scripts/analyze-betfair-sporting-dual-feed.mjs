#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {analyzeBetfairSportingDualFeedCalibrationSample,evaluateBetfairSportingDualFeedCalibrationSeries} from '../edge-backend/src/betfair-sporting-dual-feed-calibration-v1.mjs';

const MAX_CAPTURE_SKEW_SECONDS=5;
function usage(){return 'Usage: node loterias-ai/scripts/analyze-betfair-sporting-dual-feed.mjs <capture.har> [capture2.har ...] [--max-skew <seconds <= 5>]';}
const finite=v=>{const n=Number(v);return Number.isFinite(n)?n:null;};
function fail(reason,extra={}){return {version:'betfair-sporting-dual-feed-cli-v1.2-arg-safe',ok:false,reason,execution:{decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0},hardGuards:{offlineOnly:true,noNetwork:true,rawHarNeverEmitted:true,credentialsAndCookiesNeverEmitted:true,callerCannotRelaxCaptureSkewCeiling:true,noWagerProbe:true,noAutomaticBetting:true},...extra};}

export function parseDualFeedCliArgs(argv=[]){
  const args=Array.isArray(argv)?argv.map(String):[];
  const skewIndices=[];
  for(let i=0;i<args.length;i++)if(args[i]==='--max-skew')skewIndices.push(i);
  if(skewIndices.length>1)return fail('DUPLICATE_MAX_SKEW_OPTION');
  let maxCaptureSkewSeconds=MAX_CAPTURE_SKEW_SECONDS;
  const removed=new Set();
  if(skewIndices.length===1){
    const i=skewIndices[0],v=finite(args[i+1]);
    if(v===null||v<0||v>MAX_CAPTURE_SKEW_SECONDS)return fail('INVALID_CAPTURE_SKEW_POLICY',{maxAllowedCaptureSkewSeconds:MAX_CAPTURE_SKEW_SECONDS});
    maxCaptureSkewSeconds=v;removed.add(i);removed.add(i+1);
  }
  const files=args.filter((arg,i)=>!removed.has(i)&&!arg.startsWith('--'));
  const unknownOptions=args.filter((arg,i)=>!removed.has(i)&&arg.startsWith('--'));
  if(unknownOptions.length)return fail('UNKNOWN_OPTION',{option:unknownOptions[0]});
  if(!files.length)return fail('NO_HAR_INPUTS');
  return {ok:true,files,maxCaptureSkewSeconds,maxAllowedCaptureSkewSeconds:MAX_CAPTURE_SKEW_SECONDS};
}

export function analyzeSafeDualFeedTexts(items,{maxCaptureSkewSeconds=MAX_CAPTURE_SKEW_SECONDS}={}){
  const maxSkew=finite(maxCaptureSkewSeconds);
  if(maxSkew===null||maxSkew<0||maxSkew>MAX_CAPTURE_SKEW_SECONDS)return fail('INVALID_CAPTURE_SKEW_POLICY',{maxAllowedCaptureSkewSeconds:MAX_CAPTURE_SKEW_SECONDS});
  const list=Array.isArray(items)?items:[];
  if(!list.length)return fail('NO_HAR_INPUTS');
  const samples=[];
  for(let i=0;i<list.length;i++){
    const item=list[i]||{};
    let har;
    try{har=typeof item.raw==='string'?JSON.parse(item.raw):item.har;}catch{return fail('HAR_PARSE_FAILED',{inputIndex:i,sourceName:item.sourceName||`capture-${i+1}.har`});}
    samples.push(analyzeBetfairSportingDualFeedCalibrationSample(har,{sourceName:item.sourceName||`capture-${i+1}.har`,maxCaptureSkewSeconds:maxSkew}));
  }
  const series=samples.length>=2?evaluateBetfairSportingDualFeedCalibrationSeries(samples):null;
  return {
    version:'betfair-sporting-dual-feed-cli-v1.2-arg-safe',
    ok:true,
    sampleCount:samples.length,
    maxCaptureSkewSeconds:maxSkew,
    maxAllowedCaptureSkewSeconds:MAX_CAPTURE_SKEW_SECONDS,
    samples,
    series,
    execution:{decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0},
    hardGuards:{offlineOnly:true,noNetwork:true,rawHarNeverEmitted:true,credentialsAndCookiesNeverEmitted:true,endpointQueriesAndFragmentsNeverEmitted:true,callerCannotRelaxCaptureSkewCeiling:true,cliFirstInputNeverDroppedWhenOptionAbsent:true,calibrationCannotAuthorizeGreen:true,noWagerProbe:true,noAutomaticBetting:true},
  };
}

export function main(argv=process.argv.slice(2)){
  if(!argv.length||argv[0]==='--help'||argv[0]==='-h'){
    process.stdout.write(`${usage()}\n`);return argv[0]?0:2;
  }
  const parsed=parseDualFeedCliArgs(argv);
  if(parsed.ok!==true){process.stdout.write(`${JSON.stringify(parsed,null,2)}\n`);return 2;}
  try{
    const items=parsed.files.map(file=>({raw:fs.readFileSync(file,'utf8'),sourceName:path.basename(file)}));
    const result=analyzeSafeDualFeedTexts(items,{maxCaptureSkewSeconds:parsed.maxCaptureSkewSeconds});
    process.stdout.write(`${JSON.stringify(result,null,2)}\n`);
    return result.ok?0:1;
  }catch{
    process.stdout.write(`${JSON.stringify(fail('HAR_READ_FAILED'),null,2)}\n`);return 1;
  }
}

if(import.meta.url===`file://${process.argv[1]}`)process.exitCode=main();

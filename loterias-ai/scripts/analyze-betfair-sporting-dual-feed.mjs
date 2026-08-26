#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {analyzeBetfairSportingDualFeedCalibrationSample,evaluateBetfairSportingDualFeedCalibrationSeries} from '../edge-backend/src/betfair-sporting-dual-feed-calibration-v1.mjs';

function usage(){return 'Usage: node loterias-ai/scripts/analyze-betfair-sporting-dual-feed.mjs <capture.har> [capture2.har ...] [--max-skew <seconds>]';}
const finite=v=>{const n=Number(v);return Number.isFinite(n)?n:null;};
function fail(reason,extra={}){return {version:'betfair-sporting-dual-feed-cli-v1',ok:false,reason,execution:{decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0},hardGuards:{offlineOnly:true,noNetwork:true,rawHarNeverEmitted:true,credentialsAndCookiesNeverEmitted:true,noWagerProbe:true,noAutomaticBetting:true},...extra};}

export function analyzeSafeDualFeedTexts(items,{maxCaptureSkewSeconds=5}={}){
  const maxSkew=finite(maxCaptureSkewSeconds);
  if(maxSkew===null||maxSkew<0)return fail('INVALID_CAPTURE_SKEW_POLICY');
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
    version:'betfair-sporting-dual-feed-cli-v1',
    ok:true,
    sampleCount:samples.length,
    samples,
    series,
    execution:{decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0},
    hardGuards:{offlineOnly:true,noNetwork:true,rawHarNeverEmitted:true,credentialsAndCookiesNeverEmitted:true,endpointQueriesAndFragmentsNeverEmitted:true,calibrationCannotAuthorizeGreen:true,noWagerProbe:true,noAutomaticBetting:true},
  };
}

export function main(argv=process.argv.slice(2)){
  if(!argv.length||argv[0]==='--help'||argv[0]==='-h'){
    process.stdout.write(`${usage()}\n`);return argv[0]?0:2;
  }
  let maxCaptureSkewSeconds=5;
  const skewIndex=argv.indexOf('--max-skew');
  if(skewIndex>=0){
    const v=finite(argv[skewIndex+1]);
    if(v===null||v<0){process.stdout.write(`${JSON.stringify(fail('INVALID_CAPTURE_SKEW_POLICY'),null,2)}\n`);return 2;}
    maxCaptureSkewSeconds=v;
  }
  const files=argv.filter((_,i)=>i!==skewIndex&&i!==skewIndex+1);
  if(!files.length){process.stdout.write(`${JSON.stringify(fail('NO_HAR_INPUTS'),null,2)}\n`);return 2;}
  try{
    const items=files.map(file=>({raw:fs.readFileSync(file,'utf8'),sourceName:path.basename(file)}));
    const result=analyzeSafeDualFeedTexts(items,{maxCaptureSkewSeconds});
    process.stdout.write(`${JSON.stringify(result,null,2)}\n`);
    return result.ok?0:1;
  }catch{
    process.stdout.write(`${JSON.stringify(fail('HAR_READ_FAILED'),null,2)}\n`);return 1;
  }
}

if(import.meta.url===`file://${process.argv[1]}`)process.exitCode=main();

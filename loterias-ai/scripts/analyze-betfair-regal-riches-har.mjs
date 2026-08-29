#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {extractBetfairRegalRichesHarCandidate} from '../edge-live/betfair-regal-riches-har-candidate-v1.mjs';

const VERSION='analyze-betfair-regal-riches-har-v1';
const execution=()=>({decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0});
const fail=(reason,extra={})=>({version:VERSION,ok:false,reason,execution:execution(),...extra});
export function analyzeBetfairRegalRichesHarText(raw,{sourceName='betfair-regal-riches.har'}={}){
  let har;try{har=JSON.parse(raw);}catch(error){return fail('HAR_PARSE_FAILED',{message:String(error?.message||error)});}
  let analysis;try{analysis=extractBetfairRegalRichesHarCandidate(har,{sourceName});}catch(error){return fail('HAR_ANALYSIS_FAILED',{message:String(error?.message||error)});}
  return {version:VERSION,ok:true,sourceName,analysis,execution:execution(),hardGuards:{offlineOnly:true,passiveHarOnly:true,noNetwork:true,rawHarNeverEmitted:true,rawResponseBodiesNeverEmitted:true,requestQueriesNeverEmitted:true,noWagerProbe:true,noAutomaticBetting:true,realMoneyAllowed:false}};
}
export function main(argv=process.argv.slice(2)){
  const file=argv[0];
  if(!file||file==='--help'||file==='-h'){process.stdout.write('Usage: node loterias-ai/scripts/analyze-betfair-regal-riches-har.mjs <capture.har>\n');return file?0:2;}
  try{const out=analyzeBetfairRegalRichesHarText(fs.readFileSync(file,'utf8'),{sourceName:path.basename(file)});process.stdout.write(`${JSON.stringify(out,null,2)}\n`);return out.ok?0:1;}catch(error){process.stdout.write(`${JSON.stringify(fail('HAR_READ_FAILED',{file:path.basename(file),message:String(error?.message||error)}),null,2)}\n`);return 1;}
}
if(import.meta.url===`file://${process.argv[1]}`)process.exitCode=main();

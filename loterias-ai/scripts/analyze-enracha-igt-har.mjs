#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {extractEnRachaIgtPersistentHarCandidate,supportedEnRachaIgtTargets} from '../edge-live/enracha-igt-persistent-har-candidate-v1.mjs';

function execution(){return {decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0};}
function fail(reason,extra={}){return {version:'analyze-enracha-igt-har-v1',ok:false,reason,execution:execution(),...extra};}
export function analyzeEnRachaIgtHarText(raw,{gameId,sourceName='enracha-igt.har'}={}){
  let har;try{har=JSON.parse(raw);}catch(error){return fail('HAR_PARSE_FAILED',{error:String(error?.message||error)});}
  let analysis;try{analysis=extractEnRachaIgtPersistentHarCandidate(har,{gameId,sourceName});}catch(error){return fail('HAR_ANALYSIS_FAILED',{error:String(error?.message||error)});}
  return {version:'analyze-enracha-igt-har-v1',ok:true,sourceName,gameId,analysis,execution:execution(),hardGuards:{offlineOnly:true,noNetwork:true,rawHarNeverEmitted:true,rawResponseBodiesNeverEmitted:true,requestQueriesNeverEmitted:true,oneAccountCannotProveCrossPlayerPersistence:true,noWagerProbe:true,noAutomaticBetting:true}};
}
export function main(argv=process.argv.slice(2)){
  const file=argv[0],gameId=argv[1];
  if(!file||!gameId||file==='--help'||file==='-h'){
    process.stdout.write(`Usage: node loterias-ai/scripts/analyze-enracha-igt-har.mjs <capture.har> <ocean-magic|regal-riches>\nSupported: ${Object.keys(supportedEnRachaIgtTargets()).join(', ')}\n`);
    return file?0:2;
  }
  try{const out=analyzeEnRachaIgtHarText(fs.readFileSync(file,'utf8'),{gameId,sourceName:path.basename(file)});process.stdout.write(`${JSON.stringify(out,null,2)}\n`);return out.ok?0:1;}catch(error){process.stdout.write(`${JSON.stringify(fail('HAR_READ_FAILED',{error:String(error?.message||error)}),null,2)}\n`);return 1;}
}
if(import.meta.url===`file://${process.argv[1]}`)process.exitCode=main();

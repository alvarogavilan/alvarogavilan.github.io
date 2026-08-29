#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {extractBotemaniaUltimateVpHarRuleCandidates} from '../edge-live/botemania-ultimate-vp-har-rule-candidate-v1.mjs';

function fail(reason,extra={}){return {version:'analyze-botemania-ultimate-vp-har-v1',ok:false,reason,execution:{decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0},...extra};}
export function analyzeBotemaniaUltimateVpHarText(raw,{sourceName='ultimate-video-poker.har'}={}){
  let har;try{har=JSON.parse(raw);}catch(error){return fail('HAR_PARSE_FAILED',{error:String(error?.message||error)});}
  let analysis;try{analysis=extractBotemaniaUltimateVpHarRuleCandidates(har,{sourceName});}catch(error){return fail('HAR_RULE_ANALYSIS_FAILED',{error:String(error?.message||error)});}
  return {version:'analyze-botemania-ultimate-vp-har-v1',ok:true,sourceName,analysis,execution:{decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0},hardGuards:{offlineOnly:true,noNetwork:true,rawHarNeverEmitted:true,rawResponseBodiesNeverEmitted:true,requestQueriesNeverEmitted:true,reviewCandidatesCannotSelfApprove:true,noWagerProbe:true,noAutomaticBetting:true}};
}
export function main(argv=process.argv.slice(2)){
  const file=argv[0];if(!file||file==='--help'||file==='-h'){process.stdout.write('Usage: node loterias-ai/scripts/analyze-botemania-ultimate-vp-har.mjs <ultimate-video-poker.har>\n');return file?0:2;}
  try{const out=analyzeBotemaniaUltimateVpHarText(fs.readFileSync(file,'utf8'),{sourceName:path.basename(file)});process.stdout.write(`${JSON.stringify(out,null,2)}\n`);return out.ok?0:1;}catch(error){process.stdout.write(`${JSON.stringify(fail('HAR_READ_FAILED',{error:String(error?.message||error)}),null,2)}\n`);return 1;}
}
if(import.meta.url===`file://${process.argv[1]}`)process.exitCode=main();

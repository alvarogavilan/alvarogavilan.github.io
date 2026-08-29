#!/usr/bin/env node
import fs from 'node:fs';
import {extractBotemaniaUltimateVpHarRuleCandidates} from '../edge-live/botemania-ultimate-vp-har-rule-candidate-v1.mjs';

const VERSION='analyze-botemania-ultimate-vp-har-v1';
const file=process.argv[2];
if(!file){
  console.error('Usage: node loterias-ai/scripts/analyze-botemania-ultimate-vp-har-v1.mjs <ultimate-video-poker.har>');
  process.exitCode=2;
}else{
  try{
    const har=JSON.parse(fs.readFileSync(file,'utf8'));
    const result=extractBotemaniaUltimateVpHarRuleCandidates(har,{sourceName:file.split(/[\\/]/).pop()||'ultimate-video-poker.har'});
    console.log(JSON.stringify({cliVersion:VERSION,...result},null,2));
    if(result.valid!==true)process.exitCode=1;
  }catch(error){
    console.log(JSON.stringify({cliVersion:VERSION,valid:false,reason:'HAR_READ_OR_PARSE_FAILED',errorName:error?.name||'Error',decision:'NO_PLAY',realMoneyAllowed:false,usableForExecution:false},null,2));
    process.exitCode=1;
  }
}

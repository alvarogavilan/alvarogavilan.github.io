#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

const DIR='loterias-ai/casino/jackpots';
const SOURCE=path.join(DIR,'winfall-passive-network-triangulation-v2.mjs');
const TEMP=path.join(DIR,'.tiki-tropico-passive-network-generated.mjs');
const TEMP_OUT=path.join(DIR,'evidence/.tiki-tropico-passive-network-generated.json');
const OUT=path.join(DIR,'evidence/tiki-tropico-passive-network-v1.json');

function replaceOnce(src,from,to,label){
  const first=src.indexOf(from),last=src.lastIndexOf(from);
  if(first<0||first!==last)throw new Error(`expected exactly one ${label} replacement`);
  return src.slice(0,first)+to+src.slice(first+from.length);
}

export function buildConfiguredSource(src){
  let x=String(src);
  x=replaceOnce(x,"const OUT='loterias-ai/casino/jackpots/evidence/winfall-passive-network-triangulation-v2.json';",`const OUT='${TEMP_OUT}';`,'OUT');
  x=replaceOnce(x,"const TARGETS=['winfall-wishes-jackpot','wonderland','la-isla-de-tiki'];","const TARGETS=['la-isla-de-tiki-tropico-dorado'];",'TARGETS');
  x=replaceOnce(x,"const CONTROLS=['paper-wins-jackpot','bote-de-secretos-del-fenix'];","const CONTROLS=['winfall-wishes-jackpot','paper-wins-jackpot'];",'CONTROLS');
  return x;
}

function finalize(raw){
  const x=structuredClone(raw);
  x.version='tiki-tropico-passive-network-v1';
  x.hypothesis={target:'La Isla de Tiki Trópico Dorado',publishedBaseRtpPct:95.39,publishedContributionPct:0.38,publishedKnownPct:95.77,controls:['Winfall Wishes Jackpot','Paper Wins Jackpot']};
  x.decision={...(x.decision||{}),exactLiveIdVerified:false,economicPromotionAllowed:false,realMoneyAllowed:false};
  x.guards={...(x.guards||{}),configuredTargetPagesRequired:true,configuredControlPagesRequired:true,secondFrozenReplicationRequiredBeforeVerification:true,economicPromotionAllowed:false,realMoneyAllowed:false};
  delete x.guards.threeOfficiallyLinkedTargetPagesRequired;
  delete x.guards.twoUnrelatedControlsRequired;
  return x;
}

if(import.meta.url===`file://${process.argv[1]}`){
  const source=fs.readFileSync(SOURCE,'utf8');
  const configured=buildConfiguredSource(source);
  fs.writeFileSync(TEMP,configured);
  try{
    const r=spawnSync(process.execPath,[TEMP],{stdio:'inherit',encoding:'utf8',timeout:150000});
    if(r.error)throw r.error;
    if(r.status!==0)throw new Error(`configured passive probe exited ${r.status}`);
    const raw=JSON.parse(fs.readFileSync(TEMP_OUT,'utf8'));
    const out=finalize(raw);
    if(out?.coverage?.complete!==true)throw new Error('incomplete passive CDP coverage');
    fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');
    console.log(JSON.stringify({version:out.version,coverage:out.coverage,candidates:out?.comparison?.discoveryCandidates||[],decision:out.decision,pages:(out.pages||[]).map(p=>({slug:p.slug,success:p.success,hitCount:(p.hits||[]).length}))},null,2));
  }finally{
    try{fs.rmSync(TEMP,{force:true});}catch{}
    try{fs.rmSync(TEMP_OUT,{force:true});}catch{}
  }
}

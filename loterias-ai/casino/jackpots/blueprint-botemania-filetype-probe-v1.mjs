#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';

const BASE='https://fileservice.blueprintgaming.com/';
const OUT='loterias-ai/casino/jackpots/evidence/blueprint-botemania-filetype-probe-v1.json';
const fileTypes=['help','paytable','payTable','paytablehtml','paytableData','rules','gameRules','config','configuration','metadata','rtp','info'];
const common={affiliate:'',customer:'BOTEMANIA',gameEngineID:'fishingfrenzyjk',language:'ES',profile:'jackpotkingdeluxe3'};
const rows=[];
for(const fileType of fileTypes){
  const u=new URL(BASE);for(const [k,v] of Object.entries({...common,fileType}))u.searchParams.set(k,v);
  try{
    const r=await fetch(u,{redirect:'follow',headers:{accept:'text/html,application/json,*/*','user-agent':'loterias-ai-blueprint-filetype-probe/1.0'}});
    const text=await r.text();
    const flat=text.replace(/<[^>]+>/g,' ').replace(/&nbsp;/gi,' ').replace(/\s+/g,' ').trim();
    const contexts=[];
    for(const needle of ['Must Be Won By','MBWB','APUESTA TOTAL','Total Bet','3500','35000','Regal','Royal']){
      const i=flat.toLowerCase().indexOf(needle.toLowerCase());
      if(i>=0)contexts.push({needle,context:flat.slice(Math.max(0,i-180),Math.min(flat.length,i+420))});
    }
    rows.push({fileType,httpStatus:r.status,ok:r.ok,finalUrl:r.url,contentType:r.headers.get('content-type'),bytes:text.length,sha256:crypto.createHash('sha256').update(text).digest('hex'),contexts:contexts.slice(0,12)});
  }catch(e){rows.push({fileType,httpStatus:null,ok:false,error:String(e?.message||e)});}
}
const candidates=rows.filter(x=>x.ok&&x.bytes>0&&x.fileType!=='help');
const out={version:'blueprint-botemania-filetype-probe-v1',generatedAt:new Date().toISOString(),gameEngineID:common.gameEngineID,customer:common.customer,profile:common.profile,rows,decision:{nonHelpPublicResourcesRecovered:candidates.length>0,candidateFileTypes:candidates.map(x=>x.fileType),exactSpainMbwbRecovered:candidates.some(x=>x.contexts?.some(c=>/3500|35000|must be won by|mbwb/i.test(c.context||''))),exactStakeLadderRecovered:false},guards:{officialBlueprintHostOnly:true,publicUnauthenticatedOnly:true,noIntrospection:true,noBetting:true}};
fs.mkdirSync('loterias-ai/casino/jackpots/evidence',{recursive:true});fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify(out,null,2));

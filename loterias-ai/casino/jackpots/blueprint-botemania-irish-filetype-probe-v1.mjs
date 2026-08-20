#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';

const BASE='https://fileservice.blueprintgaming.com/';
const OUT='loterias-ai/casino/jackpots/evidence/blueprint-botemania-irish-filetype-probe-v1.json';
const fileTypes=['help','paytable','payTable','paytablehtml','paytableData','rules','gameRules','config','configuration','metadata','rtp','info'];
const common={affiliate:'',customer:'BOTEMANIA',gameEngineID:'irishriches',language:'ES',profile:'jackpotkingdeluxe3'};
const rows=[];
const flatten=s=>String(s||'').replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#160;/gi,' ').replace(/&euro;|&#8364;/gi,'€').replace(/&amp;/gi,'&').replace(/&quot;/gi,'"').replace(/&#39;|&apos;/gi,"'").replace(/\s+/g,' ').trim();
for(const fileType of fileTypes){
  const u=new URL(BASE);for(const [k,v] of Object.entries({...common,fileType}))u.searchParams.set(k,v);
  try{
    const r=await fetch(u,{redirect:'follow',headers:{accept:'text/html,application/json,*/*','user-agent':'loterias-ai-blueprint-irish-filetype-probe/1.0','cache-control':'no-cache'}});
    const body=await r.text();const flat=flatten(body);
    const contexts=[];
    for(const needle of ['Debe ser ganado antes de','Debe ganarse antes de','Must Be Won By','MBWB','APUESTA TOTAL','Total Bet','Apuesta Total','Regal','Royal','Majestuoso','Bote Real','reserva','contribución']){
      let p=0,c=0,low=flat.toLowerCase(),n=needle.toLowerCase();while(c<8){const at=low.indexOf(n,p);if(at<0)break;contexts.push({needle,context:flat.slice(Math.max(0,at-500),Math.min(flat.length,at+needle.length+900))});p=at+n.length;c++;}
    }
    const money=[...new Set([...flat.matchAll(/(?:€\s*)?(\d{1,7}(?:[.,]\d{1,2})?)\s*€/g)].map(m=>m[0]))].slice(0,100);
    const pcts=[...new Set([...flat.matchAll(/\d{1,3}(?:[.,]\d+)?\s*%/g)].map(m=>m[0]))].slice(0,100);
    rows.push({fileType,httpStatus:r.status,ok:r.ok,finalUrl:r.url,contentType:r.headers.get('content-type'),bytes:body.length,sha256:crypto.createHash('sha256').update(body).digest('hex'),money,pcts,contexts:contexts.slice(0,40),preview:flat.slice(0,1800)});
  }catch(e){rows.push({fileType,httpStatus:null,ok:false,error:String(e?.message||e)});}
}
const nonHelp=rows.filter(x=>x.fileType!=='help'&&x.ok&&x.bytes>0);
const mbwbCandidateRows=rows.filter(x=>x.contexts?.some(c=>/Debe ser ganado antes de|Debe ganarse antes de|Must Be Won By|MBWB/i.test(c.context||'')));
const stakeCandidateRows=rows.filter(x=>x.contexts?.some(c=>/APUESTA TOTAL|TOTAL BET/i.test(c.context||''))&&x.money?.length>=3);
const out={version:'blueprint-botemania-irish-filetype-probe-v1',generatedAt:new Date().toISOString(),operator:'botemania-es',game:'Irish Riches Megaways: Jackpot King',gameEngineID:common.gameEngineID,profile:common.profile,customer:common.customer,language:common.language,rows,decision:{nonHelpPublicResourcesRecovered:nonHelp.length>0,candidateFileTypes:nonHelp.map(x=>x.fileType),mbwbSemanticsRecovered:mbwbCandidateRows.length>0,exactSpainMbwbRecovered:false,exactStakeLadderRecovered:false,stakeCandidateFileTypes:stakeCandidateRows.map(x=>x.fileType),realMoneyAllowed:false},guards:{officialBlueprintHostOnly:true,customerBotemania:true,languageES:true,publicUnauthenticatedOnly:true,noIntrospection:true,noCrossOperatorSubstitution:true,noForeignMbwbImport:true,noBetting:true,realMoneyAllowed:false}};
fs.mkdirSync('loterias-ai/casino/jackpots/evidence',{recursive:true});fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify({decision:out.decision,rows:rows.map(x=>({fileType:x.fileType,httpStatus:x.httpStatus,ok:x.ok,bytes:x.bytes,finalUrl:x.finalUrl,money:x.money,pcts:x.pcts,contexts:(x.contexts||[]).slice(0,6)}))},null,2));

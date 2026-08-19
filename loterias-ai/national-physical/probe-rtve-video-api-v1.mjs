#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';
const IN='loterias-ai/national-physical/evidence/rtve-media-probe-v1.json';
const OUT='loterias-ai/national-physical/evidence/rtve-video-api-probe-v1.json';
const d=JSON.parse(fs.readFileSync(IN,'utf8'));
function collectUrls(x,out=[]){if(typeof x==='string'){if(/^https?:\/\//i.test(x))out.push(x);return out}if(Array.isArray(x)){for(const v of x)collectUrls(v,out);return out}if(x&&typeof x==='object')for(const v of Object.values(x))collectUrls(v,out);return out}
const results=[];
for(const item of (d.results||[])){
  const id=(item.playerIds||[])[0]; if(!id)continue;
  const endpoints=[`https://www.rtve.es/api/videos/${id}/config/video`,`https://www.rtve.es/api/videos/${id}/calidades`,`https://www.rtve.es/api/videos/${id}`];
  const probes=[];
  for(const url of endpoints){
    try{const r=await fetch(url,{headers:{accept:'application/json,text/plain,*/*','user-agent':'loterias-ai-rtve-video-api-probe/1.0'}});const text=await r.text();let json=null;try{json=JSON.parse(text)}catch{}const urls=[...new Set(collectUrls(json??text,[]))];const direct=urls.filter(u=>/\.m3u8(?:\?|$)|\.mp4(?:\?|$)|\.mpd(?:\?|$)|rtve-hlsvod|secure\.footprint\.net\/resources/i.test(u));probes.push({url,httpStatus:r.status,contentType:r.headers.get('content-type'),bodySha256:crypto.createHash('sha256').update(text).digest('hex'),allUrls:urls.slice(0,100),directMediaUrls:direct.slice(0,50)});}catch(e){probes.push({url,error:String(e?.message||e),directMediaUrls:[]});}
  }
  const direct=[...new Set(probes.flatMap(p=>p.directMediaUrls||[]))];results.push({title:item.title,dateText:item.dateText,playerId:id,probes,directMediaUrls:direct,directMediaCount:direct.length});
}
const payload={version:'rtve-video-api-probe-v1',generatedAt:new Date().toISOString(),summary:{videos:results.length,withDirectMedia:results.filter(x=>x.directMediaCount>0).length,directMediaUrls:results.reduce((a,x)=>a+x.directMediaCount,0)},results,guards:{officialRTVEApiOnly:true,noOCR:true,noOutcomeModelingFromProbe:true,realMoneyAllowed:false}};
fs.writeFileSync(OUT,JSON.stringify(payload,null,2)+'\n');console.log(JSON.stringify(payload.summary,null,2));
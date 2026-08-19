#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';
const MAN='loterias-ai/national-physical/evidence/rtve-video-manifest-v1.json';const j=JSON.parse(fs.readFileSync(MAN,'utf8'));const sample=(j.videos||[]).slice(0,8);const out=[];
for(const v of sample){
  try{
    const r=await fetch(v.url,{headers:{accept:'text/html','user-agent':'loterias-ai-rtve-media-probe/1.0'}});const html=await r.text();if(!r.ok)throw new Error(`HTTP ${r.status}`);
    const urls=[];for(const re of [/https?:\\?\/\\?\/[^"'<> ]+\.m3u8[^"'<> ]*/gi,/https?:\\?\/\\?\/[^"'<> ]+\.mp4[^"'<> ]*/gi,/"(?:contentUrl|embedUrl|urlVideo|videoUrl|src)"\s*:\s*"([^"]+)"/gi])for(const m of html.matchAll(re)){let u=m[1]||m[0];u=u.replace(/\\\//g,'/').replace(/\\u002F/gi,'/');if(/^https?:\/\//i.test(u))urls.push(u);}
    const meta=[...new Set(urls)].slice(0,30);
    const playerIds=[...html.matchAll(/(?:assetId|videoId|contentId|idasset|id_video)["'=:\s]+["']?(\d{5,})/gi)].map(m=>m[1]);
    out.push({url:v.url,title:v.title,dateText:v.dateText,durationSeconds:v.durationSeconds,httpStatus:r.status,pageSha256:crypto.createHash('sha256').update(html).digest('hex'),mediaUrls:meta,playerIds:[...new Set(playerIds)].slice(0,20),mediaCandidateCount:meta.length});
  }catch(e){out.push({url:v.url,error:String(e?.message||e)});}
}
const payload={version:'rtve-media-probe-v1',generatedAt:new Date().toISOString(),sampleSize:sample.length,results:out,summary:{pages:out.length,pagesWithMediaCandidate:out.filter(x=>x.mediaCandidateCount>0).length,totalMediaCandidates:out.reduce((a,x)=>a+(x.mediaCandidateCount||0),0)},guards:{officialRTVEOnly:true,probeOnlyNoVideoMutation:true,noOCR:true,realMoneyAllowed:false}};fs.mkdirSync('loterias-ai/national-physical/evidence',{recursive:true});fs.writeFileSync('loterias-ai/national-physical/evidence/rtve-media-probe-v1.json',JSON.stringify(payload,null,2)+'\n');console.log(JSON.stringify(payload.summary,null,2));

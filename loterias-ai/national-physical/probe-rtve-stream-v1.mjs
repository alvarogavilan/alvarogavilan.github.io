#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';
const IN='loterias-ai/national-physical/evidence/rtve-media-probe-v1.json';
const OUT='loterias-ai/national-physical/evidence/rtve-stream-probe-v1.json';
const d=JSON.parse(fs.readFileSync(IN,'utf8'));
const rows=[];
for(const item of (d.results||[])){
  const embed=(item.mediaUrls||[])[0];
  if(!embed)continue;
  try{
    const r=await fetch(embed,{headers:{accept:'text/html,application/xhtml+xml','user-agent':'loterias-ai-rtve-stream-probe/1.0'}});
    const html=await r.text();
    const decoded=html.replace(/\\u002F/g,'/').replace(/\\\//g,'/').replace(/&amp;/g,'&');
    const urls=[...decoded.matchAll(/https?:[^"'<>\s]+/g)].map(m=>m[0].replace(/[),;]+$/,''));
    const media=[...new Set(urls.filter(u=>/\.m3u8(?:\?|$)|\.mp4(?:\?|$)|\.mpd(?:\?|$)|\/resources\/|\/api\/videos\//i.test(u)))];
    rows.push({title:item.title,dateText:item.dateText,playerId:(item.playerIds||[])[0]||null,embedUrl:embed,httpStatus:r.status,finalUrl:r.url,embedSha256:crypto.createHash('sha256').update(html).digest('hex'),mediaCandidates:media.slice(0,50),directStreamCandidates:media.filter(u=>/\.m3u8(?:\?|$)|\.mp4(?:\?|$)|\.mpd(?:\?|$)/i.test(u)).slice(0,20),directStreamCount:media.filter(u=>/\.m3u8(?:\?|$)|\.mp4(?:\?|$)|\.mpd(?:\?|$)/i.test(u)).length});
  }catch(e){rows.push({title:item.title,dateText:item.dateText,embedUrl:embed,error:String(e?.message||e),directStreamCount:0});}
}
const payload={version:'rtve-stream-probe-v1',generatedAt:new Date().toISOString(),source:'RTVE official embeds derived from rtve-media-probe-v1',summary:{embeds:rows.length,http200:rows.filter(x=>x.httpStatus===200).length,withDirectStream:rows.filter(x=>x.directStreamCount>0).length,directStreamCandidates:rows.reduce((a,x)=>a+Number(x.directStreamCount||0),0)},results:rows,guards:{officialRTVEEmbedOnly:true,noOCR:true,noVideoMutation:true,noOutcomeModelingFromProbe:true,realMoneyAllowed:false}};
fs.writeFileSync(OUT,JSON.stringify(payload,null,2)+'\n');
console.log(JSON.stringify(payload.summary,null,2));
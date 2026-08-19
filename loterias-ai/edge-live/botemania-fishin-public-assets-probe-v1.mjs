#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';

const slug='fishin-frenzy-jpk';
const base='https://www.botemania.es/gametiles';
const candidates=[];
for(const scale of ['scale-1','scale-2']){
  for(const bp of [300,444,588,684,972]){
    for(const type of ['05','15']){
      candidates.push(`${base}/${slug}/${scale}/${slug}-tile-${type}-${bp}.webp`);
    }
  }
}
const rows=[];
for(const url of candidates){
  try{
    const r=await fetch(url,{headers:{accept:'image/webp,image/*,*/*','user-agent':'loterias-ai-edge-live-asset-probe/1.0'},redirect:'follow'});
    const b=Buffer.from(await r.arrayBuffer());
    rows.push({url,httpStatus:r.status,ok:r.ok,contentType:r.headers.get('content-type'),bytes:b.length,sha256:r.ok?crypto.createHash('sha256').update(b).digest('hex'):null});
  }catch(e){rows.push({url,ok:false,error:String(e?.message||e)});}
}
const valid=rows.filter(x=>x.ok&&String(x.contentType||'').startsWith('image/')&&x.bytes>1000).sort((a,b)=>b.bytes-a.bytes);
const preferred=valid.find(x=>x.url.includes('tile-05-588'))||valid[0]||null;
const out={version:'botemania-fishin-public-assets-probe-v1',generatedAt:new Date().toISOString(),operator:'botemania-es',imageSlug:slug,candidates:rows,decision:{officialPublicArtworkRecovered:Boolean(preferred),preferredArtworkUrl:preferred?.url||null},guards:{publicUnauthenticatedAssetsOnly:true,noCookies:true,noSession:true,noBetting:true}};
fs.mkdirSync('loterias-ai/edge-live/evidence',{recursive:true});
fs.writeFileSync('loterias-ai/edge-live/evidence/botemania-fishin-public-assets-probe-v1.json',JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify(out.decision,null,2));

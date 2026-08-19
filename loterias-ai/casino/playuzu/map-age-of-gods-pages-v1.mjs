#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';
const CAT='loterias-ai/casino/playuzu/evidence/validated-game-catalog-v1.json';
const OUT='loterias-ai/casino/playuzu/evidence/age-of-gods-page-map-v1.json';
const cat=JSON.parse(fs.readFileSync(CAT,'utf8'));
const category=(cat.categories||[]).find(x=>String(x.category)==='jackpot'&&x.backendPath);
if(!category) throw new Error('validated jackpot backend missing');
const appName='PlayUZU.es';
const hits=[];const pages=[];
for(let page=1;page<=Math.max(1,Number(category.lastPage||1));page++){
 const url=`${category.backendPath}?page=${page}&appName=${encodeURIComponent(appName)}`;
 const r=await fetch(url,{headers:{accept:'application/json','user-agent':'loterias-ai-aotg-page-map/1.0','referer':'https://www.playuzu.es/jackpots/','origin':'https://www.playuzu.es'}});
 const text=await r.text();let j=null;try{j=JSON.parse(text)}catch{};
 const data=Array.isArray(j?.data)?j.data:[];
 const age=data.filter(g=>/(age of the gods|aotg)/i.test(String(g.application_name||g.item_title||''))).map(g=>({name:g.application_name||g.item_title,page,jackpot:g.jackpot??null,jackpotAmount:g.jackpot_amount??null,internalGameId:g.internal_game_id??null}));
 hits.push(...age);pages.push({page,httpStatus:r.status,itemCount:data.length,ageCount:age.length,sha256:crypto.createHash('sha256').update(text).digest('hex')});
}
const payload={version:'age-of-gods-page-map-v1',generatedAt:new Date().toISOString(),appName,backendPath:category.backendPath,summary:{pages:pages.length,pagesWithAge:pages.filter(x=>x.ageCount>0).length,ageGames:hits.length},pages,hits,guards:{diagnosticOnly:true,noBetting:true,realMoneyAllowed:false}};
fs.writeFileSync(OUT,JSON.stringify(payload,null,2)+'\n');console.log(JSON.stringify(payload.summary,null,2));
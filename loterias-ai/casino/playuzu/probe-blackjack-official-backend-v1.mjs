#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';
const PROV='loterias-ai/casino/playuzu/evidence/blackjack-official-backend-provenance-v1.json';
const OUT='loterias-ai/casino/playuzu/evidence/blackjack-official-backend-probe-v1.json';
const p=JSON.parse(fs.readFileSync(PROV,'utf8'));
if(p.immutable!==true||p.provenance?.backendUrlWasEmbeddedInOfficialPlayUZUHtmlBeforeFirstApiFetch!==true||p.guards?.realMoneyAllowed!==false)throw new Error('backend provenance drift');
const base=p.discoveredBackend;
const pages=[];let next=true,page=1;
while(next&&page<=10){
  const url=`${base}?page=${page}`;
  const r=await fetch(url,{headers:{accept:'application/json','user-agent':'loterias-ai-playuzu-blackjack-backend-probe/1.0','referer':'https://www.playuzu.es/blackjack/','origin':'https://www.playuzu.es'}});
  const text=await r.text();let json=null;try{json=JSON.parse(text)}catch{}
  const items=Array.isArray(json)?json:Array.isArray(json?.data)?json.data:Array.isArray(json?.items)?json.items:Array.isArray(json?.games)?json.games:[];
  pages.push({page,url,httpStatus:r.status,contentType:r.headers.get('content-type'),bodySha256:crypto.createHash('sha256').update(text).digest('hex'),topLevelKeys:json&&typeof json==='object'&&!Array.isArray(json)?Object.keys(json):[],itemCount:items.length,sampleItems:items.slice(0,50)});
  if(!r.ok||!json||items.length===0)break;
  const hasNext=Boolean(json?.next||json?.nextPage||json?.pagination?.next||json?.meta?.next_page||json?.meta?.current_page<json?.meta?.last_page||json?.pagination?.currentPage<json?.pagination?.totalPages);
  next=hasNext||items.length>=20;page++;
}
function flatten(o,prefix='',out={}){if(o==null)return out;if(Array.isArray(o)){out[prefix]=o;return out}if(typeof o!=='object'){out[prefix]=o;return out}for(const [k,v] of Object.entries(o)){const key=prefix?`${prefix}.${k}`:k;if(v&&typeof v==='object'&&!Array.isArray(v))flatten(v,key,out);else out[key]=v}return out}
const rawItems=pages.flatMap(x=>x.sampleItems||[]);
const rows=rawItems.map((item,i)=>{const f=flatten(item);const pick=(patterns)=>{for(const [k,v] of Object.entries(f))if(patterns.some(rx=>rx.test(k)))return v;return null};return {i,name:pick([/(^|\.)name$/i,/title$/i,/gameName/i]),id:pick([/(^|\.)id$/i,/gameId/i,/game_id/i,/slug/i]),provider:pick([/provider.*name/i,/vendor.*name/i,/developer/i,/provider$/i]),rtp:pick([/(^|\.)rtp$/i,/return.*player/i,/payout.*percent/i]),uzuplus:pick([/uzu.*plus/i,/cashback/i,/reward.*rate/i,/return.*percent/i]),minBet:pick([/min.*bet/i,/minimum.*bet/i]),maxBet:pick([/max.*bet/i,/maximum.*bet/i]),url:pick([/url$/i,/link$/i,/href$/i]),allFields:f};});
const fieldNames=[...new Set(rows.flatMap(r=>Object.keys(r.allFields||{})))].sort();
const economicFields=fieldNames.filter(k=>/rtp|return|payout|cashback|uzu|reward|bet|stake|provider|vendor|game/i.test(k));
const payload={version:'blackjack-official-backend-probe-v1',generatedAt:new Date().toISOString(),provenanceVersion:p.version,sourcePage:p.officialPage,backend:base,summary:{pages:pages.length,http200Pages:pages.filter(x=>x.httpStatus===200).length,rawItems:rawItems.length,parsedRows:rows.length,withRtp:rows.filter(x=>x.rtp!=null).length,withUzuplus:rows.filter(x=>x.uzuplus!=null).length,withProvider:rows.filter(x=>x.provider!=null).length},economicFields,rows:rows.slice(0,300),pages:pages.map(x=>({...x,sampleItems:undefined})),guards:{sameBackendAsFrozenProvenance:true,noLoginBypass:true,noBetting:true,noEconomicPromotionFromProbe:true,realMoneyAllowed:false}};
fs.writeFileSync(OUT,JSON.stringify(payload,null,2)+'\n');console.log(JSON.stringify({summary:payload.summary,economicFields},null,2));
#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';
const CAT='loterias-ai/casino/playuzu/evidence/validated-game-catalog-v1.json';
const OUT='loterias-ai/casino/playuzu/evidence/orient-story-raw-economics-v1.json';
const d=JSON.parse(fs.readFileSync(CAT,'utf8'));
const rec=(d.categories||[]).find(x=>String(x.category)==='jackpot'&&x.backendPath);
if(!rec)throw new Error('official jackpot backend path not found in frozen validated catalog');
const appName='PlayUZU.es';let found=null,sourcePage=null;
for(let p=1;p<=Math.max(1,Number(rec.lastPage||1));p++){
  const url=`${rec.backendPath}?page=${p}&appName=${encodeURIComponent(appName)}`;
  const r=await fetch(url,{headers:{accept:'application/json','user-agent':'loterias-ai-orient-raw/1.0','referer':'https://www.playuzu.es/jackpots/','origin':'https://www.playuzu.es'}});
  const text=await r.text();let j=null;try{j=JSON.parse(text)}catch{}
  const items=Array.isArray(j?.data)?j.data:[];
  const hit=items.find(g=>/orient story deluxe/i.test(String(g.application_name||g.item_title||'')));
  if(hit){found=hit;sourcePage={page:p,url,httpStatus:r.status,bodySha256:crypto.createHash('sha256').update(text).digest('hex')};break;}
  if(!r.ok||!items.length)break;
}
if(!found)throw new Error('Orient Story Deluxe not found in official jackpot backend');
function flatten(o,prefix='',out={}){if(o==null)return out;if(Array.isArray(o)){out[prefix]=o;return out}if(typeof o!=='object'){out[prefix]=o;return out}for(const [k,v] of Object.entries(o)){const key=prefix?`${prefix}.${k}`:k;if(v&&typeof v==='object'&&!Array.isArray(v))flatten(v,key,out);else out[key]=v}return out}
const flat=flatten(found),economic={};for(const [k,v] of Object.entries(flat))if(/rtp|jackpot|progress|pot|award|prize|reward|bonus|bet|stake|contribution|return|percent|provider|vendor|volatil|win/i.test(k))economic[k]=v;
const payload={version:'orient-story-raw-economics-v1',generatedAt:new Date().toISOString(),sourcePage:'https://www.playuzu.es/jackpots/',backendPath:rec.backendPath,appName,sourceRequest:sourcePage,gameIdentity:{name:found.application_name??found.item_title,internalGameId:found.internal_game_id,externalGameId:found.external_game_id,provider:found.game_provider,studio:found.studio},economicFields:economic,rawObject:found,interpretation:{positiveEVKnown:false,reason:'Raw official fields are evidence only. Current pot state, jackpot contribution/hazard and exact reward semantics must be explicit before economic interpretation.'},guards:{officialPlayUZUPageSeededBackendOnly:true,exactObservedAppNameOnly:true,noLoginBypass:true,noBetting:true,realMoneyAllowed:false}};
fs.writeFileSync(OUT,JSON.stringify(payload,null,2)+'\n');console.log(JSON.stringify({game:payload.gameIdentity,economicFields},null,2));
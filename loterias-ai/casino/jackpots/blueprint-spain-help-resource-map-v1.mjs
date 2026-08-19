#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';

const BASE='https://fileservice.blueprintgaming.com/';
const u=new URL(BASE);
u.searchParams.set('affiliate','');
u.searchParams.set('customer','BOTEMANIA');
u.searchParams.set('fileType','help');
u.searchParams.set('gameEngineID','fishingfrenzyjk');
u.searchParams.set('language','ES');
u.searchParams.set('profile','jackpotkingdeluxe3');
const OUT='loterias-ai/casino/jackpots/evidence/blueprint-spain-help-resource-map-v1.json';
const r=await fetch(u,{headers:{'user-agent':'loterias-ai-blueprint-help-resource-map/1.0',accept:'text/html,*/*'},redirect:'follow'});
const html=await r.text();
const attrs=[];
for(const re of [/(?:href|src|action)\s*=\s*["']([^"']+)["']/gi,/url\(\s*["']?([^"')]+)["']?\s*\)/gi]){
 for(const m of html.matchAll(re)){
  const raw=m[1].replace(/&amp;/g,'&');
  let resolved=null;try{resolved=new URL(raw,r.url).href}catch{}
  if(!attrs.some(x=>x.raw===raw&&x.resolved===resolved))attrs.push({raw,resolved});
 }
}
const stringHints=[];
for(const m of html.matchAll(/["'`]([^"'`\n]{1,400})["'`]/g)){
 const s=m[1];
 if(!/(paytable|pay table|payout|rules|jackpot|royal|regal|must.?be.?won|fishingfrenzy|BP_FishingFrenzyJK)/i.test(s))continue;
 if(!stringHints.includes(s))stringHints.push(s);
 if(stringHints.length>=250)break;
}
const contexts=[];
const low=html.toLowerCase();
for(const needle of ['paytable','pay table','payout','must be won by','royal','regal','jackpotkingdeluxe3','bp_fishingfrenzyjk','fishingfrenzyjk']){
 let from=0,count=0;while(count<20){const i=low.indexOf(needle.toLowerCase(),from);if(i<0)break;contexts.push({needle,context:html.slice(Math.max(0,i-800),Math.min(html.length,i+needle.length+1200)).replace(/\s+/g,' ')});from=i+needle.length;count++;}
}
const providerLinks=attrs.filter(x=>x.resolved&&/blueprintgaming\.com/i.test(x.resolved));
const relevantLinks=attrs.filter(x=>/(paytable|payout|rule|jackpot|fishingfrenzy|help)/i.test((x.raw||'')+' '+(x.resolved||'')));
const fetched=[];
for(const x of relevantLinks.slice(0,40)){
 try{
  const rr=await fetch(x.resolved,{headers:{'user-agent':'loterias-ai-blueprint-help-resource-map/1.0',accept:'text/html,text/plain,application/json,*/*'},redirect:'follow'});
  const t=await rr.text();
  fetched.push({url:x.resolved,httpStatus:rr.status,finalUrl:rr.url,contentType:rr.headers.get('content-type'),bytes:t.length,sha256:crypto.createHash('sha256').update(t).digest('hex'),containsRoyal:/royal/i.test(t),containsRegal:/regal/i.test(t),contains3500:/3(?:[., ]?500)\b/.test(t),contains35000:/35(?:[., ]?000)\b/.test(t),preview:/royal|regal|3500|35000|paytable/i.test(t)?t.slice(0,1200).replace(/\s+/g,' '):null});
 }catch(e){fetched.push({url:x.resolved,httpStatus:null,error:String(e?.message||e)});}
}
const out={version:'blueprint-spain-help-resource-map-v1',generatedAt:new Date().toISOString(),sourceUrl:u.toString(),httpStatus:r.status,finalUrl:r.url,contentType:r.headers.get('content-type'),bytes:html.length,sha256:crypto.createHash('sha256').update(html).digest('hex'),attrs,providerLinks,relevantLinks,stringHints,contexts,fetched,decision:{directPaytableLinkFound:relevantLinks.some(x=>/paytable/i.test((x.raw||'')+' '+(x.resolved||''))),numericMbwbResourceFound:fetched.some(x=>x.httpStatus===200&&x.containsRoyal&&x.containsRegal&&(x.contains3500||x.contains35000)),exactSpainMbwbVerified:false,realMoneyAllowed:false},guards:{officialProviderSourceOnly:true,followDiscoveredLinksOnly:true,noDirectoryBruteforce:true,noAuthentication:true,noBetting:true,realMoneyAllowed:false}};
fs.mkdirSync('loterias-ai/casino/jackpots/evidence',{recursive:true});fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({sourceUrl:out.sourceUrl,relevantLinks:out.relevantLinks,stringHints:out.stringHints.slice(0,50),decision:out.decision},null,2));

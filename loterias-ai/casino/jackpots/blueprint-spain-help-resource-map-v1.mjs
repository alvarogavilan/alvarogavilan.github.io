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
const headers={'user-agent':'loterias-ai-blueprint-help-resource-map/1.2',accept:'text/html,*/*'};
const r=await fetch(u,{headers,redirect:'follow'});
const html=await r.text();
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
const compact=s=>String(s||'').replace(/\s+/g,' ').trim();
const decode=s=>String(s||'').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&nbsp;/g,' ');

const attrs=[];
for(const re of [/(?:href|src|action|data-src|data-href)\s*=\s*["']([^"']+)["']/gi,/url\(\s*["']?([^"')]+)["']?\s*\)/gi]){
  for(const m of html.matchAll(re)){
    const raw=decode(m[1]);
    let resolved=null;try{resolved=new URL(raw,r.url).href}catch{}
    if(!attrs.some(x=>x.raw===raw&&x.resolved===resolved))attrs.push({raw,resolved});
  }
}

const stringHints=[];
for(const m of html.matchAll(/["'`]([^"'`\n]{1,500})["'`]/g)){
  const s=decode(m[1]);
  if(!/(paytable|pay table|payout|rules|jackpot|royal|regal|must.?be.?won|bote real|bote majestuoso|fishingfrenzy|BP_FishingFrenzyJK|max(?:imum)?|threshold|reserve|seed|cap)/i.test(s))continue;
  if(!stringHints.includes(s))stringHints.push(s);
  if(stringHints.length>=500)break;
}

const contexts=[];
const low=html.toLowerCase();
for(const needle of ['paytable','pay table','payout','must be won by','mustbewonby','royal','regal','bote real','bote majestuoso','jackpotkingdeluxe3','bp_fishingfrenzyjk','fishingfrenzyjk','maximum','threshold','reserve','seed','cap']){
  let from=0,count=0;
  while(count<40){
    const i=low.indexOf(needle.toLowerCase(),from);if(i<0)break;
    contexts.push({needle,context:compact(html.slice(Math.max(0,i-1200),Math.min(html.length,i+needle.length+1800)))});
    from=i+needle.length;count++;
  }
}

const visibleText=compact(decode(html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ')));
const numericContexts=[];
for(const m of visibleText.matchAll(/(?:€|EUR|£|\$)?\s*\d{1,3}(?:[. ,]\d{3})+(?:[,.]\d{1,2})?|(?:€|EUR|£|\$)?\s*\d{3,7}(?:[,.]\d{1,2})?/gi)){
  const i=m.index??0;
  const ctx=compact(visibleText.slice(Math.max(0,i-220),Math.min(visibleText.length,i+String(m[0]).length+260)));
  if(!/(royal|regal|bote real|bote majestuoso|must be won|jackpot|reserva|reserve|máximo|maximo|maximum|límite|limite|threshold)/i.test(ctx))continue;
  numericContexts.push({value:compact(m[0]),context:ctx});
  if(numericContexts.length>=250)break;
}

const keyValueCandidates=[];
for(const re of [
  /\b([A-Za-z_$][\w$.-]*(?:max|maximum|cap|threshold|must|reserve|seed|royal|regal)[\w$.-]*)\s*[:=]\s*["']?([^,;\n<}\]]{1,120})/gi,
  /data-([\w-]*(?:max|cap|threshold|must|reserve|seed|royal|regal)[\w-]*)\s*=\s*["']([^"']{1,200})["']/gi
]){
  for(const m of html.matchAll(re)){
    const row={key:compact(m[1]),value:compact(decode(m[2]))};
    if(!keyValueCandidates.some(x=>x.key===row.key&&x.value===row.value))keyValueCandidates.push(row);
    if(keyValueCandidates.length>=250)break;
  }
}

const scriptBlocks=[];
for(const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)){
  const body=m[2]||'';
  if(!/(royal|regal|jackpot|must.?be.?won|max(?:imum)?|threshold|reserve|seed|3500|35000)/i.test(body))continue;
  scriptBlocks.push({attrs:compact(m[1]),sha256:sha(body),bytes:body.length,preview:compact(body.slice(0,4000))});
  if(scriptBlocks.length>=60)break;
}

const comments=[];
for(const m of html.matchAll(/<!--[\s\S]*?-->/g)){
  const s=compact(m[0]);
  if(/royal|regal|jackpot|must.?be.?won|max(?:imum)?|threshold|reserve|seed|3500|35000/i.test(s))comments.push(s.slice(0,4000));
  if(comments.length>=100)break;
}

const providerLinks=attrs.filter(x=>x.resolved&&/blueprintgaming\.com/i.test(x.resolved));
const relevantLinks=attrs.filter(x=>/(paytable|payout|rule|jackpot|fishingfrenzy|help|royal|regal|config|json|xml)/i.test((x.raw||'')+' '+(x.resolved||'')));
const fetched=[];
for(const x of relevantLinks.slice(0,60)){
  try{
    const rr=await fetch(x.resolved,{headers:{'user-agent':'loterias-ai-blueprint-help-resource-map/1.2',accept:'text/html,text/plain,application/json,application/xml,*/*'},redirect:'follow'});
    const t=await rr.text();
    const lc=t.toLowerCase();
    fetched.push({url:x.resolved,httpStatus:rr.status,finalUrl:rr.url,contentType:rr.headers.get('content-type'),bytes:t.length,sha256:sha(t),containsRoyal:/royal|bote real/i.test(lc),containsRegal:/regal|bote majestuoso/i.test(lc),contains3500:/\b3(?:[., ]?500)\b/.test(t),contains35000:/\b35(?:[., ]?000)\b/.test(t),containsMustBeWonBy:/must.?be.?won|debe.{0,20}ganad|antes de alcanzar/i.test(lc),preview:/royal|regal|3500|35000|paytable|must.?be.?won/i.test(t)?compact(t.slice(0,3000)):null});
  }catch(e){fetched.push({url:x.resolved,httpStatus:null,error:String(e?.message||e)});}
}

const directNumericHits=[...numericContexts.filter(x=>/\b3(?:[. ,]?500)\b|\b35(?:[. ,]?000)\b/i.test(x.value+' '+x.context))];
const embeddedNumericSignal=directNumericHits.length>0 || keyValueCandidates.some(x=>/3500|35000/.test(x.value));
const numericMbwbResourceFound=fetched.some(x=>x.httpStatus===200&&x.containsRoyal&&x.containsRegal&&(x.contains3500||x.contains35000));
const exactSpainMbwbVerified=(numericMbwbResourceFound||embeddedNumericSignal)&&(/BOTEMANIA/i.test(u.searchParams.get('customer')||''));

const out={
  version:'blueprint-spain-help-resource-map-v1.2',generatedAt:new Date().toISOString(),sourceUrl:u.toString(),httpStatus:r.status,finalUrl:r.url,contentType:r.headers.get('content-type'),bytes:html.length,sha256:sha(html),
  attrs,providerLinks,relevantLinks,stringHints,contexts,visibleTextPreview:visibleText.slice(0,6000),numericContexts,keyValueCandidates,scriptBlocks,comments,fetched,
  directNumericHits,
  decision:{directPaytableLinkFound:relevantLinks.some(x=>/paytable/i.test((x.raw||'')+' '+(x.resolved||''))),numericMbwbResourceFound,embeddedNumericSignal,exactSpainMbwbVerified,realMoneyAllowed:false},
  guards:{officialProviderSourceOnly:true,customerBotemania:true,followDiscoveredLinksOnly:true,noDirectoryBruteforce:true,noAuthentication:true,noMutation:true,noBetting:true,realMoneyAllowed:false}
};
fs.mkdirSync('loterias-ai/casino/jackpots/evidence',{recursive:true});
fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({sourceUrl:out.sourceUrl,directNumericHits:out.directNumericHits.slice(0,20),keyValueCandidates:out.keyValueCandidates.slice(0,30),relevantLinks:out.relevantLinks.slice(0,30),decision:out.decision},null,2));

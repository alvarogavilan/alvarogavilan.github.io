#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';
const ENDPOINT='https://www.botemania.es/es/graphql';
const LAZY='loterias-ai/casino/jackpots/evidence/botemania-jpk-lazy-chunk-feed-probe-v1.json';
const OUT='loterias-ai/casino/jackpots/evidence/botemania-double-jackpots-public-probe-v1.json';
const QUERY=`query loadJackpots { redTigerJackpots { id amount } }`;
const headers={accept:'application/json','content-type':'application/json',venture:'botemania_es',origin:'https://www.botemania.es',referer:'https://www.botemania.es/','user-agent':'loterias-ai-double-jackpots-public-probe/1.0','cache-control':'no-cache'};
const r=await fetch(ENDPOINT,{method:'POST',headers,body:JSON.stringify({operationName:'loadJackpots',variables:{},query:QUERY})});
const text=await r.text();let body=null;try{body=JSON.parse(text)}catch{};
const jackpots=Array.isArray(body?.data?.redTigerJackpots)?body.data.redTigerJackpots.map(x=>({id:String(x?.id||''),amount:Number(x?.amount)})).filter(x=>x.id&&Number.isFinite(x.amount)):[];
const lazy=JSON.parse(fs.readFileSync(LAZY,'utf8'));
const settingsMeta=(lazy.chunks||[]).find(x=>/DoubleJackpots-settings/i.test(String(x.name||'')));
const mustMeta=(lazy.chunks||[]).find(x=>/DoubleJackpots-MustDropWithin/i.test(String(x.name||'')));
async function fetchJs(meta){if(!meta?.url)return null;const rr=await fetch(meta.url,{headers:{accept:'application/javascript,*/*','user-agent':'loterias-ai-double-jackpots-public-probe/1.0','cache-control':'no-cache'}}),t=await rr.text();return {name:meta.name,url:meta.url,httpStatus:rr.status,bytes:t.length,sha256:crypto.createHash('sha256').update(t).digest('hex'),text:t};}
const settings=await fetchJs(settingsMeta),must=await fetchJs(mustMeta);
const contexts=[];
for(const src of [settings,must].filter(Boolean))for(const needle of ['mustDropWithin','MustDropWithin','minimum','maximum','min','max','threshold',...jackpots.map(x=>x.id)]){let p=0;while(contexts.length<100){const i=src.text.toLowerCase().indexOf(String(needle).toLowerCase(),p);if(i<0)break;contexts.push({chunk:src.name,needle,index:i,context:src.text.slice(Math.max(0,i-500),Math.min(src.text.length,i+1400))});p=i+String(needle).length;}}
const numericConfigCandidates=[];
for(const c of contexts){const nums=[...c.context.matchAll(/\b\d+(?:\.\d+)?\b/g)].map(m=>Number(m[0])).filter(x=>Number.isFinite(x)&&x>0&&x<10000000);if(nums.length)numericConfigCandidates.push({chunk:c.chunk,needle:c.needle,numbers:[...new Set(nums)].slice(0,40),context:c.context});}
const out={version:'botemania-double-jackpots-public-probe-v1',generatedAt:new Date().toISOString(),operator:'botemania-es',source:{endpoint:ENDPOINT,operationName:'loadJackpots',querySource:'PUBLIC_DOUBLEJACKPOTS_CONTAINER_BUNDLE'},response:{httpStatus:r.status,ok:r.ok,bytes:text.length,errors:(body?.errors||[]).map(e=>e?.message||null).slice(0,10),jackpotRows:jackpots.length},jackpots,settingsChunk:settings?{name:settings.name,url:settings.url,httpStatus:settings.httpStatus,bytes:settings.bytes,sha256:settings.sha256}:null,mustDropWithinChunk:must?{name:must.name,url:must.url,httpStatus:must.httpStatus,bytes:must.bytes,sha256:must.sha256}:null,numericConfigCandidates,decision:{publicDoubleJackpotFeedReadable:r.ok&&jackpots.length>0,exactMustDropLimitsRecovered:false,realMoneyAllowed:false,reason:jackpots.length?'CURRENT_AMOUNTS_RECOVERED_SETTINGS_LIMIT_LINKAGE_REQUIRES_REVIEW':'NO_RED_TIGER_JACKPOT_ROWS'},guards:{exactRecoveredQueryOnly:true,publicStaticSettingsOnly:true,noGraphqlIntrospection:true,noMutation:true,noAuthentication:true,noCookies:true,noBetting:true,realMoneyAllowed:false}};
fs.mkdirSync('loterias-ai/casino/jackpots/evidence',{recursive:true});fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify({response:out.response,jackpots,settingsChunk:out.settingsChunk,mustDropWithinChunk:out.mustDropWithinChunk,decision:out.decision},null,2));

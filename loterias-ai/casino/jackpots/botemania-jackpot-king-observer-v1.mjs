#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';

const OUT='loterias-ai/casino/jackpots/evidence/botemania-jackpot-king-observer-v1.json';
const URLS=[
  {id:'fishin-frenzy-jpk',url:'https://www.botemania.es/juegos/slots-online/fishin-frenzy-jackpot-king',priority:true},
  {id:'fishin-frenzy-megaways-jpk',url:'https://www.botemania.es/juegos/slots-online/fishin-frenzy-megaways-jackpot-king',priority:true},
  {id:'eye-of-horus-jpk',url:'https://www.botemania.es/juegos/slots-online/eye-of-horus-jackpot-king'},
  {id:'goonies-return-jpk',url:'https://www.botemania.es/juegos/slots-online/the-goonies-return-jackpot-king'},
  {id:'slots-hub',url:'https://www.botemania.es/juegos/slots-online'}
];
const now=new Date().toISOString();
const read=p=>{try{return JSON.parse(fs.readFileSync(p,'utf8'));}catch{return {observations:[],resets:[]};}};
const prev=read(OUT);

function parseNumber(raw){
  const s=String(raw).replace(/\s/g,'').replace(/€/g,'');
  if(s.includes(',')&&s.includes('.')) return Number(s.lastIndexOf(',')>s.lastIndexOf('.')?s.replace(/\./g,'').replace(',','.'):s.replace(/,/g,''));
  if(s.includes(',')) return Number(s.replace(/\./g,'').replace(',','.'));
  return Number(s.replace(/,/g,''));
}
function inferLabel(context){
  const c=context.toLowerCase();
  if(/royal|\breal\b/.test(c)) return 'ROYAL';
  if(/regal|majestuoso/.test(c)) return 'REGAL';
  if(/jackpot\s*king|bote\s*king/.test(c)) return 'JACKPOT_KING';
  return null;
}
function extract(html){
  const txt=html.replace(/&nbsp;|&#160;/g,' ').replace(/&euro;|&#8364;/gi,'€').replace(/\\u20ac/gi,'€');
  const out=[];
  const patterns=[/(\d{1,3}(?:\.\d{3})+(?:,\d{2})?|\d{3,}(?:,\d{2})?)\s*€/g,/€\s*(\d{1,3}(?:,\d{3})+(?:\.\d{2})?|\d{3,}(?:\.\d{2})?)/g];
  for(const re of patterns) for(const m of txt.matchAll(re)){
    const value=parseNumber(m[1]);
    if(!Number.isFinite(value)||value<500||value>10000000) continue;
    const i=m.index||0, context=txt.slice(Math.max(0,i-180),Math.min(txt.length,i+180)).replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
    out.push({valueEUR:value,label:inferLabel(context),context:context.slice(0,360)});
  }
  const seen=new Set();
  return out.filter(x=>{const k=`${x.valueEUR}|${x.label||''}`;if(seen.has(k))return false;seen.add(k);return true;});
}
function scripts(html,base){
  const out=[];
  for(const m of html.matchAll(/<script[^>]+src=["']([^"']+)["']/gi)){
    try{const u=new URL(m[1],base).href;if(!out.includes(u))out.push(u);}catch{}
  }
  return out;
}
function candidates(text,base){
  const raw=[];
  for(const re of [/https?:\\?\/\\?\/[^"'<>\s]+/gi,/["'](\/[^"']*(?:jackpot|graphql|api)[^"']*)["']/gi]) for(const m of text.matchAll(re)) raw.push((m[1]||m[0]).replace(/\\\//g,'/'));
  const out=[];
  for(const x of raw){
    if(!/(jackpot|progressive|meter|graphql|\/api\/|jackpots)/i.test(x))continue;
    try{const u=new URL(x,base);if(['http:','https:'].includes(u.protocol)&&!out.includes(u.href))out.push(u.href);}catch{}
  }
  return out.slice(0,100);
}
function keywordContexts(text){
  const out=[],seen=new Set();
  const re=/(BlueprintJackpots|jackpotKing|jackpotValue|jackpotAmount|progressive|graphql|jackpots|jackpot)/gi;
  for(const m of text.matchAll(re)){
    const i=m.index||0;
    let s=text.slice(Math.max(0,i-260),Math.min(text.length,i+520)).replace(/\s+/g,' ');
    s=s.replace(/[A-Za-z0-9+/]{160,}={0,2}/g,'[LONG_TOKEN_REMOVED]');
    const key=crypto.createHash('sha1').update(s).digest('hex');
    if(seen.has(key))continue;seen.add(key);
    out.push({term:m[0],context:s.slice(0,900)});
    if(out.length>=24)break;
  }
  return out;
}
function querySignatures(text){
  const out=[];
  for(const re of [/\bquery\s+[A-Za-z_][A-Za-z0-9_]*/g,/\bfragment\s+[A-Za-z_][A-Za-z0-9_]*/g,/operationName["']?\s*[:=]\s*["']([A-Za-z_][A-Za-z0-9_]*)["']/g]){
    for(const m of text.matchAll(re)){const x=m[1]||m[0];if(!out.includes(x))out.push(x);if(out.length>=40)return out;}
  }
  return out;
}

const pages=[],htmlById=new Map();
for(const src of URLS){
  try{
    const r=await fetch(src.url,{redirect:'follow',headers:{accept:'text/html','user-agent':'loterias-ai-botemania-jpk-observer/1.2','cache-control':'no-cache, no-store, max-age=0'}});
    const html=await r.text(); htmlById.set(src.id,html);
    const finalHost=new URL(r.url).hostname;
    pages.push({id:src.id,url:src.url,priority:!!src.priority,httpStatus:r.status,finalUrl:r.url,officialSpainHost:finalHost==='www.botemania.es'||finalHost==='botemania.es',sha256:crypto.createHash('sha256').update(html).digest('hex'),amounts:extract(html),scriptCount:scripts(html,r.url).length});
  }catch(e){pages.push({id:src.id,url:src.url,priority:!!src.priority,error:String(e?.message||e),officialSpainHost:false,amounts:[]});}
}

const page=pages.find(x=>x.id==='fishin-frenzy-jpk'&&x.officialSpainHost&&x.httpStatus===200);
const html=htmlById.get('fishin-frenzy-jpk')||'';
const scriptUrls=scripts(html,page?.finalUrl||URLS[0].url).slice(0,20);
const endpoints=new Set(candidates(html,page?.finalUrl||URLS[0].url));
const inspected=[];const allSignatures=[];const jackpotContexts=[];
for(const url of scriptUrls){
  try{
    const r=await fetch(url,{headers:{'user-agent':'loterias-ai-botemania-jpk-discovery/1.2','cache-control':'no-cache'}});
    const text=await r.text();
    if(text.length>5000000){inspected.push({url,status:r.status,bytes:text.length,skippedDeepScan:true});continue;}
    const c=candidates(text,url);for(const x of c)endpoints.add(x);
    const sig=querySignatures(text);for(const x of sig)if(!allSignatures.includes(x))allSignatures.push(x);
    const ctx=keywordContexts(text);
    if(/BlueprintJackpots/i.test(url)||ctx.some(x=>/BlueprintJackpots|jackpotKing|jackpotValue|jackpotAmount/i.test(x.context)))for(const x of ctx){jackpotContexts.push({script:url,...x});if(jackpotContexts.length>=40)break;}
    inspected.push({url,status:r.status,bytes:text.length,candidates:c.slice(0,20),querySignatures:sig.slice(0,30),keywordContextCount:ctx.length});
  }catch(e){inspected.push({url,error:String(e?.message||e)});}
}
const discovery={generatedAt:now,pageScriptSources:scriptUrls,inspectedScripts:inspected,candidateEndpoints:[...endpoints].slice(0,120),querySignatures:allSignatures.slice(0,80),jackpotKeywordContexts:jackpotContexts.slice(0,40),status:endpoints.size?'CANDIDATES_FOUND_NEED_QUERY_RECONSTRUCTION':'NO_PUBLIC_COUNTER_ENDPOINT_FOUND_YET'};

const buckets=new Map();
for(const p of pages.filter(x=>x.officialSpainHost&&x.httpStatus===200)) for(const a of p.amounts){
  const k=`${a.label||'UNKNOWN'}|${a.valueEUR.toFixed(2)}`;
  const b=buckets.get(k)||{label:a.label,valueEUR:a.valueEUR,pages:new Set(),contexts:[]};
  b.pages.add(p.id);if(b.contexts.length<3)b.contexts.push({page:p.id,context:a.context});buckets.set(k,b);
}
const shared=[...buckets.values()].map(x=>({label:x.label,valueEUR:x.valueEUR,pageCount:x.pages.size,pages:[...x.pages],contexts:x.contexts})).filter(x=>x.pageCount>=2).sort((a,b)=>b.pageCount-a.pageCount||b.valueEUR-a.valueEUR);
const labeled={};for(const label of ['ROYAL','REGAL','JACKPOT_KING']){const x=shared.find(v=>v.label===label);if(x)labeled[label]=x.valueEUR;}
const sourceReadable=pages.filter(x=>x.priority).some(x=>x.officialSpainHost&&x.httpStatus===200);
const observation={observedAt:now,sourceReadable,pages,sharedAmounts:shared.slice(0,20),labeledPots:labeled};
const prior=(prev.observations||[]).at(-1)||null,resets=[];
for(const label of ['ROYAL','REGAL','JACKPOT_KING']){
  const from=Number(prior?.labeledPots?.[label]),to=Number(labeled[label]);
  if(Number.isFinite(from)&&Number.isFinite(to)&&from>0&&to/from<=0.90)resets.push({observedAt:now,label,fromEUR:from,toEUR:to,dropRatio:Number((1-to/from).toFixed(6)),cleanLabelMatched:true});
}
const observations=[...(prev.observations||[]),observation].slice(-2016),allResets=[...(prev.resets||[]),...resets].slice(-200);
const out={
  version:'botemania-jackpot-king-observer-v1.2',generatedAt:now,operator:'botemania-es',operatorOfficial:true,mode:'OBSERVATION_ONLY_NO_WAGERING',
  priorityGames:["Fishin' Frenzy: Jackpot King","Fishin' Frenzy Megaways: Jackpot King"],
  verifiedOperatorEconomics:{fishinFrenzy:{baseRtpPct:93.32,progressiveContributionPct:2.32,reserveContributionPct:0.68,anyStakeEligible:true,winChanceProportionalToStake:true,winChanceIncreasesWithPot:true,royalRegalMbwbExists:true}},
  discovery,latest:observation,observations,resets:allResets,progress:{observations:observations.length,cleanLabeledResets:allResets.filter(x=>x.cleanLabelMatched).length,labeledCurrentPots:Object.keys(labeled).length,candidateEndpoints:discovery.candidateEndpoints.length,querySignatures:discovery.querySignatures.length,jackpotKeywordContexts:discovery.jackpotKeywordContexts.length},
  thresholdResearch:{exactSpainRoyalMbwbEUR:null,exactSpainRegalMbwbEUR:null,crossMarketReferenceOnly:{royal:3500,regal:35000,mayNotEqualSpain:true},minimumCleanResetsBeforeHazardFit:10,minimumCleanResetsBeforeEconomicReplication:20},
  guards:{botemaniaOfficialPagesOnly:true,publicClientCodeOnly:true,noAuthenticationBypass:true,priorityRtpBlockSpecific:true,genericCopiedContributionTextNotTrustedWhenRtpBlockConflicts:true,noCrossMarketThresholdSubstitution:true,noBetting:true,automaticBettingAllowed:false,realMoneyAllowed:false,realStakeEUR:0}
};
fs.mkdirSync('loterias-ai/casino/jackpots/evidence',{recursive:true});fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({sourceReadable,discovery:{status:discovery.status,candidateEndpoints:discovery.candidateEndpoints.slice(0,20),querySignatures:discovery.querySignatures,jackpotKeywordContexts:discovery.jackpotKeywordContexts.slice(0,8)},labeledPots:labeled,resetsThisRun:resets,progress:out.progress,realMoneyAllowed:false},null,2));

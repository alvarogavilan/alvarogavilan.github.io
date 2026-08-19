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
  for(const re of patterns){
    for(const m of txt.matchAll(re)){
      const value=parseNumber(m[1]);
      if(!Number.isFinite(value)||value<500||value>10000000) continue;
      const i=m.index||0, context=txt.slice(Math.max(0,i-180),Math.min(txt.length,i+180)).replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
      out.push({valueEUR:value,label:inferLabel(context),context:context.slice(0,360)});
    }
  }
  const seen=new Set();
  return out.filter(x=>{const k=`${x.valueEUR}|${x.label||''}`;if(seen.has(k))return false;seen.add(k);return true;});
}

const pages=[];
for(const src of URLS){
  try{
    const r=await fetch(src.url,{redirect:'follow',headers:{accept:'text/html','user-agent':'loterias-ai-botemania-jpk-observer/1.0','cache-control':'no-cache, no-store, max-age=0'}});
    const html=await r.text();
    const finalHost=new URL(r.url).hostname;
    pages.push({id:src.id,url:src.url,priority:!!src.priority,httpStatus:r.status,finalUrl:r.url,officialSpainHost:finalHost==='www.botemania.es'||finalHost==='botemania.es',sha256:crypto.createHash('sha256').update(html).digest('hex'),amounts:extract(html)});
  }catch(e){pages.push({id:src.id,url:src.url,priority:!!src.priority,error:String(e?.message||e),officialSpainHost:false,amounts:[]});}
}

const buckets=new Map();
for(const p of pages.filter(x=>x.officialSpainHost&&x.httpStatus===200)) for(const a of p.amounts){
  const k=`${a.label||'UNKNOWN'}|${a.valueEUR.toFixed(2)}`;
  const b=buckets.get(k)||{label:a.label,valueEUR:a.valueEUR,pages:new Set(),contexts:[]};
  b.pages.add(p.id); if(b.contexts.length<3)b.contexts.push({page:p.id,context:a.context}); buckets.set(k,b);
}
const shared=[...buckets.values()].map(x=>({label:x.label,valueEUR:x.valueEUR,pageCount:x.pages.size,pages:[...x.pages],contexts:x.contexts})).filter(x=>x.pageCount>=2).sort((a,b)=>b.pageCount-a.pageCount||b.valueEUR-a.valueEUR);
const labeled={};
for(const label of ['ROYAL','REGAL','JACKPOT_KING']){
  const x=shared.find(v=>v.label===label); if(x) labeled[label]=x.valueEUR;
}
const priorityPages=pages.filter(x=>x.priority);
const sourceReadable=priorityPages.some(x=>x.officialSpainHost&&x.httpStatus===200);
const observation={observedAt:now,sourceReadable,pages,sharedAmounts:shared.slice(0,20),labeledPots:labeled};

const prior=(prev.observations||[]).at(-1)||null;
const resets=[];
for(const label of ['ROYAL','REGAL','JACKPOT_KING']){
  const from=Number(prior?.labeledPots?.[label]),to=Number(labeled[label]);
  if(Number.isFinite(from)&&Number.isFinite(to)&&from>0&&to/from<=0.90)resets.push({observedAt:now,label,fromEUR:from,toEUR:to,dropRatio:Number((1-to/from).toFixed(6)),cleanLabelMatched:true});
}
const observations=[...(prev.observations||[]),observation].slice(-2016);
const allResets=[...(prev.resets||[]),...resets].slice(-200);
const out={
  version:'botemania-jackpot-king-observer-v1',generatedAt:now,operator:'botemania-es',operatorOfficial:true,mode:'OBSERVATION_ONLY_NO_WAGERING',
  priorityGames:["Fishin' Frenzy: Jackpot King","Fishin' Frenzy Megaways: Jackpot King"],
  verifiedOperatorEconomics:{fishinFrenzy:{baseRtpPct:93.32,progressiveContributionPct:2.32,reserveContributionPct:0.68,anyStakeEligible:true,winChanceProportionalToStake:true,winChanceIncreasesWithPot:true,royalRegalMbwbExists:true}},
  latest:observation,observations,resets:allResets,progress:{observations:observations.length,cleanLabeledResets:allResets.filter(x=>x.cleanLabelMatched).length,labeledCurrentPots:Object.keys(labeled).length},
  thresholdResearch:{exactSpainRoyalMbwbEUR:null,exactSpainRegalMbwbEUR:null,crossMarketReferenceOnly:{royal:3500,regal:35000,mayNotEqualSpain:true},minimumCleanResetsBeforeHazardFit:10,minimumCleanResetsBeforeEconomicReplication:20},
  guards:{botemaniaOfficialPagesOnly:true,priorityRtpBlockSpecific:true,genericCopiedContributionTextNotTrustedWhenRtpBlockConflicts:true,noCrossMarketThresholdSubstitution:true,noBetting:true,automaticBettingAllowed:false,realMoneyAllowed:false,realStakeEUR:0}
};
fs.mkdirSync('loterias-ai/casino/jackpots/evidence',{recursive:true});
fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({sourceReadable,sharedAmounts:shared.slice(0,8),labeledPots:labeled,resetsThisRun:resets,progress:out.progress,realMoneyAllowed:false},null,2));

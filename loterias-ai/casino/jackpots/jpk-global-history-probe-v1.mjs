#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';

const OUT='loterias-ai/casino/jackpots/evidence/jpk-global-history-probe-v1.json';

export const SOURCES=[
  {
    id:'casinotrackpot-jpk',
    url:'https://www.casinotrackpot.com/en/jackpot-trackers/jackpot-king/',
    sourceClass:'GLOBAL_THIRD_PARTY_TRACKER',
    expectedClaims:['full historical data','exact amount and time of each recorded win','average win size','average time between wins'],
    market:'NON_SPAIN_GLOBAL_COMPARATOR'
  },
  {
    id:'casinolistings-blueprint',
    url:'https://www.casinolistings.com/jackpots/blueprint-gaming',
    sourceClass:'GLOBAL_THIRD_PARTY_TRACKER',
    expectedClaims:['aggregate Blueprint jackpot wins','recent Jackpot King Royal/Regal wins'],
    market:'NON_SPAIN_GLOBAL_COMPARATOR'
  },
  {
    id:'olbg-blueprint-interview',
    url:'https://www.olbg.com/slots/articles/daniel-kalinowski',
    sourceClass:'BLUEPRINT_REPRESENTATIVE_INTERVIEW',
    expectedClaims:['hundreds of Jackpot King wins','39 top-tier Jackpot King wins'],
    market:'GLOBAL_PROVIDER_CONTEXT'
  }
];

const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const sha256=s=>crypto.createHash('sha256').update(s).digest('hex');
const clean=s=>String(s||'')
  .replace(/<script[\s\S]*?<\/script>/gi,' ')
  .replace(/<style[\s\S]*?<\/style>/gi,' ')
  .replace(/<[^>]+>/g,' ')
  .replace(/&nbsp;|&#160;/gi,' ')
  .replace(/&pound;/gi,'£').replace(/&euro;/gi,'€').replace(/&dollar;/gi,'$')
  .replace(/&amp;/gi,'&').replace(/&#39;|&apos;/gi,"'").replace(/&quot;/gi,'"')
  .replace(/\s+/g,' ').trim();

export function normalizeMoney(raw){
  const m=String(raw||'').trim().match(/^([£€$])\s*([\d,.]+)$/);
  if(!m)return null;
  const currency=m[1];
  const body=m[2];
  const lastComma=body.lastIndexOf(','),lastDot=body.lastIndexOf('.');
  let normalized=body;
  if(lastComma>lastDot){normalized=body.replace(/\./g,'').replace(',','.');}
  else normalized=body.replace(/,/g,'');
  const amount=Number(normalized);
  return Number.isFinite(amount)&&amount>0?{currency,amount}:null;
}

export function extractJpkWinCandidates(html){
  const text=clean(html);
  const out=[];
  const tierRe=/(Jackpot King Royal|Jackpot King Regal|Royal Pot|Regal Pot|\bRoyal\b|\bRegal\b)/gi;
  let m;
  while((m=tierRe.exec(text))){
    const start=Math.max(0,m.index-140),end=Math.min(text.length,m.index+360);
    const ctx=text.slice(start,end);
    const money=ctx.match(/[£€$]\s*[\d][\d,.]*/g)||[];
    const date=ctx.match(/(?:\b20\d{2}[-\/]\d{1,2}[-\/]\d{1,2}\b|\b\d{1,2}\s+(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+20\d{2}\b)/i)?.[0]||null;
    for(const raw of money.slice(0,4)){
      const parsed=normalizeMoney(raw);if(!parsed)continue;
      const tier=/royal/i.test(m[1])?'ROYAL':'REGAL';
      const ukCap=tier==='ROYAL'?3500:35000;
      out.push({tier,rawAmount:raw,...parsed,date,normalizedByUkPublishedCap:+(parsed.amount/ukCap).toFixed(6),context:ctx.slice(0,500)});
    }
  }
  const seen=new Set();
  return out.filter(x=>{const k=`${x.tier}|${x.currency}|${x.amount}|${x.date||''}|${x.context}`;if(seen.has(k))return false;seen.add(k);return true;}).slice(0,500);
}

export function discoverCandidateResources(html,baseUrl){
  const out=[];
  for(const m of String(html||'').matchAll(/(?:src|href)=["']([^"']+)["']/gi)){
    try{const u=new URL(m[1],baseUrl).href;if(/(?:jackpot|track|api|json|graphql|_next|script)/i.test(u))out.push(u);}catch{}
  }
  for(const m of String(html||'').matchAll(/["'](\/[^"']*(?:api|jackpot|track|history|stats)[^"']*)["']/gi)){
    try{out.push(new URL(m[1],baseUrl).href);}catch{}
  }
  return [...new Set(out)].slice(0,250);
}

async function get(url){
  let lastError=null;
  for(let attempt=1;attempt<=3;attempt++){
    try{
      const r=await fetch(url,{redirect:'follow',signal:AbortSignal.timeout(25000),headers:{'user-agent':'Mozilla/5.0 LoteriasAI scientific research','accept':'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8'}});
      const text=await r.text();
      return{ok:r.ok,status:r.status,finalUrl:r.url,text};
    }catch(e){lastError=String(e);await sleep(attempt*700);}
  }
  return{ok:false,status:null,finalUrl:url,text:'',error:lastError};
}

export async function buildGlobalHistoryProbe(now=new Date().toISOString()){
  const sources=[];
  for(const src of SOURCES){
    const r=await get(src.url);
    const text=clean(r.text);
    sources.push({
      ...src,
      fetchedAt:now,
      httpStatus:r.status,
      fetchOk:r.ok,
      finalUrl:r.finalUrl,
      bytes:r.text.length,
      sha256:r.text?sha256(r.text):null,
      historySurfaceClaimed:/full historical data|history table|exact amount and time|recent wins|average time between wins/i.test(text),
      candidateWinRows:extractJpkWinCandidates(r.text),
      candidateResources:discoverCandidateResources(r.text,r.finalUrl||src.url),
      textEvidence:text.slice(0,16000),
      error:r.error||null
    });
  }
  return{
    version:'jpk-global-history-probe-v1',
    generatedAt:now,
    purpose:'GLOBAL_HISTORY_DISCOVERY_AND_HAZARD_PRIOR_ONLY',
    sources,
    analysisPolicy:{
      separateRoyalAndRegal:true,
      normalizeWinAmountsWithinSourceMarket:true,
      preserveExactWinTimestampWhenAvailable:true,
      noSpainCapSubstitution:true,
      noSpainSeedSubstitution:true,
      noCrossMarketHazardPromotion:true,
      globalHistoryMayInformModelClassOnly:true,
      SpainExecutionRequiresBotemaniaProspectiveReplication:true
    },
    nextDerivedArtifacts:[
      'tier-specific normalized trigger-position distribution',
      'empirical CDF / survival curve by tier',
      'time-between-win distribution by tier',
      'comparison of global shape against Botemania Spain prospective reset windows'
    ],
    guards:{
      historicalTrackerIsNotOperatorTruth:true,
      crossMarketExecutionAllowed:false,
      positiveEVClaimAllowed:false,
      realMoneyAllowed:false,
      stakeEUR:0
    }
  };
}

if(import.meta.url===`file://${process.argv[1]}`){
  const out=await buildGlobalHistoryProbe();
  fs.mkdirSync('loterias-ai/casino/jackpots/evidence',{recursive:true});
  fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');
  console.log(JSON.stringify({version:out.version,sources:out.sources.map(s=>({id:s.id,status:s.httpStatus,bytes:s.bytes,historySurfaceClaimed:s.historySurfaceClaimed,winCandidates:s.candidateWinRows.length,candidateResources:s.candidateResources.length,error:s.error})),guards:out.guards},null,2));
}

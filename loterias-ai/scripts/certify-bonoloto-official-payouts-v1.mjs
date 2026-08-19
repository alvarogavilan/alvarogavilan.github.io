#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';

const RECENT='loterias-ai/data/backtests/bonoloto-recent-financial.json';
const ARCH='loterias-ai/data/archive/bonoloto';
const OUT='loterias-ai/data/archive/_meta/bonoloto-official-payouts-recent-v1.json';
const recent=JSON.parse(fs.readFileSync(RECENT,'utf8'));
let archive=[];for(const f of fs.readdirSync(ARCH).filter(x=>/^\d{4}\.json$/.test(x))){archive.push(...(JSON.parse(fs.readFileSync(`${ARCH}/${f}`,'utf8')).records||[]));}
const byDate=new Map(archive.map(r=>[r.drawDate,r]));
const clean=s=>s.replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#160;/gi,' ').replace(/&euro;|&#8364;/gi,'€').replace(/&amp;/gi,'&').replace(/\s+/g,' ').trim();
const money=s=>{const t=String(s||'').trim().replace(/\./g,'').replace(',','.');const n=Number(t);return Number.isFinite(n)?n:null;};
const integer=s=>{const n=Number(String(s||'').replace(/\./g,''));return Number.isInteger(n)?n:null;};
function parse(text,label){const escaped=label.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');const rx=new RegExp(escaped+'\\s+([0-9.]+)\\s+([0-9.]+,[0-9]{2})\\s*€','i');const m=text.match(rx);return m?{winners:integer(m[1]),prizeEUR:money(m[2]),raw:m[0]}:null;}
const dates=[...new Set((recent.details||[]).map(x=>x.date))];
const rows=[];const failures=[];
for(const [i,date] of dates.entries()){
  const rec=byDate.get(date);
  const url=rec?.source?.sourceUrl;
  if(!url||!/^https:\/\/www\.loteriasyapuestas\.es\//.test(url)){failures.push({date,reason:'NO_OFFICIAL_SELAE_SOURCE_URL'});continue;}
  try{
    const r=await fetch(url,{redirect:'follow',signal:AbortSignal.timeout(20000),headers:{accept:'text/html,application/rss+xml,*/*','user-agent':'LoteriasAI-SELAE-payout-cert/1.1'}});
    const body=await r.text(),text=clean(body);
    if(!r.ok)throw new Error(`HTTP ${r.status}`);
    const payouts={six:parse(text,'1ª (6 Aciertos)'),fiveC:parse(text,'2ª (5 Aciertos + C)'),five:parse(text,'3ª (5 Aciertos)'),four:parse(text,'4ª (4 Aciertos)'),three:parse(text,'5ª (3 Aciertos)'),reintegro:parse(text,'Reintegro')};
    const complete=Object.values(payouts).every(Boolean);
    const resultVerified=rec?.verification?.officialCrossCheck?.provider==='SELAE'&&rec?.verification?.officialCrossCheck?.complete===true&&rec?.verification?.status==='OFFICIAL_SELAE_VALIDATED';
    if(!complete||!resultVerified){failures.push({date,reason:!complete?'PAYOUT_PARSE_INCOMPLETE':'CANONICAL_RESULT_NOT_FULLY_SELAE_VALIDATED',url,parsedCategories:Object.fromEntries(Object.entries(payouts).map(([k,v])=>[k,Boolean(v)]))});continue;}
    rows.push({date,url,httpStatus:r.status,bodySha256:crypto.createHash('sha256').update(body).digest('hex'),officialResult:{main:rec.result.main.map(Number),complementary:Number(rec.result.complementary),reintegro:Number(rec.result.reintegro)},payouts:Object.fromEntries(Object.entries(payouts).map(([k,v])=>[k,{winners:v.winners,prizeEUR:v.prizeEUR}])),resultVerification:'OFFICIAL_SELAE_VALIDATED',payoutVerification:'OFFICIAL_SELAE_PAGE_PARSED'});
  }catch(e){failures.push({date,reason:String(e?.message||e),url});}
  if(i%10===9)await new Promise(r=>setTimeout(r,300));
}
const complete=rows.length===dates.length&&failures.length===0;
const payload={version:'bonoloto-official-payouts-recent-v1',generatedAt:new Date().toISOString(),sourcePolicy:'SELAE_ONLY',targetDates:dates.length,summary:{targetDates:dates.length,certified:rows.length,failed:failures.length,complete},rows,failures,tournamentGate:{officialV3MayRun:complete,reason:complete?'ALL_TARGET_DATES_SELAE_CERTIFIED':'BLOCKED_UNTIL_ALL_TARGET_DATES_CERTIFIED'},guards:{exactCanonicalDate:true,canonicalResultMustAlreadyBeSELAEValidated:true,allFiveMainPrizeCategoriesPlusReintegroRequired:true,noThirdPartyPayouts:true,noBacktestMutation:true,incompleteDiagnosticsPersisted:true,noBetting:true,realMoneyAllowed:false}};
fs.writeFileSync(OUT,JSON.stringify(payload,null,2)+'\n');console.log(JSON.stringify({summary:payload.summary,tournamentGate:payload.tournamentGate},null,2));

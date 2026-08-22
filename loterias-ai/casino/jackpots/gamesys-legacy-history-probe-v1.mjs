#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';

const OUT='loterias-ai/casino/jackpots/evidence/gamesys-legacy-history-probe-v1.json';

export const SOURCES=[
  ['gamesys-aggregate','https://www.casinolistings.com/jackpots/gamesys','GLOBAL_GAMESYS_AGGREGATE'],
  ['diamond-bonanza-25p','https://www.casinolistings.com/jackpots/gamesys/diamond-bonanza-25p-jackpot','DIAMOND_BONANZA_25P'],
  ['diamond-bonanza-50p','https://www.casinolistings.com/jackpots/gamesys/diamond-bonanza-50p-jackpot','DIAMOND_BONANZA_50P'],
  ['diamond-bonanza-1gbp','https://www.casinolistings.com/jackpots/gamesys/diamond-bonanza-1pound-jackpot','DIAMOND_BONANZA_1GBP'],
  ['tiki-temple-5p','https://www.casinolistings.com/jackpots/gamesys/tiki-temple-5p-jackpot','TIKI_TEMPLE_5P'],
  ['tiki-temple-10p','https://www.casinolistings.com/jackpots/gamesys/tiki-temple-10p-jackpot','TIKI_TEMPLE_10P'],
  ['progressive-jacks-or-better','https://www.casinolistings.com/jackpots/gamesys/progressive-jacks-or-better-jackpot','PROGRESSIVE_JACKS_OR_BETTER']
].map(([id,url,family])=>({id,url,family,sourceClass:'GLOBAL_HISTORICAL_TRACKER',market:'NON_SPAIN_COMPARATOR'}));

const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const sha256=s=>crypto.createHash('sha256').update(s).digest('hex');
const textify=s=>String(s||'').replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#160;/gi,' ').replace(/&pound;/gi,'£').replace(/&euro;/gi,'€').replace(/&amp;/gi,'&').replace(/&#39;|&apos;/gi,"'").replace(/\s+/g,' ').trim();

export function parseMoney(raw){
  const m=String(raw||'').match(/([£€$])\s*([\d,.]+)/);if(!m)return null;
  const body=m[2],comma=body.lastIndexOf(','),dot=body.lastIndexOf('.');let x=body;
  if(comma>=0&&dot>=0)x=comma>dot?body.replace(/\./g,'').replace(',','.'):body.replace(/,/g,'');
  else if(comma>=0)x=body.length-comma-1===3?body.replace(/,/g,''):body.replace(',','.');
  else if(dot>=0)x=body.length-dot-1===3?body.replace(/\./g,''):body;
  const amount=Number(x);return Number.isFinite(amount)?{currency:m[1],amount}:null;
}
const valueAfter=(text,label)=>{
  const i=text.toLowerCase().indexOf(label.toLowerCase());if(i<0)return null;
  return text.slice(i+label.length,i+label.length+140).split(/(?:Wins Recorded|Average Win|Biggest Win|Smallest Win|Average Time|Seeds At|Break-even Value|Chance of Win)/i)[0].trim();
};
export function parseStats(html){
  const text=textify(html);
  const money=k=>parseMoney(valueAfter(text,k));
  const number=k=>{const raw=valueAfter(text,k);const m=String(raw||'').match(/[\d,]+/);return m?Number(m[0].replace(/,/g,'')):null};
  const chanceRaw=valueAfter(text,'Chance of Win');
  const chance=chanceRaw?.match(/1\s+in\s+([\d,]+)/i)?.[1];
  const recent=[];
  const recentAt=text.indexOf('Recent Jackpot Wins');
  const biggestAt=text.indexOf('Biggest Jackpot Wins');
  if(recentAt>=0){
    const section=text.slice(recentAt,biggestAt>recentAt?biggestAt:recentAt+5000);
    for(const m of section.matchAll(/(?:\b\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+20\d{2}[^£€$]{0,90})?([£€$]\s*[\d][\d,.]*)/gi)){
      const p=parseMoney(m[1]);if(p)recent.push({...p,raw:m[1],context:m[0].slice(0,180)});
      if(recent.length>=50)break;
    }
  }
  return{
    seed:money('Seeds At'),breakEven:money('Break-even Value'),winsRecorded:number('Wins Recorded'),averageWin:money('Average Win'),biggestWin:money('Biggest Win'),smallestWin:money('Smallest Win'),averageTime:valueAfter(text,'Average Time')||null,chanceOneIn:chance?Number(chance.replace(/,/g,'')):null,recentWins:recent
  };
}
async function get(url){
  let error=null;for(let a=1;a<=3;a++)try{const r=await fetch(url,{redirect:'follow',signal:AbortSignal.timeout(25000),headers:{'user-agent':'Mozilla/5.0 LoteriasAI research','accept':'text/html,*/*'}});const html=await r.text();return{status:r.status,ok:r.ok,finalUrl:r.url,html};}catch(e){error=String(e);await sleep(a*600)}return{status:null,ok:false,finalUrl:url,html:'',error};
}
export async function build(now=new Date().toISOString()){
  const sources=[];
  for(const s of SOURCES){const r=await get(s.url);sources.push({...s,fetchedAt:now,httpStatus:r.status,fetchOk:r.ok,finalUrl:r.finalUrl,bytes:r.html.length,sha256:r.html?sha256(r.html):null,stats:parseStats(r.html),error:r.error||null});}
  return{version:'gamesys-legacy-history-probe-v1',generatedAt:now,purpose:'LEGACY_HISTORY_FOR_IDENTITY_AND_MODEL_PRIORS_ONLY',sources,botemaniaTargets:{'generic:diamondbonanza25BTM':'Danza de los Diamantes / Diamond Bonanza 25c lineage','generic:tikitemple2_1':'Tiki Templo / Tiki Temple lineage','generic:WAGER_BET':'Ultimate Video Poker progressive candidate'},analysisPolicy:{neverImportHistoricalSeedToSpain:true,neverImportHistoricalBreakEvenToSpain:true,neverAssumeHistoricalQualificationRule:true,useHistoryForMechanismAndDistributionPriorOnly:true,requireCurrentBotemaniaCounterBinding:true,requireCurrentSpainEconomics:true},guards:{positiveEVClaimAllowed:false,realMoneyAllowed:false,stakeEUR:0}};
}
if(import.meta.url===`file://${process.argv[1]}`){const out=await build();fs.mkdirSync('loterias-ai/casino/jackpots/evidence',{recursive:true});fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify({version:out.version,sources:out.sources.map(x=>({id:x.id,status:x.httpStatus,wins:x.stats.winsRecorded,seed:x.stats.seed,breakEven:x.stats.breakEven,chanceOneIn:x.stats.chanceOneIn,recent:x.stats.recentWins.length,error:x.error})),guards:out.guards},null,2));}

#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';

const CENSUS='loterias-ai/casino/jackpots/evidence/botemania-jpk-game-economics-census-v1.json';
const OUT='loterias-ai/casino/botemania-universe/evidence/botemania-jpk-wayback-pot-history-v1.json';
const UA='loterias-ai-jpk-wayback-pot-history/1.0';
const c=JSON.parse(fs.readFileSync(CENSUS,'utf8'));
const games=(c.rows||[]).filter(x=>x.slug&&/jackpot-king/i.test(x.slug)).map(x=>({slug:x.slug,title:x.title,url:`https://www.botemania.es/juegos/slots-online/${x.slug}`}));
const toText=h=>String(h||'').replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#160;/gi,' ').replace(/&euro;|&#8364;/gi,'€').replace(/&amp;/gi,'&').replace(/&#39;|&apos;/gi,"'").replace(/&quot;/gi,'"').replace(/\s+/g,' ').trim();
const parseEuro=s=>{if(s==null)return null;const n=Number(String(s).replace(/\./g,'').replace(',','.').replace(/[^0-9.-]/g,''));return Number.isFinite(n)?n:null;};
const observations=[];const gameSummaries=[];
for(const [gi,g] of games.entries()){
  const cdx=`https://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(g.url)}&output=json&fl=timestamp,original,statuscode,digest,mimetype&filter=statuscode:200&filter=mimetype:text/html&collapse=digest&from=2020&to=2026`;
  try{
    const cr=await fetch(cdx,{headers:{'user-agent':UA,accept:'application/json,text/plain,*/*'}});const raw=await cr.text();let table=null;try{table=JSON.parse(raw)}catch{}
    const rows=Array.isArray(table)&&table.length>1?table.slice(1).map(r=>({timestamp:r[0],original:r[1],digest:r[3]})):[];
    const selected=rows.length<=24?rows:rows.filter((_,i)=>i===0||i===rows.length-1||i%Math.ceil(rows.length/22)===0).slice(0,24);
    let ok=0,withAmounts=0;
    for(const r of selected){
      const replay=`https://web.archive.org/web/${r.timestamp}id_/${r.original}`;
      try{
        const fr=await fetch(replay,{headers:{'user-agent':UA,accept:'text/html,*/*'},redirect:'follow'});const html=await fr.text(),text=toText(html);ok+=fr.ok?1:0;
        const candidates=[];
        const patterns=[
          {tier:'JACKPOT_KING',re:/(?:Jackpot\s*King|Bote\s*Jackpot\s*King)[^€0-9]{0,100}(?:€\s*)?([0-9]{1,3}(?:\.[0-9]{3})*(?:,[0-9]{1,2})?|[0-9]{3,}(?:[.,][0-9]{1,2})?)\s*€/gi},
          {tier:'REGAL',re:/(?:Regal(?:\s*Pot)?|Majestuoso|Bote\s*Majestuoso)[^€0-9]{0,100}(?:€\s*)?([0-9]{1,3}(?:\.[0-9]{3})*(?:,[0-9]{1,2})?|[0-9]{3,}(?:[.,][0-9]{1,2})?)\s*€/gi},
          {tier:'ROYAL',re:/(?:Royal(?:\s*Pot)?|Bote\s*Real)[^€0-9]{0,100}(?:€\s*)?([0-9]{1,3}(?:\.[0-9]{3})*(?:,[0-9]{1,2})?|[0-9]{3,}(?:[.,][0-9]{1,2})?)\s*€/gi}
        ];
        for(const p of patterns){for(const m of text.matchAll(p.re)){const amount=parseEuro(m[1]);if(amount!==null&&amount>=0&&amount<10000000)candidates.push({tier:p.tier,amountEUR:amount,context:text.slice(Math.max(0,m.index-220),Math.min(text.length,m.index+m[0].length+260))});if(candidates.length>=18)break;}}
        // Also preserve raw jackpot-like currency contexts for later manual/model review.
        const rawContexts=[];for(const m of text.matchAll(/(?:Jackpot\s*King|Regal|Royal|Majestuoso|Bote\s*Real)[^\n]{0,180}?€[^\n]{0,100}/gi)){rawContexts.push(m[0].slice(0,380));if(rawContexts.length>=20)break;}
        if(candidates.length)withAmounts++;
        observations.push({slug:g.slug,title:g.title,timestamp:r.timestamp,replayUrl:replay,httpStatus:fr.status,bytes:html.length,sha256:crypto.createHash('sha256').update(html).digest('hex'),candidates,rawContexts});
      }catch(e){observations.push({slug:g.slug,title:g.title,timestamp:r.timestamp,replayUrl:replay,error:String(e?.message||e),candidates:[]});}
    }
    gameSummaries.push({slug:g.slug,title:g.title,cdxHttpStatus:cr.status,uniqueSnapshots:rows.length,selected:selected.length,successfulFetches:ok,snapshotsWithPotCandidates:withAmounts});
  }catch(e){gameSummaries.push({slug:g.slug,title:g.title,error:String(e?.message||e),uniqueSnapshots:0,selected:0,successfulFetches:0,snapshotsWithPotCandidates:0});}
}
const candidateRows=observations.filter(x=>x.candidates?.length);
const byTier={JACKPOT_KING:[],REGAL:[],ROYAL:[]};for(const o of candidateRows){for(const x of o.candidates||[])byTier[x.tier]?.push({slug:o.slug,timestamp:o.timestamp,amountEUR:x.amountEUR,replayUrl:o.replayUrl,context:x.context});}
for(const k of Object.keys(byTier))byTier[k].sort((a,b)=>String(a.timestamp).localeCompare(String(b.timestamp)));
const drops={};for(const [tier,arr] of Object.entries(byTier)){const ev=[];for(let i=1;i<arr.length;i++){const p=arr[i-1],q=arr[i];if(q.amountEUR<p.amountEUR*0.9)ev.push({previous:p,current:q,dropEUR:Number((p.amountEUR-q.amountEUR).toFixed(2)),classification:'HISTORICAL_DISCOVERY_DROP_ONLY'});}drops[tier]=ev;}
const out={version:'botemania-jpk-wayback-pot-history-v1',generatedAt:new Date().toISOString(),operator:'botemania-es',gameCount:games.length,gameSummaries,observations,candidateSeries:byTier,historicalDropCandidates:drops,summary:{totalSnapshotsIndexed:gameSummaries.reduce((s,x)=>s+(x.uniqueSnapshots||0),0),snapshotsFetched:observations.length,snapshotsWithPotCandidates:candidateRows.length,tierCandidateCounts:Object.fromEntries(Object.entries(byTier).map(([k,v])=>[k,v.length])),dropCandidateCounts:Object.fromEntries(Object.entries(drops).map(([k,v])=>[k,v.length]))},interpretation:'Wayback-derived jackpot amount candidates are discovery evidence only. They may contain stale/display/copy values and cannot promote real-money gates without independent validation.',guards:{publicWaybackOnly:true,operatorPagesOnly:true,noFutureLeakage:true,discoveryOnly:true,noAutomaticResetClassification:true,noBetting:true,realMoneyAllowed:false}};
fs.mkdirSync('loterias-ai/casino/botemania-universe/evidence',{recursive:true});fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify({summary:out.summary,gameSummaries,dropCandidateCounts:out.summary.dropCandidateCounts},null,2));

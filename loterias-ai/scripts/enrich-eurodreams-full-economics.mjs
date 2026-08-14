import fs from 'node:fs';

const base='https://eu-dreams.com';
const years=[2023,2024,2025,2026];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const get=async url=>{let err;for(let a=1;a<=4;a++){try{const r=await fetch(url,{redirect:'follow',signal:AbortSignal.timeout(15000),headers:{'user-agent':'LoteriasAI/1.0 research archive','accept':'text/html'}});if(r.ok)return await r.text();err=new Error(`HTTP ${r.status}`);}catch(e){err=e}await sleep(a*350)}throw err};
const clean=html=>html.replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#160;/gi,' ').replace(/&euro;|&#8364;/gi,'€').replace(/&ordm;/gi,'º').replace(/&ordf;/gi,'ª').replace(/&aacute;/gi,'á').replace(/&eacute;/gi,'é').replace(/&iacute;/gi,'í').replace(/&oacute;/gi,'ó').replace(/&uacute;/gi,'ú').replace(/\s+/g,' ').trim();
const euro=s=>{if(!s)return null;const n=Number(String(s).replace(/\./g,'').replace(',','.'));return Number.isFinite(n)?n:null};
const iso=url=>{const m=url.match(/(\d{2})-(\d{2})-(\d{4})$/);return m?`${m[3]}-${m[2]}-${m[1]}`:null};
function parse(url,html){
 const date=iso(url),text=clean(html);if(!date)return null;
 const w=text.match(/Números ganadores\s+((?:\d{1,2}\s+){6})(\d{1,2})\s+Austria/i);if(!w)return null;
 const main=w[1].trim().split(/\s+/).map(Number),dream=Number(w[2]);if(main.length!==6||new Set(main).size!==6)return null;
 const esStart=text.indexOf('España'),esEnd=text.indexOf('Luxemburgo',esStart);if(esStart<0)return null;const esp=text.slice(esStart,esEnd>esStart?esEnd:text.length);
 const count=(label)=>{const m=esp.match(new RegExp(label+'\\s*:?\\s*(\\d+)[xX]','i'));return m?Number(m[1]):0};
 const cat=(hits)=>{const m=esp.match(new RegExp(`${hits} aciertos\\s+([0-9.]+) ganadores de ([0-9.,]+)\\s*€`,'i'));return m?{winners:Number(m[1].replace(/\./g,'')),prize:euro(m[2])}:null};
 const allStart=text.indexOf('Todos los países participantes'),all=text.slice(allStart>=0?allStart:0);
 const totalCount=(label)=>{const m=all.match(new RegExp(label+'\\s*:?\\s*(\\d+)[xX]','i'));return m?Number(m[1]):null};
 const drawNo=Number((text.match(/Sorteo n\.?º\s*(\d+)/i)||[])[1]||0)||null;
 // SELAE changed EuroDreams prize mechanics in 2025. Keep the era explicit so models never blend incompatible economics silently.
 const ruleEra=date<'2025-09-29'?'ORIGINAL_2023_2025':'POST_2025_CHANGE';
 return {date,drawNo,main,dream,ruleEra,economics:{ticketCost:2.5,currency:'EUR',spain:{firstPrizeWinners:count('Ganadores del primer premio'),secondPrizeWinners:count('Ganadores del segundo premio'),five:cat(5),four:cat(4),three:cat(3),two:cat(2)},allCountries:{firstPrizeWinners:totalCount('Ganadores del primer premio'),secondPrizeWinners:totalCount('Ganadores del segundo premio')},annuityPrizeTreatment:'FIRST_AND_SECOND_PRIZE_COUNTS_STORED; nominal annuity terms require era-specific official rule table before financial ROI valuation.',source:{provider:'EU-Dreams.com',url,capturedAt:new Date().toISOString()},validation:{status:'SECONDARY_PARSED_PENDING_OFFICIAL_CROSS_CHECK'}}};
}
const links=[];for(const year of years){const html=await get(`${base}/es/resultados/${year}`);for(const m of html.matchAll(/href=["']([^"']*\/es\/resultados\/\d{2}-\d{2}-\d{4})["']/gi))links.push(new URL(m[1],base).href)}
const uniq=[...new Set(links)],rows=[];let cursor=0;const failures=[];
async function worker(){while(true){const i=cursor++;if(i>=uniq.length)return;const url=uniq[i];try{const row=parse(url,await get(url));if(row)rows.push(row);else failures.push({url,reason:'parse-null'});}catch(e){failures.push({url,reason:String(e)})}}}
await Promise.all(Array.from({length:5},()=>worker()));
rows.sort((a,b)=>a.date.localeCompare(b.date));
const byDate=new Map(rows.map(r=>[r.date,r]));const dir='loterias-ai/data/archive/eurodreams';let matched=0,updated=0;
for(const year of years){const path=`${dir}/${year}.json`;if(!fs.existsSync(path))continue;const doc=JSON.parse(fs.readFileSync(path,'utf8'));for(const rec of doc.records||[]){const e=byDate.get(rec.drawDate);if(!e)continue;matched++;if((rec.result?.main||[]).map(Number).join(',')!==e.main.join(',')||Number(rec.result?.dream)!==e.dream)throw new Error(`EuroDreams result mismatch ${rec.drawDate}`);rec.drawNumber=e.drawNo;rec.ruleEra=e.ruleEra;rec.economics=e.economics;updated++;}fs.writeFileSync(path,JSON.stringify(doc,null,2)+'\n')}
const summary={generatedAt:new Date().toISOString(),gameId:'eurodreams',source:'EU-Dreams.com',links:uniq.length,parsed:rows.length,matched,updated,failures,earliest:rows[0]?.date||null,latest:rows.at(-1)?.date||null,ruleEras:Object.fromEntries([...new Set(rows.map(r=>r.ruleEra))].map(k=>[k,rows.filter(r=>r.ruleEra===k).length]))};fs.mkdirSync('loterias-ai/data/archive/_meta',{recursive:true});fs.writeFileSync('loterias-ai/data/archive/_meta/eurodreams-economics-ingestion.json',JSON.stringify(summary,null,2)+'\n');console.log(JSON.stringify({...summary,failures:failures.length},null,2));if(updated<280)throw new Error(`EuroDreams economics coverage too low ${updated}/290`);

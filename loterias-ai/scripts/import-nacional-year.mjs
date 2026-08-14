import fs from 'node:fs';

const year=Number(process.env.YEAR||2026);
if(!Number.isInteger(year)||year<2012||year>2100)throw new Error('Invalid YEAR');
const base='https://www.loterianacional.com';
const archiveUrl=`${base}/es/loteria-nacional/resultados/${year}`;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const get=async url=>{let last;for(let attempt=1;attempt<=5;attempt++){try{const r=await fetch(url,{redirect:'follow',signal:AbortSignal.timeout(18000),headers:{'user-agent':'Mozilla/5.0 (compatible; LoteriasAIResearch/1.0)','accept':'text/html,application/xhtml+xml'}});const text=await r.text();if(r.ok&&/Loter[ií]a Nacional|Primer Premio/i.test(text))return text;last=new Error(`${r.status} ${url}`);}catch(e){last=e}await sleep(600*attempt);}throw last||new Error('fetch failed')};
const clean=html=>html.replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#160;/gi,' ').replace(/&euro;|&#8364;/gi,'€').replace(/&ntilde;/gi,'ñ').replace(/&aacute;/gi,'á').replace(/&eacute;/gi,'é').replace(/&iacute;/gi,'í').replace(/&oacute;/gi,'ó').replace(/&uacute;/gi,'ú').replace(/&ordm;/gi,'º').replace(/\s+/g,' ').trim();
const eur=s=>{if(!s)return null;const n=Number(String(s).replace(/\./g,'').replace(',','.'));return Number.isFinite(n)?n:null};
const section=(text,start,endLabels)=>{const i=text.toLowerCase().indexOf(start.toLowerCase());if(i<0)return '';let e=text.length;for(const x of endLabels){const k=text.toLowerCase().indexOf(x.toLowerCase(),i+start.length);if(k>=0&&k<e)e=k;}return text.slice(i+start.length,e)};
const nums=(s,digits)=>[...s.matchAll(new RegExp(`\\b(\\d{${digits}})\\b`,'g'))].map(m=>m[1]);
function parseDetail(url,html){
 const text=clean(html),dm=url.match(/(\d{2})-(\d{2})-(\d{4})$/);if(!dm)return null;const date=`${dm[3]}-${dm[2]}-${dm[1]}`;
 const first=(text.match(/Primer\s+Premio\s*:?\s*(\d{5})/i)||[])[1]||null;
 const second=(text.match(/Segundo\s+Premio\s*:?\s*(\d{5})/i)||[])[1]||null;
 const third=(text.match(/Tercer\s+Premio\s*:?\s*(\d{5})/i)||[])[1]||null;
 const five=nums(section(text,'Terminación de 5 cifras:',['Terminación de 4 cifras:','Terminación de 3 cifras:','Terminación de 2 cifras:','Reintegro:','Desglose de premios']),5);
 const four=nums(section(text,'Terminación de 4 cifras:',['Terminación de 3 cifras:','Terminación de 2 cifras:','Reintegro:','Desglose de premios']),4);
 const three=nums(section(text,'Terminación de 3 cifras:',['Terminación de 2 cifras:','Reintegro:','Desglose de premios']),3);
 const two=nums(section(text,'Terminación de 2 cifras:',['Reintegro:','Desglose de premios']),2);
 const reintegro=[...new Set(nums(section(text,'Reintegro:',['Desglose de premios','Resultado anterior']),1).map(Number))].sort((a,b)=>a-b);
 const labels={first:'Primer Premio',second:'Segundo Premio',third:'Tercer Premio',fiveDigit:'Extracción de 5 cifras',fourDigit:'Extracción de 4 cifras',threeDigit:'Extracción de 3 cifras',twoDigit:'Extracción de 2 cifras',specialReintegro:'Reintegros Especiales',specialPrize:'Premio Especial'};
 const payouts={};for(const[k,label]of Object.entries(labels)){const m=text.match(new RegExp(label+'\\s+([0-9.]+(?:,[0-9]{2})?)\\s*€','i'));payouts[k]=m?eur(m[1]):null;}
 const special=/navidad/i.test(text)||date.endsWith('-12-22')?'NAVIDAD':(/niño|nino/i.test(text)||date.endsWith('-01-06')?'EL_NINO':'REGULAR_OR_OTHER_EXTRAORDINARY');
 if(!first||!second)return null;
 return {drawId:`loteria-nacional-${date}`,gameId:'loteria-nacional',drawDate:date,drawType:special,result:{firstPrize:first,secondPrize:second,thirdPrize:third,terminations:{fiveDigit:five,fourDigit:four,threeDigit:three,twoDigit:two},reintegro},economics:{ticketCost:null,currency:'EUR',payouts,source:{provider:'LoteriaNacional.com',url,capturedAt:new Date().toISOString()},validation:{status:'SECONDARY_PARSED_PENDING_OFFICIAL_CROSS_CHECK'}},source:{provider:'LoteriaNacional.com',tier:'secondary-history',url,validation:'pending-official-cross-check'}};
}
const indexHtml=await get(archiveUrl);
const links=[...new Set([...indexHtml.matchAll(/href=["']([^"']*\/es\/loteria-nacional\/resultados\/\d{2}-\d{2}-\d{4})["']/gi)].map(m=>new URL(m[1],base).href))];
if(links.length<20)throw new Error(`Too few Nacional draw links for ${year}: ${links.length}`);
const records=[],failures=[];
for(const [i,url] of links.entries()){
 try{const html=await get(url),rec=parseDetail(url,html);if(rec)records.push(rec);else failures.push({url,reason:'parse-null',sample:clean(html).slice(0,300)});}catch(e){failures.push({url,reason:String(e)})}
 if(i<links.length-1)await sleep(180);
}
records.sort((a,b)=>a.drawDate.localeCompare(b.drawDate));
if(year===2026){const r=records.find(x=>x.drawDate==='2026-07-16');if(!r||r.result.firstPrize!=='11312'||r.result.secondPrize!=='78148'||r.result.reintegro.join(',')!=='2,3,5')throw new Error('SELAE 2026-07-16 spot check failed');r.source.validation='OFFICIAL_SPOT_CHECK_PASS';r.economics.validation.status='SECONDARY_PARSED_OFFICIAL_RESULT_SPOT_CHECK_PASS';}
const dir='loterias-ai/data/archive/loteria-nacional';fs.mkdirSync(dir,{recursive:true});const path=`${dir}/${year}.json`;
let old={records:[]};if(fs.existsSync(path))try{old=JSON.parse(fs.readFileSync(path,'utf8'))}catch{}
const freshMap=new Map(records.map(r=>[r.drawDate,r]));const merged=[...new Map([...(old.records||[]).map(r=>[r.drawDate,r]),...records.map(r=>[r.drawDate,{...(old.records||[]).find(o=>o.drawDate===r.drawDate),...r}])]).values()].sort((a,b)=>a.drawDate.localeCompare(b.drawDate));
const doc={gameId:'loteria-nacional',year,verificationLevel:year===2026?'SECONDARY_WITH_SELAE_SPOT_CHECK':'SECONDARY_PARSED',records:merged};fs.writeFileSync(path,JSON.stringify(doc,null,2)+'\n');
const summary={generatedAt:new Date().toISOString(),gameId:'loteria-nacional',year,indexUrl:archiveUrl,links:links.length,records:merged.length,freshParsed:records.length,failures,navidad:merged.filter(r=>r.drawType==='NAVIDAD').length,nino:merged.filter(r=>r.drawType==='EL_NINO').length,withFullMinorExtractions:merged.filter(r=>r.result?.terminations?.fourDigit?.length&&r.result?.terminations?.threeDigit?.length&&r.result?.terminations?.twoDigit?.length).length};fs.writeFileSync(`${dir}/${year}-import-summary.json`,JSON.stringify(summary,null,2)+'\n');console.log(JSON.stringify({...summary,failures:failures.length},null,2));if(records.length<Math.max(20,links.length*0.8))throw new Error(`Nacional parse coverage too low: ${records.length}/${links.length}`);

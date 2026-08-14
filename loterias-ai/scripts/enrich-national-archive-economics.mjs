import fs from 'node:fs';

const clean=s=>s.replace(/<[^>]*>/g,' ').replace(/&nbsp;|&#160;/gi,' ').replace(/&ordf;/gi,'ª').replace(/&eacute;/gi,'é').replace(/&iacute;/gi,'í').replace(/&aacute;/gi,'á').replace(/&oacute;/gi,'ó').replace(/\s+/g,' ').trim();
const money=s=>!s||/BOTE/i.test(s)?0:Number(String(s).replace(/,/g,''));
const sources={
  primitiva:{url:'https://www.azarysuerte.es/HistoricoPR.php',prefix:'primitiva',parser:parsePrimitiva,ticketCost:1},
  euromillones:{url:'https://www.azarysuerte.es/HistoricoEM.php',prefix:'euromillones',parser:parseEuromillones,ticketCost:2.5},
  bonoloto:{url:'https://www.azarysuerte.es/HistoricoBO.php/',prefix:'bonoloto',parser:parseBonoloto,ticketCost:0.5},
  'gordo-primitiva':{url:'https://www.azarysuerte.es/HistoricoEG.php',prefix:'gordo-primitiva',parser:parseElGordo,ticketCost:1.5},
};
function anchors(html){return [...html.matchAll(/Premios_colapse\((\d{8})\)/g)].map(m=>({id:m[1],index:m.index}));}
function dateOf(id){return `${id.slice(0,4)}-${id.slice(4,6)}-${id.slice(6,8)}`}
function parsePrimitiva(html){const out=[];const aa=anchors(html);for(let i=0;i<aa.length;i++){const a=aa[i],start=Math.max(0,a.index-1900),end=i+1<aa.length?aa[i+1].index:html.length,before=html.slice(start,a.index),text=clean(html.slice(a.index,end));const main=[...before.matchAll(/class="ncPR">\s*(\d{1,2})\s*</gi)].map(x=>Number(x[1])).slice(-6),comp=[...before.matchAll(/class="ncBL">\s*C(?:&nbsp;|\s)*(\d{1,2})/gi)].map(x=>Number(x[1])).at(-1)??null,reintegro=[...before.matchAll(/class="ncPR">\s*R(?:&nbsp;|\s)*(\d)/gi)].map(x=>Number(x[1])).at(-1)??null;const get=label=>{const m=text.match(new RegExp(label+'\\s+([0-9,.]+|BOTE)\\s+[0-9,.]+','i'));return m?money(m[1]):0};const payouts={six:get('1ª\\s*\\(6 Aciertos\\)'),fiveC:get('2ª\\s*\\(5 Aciertos \\+ C\\)'),five:get('3ª\\s*\\(5 Aciertos\\)'),four:get('4ª\\s*\\(4 Aciertos\\)'),three:get('5ª\\s*\\(3 Aciertos\\)')};if(main.length===6&&Object.values(payouts).some(x=>x>0))out.push({date:dateOf(a.id),main,complementary:comp,reintegro,payouts});}return out;}
function parseBonoloto(html){
 const text=clean(html.replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' '));
 const aa=[...text.matchAll(/Fecha:\s*(\d{2}\/\d{2}\/\d{4})/gi)],out=[];
 const iso=s=>{const m=s.match(/(\d{2})\/(\d{2})\/(\d{4})/);return `${m[3]}-${m[2]}-${m[1]}`};
 for(let i=0;i<aa.length;i++){
  const start=aa[i].index,end=i+1<aa.length?aa[i+1].index:text.length,block=text.slice(Math.max(0,start-300),end),date=iso(aa[i][1]),pre=block.slice(0,block.indexOf('Fecha:'));
  const cr=pre.match(/(?:^|\s)(\d{1,2})\s+(\d{1,2})\s+(\d{1,2})\s+(\d{1,2})\s+(\d{1,2})\s+(\d{1,2})\s+C\s+(\d{1,2})\s+R\s+(\d)/i);if(!cr)continue;
  const cat=label=>{const m=block.match(new RegExp(label+'\\s+(BOTE|[\\d,.]+)\\s+([\\d,.]+)','i'));return m?money(m[1]):0};
  const payouts={six:cat('1ª \\(6 Aciertos\\)'),fiveC:cat('2ª \\(5 Aciertos \\+ C\\)'),five:cat('3ª \\(5 Aciertos\\)'),four:cat('4ª \\(4 Aciertos\\)'),three:cat('5ª \\(3 Aciertos\\)')};
  if(Object.values(payouts).some(x=>x>0))out.push({date,main:cr.slice(1,7).map(Number),complementary:Number(cr[7]),reintegro:Number(cr[8]),payouts});
 }
 return out;
}
function parseEuromillones(html){const out=[];const aa=anchors(html);for(let i=0;i<aa.length;i++){const a=aa[i],start=Math.max(0,a.index-1800),end=i+1<aa.length?aa[i+1].index:html.length,before=html.slice(start,a.index),text=clean(html.slice(a.index,end));const main=[...before.matchAll(/class="ncEM">\s*(\d{1,2})\s*</gi)].map(x=>Number(x[1])).slice(-5),stars=[...before.matchAll(/class="ncET">\s*(\d{1,2})\s*</gi)].map(x=>Number(x[1])).slice(-2),payouts={};for(const m of text.matchAll(/(\d+ª)\s+(\d)\s*\+\s*(\d)\s+([0-9,.]+|BOTE)/g))payouts[`${m[2]}+${m[3]}`]=money(m[4]);if(main.length===5&&stars.length===2&&Object.keys(payouts).length>=8)out.push({date:dateOf(a.id),main,stars,payouts});}return out;}
function parseElGordo(html){const out=[];const aa=anchors(html);for(let i=0;i<aa.length;i++){const a=aa[i],start=Math.max(0,a.index-2100),end=i+1<aa.length?aa[i+1].index:html.length,before=html.slice(start,a.index),text=clean(html.slice(a.index,end));const main=[...before.matchAll(/class="ncEG">\s*(\d{1,2})\s*</gi)].map(x=>Number(x[1])).slice(-5),key=[...before.matchAll(/class="ncBL">\s*C\/R(?:&nbsp;|\s)*(\d)/gi)].map(x=>Number(x[1])).at(-1)??null;const payouts={};for(const m of text.matchAll(/(\d+ª)\s*\((\d)\s*\+\s*(\d)\)\s+(BOTE|[0-9,.]+)/gi))payouts[`${m[2]}+${m[3]}`]=money(m[4]);const rein=text.match(/Reintegro\s+(BOTE|[0-9,.]+)/i);if(rein)payouts.reintegro=money(rein[1]);const revenue=(text.match(/Recaudacion:\s*([0-9,.]+)/i)||[])[1],jackpot=(text.match(/Premio bote:\s*([0-9,.]+)/i)||[])[1];if(main.length===5&&key!=null&&Object.keys(payouts).length>=8)out.push({date:dateOf(a.id),main,key,payouts,revenue:money(revenue),jackpot:money(jackpot)});}return out;}

const summary={generatedAt:new Date().toISOString(),games:{}};
for(const [gameId,cfg] of Object.entries(sources)){
  const r=await fetch(cfg.url,{headers:{'user-agent':'LoteriasAI/1.0 research','accept':'text/html'}});if(!r.ok)throw new Error(`${gameId} HTTP ${r.status}`);const rows=cfg.parser(await r.text());let matched=0,updated=0,missing=0;
  const byYear=new Map();for(const row of rows){const y=row.date.slice(0,4);if(!byYear.has(y))byYear.set(y,[]);byYear.get(y).push(row)}
  for(const [year,ys] of byYear){const path=`loterias-ai/data/archive/${cfg.prefix}/${year}.json`;if(!fs.existsSync(path)){missing+=ys.length;continue;}const doc=JSON.parse(fs.readFileSync(path,'utf8')),map=new Map(ys.map(x=>[x.date,x]));for(const rec of doc.records||[]){const e=map.get(rec.drawDate);if(!e)continue;matched++;rec.economics={ticketCost:cfg.ticketCost,currency:'EUR',payouts:e.payouts,revenue:e.revenue??rec.economics?.revenue??null,jackpot:e.jackpot??rec.economics?.jackpot??null,source:{provider:'Azar y Suerte',url:cfg.url,capturedAt:new Date().toISOString()},validation:{status:'SOURCE_PARSED_PENDING_CROSS_CHECK'}};if(e.complementary!=null)rec.result.complementary=e.complementary;if(e.reintegro!=null)rec.result.reintegro=e.reintegro;if(e.stars)rec.result.stars=e.stars;if(e.key!=null)rec.result.key=e.key;updated++;}
    fs.writeFileSync(path,JSON.stringify(doc,null,2)+'\n');
  }
  summary.games[gameId]={source:cfg.url,parsed:rows.length,matched,updated,missing};
}
fs.mkdirSync('loterias-ai/data/archive/_meta',{recursive:true});fs.writeFileSync('loterias-ai/data/archive/_meta/economics-ingestion.json',JSON.stringify(summary,null,2)+'\n');console.log(JSON.stringify(summary,null,2));
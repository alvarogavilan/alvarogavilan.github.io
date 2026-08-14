import fs from 'node:fs';
const url='https://www.azarysuerte.es/HistoricoBO.php/';
const r=await fetch(url,{headers:{'user-agent':'LoteriasAI/1.0 research archive'}});if(!r.ok)throw new Error('HTTP '+r.status);const html=await r.text();
const text=html.replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#160;/gi,' ').replace(/&ordf;/gi,'ª').replace(/&eacute;/gi,'é').replace(/&iacute;/gi,'í').replace(/&aacute;/gi,'á').replace(/&oacute;/gi,'ó').replace(/\s+/g,' ');
const money=s=>{if(!s||/BOTE/i.test(s))return null;const z=String(s).replace(/,/g,'');const n=Number(z);return Number.isFinite(n)?n:null};
const dateISO=s=>{const m=s.match(/(\d{2})\/(\d{2})\/(\d{4})/);return m?`${m[3]}-${m[2]}-${m[1]}`:null};
const anchors=[...text.matchAll(/Fecha:\s*(\d{2}\/\d{2}\/\d{4})/gi)];const rows=[];
for(let i=0;i<anchors.length;i++){
 const date=dateISO(anchors[i][1]),start=anchors[i].index,end=i+1<anchors.length?anchors[i+1].index:text.length,block=text.slice(Math.max(0,start-260),end);
 const comb=[...block.matchAll(/\b(\d{1,2})\b/g)].map(x=>Number(x[1]));
 // Use explicit C/R pattern if visible in the block before Fecha.
 const pre=block.slice(0,block.indexOf('Fecha:'));
 const cr=pre.match(/(?:^|\s)(\d{1,2})\s+(\d{1,2})\s+(\d{1,2})\s+(\d{1,2})\s+(\d{1,2})\s+(\d{1,2})\s+C\s+(\d{1,2})\s+R\s+(\d)/i);
 const cat=(label)=>{const re=new RegExp(label+'\\s+(BOTE|[\\d,.]+)\\s+([\\d,.]+)','i'),m=block.match(re);return m?{publishedPrize:money(m[1]),winners:money(m[2])}:null};
 const rec=(block.match(/Recaudacion:\s*([\d,]+)/i)||[])[1],jack=(block.match(/Premio bote:\s*([\d,]+)/i)||[])[1];
 const row={drawDate:date,result:cr?{main:cr.slice(1,7).map(Number),complementary:Number(cr[7]),reintegro:Number(cr[8])}:null,revenue:money(rec),jackpot:money(jack),categories:{six:cat('1ª \\(6 Aciertos\\)'),fiveC:cat('2ª \\(5 Aciertos \\+ C\\)'),five:cat('3ª \\(5 Aciertos\\)'),four:cat('4ª \\(4 Aciertos\\)'),three:cat('5ª \\(3 Aciertos\\)'),reintegro:cat('Reintegro')}};
 if(row.result&&row.categories.three&&row.categories.reintegro)rows.push(row);
}
rows.sort((a,b)=>a.drawDate.localeCompare(b.drawDate));fs.mkdirSync('loterias-ai/data/prizes',{recursive:true});fs.writeFileSync('loterias-ai/data/prizes/bonoloto-recent.json',JSON.stringify({generatedAt:new Date().toISOString(),source:url,records:rows},null,2)+'\n');fs.writeFileSync('loterias-ai/data/prizes/bonoloto-recent-summary.json',JSON.stringify({generatedAt:new Date().toISOString(),parsed:rows.length,earliest:rows[0]?.drawDate||null,latest:rows.at(-1)?.drawDate||null,withSixPublished:rows.filter(x=>x.categories.six?.publishedPrize).length},null,2)+'\n');console.log({parsed:rows.length,earliest:rows[0]?.drawDate,latest:rows.at(-1)?.drawDate});if(rows.length<20)throw new Error('Too few prize rows parsed: '+rows.length);
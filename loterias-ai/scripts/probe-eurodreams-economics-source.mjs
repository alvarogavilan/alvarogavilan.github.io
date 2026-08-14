import fs from 'node:fs';
const base='https://eu-dreams.com';
const years=[2023,2024,2025,2026];
const out={generatedAt:new Date().toISOString(),years:{},samples:[]};
const get=async url=>{const r=await fetch(url,{redirect:'follow',signal:AbortSignal.timeout(12000),headers:{'user-agent':'LoteriasAI/1.0 research archive','accept':'text/html'}});return {r,text:await r.text()}};
const clean=html=>html.replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#160;/gi,' ').replace(/&euro;|&#8364;/gi,'€').replace(/&ordm;/gi,'º').replace(/&ordf;/gi,'ª').replace(/&aacute;/gi,'á').replace(/&eacute;/gi,'é').replace(/&iacute;/gi,'í').replace(/&oacute;/gi,'ó').replace(/&uacute;/gi,'ú').replace(/\s+/g,' ').trim();
for(const year of years){
 const url=`${base}/es/resultados/${year}`;
 try{
  const {r,text:html}=await get(url);
  const links=[...html.matchAll(/href=["']([^"']*\/es\/resultados\/\d{2}-\d{2}-\d{4}[^"']*)["']/gi)].map(m=>new URL(m[1],base).href);
  const uniq=[...new Set(links)];
  out.years[year]={url,status:r.status,bytes:html.length,detailLinks:uniq.length,first:uniq[0]||null,last:uniq.at(-1)||null};
  if(year===2026)for(const detailUrl of uniq.slice(0,2)){
    try{const {r:d,text}=await get(detailUrl),c=clean(text);const candidates=['Ganadores España','Ganadores','Premios','1er premio','Primer premio','Premio'];let at=-1;for(const q of candidates){at=c.toLowerCase().indexOf(q.toLowerCase());if(at>=0)break;}out.samples.push({url:detailUrl,status:d.status,bytes:text.length,hasPrizeWords:/premio|prize|ganadores|winners/i.test(text),hasCategories:/1ª|2ª|categor/i.test(text),textSample:c.slice(Math.max(0,at-800),Math.min(c.length,(at<0?0:at)+6500))});}catch(e){out.samples.push({url:detailUrl,error:String(e)})}
  }
 }catch(e){out.years[year]={url,error:String(e)}}
}
fs.mkdirSync('loterias-ai/data/probes',{recursive:true});fs.writeFileSync('loterias-ai/data/probes/eurodreams-economics-source.json',JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify(out,null,2));

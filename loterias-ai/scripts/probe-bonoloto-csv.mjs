import fs from 'node:fs';
const urls=[
 {era:'2013-2026',url:'https://docs.google.com/spreadsheets/d/e/2PACX-1vQALTRaLDFfhXOAQmeONPqmFKm9yOiQ4W97rhWgR41BZ7czFsjK5YktD6fnETKHGB9YUnyQ4XBSbhZx/pub?gid=0&output=csv&single=true'},
 {era:'1988-2012',url:'https://docs.google.com/spreadsheets/d/e/2PACX-1vQALTRaLDFfhXOAQmeONPqmFKm9yOiQ4W97rhWgR41BZ7czFsjK5YktD6fnETKHGB9YUnyQ4XBSbhZx/pub?gid=1&output=csv&single=true'}
];
const out=[];for(const x of urls){try{const r=await fetch(x.url,{redirect:'follow',headers:{'user-agent':'LoteriasAI/1.0 research archive'}});const text=await r.text();out.push({era:x.era,status:r.status,contentType:r.headers.get('content-type'),length:text.length,preview:text.slice(0,2000)});console.log('\n### '+x.era+' '+r.status+' '+text.length+'\n'+text.slice(0,1200));}catch(e){out.push({era:x.era,error:String(e)})}}
fs.mkdirSync('loterias-ai/data/probes',{recursive:true});fs.writeFileSync('loterias-ai/data/probes/bonoloto-csv-latest.json',JSON.stringify({generatedAt:new Date().toISOString(),sources:out},null,2)+'\n');
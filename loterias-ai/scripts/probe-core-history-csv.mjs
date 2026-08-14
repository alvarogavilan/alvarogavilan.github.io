import fs from 'node:fs';
const sources={
  primitiva_1985_2012:'https://docs.google.com/spreadsheets/d/e/2PACX-1vTov1BuA0nkVGTS48arpPFkc9cG7B40Xi3BfY6iqcWTrMwCBg5b50-WwvnvaR6mxvFHbDBtYFKg5IsJ/pub?gid=0&output=csv&single=true',
  primitiva_2013_2026:'https://docs.google.com/spreadsheets/d/e/2PACX-1vTov1BuA0nkVGTS48arpPFkc9cG7B40Xi3BfY6iqcWTrMwCBg5b50-WwvnvaR6mxvFHbDBtYFKg5IsJ/pub?gid=1&output=csv&single=true',
  euromillones:'https://docs.google.com/spreadsheets/d/e/2PACX-1vRy91wfK2JteoMi1ZOhGm0D1RKJfDTbEOj6rfnrB6-X7n2Q1nfFwBZBpcivHRdg3pSwxSQgLA3KpW7v/pub?output=csv',
  gordo:'https://docs.google.com/spreadsheets/d/e/2PACX-1vRR678qNlN_3p2dAxRG0LULS6EYmBbEmpfVhCEmsYky6eiuEH3o_mCRc4c2_EevPru_3BJfSV0QwpG8/pub?output=csv',
  eurodreams:'https://docs.google.com/spreadsheets/d/e/2PACX-1vTZzm-CTUj3li4EdfW1ImthPdc0AGIymq8tbuwPiqjW0OL4F1MWO5G6PfPEtNvLJcY8MpJo4apayTip/pub?output=csv'
};
const out={generatedAt:new Date().toISOString(),sources:{}};
for(const [id,url] of Object.entries(sources)){
  try{
    const r=await fetch(url,{redirect:'follow'});const t=await r.text();const lines=t.replace(/^\uFEFF/,'').split(/\r?\n/).filter(Boolean);
    out.sources[id]={status:r.status,contentType:r.headers.get('content-type'),bytes:t.length,rows:Math.max(0,lines.length-1),header:lines[0]||'',preview:lines.slice(0,4)};
  }catch(e){out.sources[id]={error:String(e)}}
}
fs.mkdirSync('loterias-ai/data/probes',{recursive:true});fs.writeFileSync('loterias-ai/data/probes/core-history-csv.json',JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify(out,null,2));
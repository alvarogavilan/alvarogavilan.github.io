import fs from 'node:fs';
const cfg=JSON.parse(fs.readFileSync('loterias-ai/data/selae-feed-endpoints.json','utf8'));
const today=new Date().toISOString().slice(0,10).replaceAll('-','');
const out={checkedAt:new Date().toISOString(),dateProbe:today,feeds:[]};
for(const f of cfg.feeds){
  const url=cfg.datedEndpointBase+f.template.replace('{YYYYMMDD}',today);
  try{
    const r=await fetch(url,{redirect:'follow',headers:{'user-agent':'LoteriasAI-SourceProbe/1.0'}});
    const body=await r.text();
    out.feeds.push({gameId:f.gameId,url,status:r.status,ok:r.ok,bytes:body.length,looksHtml:/<html|<!doctype/i.test(body),hasContent:body.trim().length>20});
  }catch(e){out.feeds.push({gameId:f.gameId,url,status:0,ok:false,error:String(e&&e.message||e)});}
}
fs.writeFileSync('loterias-ai/data/source-probe-latest.json',JSON.stringify(out,null,2)+'\n');
const reachable=out.feeds.filter(x=>x.ok).length;
console.log(`SELAE probe reachable ${reachable}/${out.feeds.length}`);
if(reachable===0) process.exitCode=1;
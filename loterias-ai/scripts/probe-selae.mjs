import fs from 'node:fs';
import vm from 'node:vm';

const cfg=JSON.parse(fs.readFileSync('loterias-ai/data/selae-feed-endpoints.json','utf8'));
const adapterCode=fs.readFileSync('loterias-ai/js/selae-adapter.js','utf8');
const context={globalThis:{},console,Date,Math,JSON,Number,String,Array,Set,Object,Error};context.window=undefined;vm.createContext(context);vm.runInContext(adapterCode,context);
const adapter=context.globalThis.SELAEAdapter;
const today=new Date().toISOString().slice(0,10).replaceAll('-','');
const knownDates={bonoloto:'20260720',primitiva:'20260720',euromillones:'20260717'};
const out={checkedAt:new Date().toISOString(),dateProbe:today,feeds:[],parserChecks:[]};
function htmlToText(s){return String(s||'').replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;/gi,' ').replace(/&amp;/gi,'&').replace(/\s+/g,' ').trim();}
function endpoint(f,date){return cfg.datedEndpointBase+f.template.replace('{YYYYMMDD}',date);}
for(const f of cfg.feeds){
  const url=endpoint(f,today);
  try{
    const r=await fetch(url,{redirect:'follow',headers:{'user-agent':'LoteriasAI-SourceProbe/1.1'}});
    const body=await r.text();
    out.feeds.push({gameId:f.gameId,url,status:r.status,ok:r.ok,bytes:body.length,looksHtml:/<html|<!doctype/i.test(body),hasContent:body.trim().length>20});
  }catch(e){out.feeds.push({gameId:f.gameId,url,status:0,ok:false,error:String(e&&e.message||e)});}
  const known=knownDates[f.gameId];
  if(known){
    const ku=endpoint(f,known);
    try{
      const kr=await fetch(ku,{redirect:'follow',headers:{'user-agent':'LoteriasAI-ParserProbe/1.0'}});const kb=await kr.text();const plain=htmlToText(kb);
      const parsed=adapter.extractNumeric(f.gameId,plain);const validation=adapter.validateNumericDraw(parsed);
      out.parserChecks.push({gameId:f.gameId,date:known,url:ku,httpStatus:kr.status,bytes:kb.length,plainExcerpt:plain.slice(0,500),parsed,validation});
    }catch(e){out.parserChecks.push({gameId:f.gameId,date:known,url:ku,error:String(e&&e.message||e)});}
  }
}
fs.writeFileSync('loterias-ai/data/source-probe-latest.json',JSON.stringify(out,null,2)+'\n');
const reachable=out.feeds.filter(x=>x.ok).length;
const parsedOK=out.parserChecks.filter(x=>x.validation&&x.validation.ok).length;
console.log(`SELAE probe reachable ${reachable}/${out.feeds.length}; parser ${parsedOK}/${out.parserChecks.length}`);
if(reachable===0) process.exitCode=1;
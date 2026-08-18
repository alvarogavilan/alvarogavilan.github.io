import fs from 'node:fs';
import vm from 'node:vm';

const cfg=JSON.parse(fs.readFileSync('loterias-ai/data/selae-feed-endpoints.json','utf8'));
const adapterCode=fs.readFileSync('loterias-ai/js/selae-adapter.js','utf8');
const context={globalThis:{},console,Date,Math,JSON,Number,String,Array,Set,Object,Error};context.window=undefined;vm.createContext(context);vm.runInContext(adapterCode,context);
const adapter=context.globalThis.SELAEAdapter;
const todayISO=new Date().toISOString().slice(0,10);
const today=todayISO.replaceAll('-','');
const knownDates={bonoloto:'20260720',primitiva:'20260720',euromillones:'20260717'};
const resultParserGames=new Set(['bonoloto','primitiva','euromillones','gordo-primitiva','eurodreams']);
const out={checkedAt:new Date().toISOString(),dateProbe:today,feeds:[],serviceChecks:[]};
function endpoint(f,date){return cfg.datedEndpointBase+f.template.replace('{YYYYMMDD}',date);}
function serviceEndpoint(f,date){return cfg.dataServiceBase+cfg.dataServiceTemplate.replace('{GAME_ID}',f.selaeGameId).replace('{YYYYMMDD}',date);}
function shape(v,depth=0){if(depth>3)return typeof v;if(Array.isArray(v))return {type:'array',length:v.length,sample:v.length?shape(v[0],depth+1):null};if(v&&typeof v==='object'){const o={};for(const k of Object.keys(v).slice(0,40))o[k]=shape(v[k],depth+1);return o;}return typeof v;}
for(const f of cfg.feeds){
  const url=endpoint(f,today);
  try{
    const r=await fetch(url,{redirect:'follow',headers:{'user-agent':'LoteriasAI-SourceProbe/1.5'}});
    const body=await r.text();
    const feed={gameId:f.gameId,url,status:r.status,ok:r.ok,reachable:r.ok,bytes:body.length,resultParserSupported:resultParserGames.has(f.gameId),resultReady:null};
    if(r.ok&&feed.resultParserSupported){
      try{
        const draw=adapter.extractNumeric(f.gameId,body);
        const validation=adapter.validateNumericDraw(draw);
        feed.parsedDrawDate=draw.drawDate||null;
        feed.resultReady=Boolean(validation.ok&&draw.drawDate===todayISO);
        feed.parseIssues=validation.issues;
        if(feed.resultReady){
          feed.parsedResult={main:draw.main||[],secondary:draw.secondary||[],complementary:draw.complementary??null,reintegro:draw.reintegro??null,extra:draw.extra??null};
        }
      }catch(e){feed.resultReady=false;feed.parseIssues=[String(e&&e.message||e)];}
    }
    out.feeds.push(feed);
  }
  catch(e){out.feeds.push({gameId:f.gameId,url,status:0,ok:false,reachable:false,resultParserSupported:resultParserGames.has(f.gameId),resultReady:false,error:String(e&&e.message||e)});}
  const known=knownDates[f.gameId];if(!known)continue;
  const su=serviceEndpoint(f,known);
  try{
    const sr=await fetch(su,{redirect:'follow',headers:{'user-agent':'LoteriasAI-DataProbe/1.0','accept':'application/json,text/plain,*/*'}});
    const raw=await sr.text();let parsed=null,parseError=null;try{parsed=JSON.parse(raw);}catch(e){parseError=String(e.message)}
    out.serviceChecks.push({gameId:f.gameId,date:known,url:su,httpStatus:sr.status,contentType:sr.headers.get('content-type'),bytes:raw.length,parseError,payloadShape:parsed?shape(parsed):null,payloadSample:parsed?parsed:null,rawExcerpt:parsed?undefined:raw.slice(0,1000)});
  }catch(e){out.serviceChecks.push({gameId:f.gameId,date:known,url:su,error:String(e&&e.message||e)});}
}
fs.writeFileSync('loterias-ai/data/source-probe-latest.json',JSON.stringify(out,null,2)+'\n');
const reachable=out.feeds.filter(x=>x.reachable).length;
const ready=out.feeds.filter(x=>x.resultReady===true).length;
const parseable=out.feeds.filter(x=>x.resultParserSupported).length;
const jsonOK=out.serviceChecks.filter(x=>x.payloadShape).length;
console.log(`SELAE pages reachable ${reachable}/${out.feeds.length}; current results ready ${ready}/${parseable} parseable feeds; fechav3 JSON ${jsonOK}/${out.serviceChecks.length}`);
if(reachable===0||jsonOK===0)process.exitCode=1;

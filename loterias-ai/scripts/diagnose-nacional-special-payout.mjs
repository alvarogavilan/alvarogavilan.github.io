import fs from 'node:fs';
const base='https://www.loteriasyapuestas.es',date='20260801';
const headers={'user-agent':'Mozilla/5.0 LoteriasAI special payout diagnosis','accept':'application/json,*/*','referer':`${base}/es/loteria-nacional/comprobar-loteria-nacional`};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function get(url){let last;for(let a=1;a<=5;a++){try{const r=await fetch(url,{headers,signal:AbortSignal.timeout(60000)}),t=await r.text();let j;try{j=JSON.parse(t)}catch{}if(r.ok&&j&&j!=='E019')return j;last=new Error(`${r.status} ${String(j??t).slice(0,100)}`)}catch(e){last=e}await sleep(1000*a)}throw last}
const digits=x=>String(x??'').replace(/\D/g,'');
const raw=x=>Number(x?.prize??x?.premio??0)||0;
const compact=x=>x&&typeof x==='object'?{decimo:x.decimo??null,prize:raw(x),prizeType:x.prizeType??x.tipoPremio??null}:x;
const fj=await get(`${base}/servicios/fechav3?game_id=LNAC&fecha_sorteo=${date}`),f=Array.isArray(fj)?fj[0]:fj,id=f?.id_sorteo;
const res=await get(`${base}/servicios/resultados2?idsorteo=${id}`),checker=await get(`${base}/servicios/premioDecimoWeb?idsorteo=${id}`),c=checker.compruebe||[];
const win=new Map(c.map(x=>[digits(x.decimo).slice(-5).padStart(5,'0'),x]));
const exactGroups={primerPremio:[res.primerPremio].filter(Boolean),segundoPremio:[res.segundoPremio].filter(Boolean),tercerosPremios:res.tercerosPremios||[],cuartosPremios:res.cuartosPremios||[],quintosPremios:res.quintosPremios||[],extraccionesDeCincoCifras:res.extraccionesDeCincoCifras||[]};
const exactCrosscheck={};for(const [k,a] of Object.entries(exactGroups))exactCrosscheck[k]=a.map(x=>{const n=digits(x.decimo).slice(-5).padStart(5,'0'),w=win.get(n);return {number:n,resultados2:compact(x),checker:w?compact(w):null,ratio:w&&raw(w)?raw(x)/raw(w):null,hundred:n.slice(0,3)}});
const targetHundreds=[];for(const [source,a] of Object.entries(exactCrosscheck))for(const x of a){const values=[];for(let i=0;i<100;i++){const n=`${x.hundred}${String(i).padStart(2,'0')}`,w=win.get(n);values.push({number:n,prize:w?raw(w):0,prizeType:w?.prizeType??null})}const counts={};for(const v of values){const key=`${v.prize}|${v.prizeType??''}`;counts[key]=(counts[key]||0)+1}targetHundreds.push({source,target:x.number,hundred:x.hundred,distribution:counts,samples:values.slice(0,12)})}
const checkerTypes={};for(const x of c){const k=String(x.prizeType??'');checkerTypes[k]=(checkerTypes[k]||0)+1}
const arrays={};for(const k of ['extraccionesDeCincoCifras','extraccionesDeCuatroCifras','extraccionesDeTresCifras','extraccionesDeDosCifras','reintegros'])arrays[k]=(res[k]||[]).map(compact);
const report={generatedAt:new Date().toISOString(),date,drawId:String(id),ticketCostEUR:Number(res.precioDecimo),tipoSorteo:res.tipoSorteo??null,tipoSorteoGeneral:res.tipoSorteoGeneral??null,modelDraw:res.modelDraw??null,checkerWinnerCount:c.length,checkerTypes,exactCrosscheck,targetHundreds,arrays,truth:'Diagnostic evidence only. No historical payout rule is adopted from this file until exact reconstruction validates against all 100,000 official checker outcomes.'};
fs.mkdirSync('loterias-ai/data/validation',{recursive:true});fs.writeFileSync('loterias-ai/data/validation/nacional-special-payout-diagnostic.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({date,drawId:id,ticketCostEUR:report.ticketCostEUR,exactCrosscheck,targetHundreds:targetHundreds.map(x=>({source:x.source,target:x.target,distribution:x.distribution}))},null,2));

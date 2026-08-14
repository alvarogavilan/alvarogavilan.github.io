import fs from 'node:fs';
import path from 'node:path';
const dir='loterias-ai/data/archive/loteria-nacional';
const all=[];
if(fs.existsSync(dir))for(const file of fs.readdirSync(dir).filter(f=>/^\d{4}\.json$/.test(f)).sort()){const doc=JSON.parse(fs.readFileSync(path.join(dir,file),'utf8'));all.push(...(doc.records||[]));}
const groups={navidad:all.filter(r=>r.drawType==='NAVIDAD'),el_nino:all.filter(r=>r.drawType==='EL_NINO')};
const outDir='loterias-ai/data/archive/specials';fs.mkdirSync(outDir,{recursive:true});
const summary={generatedAt:new Date().toISOString(),source:'loteria-nacional canonical archive',specials:{}};
for(const [id,records] of Object.entries(groups)){
 records.sort((a,b)=>a.drawDate.localeCompare(b.drawDate));
 const refs=records.map(r=>({drawId:r.drawId,drawDate:r.drawDate,drawType:r.drawType,sourcePartition:`loteria-nacional/${r.drawDate.slice(0,4)}.json`,firstPrize:r.result?.firstPrize||null,secondPrize:r.result?.secondPrize||null,reintegro:r.result?.reintegro||[],economicsDetailLevel:r.economics?.detailLevel||null,validation:r.source?.validation||null}));
 fs.writeFileSync(`${outDir}/${id}.json`,JSON.stringify({gameId:id,storageMode:'REFERENCE_INDEX_NO_DUPLICATION',records:refs},null,2)+'\n');
 summary.specials[id]={records:refs.length,earliest:refs[0]?.drawDate||null,latest:refs.at(-1)?.drawDate||null,fullEconomics:refs.filter(x=>x.economicsDetailLevel==='FULL').length};
}
fs.writeFileSync(`${outDir}/summary.json`,JSON.stringify(summary,null,2)+'\n');console.log(JSON.stringify(summary,null,2));

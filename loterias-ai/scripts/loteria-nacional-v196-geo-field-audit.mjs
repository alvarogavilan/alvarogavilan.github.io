import fs from 'node:fs';
import path from 'node:path';

const DIR='loterias-ai/data/archive/loteria-nacional';
const OUT='loterias-ai/data/research/loteria-nacional-v196-geo-field-audit.json';
const files=fs.readdirSync(DIR).filter(f=>/^\d{4}\.json$/.test(f)).sort();
const GEO_TERMS=['administracion','administración','province','provincia','municipio','localidad','city','ciudad','location','ubicacion','ubicación','address','direccion','dirección','venta','salespoint','pointofsale','receptor','consignatario','establecimiento','postal','lat','lon','longitude','latitude'];
const SUPPORT_TERMS=['officialprizeschema','officialsource','urlListadoOficial','drawId','drawNumber','tipoSorteo','modelDraw'];
const keyCounts=new Map(), geoHits=new Map(), supportHits=new Map();
let records=0, years=[];
function walk(v,prefix=''){
  if(Array.isArray(v)){for(const x of v)walk(x,prefix);return;}
  if(!v||typeof v!=='object')return;
  for(const [k,val] of Object.entries(v)){
    const full=prefix?`${prefix}.${k}`:k;
    keyCounts.set(full,(keyCounts.get(full)||0)+1);
    const lk=k.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
    for(const t0 of GEO_TERMS){const t=t0.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');if(lk.includes(t))geoHits.set(full,(geoHits.get(full)||0)+1)}
    for(const t of SUPPORT_TERMS){if(k.toLowerCase().includes(t.toLowerCase()))supportHits.set(full,(supportHits.get(full)||0)+1)}
    walk(val,full);
  }
}
for(const f of files){
  const doc=JSON.parse(fs.readFileSync(path.join(DIR,f),'utf8'));
  const rs=doc.records||[]; records+=rs.length; years.push({year:Number(f.slice(0,4)),records:rs.length,verificationLevel:doc.verificationLevel||null});
  for(const r of rs)walk(r);
}
const arr=m=>[...m.entries()].map(([path,count])=>({path,count})).sort((a,b)=>b.count-a.count||a.path.localeCompare(b.path));
const geo=arr(geoHits),support=arr(supportHits);
const out={generatedAt:new Date().toISOString(),version:'v196',gameId:'loteria-nacional',years,files:files.length,records,geoFieldMatches:geo,supportingOfficialFieldMatches:support,geoUsable:geo.length>0,decision:geo.length?'GEO_FIELDS_PRESENT_REVIEW_SEMANTICS':'ARCHIVE_HAS_NO_STRUCTURED_GEO_OR_ADMINISTRATION_FIELDS',nextAction:geo.length?'Validate whether matched fields are actual prize-sale geography before any model use.':'Probe verifiable official/secondary sold-point sources and enrich only with reproducible draw-level administration/province/locality data.',policy:'Do not infer prize-sale geography from prize numbers, PDFs, URLs or result sequence. Geography must be explicitly sourced and reproducible.',realMoneyPass:false,realStakeEUR:0};
fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify({records,geoMatches:geo.slice(0,20),decision:out.decision}));